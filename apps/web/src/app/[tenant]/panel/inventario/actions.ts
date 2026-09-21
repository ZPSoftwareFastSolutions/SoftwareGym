'use server';

/**
 * CAPA: Presentation / App — acciones del inventario de la sucursal (V4.3).
 *
 * Vive aquí, junto a su pantalla, y no en `core/application`: una Server Action
 * es un detalle del framework (recibe `FormData`, revalida rutas, redirige).
 * `core/application` no puede importar `infrastructure` ni `app` sin invertir
 * la Dependency Rule (§2.3), que es justo lo que pasaba antes.
 *
 * LA SEDE NO SALE DEL FORMULARIO: se resuelve con la sesión
 * (`contextoDeSucursal`), como el check-in. Un `branchId` escrito a mano no
 * puede escribir en la sede de otro; y aunque llegara, la base vuelve a exigir
 * `app.puede_operar_sucursal` y el permiso.
 */

import { revalidatePath } from 'next/cache';
import { validarProducto } from '@core/domain/operations/inventario';
import { PERMISO } from '@core/domain/operations/workspace';
import { inventoryRepository } from '@infra/config/composition-root';
import { contextoDeAccion, texto, type EstadoDeFormulario } from '../_acciones';
import { contextoDeSucursal } from '../_sucursal';

const SIN_SEDE = 'No estás operando en ninguna sucursal. Elige una en la cabecera del panel.';

async function acceso(form: FormData) {
  return contextoDeAccion(form, ['enableInventory'], PERMISO.gestionarInventario);
}

export async function guardarProducto(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const { slug, perfil } = permiso.contexto;

  const crudo = {
    name: texto(form, 'name', 100),
    category: texto(form, 'category', 60),
    quantity: texto(form, 'quantity', 10),
    price: texto(form, 'price', 12),
  };
  const valores = { ...crudo } as Record<string, string>;

  const validacion = validarProducto(crudo);
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const sede = await contextoDeSucursal(perfil);
  if (!sede.actual) return { mensaje: SIN_SEDE, valores };

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.', valores };

  const repo = await inventoryRepository();
  const id = texto(form, 'id', 40).trim();
  const resultado = id
    ? await repo.actualizar(id, sede.actual.id, validacion.datos)
    : await repo.crear(perfil.tenantId, sede.actual.id, validacion.datos);

  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };

  revalidatePath(`/${slug}/panel/inventario`);
  return { exito: id ? 'Producto actualizado.' : 'Producto agregado al inventario.' };
}

export async function eliminarProducto(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const { slug, perfil } = permiso.contexto;

  const sede = await contextoDeSucursal(perfil);
  if (!sede.actual) return { mensaje: SIN_SEDE };

  const resultado = await (await inventoryRepository()).eliminar(texto(form, 'id', 40), sede.actual.id);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${slug}/panel/inventario`);
  return { exito: 'Producto retirado del inventario.' };
}
