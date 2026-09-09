/**
 * CAPA: Presentation / Sections
 *
 * Banda de texto en movimiento continuo.
 *
 * Se anima con `transform` (compositor, sin reflow) y el contenido se duplica
 * para que el bucle sea imperceptible. La copia está `aria-hidden`: el lector
 * de pantalla anunciaría la lista dos veces.
 *
 * Con `prefers-reduced-motion` la regla global la detiene: un movimiento
 * horizontal permanente es de lo peor para trastornos vestibulares.
 */

import { Icon } from '../icons/Icon';

interface MarqueeStripProps {
  readonly items: readonly string[];
}

export function MarqueeStrip({ items }: MarqueeStripProps) {
  if (items.length === 0) return null;

  const Row = ({ hidden }: { hidden?: boolean }) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-10 px-5"
      style={{ minWidth: '50%' }}
    >
      {items.map((item) => (
        <li key={item} className="flex items-center gap-10 whitespace-nowrap">
          <span
            className="text-[1.05rem] font-bold uppercase tracking-[0.2em] text-ink/85"
            style={{ fontFamily: 'var(--t-font-display)' }}
          >
            {item}
          </span>
          <Icon name="sparkle" size={15} className="text-action" />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      data-print="hide"
      className="relative overflow-hidden border-y border-line bg-raised py-5"
      style={{
        maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
      }}
    >
      <div className="flex w-max animate-marquee">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
