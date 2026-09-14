'use server';

/**
 * Acciones de personal y roles (V4).
 *
 * Cada una re-resuelve gimnasio, sesión y permiso con `contextoDeAccion`, y la
 * base vuelve a decidir con la JERARQUÍA: esta capa solo devuelve un mensaje
 * legible. Nada de lo que llega del formulario decide a qué gimnasio pertenece
 * la cuenta ni qué nivel tiene quien pide el cambio.
 */

import { revalidatePath } from 'next/cache';
import { esCodigoDeRol, PERMISO, ROLES_OTORGABLES, type RolDeGimnasio } from '@core/domain/operations/workspace';
import { staffRepository } from '@infra/config/composition-root';
import { contextoDeAccion, texto, type EstadoDeFormulario } from '../_acciones';

function rolOtorgable(valor: string): RolDeGimnasio | null {
  if (!esCodigoDeRol(valor) || valor === 'super_admin') return null;
  return ROLES_OTORGABLES.includes(valor) ? valor : null;
}

const NOMBRE: Readonly<Record<string, string>> = { admin: 'Administración', manager: 'Gerencia', receptionist: 'Recepción' };

export async function otorgarRol(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, [], PERMISO.gestionarUsuarios);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const rol = rolOtorgable(texto(form, 'rol', 20));
  if (!rol) return { errores: { rol: 'Elige un rol.' }, mensaje: 'Elige un rol.' };

  const resultado = await (await staffRepository()).otorgarRol(texto(form, 'cuentaId', 40), rol);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${acceso.contexto.slug}/panel`, 'layout');
  return { exito: `Rol de ${NOMBRE[rol]} otorgado. Lo verá al recargar su panel.` };
}

export async function retirarRol(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, [], PERMISO.gestionarUsuarios);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const rol = rolOtorgable(texto(form, 'rol', 20));
  if (!rol) return { mensaje: 'Ese rol no se quita desde aquí.' };

  const resultado = await (await staffRepository()).retirarRol(texto(form, 'cuentaId', 40), rol);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${acceso.contexto.slug}/panel`, 'layout');
  return { exito: `Rol de ${NOMBRE[rol]} retirado.` };
}

export async function cambiarEstadoDeCuenta(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, [], PERMISO.gestionarUsuarios);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const activa = texto(form, 'activa', 5) === 'si';
  const resultado = await (await staffRepository()).cambiarEstado(texto(form, 'cuentaId', 40), activa);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${acceso.contexto.slug}/panel`, 'layout');
  return { exito: activa ? 'Cuenta reactivada.' : 'Cuenta suspendida: ya no puede entrar al panel.' };
}
