'use server';

/**
 * Acciones del catálogo de ejercicios y sus medios (V3.1).
 *
 * SUBIDA EN TRES PASOS, porque un clip no cabe en una Server Action (Vercel
 * corta a 4,5 MB):
 *   1. `prepararSubidaDeMedio`: permiso, tipo, tamaño, duración, tope por
 *      ejercicio y cuota → URL firmada de un solo uso para UNA ruta que decide
 *      el servidor.
 *   2. El navegador sube el archivo directo a Storage.
 *   3. `confirmarSubidaDeMedio`: el servidor lee los primeros bytes del archivo
 *      subido (su tipo REAL) y lo registra. La base vuelve a comprobar tamaño,
 *      tipo y cuota leyendo `storage.objects`. Si algo falla, el archivo se borra.
 *
 * El gimnasio sale de la sesión; el formulario solo dice qué ejercicio.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  detectarTipoDeMedio,
  evaluarCuota,
  formatoDeBytes,
  LIMITES_DE_MEDIOS,
  mensajeDeArchivoRechazado,
  parsearEnlaceDeVideo,
  TIPOS_DE_POSTER,
  tipoDeArchivoPorMime,
  validarArchivoDeMedio,
  validarEjercicio,
} from '@core/domain/operations/exercises';
import { PERMISO } from '@core/domain/operations/workspace';
import { exercisesRepository } from '@infra/config/composition-root';
import { contextoDeAccion, texto, type EstadoDeFormulario } from '../_acciones';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RespuestaDeSubida =
  | { readonly ok: true; readonly path: string; readonly url: string; readonly posterPath: string | null; readonly posterUrl: string | null }
  | { readonly ok: false; readonly mensaje: string };

export type RespuestaSimple = { readonly ok: true; readonly mensaje: string } | { readonly ok: false; readonly mensaje: string };

function revalidar(slug: string) {
  revalidatePath(`/${slug}/panel`, 'layout');
}

async function gestionar(form: FormData) {
  return contextoDeAccion(form, ['enableExercises'], PERMISO.gestionarEjercicios);
}

function entero(valor: string): number | null {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

// ------------------------------------------------------------------ ejercicio

/** Alta o edición según venga `exerciseId`. */
export async function guardarEjercicio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const crudo = {
    name: texto(form, 'name', 100),
    muscleGroup: texto(form, 'muscleGroup', 30),
    equipment: texto(form, 'equipment', 100),
    description: texto(form, 'description', 450),
    instructions: texto(form, 'instructions', 2100),
  };
  const valores = { ...crudo } as Record<string, string>;
  const validacion = validarEjercicio(crudo);
  if (!validacion.ok) return { errores: validacion.errores, valores, mensaje: 'Revisa los campos marcados.' };

  const repo = await exercisesRepository();
  const id = texto(form, 'exerciseId', 40).trim();
  if (id) {
    const resultado = await repo.actualizar(id, validacion.datos);
    if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
    revalidar(slug);
    return { exito: 'Ejercicio guardado.' };
  }

  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };
  const resultado = await repo.crear(perfil.tenantId, validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };
  revalidar(slug);
  redirect(`/${slug}/panel/ejercicios/${resultado.valor.id}`);
}

async function cambiarEstado(form: FormData, activo: boolean): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await exercisesRepository()).cambiarEstado(texto(form, 'exerciseId', 40), activo);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: activo ? 'Ejercicio activado.' : 'Ejercicio desactivado. Sus medios se conservan (y siguen contando en la cuota).' };
}

export async function activarEjercicio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, true);
}

export async function desactivarEjercicio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, false);
}

// ------------------------------------------------------------------ medios

export async function prepararSubidaDeMedio(form: FormData): Promise<RespuestaDeSubida> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { ok: false, mensaje: acceso.mensaje };
  const { perfil } = acceso.contexto;
  if (!perfil.tenantId) return { ok: false, mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const exerciseId = texto(form, 'exerciseId', 40);
  if (!PATRON_UUID.test(exerciseId)) return { ok: false, mensaje: 'Ejercicio no encontrado.' };

  const mime = texto(form, 'mime', 40);
  const size = entero(texto(form, 'size', 12)) ?? 0;
  const duracion = entero(texto(form, 'durationSeconds', 8));
  const posterMime = texto(form, 'posterMime', 40) || null;
  const posterSize = entero(texto(form, 'posterSize', 12)) ?? 0;

  const archivo = validarArchivoDeMedio({ mime, size, durationSeconds: duracion });
  if (!archivo.ok) return { ok: false, mensaje: mensajeDeArchivoRechazado(archivo.motivo, tipoDeArchivoPorMime(mime)) };
  if (posterMime && (archivo.kind !== 'video' || !TIPOS_DE_POSTER.includes(posterMime) || posterSize <= 0 || posterSize > LIMITES_DE_MEDIOS.poster)) {
    return { ok: false, mensaje: 'La miniatura del clip no es válida.' };
  }

  const repo = await exercisesRepository();
  const [ejercicio, medios, uso] = await Promise.all([repo.porId(exerciseId), repo.medios(exerciseId), repo.uso()]);
  if (!ejercicio) return { ok: false, mensaje: 'Ejercicio no encontrado.' };
  if (medios.length >= LIMITES_DE_MEDIOS.porEjercicio) {
    return { ok: false, mensaje: `Un ejercicio admite hasta ${LIMITES_DE_MEDIOS.porEjercicio} medios.` };
  }
  if (!uso) return { ok: false, mensaje: 'No se pudo leer la cuota de medios.' };
  const cuota = evaluarCuota(uso, size + (posterMime ? posterSize : 0));
  if (!cuota.permitido) {
    return { ok: false, mensaje: `No queda espacio: quedan ${formatoDeBytes(cuota.restanteBytes)} de la cuota del gimnasio. Borra medios que no uses o enlaza el vídeo desde YouTube.` };
  }

  const preparada = await repo.prepararSubida(perfil.tenantId, exerciseId, mime, archivo.kind === 'video' ? posterMime : null);
  if (!preparada.ok) return { ok: false, mensaje: preparada.mensaje };
  return { ok: true, ...preparada.valor };
}

