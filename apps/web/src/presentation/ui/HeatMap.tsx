/**
 * CAPA: Presentation / UI (molécula)
 *
 * Mapa de calor: filas × columnas con la intensidad de cada celda.
 *
 * Es una `<table>` real con el valor escrito en cada celda para lectores de
 * pantalla: un mapa de calor sin cifras es un degradado bonito que no dice
 * cuántas personas entran los lunes a las siete.
 *
 * El color sale del token de acción mezclado con transparencia, nunca de un
 * literal: en Mítico es verde neón, en Aurora terracota, sin tocar nada.
 */

import { cn } from '@/lib/cn';

interface HeatMapProps {
  readonly titulo: string;
  readonly filas: readonly string[];
  readonly columnas: readonly string[];
  /** `valores[fila][columna]`. */
  readonly valores: readonly (readonly number[])[];
  readonly unidad?: string;
  readonly className?: string;
}

export function HeatMap({ titulo, filas, columnas, valores, unidad = 'entradas', className }: HeatMapProps) {
  const maximo = Math.max(1, ...valores.flat());

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[34rem] border-separate border-spacing-[3px]">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-10" />
            {columnas.map((columna) => (
              <th key={columna} scope="col" className="pb-1 text-center text-[0.64rem] font-medium text-muted">
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={fila}>
              <th scope="row" className="pe-2 text-end text-[0.72rem] font-medium text-muted">
                {fila}
              </th>
              {columnas.map((columna, j) => {
                const valor = valores[i]?.[j] ?? 0;
                const intensidad = valor === 0 ? 0 : 18 + Math.round((valor / maximo) * 82);
                return (
                  <td
                    key={columna}
                    title={`${fila} ${columna}: ${valor} ${unidad}`}
                    className="relative h-7 rounded-[4px] p-0 text-center text-[0.62rem] font-semibold overflow-hidden"
                    style={{
                      color: intensidad > 60 ? 'var(--t-on-action)' : 'var(--t-ink)',
                    }}
                  >
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        background: valor === 0 ? 'var(--t-raised)' : 'var(--t-action)',
                        opacity: valor === 0 ? 1 : intensidad / 100
                      }}
                    />
                    <span className="relative z-10" aria-hidden={valor === 0}>{valor > 0 ? valor : ''}</span>
                    <span className="sr-only">
                      {fila} a las {columna}: {valor} {unidad}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
