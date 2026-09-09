/**
 * Dominio canónico del sitio, para `sitemap.xml`, `robots.txt` y las URL
 * canónicas.
 *
 * Estaba escrito a mano como `https://gymplatform.vercel.app`, que NO es el
 * dominio del proyecto —el alias real es `gym-platform-alpha`—. El resultado
 * era un sitemap publicado apuntando entero a un host ajeno: Google leía URL
 * que no existen y ninguna página del sitio se indexaba bajo su dirección
 * real. Un valor por defecto equivocado es peor que no tener valor por
 * defecto, porque nadie lo mira hasta que el daño ya está hecho.
 *
 * Orden de resolución:
 *   1. `NEXT_PUBLIC_SITE_URL` — el dominio propio del cliente, cuando lo haya.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — lo inyecta Vercel en el build y
 *      siempre apunta al dominio de producción del proyecto. Con esto el
 *      sitemap sale correcto aunque nadie configure nada.
 *   3. `localhost` en desarrollo.
 */

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();
