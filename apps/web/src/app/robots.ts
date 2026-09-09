import type { MetadataRoute } from 'next';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gymplatform.vercel.app').replace(
  /\/+$/,
  '',
);

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
