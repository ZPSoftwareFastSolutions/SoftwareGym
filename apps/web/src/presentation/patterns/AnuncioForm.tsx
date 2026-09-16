'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Alta y edición de un anuncio (V4.1).
 *
 * El formulario vive dentro de un modal («Nuevo anuncio», «Editar») para que la
 * pantalla siga siendo la LISTA: quien entra aquí viene a ver qué hay publicado,
 * no a escribir. La validación es la del dominio, repetida en la acción y otra
 * vez en la base con sus CHECK.
 *
 * La imagen no se comprime en el navegador como en ejercicios: un panfleto se
 * sube ya exportado y reducirlo emborronaría el texto que lleva dentro. El tope
 * son 3 MB y lo aplica el bucket.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { guardarAnuncio } from '@/app/[tenant]/panel/anuncios/actions';
import {
  LARGO_MAXIMO_DE_RESUMEN,
  NOMBRE_DE_TIPO_DE_ANUNCIO,
  TIPOS_DE_ANUNCIO,
  type Anuncio,
} from '@core/domain/operations/announcements';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon } from '../icons/Icon';

interface AnuncioFormProps {
  readonly slug: string;
  /** Sin anuncio, es un alta. */
  readonly anuncio?: Anuncio;
}

function Enviar({ etiqueta }: { readonly etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : 'check'} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Guardando…' : etiqueta}
    </button>
  );
}

/** `datetime-local` quiere «AAAA-MM-DDTHH:MM» en hora local, sin zona ni segundos. */
function paraCampoDeFecha(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const desfase = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}

