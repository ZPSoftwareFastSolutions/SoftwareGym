/**
 * CAPA: Application / Tenant
 *
 * Casos de uso del sitio público. Son funciones puras sobre el puerto: no
 * conocen React, ni Next, ni el origen del dato.
 */

import type { TenantConfig } from '../../domain/tenant/tenant-config';
import type { FeatureFlags } from '../../domain/tenant/feature-flags';
import type { NavItem } from '../../domain/tenant/tenant-config';
import type { TenantRepositoryPort, TenantSummary } from '../ports/tenant-repository.port';

export class TenantNotFoundError extends Error {
  constructor(readonly slug: string) {
    super(`No existe configuración para el tenant "${slug}".`);
    this.name = 'TenantNotFoundError';
  }
}

export async function getTenantBySlug(
  repository: TenantRepositoryPort,
  slug: string,
): Promise<TenantConfig | null> {
  if (!slug) return null;
  return repository.findBySlug(slug.toLowerCase());
}

export async function requireTenant(
  repository: TenantRepositoryPort,
  slug: string,
): Promise<TenantConfig> {
  const tenant = await getTenantBySlug(repository, slug);
  if (!tenant) throw new TenantNotFoundError(slug);
  return tenant;
}

export async function listTenantSlugs(
  repository: TenantRepositoryPort,
): Promise<readonly string[]> {
  return repository.listSlugs();
}

export async function listTenantSummaries(
  repository: TenantRepositoryPort,
): Promise<readonly TenantSummary[]> {
  return repository.listSummaries();
}

/**
 * Filtra la navegación según las feature flags del tenant.
 *
 * Un enlace cuya capacidad está apagada no se renderiza. La página
 * correspondiente además responde 404 (ver `guards/feature.guard.ts`): ocultar
 * el enlace sin cerrar la ruta deja la sección accesible escribiendo la URL.
 */
export function visibleNavigation(
  navigation: readonly NavItem[],
  features: FeatureFlags,
): readonly NavItem[] {
  return navigation.filter((item) =>
    item.requiresFeature ? features[item.requiresFeature] === true : true,
  );
}

/** `true` si la capacidad está explícitamente encendida. Falla cerrado. */
export function isFeatureEnabled(features: FeatureFlags, key: keyof FeatureFlags): boolean {
  return features[key] === true;
}
