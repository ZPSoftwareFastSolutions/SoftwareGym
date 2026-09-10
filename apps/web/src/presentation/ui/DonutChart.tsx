/**
 * CAPA: Presentation / UI (molécula)
 *
 * Anillo de proporciones, en SVG y sin librería.
 *
 * Se dibuja con `stroke-dasharray` sobre un círculo en vez de con arcos
 * calculados a mano: menos trigonometría, un nodo por segmento y ningún
 * problema de redondeo en los extremos.
 *
 * Igual que el gráfico de barras, lleva su alternativa textual: un anillo sin
 * cifras leíbles no informa a quien usa lector de pantalla.
 */

import { cn } from '@/lib/cn';

export interface SegmentoDeAnillo {
  readonly etiqueta: string;
  readonly valor: number;
  /** Color en token semántico. Nunca un literal (§2.6). */
  readonly color: string;
}

interface DonutChartProps {
  readonly titulo: string;
  readonly segmentos: readonly SegmentoDeAnillo[];
  readonly centroValor: string;
  readonly centroEtiqueta: string;
  readonly className?: string;
}

const RADIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export function DonutChart({
  titulo,
  segmentos,
  centroValor,
  centroEtiqueta,
  className,
}: DonutChartProps) {
  const total = segmentos.reduce((suma, segmento) => suma + segmento.valor, 0);

  return (
    <figure className={cn('flex flex-col items-center gap-5 sm:flex-row sm:gap-7', className)}>
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="h-[132px] w-[132px] -rotate-90"
          role="img"
          aria-label={`${titulo}. ${total} en total.`}
        >
          <circle
            cx="50"
            cy="50"
            r={RADIO}
            fill="none"
            stroke="var(--t-line)"
            strokeWidth="11"
          />
          {total > 0 &&
            segmentos.reduce<{ nodos: React.ReactNode[]; recorrido: number }>(
              (acumulado, segmento, indice) => {
                if (segmento.valor <= 0) return acumulado;
                const largo = (segmento.valor / total) * CIRCUNFERENCIA;
                acumulado.nodos.push(
                  <circle
                    key={`${segmento.etiqueta}-${indice}`}
                    cx="50"
                    cy="50"
                    r={RADIO}
                    fill="none"
                    stroke={segmento.color}
                    strokeWidth="11"
                    strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
                    strokeDashoffset={-acumulado.recorrido}
                    strokeLinecap="butt"
                  >
                    <title>{`${segmento.etiqueta}: ${segmento.valor}`}</title>
                  </circle>,
                );
                acumulado.recorrido += largo;
                return acumulado;
              },
              { nodos: [], recorrido: 0 },
            ).nodos}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[1.55rem] font-bold leading-none text-ink">{centroValor}</p>
            <p className="mt-1 text-[0.66rem] uppercase tracking-[0.14em] text-muted">
              {centroEtiqueta}
            </p>
          </div>
        </div>
      </div>

      <figcaption className="w-full min-w-0">
        <ul className="flex flex-col gap-2.5">
          {segmentos.map((segmento) => (
            <li key={segmento.etiqueta} className="flex items-center gap-2.5 text-[0.85rem]">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: segmento.color }}
              />
              <span className="flex-1 text-muted">{segmento.etiqueta}</span>
              <span className="font-semibold text-ink">{segmento.valor}</span>
              <span className="w-12 text-end text-[0.78rem] text-muted">
                {total > 0 ? `${Math.round((segmento.valor / total) * 100)} %` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
