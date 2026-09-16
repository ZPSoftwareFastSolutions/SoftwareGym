/**
 * Genera la plantilla del correo de confirmación de Supabase Auth (V4.2, §17).
 *
 *     npm run correo
 *
 * Lee el registro de gimnasios —el mismo que usa la aplicación— y escribe en
 * `docs/correo/` el HTML y el texto plano que una persona pega en el panel de
 * Supabase (Authentication → Emails → Confirm signup). El runbook
 * `docs/runbooks/correo-de-confirmacion.md` explica el paso a paso.
 *
 * POR QUÉ UN SCRIPT Y NO UNA RUTA. El correo no lo envía esta aplicación: lo
 * envía Supabase con una plantilla guardada en la configuración del proyecto.
 * Una ruta que la devolviera sería una URL pública que nadie consume. Un
 * archivo generado, en cambio, se revisa en el diff y se pega una vez.
 *
 * POR QUÉ HACE FALTA EL GANCHO DE RESOLUCIÓN. Los archivos de configuración de
 * los gimnasios usan los alias del proyecto (`@core/…`, `@tenants/…`), que
 * entiende TypeScript pero no Node. El gancho los traduce a rutas reales; la
 * alternativa —duplicar aquí los colores de cada gimnasio— es justo lo que este
 * generador existe para evitar.
 */

import { registerHooks } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(raiz, '..', '..');

const ALIAS = [
  ['@core/', 'src/core/'],
  ['@infra/', 'src/infrastructure/'],
  ['@tenants/', 'tenants/'],
  ['@/', 'src/'],
];

registerHooks({
  resolve(especificador, contexto, siguiente) {
    for (const [prefijo, destino] of ALIAS) {
      if (especificador.startsWith(prefijo)) {
        const archivo = path.join(raiz, destino, especificador.slice(prefijo.length));
        return { url: `${pathToFileURL(archivo).href}.ts`, shortCircuit: true };
      }
    }
    try {
      return siguiente(especificador, contexto);
    } catch (error) {
      // Un import relativo sin extensión (`./tenant-config`) es válido en
      // TypeScript y no para Node. Se reintenta con `.ts` antes de rendirse.
      if (especificador.startsWith('.')) return siguiente(`${especificador}.ts`, contexto);
      throw error;
    }
  },
});

const { TENANT_REGISTRY } = await import('@infra/tenants/tenant.registry');
const { marcaDeCorreoDeTenant, plantillaDeCorreoDeConfirmacion, textoDeConfirmacion, ASUNTO_DE_CONFIRMACION } =
  await import('@core/domain/tenant/correo-de-confirmacion');

const marcas = TENANT_REGISTRY.map(marcaDeCorreoDeTenant);
const destino = path.join(repo, 'docs', 'correo');
await mkdir(destino, { recursive: true });

await writeFile(path.join(destino, 'confirmacion.html'), plantillaDeCorreoDeConfirmacion(marcas), 'utf8');

// El texto plano no puede ramificar por gimnasio en el panel de Supabase (hay
// un solo campo y no admite condicionales cómodas), así que se genera uno por
// marca y se pega el que corresponda si algún día se separan los proyectos.
// Hoy vale el de la plataforma, que es el primero del registro.
const plano = marcas
  .map((marca) => `### ${marca.slug}\n\n${textoDeConfirmacion(marca)}`)
  .join('\n\n---\n\n');
await writeFile(path.join(destino, 'confirmacion.txt'), `Asunto: ${ASUNTO_DE_CONFIRMACION}\n\n${plano}\n`, 'utf8');

console.log(`Plantilla generada para ${marcas.length} gimnasios: ${marcas.map((m) => m.slug).join(', ')}`);
console.log(`→ ${path.relative(repo, path.join(destino, 'confirmacion.html'))}`);
