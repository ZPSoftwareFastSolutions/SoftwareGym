/**
 * CAPA: Domain / Operations
 *
 * Catálogo de ejercicios y política de medios (V3.1).
 *
 * Cada gimnasio tiene SU catálogo; no hay uno global obligatorio.
 *
 * POLÍTICA DE MEDIOS (decisión con el usuario): el almacenamiento es un
 * recurso compartido y finito —el plan gratis de Supabase da 1 GB para todo
 * el proyecto—. Por eso:
 * - cada gimnasio tiene una CUOTA (en la base, la aplica la base);
 * - las imágenes se comprimen en el navegador a WebP antes de subir;
 * - el vídeo subido es un CLIP corto; lo largo va como enlace de YouTube/Vimeo;
 * - cada vídeo lleva una miniatura liviana para que las listas no descarguen
 *   vídeos;
 * - borrar o reemplazar un medio borra su archivo.
 *
 * Los mismos límites están en el disparador `app.preparar_medio_de_ejercicio`
 * y en el bucket `ejercicios`: aquí se adelantan para explicar en la pantalla.
 */

const KB = 1024;
const MB = 1024 * KB;

export const GRUPOS_MUSCULARES = [
  { code: 'pecho', nombre: 'Pecho' },
  { code: 'espalda', nombre: 'Espalda' },
  { code: 'hombros', nombre: 'Hombros' },
  { code: 'biceps', nombre: 'Bíceps' },
  { code: 'triceps', nombre: 'Tríceps' },
  { code: 'antebrazos', nombre: 'Antebrazos' },
  { code: 'core', nombre: 'Core y abdomen' },
  { code: 'gluteos', nombre: 'Glúteos' },
  { code: 'cuadriceps', nombre: 'Cuádriceps' },
  { code: 'isquiotibiales', nombre: 'Isquiotibiales' },
  { code: 'pantorrillas', nombre: 'Pantorrillas' },
  { code: 'cuerpo_completo', nombre: 'Cuerpo completo' },
  { code: 'cardio', nombre: 'Cardio' },
  { code: 'movilidad', nombre: 'Movilidad' },
] as const;

export type GrupoMuscular = (typeof GRUPOS_MUSCULARES)[number]['code'];

export function esGrupoMuscular(valor: unknown): valor is GrupoMuscular {
  return GRUPOS_MUSCULARES.some((g) => g.code === valor);
}

export function nombreDeGrupoMuscular(codigo: string): string {
  return GRUPOS_MUSCULARES.find((g) => g.code === codigo)?.nombre ?? codigo;
}

export type TipoDeMedio = 'imagen' | 'gif' | 'video' | 'enlace';
export type TipoDeArchivo = Exclude<TipoDeMedio, 'enlace'>;
export type ProveedorDeVideo = 'youtube' | 'vimeo';

export const NOMBRE_DE_TIPO_DE_MEDIO: Readonly<Record<TipoDeMedio, string>> = {
  imagen: 'Imagen',
  gif: 'GIF',
  video: 'Clip de vídeo',
  enlace: 'Vídeo enlazado',
};

export interface Ejercicio {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly muscleGroup: GrupoMuscular;
  readonly equipment: string | null;
  readonly instructions: string | null;
  readonly isActive: boolean;
  readonly updatedAt: string | null;
}

export interface MedioDeEjercicio {
  readonly id: string;
  readonly exerciseId: string;
  readonly kind: TipoDeMedio;
  readonly storagePath: string | null;
  readonly posterPath: string | null;
  readonly provider: ProveedorDeVideo | null;
  readonly externalId: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number;
  readonly posterSizeBytes: number;
  readonly durationSeconds: number | null;
  readonly sortOrder: number;
}

export interface UsoDeMedios {
  readonly cuotaBytes: number;
  readonly usadoBytes: number;
  readonly archivos: number;
  readonly enlaces: number;
}

export const LIMITES_DE_MEDIOS = {
  imagen: 1 * MB,
  gif: 3 * MB,
  video: 15 * MB,
  poster: 300 * KB,
  /** Segundos. Un clip muestra la técnica; lo largo va como enlace. */
  duracionMaximaDeVideo: 60,
  porEjercicio: 6,
  /** Lado mayor al que se reduce una imagen en el navegador. */
  ladoMaximoDeImagen: 1280,
  ladoMaximoDePoster: 640,
} as const;

export const TIPOS_DE_ARCHIVO: Readonly<Record<TipoDeArchivo, readonly string[]>> = {
  imagen: ['image/webp', 'image/jpeg', 'image/png'],
  gif: ['image/gif'],
  video: ['video/mp4', 'video/webm'],
};

