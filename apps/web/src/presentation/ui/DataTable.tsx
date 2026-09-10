/**
 * CAPA: Presentation / UI (molécula)
 *
 * Tabla de datos.
 *
 * Es una `<table>` de verdad, con `<caption>` y `<th scope>`, no una retícula
 * de `div`s con aspecto de tabla: la semántica es lo que permite a un lector
 * de pantalla anunciar «columna Socio, fila 3» al moverse por las celdas
 * (§2.7). Con `div`s eso se pierde y la tabla deja de poder recorrerse.
 *
 * El desbordamiento horizontal se resuelve DENTRO del contenedor: el cuerpo
 * de la página nunca debe desplazarse en horizontal por culpa de una tabla
 * ancha en un móvil.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ColumnaDeTabla<T> {
  readonly clave: string;
  readonly titulo: string;
  readonly numerica?: boolean;
  /** Se oculta por debajo de `sm`. Para columnas de apoyo, nunca la principal. */
  readonly secundaria?: boolean;
  readonly celda: (fila: T) => ReactNode;
}

interface DataTableProps<T> {
  readonly titulo: string;
  /** `true` oculta el `<caption>` visualmente; sigue leyéndose. */
  readonly tituloOculto?: boolean;
  readonly columnas: readonly ColumnaDeTabla<T>[];
  readonly filas: readonly T[];
  readonly claveDeFila: (fila: T, indice: number) => string;
  readonly vacio?: ReactNode;
  /**
   * Fila de totales, por clave de columna. Va en `<tfoot>`: al imprimir, el
   * navegador la repite al pie de cada página y un lector de pantalla la
   * anuncia como resumen, no como un registro más.
   */
  readonly filaDeTotales?: Readonly<Record<string, ReactNode>>;
  readonly className?: string;
}

export function DataTable<T>({
  titulo,
  tituloOculto = true,
  columnas,
  filas,
  claveDeFila,
  vacio,
  filaDeTotales,
  className,
}: DataTableProps<T>) {
  if (filas.length === 0 && vacio) return <>{vacio}</>;

  return (
    <div className={cn('-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0', className)}>
      <table className="w-full min-w-[34rem] border-collapse text-[0.86rem]">
        <caption className={cn('text-start', tituloOculto ? 'sr-only' : 'pb-3 text-muted')}>
          {titulo}
        </caption>
        <thead>
          <tr className="border-b border-line">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted',
                  columna.numerica ? 'text-end' : 'text-start',
                  columna.secundaria && 'hidden sm:table-cell',
                )}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, indice) => (
            <tr
              key={claveDeFila(fila, indice)}
              // `relative`: un botón de ficha dentro de la fila extiende su zona
              // pulsable a la fila entera con un pseudo-elemento absoluto. Sin
              // un ancestro posicionado, ese pseudo-elemento cubriría la página.
              className="relative border-b border-line/60 last:border-0 hover:bg-raised/60"
            >
              {columnas.map((columna, posicion) => {
                const contenido = columna.celda(fila);
                // La primera columna es el encabezado de su fila: es lo que
                // identifica el registro y lo que el lector anuncia al entrar
                // en cada celda de esa fila.
                const Celda = posicion === 0 ? 'th' : 'td';
                return (
                  <Celda
                    key={columna.clave}
                    {...(posicion === 0 ? { scope: 'row' as const } : {})}
                    className={cn(
                      'px-3 py-3 align-middle',
                      posicion === 0 ? 'text-start font-medium text-ink' : 'text-muted',
                      columna.numerica && 'text-end tabular-nums',
                      columna.secundaria && 'hidden sm:table-cell',
                    )}
                  >
                    {contenido}
                  </Celda>
                );
              })}
            </tr>
          ))}
        </tbody>
        {filaDeTotales && (
          <tfoot>
            <tr className="border-t-2 border-line">
              {columnas.map((columna, posicion) => {
                const valor = filaDeTotales[columna.clave];
                const Celda = posicion === 0 ? 'th' : 'td';
                return (
                  <Celda
                    key={columna.clave}
                    {...(posicion === 0 ? { scope: 'row' as const } : {})}
                    className={cn(
                      'px-3 py-3 text-[0.82rem] font-semibold text-ink',
                      columna.numerica ? 'text-end tabular-nums' : 'text-start',
                      columna.secundaria && 'hidden sm:table-cell',
                    )}
                  >
                    {valor ?? (posicion === 0 ? 'Total' : '')}
                  </Celda>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
