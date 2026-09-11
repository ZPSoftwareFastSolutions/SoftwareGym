'use client';

/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Formularios del catálogo de ejercicios (V3.1): datos del ejercicio, subida de
 * medios y vídeo enlazado.
 *
 * GESTIÓN DEL TAMAÑO EN EL NAVEGADOR, antes de gastar cuota:
 * - una imagen se reduce a 1280 px y se recodifica a WebP (JPEG si el
 *   navegador no codifica WebP): una foto de 4 MB queda en ~150 KB;
 * - un GIF se sube tal cual (recodificarlo perdería la animación) hasta 3 MB;
 * - un clip se valida por duración (≤ 60 s) y peso (≤ 15 MB) y se le saca una
 *   miniatura WebP, para que las listas no descarguen el vídeo.
 *
 * Nada de esto es la barrera: el servidor verifica los bytes reales y la base
 * vuelve a comprobar tipo, tamaño y cuota.
 */

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import {
  agregarEnlaceDeVideo,
  confirmarSubidaDeMedio,
  descartarSubidaDeMedio,
  guardarEjercicio,
  prepararSubidaDeMedio,
} from '@/app/[tenant]/panel/ejercicios/actions';
import {
  formatoDeBytes,
  GRUPOS_MUSCULARES,
  LIMITES_DE_MEDIOS,
  mensajeDeArchivoRechazado,
  tipoDeArchivoPorMime,
  validarArchivoDeMedio,
  type Ejercicio,
  type TipoDeArchivo,
} from '@core/domain/operations/exercises';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon, type AnyIconKey } from '../icons/Icon';

function Enviar({ texto, icono = 'check' }: { readonly texto: string; readonly icono?: AnyIconKey }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : icono} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Guardando…' : texto}
    </button>
  );
}

function Aviso({ exito, mensaje }: { readonly exito?: string; readonly mensaje?: string }) {
  if (!exito && !mensaje) return null;
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.88rem] text-ink',
        exito ? 'border-action/40 bg-action/10' : 'border-structural/50 bg-structural/10',
      )}
    >
      <Icon name={exito ? 'check' : 'alert'} size={17} className={cn('mt-0.5 shrink-0', exito ? 'text-action' : 'text-structural')} />
      {exito ?? mensaje}
    </p>
  );
}

// ------------------------------------------------------------------ ejercicio

