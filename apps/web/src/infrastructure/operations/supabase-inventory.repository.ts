/**
 * CAPA: Infrastructure / Operations
 *
 * Inventario por sucursal sobre Supabase (V4.3).
 *
 * Como el resto de adaptadores: consulta con la SESIÓN de quien pregunta (RLS
 * decide qué filas existen), pagina y cuenta en la base, y traduce el error a
 * un mensaje legible en vez de lanzarlo a la pantalla. Los UPDATE y DELETE
 * piden `select('id')` para distinguir «no existe» de «RLS lo bloqueó»: las dos
 * cosas devuelven 0 filas y a quien está en el mostrador se le dice lo mismo.
 */

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import type { InventoryRepositoryPort } from '@core/application/ports/inventory-repository.port';
import type { DatosDeProducto, ProductoDeInventario } from '@core/domain/operations/inventario';
import { acotarPorPagina, rangoDePagina, type Pagina } from '@core/domain/shared/paginacion';

/** Lo que devuelve la consulta, antes de pasar al lenguaje del dominio. */
interface FilaDeProducto {
  readonly id: string;
  readonly name: string;
  readonly category: string | null;
  readonly quantity: number;
  readonly price: number | string;
  readonly updated_at: string;
}

const TABLA = 'branch_inventory_products';
const COLUMNAS = 'id, name, category, quantity, price, updated_at';

function registrar(operacion: string, error: PostgrestError) {
  // El código queda en el log (lección de V3.0: los errores se traducen por
  // código, y adivinar la causa por el mensaje ya costó un día de trabajo).
  console.error(`[inventario] ${operacion}`, error.code, error.message);
}

export class SupabaseInventoryRepository implements InventoryRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(branchId: string, buscar: string, pagina: number, porPagina: number): Promise<Pagina<ProductoDeInventario>> {
    const tamano = acotarPorPagina(porPagina);
    const { desde, hasta } = rangoDePagina(pagina, tamano);

    let consulta = this.supabase
      .from(TABLA)
      .select(COLUMNAS, { count: 'exact' })
      .eq('branch_id', branchId)
      .order('name', { ascending: true })
      .range(desde, hasta);

    const texto = buscar.trim();
    if (texto) {
      // `%` y `_` son comodines de LIKE: escapados, buscar «100%» busca «100%».
      consulta = consulta.ilike('name', `%${texto.replace(/[%_]/g, (c) => `\\${c}`)}%`);
    }

    const { data, count, error } = await consulta.returns<FilaDeProducto[]>();

    // PGRST103: la página pedida está fuera del rango. Es una URL a mano, no un
    // fallo: la lista sale vacía con su total, como en el resto del panel.
    if (error && error.code !== 'PGRST103') registrar('listar', error);

    return {
      filas: (data ?? []).map((fila) => ({
        id: fila.id,
        name: fila.name,
        category: fila.category,
        quantity: fila.quantity,
        price: Number(fila.price),
        updatedAt: fila.updated_at,
      })),
      total: count ?? 0,
      pagina,
      porPagina: tamano,
    };
  }

  async crear(tenantId: string, branchId: string, datos: DatosDeProducto): Promise<ResultadoDeOperacion<void>> {
    const { error } = await this.supabase.from(TABLA).insert({
      tenant_id: tenantId,
      branch_id: branchId,
      name: datos.name,
      category: datos.category,
      quantity: datos.quantity,
      price: datos.price,
    });

    if (error) {
      registrar('crear', error);
      return fallo('No se pudo guardar el producto. Comprueba que operas en esta sucursal.');
    }
    return exito(undefined);
  }

  async actualizar(id: string, branchId: string, datos: DatosDeProducto): Promise<ResultadoDeOperacion<void>> {
    const { data, error } = await this.supabase
      .from(TABLA)
      .update({
        name: datos.name,
        category: datos.category,
        quantity: datos.quantity,
        price: datos.price,
      })
      .eq('id', id)
      .eq('branch_id', branchId)
      .select('id');

    if (error) {
      registrar('actualizar', error);
      return fallo('No se pudo guardar el producto.');
    }
    if (!data || data.length === 0) return fallo('Ese producto ya no está en el inventario de esta sucursal.');
    return exito(undefined);
  }

  async eliminar(id: string, branchId: string): Promise<ResultadoDeOperacion<void>> {
    const { data, error } = await this.supabase
      .from(TABLA)
      .delete()
      .eq('id', id)
      .eq('branch_id', branchId)
      .select('id');

    if (error) {
      registrar('eliminar', error);
      return fallo('No se pudo retirar el producto.');
    }
    if (!data || data.length === 0) return fallo('Ese producto ya no está en el inventario de esta sucursal.');
    return exito(undefined);
  }
}
