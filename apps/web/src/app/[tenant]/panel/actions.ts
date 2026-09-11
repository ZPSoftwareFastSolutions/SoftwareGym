'use server';

/**
 * Acciones de servidor del panel.
 *
 * NINGUNA de estas acciones decide permisos por su cuenta, y es a propósito:
 * el permiso lo aplica RLS al escribir. Si esta capa se equivocara, la base
 * seguiría rechazando la escritura. Lo que sí hace aquí es traducir el
 * resultado a algo que una persona en el mostrador pueda leer.
 */

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { ResultadoDeCheckIn } from '@core/domain/operations/attendance';
import { resolverSucursalOperativa } from '@core/domain/operations/branches';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { branchesRepository, operationsRepository, tenantRepository } from '@infra/config/composition-root';
import { createSupabaseServerClient } from '@infra/auth/supabase.server';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { contextoDeAccion } from './_acciones';
import { COOKIE_DE_SUCURSAL, contextoDeSucursal, opcionesDeCookieDeSucursal } from './_sucursal';

export interface EstadoDeCheckIn {
  readonly resultado?: ResultadoDeCheckIn;
  /** Token que se intentó, para poder repetirlo o corregirlo sin volver a teclear. */
  readonly intentado?: string;
}

/** El slug solo vale si es un gimnasio del registro. Nunca se confía en el formulario. */
async function resolverTenant(valor: unknown): Promise<string | null> {
  if (typeof valor !== 'string') return null;
  const tenant = await getTenantBySlug(tenantRepository(), valor.trim().toLowerCase());
  return tenant?.slug ?? null;
}

function texto(form: FormData, campo: string): string {
  const valor = form.get(campo);
  return typeof valor === 'string' ? valor : '';
}

export async function registrarCheckIn(
  _estadoPrevio: EstadoDeCheckIn,
  form: FormData,
): Promise<EstadoDeCheckIn> {
  const slug = await resolverTenant(form.get('tenantSlug'));
  if (!slug) return { resultado: { tipo: 'error', mensaje: 'No se pudo determinar el gimnasio.' } };

  if (!isSupabaseConfigured()) {
    return { resultado: { tipo: 'error', mensaje: 'El registro de asistencia no está disponible ahora mismo.' } };
  }

  const codigo = texto(form, 'codigo').trim().toUpperCase();
  if (!codigo) {
    return { resultado: { tipo: 'error', mensaje: 'Escanea el QR del socio o teclea su código.' } };
  }

  const repo = await operationsRepository();
  const perfil = await repo.perfil();
  if (!perfil || perfil.tenantSlug !== slug) {
    return { resultado: { tipo: 'error', mensaje: 'Tu sesión terminó o no pertenece a este gimnasio. Vuelve a entrar.' } };
  }

  // La sede es la que el mostrador tenía en pantalla (campo `sucursal`), si
  // todavía puede operar en ella; si no, la sede de trabajo vigente. Nunca una
  // sede que la sesión no pueda operar: la base la rechazaría igual, pero así
  // el mensaje llega antes y claro.
  const { sucursales, actual } = await contextoDeSucursal(perfil);
  const pedida = texto(form, 'sucursal').trim();
  const sucursal = pedida ? resolverSucursalOperativa(sucursales.filter((s) => s.id === pedida), pedida) : actual;
  if (!sucursal) {
    return {
      resultado: {
        tipo: 'error',
        mensaje: pedida
          ? 'Ya no puedes registrar entradas en esa sucursal. Elige otra sede de trabajo.'
          : 'Tu cuenta no tiene ninguna sucursal asignada. Pide a gerencia que te asigne una sede.',
      },
      intentado: codigo,
    };
  }

  const resultado = await repo.registrarCheckIn(codigo, sucursal);

  // Solo se revalida cuando algo cambió de verdad. Revalidar en cada intento
  // fallido tiraría la caché del panel entero por teclear mal un código.
  if (resultado.tipo === 'registrado' || resultado.tipo === 'sin-membresia') {
    revalidatePath(`/${slug}/panel`, 'layout');
  }

  return { resultado, intentado: codigo };
}

/**
 * Cambia la sede de trabajo de ESTE dispositivo.
 *
 * Solo acepta una sede en la que la sesión puede operar ahora mismo; cualquier
 * otro valor se ignora sin tocar la cookie. Deja constancia en la bitácora:
 * «quién estaba trabajando dónde» es la primera pregunta cuando una entrada
 * aparece en la sede equivocada.
 */
export async function cambiarSucursalDeTrabajo(form: FormData): Promise<void> {
  const acceso = await contextoDeAccion(form, []);
  if (!acceso.ok) return;
  const { slug, perfil } = acceso.contexto;

  const pedida = texto(form, 'sucursal').trim();
  const { operables, actual } = await contextoDeSucursal(perfil);
  const sucursal = operables.find((s) => s.id === pedida);
  if (!sucursal || !perfil.tenantId) return;

  (await cookies()).set(COOKIE_DE_SUCURSAL, sucursal.id, opcionesDeCookieDeSucursal(slug));
  if (actual?.id !== sucursal.id) {
    await (await branchesRepository()).auditarCambioDeSucursal(perfil.tenantId, sucursal);
  }
  revalidatePath(`/${slug}/panel`, 'layout');
}

/**
 * Marca un aviso como leído.
 *
 * El identificador NO se valida contra una lista aquí: la política de
 * `notice_reads` solo deja escribir filas con el propio `app_user_id`, y la
 * clave foránea rechaza un aviso inexistente. Marcar como leído un aviso que
 * no se puede ver no revela nada, porque no devuelve nada.
 */
export async function marcarAvisoLeido(form: FormData): Promise<void> {
  const slug = await resolverTenant(form.get('tenantSlug'));
  const avisoId = texto(form, 'avisoId').trim();

  if (!slug || !avisoId || !isSupabaseConfigured()) return;

  const supabase = await createSupabaseServerClient();

  const { data: perfil } = await supabase.from('v_my_profile').select('id').maybeSingle();
  if (!perfil?.id) return;

  await supabase
    .from('notice_reads')
    .upsert({ notice_id: avisoId, app_user_id: perfil.id }, { onConflict: 'notice_id,app_user_id' });

  revalidatePath(`/${slug}/panel`, 'layout');
}
