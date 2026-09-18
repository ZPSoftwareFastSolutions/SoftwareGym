import type { ResultadoDeOperacion } from './resultado';
import type { Pagina } from '@core/domain/shared/paginacion';

export interface InventoryProduct {
  readonly id: string;
  readonly name: string;
  readonly category: string | null;
  readonly quantity: number;
  readonly price: number;
  readonly updatedAt: string;
}

export interface InventoryProductFormData {
  readonly name: string;
  readonly category: string | null;
  readonly quantity: number;
  readonly price: number;
}

export interface InventoryRepositoryPort {
  /** Lista de productos paginada por sucursal. */
  listar(branchId: string, search: string, pagina: number, porPagina: number): Promise<Pagina<InventoryProduct>>;
  
  /** Crear un producto en una sucursal. */
  crear(tenantId: string, branchId: string, data: InventoryProductFormData): Promise<ResultadoDeOperacion<void>>;
  
  /** Actualizar un producto existente. */
  actualizar(id: string, branchId: string, data: InventoryProductFormData): Promise<ResultadoDeOperacion<void>>;
  
  /** Eliminar un producto del inventario. */
  eliminar(id: string, branchId: string): Promise<ResultadoDeOperacion<void>>;
}
