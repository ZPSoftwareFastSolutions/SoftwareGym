/**
 * CAPA: Presentation / UI (molécula)
 *
 * Gráfico de barras en SVG puro, renderizable en el servidor.
 *
 * SIN LIBRERÍA DE GRÁFICOS, y no por purismo: las habituales pesan entre 40 y
 * 150 KB, arrastran D3 entera y obligan a convertir el dashboard en un
 * componente de cliente. Aquí lo que hace falta son rectángulos con una
 * escala lineal, que son diez líneas. La regla de V1 sigue en pie: antes de
 * instalar, contar cuántas líneas propias ahorra de verdad (§2.9).
 *
 * ACCESIBILIDAD. Un gráfico sin alternativa textual es un adorno para quien
 * usa lector de pantalla. Este lleva `role="img"` con su resumen y, debajo,
 * una tabla real oculta visualmente con los datos: quien no ve el dibujo
 * puede leer las cifras, que es lo que importaba.
 */

import { cn } from '@/lib/cn';
import type { PuntoDeSerie } from '@core/domain/operations/dashboard';

interface BarChartProps {
  readonly titulo: string;
  readonly puntos: readonly PuntoDeSerie[];
  /** Sufijo de la unidad, para el resumen leído en voz alta. */
  readonly unidad?: string;
  readonly alto?: number;
  /** Cada cuántas barras se escribe una etiqueta bajo el eje. */
  readonly saltoDeEtiqueta?: number;
  readonly className?: string;
}

const ANCHO = 1000;
const HUECO = 0.22;

export function BarChart({
  titulo,
  puntos,
  unidad = '',
  alto = 180,
  saltoDeEtiqueta,
  className,
}: BarChartProps) {
  if (puntos.length === 0) {
    return (
      <p className={cn('py-10 text-center text-[0.86rem] text-muted', className)}>
        Todavía no hay datos para dibujar este gráfico.
      </p>
    );
  }

  const maximo = Math.max(...puntos.map((punto) => punto.valor), 1);
  const anchoDeCelda = ANCHO / puntos.length;
  const anchoDeBarra = anchoDeCelda * (1 - HUECO);
  const salto = saltoDeEtiqueta ?? Math.max(1, Math.ceil(puntos.length / 8));
  const total = puntos.reduce((suma, punto) => suma + punto.valor, 0);

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        // `preserveAspectRatio="none"` deformaría las barras al cambiar el
        // ancho del contenedor; con la altura fija en CSS y el ancho al 100 %
        // el escalado es uniforme y las barras no se estiran.
        className="w-full"
        style={{ height: alto }}
        role="img"
        aria-label={`${titulo}. ${total} ${unidad || 'en total'} en ${puntos.length} periodos.`}
      >
        {/* Línea de base: sin ella las barras flotan y no se lee dónde empieza el cero. */}
        <line
          x1="0"
          y1={alto - 18}
          x2={ANCHO}
          y2={alto - 18}
          stroke="var(--t-line)"
          strokeWidth="1"
        />
        {puntos.map((punto, indice) => {
          const altoUtil = alto - 26;
          const altoBarra = Math.max((punto.valor / maximo) * altoUtil, punto.valor > 0 ? 3 : 0);
          const x = indice * anchoDeCelda + (anchoDeCelda - anchoDeBarra) / 2;
          const y = alto - 18 - altoBarra;
          const esUltimo = indice === puntos.length - 1;
          return (
            <g key={`${punto.etiqueta}-${indice}`}>
              <rect
                x={x}
                y={y}
                width={anchoDeBarra}
                height={altoBarra}
                rx={Math.min(3, anchoDeBarra / 2)}
                fill={esUltimo ? 'var(--t-action)' : 'color-mix(in srgb, var(--t-action) 42%, transparent)'}
              >
                {/* El `title` da el dato al pasar el ratón sin JavaScript. */}
                <title>{punto.detalle}</title>
              </rect>
              {indice % salto === 0 && (
                <text
                  x={indice * anchoDeCelda + anchoDeCelda / 2}
                  y={alto - 4}
                  textAnchor="middle"
                  fontSize="22"
                  fill="var(--t-muted)"
                >
                  {punto.etiqueta}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="sr-only">
        <table>
          <caption>{titulo}</caption>
          <thead>
            <tr>
              <th scope="col">Periodo</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {puntos.map((punto, indice) => (
              <tr key={`fila-${punto.etiqueta}-${indice}`}>
                <th scope="row">{punto.detalle}</th>
                <td>{punto.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
