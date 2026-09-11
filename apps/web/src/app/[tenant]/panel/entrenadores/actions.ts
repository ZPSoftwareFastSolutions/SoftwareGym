'use server';

/**
 * Acciones de entrenadores (V3.1).
 *
 * Todas exigen la capacidad `enableTrainers` y su permiso. Esa comprobación
 * existe para contestar pronto y claro: quien impide la escritura es RLS, la
 * regla del plan la aplica un disparador y la cuenta se vincula por RPC. El
 * gimnasio SIEMPRE sale del perfil de la sesión, nunca del formulario.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  esTipoDeAsignacion,
  turnosDelGimnasio,
  validarAusencia,
  validarEntrenador,
  validarFoco,
  validarReglaDePlan,
} from '@core/domain/operations/trainers';
import { PERMISO } from '@core/domain/operations/workspace';
import { trainersRepository } from '@infra/config/composition-root';
import { contextoDeAccion, texto, type EstadoDeFormulario } from '../_acciones';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidar(slug: string) {
  revalidatePath(`/${slug}/panel`, 'layout');
}

async function gestionar(form: FormData) {
  return contextoDeAccion(form, ['enableTrainers'], PERMISO.gestionarEntrenadores);
}

/** Alta o edición según venga `trainerId`. */
export async function guardarEntrenador(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const crudo = {
    firstName: texto(form, 'firstName', 80),
    lastName: texto(form, 'lastName', 80),
    email: texto(form, 'email', 150),
    phone: texto(form, 'phone', 50),
    bio: texto(form, 'bio', 700),
    specialties: texto(form, 'specialties', 500),
  };
  const valores = { ...crudo } as Record<string, string>;
  const validacion = validarEntrenador(crudo);
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const repo = await trainersRepository();
  const id = texto(form, 'trainerId', 40).trim();
  if (id) {
    const resultado = await repo.actualizar(id, validacion.datos);
    if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
    revalidar(slug);
    return { exito: 'Datos del entrenador guardados.' };
  }

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };
  const resultado = await repo.crear(perfil.tenantId, validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
  revalidar(slug);
  redirect(`/${slug}/panel/entrenadores/${resultado.valor.id}`);
}

async function cambiarEstado(form: FormData, activo: boolean): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await trainersRepository()).cambiarEstado(texto(form, 'trainerId', 40), activo);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return {
    exito: activo
      ? 'Entrenador activado.'
      : 'Entrenador desactivado. Pierde el acceso a sus socios; sus asignaciones siguen a la vista para reasignarlas.',
  };
}

export async function activarEntrenador(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, true);
}

export async function desactivarEntrenador(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, false);
}

export async function guardarSucursalesDeEntrenador(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { perfil, slug } = acceso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const sedes = form
    .getAll('branchIds')
    .filter((v): v is string => typeof v === 'string' && PATRON_UUID.test(v))
    .slice(0, 50);

  const resultado = await (await trainersRepository()).fijarSucursales(perfil.tenantId, texto(form, 'trainerId', 40), sedes);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return { exito: sedes.length === 0 ? 'Sin sede asignada.' : 'Sedes guardadas.' };
}

export async function vincularCuentaDeEntrenador(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const correo = texto(form, 'email', 150).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s.]+(\.[^@\s.]+)*\.[a-z]{2,}$/i.test(correo)) {
    return { errores: { email: 'Escribe el correo con el que se registró.' }, valores: { email: correo } };
  }

  const resultado = await (await trainersRepository()).vincularCuenta(texto(form, 'trainerId', 40), correo);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores: { email: correo } };
  revalidar(acceso.contexto.slug);
  return { exito: 'Cuenta vinculada. En su próximo ingreso verá sus socios asignados.' };
}

export async function desvincularCuentaDeEntrenador(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await trainersRepository()).desvincularCuenta(texto(form, 'trainerId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Cuenta desvinculada. El perfil se conserva.' };
}

export async function registrarAusencia(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { perfil, slug, tenant } = acceso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const crudo = {
    kind: texto(form, 'kind', 20),
    shiftCode: texto(form, 'shiftCode', 20),
    startDate: texto(form, 'startDate', 10),
    endDate: texto(form, 'endDate', 10),
    startTime: texto(form, 'startTime', 5),
    endTime: texto(form, 'endTime', 5),
    reason: texto(form, 'reason', 250),
  };
  const validacion = validarAusencia(crudo, turnosDelGimnasio(tenant.hours.staffShifts));
  if (!validacion.ok) return { errores: validacion.errores, valores: crudo, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await trainersRepository()).registrarAusencia(perfil.tenantId, texto(form, 'trainerId', 40), validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores: crudo };
  revalidar(slug);
  return { exito: 'Ausencia registrada.' };
}

export async function eliminarAusencia(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await trainersRepository()).eliminarAusencia(texto(form, 'ausenciaId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Ausencia eliminada.' };
}

export async function asignarSocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { perfil, slug } = acceso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const customerId = texto(form, 'customerId', 40);
  const kind = texto(form, 'kind', 20);
  const foco = validarFoco(texto(form, 'focus', 80));
  const errores: Record<string, string> = {};
  if (!PATRON_UUID.test(customerId)) errores.customerId = 'Elige al socio.';
  if (!esTipoDeAsignacion(kind)) errores.kind = 'Elige si es principal o secundario.';
  if (!foco.ok) errores.focus = foco.error;
  if (Object.keys(errores).length > 0 || !esTipoDeAsignacion(kind) || !foco.ok) return { errores, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await trainersRepository()).asignar(perfil.tenantId, {
    customerId,
    trainerId: texto(form, 'trainerId', 40),
    kind,
    focus: foco.foco,
  });
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return { exito: kind === 'principal' ? 'Asignado como entrenador principal.' : 'Asignado como entrenador secundario.' };
}

export async function finalizarAsignacion(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { repo, slug } = acceso.contexto;
  const hoy = await repo.hoyDelGimnasio(slug);
  const resultado = await (await trainersRepository()).finalizarAsignacion(texto(form, 'asignacionId', 40), hoy);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return { exito: 'Asignación finalizada.' };
}

export async function guardarReglaDePlan(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableTrainers'], PERMISO.gestionarPlanes);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const validacion = validarReglaDePlan(texto(form, 'includesTrainer', 5), texto(form, 'maxSecondaryTrainers', 2));
  if (!validacion.ok) return { errores: validacion.errores };

  const resultado = await (await trainersRepository()).guardarReglaDePlan(texto(form, 'planId', 40), validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Guardado.' };
}
