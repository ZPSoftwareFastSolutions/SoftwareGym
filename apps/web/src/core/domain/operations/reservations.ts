/**
 * CAPA: Domain / Operations
 *
 * Reservas de clases (V3.4): ventana de reserva, cancelación a tiempo o tardía,
 * lista de espera, inasistencias y bloqueo, y la lectura que ve gerencia.
 *
 *   SESIÓN (con cupo) ← RESERVA (reservada | en espera) → asistió | no asistió
 *
 * El cupo es UNO: asistencias + reservas que todavía no llegaron. Las reglas de
 * cada gimnasio viven en la base (`tenant_reservation_settings`) y la base las
 * aplica al reservar y al cancelar; aquí se replican para que la pantalla diga
 * ANTES de pulsar «se abre el jueves a las 07:00» o «cancelar ahora cuenta como
 * falta». Puro y sin I/O.
 */

// ------------------------------------------------------------------ catálogos

export type EstadoDeReserva = 'reservada' | 'en_espera' | 'asistio' | 'no_asistio' | 'cancelada' | 'justificada';

export const NOMBRE_DE_ESTADO_DE_RESERVA: Readonly<Record<EstadoDeReserva, string>> = {
  reservada: 'Reservada',
  en_espera: 'En lista de espera',
  asistio: 'Asistió',
  no_asistio: 'No asistió',
  cancelada: 'Cancelada',
  justificada: 'Inasistencia justificada',
};

export function esEstadoDeReserva(valor: unknown): valor is EstadoDeReserva {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(NOMBRE_DE_ESTADO_DE_RESERVA, valor);
}

export type OrigenDeReserva = 'socio' | 'personal';

export const NOMBRE_DE_ORIGEN_DE_RESERVA: Readonly<Record<OrigenDeReserva, string>> = {
  socio: 'Desde su panel',
  personal: 'Por el gimnasio',
};

/** Reglas de reserva de un gimnasio. Los valores por defecto son los recomendados (ADR 0009). */
export interface AjustesDeReserva {
  /** Cuántos días antes de la sesión se abre la reserva. */
  readonly openDaysBefore: number;
  /** Cuántos minutos antes de empezar se cierra (0 = al empezar). */
  readonly closeMinutesBefore: number;
  /** Hasta cuántos minutos antes se cancela sin que cuente como falta. */
  readonly cancelMinutesBefore: number;
  /** Reservas activas (futuras, reservadas o en espera) por socio. */
  readonly maxActive: number;
  readonly waitlistEnabled: boolean;
  readonly waitlistMax: number;
  /** Faltas en la ventana que bloquean. */
  readonly noShowLimit: number;
  readonly noShowWindowDays: number;
  /** Días de bloqueo desde la última falta (0 = sin bloqueo). */
  readonly blockDays: number;
  /** La cancelación tardía cuenta como falta. */
  readonly lateCancelCounts: boolean;
}

export const AJUSTES_RECOMENDADOS: AjustesDeReserva = {
  openDaysBefore: 7,
  closeMinutesBefore: 0,
  cancelMinutesBefore: 120,
  maxActive: 3,
  waitlistEnabled: true,
  waitlistMax: 10,
  noShowLimit: 3,
  noShowWindowDays: 30,
  blockDays: 7,
  lateCancelCounts: true,
};

// ------------------------------------------------------------------ entidades

/** Una reserva vista por su socio (o por gerencia en una lista). */
export interface Reserva {
  readonly id: string;
  readonly sessionId: string;
  readonly customerId: string;
  readonly classId: string;
  readonly className: string;
  readonly branchName: string;
  readonly sessionDate: string;
  readonly startTime: string;
  readonly durationMinutes: number;
  readonly status: EstadoDeReserva;
  /** Con la inasistencia derivada: una reserva de una sesión terminada sin asistencia. */
  readonly estadoEfectivo: EstadoDeReserva;
  readonly source: OrigenDeReserva;
  readonly lateCancel: boolean;
  readonly cancelledByGym: boolean;
  readonly cancelReason: string | null;
  readonly posicion: number | null;
  readonly sessionCancelled: boolean;
  readonly createdAt: string;
  readonly promotedAt: string | null;
}

/** Una reserva en la lista de una sesión (personal y gerencia), con nombre del socio. */
export interface ReservaDeSesion {
  readonly reservationId: string;
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly fullName: string;
  readonly planName: string | null;
  readonly status: EstadoDeReserva;
  readonly source: OrigenDeReserva;
  readonly lateCancel: boolean;
  readonly posicion: number | null;
  readonly createdAt: string;
  readonly asistio: boolean;
}

