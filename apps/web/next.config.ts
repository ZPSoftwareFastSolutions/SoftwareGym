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
 * red. Se toma de la variable de entorno en vez de escribirlo a mano para que
 * apuntar a otro proyecto no obligue a tocar la política.
 */
const SUPABASE_ORIGIN = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
})();

const connectSrc = ["'self'", SUPABASE_ORIGIN].filter(Boolean).join(' ');
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), camera=(), microphone=(), payment=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-src 'self' https://www.google.com https://maps.google.com",
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
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
