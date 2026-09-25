import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Landing pública entera indexable: no hay panel ni acceso que ocultar.
      allow: '/',
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
