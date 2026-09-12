/**
 * CAPA: Infrastructure / Operations
 *
 * Clases grupales contra Supabase (V3.3).
 *
 * Las listas salen de vistas (`v_classes`, `v_class_sessions`…) y no de
 * embebidos de PostgREST: con claves foráneas compuestas el embebido se vuelve
 * ambiguo (lección de V2.2). Los nombres de instructores y de asistentes llegan
 * por funciones de la base con columnas fijas: el socio no lee `trainers` y el
 * instructor no lee `customers`.
 *
 * Aquí no hay un solo filtro de seguridad. Los errores de la base se traducen a
 * frases de mostrador por su CÓDIGO (`mensajeDeErrorDeClases`) y el código queda
 * en el log.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ClassesRepositoryPort,
  FiltroDeSesiones,
  PublicClassesPort,
  ResultadoDeGeneracion,
} from '@core/application/ports/classes-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import { numero } from '@core/domain/operations/dashboard';
import {
  esCategoriaDeClase,
  esDiaIso,
  esEstadoDeSesion,
  esModoDeAcceso,
  esMotivoDeAcceso,
  esNivelDeClase,
  esTipoDeClase,
  mensajeDeErrorDeClases,
  type AsistenteDeClase,
  type CandidatoDeClase,
  type Clase,
  type ClaseAsistida,
  type ClasePublica,
  type DatosDeClase,
  type DatosDeHorario,
  type DatosDeSesion,
  type EstadisticaDeClase,
  type FranjaDeClases,
  type HorarioDeClase,
  type ResumenDeClases,
  type SesionDeClase,
} from '@core/domain/operations/classes';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
}

function opcional(valor: unknown): number | null {
  return valor === null || valor === undefined || valor === '' ? null : numero(valor);
}

/** `19:00:00` → `19:00`. */
function horaCorta(valor: unknown): string {
  return typeof valor === 'string' ? valor.slice(0, 5) : '00:00';
}

function falloDe(operacion: string, error: { code?: string; message?: string } | null): ResultadoDeOperacion<never> {
  console.error(`[clases] ${operacion}`, error?.code ?? '', error?.message ?? '');
  return fallo(mensajeDeErrorDeClases(`${error?.code ?? ''} ${error?.message ?? ''}`));
}

function aClase(fila: Record<string, unknown>): Clase {
  return {
    id: String(fila.id),
    name: String(fila.name ?? ''),
    description: texto(fila.description),
    category: esCategoriaDeClase(fila.category) ? fila.category : 'otro',
    level: esNivelDeClase(fila.level) ? fila.level : 'todos',
    kind: esTipoDeClase(fila.kind) ? fila.kind : 'regular',
    // Un modo desconocido se lee como el más restrictivo: fallar cerrado.
    accessMode: esModoDeAcceso(fila.access_mode) ? fila.access_mode : 'planes',
    durationMinutes: numero(fila.duration_minutes, 60),
    capacity: numero(fila.capacity),
    trainerId: texto(fila.trainer_id),
    trainerName: texto(fila.trainer_name),
    isPublic: fila.is_public === true,
    isActive: fila.is_active === true,
    planIds: lista(fila.plan_ids),
    planNames: lista(fila.plan_names),
    horarios: numero(fila.horarios),
    proximas7d: numero(fila.proximas_7d),
  };
}

function aHorario(fila: Record<string, unknown>): HorarioDeClase | null {
  const dia = numero(fila.weekday);
  if (!esDiaIso(dia)) return null;
  return {
    id: String(fila.id),
    classId: String(fila.class_id),
    className: String(fila.class_name ?? ''),
    category: esCategoriaDeClase(fila.category) ? fila.category : 'otro',
    branchId: String(fila.branch_id),
    branchName: String(fila.branch_name ?? ''),
    trainerId: texto(fila.trainer_id),
    trainerName: texto(fila.trainer_name),
    weekday: dia,
    startTime: horaCorta(fila.start_time),
    durationMinutes: numero(fila.duration_minutes, 60),
    capacity: numero(fila.capacity),
    durationOverride: opcional(fila.duration_override),
    capacityOverride: opcional(fila.capacity_override),
    startsOn: String(fila.starts_on ?? ''),
    endsOn: texto(fila.ends_on),
    isActive: fila.is_active === true,
  };
}

