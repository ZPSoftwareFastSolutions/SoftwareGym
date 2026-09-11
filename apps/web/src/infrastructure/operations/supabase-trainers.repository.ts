/**
 * CAPA: Infrastructure / Operations
 *
 * Entrenadores contra Supabase (V3.1).
 *
 * Sin filtros de seguridad propios: qué entrenadores, ausencias y
 * asignaciones existen para quien pregunta lo decide RLS; la regla del plan la
 * aplica un disparador; la cuenta se vincula por RPC (la base otorga el rol).
 * Los errores se traducen por CÓDIGO y el código queda en el log del servidor.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FiltroDeAsignaciones,
  NuevaAsignacion,
  TrainersRepositoryPort,
} from '@core/application/ports/trainers-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import { numero } from '@core/domain/operations/dashboard';
import {
  esTipoDeAsignacion,
  esTipoDeAusencia,
  mensajeDeErrorDeEntrenadores,
  type AsignacionDeEntrenador,
  type Ausencia,
  type DatosDeAusencia,
  type DatosDeEntrenador,
  type Entrenador,
  type EstadoDeMembresiaDelAsignado,
  type ReglaDePlan,
  type SocioAsignado,
} from '@core/domain/operations/trainers';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function hora(valor: unknown): string | null {
  const t = texto(valor);
  return t ? t.slice(0, 5) : null;
}

function estadoDelAsignado(valor: unknown): EstadoDeMembresiaDelAsignado {
  return valor === 'vigente' || valor === 'vencida' ? valor : 'sin_membresia';
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
}

function aEntrenador(fila: Record<string, unknown>): Entrenador {
  return {
    id: String(fila.id),
    firstName: String(fila.first_name ?? ''),
    lastName: String(fila.last_name ?? ''),
    fullName: String(fila.full_name ?? `${String(fila.first_name ?? '')} ${String(fila.last_name ?? '')}`),
    email: texto(fila.email),
    phone: texto(fila.phone),
    bio: texto(fila.bio),
    specialties: lista(fila.specialties),
    isActive: fila.is_active === true,
    appUserId: texto(fila.app_user_id),
    accountEmail: texto(fila.account_email),
    branchIds: lista(fila.branch_ids),
    principales: numero(fila.principales),
    secundarios: numero(fila.secundarios),
    ausenciaHoy: fila.ausencia_hoy === true,
  };
}

function aAusencia(fila: Record<string, unknown>): Ausencia {
  return {
    id: String(fila.id),
    trainerId: String(fila.trainer_id),
    kind: esTipoDeAusencia(fila.kind) ? fila.kind : 'dia',
    shiftCode: texto(fila.shift_code),
    startDate: String(fila.start_date ?? ''),
    endDate: String(fila.end_date ?? ''),
    startTime: hora(fila.start_time),
    endTime: hora(fila.end_time),
    reason: texto(fila.reason),
  };
}

function aAsignacion(fila: Record<string, unknown>): AsignacionDeEntrenador {
  return {
    id: String(fila.id),
    customerId: String(fila.customer_id),
    trainerId: String(fila.trainer_id),
    kind: esTipoDeAsignacion(fila.kind) ? fila.kind : 'secundario',
    focus: texto(fila.focus),
    startsOn: String(fila.starts_on ?? ''),
    endedOn: texto(fila.ended_on),
    customerCode: texto(fila.customer_code),
    customerName: texto(fila.customer_name) ?? 'Socio',
    trainerName: texto(fila.trainer_name) ?? 'Entrenador',
    trainerActive: fila.trainer_active === true,
    planName: texto(fila.plan_name),
    membershipEnd: texto(fila.membership_end),
    includesTrainer: typeof fila.includes_trainer === 'boolean' ? fila.includes_trainer : null,
    maxSecondaryTrainers: fila.max_secondary_trainers === null || fila.max_secondary_trainers === undefined ? null : numero(fila.max_secondary_trainers),
    membershipStatus: estadoDelAsignado(fila.membership_status),
  };
}

function aFila(datos: DatosDeEntrenador) {
  return {
    first_name: datos.firstName,
    last_name: datos.lastName,
    email: datos.email,
    phone: datos.phone,
    bio: datos.bio,
    specialties: [...datos.specialties],
  };
}

function falloDe(operacion: string, error: { code?: string; message?: string } | null): ResultadoDeOperacion<never> {
  console.error(`[entrenadores] ${operacion}`, error?.code ?? '', error?.message ?? '');
  return fallo(mensajeDeErrorDeEntrenadores(`${error?.code ?? ''} ${error?.message ?? ''}`));
}

const COLUMNAS_DE_VISTA =
  'id, first_name, last_name, full_name, email, phone, bio, specialties, is_active, app_user_id, account_email, branch_ids, principales, secundarios, ausencia_hoy';

export class SupabaseTrainersRepository implements TrainersRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(): Promise<readonly Entrenador[]> {
    const { data } = await this.supabase
      .from('v_trainers')
      .select(COLUMNAS_DE_VISTA)
      .order('is_active', { ascending: false })
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });
    return (data ?? []).map((fila) => aEntrenador(fila));
  }

  async porId(id: string): Promise<Entrenador | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('v_trainers').select(COLUMNAS_DE_VISTA).eq('id', id).maybeSingle();
    return data ? aEntrenador(data) : null;
  }

  async porCuenta(appUserId: string): Promise<Entrenador | null> {
    if (!PATRON_UUID.test(appUserId)) return null;
    const { data } = await this.supabase.from('v_trainers').select(COLUMNAS_DE_VISTA).eq('app_user_id', appUserId).maybeSingle();
    return data ? aEntrenador(data) : null;
  }

  async crear(tenantId: string, datos: DatosDeEntrenador): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    const { data, error } = await this.supabase
      .from('trainers')
      .insert({ tenant_id: tenantId, ...aFila(datos) })
      .select('id')
      .maybeSingle();
    if (error || !data) return falloDe('crear', error);
    return exito({ id: String(data.id) });
  }

  async actualizar(id: string, datos: DatosDeEntrenador): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Entrenador no encontrado.');
    const { data, error } = await this.supabase.from('trainers').update(aFila(datos)).eq('id', id).select('id');
    if (error) return falloDe('actualizar', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar este entrenador.');
  }

  async cambiarEstado(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Entrenador no encontrado.');
    const { data, error } = await this.supabase.from('trainers').update({ is_active: activo }).eq('id', id).select('id');
    if (error) return falloDe('cambiarEstado', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede cambiar el estado de este entrenador.');
  }

  async fijarSucursales(tenantId: string, trainerId: string, branchIds: readonly string[]): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(trainerId) || branchIds.some((id) => !PATRON_UUID.test(id))) return fallo('Datos de sede no válidos.');

    const { data: actuales, error: errorDeLectura } = await this.supabase
      .from('trainer_branches')
      .select('branch_id')
      .eq('trainer_id', trainerId);
    if (errorDeLectura) return falloDe('leerSucursales', errorDeLectura);

    const tiene = new Set((actuales ?? []).map((fila) => String(fila.branch_id)));
    const quiere = new Set(branchIds);
    const agregar = [...quiere].filter((id) => !tiene.has(id));
    const quitar = [...tiene].filter((id) => !quiere.has(id));

    if (agregar.length > 0) {
      const { error } = await this.supabase
        .from('trainer_branches')
        .insert(agregar.map((branchId) => ({ tenant_id: tenantId, trainer_id: trainerId, branch_id: branchId })));
      if (error) return falloDe('agregarSucursales', error);
    }
    if (quitar.length > 0) {
      const { error } = await this.supabase.from('trainer_branches').delete().eq('trainer_id', trainerId).in('branch_id', quitar);
      if (error) return falloDe('quitarSucursales', error);
    }
    return exito(null);
  }

  async vincularCuenta(trainerId: string, email: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(trainerId)) return fallo('Entrenador no encontrado.');
    const { error } = await this.supabase.rpc('vincular_cuenta_de_entrenador', { p_trainer: trainerId, p_email: email });
    return error ? falloDe('vincularCuenta', error) : exito(null);
  }

  async desvincularCuenta(trainerId: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(trainerId)) return fallo('Entrenador no encontrado.');
    const { error } = await this.supabase.rpc('desvincular_cuenta_de_entrenador', { p_trainer: trainerId });
    return error ? falloDe('desvincularCuenta', error) : exito(null);
  }

  async ausencias(trainerId: string | null): Promise<readonly Ausencia[]> {
    let consulta = this.supabase
      .from('trainer_unavailability')
      .select('id, trainer_id, kind, shift_code, start_date, end_date, start_time, end_time, reason')
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
      .limit(500);
    if (trainerId) {
      if (!PATRON_UUID.test(trainerId)) return [];
      consulta = consulta.eq('trainer_id', trainerId);
    }
    const { data } = await consulta;
    return (data ?? []).map((fila) => aAusencia(fila));
  }

  async registrarAusencia(tenantId: string, trainerId: string, datos: DatosDeAusencia): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(trainerId)) return fallo('Entrenador no encontrado.');
    const { error } = await this.supabase.from('trainer_unavailability').insert({
      tenant_id: tenantId,
      trainer_id: trainerId,
      kind: datos.kind,
      shift_code: datos.shiftCode,
      start_date: datos.startDate,
      end_date: datos.endDate,
      start_time: datos.startTime,
      end_time: datos.endTime,
      reason: datos.reason,
    });
    return error ? falloDe('registrarAusencia', error) : exito(null);
  }

  async eliminarAusencia(id: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ausencia no encontrada.');
    const { data, error } = await this.supabase.from('trainer_unavailability').delete().eq('id', id).select('id');
    if (error) return falloDe('eliminarAusencia', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede borrar esta ausencia.');
  }

  async asignaciones(filtro: FiltroDeAsignaciones): Promise<readonly AsignacionDeEntrenador[]> {
    let consulta = this.supabase
      .from('v_customer_trainers')
      .select('*')
      .order('ended_on', { ascending: false, nullsFirst: true })
      .order('kind', { ascending: true })
      .order('customer_name', { ascending: true })
      .limit(500);
    if (filtro.trainerId) {
      if (!PATRON_UUID.test(filtro.trainerId)) return [];
      consulta = consulta.eq('trainer_id', filtro.trainerId);
    }
    if (filtro.customerId) {
      if (!PATRON_UUID.test(filtro.customerId)) return [];
      consulta = consulta.eq('customer_id', filtro.customerId);
    }
    if (filtro.vigentes) consulta = consulta.is('ended_on', null);
    const { data } = await consulta;
    return (data ?? []).map((fila) => aAsignacion(fila as Record<string, unknown>));
  }

  async asignar(tenantId: string, asignacion: NuevaAsignacion): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(asignacion.customerId) || !PATRON_UUID.test(asignacion.trainerId)) return fallo('Elige socio y entrenador.');
    const { error } = await this.supabase.from('customer_trainers').insert({
      tenant_id: tenantId,
      customer_id: asignacion.customerId,
      trainer_id: asignacion.trainerId,
      kind: asignacion.kind,
      focus: asignacion.focus,
    });
    return error ? falloDe('asignar', error) : exito(null);
  }

  async finalizarAsignacion(id: string, hoy: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Asignación no encontrada.');
    const { data, error } = await this.supabase.from('customer_trainers').update({ ended_on: hoy }).eq('id', id).select('id');
    if (error) return falloDe('finalizarAsignacion', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede finalizar esta asignación.');
  }

  async reglasDePlanes(): Promise<readonly ReglaDePlan[]> {
    const { data } = await this.supabase
      .from('membership_plans')
      .select('id, code, name, includes_trainer, max_secondary_trainers')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    return (data ?? []).map((fila) => ({
      planId: String(fila.id),
      planName: texto(fila.name) ?? 'Plan',
      planCode: texto(fila.code),
      includesTrainer: fila.includes_trainer === true,
      maxSecondaryTrainers: numero(fila.max_secondary_trainers),
    }));
  }

  async guardarReglaDePlan(planId: string, regla: Pick<ReglaDePlan, 'includesTrainer' | 'maxSecondaryTrainers'>): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(planId)) return fallo('Plan no encontrado.');
    const { data, error } = await this.supabase
      .from('membership_plans')
      .update({ includes_trainer: regla.includesTrainer, max_secondary_trainers: regla.maxSecondaryTrainers })
      .eq('id', planId)
      .select('id');
    if (error) return falloDe('guardarReglaDePlan', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar los planes.');
  }

  async misSocios(): Promise<readonly SocioAsignado[]> {
    const { data } = await this.supabase.rpc('mis_socios_asignados');
    return ((data ?? []) as Record<string, unknown>[]).map((fila) => ({
      assignmentId: String(fila.assignment_id),
      kind: esTipoDeAsignacion(fila.kind) ? fila.kind : 'secundario',
      focus: texto(fila.focus),
      startsOn: String(fila.starts_on ?? ''),
      customerId: String(fila.customer_id),
      customerCode: texto(fila.customer_code),
      fullName: `${String(fila.first_name ?? '')} ${String(fila.last_name ?? '')}`.trim() || 'Socio',
      planName: texto(fila.plan_name),
      membershipEnd: texto(fila.membership_end),
      membershipStatus: estadoDelAsignado(fila.membership_status),
    }));
  }
}
