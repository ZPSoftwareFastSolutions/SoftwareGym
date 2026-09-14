'use client';

/**
 * CAPA: Presentation / Patterns (molécula)
 *
 * Navegación entre páginas de una lista paginada en la base (V4).
 *
 * Cada número es un enlace real con los filtros de la URL: se puede compartir,
 * volver atrás y abrir en otra pestaña. Es de cliente solo para marcar con un
 * giro el enlace que se está cargando (`useLinkStatus`): cambiar de página no
 * cambia de ruta, así que `loading.tsx` no aparece y sin esto el clic parecería
 * no hacer nada.
 */

import type { ReactNode } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { cn } from '@/lib/cn';
import {
  consultaDePagina,
  describirTramo,
  paginasVisibles,
  totalDePaginas,
} from '@core/domain/shared/paginacion';
import { Spinner } from '../ui/Cargando';
import { Icon } from '../icons/Icon';

interface PaginacionProps {
  /** Ruta de la lista, sin consulta. */
  readonly ruta: string;
  /** Parámetros actuales de la URL (filtros), que cada enlace conserva. */
  readonly parametros: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly pagina: number;
  readonly porPagina: number;
  readonly total: number;
  readonly filasEnPagina: number;
  /** Ancla a la que vuelve cada enlace (p. ej. `historial`), sin `#`. */
  readonly ancla?: string;
  readonly className?: string;
}

function IndicadorDeCarga({ children }: { readonly children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? <Spinner tamano={14} /> : children}
    </>
  );
}

const CLASE_BASE =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-[var(--t-radius-sm)] border px-3 text-[0.86rem] font-medium transition-colors';

export function Paginacion({ ruta, parametros, pagina, porPagina, total, filasEnPagina, ancla, className }: PaginacionProps) {
  const paginas = totalDePaginas(total, porPagina);
  const tramo = describirTramo(pagina, porPagina, total, filasEnPagina);
  const href = (numero: number) => `${ruta}${consultaDePagina(parametros, numero)}${ancla ? `#${ancla}` : ''}`;

  return (
    <nav aria-label="Páginas" data-print="hide" className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-[0.82rem] text-muted" aria-live="polite">
        {tramo}
      </p>
      {paginas > 1 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          <li>
            {pagina > 1 ? (
              <Link href={href(pagina - 1)} className={cn(CLASE_BASE, 'border-line text-ink hover:border-action')} aria-label="Página anterior" scroll={false}>
                <IndicadorDeCarga>
                  <Icon name="chevronLeft" size={16} />
                </IndicadorDeCarga>
              </Link>
            ) : (
              <span className={cn(CLASE_BASE, 'border-line text-muted opacity-50')} aria-hidden="true">
                <Icon name="chevronLeft" size={16} />
              </span>
            )}
          </li>
          {paginasVisibles(pagina, paginas).map((numero, indice) =>
            numero === null ? (
              <li key={`hueco-${indice}`} aria-hidden="true" className="px-1 text-muted">
                …
              </li>
            ) : (
              <li key={numero}>
                {numero === pagina ? (
                  <span aria-current="page" className={cn(CLASE_BASE, 'border-action bg-action text-on-action')}>
                    {numero}
                  </span>
                ) : (
                  <Link href={href(numero)} className={cn(CLASE_BASE, 'border-line text-ink hover:border-action')} aria-label={`Página ${numero}`} scroll={false}>
                    <IndicadorDeCarga>{numero}</IndicadorDeCarga>
                  </Link>
                )}
              </li>
            ),
          )}
          <li>
            {pagina < paginas ? (
              <Link href={href(pagina + 1)} className={cn(CLASE_BASE, 'border-line text-ink hover:border-action')} aria-label="Página siguiente" scroll={false}>
                <IndicadorDeCarga>
                  <Icon name="chevronRight" size={16} />
                </IndicadorDeCarga>
              </Link>
            ) : (
              <span className={cn(CLASE_BASE, 'border-line text-muted opacity-50')} aria-hidden="true">
                <Icon name="chevronRight" size={16} />
              </span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
