'use server';

/**
 * Acciones de programas, rutinas, asignaciones y progreso (V3.2).
 *
 * Cada una exige la capacidad `enableRoutines` y su permiso, pero eso es para
 * contestar pronto: quien decide es la base. En particular, `marcarEjercicio`
 * NO exige permiso —el socio marca lo suyo y no tiene ninguno—; el disparador
 * `app.preparar_completado` comprueba que sea su propio ejercicio o que quien
 * marca tenga `training.log` sobre ese socio.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  validarEjercicioDeRutina,
  validarMarca,
  validarPrograma,
  validarRutina,
} from '@core/domain/operations/training';
import { PERMISO } from '@core/domain/operations/workspace';
import { trainingRepository } from '@infra/config/composition-root';
import { contextoDeAccion, nulo, texto, type EstadoDeFormulario } from '../_acciones';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidar(slug: string) {
  revalidatePath(`/${slug}/panel`, 'layout');
}

async function gestionar(form: FormData) {
  return contextoDeAccion(form, ['enableRoutines'], PERMISO.gestionarRutinas);
}

async function asignar(form: FormData) {
  return contextoDeAccion(form, ['enableRoutines'], PERMISO.asignarRutinas);
}

function formularioDeEjercicio(form: FormData) {
  return {
    exerciseId: texto(form, 'exerciseId', 40),
    position: texto(form, 'position', 4),
    sets: texto(form, 'sets', 4),
    reps: texto(form, 'reps', 20),
    weightKg: texto(form, 'weightKg', 8),
    restSeconds: texto(form, 'restSeconds', 5),
    notes: texto(form, 'notes', 250),
  };
}

// ------------------------------------------------------------------ programas

export async function guardarPrograma(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const crudo = {
    name: texto(form, 'name', 100),
    description: texto(form, 'description', 450),
    goal: texto(form, 'goal', 20),
    level: texto(form, 'level', 20),
    weeks: texto(form, 'weeks', 3),
  };
  const valores = { ...crudo } as Record<string, string>;
  const validacion = validarPrograma(crudo);
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const repo = await trainingRepository();
  const id = texto(form, 'programId', 40).trim();
  if (id) {
    const resultado = await repo.actualizarPrograma(id, validacion.datos);
    if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
    revalidar(slug);
    return { exito: 'Programa guardado.' };
  }

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };
  const resultado = await repo.crearPrograma(perfil.tenantId, validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
  revalidar(slug);
  return { exito: 'Programa creado. Agrégale rutinas (Día A, Día B…).' };
}

async function cambiarEstadoDePrograma(form: FormData, activo: boolean): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await trainingRepository()).cambiarEstadoDePrograma(texto(form, 'programId', 40), activo);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: activo ? 'Programa activado.' : 'Programa archivado. Sus rutinas y lo asignado se conservan.' };
}

export async function activarPrograma(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstadoDePrograma(form, true);
}

export async function desactivarPrograma(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstadoDePrograma(form, false);
}

// ------------------------------------------------------------------ rutinas

export async function guardarRutina(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const crudo = {
    name: texto(form, 'name', 100),
    dayLabel: texto(form, 'dayLabel', 50),
    position: texto(form, 'position', 4),
    notes: texto(form, 'notes', 450),
    estimatedMinutes: texto(form, 'estimatedMinutes', 4),
  };
  const valores = { ...crudo } as Record<string, string>;
  const validacion = validarRutina(crudo);
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const programaCrudo = texto(form, 'programId', 40).trim();
  const programId = programaCrudo && PATRON_UUID.test(programaCrudo) ? programaCrudo : null;

  const repo = await trainingRepository();
  const id = texto(form, 'routineId', 40).trim();
  if (id) {
    const resultado = await repo.actualizarRutina(id, programId, validacion.datos);
    if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
    revalidar(slug);
    return { exito: 'Rutina guardada.' };
  }

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };
  const resultado = await repo.crearRutina(perfil.tenantId, programId, validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
  revalidar(slug);
  redirect(`/${slug}/panel/rutinas/${resultado.valor.id}`);
}

async function cambiarEstadoDeRutina(form: FormData, activa: boolean): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await trainingRepository()).cambiarEstadoDeRutina(texto(form, 'routineId', 40), activa);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: activa ? 'Rutina activada.' : 'Rutina archivada. Las copias ya asignadas siguen como están.' };
}

export async function activarRutina(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstadoDeRutina(form, true);
}

export async function desactivarRutina(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstadoDeRutina(form, false);
}

export async function agregarEjercicioARutina(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const crudo = formularioDeEjercicio(form);
  const validacion = validarEjercicioDeRutina(crudo);
  if (!validacion.ok) return { errores: validacion.errores, valores: crudo as unknown as Record<string, string>, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await trainingRepository()).agregarEjercicio(perfil.tenantId, texto(form, 'routineId', 40), validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return { exito: 'Ejercicio agregado a la rutina.' };
}

export async function actualizarEjercicioDeRutina(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const validacion = validarEjercicioDeRutina(formularioDeEjercicio(form));
  if (!validacion.ok) return { errores: validacion.errores, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await trainingRepository()).actualizarEjercicio(texto(form, 'itemId', 40), validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Ejercicio actualizado.' };
}

export async function quitarEjercicioDeRutina(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await trainingRepository()).quitarEjercicio(texto(form, 'itemId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Ejercicio quitado de la rutina.' };
}

// ------------------------------------------------------------------ asignación

export async function asignarRutinaASocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await asignar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const customerId = texto(form, 'customerId', 40);
  const routineId = texto(form, 'routineId', 40);
  if (!PATRON_UUID.test(customerId)) return { errores: { customerId: 'Elige al socio.' } };
  if (!PATRON_UUID.test(routineId)) return { errores: { routineId: 'Elige la rutina.' } };

  const resultado = await (await trainingRepository()).asignar(customerId, routineId, nulo(texto(form, 'notes', 450)));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: `Rutina asignada con ${resultado.valor.ejercicios} ejercicios. El socio ya la ve en su panel.` };
}

export async function finalizarRutinaAsignada(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await asignar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { repo, slug } = acceso.contexto;
  const hoy = await repo.hoyDelGimnasio(slug);
  const resultado = await (await trainingRepository()).finalizarAsignacion(texto(form, 'asignacionId', 40), hoy);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return { exito: 'Rutina finalizada. El historial de entrenamientos se conserva.' };
}

export async function actualizarEjercicioAsignado(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await asignar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const validacion = validarEjercicioDeRutina(formularioDeEjercicio(form));
  if (!validacion.ok) return { errores: validacion.errores, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await trainingRepository()).actualizarEjercicioAsignado(texto(form, 'itemId', 40), validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Ajustado para este socio.' };
}

export async function quitarEjercicioAsignado(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await asignar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await trainingRepository()).quitarEjercicioAsignado(texto(form, 'itemId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Ejercicio quitado de la rutina del socio.' };
}

// ------------------------------------------------------------------ progreso

/**
 * Marca un ejercicio como hecho HOY. Sin permiso: el socio marca lo suyo y la
 * base comprueba de quién es el ejercicio.
 */
export async function marcarEjercicio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableRoutines']);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const marca = validarMarca(texto(form, 'sets', 4), texto(form, 'weightKg', 8));
  if (!marca.ok) return { errores: marca.errores };

  const resultado = await (await trainingRepository()).marcar(
    texto(form, 'itemId', 40),
    marca.datos.sets,
    marca.datos.weightKg,
    nulo(texto(form, 'notes', 250)),
  );
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: resultado.valor.yaEstaba ? 'Ya estaba marcado hoy.' : '¡Hecho! Queda registrado.' };
}

export async function desmarcarEjercicio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableRoutines']);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { repo, slug } = acceso.contexto;
  const hoy = await repo.hoyDelGimnasio(slug);

  const resultado = await (await trainingRepository()).desmarcar(texto(form, 'itemId', 40), hoy);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  return { exito: 'Marca de hoy deshecha.' };
}
