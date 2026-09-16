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
 * Exige sesión y devuelve el contexto. Redirige en vez de lanzar: para quien
 * llega sin sesión, «vuelve a la página de acceso» es la respuesta correcta,
 * no una pantalla de error.
 *
 * También redirige cuando el gimnasio de la ruta no es el del perfil. No es
 * una fuga —RLS no entrega un solo dato ajeno, y se comprobó— pero una página
 * que dice «Aurora Fit» mientras muestra los datos de un socio de Mítico está
 * mintiendo sobre dónde está el usuario, y ese descuido es el que se
 * convierte en fuga cuando alguien añade una consulta dando por hecho que la
 * ruta ya estaba validada.
 */
export async function exigirPerfil(slug: string): Promise<ContextoDelPanel> {
  const situacion = await situacionActual();

  /**
   * V4.2 · CADA SITUACIÓN TIENE SU RESPUESTA, y solo una lleva al formulario
   * de acceso. Antes las cuatro terminaban ahí, así que un hipo de red se
   * presentaba como «tu sesión terminó» y la persona perdía lo que estaba
   * haciendo. La regla del producto es: **una operación fallida no cierra la
   * sesión de nadie.**
   */
  if (situacion.estado === 'anonimo') redirect(tenantHref(slug, 'acceso'));

  if (situacion.estado === 'indisponible') {
    // 503 real y la sesión intacta: al recargar, quien ya estaba dentro sigue
    // dentro. `unauthorized()` sería mentir —la sesión es válida— y `redirect`
    // al login la daría por perdida.
    throw new ErrorDeDisponibilidad();
  }

  // Sesión válida sin ficha operativa: es una cuenta a medio aprovisionar, no
  // un intruso. Se le dice qué le falta en vez de mandarla a entrar otra vez.
  if (situacion.estado === 'sin-perfil') forbidden();

  const { perfil, repo } = situacion;

  if (perfil.tenantSlug && perfil.tenantSlug !== slug) {
    redirect(tenantHref(perfil.tenantSlug, 'panel'));
  }

  return { perfil, repo, espacio: espacioDeTrabajo(perfil) };
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
 * Devuelve al panel propio en vez de a un 403: quien llega aquí sin permiso
 * casi siempre es alguien que guardó un enlace de cuando tenía otro rol, y
 * una pantalla de error no le dice qué hacer. Su panel sí.
 *
 * Esto NO es lo que protege los datos. Aunque esta comprobación se cayera, la
 * consulta seguiría devolviendo cero filas: quien decide es RLS.
 */
export async function exigirPermiso(slug: string, permiso: string): Promise<ContextoDelPanel> {
  const contexto = await exigirPerfil(slug);

  /**
   * V4.2 · **403 de verdad**, no una redirección silenciosa.
   *
   * Antes se devolvía a la persona a su propio espacio sin decir nada, y el
   * efecto era desconcertante: pulsas un enlace y «no pasa nada». Ahora Next
   * responde 403 y `forbidden.tsx` explica que la cuenta no tiene ese permiso,
   * con la salida a su panel. La sesión NO se toca: estar autenticado sin
   * permiso no es estar sin autenticar.
   *
   * Esto NO es lo que protege los datos. Aunque se cayera, la consulta seguiría
   * devolviendo cero filas: quien decide es RLS.
   */
  if (!tienePermiso(contexto.perfil, permiso)) forbidden();

  return contexto;
}

// El formato vive en `lib/formato.ts` para poder usarlo también desde
// componentes de cliente —la ficha de socio, la descarga en ZIP— sin arrastrar
// hasta el navegador este módulo, que importa el composition root.
export { fechaCorta, hora, importe } from '@/lib/formato';
