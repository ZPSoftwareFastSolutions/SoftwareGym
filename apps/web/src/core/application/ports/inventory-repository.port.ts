/**
 * CAPA: Application / Ports
 *
 * Inventario por sucursal (V4.3).
 *
 * El puerto NO redefine qué es un producto: eso lo dice el dominio
 * (`operations/inventario.ts`). Aquí solo se declara qué necesita la aplicación
 * de un almacén de datos, para que el adaptador de Supabase sea sustituible.
 */

import type { DatosDeProducto, ProductoDeInventario } from '@core/domain/operations/inventario';
import type { Pagina } from '@core/domain/shared/paginacion';
import type { ResultadoDeOperacion } from './resultado';

export interface InventoryRepositoryPort {
  /** Productos de UNA sede, paginados y contados por la base. */
  listar(branchId: string, buscar: string, pagina: number, porPagina: number): Promise<Pagina<ProductoDeInventario>>;

  /** Alta de un producto en la sede en la que se opera. */
  crear(tenantId: string, branchId: string, datos: DatosDeProducto): Promise<ResultadoDeOperacion<void>>;

  /** Corrección de un producto de esa sede (0 filas = RLS lo bloqueó). */
  actualizar(id: string, branchId: string, datos: DatosDeProducto): Promise<ResultadoDeOperacion<void>>;

  /** Retirar un producto del inventario de esa sede. */
  eliminar(id: string, branchId: string): Promise<ResultadoDeOperacion<void>>;
}
