import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad aplicadas a todo el sitio.
 * Ver docs/architecture/security-headers.md
 *
 * CSP EN MODO BLOQUEO, y aquí sale barata: esta versión del sitio no llama a
 * ningún servicio. No hay base de datos, ni autenticación, ni analítica, así
 * que `connect-src` se queda en `'self'` y cualquier petición a un tercero que
 * apareciera mañana fallaría de forma visible en vez de pasar desapercibida.
 *
 * Si se añade analítica o un widget externo, pasar primero a
 * Content-Security-Policy-Report-Only antes de abrir un origen.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    // Nada de esto lo usa la landing. La cámara estaba abierta para el escáner
    // de QR del mostrador, que en esta versión no existe: vuelve a cerrarse.
    value: 'geolocation=(), camera=(), microphone=(), payment=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "media-src 'self'",
      "font-src 'self' data:",
      "connect-src 'self'",
      // Lo único que se incrusta son los mapas de las sedes.
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

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
