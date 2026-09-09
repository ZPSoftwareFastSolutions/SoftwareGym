import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El portal del socio no aporta nada al índice y no debe aparecer en
      // resultados de búsqueda.
      disallow: ['/*/acceso'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