export interface EstadoDeReservasDelSocio {
  readonly bloqueadoHasta: string | null;
  readonly activas: number;
  readonly ajustes: AjustesDeReserva;
}

export interface EstadisticaDeReservas {
  readonly classId: string;
  readonly name: string;
  readonly reservas30d: number;
  readonly asistieron30d: number;
  readonly inasistencias30d: number;
  readonly tardias30d: number;
  readonly canceladasATiempo30d: number;
  readonly promovidas30d: number;
  readonly justificadas30d: number;
  readonly sesionesConEspera30d: number;
}

export interface ResumenDeReservas {
  readonly reservasFuturas: number;
  readonly enEsperaAhora: number;
  readonly sociosBloqueados: number;
}

export interface Inasistencia {
  readonly reservationId: string;
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly customerName: string;
  /** `no_asistio` (guardada o derivada), `justificada` o `cancelada` (tardía). */
  readonly status: EstadoDeReserva;
  readonly lateCancel: boolean;
  readonly className: string;
  readonly branchName: string;
  readonly sessionDate: string;
  readonly startTime: string;
  readonly bloqueadoHasta: string | null;
}

export interface AvisoDeReserva {
  readonly id: string;
  readonly kind: 'reserva_promovida' | 'reserva_cancelada_por_gimnasio' | 'reservas_bloqueadas' | 'inasistencia_justificada';
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly leido: boolean;
}

export type Validacion<T> =
  | { readonly ok: true; readonly datos: T }
  | { readonly ok: false; readonly errores: Readonly<Record<string, string>> };

// ------------------------------------------------------------------ tiempo (hora local del gimnasio, texto `YYYY-MM-DDTHH:MM`)

function aMinutos(fechaHora: string): number {
  const [fecha = '', hora = '00:00'] = fechaHora.split('T');
  const dias = Math.round(Date.parse(`${fecha}T00:00:00Z`) / 60_000);
  const [h, m] = hora.split(':');
  return dias + Number(h) * 60 + Number(m);
}

function desdeMinutos(total: number): string {
  const fecha = new Date(total * 60_000);
  return `${fecha.toISOString().slice(0, 10)}T${fecha.toISOString().slice(11, 16)}`;
}

export type EstadoDeVentana = 'no_abierta' | 'abierta' | 'cerrada';

export interface VentanaDeReserva {
  readonly estado: EstadoDeVentana;
  /** Cuándo se abre (hora local). */
  readonly abre: string;
  /** Cuándo se cierra (hora local). */
  readonly cierra: string;
  /** Hasta cuándo se cancela sin que cuente como falta. */
  readonly cancelacionLibreHasta: string;
}

/** La ventana de reserva de una sesión. Misma regla que `app.preparar_reserva`. */
export function ventanaDeReserva(
  sesion: { readonly sessionDate: string; readonly startTime: string },
  ajustes: AjustesDeReserva,
  ahoraLocal: string,
): VentanaDeReserva {
  const inicio = aMinutos(`${sesion.sessionDate}T${sesion.startTime}`);
  const abre = inicio - ajustes.openDaysBefore * 24 * 60;
  const cierra = inicio - ajustes.closeMinutesBefore;
  const ahora = aMinutos(ahoraLocal);
  return {
    estado: ahora < abre ? 'no_abierta' : ahora >= cierra ? 'cerrada' : 'abierta',
    abre: desdeMinutos(abre),
    cierra: desdeMinutos(cierra),
    cancelacionLibreHasta: desdeMinutos(inicio - ajustes.cancelMinutesBefore),
  };
}

/**
 * Si cancelar AHORA cuenta como falta. Solo la cancelación de un lugar ocupado:
 * salir de la lista de espera no le quita el lugar a nadie.
 */
export function cancelacionSeriaTardia(
  sesion: { readonly sessionDate: string; readonly startTime: string },
  estado: EstadoDeReserva,
  ajustes: AjustesDeReserva,
  ahoraLocal: string,
): boolean {
  if (estado !== 'reservada') return false;
  const inicio = aMinutos(`${sesion.sessionDate}T${sesion.startTime}`);
  return aMinutos(ahoraLocal) > inicio - ajustes.cancelMinutesBefore;
}

