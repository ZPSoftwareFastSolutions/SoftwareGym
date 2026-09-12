/**
 * CAPA: Application / Ports
 *
 * Puerto de entrenamiento (V3.2): plantillas, asignaciones, progreso y
 * métricas.
 *
 * Como el resto de repositorios operativos va con la SESIÓN de quien pregunta:
 * no recibe «quién» ni «qué gimnasio». Que el entrenador solo vea y toque a SUS
 * socios, que recepción no marque y que el socio solo registre lo suyo lo
 * deciden RLS y los disparadores, no este contrato.
 */

import type {
  ConteoPorDia,
  DatosDeEjercicioDeRutina,
  DatosDePrograma,
  DatosDeRutina,
  EjercicioAsignado,
  EjercicioDeRutina,
  EstadisticaDeEjercicio,
  EstadisticaDeSocio,
  Programa,
  ResumenDeEntrenamiento,
  Rutina,
  RutinaAsignada,
} from '../../domain/operations/training';
import type { ResultadoDeOperacion } from './resultado';

export interface FiltroDeRutinas {
  readonly programId?: string;
  /** Sin él, también las inactivas (la pantalla de gestión las muestra). */
  readonly soloActivas?: boolean;
}

export interface FiltroDeAsignaciones {
  readonly customerId?: string;
  readonly trainerId?: string;
  readonly vigentes?: boolean;
  readonly limite?: number;
}

export interface TrainingRepositoryPort {
  // --- plantillas ---
  programas(): Promise<readonly Programa[]>;
  crearPrograma(tenantId: string, datos: DatosDePrograma): Promise<ResultadoDeOperacion<{ readonly id: string }>>;
  actualizarPrograma(id: string, datos: DatosDePrograma): Promise<ResultadoDeOperacion<null>>;
  cambiarEstadoDePrograma(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>>;

  rutinas(filtro: FiltroDeRutinas): Promise<readonly Rutina[]>;
  rutina(id: string): Promise<Rutina | null>;
  crearRutina(tenantId: string, programId: string | null, datos: DatosDeRutina): Promise<ResultadoDeOperacion<{ readonly id: string }>>;
  actualizarRutina(id: string, programId: string | null, datos: DatosDeRutina): Promise<ResultadoDeOperacion<null>>;
  cambiarEstadoDeRutina(id: string, activa: boolean): Promise<ResultadoDeOperacion<null>>;

  ejerciciosDeRutina(routineId: string): Promise<readonly EjercicioDeRutina[]>;
  agregarEjercicio(tenantId: string, routineId: string, datos: DatosDeEjercicioDeRutina): Promise<ResultadoDeOperacion<null>>;
  actualizarEjercicio(id: string, datos: DatosDeEjercicioDeRutina): Promise<ResultadoDeOperacion<null>>;
  quitarEjercicio(id: string): Promise<ResultadoDeOperacion<null>>;

  // --- asignaciones ---
  asignaciones(filtro: FiltroDeAsignaciones): Promise<readonly RutinaAsignada[]>;
  /** Una rutina asignada. `null` si RLS no la deja ver (de otro socio, por ejemplo). */
  asignacion(id: string): Promise<RutinaAsignada | null>;
  /** Copia la rutina al socio (RPC atómica). */
  asignar(customerId: string, routineId: string, nota: string | null): Promise<ResultadoDeOperacion<{ readonly id: string; readonly ejercicios: number }>>;
  finalizarAsignacion(id: string, hoy: string): Promise<ResultadoDeOperacion<null>>;

  /** Ejercicios de una rutina asignada, con lo que el socio ya registró. */
  ejerciciosAsignados(customerRoutineId: string, hoy: string): Promise<readonly EjercicioAsignado[]>;
  actualizarEjercicioAsignado(id: string, datos: DatosDeEjercicioDeRutina): Promise<ResultadoDeOperacion<null>>;
  quitarEjercicioAsignado(id: string): Promise<ResultadoDeOperacion<null>>;

  // --- progreso ---
  /** Marca un ejercicio de hoy. `yaEstaba` evita contar dos veces el mismo día. */
  marcar(itemId: string, sets: number | null, weightKg: number | null, nota: string | null): Promise<ResultadoDeOperacion<{ readonly yaEstaba: boolean }>>;
  desmarcar(itemId: string, fecha: string): Promise<ResultadoDeOperacion<null>>;

  // --- métricas ---
  resumen(): Promise<ResumenDeEntrenamiento | null>;
  estadisticasDeEjercicios(): Promise<readonly EstadisticaDeEjercicio[]>;
  estadisticasPorSocio(limite: number): Promise<readonly EstadisticaDeSocio[]>;
  porDiaDeSemana(): Promise<readonly ConteoPorDia[]>;
}
