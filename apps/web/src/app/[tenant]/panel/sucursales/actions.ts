'use server';

/**
 * Acciones de administración de sucursales (V3.0).
 *
 * Todas exigen la capacidad `enableMultiBranch` y el permiso
 * `branches.manage`, pero esa comprobación existe para contestar pronto y
 * claro: quien impide la escritura es RLS. El gimnasio SIEMPRE sale del
 * perfil de la sesión, nunca del formulario.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validarSucursal, type FormularioDeSucursal } from '@core/domain/operations/branches';
import { PERMISO } from '@core/domain/operations/workspace';
import { branchesRepository } from '@infra/config/composition-root';
import { contextoDeAccion, texto, type EstadoDeFormulario } from '../_acciones';

function formulario(form: FormData): FormularioDeSucursal {
  return {
    code: texto(form, 'code', 20),
    name: texto(form, 'name', 100),
    address: texto(form, 'address', 250),
    phone: texto(form, 'phone', 50),
    email: texto(form, 'email', 150),
    openingHours: texto(form, 'openingHours', 450),
    latitude: texto(form, 'latitude', 20),
    longitude: texto(form, 'longitude', 20),
    googleMapsUrl: texto(form, 'googleMapsUrl', 300),
  };
}

function revalidar(slug: string) {
  revalidatePath(`/${slug}/panel`, 'layout');
  // La vitrina se regenera sola (ISR), pero así el cambio se ve al instante.
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/contacto`);
}

async function acceso(form: FormData) {
  return contextoDeAccion(form, ['enableMultiBranch'], PERMISO.gestionarSucursales);
}

/** Alta o edición según venga `branchId`. */
export async function guardarSucursal(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const { slug, perfil } = permiso.contexto;

  const crudo = formulario(form);
  const valores = { ...crudo } as Record<string, string>;
  const validacion = validarSucursal(crudo);
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const repo = await branchesRepository();
  const id = texto(form, 'branchId', 40).trim();

  if (id) {
    const resultado = await repo.actualizar(id, validacion.datos);
    if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
    revalidar(slug);
    return { exito: 'Sucursal actualizada.' };
  }

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };
  const resultado = await repo.crear(perfil.tenantId, validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
  revalidar(slug);
  redirect(`/${slug}/panel/sucursales/${resultado.valor.id}`);
}

export async function activarSucursal(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, true);
}

export async function desactivarSucursal(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, false);
}

async function cambiarEstado(form: FormData, activa: boolean): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const resultado = await (await branchesRepository()).cambiarEstado(texto(form, 'branchId', 40), activa);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(permiso.contexto.slug);
  return { exito: activa ? 'Sucursal activada.' : 'Sucursal desactivada. Su historial se conserva.' };
}

export async function hacerSucursalPrincipal(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const resultado = await (await branchesRepository()).establecerPrimaria(texto(form, 'branchId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(permiso.contexto.slug);
  return { exito: 'Ahora es la sucursal principal.' };
}

export async function asignarPersonal(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const { perfil, slug } = permiso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const resultado = await (await branchesRepository()).asignar(
    perfil.tenantId,
    texto(form, 'appUserId', 40),
    texto(form, 'branchId', 40),
  );
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return { exito: 'Asignada.' };
}

export async function retirarPersonal(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const resultado = await (await branchesRepository()).retirar(texto(form, 'appUserId', 40), texto(form, 'branchId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(permiso.contexto.slug);
  return { exito: 'Retirada.' };
}
