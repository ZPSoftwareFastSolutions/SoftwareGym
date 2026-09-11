/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Una sede de un vistazo: entradas de hoy, de la semana, socios que entrenaron
 * allí y cuánto pesa sobre el total del gimnasio.
 *
 * La usan el dashboard (vista global) y la administración de sucursales. Toda
 * la tarjeta es un enlace: como `StatCard`, un número que no lleva a nada
 * obliga a buscar a mano lo que ya dijo.
 */

import Link from 'next/link';
import type { IndicadoresDeSucursal } from '@core/domain/operations/branches';
import { porcentaje } from '@core/domain/operations/reports';
import { cn } from '@/lib/cn';
import { Badge } from '../ui/Badge';
import { Icon } from '../icons/Icon';

interface TarjetaDeSucursalProps {
  readonly sucursal: IndicadoresDeSucursal;
  /** Entradas de 30 días de TODO el gimnasio, para el peso de la sede. */
  readonly total30d: number;
  readonly href: string;
  readonly accion: string;
  /** Marca la sede de trabajo del dispositivo. */
  readonly actual?: boolean;
}

function Cifra({ valor, etiqueta }: { readonly valor: number; readonly etiqueta: string }) {
  return (
    <div className="min-w-0">
      <dd className="text-[1.5rem] font-bold leading-none tabular-nums text-ink">{valor.toLocaleString('es-BO')}</dd>
      <dt className="mt-1.5 text-[0.72rem] uppercase tracking-[0.1em] text-muted">{etiqueta}</dt>
    </div>
  );
}

export function TarjetaDeSucursal({ sucursal, total30d, href, accion, actual = false }: TarjetaDeSucursalProps) {
  const peso = porcentaje(sucursal.asistencias30d, total30d);

  return (
    <Link
      href={href}
      className={cn(
        'surface-card group flex h-full flex-col gap-5 p-6 transition-colors hover:border-action/50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
        !sucursal.isActive && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted">
            <Icon name="pin" size={14} className="text-action" />
            Sucursal
          </p>
          <h3 className="mt-1 truncate t-h3">{sucursal.name}</h3>
          {sucursal.address && <p className="mt-1 line-clamp-2 text-[0.82rem] text-muted">{sucursal.address}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {sucursal.isPrimary && <Badge tone="action">Principal</Badge>}
          {!sucursal.isActive && <Badge tone="neutral">Inactiva</Badge>}
          {actual && <Badge tone="structural">Tu sede</Badge>}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Cifra valor={sucursal.asistenciasHoy} etiqueta="Hoy" />
        <Cifra valor={sucursal.asistenciasSemana} etiqueta="7 días" />
        <Cifra valor={sucursal.socios30d} etiqueta="Socios 30 d" />
      </dl>

      <div>
        <div className="flex justify-between text-[0.76rem] text-muted">
          <span>Peso en 30 días</span>
          <span className="tabular-nums">{peso.toLocaleString('es-BO')} %</span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-valuenow={peso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Entradas de ${sucursal.name} sobre el total del gimnasio en 30 días`}
        >
          <div className="h-full rounded-full bg-action" style={{ width: `${Math.min(peso, 100)}%` }} />
        </div>
      </div>

      <span className="mt-auto inline-flex items-center gap-1.5 text-[0.84rem] font-semibold text-action">
        {accion}
        <Icon name="arrowRight" size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
