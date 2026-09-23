'use client';

/**
 * CAPA: Presentation / Patterns (molécula)
 *
 * Panel que se abre y se cierra con su «Ver» (V6).
 *
 * Es la pieza con la que los tableros de Recepción, Gerencia y Administración
 * se ven limpios al entrar: el título y una línea que dice qué hay dentro
 * siempre a la vista, y el contenido pesado —gráficas, tablas— a un clic. Un
 * «Ver más» a secas obliga a abrirlo para saber si sirve; el resumen lo dice
 * antes.
 *
 * POR QUÉ NO ES UN `<details>` COMO EL ACORDEÓN. Aquí hace falta controlar la
 * caja entera: dos paneles puestos lado a lado tienen que medir lo mismo cuando
 * están abiertos, y un `<details>` no reparte su alto con su contenido de forma
 * fiable en todos los navegadores. Es el patrón «disclosure» de WAI-ARIA: un
 * botón dentro del encabezado, con `aria-expanded` y `aria-controls`, y el
 * cuerpo con `hidden` cuando está cerrado.
 *
 * El cuerpo se queda MONTADO aunque esté cerrado: lo que dibuja el servidor no
 * se pierde, y el estado de dentro (la página de una tabla) sigue donde estaba
 * al volver a abrir.
 *
 * Cerrado no es escondido: esto es foco, no seguridad. Lo de dentro es lo mismo
 * que se enseñaba antes, y su ruta sigue exigiendo permisos.
 */

import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

interface PanelPlegableProps {
  readonly titulo: string;
  /** Qué hay dentro, en una línea. Se lee con el panel cerrado. */
  readonly resumen?: string;
  /** Nivel del encabezado: 2 para un bloque del tablero, 3 para un panel dentro de él. */
  readonly nivel?: 2 | 3;
  readonly abiertoAlInicio?: boolean;
  /**
   * Ancla del panel. Si la dirección llega con `#ancla` —una tarjeta que enlaza
   * a esta sección—, el panel se abre solo: saltar a un panel cerrado dejaría
   * a la persona delante de un título sin el dato que fue a buscar.
   */
  readonly id?: string;
  /**
   * Va lado a lado con otro panel en una rejilla. Abierto, ocupa el alto de su
   * fila, así dos vecinos abiertos miden lo mismo; cerrado, es solo su barra y
   * no se estira a la altura del vecino abierto (una barra alta y vacía
   * parecería rota). Fuera de una rejilla no se usa: en una columna flex,
   * alinear arriba encogería el ANCHO del panel, no su alto.
   */
  readonly ladoALado?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export function PanelPlegable({ titulo, resumen, nivel = 3, abiertoAlInicio = false, id, ladoALado = false, className, children }: PanelPlegableProps) {
  const [isOpen, setIsOpen] = useState(abiertoAlInicio);
  const base = useId();
  const idTitulo = `${base}-titulo`;
  const idCuerpo = `${base}-cuerpo`;
  const Encabezado = nivel === 2 ? 'h2' : 'h3';

  useEffect(() => {
    if (!id) return;
    const abrirSiEsElAncla = () => {
      if (window.location.hash === `#${id}`) setIsOpen(true);
    };
    abrirSiEsElAncla();
    window.addEventListener('hashchange', abrirSiEsElAncla);
    return () => window.removeEventListener('hashchange', abrirSiEsElAncla);
  }, [id]);

  return (
    <section
      id={id}
      aria-labelledby={idTitulo}
      className={cn(
        'surface-card flex min-w-0 scroll-mt-28 flex-col overflow-hidden p-0',
        ladoALado && (isOpen ? 'self-stretch' : 'self-start'),
        className,
      )}
    >
      <Encabezado className="m-0">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={idCuerpo}
          onClick={() => setIsOpen((abierto) => !abierto)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-start transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action sm:px-7"
        >
          <span className="min-w-0">
            <span id={idTitulo} className="block t-h3">
              {titulo}
            </span>
            {resumen && <span className="mt-1 block text-[0.85rem] font-normal text-muted">{resumen}</span>}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 text-[0.86rem] font-semibold text-action">
            <span className="hidden sm:inline">{isOpen ? 'Ocultar' : 'Ver'}</span>
            <Icon name="chevronDown" size={18} className={cn('transition-transform', isOpen && 'rotate-180')} />
          </span>
        </button>
      </Encabezado>
      <div
        id={idCuerpo}
        hidden={!isOpen}
        className={cn(isOpen ? 'flex' : 'hidden', 'flex-1 flex-col gap-4 border-t border-line px-6 py-6 sm:px-7')}
      >
        {children}
      </div>
    </section>
  );
}