export function EjercicioForm({ slug, ejercicio }: { readonly slug: string; readonly ejercicio?: Ejercicio }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarEjercicio, {});
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {
    name: ejercicio?.name ?? '',
    muscleGroup: ejercicio?.muscleGroup ?? '',
    equipment: ejercicio?.equipment ?? '',
    description: ejercicio?.description ?? '',
    instructions: ejercicio?.instructions ?? '',
  };

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {ejercicio && <input type="hidden" name="exerciseId" value={ejercicio.id} />}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Campo id="ejercicio-nombre" etiqueta="Nombre" error={errores.name} obligatorio>
          <input name="name" defaultValue={valores.name} required minLength={2} maxLength={80} autoComplete="off" className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="ejercicio-grupo" etiqueta="Grupo muscular" error={errores.muscleGroup} obligatorio>
          <select name="muscleGroup" defaultValue={valores.muscleGroup} required className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Elige
            </option>
            {GRUPOS_MUSCULARES.map((g) => (
              <option key={g.code} value={g.code}>
                {g.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo id="ejercicio-equipo" etiqueta="Equipo" error={errores.equipment} ayuda="Ej.: Barra y banco, Mancuernas, Sin equipo.">
        <input name="equipment" defaultValue={valores.equipment} maxLength={80} className={CLASE_DE_CONTROL} />
      </Campo>

      <Campo id="ejercicio-descripcion" etiqueta="Descripción" error={errores.description} ayuda="Una línea: para qué sirve.">
        <input name="description" defaultValue={valores.description} maxLength={400} className={CLASE_DE_CONTROL} />
      </Campo>

      <Campo id="ejercicio-instrucciones" etiqueta="Instrucciones" error={errores.instructions} ayuda="Cómo se ejecuta: posición, movimiento, errores comunes.">
        <textarea name="instructions" defaultValue={valores.instructions} maxLength={2000} rows={5} className={cn(CLASE_DE_CONTROL, 'h-auto min-h-32 resize-y py-3')} />
      </Campo>

      <Aviso exito={estado.exito} mensaje={estado.mensaje} />
      <div className="flex justify-end">
        <Enviar texto={ejercicio ? 'Guardar cambios' : 'Crear ejercicio'} />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ preparación de archivos

interface ArchivoListo {
  readonly kind: TipoDeArchivo;
  readonly blob: Blob;
  readonly mime: string;
  readonly duracion: number | null;
  readonly poster: Blob | null;
  readonly vistaPrevia: string;
  readonly original: number;
}

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad));
}

/** WebP si el navegador sabe codificarlo; si no, JPEG. Baja la calidad hasta caber. */
async function codificar(lienzo: HTMLCanvasElement, maximo: number, calidadInicial: number): Promise<Blob | null> {
  for (const tipo of ['image/webp', 'image/jpeg']) {
    for (let calidad = calidadInicial; calidad >= 0.45; calidad -= 0.1) {
      const blob = await aBlob(lienzo, tipo, calidad);
      // Safari antiguo devuelve PNG cuando no codifica WebP: se descarta y se prueba JPEG.
      if (!blob || blob.type !== tipo) break;
      if (blob.size <= maximo) return blob;
    }
  }
  return null;
}

function lienzoCon(ancho: number, alto: number, lado: number, dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  const w = Math.max(1, Math.round(ancho * escala));
  const h = Math.max(1, Math.round(alto * escala));
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('lienzo');
  dibujar(ctx, w, h);
  return lienzo;
}

async function prepararImagen(archivo: File): Promise<Blob> {
  const mapa = await createImageBitmap(archivo);
  const lienzo = lienzoCon(mapa.width, mapa.height, LIMITES_DE_MEDIOS.ladoMaximoDeImagen, (ctx, w, h) => ctx.drawImage(mapa, 0, 0, w, h));
  mapa.close();
  const blob = await codificar(lienzo, LIMITES_DE_MEDIOS.imagen, 0.82);
  if (!blob) throw new Error(mensajeDeArchivoRechazado('demasiado_grande', 'imagen'));
  return blob;
}

/** Duración y miniatura de un clip, leídos en el navegador. */
function prepararClip(archivo: File): Promise<{ readonly duracion: number; readonly poster: Blob | null }> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    let terminado = false;
    // Algunos navegadores no disparan `seeked` con ciertos códecs: sin este
    // tope, la pantalla quedaría en «Preparando…» para siempre.
    const tope = window.setTimeout(() => {
      terminar(() => rechazar(new Error('No se pudo leer el clip. Prueba con un MP4 (H.264).')));
    }, 15_000);
    const terminar = (fn: () => void) => {
      if (terminado) return;
      terminado = true;
      window.clearTimeout(tope);
      URL.revokeObjectURL(url);
      fn();
    };
    video.onerror = () => terminar(() => rechazar(new Error('El navegador no puede leer este clip. Usa MP4 (H.264) o WebM.')));
    video.onloadedmetadata = () => {
      const duracion = video.duration;
      if (!Number.isFinite(duracion)) {
        terminar(() => rechazar(new Error('No se pudo leer la duración del clip.')));
        return;
      }
      video.currentTime = Math.min(1, duracion / 2);
    };
    video.onseeked = async () => {
      try {
        const lienzo = lienzoCon(video.videoWidth || 640, video.videoHeight || 360, LIMITES_DE_MEDIOS.ladoMaximoDePoster, (ctx, w, h) => ctx.drawImage(video, 0, 0, w, h));
        const poster = await codificar(lienzo, LIMITES_DE_MEDIOS.poster, 0.75);
        const duracion = video.duration;
        terminar(() => resolver({ duracion, poster }));
      } catch {
        const duracion = video.duration;
        terminar(() => resolver({ duracion, poster: null }));
      }
    };
    video.src = url;
  });
}

