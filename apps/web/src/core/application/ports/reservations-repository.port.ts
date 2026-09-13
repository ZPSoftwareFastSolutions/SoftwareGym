/**
 * CAPA: Application / Ports
 *
 * Puerto de reservas de clases (V3.4): reservar y cancelar, la lista de una
 * sesión, las reglas del gimnasio, las faltas y los avisos al socio.
 *
 * Con la SESIÓN de quien pregunta, como el resto: no recibe «quién». Que el
 * socio solo reserve lo suyo, que recepción lo haga en sus sedes, la ventana,
 * el tope, el bloqueo y la lista de espera los decide la base.
 */

import type {
  AjustesDeReserva,
  AvisoDeReserva,
  EstadisticaDeReservas,
  EstadoDeReservasDelSocio,
  Inasistencia,
  Reserva,
  ReservaDeSesion,
  ResumenDeReservas,
} from '../../domain/operations/reservations';
import type { ResultadoDeOperacion } from './resultado';

export interface ResultadoDeReserva {
  readonly estado: 'reservada' | 'en_espera';
  readonly posicion: number | null;
}

export interface ReservationsRepositoryPort {
  // --- socio y mostrador ---
  /** Sin `customerId`, reserva para el socio de la sesión. */
  reservar(sessionId: string, customerId: string | null): Promise<ResultadoDeOperacion<ResultadoDeReserva>>;
  cancelar(reservationId: string, motivo: string | null): Promise<ResultadoDeOperacion<{ readonly tardia: boolean }>>;
  /** Las reservas visibles de un socio (el socio: las suyas), de `desde` en adelante. */
  reservasDelSocio(customerId: string, desde: string, limite: number): Promise<readonly Reserva[]>;
  miEstado(): Promise<EstadoDeReservasDelSocio | null>;
  avisos(): Promise<readonly AvisoDeReserva[]>;
  marcarAvisoLeido(id: string): Promise<void>;

  // --- sesión (quien toma asistencia ahí o gerencia) ---
  reservasDeSesion(sessionId: string): Promise<readonly ReservaDeSesion[]>;
  cerrarLista(sessionId: string): Promise<ResultadoDeOperacion<{ readonly inasistencias: number; readonly esperaCerrada: number }>>;

  // --- gerencia ---
  ajustes(): Promise<AjustesDeReserva>;
  guardarAjustes(ajustes: AjustesDeReserva): Promise<ResultadoDeOperacion<null>>;
  justificar(reservationId: string): Promise<ResultadoDeOperacion<null>>;
  resumen(): Promise<ResumenDeReservas | null>;
  estadisticas(): Promise<readonly EstadisticaDeReservas[]>;
  inasistencias(limite: number): Promise<readonly Inasistencia[]>;
}
