'use server';

/**
 * Acciones de clases, horarios, sesiones y asistencia (V3.3).
 *
 * Cada una exige la capacidad `enableClasses` y su permiso para contestar
 * pronto con un mensaje legible; quien decide es la base. Registrar asistencia
 * pide `classes.attend`, pero que recepción solo lo haga en SUS sedes, que el
 * instructor solo en SUS sesiones y que el plan del socio incluya la clase lo
 * comprueba el disparador `app.validar_asistencia_a_clase`.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  validarClase,
  validarHorario,
  validarMotivoDeCancelacion,
  validarRangoDeGeneracion,
  validarSesion,
  type CandidatoDeClase,
} from '@core/domain/operations/classes';
import { PERMISO } from '@core/domain/operations/workspace';
import { classesRepository } from '@infra/config/composition-root';
import { contextoDeAccion, texto, type EstadoDeFormulario } from '../_acciones';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidar(slug: string) {
  revalidatePath(`/${slug}/panel`, 'layout');
  // La vitrina de clases es ISR: sin esto, un horario nuevo tarda cinco minutos en verse.
  revalidatePath(`/${slug}/clases`);
}

async function gestionar(form: FormData) {
  return contextoDeAccion(form, ['enableClasses'], PERMISO.gestionarClases);
}

async function tomarAsistencia(form: FormData) {
  return contextoDeAccion(form, ['enableClasses'], PERMISO.tomarAsistenciaDeClase);
}

// ------------------------------------------------------------------ clases

export async function guardarClase(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const crudo = {
    name: texto(form, 'name', 100),
    description: texto(form, 'description', 650),
    category: texto(form, 'category', 30),
    level: texto(form, 'level', 20),
    kind: texto(form, 'kind', 20),
    accessMode: texto(form, 'accessMode', 20),
    durationMinutes: texto(form, 'durationMinutes', 4),
    capacity: texto(form, 'capacity', 4),
    walkinSpots: texto(form, 'walkinSpots', 4),
    trainerId: texto(form, 'trainerId', 40),
  };
  const valores = { ...crudo, isPublic: form.get('isPublic') === 'on' ? 'on' : '' } as Record<string, string>;
  const validacion = validarClase({ ...crudo, isPublic: form.get('isPublic') === 'on' });
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const repo = await classesRepository();
  const id = texto(form, 'classId', 40).trim();
  if (id) {
    const resultado = await repo.actualizarClase(id, validacion.datos);
    if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
    revalidar(slug);
    return { exito: 'Clase guardada.' };
  }

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };
  const resultado = await repo.crearClase(perfil.tenantId, validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
  revalidar(slug);
  redirect(`/${slug}/panel/clases/${resultado.valor.id}`);
}

async function cambiarEstadoDeClase(form: FormData, activa: boolean): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await classesRepository()).cambiarEstadoDeClase(texto(form, 'classId', 40), activa);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: activa ? 'Clase activada.' : 'Clase archivada. Sus sesiones y la asistencia registrada se conservan.' };
}

export async function activarClase(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstadoDeClase(form, true);
}

export async function archivarClase(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstadoDeClase(form, false);
}

/** Los planes marcados en el formulario son TODOS los que incluyen la clase: los demás se quitan. */
export async function guardarPlanesDeClase(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const planes = form
    .getAll('planId')
    .filter((v): v is string => typeof v === 'string' && PATRON_UUID.test(v))
    .slice(0, 100);
  const resultado = await (await classesRepository()).fijarPlanes(texto(form, 'classId', 40), planes);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return {
    exito:
      planes.length === 0
        ? 'Ningún plan marcado. Si la clase es «solo planes», nadie podrá entrar hasta que marques alguno.'
        : `Listo: ${planes.length} plan${planes.length === 1 ? '' : 'es'} incluyen esta clase.`,
  };
}

// ------------------------------------------------------------------ horarios

export async function agregarHorario(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil, repo } = acceso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const hoy = await repo.hoyDelGimnasio(slug);
  const validacion = validarHorario(
    {
      branchId: texto(form, 'branchId', 40),
      trainerId: texto(form, 'trainerId', 40),
      weekdays: form.getAll('weekday').filter((v): v is string => typeof v === 'string').slice(0, 7),
      startTime: texto(form, 'startTime', 8),
      durationMinutes: texto(form, 'durationMinutes', 4),
      capacity: texto(form, 'capacity', 4),
      endsOn: texto(form, 'endsOn', 10),
    },
    hoy,
  );
  if (!validacion.ok) return { errores: validacion.errores, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await classesRepository()).crearHorarios(perfil.tenantId, texto(form, 'classId', 40), validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return {
    exito: `${resultado.valor.creados} horario${resultado.valor.creados === 1 ? '' : 's'} agregado${
      resultado.valor.creados === 1 ? '' : 's'
    }. Genera las sesiones para que aparezcan en el calendario.`,
  };
}

