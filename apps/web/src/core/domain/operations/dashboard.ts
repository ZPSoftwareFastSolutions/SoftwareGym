/**
 * CAPA: Domain / Operations
 *
 * Contratos de los indicadores del dashboard.
 *
 * Son datos que llegan de fuera del código (de la base), así que se validan
 * en tiempo de ejecución antes de usarse: TypeScript garantiza la forma, no
 * los valores (§2.2). Un `null` de un agregado vacío pintado como «null Bs»
 * en la cabecera del gerente es exactamente el fallo que esto evita.
 */

export interface IndicadoresDelGimnasio {
  readonly tenantName: string;
  readonly currency: string;
  readonly hoy: string;
  readonly sociosActivos: number;
  readonly membresiasActivas: number;
  readonly membresiasPorVencer: number;
  readonly membresiasVencidas: number;
  readonly asistenciasHoy: number;
  readonly asistenciasSemana: number;
  readonly sociosActivosMes: number;
  readonly ingresosMes: number;
  readonly ingresosMesAnterior: number;
}

export interface PuntoDeSerie {
  readonly etiqueta: string;
  readonly valor: number;
  /** Etiqueta larga para el `title` accesible del gráfico. */
  readonly detalle: string;
}

export interface GimnasioDeLaPlataforma {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly status: string;
  readonly isDemo: boolean;
  readonly timezone: string;
  readonly currency: string;
  readonly cuentas: number;
  readonly cuentasActivas: number;
  /** Sedes activas (V3.0). */
  readonly sucursales: number;
}

/**
 * Variación porcentual entre dos periodos.
 *
 * Devuelve `null` cuando el periodo anterior fue cero: dividir entre cero da
 * infinito, y pintar «+∞ %» porque el mes pasado no hubo cobros es peor que
 * no pintar nada. El componente muestra «sin comparación» y se entiende.
 */
export function variacion(actual: number, anterior: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

/** Convierte a número finito o cae al valor por defecto. Los agregados vacíos llegan como `null`. */
export function numero(valor: unknown, porDefecto = 0): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string') {
    // `numeric` de PostgreSQL viaja como cadena para no perder precisión.
    const convertido = Number(valor);
    if (Number.isFinite(convertido)) return convertido;
  }
  return porDefecto;
}

/** Una membresía a punto de vencer o recién vencida, con el contacto del socio. */
export interface VencimientoProximo {
  readonly membershipId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerCode: string | null;
  readonly planName: string | null;
  readonly endDate: string;
  readonly daysRemaining: number;
  readonly effectiveStatus: string;
  readonly phone: string | null;
}