export const TIPOS_DE_POSTER: readonly string[] = ['image/webp', 'image/jpeg'];

/** Tipo de archivo que corresponde a un MIME, o `null` si no se admite. */
export function tipoDeArchivoPorMime(mime: string): TipoDeArchivo | null {
  const tipo = (Object.keys(TIPOS_DE_ARCHIVO) as TipoDeArchivo[]).find((k) => TIPOS_DE_ARCHIVO[k].includes(mime));
  return tipo ?? null;
}

export function extensionDeMedio(mime: string): string {
  const mapa: Readonly<Record<string, string>> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };
  return mapa[mime] ?? 'bin';
}

/**
 * MIME real de un archivo, leído de sus primeros bytes (bastan 16).
 *
 * El `Content-Type` lo escribe quien sube; los bytes mágicos no se falsifican
 * sin dejar de ser ese formato. Aunque estos medios se sirven desde el dominio
 * de Storage (no el nuestro), un HTML con extensión .webp no tiene por qué
 * quedar guardado en el catálogo.
 */
export function detectarTipoDeMedio(bytes: Uint8Array): string | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png';
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38) return 'image/gif';
  // RIFF....WEBP
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) {
    return 'image/webp';
  }
  // ....ftyp (MP4 / ISO BMFF)
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) return 'video/mp4';
  // EBML (WebM)
  if (b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3) return 'video/webm';
  return null;
}

export type MotivoDeArchivoRechazado = 'tipo_no_permitido' | 'demasiado_grande' | 'video_demasiado_largo' | 'vacio';

export function validarArchivoDeMedio(archivo: {
  readonly mime: string;
  readonly size: number;
  readonly durationSeconds?: number | null;
}): { readonly ok: true; readonly kind: TipoDeArchivo } | { readonly ok: false; readonly motivo: MotivoDeArchivoRechazado } {
  const kind = tipoDeArchivoPorMime(archivo.mime);
  if (!kind) return { ok: false, motivo: 'tipo_no_permitido' };
  if (!(archivo.size > 0)) return { ok: false, motivo: 'vacio' };
  if (archivo.size > LIMITES_DE_MEDIOS[kind]) return { ok: false, motivo: 'demasiado_grande' };
  if (kind === 'video') {
    const duracion = archivo.durationSeconds ?? null;
    if (duracion === null || !(duracion > 0) || duracion > LIMITES_DE_MEDIOS.duracionMaximaDeVideo) {
      return { ok: false, motivo: 'video_demasiado_largo' };
    }
  }
  return { ok: true, kind };
}

export function mensajeDeArchivoRechazado(motivo: MotivoDeArchivoRechazado, kind?: TipoDeArchivo | null): string {
  switch (motivo) {
    case 'tipo_no_permitido':
      return 'Usa una imagen (JPG, PNG, WebP), un GIF o un clip MP4/WebM.';
    case 'vacio':
      return 'El archivo está vacío.';
    case 'video_demasiado_largo':
      return `El clip no puede pasar de ${LIMITES_DE_MEDIOS.duracionMaximaDeVideo} segundos. Para vídeos largos, pega un enlace de YouTube o Vimeo.`;
    case 'demasiado_grande':
      return kind
        ? `Ese ${NOMBRE_DE_TIPO_DE_MEDIO[kind].toLowerCase()} pesa más de ${formatoDeBytes(LIMITES_DE_MEDIOS[kind])}.`
        : 'El archivo pesa demasiado.';
  }
}

/**
 * Enlace de vídeo de YouTube o Vimeo → proveedor e id.
 * Solo se guarda el id: la URL de inserción la arma la aplicación, así un
 * enlace pegado nunca decide qué dominio se incrusta.
 */
export function parsearEnlaceDeVideo(texto: string): { readonly provider: ProveedorDeVideo; readonly id: string } | null {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const partes = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    const id = partes[0] ?? '';
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: 'youtube', id } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = partes[0] === 'watch' ? (url.searchParams.get('v') ?? '') : ['shorts', 'embed', 'live'].includes(partes[0] ?? '') ? (partes[1] ?? '') : '';
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: 'youtube', id } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = partes.find((p) => /^\d{6,12}$/.test(p)) ?? '';
    return id ? { provider: 'vimeo', id } : null;
  }
  return null;
}

export function urlDeInsercion(provider: ProveedorDeVideo, id: string): string {
  return provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`
    : `https://player.vimeo.com/video/${encodeURIComponent(id)}?dnt=1`;
}

export function urlDeVideoExterno(provider: ProveedorDeVideo, id: string): string {
  return provider === 'youtube' ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : `https://vimeo.com/${encodeURIComponent(id)}`;
}

export type NivelDeCuota = 'normal' | 'alto' | 'lleno';

