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
import { redirect } from 'next/navigation';
import type { OperationsRepositoryPort } from '@core/application/ports/operations-repository.port';
import {
  espacioDeTrabajo,
  SEGMENTO_DE_ESPACIO,
  tienePermiso,
  type EspacioDeTrabajo,
  type PerfilOperativo,
} from '@core/domain/operations/workspace';
import { operationsRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { getAuthenticatedUser } from '@infra/auth/supabase.server';
import { tenantHref } from '@/lib/tenant-links';

/**
 * `cache` de React deduplica dentro de UNA petición.
 *
 * El layout del panel necesita el perfil para pintar la navegación y la
 * página lo necesita para sus datos. Sin esto serían dos consultas idénticas
 * en cada carga; con esto, una.
 */
export const perfilActual = cache(
  async (): Promise<{ perfil: PerfilOperativo | null; repo: OperationsRepositoryPort | null }> => {
    if (!isSupabaseConfigured()) return { perfil: null, repo: null };

    const usuario = await getAuthenticatedUser();
    if (!usuario) return { perfil: null, repo: null };

    const repo = await operationsRepository();
    return { perfil: await repo.perfil(), repo };
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
  const { perfil, repo } = await perfilActual();

  if (!perfil || !repo) redirect(tenantHref(slug, 'acceso'));

  if (perfil.tenantSlug && perfil.tenantSlug !== slug) {
    redirect(tenantHref(perfil.tenantSlug, 'panel'));
  }

  return { perfil, repo, espacio: espacioDeTrabajo(perfil) };
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

  if (!tienePermiso(contexto.perfil, permiso)) {
    redirect(tenantHref(slug, SEGMENTO_DE_ESPACIO[contexto.espacio]));
  }

  return contexto;
}

// El formato vive en `lib/formato.ts` para poder usarlo también desde
// componentes de cliente —la ficha de socio, la descarga en ZIP— sin arrastrar
// hasta el navegador este módulo, que importa el composition root.
export { fechaCorta, hora, importe } from '@/lib/formato';
