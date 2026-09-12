/**
 * CAPA: Application / Ports
 *
 * Puerto de clases grupales (V3.3): catálogo de clases, planes que las
 * incluyen, horarios semanales, sesiones y asistencia.
 *
 * Va con la SESIÓN de quien pregunta, como el resto de repositorios operativos:
 * no recibe «quién» ni «qué gimnasio». Que recepción solo tome asistencia en
 * sus sedes, que el instructor solo vea a los asistentes de SUS sesiones y que
 * nadie entre a una clase que su plan no incluye lo deciden RLS y los
 * disparadores, no este contrato.
 */

import type {
  AsistenteDeClase,
  CandidatoDeClase,
  Clase,
  ClaseAsistida,
  ClasePublica,
  DatosDeClase,
  DatosDeHorario,
  DatosDeSesion,
  EstadisticaDeClase,
  FranjaDeClases,
  HorarioDeClase,
  ResumenDeClases,
  SesionDeClase,
} from '../../domain/operations/classes';
import type { ResultadoDeOperacion } from './resultado';

export interface FiltroDeSesiones {
  readonly desde: string;
  readonly hasta: string;
  readonly classId?: string;
  readonly branchId?: string;
  readonly trainerId?: string;
  /** Sin él, también las canceladas (el calendario las enseña tachadas). */
  readonly soloProgramadas?: boolean;
  readonly limite?: number;
}

export interface ResultadoDeGeneracion {
  readonly creadas: number;
  readonly existentes: number;
  readonly conflictos: readonly { readonly fecha: string; readonly hora: string; readonly clase: string; readonly motivo: string }[];
}

export interface ClassesRepositoryPort {
  // --- clases ---
  clases(): Promise<readonly Clase[]>;
  clase(id: string): Promise<Clase | null>;
  crearClase(tenantId: string, datos: DatosDeClase): Promise<ResultadoDeOperacion<{ readonly id: string }>>;
  actualizarClase(id: string, datos: DatosDeClase): Promise<ResultadoDeOperacion<null>>;
  cambiarEstadoDeClase(id: string, activa: boolean): Promise<ResultadoDeOperacion<null>>;
  /** Deja los planes de la clase exactamente como llegan (RPC atómica). */
  fijarPlanes(classId: string, planIds: readonly string[]): Promise<ResultadoDeOperacion<null>>;

  // --- horarios ---
  horarios(classId?: string): Promise<readonly HorarioDeClase[]>;
  /** Un horario por día marcado. */
  crearHorarios(tenantId: string, classId: string, datos: DatosDeHorario): Promise<ResultadoDeOperacion<{ readonly creados: number }>>;
  desactivarHorario(id: string): Promise<ResultadoDeOperacion<null>>;
  cancelarSesionesDeHorario(id: string, motivo: string): Promise<ResultadoDeOperacion<{ readonly canceladas: number }>>;

  // --- sesiones ---
  sesiones(filtro: FiltroDeSesiones): Promise<readonly SesionDeClase[]>;
  sesion(id: string): Promise<SesionDeClase | null>;
  crearSesion(tenantId: string, datos: DatosDeSesion): Promise<ResultadoDeOperacion<{ readonly id: string }>>;
  actualizarSesion(id: string, datos: Omit<DatosDeSesion, 'classId'>): Promise<ResultadoDeOperacion<null>>;
  cancelarSesion(id: string, motivo: string): Promise<ResultadoDeOperacion<null>>;
  generarSesiones(desde: string, hasta: string, classId: string | null): Promise<ResultadoDeOperacion<ResultadoDeGeneracion>>;

  // --- asistencia ---
  asistentes(sessionId: string): Promise<readonly AsistenteDeClase[]>;
  candidatos(sessionId: string, buscar: string | null): Promise<readonly CandidatoDeClase[]>;
  registrarAsistencia(sessionId: string, customerId: string, metodo: 'manual' | 'qr'): Promise<ResultadoDeOperacion<{ readonly asistentes: number; readonly capacidad: number }>>;
  quitarAsistencia(attendanceId: string): Promise<ResultadoDeOperacion<null>>;
  /** Las clases a las que fue un socio. RLS reduce a las propias si quien pregunta es el socio. */
  clasesAsistidas(customerId: string, limite: number): Promise<readonly ClaseAsistida[]>;

  // --- métricas (gerencia) ---
  resumen(): Promise<ResumenDeClases | null>;
  estadisticas(): Promise<readonly EstadisticaDeClase[]>;
  franjas(): Promise<readonly FranjaDeClases[]>;
}

/** Vitrina estática: cliente anónimo, solo clases públicas y sus horarios. */
export interface PublicClassesPort {
  clasesPublicas(tenantSlug: string): Promise<readonly ClasePublica[]>;
}
