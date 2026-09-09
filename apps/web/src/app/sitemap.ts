/**
 * Sitemap generado a partir del registro de tenants y de la navegación
 * configurada de cada uno.
 *
 * Se construye desde el dominio, no desde una lista escrita a mano: un
 * gimnasio nuevo o una sección apagada por feature flag se reflejan solos.
 * Un sitemap mantenido a mano queda desactualizado en el primer cambio.
 */

import type { MetadataRoute } from 'next';
import { visibleNavigation } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';
import { TENANT_REGISTRY } from '@infra/tenants/tenant.registry';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gymplatform.vercel.app').replace(
  /\/+$/,
  '',
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await tenantRepository().listSlugs();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
  ];

  for (const slug of slugs) {
    const tenant = TENANT_REGISTRY.find((t) => t.slug === slug);
    if (!tenant) continue;

    for (const item of visibleNavigation(tenant.navigation, tenant.features)) {
      const path = item.segment ? `/${slug}/${item.segment}` : `/${slug}`;
      entries.push({
        url: `${BASE_URL}${path}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: item.segment === '' ? 0.9 : 0.7,
      });
    }

    if (tenant.features.memberLogin) {
      entries.push({
        url: `${BASE_URL}/${slug}/acceso`,
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
      });
    }
  }

  return entries;
}
