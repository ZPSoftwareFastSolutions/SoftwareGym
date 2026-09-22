/**
 * CAPA: Presentation / App — `/favicon.ico` en la raíz del dominio.
 *
 * Todas las páginas declaran su icono con `<link rel="icon">`, pero hay quien
 * no lee el HTML y pide `/favicon.ico` a ciegas: marcadores, algunos lectores
 * de RSS, servicios que muestran iconos de sitios. Sin esta ruta, eso es un 404
 * en cada visita.
 *
 * No hay un `favicon.ico` en `public/` porque el icono es un dato del gimnasio
 * (`branding.logo.icons`), no un archivo de la aplicación. Se sirve el del
 * gimnasio que atiende la raíz del dominio, el mismo al que redirige `/`.
 *
 * Es estática: se genera una vez en el build y se sirve desde el CDN.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';
import { DEFAULT_TENANT_SLUG } from '@infra/tenants/tenant.registry';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const tenant = await getTenantBySlug(tenantRepository(), DEFAULT_TENANT_SLUG);
  const ruta = tenant?.branding.logo.icons?.favicon;
  if (!ruta) return new Response(null, { status: 404 });

  // La ruta ya pasó por el validador (formato y existencia en `public/`).
  const icono = await readFile(join(process.cwd(), 'public', ruta));

  return new Response(new Uint8Array(icono), {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
