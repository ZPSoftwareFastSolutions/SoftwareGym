/**
 * CAPA: Infrastructure / Tenants
 *
 * Adaptador que implementa `TenantRepositoryPort` sobre el registro estático.
 *
 * Es intencionalmente `async`: la firma del puerto ya es asíncrona, de modo
 * que sustituirlo por el adaptador HTTP contra la API .NET (V2) no obliga a
 * cambiar ni un consumidor.
 */

import type {
  TenantRepositoryPort,
  TenantSummary,
} from '@core/application/ports/tenant-repository.port';
import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { TENANT_REGISTRY } from './tenant.registry';
import { assertValidTenantConfig } from './tenant.validator';

export class StaticTenantRepository implements TenantRepositoryPort {
  private readonly bySlug: ReadonlyMap<string, TenantConfig>;
  private readonly byHost: ReadonlyMap<string, TenantConfig>;

  constructor(registry: readonly TenantConfig[] = TENANT_REGISTRY) {
    const slugIndex = new Map<string, TenantConfig>();
    const hostIndex = new Map<string, TenantConfig>();

    for (const tenant of registry) {
      // Falla en el arranque, no en la petición 10.000: una configuración
      // inválida debe impedir el build, no degradar el sitio en producción.
      assertValidTenantConfig(tenant);

      if (slugIndex.has(tenant.slug)) {
        throw new Error(`Slug de tenant duplicado en el registro: "${tenant.slug}".`);
      }
      slugIndex.set(tenant.slug, tenant);

      for (const domain of tenant.domains) {
        hostIndex.set(domain.toLowerCase(), tenant);
      }
    }

    this.bySlug = slugIndex;
    this.byHost = hostIndex;
  }

  async findBySlug(slug: string): Promise<TenantConfig | null> {
    return this.bySlug.get(slug.toLowerCase()) ?? null;
  }

  async findByHost(host: string): Promise<TenantConfig | null> {
    // Se descarta el puerto: `localhost:3000` debe resolver como `localhost`.
    const normalized = host.toLowerCase().split(':')[0] ?? '';
    return this.byHost.get(normalized) ?? null;
  }

  async listSlugs(): Promise<readonly string[]> {
    return [...this.bySlug.keys()];
  }

  async listSummaries(): Promise<readonly TenantSummary[]> {
    return [...this.bySlug.values()].map((t) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      primaryColor: t.branding.palette.primary,
      surfaceColor: t.branding.palette.surface,
      monogram: t.branding.logo.monogram,
      plan: t.provisioning.plan,
      status: t.provisioning.status,
    }));
  }
}
