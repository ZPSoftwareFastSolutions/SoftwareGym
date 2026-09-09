/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Acordeón de preguntas frecuentes.
 *
 * Se construye sobre `<details>`/`<summary>` nativos en lugar de replicar el
 * patrón WAI-ARIA de disclosure a mano: el navegador ya aporta el rol, el
 * estado expandido anunciado, la activación por teclado y la búsqueda en
 * página (Ctrl+F encuentra el texto aunque el panel esté cerrado).
 *
 * Por eso NO es un componente cliente: cero JavaScript.
 *
 * La altura se anima con `grid-template-rows: 0fr → 1fr`, que sí es animable,
 * en lugar de `height`, que provoca reflow en cada frame.
 */

import type { FaqItem } from '@core/domain/catalog/catalog';
import { Icon } from '../icons/Icon';

interface AccordionProps {
  readonly items: readonly FaqItem[];
  /** Índice abierto por defecto. `-1` deja todos cerrados. */
  readonly defaultOpenIndex?: number;
}

export function Accordion({ items, defaultOpenIndex = 0 }: AccordionProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <details
          key={item.id}
          open={index === defaultOpenIndex}
          className="surface-card group overflow-hidden [&[open]]:border-action/40"
        >
          <summary
            className={[
              'flex cursor-pointer list-none items-center justify-between gap-5',
              'min-h-16 px-6 py-5 text-start',
              'text-[1.02rem] font-semibold text-ink',
              'transition-colors hover:text-action',
              '[&::-webkit-details-marker]:hidden',
            ].join(' ')}
          >
            {item.question}
            <span
              aria-hidden="true"
              className={[
                'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                'border border-line text-action transition-transform duration-300',
                'group-open:rotate-180 group-open:border-action/50',
              ].join(' ')}
            >
              <Icon name="arrowDown" size={15} />
            </span>
          </summary>

          <div className="grid grid-rows-[1fr] px-6 pb-6">
            <p className="t-body max-w-3xl text-[0.94rem]">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