/** Si la sesión ya empezó (no se cancela ni se reserva). */
export function sesionIniciada(sesion: { readonly sessionDate: string; readonly startTime: string }, ahoraLocal: string): boolean {
  return aMinutos(ahoraLocal) >= aMinutos(`${sesion.sessionDate}T${sesion.startTime}`);
}

// ------------------------------------------------------------------ cupo y bloqueo

/** Lugares que la reserva puede tomar (la capacidad menos los guardados para quien llega sin reservar). */
export function cupoReservable(capacidad: number, lugaresSinReserva: number): number {
  return Math.max(0, capacidad - Math.max(0, lugaresSinReserva));
}

export type ResultadoDeReservar = 'reservada' | 'en_espera' | 'llena';

/** Qué obtendría una reserva nueva. Misma regla que la base. */
export function resultadoDeReservar(
  sesion: { readonly capacity: number; readonly walkinSpots: number; readonly ocupados: number; readonly enEspera: number },
  ajustes: AjustesDeReserva,
): ResultadoDeReservar {
  if (sesion.ocupados < cupoReservable(sesion.capacity, sesion.walkinSpots)) return 'reservada';
  return ajustes.waitlistEnabled && sesion.enEspera < ajustes.waitlistMax ? 'en_espera' : 'llena';
}

export interface FaltaParaBloqueo {
  readonly sessionDate: string;
  /** `no_asistio` o una cancelación tardía (`cancelada` + `lateCancel`). `justificada` no cuenta. */
  readonly status: EstadoDeReserva;
  readonly lateCancel: boolean;
}

/**
 * Hasta qué fecha un socio no puede reservar, o `null`. Replica
 * `app.reservas_bloqueadas_hasta`: faltas dentro de la ventana; si llegan al
 * tope, bloqueo de N días desde la última.
 */
export function bloqueoDeReservas(faltas: readonly FaltaParaBloqueo[], ajustes: AjustesDeReserva, hoy: string): string | null {
  if (ajustes.blockDays === 0) return null;
  const desde = aMinutos(`${hoy}T00:00`) - ajustes.noShowWindowDays * 24 * 60;
  const cuentan = faltas.filter(
    (f) =>
      aMinutos(`${f.sessionDate}T00:00`) > desde &&
      (f.status === 'no_asistio' || (f.status === 'cancelada' && f.lateCancel && ajustes.lateCancelCounts)),
  );
  if (cuentan.length < ajustes.noShowLimit) return null;
  const ultima = cuentan.map((f) => f.sessionDate).sort().at(-1);
  if (!ultima) return null;
  const hasta = desdeMinutos(aMinutos(`${ultima}T00:00`) + ajustes.blockDays * 24 * 60).slice(0, 10);
  return hasta >= hoy ? hasta : null;
}

// ------------------------------------------------------------------ textos

/** «Reglas en una línea» para el socio. */
export function describirAjustes(ajustes: AjustesDeReserva): readonly string[] {
  const horas = ajustes.cancelMinutesBefore / 60;
  const lineas = [
    `Reservas desde ${ajustes.openDaysBefore} ${ajustes.openDaysBefore === 1 ? 'día' : 'días'} antes${
      ajustes.closeMinutesBefore > 0 ? ` y hasta ${ajustes.closeMinutesBefore} minutos antes de empezar` : ' y hasta que empieza la clase'
    }.`,
    `Hasta ${ajustes.maxActive} ${ajustes.maxActive === 1 ? 'reserva activa' : 'reservas activas'} a la vez.`,
    ajustes.cancelMinutesBefore > 0
      ? `Cancela sin penalidad hasta ${Number.isInteger(horas) ? `${horas} ${horas === 1 ? 'hora' : 'horas'}` : `${ajustes.cancelMinutesBefore} minutos`} antes.`
      : 'Puedes cancelar sin penalidad hasta que empieza la clase.',
  ];
  if (ajustes.blockDays > 0) {
    lineas.push(
      `${ajustes.noShowLimit} ${ajustes.noShowLimit === 1 ? 'falta' : 'faltas'} en ${ajustes.noShowWindowDays} días${
        ajustes.lateCancelCounts ? ' (las cancelaciones tardías cuentan)' : ''
      } bloquean las reservas por ${ajustes.blockDays} ${ajustes.blockDays === 1 ? 'día' : 'días'}.`,
    );
  }
  if (ajustes.waitlistEnabled) lineas.push('Si la clase está llena, entras a la lista de espera y te avisamos si se libera un lugar.');
  return lineas;
}

