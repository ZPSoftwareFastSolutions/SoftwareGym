/**
 * CAPA: Presentation / App (layout raíz)
 *
 * Carga las familias tipográficas disponibles para TODOS los tenants y las
 * expone como variables CSS. Cada gimnasio elige la suya en su configuración
 * (`branding.typography.display`) referenciando estas variables.
 *
 * `next/font` descarga y autoaloja las fuentes en tiempo de build: no hay
 * petición a un dominio externo en tiempo de ejecución (lo que además cumple
 * la CSP `font-src 'self'`) y no hay salto de layout por cambio de fuente,
 * porque inyecta métricas de respaldo ajustadas.
 */

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Bebas_Neue, Fraunces, Inter } from 'next/font/google';
import '@/styles/globals.css';

const bodySans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body-sans',
});

const displayCondensed = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-display-condensed',
});

const displaySerif = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK'],
  variable: '--font-display-serif',
});

export const metadata: Metadata = {
  title: {
    default: 'GYM PLATFORM — Software para gimnasios',
    template: '%s | GYM PLATFORM',
  },
  description:
    'Plataforma web vertical para gimnasios: sitio público configurable y sistema de gestión multi-tenant. Desarrollada por ZP Software Fast Solutions.',
  applicationName: 'GYM PLATFORM',
  authors: [{ name: 'ZP Software Fast Solutions' }],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No se fija `maximumScale`: impedir el zoom es una barrera de accesibilidad
  // para personas con baja visión.
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${bodySans.variable} ${displayCondensed.variable} ${displaySerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
