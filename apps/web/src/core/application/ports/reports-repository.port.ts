/**
 * CAPA: Application / Ports
 *
 * Puerto de reportes.
 *
 * Un solo método para todos: qué columnas y qué filtros admite cada reporte es
 * DATO del catálogo del dominio. La implementación traduce la clave a la
 * consulta que corresponde y aplica solo los filtros que ese reporte declara.
 */

import type {
  ClaveDeReporte,
  FilaDeReporte,
  FiltroDeReporte,
} from '../../domain/operations/reports';

export interface ReportsRepositoryPort {
  /**
   * Filas ya proyectadas a las columnas de la definición del reporte.
   *
   * `hoy` es la fecha del GIMNASIO, para las columnas relativas («días sin
   * venir»). Nunca se calcula dentro con la hora del servidor.
   */
  filas(clave: ClaveDeReporte, filtro: FiltroDeReporte, hoy: string): Promise<readonly FilaDeReporte[]>;
}
