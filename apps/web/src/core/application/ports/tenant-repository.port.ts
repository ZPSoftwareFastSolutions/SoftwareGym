/**
 * CAPA: Application / Ports
 *
 * Puerto de salida hacia el almacén de configuraciones de tenant.
 *
 * La abstracción se DECLARA aquí (donde se consume) y se IMPLEMENTA en
 * `infrastructure/tenants`. Esa es la dirección correcta de la inversión de
 * dependencias: Application nunca importa de Infrastructure.
 *
 * En V1 la implementación lee archivos versionados en el repo. En V2 pasará a
 * consumir `GET /api/v1/tenants/{slug}/config` de la API .NET. El cambio no
 * toca ni una línea de Application ni de Presentation, porque ambas dependen
 * de este contrato y no de la fuente.
 */

import type { TenantConfig } from '../../domain/tenant/tenant-config';

export interface TenantSummary {
  readonly slug: string;
  readonly name: string;
  readonly tagline: string;
  readonly primaryColor: string;
  readonly surfaceColor: string;
  readonly monogram: string;
  readonly plan: string;
  readonly status: string;
}

export interface TenantRepositoryPort {
  /** Devuelve la configuración o `null` si el slug no existe. Nunca lanza. */
  findBySlug(slug: string): Promise<TenantConfig | null>;

  /** Resuelve un tenant a partir del host de la petición. */
  findByHost(host: string): Promise<TenantConfig | null>;

  /** Slugs conocidos. Alimenta `generateStaticParams` y el sitemap. */
  listSlugs(): Promise<readonly string[]>;

  /** Proyección ligera para la vitrina de la plataforma. */
  listSummaries(): Promise<readonly TenantSummary[]>;
}
