/**
 * CAPA: Presentation / Patterns
 *
 * Barra de uso de la cuota de medios del gimnasio (V3.1).
 *
 * Es información para decidir (¿subo este clip o lo enlazo?), no el límite:
 * la cuota la aplica la base al registrar cada archivo.
 */

import { cn } from '@/lib/cn';
import { evaluarCuota, formatoDeBytes, type UsoDeMedios as Uso } from '@core/domain/operations/exercises';

export function UsoDeMedios({ uso, className }: { readonly uso: Uso; readonly className?: string }) {
  const cuota = evaluarCuota(uso);
  const color = cuota.nivel === 'normal' ? 'bg-action' : 'bg-structural';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[0.86rem]">
        <span className="font-semibold text-ink">
          {formatoDeBytes(uso.usadoBytes)} <span className="font-normal text-muted">de {formatoDeBytes(uso.cuotaBytes)}</span>
        </span>
        <span className={cn('text-[0.8rem]', cuota.nivel === 'normal' ? 'text-muted' : 'font-semibold text-structural')}>
          {cuota.nivel === 'lleno' ? 'Cuota llena' : `${cuota.porcentaje} % usado · quedan ${formatoDeBytes(cuota.restanteBytes)}`}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={cuota.porcentaje}
        aria-label="Uso de la cuota de medios del gimnasio"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${cuota.porcentaje}%` }} />
      </div>
      <p className="text-[0.78rem] text-muted">
        {uso.archivos} archivo{uso.archivos === 1 ? '' : 's'} subido{uso.archivos === 1 ? '' : 's'} · {uso.enlaces} vídeo{uso.enlaces === 1 ? '' : 's'} enlazado{uso.enlaces === 1 ? '' : 's'} (no ocupan espacio)
      </p>
    </div>
  );
}
