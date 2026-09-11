/**
 * CAPA: Application / Ports
 *
 * Puerto de salida hacia el modelo de lectura de la operación del gimnasio:
 * dashboard, asistencia, avisos y reportes.
 *
 * Se declara aquí, donde se consume, y se implementa en
 * `infrastructure/operations`. Hoy detrás hay Supabase con RLS; el día que la
 * API .NET de V1.5 exista, lo que cambia es la implementación y una línea del
 * composition root.
 *
 * DOS COSAS QUE NO SE PUEDEN OLVIDAR AL IMPLEMENTARLO:
 *
 * 1. **Este puerto NO autoriza.** Ninguno de sus métodos recibe «quién
 *    pregunta» porque la identidad viaja en la sesión y quien decide qué
 *    filas existen es RLS, por debajo de cualquier consulta. Una
 *    implementación que se conectara con una credencial de servicio
 *    —`service_role` tiene BYPASSRLS— rompería el aislamiento entre gimnasios
 *    sin que este contrato cambiara una letra.
 *
 * 2. **Un agregado vacío no es un error.** Cuando el usuario no puede leer la
 *    tabla de origen, la respuesta correcta es cero o lista vacía, no una
 *    excepción: es exactamente lo que le pasa al administrador de la
 *    plataforma con los socios de un cliente, y es el comportamiento buscado.
 */

import type {
  GimnasioDeLaPlataforma,
  IndicadoresDelGimnasio,
  VencimientoProximo,
} from '../../domain/operations/dashboard';
import type {
  RegistroDeAsistencia,
  ResultadoDeCheckIn,
} from '../../domain/operations/attendance';
import type { AvisoInterno, MembresiaParaAvisar } from '../../domain/operations/notifications';
import type { PerfilOperativo } from '../../domain/operations/workspace';

export interface SerieDiaria {
  readonly dia: string;
  readonly visitas: number;
  readonly socios: number;
}

export interface SerieMensual {
  readonly mes: string;
  readonly total: number;
  readonly cobros: number;
}

export interface FiltroDeAsistencia {
  /** Fecha ISO (YYYY-MM-DD) inclusive. */
  readonly desde?: string;
  /** Fecha ISO (YYYY-MM-DD) inclusive. */
  readonly hasta?: string;
  /** Texto libre contra nombre y código del socio. */
  readonly busqueda?: string;
  readonly limite?: number;
  /** Id de la sede, o `sin-sucursal` para el histórico sin sede. */
  readonly sucursal?: string;
  /** Solo las del socio indicado. */
  readonly customerId?: string;
}

export interface OperationsRepositoryPort {
  /** Perfil de quien tiene la sesión abierta, o `null` si no hay ninguna. */
  perfil(): Promise<PerfilOperativo | null>;

  /**
   * Fecha de HOY en la zona horaria del gimnasio, en formato `YYYY-MM-DD`.
   *
   * No se calcula en la aplicación con `new Date()`: eso da la fecha del
   * servidor, que en Vercel es UTC. En La Paz (UTC-4) toda entrada posterior a
   * las 20:00 caería en el día siguiente, y el socio vería su racha rota y su
   * visita contada en la semana equivocada cada noche.
   */
  hoyDelGimnasio(tenantSlug: string): Promise<string>;

  /** Indicadores del gimnasio indicado. `null` si no hay nada que mostrar. */
  indicadores(tenantSlug: string): Promise<IndicadoresDelGimnasio | null>;

  /** Serie de asistencia diaria de los últimos `dias`, ascendente. */
  asistenciaDiaria(dias: number): Promise<readonly SerieDiaria[]>;

  /** Ingresos por mes, ascendente. Vacío si no se pueden leer los pagos. */
  ingresosMensuales(): Promise<readonly SerieMensual[]>;

  /** Horas (0-23) de las entradas del periodo, para calcular la hora pico. */
  horasDeEntrada(dias: number): Promise<readonly number[]>;

  /** Bitácora de asistencia filtrada. Descendente por fecha y hora. */
  historialDeAsistencia(filtro: FiltroDeAsistencia): Promise<readonly RegistroDeAsistencia[]>;

  /** Membresías que vencen o vencieron en la ventana de 30 días. */
  vencimientos(): Promise<readonly VencimientoProximo[]>;

  /** Avisos internos visibles para quien pregunta. */
  avisos(): Promise<readonly AvisoInterno[]>;

  /** Gimnasios de la plataforma. Vacío para quien no administra la plataforma. */
  gimnasios(): Promise<readonly GimnasioDeLaPlataforma[]>;

  /** Membresía vigente del socio con la sesión abierta, o `null`. */
  miMembresia(): Promise<MembresiaParaAvisar | null>;

  /** Identificador de check-in del socio con la sesión abierta. */
  miTokenDeCheckIn(): Promise<string | null>;

  /** Fechas (YYYY-MM-DD) en que el socio registró entrada, últimos `dias`. */
  misDiasDeAsistencia(dias: number): Promise<readonly string[]>;

  /**
   * Registra una entrada a partir del identificador del QR, EN una sede.
   *
   * El QR identifica al socio y nada más; la sede la pone la operación (la
   * sede de trabajo de quien escanea). El mismo QR sirve en todas.
   *
   * Devuelve un resultado, nunca lanza por un token inexistente: que alguien
   * enseñe un código que no existe es un caso de uso, no una avería.
   */
  registrarCheckIn(token: string, sucursal: { readonly id: string; readonly name: string }): Promise<ResultadoDeCheckIn>;
}