/** Rutas que el formulario puede pedir tocar: solo las de ESTE ejercicio de ESTE gimnasio. */
function rutaPropia(ruta: string, tenantId: string, exerciseId: string): boolean {
  return ruta.startsWith(`${tenantId}/${exerciseId}/`) && /^[0-9a-f/-]+(-poster)?\.(webp|jpg|png|gif|mp4|webm)$/i.test(ruta) && !ruta.includes('..');
}

export async function confirmarSubidaDeMedio(form: FormData): Promise<RespuestaSimple> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { ok: false, mensaje: acceso.mensaje };
  const { perfil, slug } = acceso.contexto;
  if (!perfil.tenantId) return { ok: false, mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const exerciseId = texto(form, 'exerciseId', 40);
  const path = texto(form, 'path', 200);
  const posterPath = texto(form, 'posterPath', 200) || null;
  const duracion = entero(texto(form, 'durationSeconds', 8));
  if (!PATRON_UUID.test(exerciseId) || !rutaPropia(path, perfil.tenantId, exerciseId) || (posterPath && !rutaPropia(posterPath, perfil.tenantId, exerciseId))) {
    return { ok: false, mensaje: 'Archivo no válido.' };
  }

  const repo = await exercisesRepository();
  const descartar = () => repo.descartarArchivos([path, ...(posterPath ? [posterPath] : [])]);

  const cabecera = await repo.cabecera(path);
  const mimeReal = cabecera ? detectarTipoDeMedio(cabecera) : null;
  const kind = mimeReal ? tipoDeArchivoPorMime(mimeReal) : null;
  if (!kind) {
    await descartar();
    return { ok: false, mensaje: 'El archivo no es una imagen, GIF o clip válido.' };
  }
  if (posterPath) {
    const cabeceraDelPoster = await repo.cabecera(posterPath);
    const mimeDelPoster = cabeceraDelPoster ? detectarTipoDeMedio(cabeceraDelPoster) : null;
    if (kind !== 'video' || !mimeDelPoster || !TIPOS_DE_POSTER.includes(mimeDelPoster)) {
      await descartar();
      return { ok: false, mensaje: 'La miniatura del clip no es válida.' };
    }
  }

  const resultado = await repo.registrarArchivo(perfil.tenantId, exerciseId, {
    kind,
    storagePath: path,
    posterPath: kind === 'video' ? posterPath : null,
    durationSeconds: kind === 'video' && duracion !== null ? Math.min(LIMITES_DE_MEDIOS.duracionMaximaDeVideo, Math.max(0.1, Math.round(duracion * 10) / 10)) : null,
  });
  if (!resultado.ok) {
    await descartar();
    return { ok: false, mensaje: resultado.mensaje };
  }
  revalidar(slug);
  return { ok: true, mensaje: 'Medio agregado.' };
}

/** La subida al Storage falló a mitad: se borra lo que haya llegado. */
export async function descartarSubidaDeMedio(form: FormData): Promise<void> {
  const acceso = await gestionar(form);
  if (!acceso.ok || !acceso.contexto.perfil.tenantId) return;
  const tenantId = acceso.contexto.perfil.tenantId;
  const exerciseId = texto(form, 'exerciseId', 40);
  const rutas = [texto(form, 'path', 200), texto(form, 'posterPath', 200)].filter((r) => r && rutaPropia(r, tenantId, exerciseId));
  await (await exercisesRepository()).descartarArchivos(rutas);
}

export async function agregarEnlaceDeVideo(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { perfil, slug } = acceso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const url = texto(form, 'url', 300);
  const enlace = parsearEnlaceDeVideo(url);
  if (!enlace) return { errores: { url: 'Pega un enlace de YouTube o Vimeo (https://…).' }, valores: { url } };

  const repo = await exercisesRepository();
  const exerciseId = texto(form, 'exerciseId', 40);
  if ((await repo.medios(exerciseId)).length >= LIMITES_DE_MEDIOS.porEjercicio) {
    return { mensaje: `Un ejercicio admite hasta ${LIMITES_DE_MEDIOS.porEjercicio} medios.` };
  }
  const resultado = await repo.registrarEnlace(perfil.tenantId, exerciseId, enlace.provider, enlace.id);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores: { url } };
  revalidar(slug);
  return { exito: 'Vídeo enlazado. No ocupa espacio de la cuota.' };
}

export async function eliminarMedio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await exercisesRepository()).eliminarMedio(texto(form, 'medioId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Medio eliminado y archivo borrado.' };
}

export async function liberarArchivosSinUso(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await gestionar(form);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { perfil, slug } = acceso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const repo = await exercisesRepository();
  const { paths, bytes } = await repo.archivosSinUso(perfil.tenantId);
  if (paths.length === 0) return { exito: 'No hay archivos sin uso.' };
  await repo.descartarArchivos(paths);
  revalidar(slug);
  return { exito: `Se liberaron ${paths.length} archivo${paths.length === 1 ? '' : 's'} (${formatoDeBytes(bytes)}).` };
}
