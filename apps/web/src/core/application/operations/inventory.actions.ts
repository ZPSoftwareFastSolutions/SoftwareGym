'use server';

import { revalidatePath } from 'next/cache';
import { exigirPermiso } from '@/app/[tenant]/panel/_datos';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { PERMISO } from '@core/domain/operations/workspace';
import { inventoryRepository } from '@infra/config/composition-root';
import type { InventoryProductFormData } from '@core/application/ports/inventory-repository.port';

export async function guardarProducto(
  previo: EstadoDeFormulario,
  form: FormData
): Promise<EstadoDeFormulario> {
  const slug = String(form.get('tenantSlug') ?? '');
  const branchId = String(form.get('branchId') ?? '');
  const id = form.get('id') ? String(form.get('id')) : null;
  
  const data: InventoryProductFormData = {
    name: String(form.get('name') ?? ''),
    category: form.get('category') ? String(form.get('category')) : null,
    quantity: Number(form.get('quantity') ?? 0),
    price: Number(form.get('price') ?? 0),
  };
  const { perfil } = await exigirPermiso(slug, PERMISO.registrarAsistencia);
  const repo = await inventoryRepository();

  if (!perfil.tenantId) {
    return { mensaje: 'Usuario no pertenece a un gimnasio' };
  }

  const resultado = id
    ? await repo.actualizar(id, branchId, data)
    : await repo.crear(perfil.tenantId, branchId, data);

  if (resultado.ok) {
    revalidatePath(`/${slug}/panel/inventario`);
    return { exito: 'Producto guardado' };
  }
  
  return { mensaje: resultado.mensaje };
}

export async function eliminarProducto(
  previo: EstadoDeFormulario,
  form: FormData
): Promise<EstadoDeFormulario> {
  const slug = String(form.get('slug') ?? '');
  const branchId = String(form.get('branchId') ?? '');
  const id = String(form.get('id') ?? '');
  
  await exigirPermiso(slug, PERMISO.registrarAsistencia);
  const repo = await inventoryRepository();

  const resultado = await repo.eliminar(id, branchId);

  if (resultado.ok) {
    revalidatePath(`/${slug}/panel/inventario`);
    return { exito: 'Producto eliminado' };
  }
  
  return { mensaje: resultado.mensaje };
}