function aSesion(fila: Record<string, unknown>): SesionDeClase {
  const status = fila.status === 'cancelada' ? 'cancelada' : 'programada';
  return {
    id: String(fila.id),
    classId: String(fila.class_id),
    scheduleId: texto(fila.schedule_id),
    className: String(fila.class_name ?? ''),
    category: esCategoriaDeClase(fila.category) ? fila.category : 'otro',
    kind: esTipoDeClase(fila.kind) ? fila.kind : 'regular',
    accessMode: esModoDeAcceso(fila.access_mode) ? fila.access_mode : 'planes',
    branchId: String(fila.branch_id),
    branchName: String(fila.branch_name ?? ''),
    trainerId: texto(fila.trainer_id),
    trainerName: texto(fila.trainer_name),
    sessionDate: String(fila.session_date ?? ''),
    startTime: horaCorta(fila.start_time),
    durationMinutes: numero(fila.duration_minutes, 60),
    capacity: numero(fila.capacity),
    asistentes: numero(fila.asistentes),
    title: texto(fila.title),
    notes: texto(fila.notes),
    status,
    cancelReason: texto(fila.cancel_reason),
    estado: esEstadoDeSesion(fila.estado) ? fila.estado : status,
  };
}

function filaDeClase(datos: DatosDeClase) {
  return {
    name: datos.name,
    description: datos.description,
    category: datos.category,
    level: datos.level,
    kind: datos.kind,
    access_mode: datos.accessMode,
    duration_minutes: datos.durationMinutes,
    capacity: datos.capacity,
    trainer_id: datos.trainerId,
    is_public: datos.isPublic,
  };
}

