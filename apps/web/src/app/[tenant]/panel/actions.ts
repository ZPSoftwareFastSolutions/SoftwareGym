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
import type { ResultadoDeCheckIn } from '@core/domain/operations/attendance';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { operationsRepository, tenantRepository } from '@infra/config/composition-root';
import { createSupabaseServerClient } from '@infra/auth/supabase.server';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';

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
  const resultado = await repo.registrarCheckIn(codigo);

  // Solo se revalida cuando algo cambió de verdad. Revalidar en cada intento
  // fallido tiraría la caché del panel entero por teclear mal un código.
  if (resultado.tipo === 'registrado' || resultado.tipo === 'sin-membresia') {
    revalidatePath(`/${slug}/panel`, 'layout');
  }

  return { resultado, intentado: codigo };
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
