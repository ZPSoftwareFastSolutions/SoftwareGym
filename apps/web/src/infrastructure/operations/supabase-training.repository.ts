/**
 * CAPA: Infrastructure / Operations
 *
 * Entrenamiento contra Supabase (V3.2).
 *
 * NO SE USAN EMBEBIDOS de PostgREST para unir con `exercises`: la relación va
 * por clave foránea COMPUESTA y el embebido se vuelve ambiguo (lección de
 * V2.2). Se traen las dos tablas y se unen aquí, que además deja una sola
 * consulta por lista en vez de una por fila.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FiltroDeAsignaciones,
  FiltroDeRutinas,
  TrainingRepositoryPort,
} from '@core/application/ports/training-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import { numero } from '@core/domain/operations/dashboard';
import {
  esDiaDeSemana,
  esNivel,
  esObjetivo,
  mensajeDeErrorDeEntrenamiento,
  type ConteoPorDia,
  type DatosDeEjercicioDeRutina,
  type DatosDePrograma,
  type DatosDeRutina,
  type EjercicioAsignado,
  type EjercicioDeRutina,
  type EstadisticaDeEjercicio,
  type EstadisticaDeSocio,
  type Programa,
  type ResumenDeEntrenamiento,
  type Rutina,
  type RutinaAsignada,
} from '@core/domain/operations/training';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
}

function opcional(valor: unknown): number | null {
  return valor === null || valor === undefined || valor === '' ? null : numero(valor);
}

function falloDe(operacion: string, error: { code?: string; message?: string } | null): ResultadoDeOperacion<never> {
  console.error(`[entrenamiento] ${operacion}`, error?.code ?? '', error?.message ?? '');
  return fallo(mensajeDeErrorDeEntrenamiento(`${error?.code ?? ''} ${error?.message ?? ''}`));
}

function aRutina(fila: Record<string, unknown>): Rutina {
  return {
    id: String(fila.id),
    programId: texto(fila.program_id),
    programName: texto(fila.program_name),
    name: String(fila.name ?? ''),
    dayLabel: texto(fila.day_label),
    position: numero(fila.position),
    notes: texto(fila.notes),
    estimatedMinutes: opcional(fila.estimated_minutes),
    isActive: fila.is_active === true,
    ejercicios: numero(fila.ejercicios),
    asignaciones: numero(fila.asignaciones),
    grupos: lista(fila.grupos),
  };
}

function aAsignacion(fila: Record<string, unknown>): RutinaAsignada {
  return {
    id: String(fila.id),
    customerId: String(fila.customer_id),
    customerCode: texto(fila.customer_code),
    customerName: texto(fila.customer_name) ?? 'Socio',
    routineId: texto(fila.routine_id),
    programName: texto(fila.program_name),
    trainerName: texto(fila.trainer_name),
    name: String(fila.name ?? ''),
    dayLabel: texto(fila.day_label),
    position: numero(fila.position),
    notes: texto(fila.notes),
    startsOn: String(fila.starts_on ?? ''),
    endedOn: texto(fila.ended_on),
    ejercicios: numero(fila.ejercicios),
    completados7d: numero(fila.completados_7d),
    ultimoRegistro: texto(fila.ultimo_registro),
  };
}

function filaDeEjercicio(datos: DatosDeEjercicioDeRutina) {
  return {
    position: datos.position,
    sets: datos.sets,
    reps: datos.reps,
    weight_kg: datos.weightKg,
    rest_seconds: datos.restSeconds,
    notes: datos.notes,
  };
}

export class SupabaseTrainingRepository implements TrainingRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  // ---------------------------------------------------------------- plantillas

  async programas(): Promise<readonly Programa[]> {
    const [{ data: programas }, { data: rutinas }] = await Promise.all([
      this.supabase
        .from('training_programs')
        .select('id, name, description, goal, level, weeks, is_active')
        .order('is_active', { ascending: false })
        .order('name', { ascending: true }),
      this.supabase.from('routines').select('program_id').eq('is_active', true),
    ]);

    const porPrograma = new Map<string, number>();
    for (const fila of rutinas ?? []) {
      const id = texto(fila.program_id);
      if (id) porPrograma.set(id, (porPrograma.get(id) ?? 0) + 1);
    }

    return (programas ?? []).map((fila) => ({
      id: String(fila.id),
      name: String(fila.name ?? ''),
      description: texto(fila.description),
      goal: esObjetivo(fila.goal) ? fila.goal : 'otro',
      level: esNivel(fila.level) ? fila.level : 'todos',
      weeks: opcional(fila.weeks),
      isActive: fila.is_active === true,
      rutinas: porPrograma.get(String(fila.id)) ?? 0,
    }));
  }

  async crearPrograma(tenantId: string, datos: DatosDePrograma): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    const { data, error } = await this.supabase
      .from('training_programs')
      .insert({ tenant_id: tenantId, name: datos.name, description: datos.description, goal: datos.goal, level: datos.level, weeks: datos.weeks })
      .select('id')
      .maybeSingle();
    if (error || !data) return falloDe('crearPrograma', error);
    return exito({ id: String(data.id) });
  }

  async actualizarPrograma(id: string, datos: DatosDePrograma): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Programa no encontrado.');
    const { data, error } = await this.supabase
      .from('training_programs')
      .update({ name: datos.name, description: datos.description, goal: datos.goal, level: datos.level, weeks: datos.weeks })
      .eq('id', id)
      .select('id');
    if (error) return falloDe('actualizarPrograma', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar este programa.');
  }

  async cambiarEstadoDePrograma(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Programa no encontrado.');
    const { data, error } = await this.supabase.from('training_programs').update({ is_active: activo }).eq('id', id).select('id');
    if (error) return falloDe('cambiarEstadoDePrograma', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede cambiar este programa.');
  }

  async rutinas(filtro: FiltroDeRutinas): Promise<readonly Rutina[]> {
    let consulta = this.supabase
      .from('v_routines')
      .select('*')
      .order('is_active', { ascending: false })
      .order('position', { ascending: true })
      .order('name', { ascending: true })
      .limit(300);
    if (filtro.programId) {
      if (!PATRON_UUID.test(filtro.programId)) return [];
      consulta = consulta.eq('program_id', filtro.programId);
    }
    if (filtro.soloActivas) consulta = consulta.eq('is_active', true);
    const { data } = await consulta;
    return (data ?? []).map((fila) => aRutina(fila as Record<string, unknown>));
  }

  async rutina(id: string): Promise<Rutina | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('v_routines').select('*').eq('id', id).maybeSingle();
    return data ? aRutina(data as Record<string, unknown>) : null;
  }

  async crearRutina(tenantId: string, programId: string | null, datos: DatosDeRutina): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    if (programId && !PATRON_UUID.test(programId)) return fallo('Ese programa no existe.');
    const { data, error } = await this.supabase
      .from('routines')
      .insert({
        tenant_id: tenantId,
        program_id: programId,
        name: datos.name,
        day_label: datos.dayLabel,
        position: datos.position,
        notes: datos.notes,
        estimated_minutes: datos.estimatedMinutes,
      })
      .select('id')
      .maybeSingle();
    if (error || !data) return falloDe('crearRutina', error);
    return exito({ id: String(data.id) });
  }

  async actualizarRutina(id: string, programId: string | null, datos: DatosDeRutina): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Rutina no encontrada.');
    const { data, error } = await this.supabase
      .from('routines')
      .update({
        program_id: programId,
        name: datos.name,
        day_label: datos.dayLabel,
        position: datos.position,
        notes: datos.notes,
        estimated_minutes: datos.estimatedMinutes,
      })
      .eq('id', id)
      .select('id');
    if (error) return falloDe('actualizarRutina', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar esta rutina.');
  }

  async cambiarEstadoDeRutina(id: string, activa: boolean): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Rutina no encontrada.');
    const { data, error } = await this.supabase.from('routines').update({ is_active: activa }).eq('id', id).select('id');
    if (error) return falloDe('cambiarEstadoDeRutina', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede cambiar esta rutina.');
  }

  /** Une los ejercicios de una lista con su nombre y grupo, sin embebidos. */
  private async conCatalogo<T extends { readonly exercise_id: unknown }>(
    filas: readonly T[],
  ): Promise<ReadonlyMap<string, { readonly name: string; readonly muscleGroup: string }>> {
    const ids = [...new Set(filas.map((f) => String(f.exercise_id)))];
    if (ids.length === 0) return new Map();
    const { data } = await this.supabase.from('exercises').select('id, name, muscle_group').in('id', ids);
    return new Map((data ?? []).map((e) => [String(e.id), { name: String(e.name ?? ''), muscleGroup: String(e.muscle_group ?? '') }]));
  }

  async ejerciciosDeRutina(routineId: string): Promise<readonly EjercicioDeRutina[]> {
    if (!PATRON_UUID.test(routineId)) return [];
    const { data } = await this.supabase
      .from('routine_exercises')
      .select('id, exercise_id, position, sets, reps, weight_kg, rest_seconds, notes')
      .eq('routine_id', routineId)
      .order('position', { ascending: true });

    const filas = data ?? [];
    const catalogo = await this.conCatalogo(filas);
    return filas.map((fila) => ({
      id: String(fila.id),
      exerciseId: String(fila.exercise_id),
      exerciseName: catalogo.get(String(fila.exercise_id))?.name ?? 'Ejercicio',
      muscleGroup: catalogo.get(String(fila.exercise_id))?.muscleGroup ?? '',
      position: numero(fila.position),
      sets: numero(fila.sets),
      reps: String(fila.reps ?? ''),
      weightKg: opcional(fila.weight_kg),
      restSeconds: opcional(fila.rest_seconds),
      notes: texto(fila.notes),
    }));
  }

  async agregarEjercicio(tenantId: string, routineId: string, datos: DatosDeEjercicioDeRutina): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(routineId)) return fallo('Rutina no encontrada.');
    const { error } = await this.supabase
      .from('routine_exercises')
      .insert({ tenant_id: tenantId, routine_id: routineId, exercise_id: datos.exerciseId, ...filaDeEjercicio(datos) });
    return error ? falloDe('agregarEjercicio', error) : exito(null);
  }

  async actualizarEjercicio(id: string, datos: DatosDeEjercicioDeRutina): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ejercicio no encontrado.');
    const { data, error } = await this.supabase.from('routine_exercises').update(filaDeEjercicio(datos)).eq('id', id).select('id');
    if (error) return falloDe('actualizarEjercicio', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar esta rutina.');
  }

  async quitarEjercicio(id: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ejercicio no encontrado.');
    const { data, error } = await this.supabase.from('routine_exercises').delete().eq('id', id).select('id');
    if (error) return falloDe('quitarEjercicio', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar esta rutina.');
  }

  // ---------------------------------------------------------------- asignaciones

  async asignaciones(filtro: FiltroDeAsignaciones): Promise<readonly RutinaAsignada[]> {
    let consulta = this.supabase
      .from('v_customer_routines')
      .select('*')
      .order('ended_on', { ascending: false, nullsFirst: true })
      .order('customer_name', { ascending: true })
      .order('position', { ascending: true })
      .limit(Math.min(filtro.limite ?? 300, 500));
    if (filtro.customerId) {
      if (!PATRON_UUID.test(filtro.customerId)) return [];
      consulta = consulta.eq('customer_id', filtro.customerId);
    }
    if (filtro.trainerId) {
      if (!PATRON_UUID.test(filtro.trainerId)) return [];
      consulta = consulta.eq('trainer_id', filtro.trainerId);
    }
    if (filtro.vigentes) consulta = consulta.is('ended_on', null);
    const { data } = await consulta;
    return (data ?? []).map((fila) => aAsignacion(fila as Record<string, unknown>));
  }

  async asignacion(id: string): Promise<RutinaAsignada | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('v_customer_routines').select('*').eq('id', id).maybeSingle();
    return data ? aAsignacion(data as Record<string, unknown>) : null;
  }

  async asignar(customerId: string, routineId: string, nota: string | null): Promise<ResultadoDeOperacion<{ readonly id: string; readonly ejercicios: number }>> {
    if (!PATRON_UUID.test(customerId) || !PATRON_UUID.test(routineId)) return fallo('Elige el socio y la rutina.');
    const { data, error } = await this.supabase.rpc('asignar_rutina', { p_customer: customerId, p_routine: routineId, p_nota: nota });
    if (error) return falloDe('asignar', error);
    const fila = (data ?? {}) as Record<string, unknown>;
    return exito({ id: String(fila.customer_routine_id ?? ''), ejercicios: numero(fila.ejercicios) });
  }

  async finalizarAsignacion(id: string, hoy: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Rutina asignada no encontrada.');
    const { data, error } = await this.supabase.from('customer_routines').update({ ended_on: hoy }).eq('id', id).select('id');
    if (error) return falloDe('finalizarAsignacion', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede finalizar esta rutina.');
  }

  async ejerciciosAsignados(customerRoutineId: string, hoy: string): Promise<readonly EjercicioAsignado[]> {
    if (!PATRON_UUID.test(customerRoutineId)) return [];
    const desde = new Date(`${hoy}T12:00:00Z`);
    desde.setUTCDate(desde.getUTCDate() - 30);

    const [{ data }, { data: marcas }] = await Promise.all([
      this.supabase
        .from('customer_routine_exercises')
        .select('id, exercise_id, position, sets, reps, weight_kg, rest_seconds, notes')
        .eq('customer_routine_id', customerRoutineId)
        .order('position', { ascending: true }),
      this.supabase
        .from('exercise_completions')
        .select('customer_routine_exercise_id, completed_on')
        .eq('customer_routine_id', customerRoutineId)
        .gte('completed_on', desde.toISOString().slice(0, 10)),
    ]);

    const filas = data ?? [];
    const catalogo = await this.conCatalogo(filas);

    const registros = new Map<string, { veces: number; ultima: string | null; hoy: boolean }>();
    for (const marca of marcas ?? []) {
      const clave = texto(marca.customer_routine_exercise_id);
      if (!clave) continue;
      const fecha = String(marca.completed_on ?? '');
      const actual = registros.get(clave) ?? { veces: 0, ultima: null, hoy: false };
      registros.set(clave, {
        veces: actual.veces + 1,
        ultima: !actual.ultima || fecha > actual.ultima ? fecha : actual.ultima,
        hoy: actual.hoy || fecha === hoy,
      });
    }

    return filas.map((fila) => {
      const registro = registros.get(String(fila.id));
      return {
        id: String(fila.id),
        exerciseId: String(fila.exercise_id),
        exerciseName: catalogo.get(String(fila.exercise_id))?.name ?? 'Ejercicio',
        muscleGroup: catalogo.get(String(fila.exercise_id))?.muscleGroup ?? '',
        position: numero(fila.position),
        sets: numero(fila.sets),
        reps: String(fila.reps ?? ''),
        weightKg: opcional(fila.weight_kg),
        restSeconds: opcional(fila.rest_seconds),
        notes: texto(fila.notes),
        completadoHoy: registro?.hoy ?? false,
        ultimaVez: registro?.ultima ?? null,
        vecesUltimos30: registro?.veces ?? 0,
      };
    });
  }

  async actualizarEjercicioAsignado(id: string, datos: DatosDeEjercicioDeRutina): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ejercicio no encontrado.');
    const { data, error } = await this.supabase.from('customer_routine_exercises').update(filaDeEjercicio(datos)).eq('id', id).select('id');
    if (error) return falloDe('actualizarEjercicioAsignado', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar la rutina de este socio.');
  }

  async quitarEjercicioAsignado(id: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ejercicio no encontrado.');
    const { data, error } = await this.supabase.from('customer_routine_exercises').delete().eq('id', id).select('id');
    if (error) return falloDe('quitarEjercicioAsignado', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar la rutina de este socio.');
  }

  // ---------------------------------------------------------------- progreso

  async marcar(itemId: string, sets: number | null, weightKg: number | null, nota: string | null): Promise<ResultadoDeOperacion<{ readonly yaEstaba: boolean }>> {
    if (!PATRON_UUID.test(itemId)) return fallo('Ese ejercicio no existe.');
    const { data, error } = await this.supabase.rpc('marcar_ejercicio', {
      p_item: itemId,
      p_sets: sets,
      p_weight: weightKg,
      p_nota: nota,
      p_fecha: null,
    });
    if (error) return falloDe('marcar', error);
    return exito({ yaEstaba: (data as Record<string, unknown> | null)?.ya_estaba === true });
  }

  async desmarcar(itemId: string, fecha: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(itemId)) return fallo('Ese ejercicio no existe.');
    // El id del registro se busca aquí: el formulario solo dice qué ejercicio y
    // de qué día, nunca qué fila de progreso borrar.
    const { data: registro } = await this.supabase
      .from('exercise_completions')
      .select('id')
      .eq('customer_routine_exercise_id', itemId)
      .eq('completed_on', fecha)
      .maybeSingle();
    if (!registro) return fallo('Ese ejercicio no estaba marcado hoy.');

    const { error } = await this.supabase.rpc('desmarcar_ejercicio', { p_id: String(registro.id) });
    return error ? falloDe('desmarcar', error) : exito(null);
  }

  // ---------------------------------------------------------------- métricas

  async resumen(): Promise<ResumenDeEntrenamiento | null> {
    const { data } = await this.supabase.from('v_training_overview').select('*').maybeSingle();
    if (!data) return null;
    return {
      hoy: String(data.hoy ?? ''),
      programas: numero(data.programas),
      rutinas: numero(data.rutinas),
      asignaciones: numero(data.asignaciones),
      sociosConRutina: numero(data.socios_con_rutina),
      sociosActivos: numero(data.socios_activos),
      completados7d: numero(data.completados_7d),
      completados30d: numero(data.completados_30d),
      sociosEntrenando30d: numero(data.socios_entrenando_30d),
      diasConRegistro30d: numero(data.dias_con_registro_30d),
    };
  }

  async estadisticasDeEjercicios(): Promise<readonly EstadisticaDeEjercicio[]> {
    const { data } = await this.supabase
      .from('v_training_exercise_stats')
      .select('*')
      .order('veces_30d', { ascending: false })
      .order('name', { ascending: true })
      .limit(300);
    return (data ?? []).map((fila) => ({
      exerciseId: String(fila.exercise_id),
      name: String(fila.name ?? ''),
      muscleGroup: String(fila.muscle_group ?? ''),
      isActive: fila.is_active === true,
      veces30d: numero(fila.veces_30d),
      veces90d: numero(fila.veces_90d),
      socios30d: numero(fila.socios_30d),
      socios90d: numero(fila.socios_90d),
      ultimaVez: texto(fila.ultima_vez),
      enRutinasVigentes: numero(fila.en_rutinas_vigentes),
      pesoPromedio30d: opcional(fila.peso_promedio_30d),
    }));
  }

  async estadisticasPorSocio(limite: number): Promise<readonly EstadisticaDeSocio[]> {
    const { data } = await this.supabase
      .from('v_training_customer_stats')
      .select('*')
      .order('veces_30d', { ascending: false })
      .order('customer_name', { ascending: true })
      .limit(Math.min(limite, 500));
    return (data ?? []).map((fila) => ({
      customerId: String(fila.customer_id),
      customerCode: texto(fila.customer_code),
      customerName: texto(fila.customer_name) ?? 'Socio',
      exerciseId: String(fila.exercise_id),
      exerciseName: String(fila.exercise_name ?? ''),
      muscleGroup: String(fila.muscle_group ?? ''),
      veces30d: numero(fila.veces_30d),
      vecesTotal: numero(fila.veces_total),
      ultimaVez: texto(fila.ultima_vez),
      pesoMaximo: opcional(fila.peso_maximo),
    }));
  }

  async porDiaDeSemana(): Promise<readonly ConteoPorDia[]> {
    const { data } = await this.supabase.from('v_training_weekday').select('*').limit(200);
    return (data ?? [])
      .map((fila) => ({
        dia: numero(fila.dia_semana),
        grupo: String(fila.muscle_group ?? ''),
        veces: numero(fila.veces),
        socios: numero(fila.socios),
        fechas: numero(fila.fechas),
      }))
      .filter((fila): fila is ConteoPorDia => esDiaDeSemana(fila.dia));
  }
}
