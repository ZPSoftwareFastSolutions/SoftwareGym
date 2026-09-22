/**
 * Iconos del navegador de un gimnasio, en el formato de metadatos de Next.
 *
 * Vive aquí y no en cada layout porque lo usan dos: el del gimnasio (todas sus
 * páginas) y el raíz (la 404 global, que queda fuera del gimnasio). Escrito dos
 * veces, el día que se añada un tamaño uno de los dos se quedaría sin él.
 *
 * No se usa la convención de archivos de Next (`app/icon.png`): esa es global a
 * toda la aplicación, y aquí el icono es un dato de cada gimnasio.
 */

import type { Metadata } from 'next';
import type { BrandLogo } from '@core/domain/tenant/branding';

export function iconosDeMarca(logo: BrandLogo): Metadata['icons'] {
  const iconos = logo.icons;
  if (!iconos) return undefined;

  return {
    icon: [
      // El `.ico` primero y con `sizes="any"`: los navegadores que entienden PNG
      // eligen el de 192 por su tamaño; los que no, se quedan con este.
      { url: iconos.favicon, sizes: 'any' },
      { url: iconos.icon, type: 'image/png', sizes: '192x192' },
    ],
    shortcut: iconos.favicon,
    apple: [{ url: iconos.apple, type: 'image/png', sizes: '180x180' }],
  };
}
