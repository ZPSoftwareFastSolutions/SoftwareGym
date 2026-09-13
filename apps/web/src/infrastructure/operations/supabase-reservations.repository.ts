/**
 * CAPA: Infrastructure / Operations
 *
 * Reservas de clases contra Supabase (V3.4).
 *
 * Reservar, cancelar, justificar y cerrar la lista pasan por RPC invocador; la
 * lista de una sesión con nombres, por una función de columnas fijas (el
 * instructor no lee `customers`). Los errores se traducen por su código: primero
 * los de reservas y, si no es uno de ellos, los de clases (plan, cupo, sesión).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReservationsRepositoryPort, ResultadoDeReserva } from '@core/application/ports/reservations-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import { numero } from '@core/domain/operations/dashboard';
import { mensajeDeErrorDeClases } from '@core/domain/operations/classes';
import {
  AJUSTES_RECOMENDADOS,
  esEstadoDeReserva,
  mensajeDeErrorDeReservas,
  type AjustesDeReserva,
  type AvisoDeReserva,
  type EstadisticaDeReservas,
  type EstadoDeReservasDelSocio,
  type Inasistencia,
  type Reserva,
  type ReservaDeSesion,
  type ResumenDeReservas,
} from '@core/domain/operations/reservations';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS_DE_AVISO = new Set(['reserva_promovida', 'reserva_cancelada_por_gimnasio', 'reservas_bloqueadas', 'inasistencia_justificada']);

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function opcional(valor: unknown): number | null {
  return valor === null || valor === undefined || valor === '' ? null : numero(valor);
}

function falloDe(operacion: string, error: { code?: string; message?: string; details?: string } | null): ResultadoDeOperacion<never> {
  console.error(`[reservas] ${operacion}`, error?.code ?? '', error?.message ?? '');
  const detalle = `${error?.code ?? ''} ${error?.message ?? ''}`;
  if (detalle.includes('reservas_bloqueadas') && error?.details && PATRON_FECHA.test(error.details)) {
    const [anio, mes, dia] = error.details.split('-');
    return fallo(`Tus reservas están bloqueadas hasta el ${dia}/${mes}/${anio} por faltas recientes. Habla con recepción.`);
  }
  return fallo(mensajeDeErrorDeReservas(detalle) ?? mensajeDeErrorDeClases(detalle));
}

function aAjustes(fila: Record<string, unknown> | null | undefined): AjustesDeReserva {
  if (!fila) return AJUSTES_RECOMENDADOS;
  return {
    openDaysBefore: numero(fila.open_days_before, AJUSTES_RECOMENDADOS.openDaysBefore),
    closeMinutesBefore: numero(fila.close_minutes_before, AJUSTES_RECOMENDADOS.closeMinutesBefore),
    cancelMinutesBefore: numero(fila.cancel_minutes_before, AJUSTES_RECOMENDADOS.cancelMinutesBefore),
    maxActive: numero(fila.max_active, AJUSTES_RECOMENDADOS.maxActive),
    waitlistEnabled: fila.waitlist_enabled !== false,
    waitlistMax: numero(fila.waitlist_max, AJUSTES_RECOMENDADOS.waitlistMax),
    noShowLimit: numero(fila.no_show_limit, AJUSTES_RECOMENDADOS.noShowLimit),
    noShowWindowDays: numero(fila.no_show_window_days, AJUSTES_RECOMENDADOS.noShowWindowDays),
    blockDays: numero(fila.block_days, AJUSTES_RECOMENDADOS.blockDays),
    lateCancelCounts: fila.late_cancel_counts !== false,
  };
}

function horaCorta(valor: unknown): string {
  return typeof valor === 'string' ? valor.slice(0, 5) : '00:00';
}

export class SupabaseReservationsRepository implements ReservationsRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async reservar(sessionId: string, customerId: string | null): Promise<ResultadoDeOperacion<ResultadoDeReserva>> {
    if (!PATRON_UUID.test(sessionId) || (customerId !== null && !PATRON_UUID.test(customerId))) return fallo('Elige la sesión y el socio.');
    const { data, error } = await this.supabase.rpc('reservar_clase', { p_session: sessionId, p_customer: customerId });
    if (error) return falloDe('reservar', error);
    const fila = (data ?? {}) as Record<string, unknown>;
    return exito({ estado: fila.estado === 'en_espera' ? 'en_espera' : 'reservada', posicion: opcional(fila.posicion) });
  }

  async cancelar(reservationId: string, motivo: string | null): Promise<ResultadoDeOperacion<{ readonly tardia: boolean }>> {
    if (!PATRON_UUID.test(reservationId)) return fallo('Reserva no encontrada.');
    const { data, error } = await this.supabase.rpc('cancelar_reserva', { p_reservation: reservationId, p_motivo: motivo });
    if (error) return falloDe('cancelar', error);
    return exito({ tardia: (data as Record<string, unknown> | null)?.tardia === true });
  }

  async reservasDelSocio(customerId: string, desde: string, limite: number): Promise<readonly Reserva[]> {
    if (!PATRON_UUID.test(customerId) || !PATRON_FECHA.test(desde)) return [];
    const { data } = await this.supabase
      .from('v_class_reservations')
      .select('*')
      .eq('customer_id', customerId)
      .gte('session_date', desde)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(Math.min(limite, 200));
    return (data ?? []).map((f) => {
      const fila = f as Record<string, unknown>;
      const status = esEstadoDeReserva(fila.status) ? fila.status : 'cancelada';
      return {
        id: String(fila.id),
        sessionId: String(fila.session_id),
        customerId: String(fila.customer_id),
        classId: String(fila.class_id),
        className: String(fila.class_name ?? ''),
        branchName: String(fila.branch_name ?? ''),
        sessionDate: String(fila.session_date ?? ''),
        startTime: horaCorta(fila.start_time),
        durationMinutes: numero(fila.duration_minutes, 60),
        status,
        estadoEfectivo: esEstadoDeReserva(fila.estado_efectivo) ? fila.estado_efectivo : status,
        source: fila.source === 'personal' ? 'personal' : 'socio',
        lateCancel: fila.late_cancel === true,
        cancelledByGym: fila.cancelled_by_gym === true,
        cancelReason: texto(fila.cancel_reason),
        posicion: opcional(fila.posicion),
        sessionCancelled: fila.session_status === 'cancelada',
        createdAt: String(fila.created_at ?? ''),
        promotedAt: texto(fila.promoted_at),
      };
    });
  }

  async miEstado(): Promise<EstadoDeReservasDelSocio | null> {
    const { data, error } = await this.supabase.rpc('mi_estado_de_reservas');
    if (error || !data) return null;
    const fila = data as Record<string, unknown>;
    return { bloqueadoHasta: texto(fila.bloqueado_hasta), activas: numero(fila.activas), ajustes: aAjustes(fila) };
  }

  async avisos(): Promise<readonly AvisoDeReserva[]> {
    const { data } = await this.supabase
      .from('customer_messages')
      .select('id, kind, title, body, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(15);
    return (data ?? [])
      .filter((f) => TIPOS_DE_AVISO.has(String(f.kind)))
      .map((f) => ({
        id: String(f.id),
        kind: String(f.kind) as AvisoDeReserva['kind'],
        title: String(f.title ?? ''),
        body: String(f.body ?? ''),
        createdAt: String(f.created_at ?? ''),
        leido: Boolean(f.read_at),
      }));
  }

  async marcarAvisoLeido(id: string): Promise<void> {
    if (!PATRON_UUID.test(id)) return;
    // La base pone la hora (disparador) y RLS solo deja tocar los avisos propios.
    await this.supabase.from('customer_messages').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  async reservasDeSesion(sessionId: string): Promise<readonly ReservaDeSesion[]> {
    if (!PATRON_UUID.test(sessionId)) return [];
    const { data, error } = await this.supabase.rpc('reservas_de_sesion', { p_session: sessionId });
    if (error) {
      console.error('[reservas] reservasDeSesion', error.code, error.message);
      return [];
    }
    return ((data ?? []) as Record<string, unknown>[]).map((fila) => ({
      reservationId: String(fila.reservation_id),
      customerId: String(fila.customer_id),
      customerCode: texto(fila.customer_code),
      fullName: `${String(fila.first_name ?? '')} ${String(fila.last_name ?? '')}`.trim() || 'Socio',
      planName: texto(fila.plan_name),
      status: esEstadoDeReserva(fila.status) ? fila.status : 'cancelada',
      source: fila.source === 'personal' ? 'personal' : 'socio',
      lateCancel: fila.late_cancel === true,
      posicion: opcional(fila.posicion),
      createdAt: String(fila.created_at ?? ''),
      asistio: fila.asistio === true,
    }));
  }

  async cerrarLista(sessionId: string): Promise<ResultadoDeOperacion<{ readonly inasistencias: number; readonly esperaCerrada: number }>> {
    if (!PATRON_UUID.test(sessionId)) return fallo('Sesión no encontrada.');
    const { data, error } = await this.supabase.rpc('cerrar_lista_de_sesion', { p_session: sessionId });
    if (error) return falloDe('cerrarLista', error);
    const fila = (data ?? {}) as Record<string, unknown>;
    return exito({ inasistencias: numero(fila.inasistencias), esperaCerrada: numero(fila.espera_cerrada) });
  }

  async ajustes(): Promise<AjustesDeReserva> {
    const { data } = await this.supabase.from('tenant_reservation_settings').select('*').maybeSingle();
    return aAjustes(data as Record<string, unknown> | null);
  }

  async guardarAjustes(a: AjustesDeReserva): Promise<ResultadoDeOperacion<null>> {
    const { error } = await this.supabase.rpc('guardar_ajustes_de_reservas', {
      p_open_days: a.openDaysBefore,
      p_close_minutes: a.closeMinutesBefore,
      p_cancel_minutes: a.cancelMinutesBefore,
      p_max_active: a.maxActive,
      p_waitlist: a.waitlistEnabled,
      p_waitlist_max: a.waitlistMax,
      p_no_show_limit: a.noShowLimit,
      p_no_show_window: a.noShowWindowDays,
      p_block_days: a.blockDays,
      p_late_cancel_counts: a.lateCancelCounts,
    });
    return error ? falloDe('guardarAjustes', error) : exito(null);
  }

  async justificar(reservationId: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(reservationId)) return fallo('Reserva no encontrada.');
    const { error } = await this.supabase.rpc('justificar_inasistencia', { p_reservation: reservationId });
    return error ? falloDe('justificar', error) : exito(null);
  }

  async resumen(): Promise<ResumenDeReservas | null> {
    const { data } = await this.supabase.from('v_reservation_overview').select('*').maybeSingle();
    if (!data) return null;
    return {
      reservasFuturas: numero(data.reservas_futuras),
      enEsperaAhora: numero(data.en_espera_ahora),
      sociosBloqueados: numero(data.socios_bloqueados),
    };
  }

  async estadisticas(): Promise<readonly EstadisticaDeReservas[]> {
    const { data } = await this.supabase.from('v_reservation_stats').select('*').order('reservas_30d', { ascending: false }).limit(200);
    return (data ?? []).map((f) => ({
      classId: String(f.class_id),
      name: String(f.name ?? ''),
      reservas30d: numero(f.reservas_30d),
      asistieron30d: numero(f.asistieron_30d),
      inasistencias30d: numero(f.inasistencias_30d),
      tardias30d: numero(f.tardias_30d),
      canceladasATiempo30d: numero(f.canceladas_a_tiempo_30d),
      promovidas30d: numero(f.promovidas_30d),
      justificadas30d: numero(f.justificadas_30d),
      sesionesConEspera30d: numero(f.sesiones_con_espera_30d),
    }));
  }

  async inasistencias(limite: number): Promise<readonly Inasistencia[]> {
    const { data } = await this.supabase
      .from('v_reservation_no_shows')
      .select('*')
      .order('session_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(Math.min(limite, 300));
    return (data ?? []).map((f) => ({
      reservationId: String(f.id),
      customerId: String(f.customer_id),
      customerCode: texto(f.customer_code),
      customerName: String(f.customer_name ?? 'Socio'),
      // Una reserva «reservada» de una sesión terminada es una falta derivada.
      status: f.status === 'reservada' ? 'no_asistio' : esEstadoDeReserva(f.status) ? f.status : 'no_asistio',
      lateCancel: f.late_cancel === true,
      className: String(f.class_name ?? ''),
      branchName: String(f.branch_name ?? ''),
      sessionDate: String(f.session_date ?? ''),
      startTime: horaCorta(f.start_time),
      bloqueadoHasta: texto(f.bloqueado_hasta),
    }));
  }
}
