/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Cómo se pinta una sesión de clase y la agenda de la semana (V3.3). Lo usan el
 * panel de clases, la ficha de una clase, el espacio del entrenador y el panel
 * del socio: cuatro pantallas que tienen que decir lo mismo con las mismas
 * palabras (cupos, cancelada con su motivo, en curso).
 *
 * Componente de servidor: no tiene estado. La ocupación la trae la sesión.
 */

import Link from 'next/link';
import { fechaCorta } from '@/lib/formato';
import { cn } from '@/lib/cn';
import {
  cuposLibres,
  DIA_ISO_CORTO,
  diaIsoDe,
  horaDeFin,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_ESTADO_DE_SESION,
  nivelDeOcupacion,
  porcentajeDeOcupacion,
  type SesionDeClase,
} from '@core/domain/operations/classes';
import { Badge } from '../ui/Badge';
import { Icon } from '../icons/Icon';

/** Barra de ocupación con su lectura textual (no depende del color). */
export function BarraDeOcupacion({ asistentes, capacidad, className }: { readonly asistentes: number; readonly capacidad: number; readonly className?: string }) {
  const porcentaje = porcentajeDeOcupacion(asistentes, capacidad);
  const nivel = nivelDeOcupacion(asistentes, capacidad);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className="h-2 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={asistentes}
        aria-valuemin={0}
        aria-valuemax={capacidad}
        aria-label={`Ocupación: ${asistentes} de ${capacidad}`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', nivel === 'llena' || nivel === 'alta' ? 'bg-structural' : 'bg-action')}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className="text-[0.76rem] text-muted">
        {asistentes} de {capacidad} · {nivel === 'llena' ? 'llena' : `${Math.max(0, capacidad - asistentes)} libres`}
      </span>
    </div>
  );
}

function EstadoDeSesionBadge({ sesion }: { readonly sesion: Pick<SesionDeClase, 'estado'> }) {
  if (sesion.estado === 'programada') return null;
  return <Badge tone={sesion.estado === 'en_curso' ? 'action' : sesion.estado === 'cancelada' ? 'structural' : 'neutral'}>{NOMBRE_DE_ESTADO_DE_SESION[sesion.estado]}</Badge>;
}

/**
 * Una sesión en una lista. Con `href`, toda la fila lleva a la sesión (tomar
 * asistencia); sin él, es informativa (el socio no entra a la sesión).
 */
export function FilaDeSesion({
  sesion,
  href,
  mostrarFecha = false,
  mostrarSede = true,
  destacada = false,
}: {
  readonly sesion: SesionDeClase;
  readonly href?: string;
  readonly mostrarFecha?: boolean;
  readonly mostrarSede?: boolean;
  readonly destacada?: boolean;
}) {
  const cancelada = sesion.estado === 'cancelada';
  const contenido = (
    <>
      <span className="flex w-16 shrink-0 flex-col">
        <span className={cn('text-[1.05rem] font-bold leading-tight', cancelada ? 'text-muted line-through' : 'text-ink')}>{sesion.startTime}</span>
        <span className="text-[0.72rem] text-muted">{horaDeFin(sesion.startTime, sesion.durationMinutes)}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn('font-semibold', cancelada ? 'text-muted line-through' : 'text-ink')}>{sesion.title ?? sesion.className}</span>
          {sesion.kind === 'evento' && <Badge tone="action">Evento</Badge>}
          <EstadoDeSesionBadge sesion={sesion} />
        </span>
        <span className="text-[0.78rem] text-muted">
          {[
            mostrarFecha ? `${NOMBRE_DE_DIA_ISO[diaIsoDe(sesion.sessionDate)]} ${fechaCorta(sesion.sessionDate)}` : null,
            sesion.title ? sesion.className : NOMBRE_DE_CATEGORIA[sesion.category],
            mostrarSede ? sesion.branchName : null,
            sesion.trainerName ?? 'instructor por confirmar',
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {cancelada && sesion.cancelReason && <span className="text-[0.78rem] text-structural">Cancelada: {sesion.cancelReason}</span>}
      </span>
      {!cancelada && <BarraDeOcupacion asistentes={sesion.asistentes} capacidad={sesion.capacity} className="w-28 shrink-0" />}
      {href && <Icon name="arrowRight" size={16} className="shrink-0 text-action" />}
    </>
  );

  const clases = cn(
    'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--t-radius-md)] border px-4 py-3',
    destacada ? 'border-action/50 bg-action/5' : 'border-line',
    href && 'transition-colors hover:border-action',
  );

  return href ? (
    <Link href={href} className={clases}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/**
 * Siete columnas, una por día, con sus sesiones. En móvil se apilan: una tabla
 * de siete columnas a 375 px no se lee.
 */
export function AgendaSemanal({
  dias,
  hrefDeSesion,
  hoy,
}: {
  readonly dias: readonly { readonly fecha: string; readonly sesiones: readonly SesionDeClase[] }[];
  readonly hrefDeSesion?: (sesion: SesionDeClase) => string;
  readonly hoy: string;
}) {
  return (
    <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {dias.map(({ fecha, sesiones }) => (
        <li key={fecha} className={cn('flex min-w-0 flex-col gap-2 rounded-[var(--t-radius-md)] border p-3', fecha === hoy ? 'border-action/50' : 'border-line')}>
          <p className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-ink">{DIA_ISO_CORTO[diaIsoDe(fecha)]}</span>
            <span className="text-[0.76rem] text-muted">{fecha === hoy ? 'hoy' : fechaCorta(fecha)}</span>
          </p>
          {sesiones.length === 0 ? (
            <p className="text-[0.78rem] text-muted">Sin clases</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sesiones.map((s) => {
                const contenido = (
                  <>
                    <span className={cn('block text-[0.8rem] font-semibold', s.estado === 'cancelada' ? 'text-muted line-through' : 'text-ink')}>
                      {s.startTime} · {s.title ?? s.className}
                    </span>
                    <span className="block text-[0.72rem] text-muted">
                      {s.estado === 'cancelada' ? 'cancelada' : `${s.branchName} · ${cuposLibres(s)} libres`}
                    </span>
                  </>
                );
                return (
                  <li key={s.id}>
                    {hrefDeSesion ? (
                      <Link href={hrefDeSesion(s)} className="block rounded-[var(--t-radius-sm)] bg-raised px-2.5 py-2 transition-colors hover:bg-action/10">
                        {contenido}
                      </Link>
                    ) : (
                      <span className="block rounded-[var(--t-radius-sm)] bg-raised px-2.5 py-2">{contenido}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
