/**
 * CAPA: Presentation / Patterns
 *
 * Calendario de racha: las últimas semanas, día por día.
 *
 * Sin estado ni efectos: se pinta igual en el servidor (panel del socio) y
 * dentro de un componente de cliente (la ficha que abre recepción).
 *
 * Es una `<table>` real, con cabecera de días y un texto oculto por celda. Un
 * calendario hecho de cuadraditos de color no le dice nada a quien usa lector
 * de pantalla; esta tabla le dice «10 sep: vino».
 */

import { cn } from '@/lib/cn';
import type { ResumenDeRacha } from '@core/domain/operations/streak';
import { fechaCorta } from '@/lib/formato';
import { Icon } from '../icons/Icon';

interface RachaCalendarioProps {
  readonly racha: ResumenDeRacha;
  readonly compacto?: boolean;
  readonly className?: string;
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const MENSAJE: Record<ResumenDeRacha['estado'], string> = {
  viva: '¡Racha viva! Hoy ya cuenta.',
  'en-riesgo': 'Tu racha sigue viva: entrena hoy para no perderla.',
  rota: 'La racha se cortó. Una visita hoy empieza una nueva.',
  'sin-visitas': 'Todavía no hay entradas. La primera empieza la racha.',
};

export function RachaCalendario({ racha, compacto = false, className }: RachaCalendarioProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--t-radius-md)] bg-raised px-3 py-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[1.7rem] font-bold leading-none text-action">
            <Icon name="fire" size={20} />
            {racha.actual}
          </p>
          <p className="mt-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-muted">Racha actual</p>
        </div>
        <div className="rounded-[var(--t-radius-md)] bg-raised px-3 py-3 text-center">
          <p className="text-[1.7rem] font-bold leading-none text-ink">{racha.mejor}</p>
          <p className="mt-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-muted">Mejor racha</p>
        </div>
        <div className="rounded-[var(--t-radius-md)] bg-raised px-3 py-3 text-center">
          <p className="text-[1.7rem] font-bold leading-none text-ink">{racha.visitasEnCalendario}</p>
          <p className="mt-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-muted">
            En {racha.semanas.length} semanas
          </p>
        </div>
      </div>

      {!compacto && (
        <p
          className={cn(
            'flex items-center gap-2 rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.86rem]',
            racha.estado === 'viva' && 'border-action/40 bg-action/10 text-ink',
            racha.estado === 'en-riesgo' && 'border-structural/40 bg-structural/10 text-ink',
            (racha.estado === 'rota' || racha.estado === 'sin-visitas') && 'border-line bg-raised text-muted',
          )}
        >
          <Icon name={racha.estado === 'en-riesgo' ? 'alert' : 'fire'} size={16} className="shrink-0" />
          {MENSAJE[racha.estado]}
          {racha.ultimaVisita && <span className="ms-auto text-muted">Última: {fechaCorta(racha.ultimaVisita)}</span>}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="mx-auto border-separate border-spacing-1">
          <caption className="sr-only">Asistencia de las últimas {racha.semanas.length} semanas</caption>
          <thead>
            <tr>
              {DIAS.map((dia, indice) => (
                <th key={dia} scope="col" className="text-[0.66rem] font-semibold text-muted">
                  <span aria-hidden="true">{dia}</span>
                  <span className="sr-only">{DIAS_LARGOS[indice]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {racha.semanas.map((semana) => (
              <tr key={semana[0]?.fecha}>
                {semana.map((dia) => (
                  <td key={dia.fecha} className="p-0">
                    <span
                      title={`${fechaCorta(dia.fecha)}${dia.asistio ? ' · vino' : dia.cerrado ? ' · gimnasio cerrado' : ''}`}
                      className={cn(
                        'block rounded-[5px]',
                        compacto ? 'h-4 w-4' : 'h-6 w-6 sm:h-7 sm:w-7',
                        dia.asistio && 'bg-action shadow-[0_0_10px_-3px_var(--t-action)]',
                        !dia.asistio && dia.cerrado && 'bg-[repeating-linear-gradient(45deg,var(--t-line)_0_2px,transparent_2px_5px)]',
                        !dia.asistio && !dia.cerrado && !dia.futuro && 'bg-raised',
                        dia.futuro && 'border border-dashed border-line/60 bg-transparent',
                        dia.hoy && 'ring-2 ring-ink ring-offset-1 ring-offset-surface',
                      )}
                    >
                      <span className="sr-only">
                        {fechaCorta(dia.fecha)}: {dia.futuro ? 'aún no llega' : dia.asistio ? 'vino' : dia.cerrado ? 'cerrado' : 'no vino'}
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!compacto && (
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[0.74rem] text-muted" aria-hidden="true">
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-action" />Vino</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-raised" />No vino</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[repeating-linear-gradient(45deg,var(--t-line)_0_2px,transparent_2px_5px)]" />Cerrado (no corta)</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] ring-2 ring-ink" />Hoy</li>
        </ul>
      )}
    </div>
  );
}