export class SupabaseClassesRepository implements ClassesRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  // ---------------------------------------------------------------- clases

  async clases(): Promise<readonly Clase[]> {
    const { data } = await this.supabase
      .from('v_classes')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })
      .limit(200);
    return (data ?? []).map((fila) => aClase(fila as Record<string, unknown>));
  }

  async clase(id: string): Promise<Clase | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('v_classes').select('*').eq('id', id).maybeSingle();
    return data ? aClase(data as Record<string, unknown>) : null;
  }

  async crearClase(tenantId: string, datos: DatosDeClase): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    const { data, error } = await this.supabase
      .from('classes')
      .insert({ tenant_id: tenantId, ...filaDeClase(datos) })
      .select('id')
      .maybeSingle();
    if (error || !data) return falloDe('crearClase', error);
    return exito({ id: String(data.id) });
  }

  async actualizarClase(id: string, datos: DatosDeClase): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Clase no encontrada.');
    const { data, error } = await this.supabase.from('classes').update(filaDeClase(datos)).eq('id', id).select('id');
    if (error) return falloDe('actualizarClase', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar esta clase.');
  }

  async cambiarEstadoDeClase(id: string, activa: boolean): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Clase no encontrada.');
    const { data, error } = await this.supabase.from('classes').update({ is_active: activa }).eq('id', id).select('id');
    if (error) return falloDe('cambiarEstadoDeClase', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede cambiar esta clase.');
  }

  async fijarPlanes(classId: string, planIds: readonly string[]): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(classId)) return fallo('Clase no encontrada.');
    const validos = planIds.filter((p) => PATRON_UUID.test(p));
    const { error } = await this.supabase.rpc('fijar_planes_de_clase', { p_clase: classId, p_planes: validos });
    return error ? falloDe('fijarPlanes', error) : exito(null);
  }

  // ---------------------------------------------------------------- horarios

  async horarios(classId?: string): Promise<readonly HorarioDeClase[]> {
    let consulta = this.supabase
      .from('v_class_schedules')
      .select('*')
      .order('is_active', { ascending: false })
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(400);
    if (classId) {
      if (!PATRON_UUID.test(classId)) return [];
      consulta = consulta.eq('class_id', classId);
    }
    const { data } = await consulta;
    return (data ?? []).map((fila) => aHorario(fila as Record<string, unknown>)).filter((h): h is HorarioDeClase => h !== null);
  }

  async crearHorarios(tenantId: string, classId: string, datos: DatosDeHorario): Promise<ResultadoDeOperacion<{ readonly creados: number }>> {
    if (!PATRON_UUID.test(classId)) return fallo('Clase no encontrada.');
    // Un INSERT de varias filas es una sola sentencia: o entran todos los días o ninguno.
    const filas = datos.weekdays.map((weekday) => ({
      tenant_id: tenantId,
      class_id: classId,
      branch_id: datos.branchId,
      trainer_id: datos.trainerId,
      weekday,
      start_time: datos.startTime,
      duration_minutes: datos.durationMinutes,
      capacity: datos.capacity,
      ends_on: datos.endsOn,
    }));
    const { data, error } = await this.supabase.from('class_schedules').insert(filas).select('id');
    if (error) return falloDe('crearHorarios', error);
    return exito({ creados: data?.length ?? 0 });
  }

  async desactivarHorario(id: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Horario no encontrado.');
    const { data, error } = await this.supabase.from('class_schedules').update({ is_active: false }).eq('id', id).select('id');
    if (error) return falloDe('desactivarHorario', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede cambiar este horario.');
  }

  async cancelarSesionesDeHorario(id: string, motivo: string): Promise<ResultadoDeOperacion<{ readonly canceladas: number }>> {
    if (!PATRON_UUID.test(id)) return fallo('Horario no encontrado.');
    const { data, error } = await this.supabase.rpc('cancelar_sesiones_de_horario', { p_horario: id, p_motivo: motivo });
    if (error) return falloDe('cancelarSesionesDeHorario', error);
    return exito({ canceladas: numero((data as Record<string, unknown> | null)?.canceladas) });
  }

  // ---------------------------------------------------------------- sesiones

  async sesiones(filtro: FiltroDeSesiones): Promise<readonly SesionDeClase[]> {
    if (!PATRON_FECHA.test(filtro.desde) || !PATRON_FECHA.test(filtro.hasta)) return [];
    let consulta = this.supabase
      .from('v_class_sessions')
      .select('*')
      .gte('session_date', filtro.desde)
      .lte('session_date', filtro.hasta)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(Math.min(filtro.limite ?? 300, 600));
    for (const [columna, valor] of [
      ['class_id', filtro.classId],
      ['branch_id', filtro.branchId],
      ['trainer_id', filtro.trainerId],
    ] as const) {
      if (valor === undefined) continue;
      if (!PATRON_UUID.test(valor)) return [];
      consulta = consulta.eq(columna, valor);
    }
    if (filtro.soloProgramadas) consulta = consulta.eq('status', 'programada');
    const { data } = await consulta;
    return (data ?? []).map((fila) => aSesion(fila as Record<string, unknown>));
  }

  async sesion(id: string): Promise<SesionDeClase | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('v_class_sessions').select('*').eq('id', id).maybeSingle();
    return data ? aSesion(data as Record<string, unknown>) : null;
  }

  async crearSesion(tenantId: string, datos: DatosDeSesion): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    const { data, error } = await this.supabase
      .from('class_sessions')
      .insert({
        tenant_id: tenantId,
        class_id: datos.classId,
        branch_id: datos.branchId,
        trainer_id: datos.trainerId,
        session_date: datos.sessionDate,
        start_time: datos.startTime,
        duration_minutes: datos.durationMinutes,
        capacity: datos.capacity,
        title: datos.title,
        notes: datos.notes,
      })
      .select('id')
      .maybeSingle();
    if (error || !data) return falloDe('crearSesion', error);
    return exito({ id: String(data.id) });
  }

  async actualizarSesion(id: string, datos: Omit<DatosDeSesion, 'classId'>): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Sesión no encontrada.');
    const cambios: Record<string, unknown> = {
      branch_id: datos.branchId,
      trainer_id: datos.trainerId,
      session_date: datos.sessionDate,
      start_time: datos.startTime,
      title: datos.title,
      notes: datos.notes,
    };
    // Vacío = no tocar: la sesión ya tiene su duración y cupo (heredados o no).
    if (datos.durationMinutes !== null) cambios.duration_minutes = datos.durationMinutes;
    if (datos.capacity !== null) cambios.capacity = datos.capacity;
    const { data, error } = await this.supabase.from('class_sessions').update(cambios).eq('id', id).select('id');
    if (error) return falloDe('actualizarSesion', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar esta sesión.');
  }

  async cancelarSesion(id: string, motivo: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Sesión no encontrada.');
    const { data, error } = await this.supabase
      .from('class_sessions')
      .update({ status: 'cancelada', cancel_reason: motivo })
      .eq('id', id)
      .select('id');
    if (error) return falloDe('cancelarSesion', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede cancelar esta sesión.');
  }

  async generarSesiones(desde: string, hasta: string, classId: string | null): Promise<ResultadoDeOperacion<ResultadoDeGeneracion>> {
    if (classId && !PATRON_UUID.test(classId)) return fallo('Clase no encontrada.');
    const { data, error } = await this.supabase.rpc('generar_sesiones_de_clases', { p_desde: desde, p_hasta: hasta, p_clase: classId });
    if (error) return falloDe('generarSesiones', error);
    const fila = (data ?? {}) as Record<string, unknown>;
    const conflictos = Array.isArray(fila.conflictos) ? (fila.conflictos as Record<string, unknown>[]) : [];
    return exito({
      creadas: numero(fila.creadas),
      existentes: numero(fila.existentes),
      conflictos: conflictos.map((c) => ({
        fecha: String(c.fecha ?? ''),
        hora: String(c.hora ?? ''),
        clase: String(c.clase ?? ''),
        motivo: mensajeDeErrorDeClases(String(c.motivo ?? '')),
      })),
    });
  }

  // ---------------------------------------------------------------- asistencia

  async asistentes(sessionId: string): Promise<readonly AsistenteDeClase[]> {
    if (!PATRON_UUID.test(sessionId)) return [];
    const { data, error } = await this.supabase.rpc('asistentes_de_sesion', { p_session: sessionId });
    if (error) {
      console.error('[clases] asistentes', error.code, error.message);
      return [];
    }
    return ((data ?? []) as Record<string, unknown>[]).map((fila) => ({
      attendanceId: String(fila.attendance_id),
      customerId: String(fila.customer_id),
      customerCode: texto(fila.customer_code),
      fullName: `${String(fila.first_name ?? '')} ${String(fila.last_name ?? '')}`.trim() || 'Socio',
      planName: texto(fila.plan_name),
      method: fila.method === 'qr' ? 'qr' : 'manual',
      checkedInAt: String(fila.checked_in_at ?? ''),
      markedByName: texto(fila.marked_by_name),
    }));
  }

  async candidatos(sessionId: string, buscar: string | null): Promise<readonly CandidatoDeClase[]> {
    if (!PATRON_UUID.test(sessionId)) return [];
    const { data, error } = await this.supabase.rpc('candidatos_de_sesion', { p_session: sessionId, p_buscar: buscar });
    if (error) {
      console.error('[clases] candidatos', error.code, error.message);
      return [];
    }
    return ((data ?? []) as Record<string, unknown>[]).map((fila) => ({
      customerId: String(fila.customer_id),
      customerCode: texto(fila.customer_code),
      fullName: `${String(fila.first_name ?? '')} ${String(fila.last_name ?? '')}`.trim() || 'Socio',
      planName: texto(fila.plan_name),
      habilitado: fila.habilitado === true,
      motivo: esMotivoDeAcceso(fila.motivo) ? fila.motivo : 'clase_no_disponible',
      yaRegistrado: fila.ya_registrado === true,
    }));
  }

  async registrarAsistencia(
    sessionId: string,
    customerId: string,
    metodo: 'manual' | 'qr',
  ): Promise<ResultadoDeOperacion<{ readonly asistentes: number; readonly capacidad: number }>> {
    if (!PATRON_UUID.test(sessionId) || !PATRON_UUID.test(customerId)) return fallo('Elige al socio.');
    const { data, error } = await this.supabase.rpc('registrar_asistencia_a_clase', { p_session: sessionId, p_customer: customerId, p_metodo: metodo });
    if (error) return falloDe('registrarAsistencia', error);
    const fila = (data ?? {}) as Record<string, unknown>;
    return exito({ asistentes: numero(fila.asistentes), capacidad: numero(fila.capacidad) });
  }

  async quitarAsistencia(attendanceId: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(attendanceId)) return fallo('Registro no encontrado.');
    const { data, error } = await this.supabase.from('class_attendances').delete().eq('id', attendanceId).select('id');
    if (error) return falloDe('quitarAsistencia', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede quitar asistentes de esta sesión.');
  }

  async clasesAsistidas(customerId: string, limite: number): Promise<readonly ClaseAsistida[]> {
    if (!PATRON_UUID.test(customerId)) return [];
    const { data } = await this.supabase
      .from('v_class_attendance_log')
      .select('id, session_id, class_name, category, branch_name, session_date, start_time')
      .eq('customer_id', customerId)
      .order('session_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(Math.min(limite, 200));
    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      sessionId: String(fila.session_id),
      className: String(fila.class_name ?? ''),
      category: esCategoriaDeClase(fila.category) ? fila.category : 'otro',
      branchName: String(fila.branch_name ?? ''),
      sessionDate: String(fila.session_date ?? ''),
      startTime: horaCorta(fila.start_time),
    }));
  }

  // ---------------------------------------------------------------- métricas

  async resumen(): Promise<ResumenDeClases | null> {
    const { data } = await this.supabase.from('v_class_overview').select('*').maybeSingle();
    if (!data) return null;
    return {
      hoy: String(data.hoy ?? ''),
      clases: numero(data.clases),
      horarios: numero(data.horarios),
      sesionesHoy: numero(data.sesiones_hoy),
      sesiones7d: numero(data.sesiones_7d),
      asistencias30d: numero(data.asistencias_30d),
      socios30d: numero(data.socios_30d),
      canceladas30d: numero(data.canceladas_30d),
    };
  }

  async estadisticas(): Promise<readonly EstadisticaDeClase[]> {
    const { data } = await this.supabase.from('v_class_stats').select('*').order('asistencias_30d', { ascending: false }).limit(200);
    return (data ?? []).map((fila) => ({
      classId: String(fila.class_id),
      name: String(fila.name ?? ''),
      category: esCategoriaDeClase(fila.category) ? fila.category : 'otro',
      kind: esTipoDeClase(fila.kind) ? fila.kind : 'regular',
      accessMode: esModoDeAcceso(fila.access_mode) ? fila.access_mode : 'planes',
      isActive: fila.is_active === true,
      capacity: numero(fila.capacity),
      sesiones30d: numero(fila.sesiones_30d),
      canceladas30d: numero(fila.canceladas_30d),
      asistencias30d: numero(fila.asistencias_30d),
      socios30d: numero(fila.socios_30d),
      ocupacion30d: opcional(fila.ocupacion_30d),
      maximo30d: opcional(fila.maximo_30d),
    }));
  }

  async franjas(): Promise<readonly FranjaDeClases[]> {
    const { data } = await this.supabase.from('v_class_slot_stats').select('*').limit(200);
    return (data ?? [])
      .map((fila) => ({
        dia: numero(fila.dia_semana),
        hora: numero(fila.hora),
        sesiones: numero(fila.sesiones),
        asistencias: numero(fila.asistencias),
        capacidad: numero(fila.capacidad),
      }))
      .filter((fila): fila is FranjaDeClases => esDiaIso(fila.dia));
  }
}