/** PUT directo a la URL firmada de Storage, con progreso. */
function subir(url: string, blob: Blob, alProgreso: (p: number) => void): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', blob.type);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=31536000');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) alProgreso(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolver() : rechazar(new Error(`status ${xhr.status}`)));
    xhr.onerror = () => rechazar(new Error('red'));
    xhr.send(blob);
  });
}

// ------------------------------------------------------------------ subir medio

type Fase = 'libre' | 'procesando' | 'listo' | 'subiendo' | 'verificando';

export function SubirMedioForm({ slug, exerciseId, restanteBytes }: { readonly slug: string; readonly exerciseId: string; readonly restanteBytes: number }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [fase, setFase] = useState<Fase>('libre');
  const [listo, setListo] = useState<ArchivoListo | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    return () => {
      if (listo) URL.revokeObjectURL(listo.vistaPrevia);
    };
  }, [listo]);

  const limpiar = () => {
    setListo(null);
    setProgreso(0);
    setFase('libre');
    if (entrada.current) entrada.current.value = '';
  };

  const elegir = async (archivo: File | undefined) => {
    setError('');
    setExito('');
    if (!archivo) return;
    const tipo = tipoDeArchivoPorMime(archivo.type);
    if (!tipo) {
      setError(mensajeDeArchivoRechazado('tipo_no_permitido'));
      return;
    }
    setFase('procesando');
    try {
      let blob: Blob = archivo;
      let duracion: number | null = null;
      let poster: Blob | null = null;
      if (tipo === 'imagen') blob = await prepararImagen(archivo);
      if (tipo === 'video') ({ duracion, poster } = await prepararClip(archivo));

      const validacion = validarArchivoDeMedio({ mime: blob.type, size: blob.size, durationSeconds: duracion });
      if (!validacion.ok) throw new Error(mensajeDeArchivoRechazado(validacion.motivo, tipo));
      const total = blob.size + (poster?.size ?? 0);
      if (total > restanteBytes) throw new Error(`No queda espacio suficiente (quedan ${formatoDeBytes(restanteBytes)}). Enlaza el vídeo desde YouTube o borra medios que no uses.`);

      setListo({ kind: validacion.kind, blob, mime: blob.type, duracion, poster, vistaPrevia: URL.createObjectURL(poster ?? blob), original: archivo.size });
      setFase('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar el archivo.');
      limpiar();
    }
  };

  const enviar = async () => {
    if (!listo) return;
    setError('');
    setFase('subiendo');
    const base = new FormData();
    base.set('tenantSlug', slug);
    base.set('exerciseId', exerciseId);

    const pedido = new FormData();
    base.forEach((v, k) => pedido.set(k, v));
    pedido.set('mime', listo.mime);
    pedido.set('size', String(listo.blob.size));
    if (listo.duracion !== null) pedido.set('durationSeconds', String(listo.duracion));
    if (listo.poster) {
      pedido.set('posterMime', listo.poster.type);
      pedido.set('posterSize', String(listo.poster.size));
    }

    const preparada = await prepararSubidaDeMedio(pedido);
    if (!preparada.ok) {
      setError(preparada.mensaje);
      setFase('listo');
      return;
    }

    const rutas = new FormData();
    base.forEach((v, k) => rutas.set(k, v));
    rutas.set('path', preparada.path);
    if (preparada.posterPath) rutas.set('posterPath', preparada.posterPath);

    try {
      await subir(preparada.url, listo.blob, setProgreso);
      if (listo.poster && preparada.posterUrl) await subir(preparada.posterUrl, listo.poster, () => undefined);
    } catch {
      await descartarSubidaDeMedio(rutas);
      setError('La subida se cortó. Revisa la conexión y vuelve a intentarlo.');
      setFase('listo');
      return;
    }

    setFase('verificando');
    if (listo.duracion !== null) rutas.set('durationSeconds', String(listo.duracion));
    const confirmada = await confirmarSubidaDeMedio(rutas);
    if (!confirmada.ok) {
      setError(confirmada.mensaje);
      setFase('listo');
      return;
    }
    setExito(confirmada.mensaje);
    limpiar();
    router.refresh();
  };

  const ocupado = fase === 'procesando' || fase === 'subiendo' || fase === 'verificando';

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={`medio-${exerciseId}`}
        className={cn(
          'flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--t-radius-md)] border-2 border-dashed border-line px-4 py-5 text-center transition-colors hover:border-action',
          ocupado && 'pointer-events-none opacity-60',
        )}
      >
        <Icon name="upload" size={24} className="text-action" />
        <span className="text-[0.9rem] font-semibold text-ink">Elegir imagen, GIF o clip</span>
        <span className="text-[0.78rem] text-muted">
          Imagen se comprime sola · GIF hasta {formatoDeBytes(LIMITES_DE_MEDIOS.gif)} · clip MP4/WebM hasta {formatoDeBytes(LIMITES_DE_MEDIOS.video)} y {LIMITES_DE_MEDIOS.duracionMaximaDeVideo} s
        </span>
        <input
          ref={entrada}
          id={`medio-${exerciseId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="sr-only"
          onChange={(e) => void elegir(e.target.files?.[0])}
          disabled={ocupado}
        />
      </label>

      {fase === 'procesando' && <p className="text-[0.86rem] text-muted">Preparando el archivo…</p>}

      {listo && (
        <div className="flex flex-wrap items-center gap-4 rounded-[var(--t-radius-md)] border border-line p-3">
          <img src={listo.vistaPrevia} alt="" className="h-20 w-28 rounded object-cover" />
          <div className="min-w-0 flex-1 text-[0.84rem]">
            <p className="font-semibold text-ink">
              {listo.kind === 'video' ? `Clip de ${Math.round(listo.duracion ?? 0)} s` : listo.kind === 'gif' ? 'GIF animado' : 'Imagen'}
            </p>
            <p className="text-muted">
              {formatoDeBytes(listo.blob.size + (listo.poster?.size ?? 0))}
              {listo.kind === 'imagen' && listo.original > listo.blob.size && ` (era ${formatoDeBytes(listo.original)})`}
            </p>
            {fase === 'subiendo' && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de la subida">
                <div className="h-full bg-action transition-[width]" style={{ width: `${Math.round(progreso * 100)}%` }} />
              </div>
            )}
            {fase === 'verificando' && <p className="mt-1 text-muted">Verificando el archivo…</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={ocupado}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-4 text-[0.86rem] font-semibold text-on-action hover:bg-action-strong disabled:opacity-50"
            >
              <Icon name={ocupado ? 'refresh' : 'upload'} size={16} className={cn(ocupado && 'animate-spin')} />
              {fase === 'subiendo' ? `${Math.round(progreso * 100)} %` : 'Subir'}
            </button>
            <button type="button" onClick={limpiar} disabled={ocupado} className="h-11 px-3 text-[0.86rem] text-muted hover:text-ink disabled:opacity-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Aviso exito={exito} mensaje={error} />
    </div>
  );
}

// ------------------------------------------------------------------ enlace

export function EnlaceDeVideoForm({ slug, exerciseId }: { readonly slug: string; readonly exerciseId: string }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(agregarEnlaceDeVideo, {});
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (estado.exito) setVersion((v) => v + 1);
  }, [estado.exito]);

  return (
    <form key={version} action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <Campo id={`enlace-${exerciseId}`} etiqueta="Vídeo de YouTube o Vimeo" error={estado.errores?.url} ayuda="Para explicaciones largas. No ocupa espacio del gimnasio.">
        <input name="url" type="url" required defaultValue={estado.valores?.url ?? ''} maxLength={300} placeholder="https://www.youtube.com/watch?v=…" className={CLASE_DE_CONTROL} />
      </Campo>
      <Aviso exito={estado.exito} mensaje={estado.mensaje} />
      <div>
        <Enviar texto="Enlazar vídeo" icono="plus" />
      </div>
    </form>
  );
}