export function AnuncioForm({ slug, anuncio }: AnuncioFormProps) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarAnuncio, {});
  const errores = estado.errores ?? {};
  const previos = estado.valores ?? {};

  // El contador del resumen se ve mientras se escribe: el límite lo impone la
  // base, y enterarse al guardar obliga a recortar a ciegas.
  const [resumen, setResumen] = useState(previos.summary ?? anuncio?.summary ?? '');

  const valor = (campo: string, original: string | number | null | undefined): string =>
    previos[campo] ?? (original === null || original === undefined ? '' : String(original));

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {anuncio && <input type="hidden" name="anuncioId" value={anuncio.id} />}

      <Campo id="an-title" etiqueta="Título" obligatorio error={errores.title}>
        <input name="title" defaultValue={valor('title', anuncio?.title)} maxLength={160} required className={CLASE_DE_CONTROL} />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="an-kind" etiqueta="De qué es" error={errores.kind}>
          <select name="kind" defaultValue={valor('kind', anuncio?.kind) || 'novedad'} className={CLASE_DE_CONTROL}>
            {TIPOS_DE_ANUNCIO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {NOMBRE_DE_TIPO_DE_ANUNCIO[tipo]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          id="an-sortOrder"
          etiqueta="Prioridad"
          error={errores.sortOrder}
          ayuda="Mayor aparece primero en el carrusel."
        >
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={valor('sortOrder', anuncio?.sortOrder ?? 0)}
            className={CLASE_DE_CONTROL}
          />
        </Campo>
      </div>

      <Campo
        id="an-summary"
        etiqueta="Resumen"
        error={errores.summary}
        ayuda={`Lo que se lee en la tarjeta. ${resumen.length}/${LARGO_MAXIMO_DE_RESUMEN}`}
      >
        <textarea
          name="summary"
          value={resumen}
          onChange={(evento) => setResumen(evento.target.value.slice(0, LARGO_MAXIMO_DE_RESUMEN))}
          maxLength={LARGO_MAXIMO_DE_RESUMEN}
          rows={2}
          className={cn(CLASE_DE_CONTROL, 'h-auto py-3')}
        />
      </Campo>

      <Campo
        id="an-tagline"
        etiqueta="Frase destacada"
        error={errores.tagline}
        ayuda="Opcional. Una línea de impacto bajo el título, con la letra de acento de la marca."
      >
        <input name="tagline" defaultValue={valor('tagline', anuncio?.tagline)} maxLength={120} className={CLASE_DE_CONTROL} />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Campo id="an-tagsLabel" etiqueta="Rótulo de las etiquetas" error={errores.tagsLabel} ayuda="Por ejemplo: «Clases incluidas».">
          <input name="tagsLabel" defaultValue={valor('tagsLabel', anuncio?.tagsLabel)} maxLength={60} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="an-tags" etiqueta="Etiquetas" error={errores.tags} ayuda="Separadas por comas. Hasta 12, de 40 caracteres cada una.">
          <input name="tags" defaultValue={valor('tags', anuncio?.tags.join(', '))} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Campo id="an-footnote" etiqueta="Nota al pie" error={errores.footnote} ayuda="Opcional. Muy breve: «Cupos limitados».">
        <input name="footnote" defaultValue={valor('footnote', anuncio?.footnote)} maxLength={60} className={CLASE_DE_CONTROL} />
      </Campo>

      <Campo
        id="an-body"
        etiqueta="Contenido completo"
        error={errores.body}
        ayuda="Lo que se ve al abrir el anuncio: horarios, requisitos, precios, lo que haga falta."
      >
        <textarea
          name="body"
          defaultValue={valor('body', anuncio?.body)}
          rows={7}
          className={cn(CLASE_DE_CONTROL, 'h-auto py-3')}
        />
      </Campo>

      <Campo
        id="an-imagen"
        etiqueta={anuncio?.imagePath ? 'Reemplazar el arte' : 'Arte del anuncio'}
        ayuda={
          anuncio?.imagePath
            ? 'Ya tiene imagen. Elige otra solo si quieres cambiarla.'
            : 'JPG, PNG o WebP, hasta 3 MB. Sin imagen se dibuja una composición con los colores de la marca.'
        }
      >
        <input
          name="imagen"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={cn(CLASE_DE_CONTROL, 'file:mr-3 file:rounded file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-ink py-2.5')}
        />
      </Campo>

      <Campo
        id="an-imageAlt"
        etiqueta="Descripción de la imagen"
        ayuda="Para quien usa lector de pantalla. Qué dice o qué muestra el panfleto."
      >
        <input name="imageAlt" defaultValue={valor('imageAlt', anuncio?.imageAlt)} maxLength={200} className={CLASE_DE_CONTROL} />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="an-linkUrl" etiqueta="Enlace" error={errores.linkUrl} ayuda="Opcional. Tiene que empezar por https://">
          <input
            name="linkUrl"
            type="url"
            inputMode="url"
            defaultValue={valor('linkUrl', anuncio?.linkUrl)}
            placeholder="https://"
            className={CLASE_DE_CONTROL}
          />
        </Campo>

        <Campo id="an-linkLabel" etiqueta="Texto del botón" ayuda="Si se deja vacío dice «Saber más».">
          <input name="linkLabel" defaultValue={valor('linkLabel', anuncio?.linkLabel)} maxLength={60} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="an-publishedAt"
          etiqueta="Se publica"
          error={errores.publishedAt}
          ayuda="Déjalo como está para publicarlo ahora."
        >
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={paraCampoDeFecha(anuncio?.publishedAt ?? new Date().toISOString())}
            className={CLASE_DE_CONTROL}
          />
        </Campo>

        <Campo id="an-expiresAt" etiqueta="Deja de verse" error={errores.expiresAt} ayuda="Opcional. Vacío: hasta que lo retires.">
          <input
            name="expiresAt"
            type="datetime-local"
            defaultValue={paraCampoDeFecha(anuncio?.expiresAt ?? null)}
            className={CLASE_DE_CONTROL}
          />
        </Campo>
      </div>

      <label className="flex items-center gap-3 text-[0.9rem] text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={anuncio ? anuncio.isActive : true}
          className="h-5 w-5 rounded border-line accent-[var(--t-action)]"
        />
        Visible en la vitrina
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <Enviar etiqueta={anuncio ? 'Guardar cambios' : 'Publicar anuncio'} />
        <p aria-live="polite" className={cn('text-[0.85rem]', estado.exito ? 'text-action' : 'text-structural')}>
          {estado.exito ?? estado.mensaje ?? ''}
        </p>
      </div>
    </form>
  );
}