export class SupabasePublicClassesRepository implements PublicClassesPort {
  constructor(private readonly supabase: SupabaseClient | null) {}

  async clasesPublicas(tenantSlug: string): Promise<readonly ClasePublica[]> {
    if (!this.supabase) return [];
    try {
      // Columnas explícitas: el anónimo solo tiene concedidas estas.
      const [{ data: clases, error }, { data: horarios }] = await Promise.all([
        this.supabase
          .from('classes')
          .select('id, name, description, category, level, kind, access_mode, duration_minutes')
          .eq('tenant_slug', tenantSlug)
          .eq('is_active', true)
          .eq('is_public', true)
          .order('name', { ascending: true }),
        this.supabase
          .from('class_schedules')
          .select('class_id, branch_id, weekday, start_time, duration_minutes')
          .eq('tenant_slug', tenantSlug)
          .eq('is_active', true)
          .order('weekday', { ascending: true })
          .order('start_time', { ascending: true }),
      ]);
      // Sin datos, la vitrina ofrece el contacto en vez de romper: un horario de
      // clases nunca justifica un error 500.
      if (error || !clases) return [];

      const ids = clases.map((c) => String(c.id));
      const { data: planes } = ids.length > 0 ? await this.supabase.from('class_plans').select('class_id, plan_id').in('class_id', ids) : { data: [] };
      // Nombres de los planes: el anónimo ya lee los planes activos (la vitrina
      // de precios los necesita). Un plan desactivado simplemente no aparece.
      const planIds = [...new Set((planes ?? []).map((p) => String(p.plan_id)))];
      const { data: nombres } =
        planIds.length > 0 ? await this.supabase.from('membership_plans').select('id, name, code').in('id', planIds).eq('is_active', true) : { data: [] };
      const planPorId = new Map((nombres ?? []).map((p) => [String(p.id), { id: String(p.id), name: String(p.name ?? ''), code: texto(p.code) }]));

      return clases.map((c) => {
        const id = String(c.id);
        return {
          id,
          name: String(c.name ?? ''),
          description: texto(c.description),
          category: esCategoriaDeClase(c.category) ? c.category : 'otro',
          level: esNivelDeClase(c.level) ? c.level : 'todos',
          kind: esTipoDeClase(c.kind) ? c.kind : 'regular',
          accessMode: esModoDeAcceso(c.access_mode) ? c.access_mode : 'planes',
          durationMinutes: numero(c.duration_minutes, 60),
          planes: (planes ?? [])
            .filter((p) => String(p.class_id) === id)
            .map((p) => planPorId.get(String(p.plan_id)))
            .filter((p): p is { id: string; name: string; code: string | null } => p !== undefined),
          horarios: (horarios ?? [])
            .filter((h) => String(h.class_id) === id && esDiaIso(numero(h.weekday)))
            .map((h) => ({
              weekday: numero(h.weekday) as ClasePublica['horarios'][number]['weekday'],
              startTime: horaCorta(h.start_time),
              branchId: String(h.branch_id),
              durationMinutes: numero(h.duration_minutes, numero(c.duration_minutes, 60)),
            })),
        };
      });
    } catch {
      return [];
    }
  }
}