export function textoDePosicion(posicion: number | null): string {
  if (!posicion) return 'En lista de espera';
  return posicion === 1 ? 'Eres el siguiente en la lista de espera' : `Puesto ${posicion} en la lista de espera`;
}

// ------------------------------------------------------------------ validación de ajustes

export interface FormularioDeAjustesDeReserva {
  readonly openDaysBefore: string;
  readonly closeMinutesBefore: string;
  readonly cancelMinutesBefore: string;
  readonly maxActive: string;
  readonly waitlistEnabled: boolean;
  readonly waitlistMax: string;
  readonly noShowLimit: string;
  readonly noShowWindowDays: string;
  readonly blockDays: string;
  readonly lateCancelCounts: boolean;
}

function enRango(texto: string, min: number, max: number): number | null {
  const limpio = texto.trim();
  if (!/^[0-9]{1,4}$/.test(limpio)) return null;
  const n = Number(limpio);
  return n >= min && n <= max ? n : null;
}

/** Los mismos rangos que las restricciones de la base. */
export function validarAjustesDeReserva(f: FormularioDeAjustesDeReserva): Validacion<AjustesDeReserva> {
  const errores: Record<string, string> = {};
  const campo = (clave: keyof FormularioDeAjustesDeReserva, min: number, max: number, mensaje: string): number => {
    const valor = enRango(String(f[clave]), min, max);
    if (valor === null) errores[clave] = mensaje;
    return valor ?? min;
  };
  const datos: AjustesDeReserva = {
    openDaysBefore: campo('openDaysBefore', 1, 60, 'Entre 1 y 60 días.'),
    closeMinutesBefore: campo('closeMinutesBefore', 0, 1440, 'Entre 0 y 1440 minutos.'),
    cancelMinutesBefore: campo('cancelMinutesBefore', 0, 2880, 'Entre 0 y 2880 minutos.'),
    maxActive: campo('maxActive', 1, 20, 'Entre 1 y 20 reservas.'),
    waitlistEnabled: f.waitlistEnabled,
    waitlistMax: campo('waitlistMax', 0, 100, 'Entre 0 y 100 personas.'),
    noShowLimit: campo('noShowLimit', 1, 10, 'Entre 1 y 10 faltas.'),
    noShowWindowDays: campo('noShowWindowDays', 7, 180, 'Entre 7 y 180 días.'),
    blockDays: campo('blockDays', 0, 60, 'Entre 0 (sin bloqueo) y 60 días.'),
    lateCancelCounts: f.lateCancelCounts,
  };
  if (!errores.cancelMinutesBefore && !errores.closeMinutesBefore && datos.cancelMinutesBefore < datos.closeMinutesBefore) {
    errores.cancelMinutesBefore = 'La cancelación libre no puede terminar después de que se cierran las reservas.';
  }
  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, datos };
}

// ------------------------------------------------------------------ lectura para gerencia

export type TonoDeConclusion = 'bueno' | 'neutro' | 'atencion';

export interface ConclusionDeReservas {
  readonly clave: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly tono: TonoDeConclusion;
}

/** Tasa de asistencia de las reservas resueltas (asistió / (asistió + no asistió)), 0-100. */
export function tasaDeAsistencia(asistieron: number, inasistencias: number): number | null {
  const total = asistieron + inasistencias;
  return total === 0 ? null : Math.round((asistieron / total) * 100);
}

/** Debajo de esto una tasa no dice nada. */
const MINIMO_DE_RESERVAS = 5;
export const ASISTENCIA_BAJA = 70;

