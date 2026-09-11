/**
 * CAPA: Application / Ports
 *
 * Puerto de entrenadores (V3.1).
 *
 * Como el resto de repositorios operativos, va con la SESIÓN de quien
 * pregunta y no recibe «quién» ni «qué permisos»: eso lo decide RLS. El
 * gimnasio para escribir sale del perfil de la sesión (nunca del formulario) y
 * la base vuelve a exigir que coincida.
 */

import type {
  AsignacionDeEntrenador,
  Ausencia,
  DatosDeAusencia,
  DatosDeEntrenador,
  Entrenador,
  ReglaDePlan,
  SocioAsignado,
  TipoDeAsignacion,
} from '../../domain/operations/trainers';
import type { ResultadoDeOperacion } from './resultado';

export interface NuevaAsignacion {
  readonly customerId: string;
  readonly trainerId: string;
  readonly kind: TipoDeAsignacion;
  readonly focus: string | null;
}

export interface FiltroDeAsignaciones {
  readonly trainerId?: string;
  readonly customerId?: string;
  /** Solo las que no terminaron. */
  readonly vigentes?: boolean;
}

export interface TrainersRepositoryPort {
  listar(): Promise<readonly Entrenador[]>;

  porId(id: string): Promise<Entrenador | null>;

  /** Perfil del entrenador vinculado a una cuenta. */
  porCuenta(appUserId: string): Promise<Entrenador | null>;

  crear(tenantId: string, datos: DatosDeEntrenador): Promise<ResultadoDeOperacion<{ readonly id: string }>>;

  actualizar(id: string, datos: DatosDeEntrenador): Promise<ResultadoDeOperacion<null>>;

  cambiarEstado(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>>;

  /** Deja al entrenador exactamente en estas sedes. */
  fijarSucursales(tenantId: string, trainerId: string, branchIds: readonly string[]): Promise<ResultadoDeOperacion<null>>;

  /** Vincula la cuenta ya registrada con ese correo (RPC: la base otorga el rol). */
  vincularCuenta(trainerId: string, email: string): Promise<ResultadoDeOperacion<null>>;

  desvincularCuenta(trainerId: string): Promise<ResultadoDeOperacion<null>>;

  /** Ausencias de un entrenador, o de todos los visibles si `trainerId` es `null`. */
  ausencias(trainerId: string | null): Promise<readonly Ausencia[]>;

  registrarAusencia(tenantId: string, trainerId: string, datos: DatosDeAusencia): Promise<ResultadoDeOperacion<null>>;

  eliminarAusencia(id: string): Promise<ResultadoDeOperacion<null>>;

  asignaciones(filtro: FiltroDeAsignaciones): Promise<readonly AsignacionDeEntrenador[]>;

  asignar(tenantId: string, asignacion: NuevaAsignacion): Promise<ResultadoDeOperacion<null>>;

  /** `hoy` es la fecha del gimnasio. */
  finalizarAsignacion(id: string, hoy: string): Promise<ResultadoDeOperacion<null>>;

  reglasDePlanes(): Promise<readonly ReglaDePlan[]>;

  guardarReglaDePlan(planId: string, regla: Pick<ReglaDePlan, 'includesTrainer' | 'maxSecondaryTrainers'>): Promise<ResultadoDeOperacion<null>>;

  /** Socios del entrenador de la sesión, con solo lo que le corresponde ver. */
  misSocios(): Promise<readonly SocioAsignado[]>;
}
