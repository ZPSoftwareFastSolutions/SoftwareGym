import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad aplicadas a todo el sitio público.
 * Ver docs/architecture/security-headers.md
 *
 * CSP: se despliega en modo bloqueo porque el sitio no carga scripts de
 * terceros ni estilos inline dinámicos. Si se añade analítica o un widget
 * externo, pasar primero a Content-Security-Policy-Report-Only.
 */

/**
 * Origen de Supabase, para `connect-src`.
 *
 * Sin esto la CSP bloquea en silencio todas las llamadas de autenticación: el
 * formulario de acceso parece colgado y en la consola solo aparece un error de
 * red genérico.
 *
 * Lleva el mismo valor por defecto que `src/infrastructure/auth/supabase.config.ts`
 * y no puede importarlo: este archivo se evalúa antes, en la configuración de
 * Next.js. Están duplicados a conciencia; si se cambia el proyecto hay que
 * tocar los dos, y por eso lo natural es definir la variable de entorno, que
 * manda sobre ambos.
 */
const SUPABASE_ORIGIN = (() => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://dnclwawnjnzqqxgsuhpn.supabase.co';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
})();

const connectSrc = ["'self'", SUPABASE_ORIGIN].filter(Boolean).join(' ');

/**
 * Medios del catálogo de ejercicios (V3.1): imágenes y clips del bucket PRIVADO
 * `ejercicios`, servidos con URL firmada de corta vida desde el origen de
 * NUESTRO proyecto de Supabase (no `*.supabase.co`). No pasan por la
 * aplicación porque un clip de 15 MB no cabe en una respuesta de Vercel.
 */
const mediaSrc = ["'self'", 'blob:', SUPABASE_ORIGIN].filter(Boolean).join(' ');
const imgSrc = ["'self'", 'data:', 'blob:', SUPABASE_ORIGIN].filter(Boolean).join(' ');
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    // `camera=(self)`: el mostrador escanea el QR del socio con la cámara del
    // propio sitio. Estaba en `camera=()`, que la bloquea en TODO el sitio:
    // `getUserMedia` fallaba con un error de permisos que ni siquiera llega a
    // preguntar al usuario. Solo el propio origen; ningún iframe incrustado
    // —el mapa de Google, por ejemplo— puede pedirla.
    value: 'geolocation=(), camera=(self), microphone=(), payment=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imgSrc}`,
      `media-src ${mediaSrc}`,
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      // Mapas de las sedes y vídeos enlazados de ejercicios (solo los reproductores
      // sin cookies de seguimiento: youtube-nocookie y Vimeo con dnt).
      "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    optimizePackageImports: [],
    serverActions: {
      // Las fotos de comprobantes se reducen en el navegador antes de subir
      // (~200-600 KB), pero una foto que no se pudo reducir no debe romper
      // con un error opaco de Next. 4 MB queda por debajo del límite de 4,5 MB
      // de las funciones de Vercel: por encima, la plataforma corta antes de
      // que llegue a la aplicación y el error no se puede explicar.
      bodySizeLimit: '4mb',
    },
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
