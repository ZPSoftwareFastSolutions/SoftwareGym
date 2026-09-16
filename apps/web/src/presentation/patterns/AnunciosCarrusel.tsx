'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Carrusel de anuncios de la vitrina y su detalle (V4.1).
 *
 * POR QUÉ CARRUSEL Y DETALLE, Y NO TODO EN LA TARJETA. Un panfleto trae más
 * texto del que cabe en una tarjeta legible. Si se vuelca entero, el carrusel
 * deja de ser un índice —cuatro cosas que están pasando— y pasa a ser un muro
 * que nadie termina de leer. La tarjeta promete; el detalle cumple.
 *
 * UN SOLO `<dialog>` PARA TODAS LAS TARJETAS (`Dialogo` controlado), como la
 * ficha de socio: con diez anuncios, diez diálogos montados son diez veces el
 * mismo marcado en una página que se sirve desde el CDN.
 *
 * DESPLAZAMIENTO. La pista es un `overflow-x` CON scroll-snap DENTRO de su
 * propia caja; la página no se desplaza en horizontal (§6 de V4). Se maneja con
 * dedo, con rueda, con los dos botones y con el teclado: cada tarjeta es un
 * botón real, así que el tabulador las recorre y el navegador las trae a la
 * vista solo.
 *
 * Es del PRODUCTO, no de un cliente: no sabe qué gimnasio lo usa.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnuncioPublico } from '@core/domain/operations/announcements';
import { NOMBRE_DE_TIPO_DE_ANUNCIO, resumenDeTarjeta, tituloConAcento } from '@core/domain/operations/announcements';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Badge } from '../ui/Badge';
import { Dialogo } from '../ui/Modal';

/**
 * V4.2 · `fila` es el índice de siempre: tarjetas de panfleto (4:5) en hilera.
 * `destacado` es para cuando los anuncios SON la portada: tarjetas más anchas,
 * arte apaisado y titular grande, de modo que el primero ocupa casi toda la
 * columna y el siguiente asoma para decir que hay más.
 */
export type PresentacionDeAnuncios = 'fila' | 'destacado';

interface AnunciosCarruselProps {
  readonly anuncios: readonly AnuncioPublico[];
  readonly presentacion?: PresentacionDeAnuncios;
}

