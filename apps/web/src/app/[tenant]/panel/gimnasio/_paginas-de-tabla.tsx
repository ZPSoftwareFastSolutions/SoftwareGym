'use client';

/**
 * CAPA: Presentation / App — pieza del tablero del gimnasio
 *
 * Una tabla corta que se hojea con `‹ ›` sin salir del minipanel (V6).
 *
 * Las páginas llegan YA DIBUJADAS por el servidor —cada una es su propia
 * tabla, con sus celdas formateadas allí—; aquí solo se decide cuál se ve. Así
 * el navegador no recibe funciones de celda (que no viajan del servidor al
 * cliente) ni formateadores, y hojear no repite ninguna consulta del tablero.
 *
 * TAMAÑO FIJO. Todas las páginas se apilan en la MISMA celda de una rejilla y
 * solo la actual es visible: la caja mide lo que la página más alta, así que
 * pasar de página —o llegar a la última, que puede traer menos filas— no hace
 * saltar el minipanel ni lo que hay debajo. Las páginas ocultas son `inert`: ni
 * el tabulador ni un lector de pantalla entran en ellas.
 *
 * Para listas largas está `Paginacion`, que pagina en la base con enlaces.
 *
 * Vive junto al tablero porque hoy tiene un solo consumidor (§2.4 del
 * CLAUDE.md): pasa a `presentation/` cuando lo pida una segunda pantalla.
 */

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/presentation/icons/Icon';

interface PaginasDeTablaProps {
  /** Una tabla ya dibujada por página. */
  readonly paginas: readonly ReactNode[];
  /** Lo que cubre cada página, p. ej. «6–10 de 25». Mismo orden que `paginas`. */
  readonly tramos: readonly string[];
  /** Nombre de la navegación para un lector de pantalla. */
  readonly etiqueta: string;
  readonly className?: string;
}

const BOTON =
  'inline-flex h-11 w-11 items-center justify-center rounded-[var(--t-radius-sm)] border border-line text-ink transition-colors hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink';

export function PaginasDeTabla({ paginas, tramos, etiqueta, className }: PaginasDeTablaProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const ultima = Math.max(paginas.length - 1, 0);
  const actual = Math.min(currentPage, ultima);

  return (
    <div className={cn('flex flex-1 flex-col', className)}>
      <div className="grid">
        {paginas.map((pagina, indice) => (
          <div key={indice} inert={indice !== actual} className={cn('[grid-area:1/1] min-w-0', indice !== actual && 'invisible')}>
            {pagina}
          </div>
        ))}
      </div>

      {paginas.length > 1 && (
        <nav aria-label={etiqueta} className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[0.82rem] text-muted" aria-live="polite">
            {tramos[actual]}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={BOTON}
              onClick={() => setCurrentPage((pagina) => Math.max(Math.min(pagina, ultima) - 1, 0))}
              disabled={actual === 0}
              aria-label="Página anterior"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <span className="min-w-12 text-center text-[0.82rem] tabular-nums text-muted">
              {actual + 1} / {paginas.length}
            </span>
            <button
              type="button"
              className={BOTON}
              onClick={() => setCurrentPage((pagina) => Math.min(Math.min(pagina, ultima) + 1, ultima))}
              disabled={actual === ultima}
              aria-label="Página siguiente"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
