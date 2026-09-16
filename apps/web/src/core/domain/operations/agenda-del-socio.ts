/**
 * CAPA: Domain / Operations — cómo ve el socio SU agenda de clases (V4.2).
 *
 * El encargo (§15) pide que el socio sepa de un vistazo a qué está inscrito sin
 * recorrer varias páginas, y que se distingan seis situaciones que hoy se
 * deducían mirando tres datos a la vez: inscrito, disponible, completo, no
 * disponible, cancelado y próximo. El encargo de reservas (§16) pide además que
 * la lectura sea DÍA → CLASE → HORARIO → SUCURSAL → DISPONIBILIDAD → RESERVAR.
 *
 * POR QUÉ UN ESTADO Y NO TRES CONDICIONES EN LA PANTALLA. Antes, «¿puedo entrar
 * a esta clase?» se respondía combinando el estado de la sesión, la reserva
 * propia y la ocupación; cada pantalla lo combinaba a su manera y bastaba con
 * olvidar una para decir «Reservar» sobre una clase llena. Aquí se decide una
 * vez, se prueba sin base de datos y las pantallas lo pintan.
 *
 * ESTO NO AUTORIZA NADA. Es una lectura: el botón puede decir «Reservar» y la
 * base negarlo igual (plan, ventana, bloqueo, cupo con la fila bloqueada). Al
 * revés también: que aquí diga «no disponible» no es lo que impide entrar.
 */

import type { EstadoDeVentana } from './reservations';

export type EstadoDeClaseDelSocio =
  /** Tiene su lugar confirmado. */
  | 'inscrito'
  | 'en-espera'
  /** Su plan la incluye, hay lugar y la reserva está abierta. */
  | 'disponible'
  /** Su plan la incluye, pero ya no quedan lugares. */
  | 'completo'
  /** Su plan no la incluye. Se enseña igual: sirve para saber qué se está perdiendo. */
  | 'no-disponible'
  | 'cancelado'
  /** Todavía no se puede reservar: la ventana abre más adelante. */
  | 'proximo'
  | 'en-curso'
  | 'asistido'
  | 'terminado';

export const NOMBRE_DE_ESTADO_DE_CLASE: Readonly<Record<EstadoDeClaseDelSocio, string>> = {
  inscrito: 'Inscrito',
  'en-espera': 'En lista de espera',
  disponible: 'Disponible',
  completo: 'Completo',
  'no-disponible': 'No incluida en tu plan',
  cancelado: 'Cancelada',
  proximo: 'Próximamente',
  'en-curso': 'Está ocurriendo',
  asistido: 'Asististe',
  terminado: 'Terminada',
};

export type TonoDeEstadoDeClase = 'bueno' | 'neutro' | 'atencion';

export const TONO_DE_ESTADO_DE_CLASE: Readonly<Record<EstadoDeClaseDelSocio, TonoDeEstadoDeClase>> = {
  inscrito: 'bueno',
  'en-espera': 'atencion',
  disponible: 'bueno',
  completo: 'atencion',
  'no-disponible': 'neutro',
  cancelado: 'atencion',
  proximo: 'neutro',
  'en-curso': 'bueno',
  asistido: 'bueno',
  terminado: 'neutro',
};

/** Lo mínimo que hace falta saber de una sesión para situar al socio en ella. */
export interface SesionParaElSocio {
  /** Estado efectivo que calcula la base con la hora del gimnasio. */
  readonly estado: 'programada' | 'en_curso' | 'realizada' | 'cancelada';
  readonly miReservaEstado: string | null;
  /** Asistentes + reservas que todavía no llegaron. */
  readonly ocupados: number;
  readonly capacity: number;
}

export interface ContextoDeClaseDelSocio {
  /** Si el plan vigente del socio incluye esta clase (orientativo: manda la base). */
  readonly incluidaEnSuPlan: boolean;
  /** Si el gimnasio tiene reservas contratadas. Sin ellas no existe «próximo». */
  readonly conReservas: boolean;
  readonly ventana: EstadoDeVentana;
}

/**
 * En qué situación está ESTE socio frente a ESTA sesión.
 *
 * El orden de las comprobaciones importa y no es casual: lo que ya pasó pesa
 * más que lo que podría pasar. Una sesión cancelada es cancelada aunque el
 * socio tuviera su lugar, y una reserva viva manda sobre la ocupación: quien
 * reservó entra a su lugar aunque la clase esté llena (decisión 40).
 */
export function estadoDeClaseDelSocio(sesion: SesionParaElSocio, contexto: ContextoDeClaseDelSocio): EstadoDeClaseDelSocio {
  if (sesion.estado === 'cancelada') return 'cancelado';
  if (sesion.miReservaEstado === 'asistio') return 'asistido';
  if (sesion.miReservaEstado === 'reservada') return 'inscrito';
  if (sesion.miReservaEstado === 'en_espera') return 'en-espera';
  if (sesion.estado === 'realizada') return 'terminado';
  if (sesion.estado === 'en_curso') return 'en-curso';
  if (!contexto.incluidaEnSuPlan) return 'no-disponible';
  if (contexto.conReservas && contexto.ventana === 'no_abierta') return 'proximo';
  if (sesion.ocupados >= sesion.capacity) return 'completo';
  return 'disponible';
}

/** Si esta situación cuenta como «estoy anotado», que es lo que el socio busca primero. */
export function estaInscrito(estado: EstadoDeClaseDelSocio): boolean {
  return estado === 'inscrito' || estado === 'en-espera';
}

/** Lugares que quedan. Nunca negativo: una sesión sobrevendida muestra cero, no «-2». */
export function lugaresLibres(sesion: SesionParaElSocio): number {
  return Math.max(0, sesion.capacity - sesion.ocupados);
}

/**
 * Cómo se lee la disponibilidad en una línea (§16).
 *
 * Con el cupo lleno no dice «0 lugares» sino que la clase está llena: es la
 * misma información y se entiende sin restar.
 */
export function describirDisponibilidad(sesion: SesionParaElSocio): string {
  const libres = lugaresLibres(sesion);
  if (libres === 0) return 'Sin lugares';
  if (libres === 1) return 'Queda 1 lugar';
  return `Quedan ${libres} lugares`;
}

export interface DiaDeAgenda<T> {
  /** `YYYY-MM-DD` en la fecha local del gimnasio. */
  readonly fecha: string;
  readonly sesiones: readonly T[];
}

/**
 * Agrupa por día CONSERVANDO EL ORDEN de llegada (§16: primero el día).
 *
 * No ordena: las sesiones llegan ya ordenadas por la base —por fecha y hora— y
 * volver a ordenarlas aquí duplicaría la regla en dos sitios que pueden
 * discrepar. Lo único que hace es cortar la lista en días.
 */
export function agruparPorDia<T extends { readonly sessionDate: string }>(sesiones: readonly T[]): readonly DiaDeAgenda<T>[] {
  const dias: { fecha: string; sesiones: T[] }[] = [];
  for (const sesion of sesiones) {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.fecha === sesion.sessionDate) ultimo.sesiones.push(sesion);
    else dias.push({ fecha: sesion.sessionDate, sesiones: [sesion] });
  }
  return dias;
}