/** Fecha legible del anuncio. Sin hora: un panfleto se fecha por día. */
function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function AnunciosCarrusel({ anuncios, presentacion = 'fila' }: AnunciosCarruselProps) {
  const destacado = presentacion === 'destacado';
  const pista = useRef<HTMLUListElement>(null);
  const [abierto, setAbierto] = useState<AnuncioPublico | null>(null);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(false);

  /**
   * Los botones se apagan en los extremos en vez de desaparecer: un control que
   * se va y vuelve mueve el resto de la fila y hace fallar el clic siguiente.
   */
  const revisarExtremos = useCallback(() => {
    const caja = pista.current;
    if (!caja) return;
    const margen = 8; // el scroll fraccionario nunca llega al píxel exacto
    setAlInicio(caja.scrollLeft <= margen);
    setAlFinal(caja.scrollLeft + caja.clientWidth >= caja.scrollWidth - margen);
  }, []);

  useEffect(() => {
    revisarExtremos();
    const caja = pista.current;
    if (!caja) return;
    // `ResizeObserver` además de `scroll`: al girar el teléfono cambia cuántas
    // tarjetas caben y con ello si ya se está al final.
    const observador = new ResizeObserver(revisarExtremos);
    observador.observe(caja);
    return () => observador.disconnect();
  }, [revisarExtremos]);

  const desplazar = (direccion: -1 | 1) => {
    const caja = pista.current;
    if (!caja) return;
    const primera = caja.querySelector('li');
    // Un ancho de tarjeta por pulsación: avanzar una pantalla entera se salta
    // anuncios sin que se note que se los saltó.
    const paso = primera ? primera.getBoundingClientRect().width + 20 : caja.clientWidth * 0.8;
    caja.scrollBy({ left: paso * direccion, behavior: 'smooth' });
  };

  if (anuncios.length === 0) return null;

  const detalle = abierto;

  return (
    <div>
      <div className="flex items-center justify-end gap-2">
        {/* Con una sola tarjeta no hay a dónde ir: los controles sobran. */}
        {anuncios.length > 1 && (
          <>
            <BotonDePista direccion="anterior" alPulsar={() => desplazar(-1)} deshabilitado={alInicio} />
            <BotonDePista direccion="siguiente" alPulsar={() => desplazar(1)} deshabilitado={alFinal} />
          </>
        )}
      </div>

      <ul
        ref={pista}
        onScroll={revisarExtremos}
        className={cn(
          'mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4',
          // Sin barra visible: la pista ya dice que hay más con el recorte de
          // la tarjeta siguiente y con los botones.
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {anuncios.map((anuncio, indice) => (
          <li
            key={anuncio.id}
            className={cn(
              'shrink-0 snap-start',
              destacado ? 'w-[88%] sm:w-[85%]' : 'w-[min(20rem,82vw)] sm:w-[22rem]',
            )}
          >
            <button
              type="button"
              onClick={() => setAbierto(anuncio)}
              className={cn(
                // `flex flex-col`: un <button> centra su contenido en vertical, y
                // como las tarjetas de la fila se igualan en alto, la más corta
                // quedaba con franjas vacías arriba y abajo del arte.
                'surface-card group flex h-full w-full flex-col overflow-hidden text-start transition-transform',
                'hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:transform-none',
              )}
            >
              <ArtFrame
                seed={indice * 31 + 7}
                {...(anuncio.imageUrl ? { src: anuncio.imageUrl } : {})}
                alt={anuncio.imageAlt ?? ''}
                icon="sparkle"
                ratio={destacado ? '16 / 10' : '4 / 5'}
                className="w-full"
              />
              {destacado ? (
                <TarjetaDestacada anuncio={anuncio} />
              ) : (
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="action">{NOMBRE_DE_TIPO_DE_ANUNCIO[anuncio.kind]}</Badge>
                    <span className="text-[0.75rem] text-muted">{fechaLegible(anuncio.publishedAt)}</span>
                  </div>
                  <h3 className="t-h3 mt-3 text-[1.05rem] leading-snug">{anuncio.title}</h3>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{resumenDeTarjeta(anuncio)}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-action">
                    Ver más
                    <Icon name="arrowRight" size={15} />
                  </span>
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dialogo
        abierto={detalle !== null}
        alCerrar={() => setAbierto(null)}
        titulo={detalle?.title ?? ''}
        {...(detalle ? { descripcion: `${NOMBRE_DE_TIPO_DE_ANUNCIO[detalle.kind]} · ${fechaLegible(detalle.publishedAt)}` } : {})}
        anchoMaximo="lg"
      >
        {detalle && (
          <div>
            {(detalle.tagline || detalle.tags.length > 0) && (
              <div className="mb-6">
                {detalle.tagline && <p className="t-script text-[1.5rem]">{detalle.tagline}</p>}
                {detalle.tags.length > 0 && <Etiquetas rotulo={detalle.tagsLabel} etiquetas={detalle.tags} />}
              </div>
            )}

            {detalle.imageUrl && (
              // El arte del panfleto a tamaño legible: es donde suele estar la
              // información (horarios, precios) que el resumen no repite.
              <img
                src={detalle.imageUrl}
                alt={detalle.imageAlt ?? ''}
                className="w-full rounded-[var(--t-radius-md)] border border-line"
              />
            )}

            {detalle.body && (
              <div className={cn('text-[0.95rem] leading-relaxed text-ink', detalle.imageUrl && 'mt-6')}>
                {/* El contenido se guarda como texto, no como marcado: se
                    respetan los saltos de línea y nada de lo que escriba el
                    gimnasio puede inyectar HTML en la página. */}
                {detalle.body.split(/\n{2,}/).map((parrafo, indice) => (
                  <p key={indice} className={cn(indice > 0 && 'mt-4', 'whitespace-pre-line')}>
                    {parrafo}
                  </p>
                ))}
              </div>
            )}

            {!detalle.body && detalle.summary && (
              <p className={cn('text-[0.95rem] leading-relaxed text-ink', detalle.imageUrl && 'mt-6')}>
                {detalle.summary}
              </p>
            )}

            {detalle.linkUrl && (
              <a
                href={detalle.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'mt-7 inline-flex min-h-11 items-center gap-2 rounded-[var(--t-radius-sm)]',
                  'bg-action px-5 text-[0.9rem] font-semibold text-on-action transition-opacity hover:opacity-90',
                )}
              >
                {detalle.linkLabel ?? 'Saber más'}
                <Icon name="arrowRight" size={16} />
              </a>
            )}
          </div>
        )}
      </Dialogo>
    </div>
  );
}

/** Lista corta de etiquetas con su rótulo. Texto plano: nada se interpreta como marcado. */
function Etiquetas({ rotulo, etiquetas }: { readonly rotulo: string | null; readonly etiquetas: readonly string[] }) {
  return (
    <div className="mt-4">
      {rotulo && <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted">{rotulo}</p>}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {etiquetas.map((etiqueta) => (
          <li
            key={etiqueta}
            className="rounded-[var(--t-radius-sm)] border border-line bg-raised px-2 py-1 text-[0.66rem] font-semibold uppercase leading-none tracking-[0.08em] text-ink"
          >
            {etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * V4.2 · Cuerpo de la tarjeta cuando los anuncios SON la portada: insignia con
 * el color de energía de la marca, título con su dato acentuado, frase de
 * impacto, etiquetas y una fila al pie con la llamada y la nota breve.
 * Todo opcional salvo título y tipo: sin los campos nuevos es la tarjeta de antes.
 */
function TarjetaDestacada({ anuncio }: { readonly anuncio: AnuncioPublico }) {
  const { base, acento } = tituloConAcento(anuncio.title);
  return (
    <div className="flex flex-1 flex-col p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="highlight">{NOMBRE_DE_TIPO_DE_ANUNCIO[anuncio.kind]}</Badge>
        <span className="text-[0.75rem] text-muted">{fechaLegible(anuncio.publishedAt)}</span>
      </div>

      {/* El separador se queda pegado al nombre (espacio duro) y el dato no se
          parte: la línea nunca empieza con «·». */}
      <h3 className="mt-4 text-[clamp(1.55rem,1.2rem+1.1vw,2.15rem)] leading-tight">
        {base}
        {acento && (
          <>
            <span aria-hidden="true" className="t-accent">{'\u00a0·'}</span>{' '}
            <span className="t-accent whitespace-nowrap">{acento}</span>
          </>
        )}
      </h3>

      {anuncio.tagline && <p className="t-script mt-2 text-[1.5rem]">{anuncio.tagline}</p>}

      <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">{resumenDeTarjeta(anuncio)}</p>

      {anuncio.tags.length > 0 && <Etiquetas rotulo={anuncio.tagsLabel} etiquetas={anuncio.tags} />}

      {/* Empuja la fila del pie al fondo: las tarjetas de la pista se igualan en alto. */}
      <div aria-hidden="true" className="min-h-5 flex-1" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="t-label inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-action">
          {anuncio.linkLabel ?? 'Ver más'}
          <Icon name="arrowRight" size={15} />
        </span>
        {anuncio.footnote && (
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{anuncio.footnote}</span>
        )}
      </div>
    </div>
  );
}

function BotonDePista({
  direccion,
  alPulsar,
  deshabilitado,
}: {
  readonly direccion: 'anterior' | 'siguiente';
  readonly alPulsar: () => void;
  readonly deshabilitado: boolean;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={deshabilitado}
      aria-label={direccion === 'anterior' ? 'Ver anuncios anteriores' : 'Ver más anuncios'}
      className={cn(
        'grid h-11 w-11 place-items-center rounded-[var(--t-radius-sm)] border border-line',
        'text-muted transition-colors hover:border-action hover:text-action',
        'disabled:cursor-default disabled:opacity-35 disabled:hover:border-line disabled:hover:text-muted',
      )}
    >
      <Icon name={direccion === 'anterior' ? 'chevronLeft' : 'chevronRight'} size={18} />
    </button>
  );
}
