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
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';
import { DEFAULT_TENANT_SLUG } from '@infra/tenants/tenant.registry';
import { iconosDeMarca } from '@/lib/brand-icons';
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

/**
 * EL TÍTULO NO SE DECLARA AQUÍ, y es a propósito.
 *
 * Una plantilla en la raíz (`'%s | GYM PLATFORM'`) se aplica también al título
 * por defecto de las rutas hijas: el sitio del gimnasio salía como «Mítico
 * Fitness — … | GYM PLATFORM», firmando cada pestaña del cliente con el nombre
 * del producto. El título lo pone el layout del gimnasio, que es quien sabe
 * cómo se llama el sitio; esta capa solo aporta lo que no depende del cliente.
 */
export async function generateMetadata(): Promise<Metadata> {
  // La 404 global queda fuera del layout del gimnasio. Sin esto, es la única
  // página del sitio que aparece en la pestaña con el icono genérico.
  const porDefecto = await getTenantBySlug(tenantRepository(), DEFAULT_TENANT_SLUG);

  return {
    authors: [{ name: 'ZP Software Fast Solutions' }],
    robots: { index: true, follow: true },
    icons: porDefecto ? iconosDeMarca(porDefecto.branding.logo) : undefined,
  };
}

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
