/**
 * CAPA: Presentation / Sections
 *
 * Horario de atención día por día.
 *
 * En escritorio es una tabla real (`<table>`): un horario ES datos tabulares, y
 * un lector de pantalla necesita la relación fila/columna para anunciarlo.
 *
 * V4.2 · En un teléfono la tabla obligaba a desplazarse de lado dentro de su
 * caja (30 rem de ancho mínimo). Ahora, bajo `md`, cada día es una fila de
 * lista con sus horas y su nota debajo; la tabla queda para pantallas anchas.
 * Las dos versiones no se leen dos veces: la que no toca está oculta con
 * `display: none`, que también la saca del árbol de accesibilidad. Hoy va
 * destacado.
 */

import type { BusinessHours } from '@core/domain/tenant/tenant-config';
import { diaDelHorario } from '@core/domain/operations/streak';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface ScheduleSectionProps {
  readonly hours: BusinessHours;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
  /** Fecha ISO de hoy en la zona del gimnasio, para destacar el día. */
  readonly hoy?: string;
}

export function ScheduleSection({ hours, eyebrow = 'Horarios', title = 'Cuándo puedes venir', lead, hoy }: ScheduleSectionProps) {
  const diaDeHoy = hoy ? diaDelHorario(hours.week, hoy)?.day ?? null : null;

  return (
    <section className="section" aria-labelledby="horarios-title">
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        <Reveal delay={80}>
          {/* Teléfono y tableta pequeña: lista. */}
          <ul className="mt-10 flex flex-col gap-2 md:hidden">
            {hours.week.map((day) => {
              const esHoy = day.day === diaDeHoy;
              return (
                <li
                  key={day.day}
                  className={cn(
                    'rounded-[var(--t-radius-md)] border px-4 py-3.5',
                    esHoy ? 'border-action/60 bg-action/10' : 'border-line bg-card',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-ink">
                      {day.day}
                      {esHoy && <span className="ms-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-action">Hoy</span>}
                    </span>
                    {day.closed ? (
                      <span className="inline-flex items-center gap-1.5 text-[0.9rem] text-muted">
                        <Icon name="close" size={14} /> Cerrado
                      </span>
                    ) : (
                      <span className="font-mono text-[0.95rem] tabular-nums text-ink">
                        {day.open} – {day.close}
                      </span>
                    )}
                  </div>
                  {day.note && <p className="mt-1.5 text-[0.82rem] text-muted">{day.note}</p>}
                </li>
              );
            })}
          </ul>

          {/* Pantallas anchas: tabla. */}
          <div className="mt-12 hidden md:block">
            <table className="w-full border-collapse overflow-hidden rounded-[var(--t-radius-lg)] border border-line">
              <caption className="sr-only">Horario de atención semanal. Zona horaria: {hours.timezone}.</caption>
              <thead>
                <tr className="bg-structural-deep text-white">
                  <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
                    Día
                  </th>
                  <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
                    Apertura
                  </th>
                  <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
                    Cierre
                  </th>
                  <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
                    Nota
                  </th>
                </tr>
              </thead>
              <tbody>
                {hours.week.map((day) => {
                  const esHoy = day.day === diaDeHoy;
                  return (
                    <tr
                      key={day.day}
                      className={cn(
                        'border-t border-line transition-colors',
                        esHoy ? 'bg-action/10' : day.closed ? 'bg-raised/60 text-muted' : 'bg-surface hover:bg-raised',
                      )}
                    >
                      <th scope="row" className="px-6 py-4 text-start text-[0.95rem] font-semibold text-ink">
                        {day.day}
                        {esHoy && <span className="ms-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-action">Hoy</span>}
                      </th>
                      {day.closed ? (
                        <td colSpan={2} className="px-6 py-4 text-[0.92rem]">
                          <span className="inline-flex items-center gap-2 text-muted">
                            <Icon name="close" size={14} />
                            Cerrado
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4 font-mono text-[0.95rem] text-action">{day.open}</td>
                          <td className="px-6 py-4 font-mono text-[0.95rem] text-ink/85">{day.close}</td>
                        </>
                      )}
                      <td className="px-6 py-4 text-[0.85rem] text-muted">{day.note ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Reveal>

        {hours.holidayNote && (
          <Reveal delay={140}>
            <p className="mt-6 flex items-start gap-3 text-[0.88rem] text-muted">
              <Icon name="calendar" size={17} className="mt-0.5 shrink-0 text-action" />
              {hours.holidayNote}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
