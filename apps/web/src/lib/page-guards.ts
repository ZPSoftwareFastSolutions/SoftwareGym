/**
 * Guardas de página del sitio público.
 *
 * REGLA DE SEGURIDAD: ocultar un enlace del menú NO cierra la sección. Si
 * `showGallery` está apagada pero `/aurora-fit/galeria` sigue respondiendo
 * 200, la capacidad no está realmente desactivada: solo está escondida.
 *
 * Toda página protegida por una feature flag pasa por `loadTenantPage`, que
 * responde 404 cuando la capacidad está apagada.
 */

import { notFound } from 'next/navigation';
import type { FeatureFlags } from '@core/domain/tenant/feature-flags';
import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';

export interface TenantPageParams {
  readonly params: Promise<{ tenant: string }>;
}

/**
 * Resuelve el tenant de la ruta y, opcionalmente, exige una capacidad.
 * Nunca devuelve `null`: o entrega la configuración, o corta con 404.
 */
export async function loadTenantPage(
  params: TenantPageParams['params'],
  requiredFeature?: keyof FeatureFlags,
): Promise<TenantConfig> {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug);

  if (!tenant) notFound();
  if (requiredFeature && tenant.features[requiredFeature] !== true) notFound();

  return tenant;
}

/** Metadatos de una página interior, con el título compuesto por el tenant. */
export async function tenantPageMetadata(
  params: TenantPageParams['params'],
  title: string,
  description?: string,
) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug);

  if (!tenant) return { title };

  return {
    title,
    description: description ?? tenant.seo.description,
    alternates: { canonical: `/${tenant.slug}` },
  };
}
