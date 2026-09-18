/**
 * CAPA: Presentation / App — contexto compartido del panel.
 *
 * Resuelve una sola vez por petición quién entró y qué puede hacer, y corta
 * el paso cuando corresponde.
 *
 * POR QUÉ CADA PÁGINA VUELVE A COMPROBAR. El middleware renueva la sesión
 * pero no autoriza —su `matcher` puede dejar rutas fuera—, y el layout del
 * panel tampoco basta: si mañana una de estas páginas se monta bajo otro
 * layout, la guarda desaparecería sin que nada avise. Cada ruta protegida
 * llama a `exigirPerfil` por su cuenta, y por debajo de todo está RLS, que es
 * lo único que decide de verdad qué filas existen.
 */

import { cache } from 'react';
import { forbidden, redirect } from 'next/navigation';
import type { OperationsRepositoryPort } from '@core/application/ports/operations-repository.port';
import {
  espacioDeTrabajo,
  tienePermiso,
  type EspacioDeTrabajo,
  type PerfilOperativo,
} from '@core/domain/operations/workspace';
import { respuestaDeAcceso, type SituacionDeAcceso } from '@core/domain/operations/acceso-al-panel';
import { operationsRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { estadoDeSesion } from '@infra/auth/supabase.server';
import { tenantHref } from '@/lib/tenant-links';

/**
 * `cache` de React deduplica dentro de UNA petición.
 *
 * El layout del panel necesita el perfil para pintar la navegación y la
 * página lo necesita para sus datos. Sin esto serían dos consultas idénticas
 * en cada carga; con esto, una.
 */
/**
 * Qué se sabe de quien pide una página del panel (V4.2).
 *
 * Cinco situaciones distintas, cinco respuestas distintas. Antes eran dos
 * («hay perfil» o «al login») y por eso un fallo temporal te echaba.
 */
export type SituacionDelPanel =
  | { readonly estado: 'ok'; readonly perfil: PerfilOperativo; readonly repo: OperationsRepositoryPort }
  /** No hay sesión, o caducó de verdad. */
  | { readonly estado: 'anonimo' }
  /** Hay sesión válida, pero la cuenta no tiene ficha operativa. */
  | { readonly estado: 'sin-perfil' }
  /** No se pudo comprobar: red, timeout, 5xx. La sesión sigue viva. */
  | { readonly estado: 'indisponible' };

export const situacionActual = cache(async (): Promise<SituacionDelPanel> => {
  // Sin proveedor de sesiones no hay panel posible, pero tampoco es una avería
  // de la sesión de nadie: se trata como «no configurado» → indisponible.
  if (!isSupabaseConfigured()) return { estado: 'indisponible' };

  const sesion = await estadoDeSesion();
  if (sesion.estado === 'anonimo') return { estado: 'anonimo' };
  if (sesion.estado === 'indisponible') return { estado: 'indisponible' };

  const repo = await operationsRepository();
  const lectura = await repo.perfilDetallado();
  if (lectura.estado === 'indisponible') return { estado: 'indisponible' };
  if (lectura.estado === 'sin-perfil') return { estado: 'sin-perfil' };
  return { estado: 'ok', perfil: lectura.perfil, repo };
});

/**
 * Compatibilidad con los consumidores que solo quieren el perfil.
 *
 * `cache` de React deduplica dentro de UNA petición: el layout del panel
 * necesita el perfil para pintar la navegación y la página lo necesita para sus
 * datos. Sin esto serían dos consultas idénticas en cada carga; con esto, una.
 */
export const perfilActual = cache(
  async (): Promise<{ perfil: PerfilOperativo | null; repo: OperationsRepositoryPort | null }> => {
    const situacion = await situacionActual();
    return situacion.estado === 'ok'
      ? { perfil: situacion.perfil, repo: situacion.repo }
      : { perfil: null, repo: null };
  },
);

export interface ContextoDelPanel {
  readonly perfil: PerfilOperativo;
  readonly repo: OperationsRepositoryPort;
  readonly espacio: EspacioDeTrabajo;
}

/**
 * Exige sesión y devuelve el contexto, o corta el paso como corresponda.
 *
 * Qué corresponde en cada caso no se decide aquí: lo dice
 * `respuestaDeAcceso` (dominio), y esta función solo lo ejecuta.
 */
export async function exigirPerfil(slug: string): Promise<ContextoDelPanel> {
  const situacion = await situacionActual();

  // V4.2 · CADA SITUACIÓN TIENE SU RESPUESTA, y solo una lleva al formulario de
  // acceso. Antes las cuatro terminaban ahí, así que un hipo de red se
  // presentaba como «tu sesión terminó» y la persona perdía lo que estaba
  // haciendo. Cuál es la respuesta de cada una lo dice el dominio
  // (`acceso-al-panel.ts`), que es donde se puede probar.
  if (situacion.estado !== 'ok') responder(situacion.estado, slug);

  const { perfil, repo } = situacion;

  // El gimnasio de la ruta no es el suyo. No es una fuga —RLS no entrega un
  // solo dato ajeno, y se comprobó— pero una página que dice «Aurora Fit»
  // mientras muestra los datos de un socio de Mítico está mintiendo sobre dónde
  // está el usuario, y ese descuido es el que se convierte en fuga cuando
  // alguien añade una consulta dando por hecho que la ruta ya estaba validada.
  if (perfil.tenantSlug && perfil.tenantSlug !== slug) responder('gimnasio-ajeno', perfil.tenantSlug);

  return { perfil, repo, espacio: espacioDeTrabajo(perfil) };
}

/**
 * Traduce la respuesta que decide el dominio al mecanismo que usa Next.
 *
 * Nunca devuelve: o redirige, o interrumpe con 403, o lanza. Que el tipo sea
 * `never` es lo que permite a TypeScript saber que después de llamarla la
 * situación es «ok», sin repetir la comprobación.
 */
function responder(situacion: SituacionDeAcceso, slugDeDestino: string): never {
  switch (respuestaDeAcceso(situacion)) {
    // Único camino al formulario de acceso: no hay sesión que conservar.
    case 'ir-al-acceso':
      redirect(tenantHref(slugDeDestino, 'acceso'));
    case 'ir-a-su-panel':
      redirect(tenantHref(slugDeDestino, 'panel'));
    // 403 de verdad. `unauthorized()` sería mentir: la sesión es válida.
    case 'prohibido':
      forbidden();
    // 503 con las cookies intactas: al recargar, quien estaba dentro sigue dentro.
    case 'no-disponible':
      throw new ErrorDeDisponibilidad();
    case 'continuar':
      throw new Error('«continuar» no es una interrupción: no debería llegar aquí');
  }
}

/**
 * Error que una página del panel lanza cuando no se pudo comprobar la sesión.
 *
 * Lo recoge `panel/error.tsx`, que ofrece reintentar. No es `notFound()` (el
 * recurso existe) ni `unauthorized()` (la sesión es válida): es un fallo
 * temporal del servidor y así hay que contarlo.
 */
export class ErrorDeDisponibilidad extends Error {
  constructor() {
    super('No se pudo comprobar tu sesión ahora mismo.');
    this.name = 'ErrorDeDisponibilidad';
  }
}

/**
 * Exige además un permiso concreto.
 *
 * V4.2 · Responde **403 de verdad**, no una redirección silenciosa. Antes se
 * devolvía a la persona a su propio espacio sin decir nada, y el efecto era
 * desconcertante: pulsas un enlace y «no pasa nada». Ahora `forbidden.tsx`
 * explica que la cuenta no tiene ese permiso y ofrece la salida a su panel. La
 * sesión NO se toca: estar autenticado sin permiso no es estar sin autenticar.
 *
 * Esto NO es lo que protege los datos. Aunque esta comprobación se cayera, la
 * consulta seguiría devolviendo cero filas: quien decide es RLS.
 */
export async function exigirPermiso(slug: string, permiso: string): Promise<ContextoDelPanel> {
  const contexto = await exigirPerfil(slug);

  if (!tienePermiso(contexto.perfil, permiso)) responder('sin-permiso', slug);

  return contexto;
}

// El formato vive en `lib/formato.ts` para poder usarlo también desde
// componentes de cliente —la ficha de socio, la descarga en ZIP— sin arrastrar
// hasta el navegador este módulo, que importa el composition root.
export { fechaCorta, hora, importe, formatoTelefono } from '@/lib/formato';
