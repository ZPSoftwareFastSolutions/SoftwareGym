/**
 * CAPA: Infrastructure / Operations
 *
 * Catálogo de ejercicios y medios contra Supabase (tablas y Storage, V3.1).
 *
 * Bucket PRIVADO `ejercicios`. Se sirve con URLs firmadas de corta vida, no
 * pasando por la aplicación: un clip de 15 MB no cabe en una respuesta de
 * Vercel (4,5 MB). Las URLs firmadas solo las emite quien tiene
 * `exercises.read` (RLS de Storage) y caducan en una hora.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EjercicioDelCatalogo,
  ExercisesRepositoryPort,
  FiltroDeEjercicios,
  MedioSubido,
  SubidaPreparada,
} from '@core/application/ports/exercises-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import { numero } from '@core/domain/operations/dashboard';
import {
  esGrupoMuscular,
  mensajeDeErrorDeEjercicios,
  rutaDeMedio,
  type DatosDeEjercicio,
  type Ejercicio,
  type MedioDeEjercicio,
  type ProveedorDeVideo,
  type TipoDeMedio,
  type UsoDeMedios,
} from '@core/domain/operations/exercises';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'ejercicios';
const COLUMNAS = 'id, name, description, muscle_group, equipment, instructions, is_active, updated_at';

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function aEjercicio(fila: Record<string, unknown>): Ejercicio {
  return {
    id: String(fila.id),
    name: String(fila.name ?? ''),
    description: texto(fila.description),
    muscleGroup: esGrupoMuscular(fila.muscle_group) ? fila.muscle_group : 'cuerpo_completo',
    equipment: texto(fila.equipment),
    instructions: texto(fila.instructions),
    isActive: fila.is_active === true,
    updatedAt: texto(fila.updated_at),
  };
}

function esTipoDeMedio(valor: unknown): valor is TipoDeMedio {
  return valor === 'imagen' || valor === 'gif' || valor === 'video' || valor === 'enlace';
}

function aMedio(fila: Record<string, unknown>): MedioDeEjercicio {
  return {
    id: String(fila.id),
    exerciseId: String(fila.exercise_id),
    kind: esTipoDeMedio(fila.kind) ? fila.kind : 'imagen',
    storagePath: texto(fila.storage_path),
    posterPath: texto(fila.poster_path),
    provider: fila.external_provider === 'youtube' || fila.external_provider === 'vimeo' ? fila.external_provider : null,
    externalId: texto(fila.external_id),
    mimeType: texto(fila.mime_type),
    sizeBytes: numero(fila.size_bytes),
    posterSizeBytes: numero(fila.poster_size_bytes),
    durationSeconds: fila.duration_seconds === null || fila.duration_seconds === undefined ? null : numero(fila.duration_seconds),
    sortOrder: numero(fila.sort_order),
  };
}

function aFila(datos: DatosDeEjercicio) {
  return {
    name: datos.name,
    muscle_group: datos.muscleGroup,
    equipment: datos.equipment,
    description: datos.description,
    instructions: datos.instructions,
  };
}

function falloDe(operacion: string, error: { code?: string; message?: string } | null): ResultadoDeOperacion<never> {
  console.error(`[ejercicios] ${operacion}`, error?.code ?? '', error?.message ?? '');
  return fallo(mensajeDeErrorDeEjercicios(`${error?.code ?? ''} ${error?.message ?? ''}`));
}

export class SupabaseExercisesRepository implements ExercisesRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(filtro: FiltroDeEjercicios): Promise<readonly EjercicioDelCatalogo[]> {
    let consulta = this.supabase.from('exercises').select(COLUMNAS).order('name', { ascending: true }).limit(500);
    if (filtro.estado !== 'todos') consulta = consulta.eq('is_active', filtro.estado !== 'inactivos');
    if (filtro.grupo) consulta = consulta.eq('muscle_group', filtro.grupo);
    const busqueda = (filtro.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
    if (busqueda) consulta = consulta.or(`name.ilike.%${busqueda}%,equipment.ilike.%${busqueda}%`);

    const { data } = await consulta;
    const ejercicios = (data ?? []).map((fila) => aEjercicio(fila));
    if (ejercicios.length === 0) return [];

    // Una sola consulta de medios para toda la página (sin N+1).
    const { data: medios } = await this.supabase
      .from('exercise_media')
      .select('exercise_id, kind, storage_path, poster_path, sort_order, created_at')
      .in('exercise_id', ejercicios.map((e) => e.id))
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    const porEjercicio = new Map<string, { medios: number; miniatura: string | null; tieneVideo: boolean }>();
    for (const fila of medios ?? []) {
      const id = String(fila.exercise_id);
      const actual = porEjercicio.get(id) ?? { medios: 0, miniatura: null, tieneVideo: false };
      actual.medios += 1;
      if (fila.kind === 'video') actual.tieneVideo = true;
      // Miniatura liviana: la imagen comprimida o el póster del clip. Nunca un
      // GIF ni un vídeo: una lista no debe descargar megas.
      if (!actual.miniatura) {
        if (fila.kind === 'imagen') actual.miniatura = texto(fila.storage_path);
        else if (fila.kind === 'video') actual.miniatura = texto(fila.poster_path);
      }
      porEjercicio.set(id, actual);
    }

    return ejercicios.map((e) => ({ ...e, ...(porEjercicio.get(e.id) ?? { medios: 0, miniatura: null, tieneVideo: false }) }));
  }

  async porId(id: string): Promise<Ejercicio | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('exercises').select(COLUMNAS).eq('id', id).maybeSingle();
    return data ? aEjercicio(data) : null;
  }

  async crear(tenantId: string, datos: DatosDeEjercicio): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    const { data, error } = await this.supabase
      .from('exercises')
      .insert({ tenant_id: tenantId, ...aFila(datos) })
      .select('id')
      .maybeSingle();
    if (error || !data) return falloDe('crear', error);
    return exito({ id: String(data.id) });
  }

  async actualizar(id: string, datos: DatosDeEjercicio): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ejercicio no encontrado.');
    const { data, error } = await this.supabase.from('exercises').update(aFila(datos)).eq('id', id).select('id');
    if (error) return falloDe('actualizar', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede editar este ejercicio.');
  }

  async cambiarEstado(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ejercicio no encontrado.');
    const { data, error } = await this.supabase.from('exercises').update({ is_active: activo }).eq('id', id).select('id');
    if (error) return falloDe('cambiarEstado', error);
    return data && data.length > 0 ? exito(null) : fallo('Tu cuenta no puede cambiar este ejercicio.');
  }

  async medios(exerciseId: string): Promise<readonly MedioDeEjercicio[]> {
    if (!PATRON_UUID.test(exerciseId)) return [];
    const { data } = await this.supabase
      .from('exercise_media')
      .select('id, exercise_id, kind, storage_path, poster_path, external_provider, external_id, mime_type, size_bytes, poster_size_bytes, duration_seconds, sort_order')
      .eq('exercise_id', exerciseId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    return (data ?? []).map((fila) => aMedio(fila));
  }

  async uso(): Promise<UsoDeMedios | null> {
    const { data } = await this.supabase.from('v_uso_de_medios').select('cuota_bytes, usado_bytes, archivos, enlaces').maybeSingle();
    if (!data) return null;
    return {
      cuotaBytes: numero(data.cuota_bytes),
      usadoBytes: numero(data.usado_bytes),
      archivos: numero(data.archivos),
      enlaces: numero(data.enlaces),
    };
  }

  async prepararSubida(
    tenantId: string,
    exerciseId: string,
    mime: string,
    posterMime: string | null,
  ): Promise<ResultadoDeOperacion<SubidaPreparada>> {
    if (!PATRON_UUID.test(tenantId) || !PATRON_UUID.test(exerciseId)) return fallo('Ejercicio no encontrado.');
    const nombre = crypto.randomUUID();
    const path = rutaDeMedio(tenantId, exerciseId, nombre, mime);

    // La URL de subida solo se emite si RLS de Storage deja insertar en esa
    // ruta (exercises.manage en ESTE gimnasio). No se puede reutilizar para otra ruta.
    const { data, error } = await this.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error('[ejercicios] createSignedUploadUrl', error?.message ?? '');
      return fallo('No se pudo preparar la subida. Revisa tus permisos y vuelve a intentarlo.');
    }

    let posterPath: string | null = null;
    let posterUrl: string | null = null;
    if (posterMime) {
      posterPath = rutaDeMedio(tenantId, exerciseId, nombre, posterMime, true);
      const poster = await this.supabase.storage.from(BUCKET).createSignedUploadUrl(posterPath);
      if (poster.error || !poster.data) {
        console.error('[ejercicios] createSignedUploadUrl poster', poster.error?.message ?? '');
        return fallo('No se pudo preparar la subida de la miniatura.');
      }
      posterUrl = poster.data.signedUrl;
    }

    return exito({ path, url: data.signedUrl, posterPath, posterUrl });
  }

  async cabecera(path: string): Promise<Uint8Array | null> {
    const { data } = await this.supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (!data?.signedUrl) return null;
    try {
      const respuesta = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-31' }, cache: 'no-store' });
      if (!respuesta.ok) return null;
      const bytes = new Uint8Array(await respuesta.arrayBuffer());
      return bytes.slice(0, 32);
    } catch {
      return null;
    }
  }

  async registrarArchivo(tenantId: string, exerciseId: string, medio: MedioSubido): Promise<ResultadoDeOperacion<null>> {
    const { error } = await this.supabase.from('exercise_media').insert({
      tenant_id: tenantId,
      exercise_id: exerciseId,
      kind: medio.kind,
      storage_path: medio.storagePath,
      poster_path: medio.posterPath,
      duration_seconds: medio.durationSeconds,
    });
    return error ? falloDe('registrarArchivo', error) : exito(null);
  }

  async registrarEnlace(tenantId: string, exerciseId: string, provider: ProveedorDeVideo, externalId: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(exerciseId)) return fallo('Ejercicio no encontrado.');
    const { error } = await this.supabase.from('exercise_media').insert({
      tenant_id: tenantId,
      exercise_id: exerciseId,
      kind: 'enlace',
      external_provider: provider,
      external_id: externalId,
    });
    return error ? falloDe('registrarEnlace', error) : exito(null);
  }

  async eliminarMedio(id: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Medio no encontrado.');
    const { data, error } = await this.supabase
      .from('exercise_media')
      .delete()
      .eq('id', id)
      .select('storage_path, poster_path');
    if (error) return falloDe('eliminarMedio', error);
    if (!data || data.length === 0) return fallo('Tu cuenta no puede borrar este medio.');

    // La fila ya no existe: sus archivos se borran ahora. Si el borrado de
    // Storage fallara, quedan como «sin uso» y se liberan desde el panel.
    const rutas = data.flatMap((fila) => [texto(fila.storage_path), texto(fila.poster_path)]).filter((r): r is string => r !== null);
    await this.descartarArchivos(rutas);
    return exito(null);
  }

  async descartarArchivos(paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.supabase.storage.from(BUCKET).remove([...paths]);
    if (error) console.error('[ejercicios] remove', error.message);
  }

  async urlsFirmadas(paths: readonly string[], segundos: number): Promise<ReadonlyMap<string, string>> {
    const unicas = [...new Set(paths)];
    if (unicas.length === 0) return new Map();
    const { data } = await this.supabase.storage.from(BUCKET).createSignedUrls(unicas, segundos);
    const mapa = new Map<string, string>();
    for (const fila of data ?? []) {
      if (fila.path && fila.signedUrl && !fila.error) mapa.set(fila.path, fila.signedUrl);
    }
    return mapa;
  }

  async archivosSinUso(tenantId: string): Promise<{ readonly paths: readonly string[]; readonly bytes: number }> {
    if (!PATRON_UUID.test(tenantId)) return { paths: [], bytes: 0 };
    const almacen = this.supabase.storage.from(BUCKET);

    const { data: carpetas } = await almacen.list(tenantId, { limit: 1000 });
    const { data: usados } = await this.supabase.from('exercise_media').select('storage_path, poster_path');
    const referenciados = new Set((usados ?? []).flatMap((f) => [texto(f.storage_path), texto(f.poster_path)]).filter(Boolean));

    const haceUnaHora = Date.now() - 3_600_000;
    const paths: string[] = [];
    let bytes = 0;
    for (const carpeta of carpetas ?? []) {
      // En Storage las «carpetas» vienen sin id.
      if (carpeta.id !== null || !PATRON_UUID.test(carpeta.name)) continue;
      const { data: archivos } = await almacen.list(`${tenantId}/${carpeta.name}`, { limit: 1000 });
      for (const archivo of archivos ?? []) {
        if (archivo.id === null) continue;
        const ruta = `${tenantId}/${carpeta.name}/${archivo.name}`;
        const creado = Date.parse(archivo.created_at ?? '');
        if (referenciados.has(ruta) || !(creado < haceUnaHora)) continue;
        paths.push(ruta);
        bytes += numero((archivo.metadata as Record<string, unknown> | null)?.size);
      }
    }
    return { paths, bytes };
  }
}
