/**
 * CAPA: Presentation / UI (átomo)
 *
 * Composición visual generativa que ocupa el lugar de una fotografía.
 *
 * DECISIÓN DE PRODUCTO: en V1 ningún gimnasio ha entregado todavía su material
 * fotográfico. Las alternativas eran (a) fotos de stock que el cliente vería y
 * sabría que no son suyas, o (b) marcos vacíos. Ambas restan en una demo.
 *
 * Esta pieza dibuja una composición determinista a partir de una semilla y de
 * los colores del tenant: se ve intencional, se adapta a cualquier marca, no
 * hace una sola petición de red y nunca muestra una imagen rota.
 *
 * Cuando llegue la fotografía real basta con rellenar `GalleryItem.src`: el
 * componente cede el sitio a la imagen sin cambiar el layout ni el aspect
 * ratio, así que no introduce salto de layout (CLS).
 */

import { cn } from '@/lib/cn';
import { Icon, type AnyIconKey } from '../icons/Icon';

interface ArtFrameProps {
  readonly seed: number;
  /** Fotografía real. Si viene, sustituye a la composición generativa. */
  readonly src?: string;
  readonly alt?: string;
  readonly icon?: AnyIconKey;
  readonly ratio?: string;
  readonly label?: string;
  readonly className?: string;
}

/** PRNG determinista: la misma semilla produce siempre la misma composición. */
function pseudoRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function ArtFrame({
  seed,
  src,
  alt = '',
  icon,
  ratio = '4 / 3',
  label,
  className,
}: ArtFrameProps) {
  const angle = Math.round(pseudoRandom(seed, 1) * 140 + 110);
  const cx = Math.round(pseudoRandom(seed, 2) * 60 + 20);
  const cy = Math.round(pseudoRandom(seed, 3) * 50 + 15);
  const bars = 5 + Math.round(pseudoRandom(seed, 4) * 4);
  const skew = pseudoRandom(seed, 5) * 14 - 7;

  return (
    <figure
      className={cn(
        'relative overflow-hidden bg-raised border border-line',
        'rounded-[var(--t-radius-lg)]',
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- fotografía del
        // cliente servida desde /public; no requiere el optimizador remoto.
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${angle}deg,
                color-mix(in srgb, var(--t-structural-deep) 85%, transparent) 0%,
                color-mix(in srgb, var(--t-card) 92%, transparent) 55%,
                color-mix(in srgb, var(--t-structural) 60%, transparent) 100%)`,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at ${cx}% ${cy}%,
                rgb(var(--t-action-rgb) / 0.28) 0%, transparent 58%)`,
            }}
          />

          {/* Trama diagonal: da textura y lectura de "material" sin imagen. */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full opacity-[0.16]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {Array.from({ length: bars }, (_, i) => {
              const x = (i + 0.5) * (100 / bars);
              return (
                <line
                  key={i}
                  x1={x + skew}
                  y1={-10}
                  x2={x - skew}
                  y2={110}
                  stroke="currentColor"
                  strokeWidth={0.5 + pseudoRandom(seed, i + 10) * 1.4}
                  className="text-ink"
                />
              );
            })}
          </svg>

          <div aria-hidden="true" className="bg-noise" />

          {icon && (
            <div
              aria-hidden="true"
              className="absolute inset-0 grid place-items-center text-ink/25"
            >
              <Icon name={icon} size={54} strokeWidth={1.1} />
            </div>
          )}
        </>
      )}

      {label && (
        <figcaption
          className={cn(
            'absolute inset-x-0 bottom-0 p-4',
            'bg-gradient-to-t from-black/70 via-black/25 to-transparent',
            'text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-white',
          )}
        >
          {label}
        </figcaption>
      )}
    </figure>
  );
}