function plural(n: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

export function conclusionesDeReservas(
  estadisticas: readonly EstadisticaDeReservas[],
  resumen: ResumenDeReservas | null,
): readonly ConclusionDeReservas[] {
  const conclusiones: ConclusionDeReservas[] = [];
  const asistieron = estadisticas.reduce((s, e) => s + e.asistieron30d, 0);
  const faltas = estadisticas.reduce((s, e) => s + e.inasistencias30d, 0);
  const tardias = estadisticas.reduce((s, e) => s + e.tardias30d, 0);
  const promovidas = estadisticas.reduce((s, e) => s + e.promovidas30d, 0);

  if (asistieron + faltas === 0) {
    return [
      {
        clave: 'sin-reservas',
        titulo: 'Todavía no hay reservas resueltas',
        detalle: 'La tasa de asistencia aparece cuando pasan las primeras sesiones con reservas.',
        tono: 'neutro',
      },
    ];
  }

  const tasa = tasaDeAsistencia(asistieron, faltas) ?? 0;
  conclusiones.push({
    clave: 'tasa',
    titulo: `${tasa} % de quienes reservan, vienen`,
    detalle: `${asistieron} asistencias y ${plural(faltas, 'falta')} con reserva en 30 días${tardias > 0 ? `, más ${plural(tardias, 'cancelación tardía', 'cancelaciones tardías')}` : ''}.`,
    tono: tasa >= ASISTENCIA_BAJA ? 'bueno' : 'atencion',
  });

  const peores = estadisticas
    .map((e) => ({ e, tasa: tasaDeAsistencia(e.asistieron30d, e.inasistencias30d) }))
    .filter((x) => x.tasa !== null && x.e.asistieron30d + x.e.inasistencias30d >= MINIMO_DE_RESERVAS && (x.tasa ?? 100) < ASISTENCIA_BAJA)
    .sort((a, b) => (a.tasa ?? 0) - (b.tasa ?? 0));
  const peor = peores[0];
  if (peor) {
    conclusiones.push({
      clave: 'clase-con-faltas',
      titulo: `«${peor.e.name}» es la clase con más faltas`,
      detalle: `Solo viene el ${peor.tasa} % de quienes reservan. Recordar la clase el día anterior o acortar la ventana de cancelación suele bajar las faltas.`,
      tono: 'atencion',
    });
  }

  const conEspera = estadisticas.filter((e) => e.sesionesConEspera30d > 0).sort((a, b) => b.sesionesConEspera30d - a.sesionesConEspera30d);
  const masDemandada = conEspera[0];
  if (masDemandada) {
    conclusiones.push({
      clave: 'demanda',
      titulo: `«${masDemandada.name}» tuvo lista de espera en ${plural(masDemandada.sesionesConEspera30d, 'sesión', 'sesiones')}`,
      detalle: `La demanda supera el cupo: abrir otro horario o subir la capacidad recupera a quien se queda afuera.${
        promovidas > 0 ? ` La espera ya le dio lugar a ${plural(promovidas, 'persona')}.` : ''
      }`,
      tono: 'neutro',
    });
  }

  if (resumen && resumen.sociosBloqueados > 0) {
    conclusiones.push({
      clave: 'bloqueados',
      titulo: `${plural(resumen.sociosBloqueados, 'socio bloqueado', 'socios bloqueados')} para reservar`,
      detalle: 'Revisa sus faltas abajo: si hubo un motivo, justificarlas les devuelve la reserva.',
      tono: 'atencion',
    });
  }

  return conclusiones;
}

export function mensajeDeErrorDeReservas(codigo: string): string | null {
  const c = codigo;
  if (c.includes('reserva_no_abierta')) return 'La reserva de esa clase todavía no está abierta.';
  if (c.includes('reserva_cerrada')) return 'Las reservas de esa clase ya se cerraron.';
  if (c.includes('reservas_bloqueadas')) return 'Tus reservas están bloqueadas por faltas recientes. Habla con recepción.';
  if (c.includes('limite_de_reservas')) return 'Llegaste al máximo de reservas activas. Cancela una o espera a que pase.';
  if (c.includes('ya_reservado')) return 'Ya tienes una reserva en esa sesión.';
  if (c.includes('reserva_cruzada')) return 'Ya tienes otra clase reservada a esa hora.';
  if (c.includes('sesion_iniciada')) return 'La clase ya empezó: no se puede cancelar.';
  if (c.includes('reserva_cancelada')) return 'Esa reserva ya estaba cancelada.';
  if (c.includes('reserva_no_cancelable')) return 'Esa reserva ya no se puede cancelar.';
  if (c.includes('inasistencia_no_valida')) return 'Solo se marca una falta cuando la clase terminó sin asistencia.';
  if (c.includes('sin_asistencia_registrada')) return 'Primero registra la asistencia.';
  if (c.includes('sesion_sin_terminar')) return 'La lista se cierra cuando termina la clase.';
  if (c.includes('capacidad_menor_que_reservas')) return 'La capacidad no puede quedar por debajo de los lugares ya reservados.';
  if (c.includes('no_es_el_siguiente')) return 'Hay otra persona antes en la lista de espera.';
  return null;
}
