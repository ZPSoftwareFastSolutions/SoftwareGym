/**
 * CAPA: Application / Ports
 *
 * Puerto del catálogo de ejercicios y de sus medios (V3.1).
 *
 * LOS ARCHIVOS NO PASAN POR LA APLICACIÓN. Un clip de 15 MB no cabe en una
 * función de Vercel (corta a 4,5 MB), así que el navegador lo sube directo a
 * Storage con una URL firmada de un solo uso que emite el servidor tras
 * comprobar permiso, tipo, tamaño y cuota. Después el servidor verifica los
 * bytes reales y registra el medio; la base vuelve a comprobar tamaño, tipo y
 * cuota leyendo `storage.objects`.
 */

import type {
  DatosDeEjercicio,
  Ejercicio,
  GrupoMuscular,
  MedioDeEjercicio,
  ProveedorDeVideo,
  TipoDeArchivo,
  UsoDeMedios,
} from '../../domain/operations/exercises';
import type { ResultadoDeOperacion } from './resultado';

export interface FiltroDeEjercicios {
  readonly q?: string;
  readonly grupo?: GrupoMuscular;
  readonly estado?: 'activos' | 'inactivos' | 'todos';
}

export interface EjercicioDelCatalogo extends Ejercicio {
  readonly medios: number;
  /** Ruta de la miniatura (imagen o póster de un clip), si tiene. */
  readonly miniatura: string | null;
  readonly tieneVideo: boolean;
}

export interface SubidaPreparada {
  readonly path: string;
  /** URL firmada de subida, de un solo uso. */
  readonly url: string;
  readonly posterPath: string | null;
  readonly posterUrl: string | null;
}

export interface MedioSubido {
  readonly kind: TipoDeArchivo;
  readonly storagePath: string;
  readonly posterPath: string | null;
  readonly durationSeconds: number | null;
}

export interface ExercisesRepositoryPort {
  listar(filtro: FiltroDeEjercicios): Promise<readonly EjercicioDelCatalogo[]>;

  porId(id: string): Promise<Ejercicio | null>;

  crear(tenantId: string, datos: DatosDeEjercicio): Promise<ResultadoDeOperacion<{ readonly id: string }>>;

  actualizar(id: string, datos: DatosDeEjercicio): Promise<ResultadoDeOperacion<null>>;

  cambiarEstado(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>>;

  medios(exerciseId: string): Promise<readonly MedioDeEjercicio[]>;

  /** Uso y cuota de medios del gimnasio de la sesión. `null` si no puede verlo. */
  uso(): Promise<UsoDeMedios | null>;

  prepararSubida(
    tenantId: string,
    exerciseId: string,
    mime: string,
    posterMime: string | null,
  ): Promise<ResultadoDeOperacion<SubidaPreparada>>;

  /** Primeros bytes del archivo subido, para verificar su tipo real. */
  cabecera(path: string): Promise<Uint8Array | null>;

  registrarArchivo(tenantId: string, exerciseId: string, medio: MedioSubido): Promise<ResultadoDeOperacion<null>>;

  registrarEnlace(tenantId: string, exerciseId: string, provider: ProveedorDeVideo, externalId: string): Promise<ResultadoDeOperacion<null>>;

  /** Borra el medio y sus archivos. */
  eliminarMedio(id: string): Promise<ResultadoDeOperacion<null>>;

  /** Borra archivos que no llegaron a registrarse. Nunca falla hacia fuera. */
  descartarArchivos(paths: readonly string[]): Promise<void>;

  /** URLs firmadas de lectura, por ruta. */
  urlsFirmadas(paths: readonly string[], segundos: number): Promise<ReadonlyMap<string, string>>;

  /**
   * Archivos del gimnasio que ningún medio usa (subidas abandonadas), con más
   * de una hora de antigüedad para no tocar una subida en curso.
   */
  archivosSinUso(tenantId: string): Promise<{ readonly paths: readonly string[]; readonly bytes: number }>;
}