export async function desactivarHorario(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const repo = await classesRepository();
  const id = texto(form, 'scheduleId', 40);
  const resultado = await repo.desactivarHorario(id);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  // Quitar un horario sin cancelar lo ya generado dejaría sesiones fantasma en el
  // calendario del socio. Se cancelan las futuras que no tienen a nadie.
  const cancelacion = await repo.cancelarSesionesDeHorario(id, 'Horario retirado por el gimnasio');
  revalidar(acceso.contexto.slug);
  return {
    exito: cancelacion.ok
      ? `Horario retirado. ${cancelacion.valor.canceladas} sesiones futuras canceladas; las que ya tienen asistentes se mantienen.`
      : 'Horario retirado. Revisa las sesiones futuras que ya estaban generadas.',
  };
}

export async function generarSesiones(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, repo } = acceso.contexto;
  const hoy = await repo.hoyDelGimnasio(slug);

  const validacion = validarRangoDeGeneracion(texto(form, 'desde', 10), texto(form, 'hasta', 10), hoy);
  if (!validacion.ok) return { errores: validacion.errores, mensaje: 'Revisa las fechas.' };

  const claseCruda = texto(form, 'classId', 40).trim();
  const resultado = await (await classesRepository()).generarSesiones(
    validacion.datos.desde,
    validacion.datos.hasta,
    PATRON_UUID.test(claseCruda) ? claseCruda : null,
  );
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);

  const { creadas, existentes, conflictos } = resultado.valor;
  const resumen = `${creadas} sesiones nuevas · ${existentes} ya existían`;
  if (conflictos.length === 0) return { exito: `${resumen}.` };
  const detalle = conflictos
    .slice(0, 5)
    .map((c) => `${c.clase} ${c.fecha.slice(8, 10)}/${c.fecha.slice(5, 7)} ${c.hora}: ${c.motivo}`)
    .join(' · ');
  return {
    exito: `${resumen} · ${conflictos.length} omitidas por conflicto: ${detalle}${conflictos.length > 5 ? '…' : ''}`,
  };
}

// ------------------------------------------------------------------ sesiones

export async function guardarSesion(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil, repo } = acceso.contexto;
  const hoy = await repo.hoyDelGimnasio(slug);

  const crudo = {
    classId: texto(form, 'classId', 40),
    branchId: texto(form, 'branchId', 40),
    trainerId: texto(form, 'trainerId', 40),
    sessionDate: texto(form, 'sessionDate', 10),
    startTime: texto(form, 'startTime', 8),
    durationMinutes: texto(form, 'durationMinutes', 4),
    capacity: texto(form, 'capacity', 4),
    title: texto(form, 'title', 100),
    notes: texto(form, 'notes', 450),
  };
  const valores = { ...crudo } as Record<string, string>;
  const validacion = validarSesion(crudo, hoy);
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const clases = await classesRepository();
  const id = texto(form, 'sessionId', 40).trim();
  if (id) {
    const resultado = await clases.actualizarSesion(id, validacion.datos);
    if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
    revalidar(slug);
    return { exito: 'Sesión actualizada.' };
  }

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };
  const resultado = await clases.crearSesion(perfil.tenantId, validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
  revalidar(slug);
  redirect(`/${slug}/panel/clases/sesion/${resultado.valor.id}`);
}

export async function cancelarSesion(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const motivo = validarMotivoDeCancelacion(texto(form, 'motivo', 250));
  if (!motivo.ok) return { errores: motivo.errores };
  const resultado = await (await classesRepository()).cancelarSesion(texto(form, 'sessionId', 40), motivo.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Sesión cancelada. Queda en el calendario con su motivo.' };
}

// ------------------------------------------------------------------ asistencia

export interface EstadoDeBusqueda {
  readonly buscado?: string;
  readonly candidatos?: readonly CandidatoDeClase[];
  readonly mensaje?: string;
}

/** Busca socios para una sesión por nombre, código o el texto del QR (lector USB). */
export async function buscarSociosParaSesion(_previo: EstadoDeBusqueda, form: FormData): Promise<EstadoDeBusqueda> {
  const acceso = await tomarAsistencia(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const buscar = texto(form, 'buscar', 60).trim();
  const candidatos = await (await classesRepository()).candidatos(texto(form, 'sessionId', 40), buscar === '' ? null : buscar);
  return {
    buscado: buscar,
    candidatos,
    mensaje: candidatos.length === 0 ? (buscar ? 'Ningún socio coincide.' : 'Nadie con un plan que incluya esta clase.') : undefined,
  };
}

export async function registrarAsistenciaAClase(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await tomarAsistencia(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const metodo = texto(form, 'metodo', 10) === 'qr' ? 'qr' : 'manual';
  const resultado = await (await classesRepository()).registrarAsistencia(texto(form, 'sessionId', 40), texto(form, 'customerId', 40), metodo);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: `Registrado · ${resultado.valor.asistentes} de ${resultado.valor.capacidad}` };
}

export async function quitarAsistenciaDeClase(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await tomarAsistencia(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await classesRepository()).quitarAsistencia(texto(form, 'attendanceId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Asistencia quitada.' };
}
