/**
 * CAPA: Presentation / Sections
 *
 * Horario semanal.
 *
 * En pantalla es una tabla real (`<table>`): un horario ES datos tabulares, y
 * un lector de pantalla necesita la relación fila/columna para anunciarlo. Un
 * conjunto de `div` con aspecto de tabla lo vuelve ininteligible.
 */

import type { BusinessHours } from '@core/domain/tenant/tenant-config';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface ScheduleSectionProps {
  readonly hours: BusinessHours;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

export function ScheduleSection({
  hours,
  eyebrow = 'Horarios',
  title = 'Cuándo puedes venir',
  lead,
}: ScheduleSectionProps) {
  return (
    <section className="section" aria-labelledby="horarios-title">
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        <Reveal delay={80}>
          {/* El contenedor scrollea, no la página: nunca hay scroll horizontal
              en el body por culpa de una tabla ancha. */}
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse overflow-hidden rounded-[var(--t-radius-lg)] border border-line">
              <caption className="sr-only">
                Horario de atención semanal. Zona horaria: {hours.timezone}.
              </caption>
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
                {hours.week.map((day) => (
                  <tr
                    key={day.day}
                    className={cn(
                      'border-t border-line transition-colors',
                      day.closed ? 'bg-raised/60 text-muted' : 'bg-surface hover:bg-raised',
                    )}
                  >
                    <th scope="row" className="px-6 py-4 text-start text-[0.95rem] font-semibold text-ink">
                      {day.day}
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
                ))}
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
