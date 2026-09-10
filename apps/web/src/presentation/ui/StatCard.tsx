/**
 * CAPA: Presentation / UI (molécula)
 *
 * Indicador de cabecera del dashboard: un número grande, qué significa y, si
 * hay con qué comparar, cuánto ha variado.
 *
 * No conoce el dominio: no sabe qué es una membresía. Recibe un número ya
 * formateado por quien sí lo sabe.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type AnyIconKey } from '../icons/Icon';

export type TonoDeIndicador = 'neutro' | 'accion' | 'alerta';

const TONOS: Record<TonoDeIndicador, string> = {
  neutro: 'text-ink',
  accion: 'text-action',
  alerta: 'text-structural',
};

const FONDOS_DE_ICONO: Record<TonoDeIndicador, string> = {
  neutro: 'bg-raised text-muted',
  accion: 'bg-action/12 text-action',
  alerta: 'bg-structural/15 text-structural',
};

interface StatCardProps {
  readonly etiqueta: string;
  readonly valor: string;
  readonly icono: AnyIconKey;
  readonly tono?: TonoDeIndicador;
  /** Variación porcentual. `null` cuando no hay periodo anterior con el que comparar. */
  readonly variacion?: number | null;
  /** Qué se compara, para que el porcentaje signifique algo. */
  readonly comparacion?: string;
  readonly pie?: ReactNode;
  /** `true` cuando subir es peor —morosidad, vencimientos— e invierte el color de la flecha. */
  readonly subirEsMalo?: boolean;
}

export function StatCard({
  etiqueta,
  valor,
  icono,
  tono = 'neutro',
  variacion,
  comparacion,
  pie,
  subirEsMalo = false,
}: StatCardProps) {
  const hayVariacion = typeof variacion === 'number' && Number.isFinite(variacion);
  const sube = hayVariacion && variacion > 0;
  const plano = hayVariacion && Math.round(variacion) === 0;
  // Que un número suba no siempre es una buena noticia: más membresías
  // vencidas es peor, no mejor. Sin esto, el panel felicitaría al gerente por
  // el dato que tendría que preocuparle.
  const esBueno = subirEsMalo ? !sube : sube;

  return (
    <article className="surface-card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted">
          {etiqueta}
        </p>
        <span
          aria-hidden="true"
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-[var(--t-radius-sm)]',
            FONDOS_DE_ICONO[tono],
          )}
        >
          <Icon name={icono} size={17} />
        </span>
      </div>

      <p className={cn('text-[2rem] font-bold leading-none tracking-tight sm:text-[2.4rem]', TONOS[tono])}>
        {valor}
      </p>

      {hayVariacion && (
        <p className="flex items-center gap-1.5 text-[0.78rem]">
          <span
            className={cn(
              'inline-flex items-center gap-1 font-semibold',
              plano ? 'text-muted' : esBueno ? 'text-action' : 'text-structural',
            )}
          >
            <span aria-hidden="true">{plano ? '=' : sube ? '▲' : '▼'}</span>
            {/* El signo se lee en voz alta: un lector de pantalla no
                interpreta el triángulo, y «12 %» a secas no dice si subió. */}
            <span className="sr-only">{plano ? 'sin cambio,' : sube ? 'subió' : 'bajó'}</span>
            {Math.abs(variacion).toFixed(Math.abs(variacion) < 10 ? 1 : 0)} %
          </span>
          {comparacion && <span className="text-muted">{comparacion}</span>}
        </p>
      )}

      {!hayVariacion && comparacion && (
        <p className="text-[0.78rem] text-muted">{comparacion}</p>
      )}

      {pie && <div className="text-[0.78rem] text-muted">{pie}</div>}
    </article>
  );
}
