import type { SupabaseClient } from '@supabase/supabase-js';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import type { InventoryProduct, InventoryProductFormData, InventoryRepositoryPort } from '@core/application/ports/inventory-repository.port';
import { acotarPorPagina, rangoDePagina, type Pagina } from '@core/domain/shared/paginacion';

export class SupabaseInventoryRepository implements InventoryRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(branchId: string, search: string, pagina: number, porPagina: number): Promise<Pagina<InventoryProduct>> {
    const tamano = acotarPorPagina(porPagina);
    const { desde, hasta } = rangoDePagina(pagina, tamano);

    let consulta = this.supabase
      .from('branch_inventory_products')
      .select('id, name, category, quantity, price, updated_at', { count: 'exact' })
      .eq('branch_id', branchId)
      .order('name', { ascending: true })
      .range(desde, hasta);

    const busqueda = (search || '').trim();
    if (busqueda) {
      consulta = consulta.ilike('name', `%${busqueda}%`);
    }

    const { data, count, error } = await consulta;
    
    if (error && error.code !== 'PGRST103') {
      console.error('[inventario] listar', error.code, error.message);
    }

    return {
      filas: (data ?? []).map((fila: any) => ({
        id: fila.id,
        name: fila.name,
        category: fila.category,
        quantity: fila.quantity,
        price: fila.price,
        updatedAt: fila.updated_at,
      })),
      total: count ?? 0,
      pagina,
      porPagina: tamano,
    };
  }

  async crear(tenantId: string, branchId: string, data: InventoryProductFormData): Promise<ResultadoDeOperacion<void>> {
    const { error } = await this.supabase
      .from('branch_inventory_products')
      .insert({
        tenant_id: tenantId,
        branch_id: branchId,
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        price: data.price,
      });

    if (error) {
      console.error('[inventario] crear', error);
      return fallo('No se pudo crear el producto.');
    }
    return exito(undefined);
  }

  async actualizar(id: string, branchId: string, data: InventoryProductFormData): Promise<ResultadoDeOperacion<void>> {
    const { error, data: updated } = await this.supabase
      .from('branch_inventory_products')
      .update({
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        price: data.price,
      })
      .eq('id', id)
      .eq('branch_id', branchId)
      .select('id');

    if (error) return fallo('No se pudo actualizar el producto.');
    if (!updated || updated.length === 0) return fallo('El producto no existe o no tienes permiso.');
    return exito(undefined);
  }

  async eliminar(id: string, branchId: string): Promise<ResultadoDeOperacion<void>> {
    const { error, data: deleted } = await this.supabase
      .from('branch_inventory_products')
      .delete()
      .eq('id', id)
      .eq('branch_id', branchId)
      .select('id');

    if (error) return fallo('No se pudo eliminar el producto.');
    if (!deleted || deleted.length === 0) return fallo('El producto no existe o no tienes permiso.');
    return exito(undefined);
  }
}