export function evaluarCuota(uso: { readonly usadoBytes: number; readonly cuotaBytes: number }, nuevoBytes = 0): {
  readonly permitido: boolean;
  readonly restanteBytes: number;
  /** 0–100, redondeado. */
  readonly porcentaje: number;
  readonly nivel: NivelDeCuota;
} {
  const cuota = Math.max(0, uso.cuotaBytes);
  const usado = Math.max(0, uso.usadoBytes);
  const restanteBytes = Math.max(0, cuota - usado);
  const porcentaje = cuota === 0 ? 100 : Math.min(100, Math.round((usado / cuota) * 100));
  return {
    permitido: usado + Math.max(0, nuevoBytes) <= cuota,
    restanteBytes,
    porcentaje,
    nivel: porcentaje >= 100 ? 'lleno' : porcentaje >= 80 ? 'alto' : 'normal',
  };
}

/** «850 KB», «12,4 MB». */
export function formatoDeBytes(bytes: number): string {
  if (bytes < KB) return `${Math.max(0, Math.round(bytes))} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
  if (bytes < 1024 * MB) return `${(bytes / MB).toLocaleString('es-BO', { maximumFractionDigits: 1 })} MB`;
  return `${(bytes / (1024 * MB)).toLocaleString('es-BO', { maximumFractionDigits: 2 })} GB`;
}

/**
 * Ruta del archivo en el bucket: `{gimnasio}/{ejercicio}/{uuid}.{ext}`.
 * El nombre lo decide el servidor; el nombre original nunca llega a la ruta.
 */
export function rutaDeMedio(tenantId: string, exerciseId: string, uuid: string, mime: string, poster = false): string {
  return `${tenantId}/${exerciseId}/${uuid}${poster ? '-poster' : ''}.${extensionDeMedio(mime)}`;
}

// ------------------------------------------------------------------ ejercicio

export interface FormularioDeEjercicio {
  readonly name: string;
  readonly muscleGroup: string;
  readonly equipment: string;
  readonly description: string;
  readonly instructions: string;
}

export interface DatosDeEjercicio {
  readonly name: string;
  readonly muscleGroup: GrupoMuscular;
  readonly equipment: string | null;
  readonly description: string | null;
  readonly instructions: string | null;
}

function limpio(valor: string): string | null {
  const recortado = valor.trim();
  return recortado === '' ? null : recortado;
}

export function validarEjercicio(
  formulario: FormularioDeEjercicio,
): { readonly ok: true; readonly datos: DatosDeEjercicio } | { readonly ok: false; readonly errores: Readonly<Record<string, string>> } {
  const errores: Record<string, string> = {};
  const name = formulario.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) errores.name = 'El nombre debe tener entre 2 y 80 caracteres.';

  const muscleGroup = formulario.muscleGroup;
  if (!esGrupoMuscular(muscleGroup)) errores.muscleGroup = 'Elige el grupo muscular.';

  const equipment = limpio(formulario.equipment);
  if (equipment && equipment.length > 80) errores.equipment = 'Hasta 80 caracteres.';
  const description = limpio(formulario.description);
  if (description && description.length > 400) errores.description = 'Hasta 400 caracteres.';
  const instructions = limpio(formulario.instructions);
  if (instructions && instructions.length > 2000) errores.instructions = 'Hasta 2000 caracteres.';

  if (Object.keys(errores).length > 0 || !esGrupoMuscular(muscleGroup)) return { ok: false, errores };
  return { ok: true, datos: { name, muscleGroup, equipment, description, instructions } };
}

export function mensajeDeErrorDeEjercicios(codigo: string): string {
  const c = codigo;
  if (c.includes('cuota_de_medios_excedida')) return 'No queda espacio en la cuota de medios del gimnasio. Borra medios que no uses o usa enlaces de vídeo.';
  if (c.includes('demasiados_medios')) return `Un ejercicio admite hasta ${LIMITES_DE_MEDIOS.porEjercicio} medios.`;
  if (c.includes('archivo_no_subido')) return 'El archivo no terminó de subirse. Vuelve a intentarlo.';
  if (c.includes('archivo_no_permitido')) return 'Ese archivo no cumple el tipo o el tamaño permitido.';
  if (c.includes('ruta_invalida')) return 'El archivo no pertenece a este ejercicio.';
  if (c.includes('exercises_nombre_uk') || c.includes('23505')) return 'Ya hay un ejercicio con ese nombre.';
  if (c.includes('23514')) return 'Algún dato no tiene el formato esperado.';
  if (c.includes('sin_permiso') || c.includes('42501')) return 'Tu cuenta no puede administrar ejercicios.';
  return 'No se pudo guardar. Vuelve a intentarlo.';
}
