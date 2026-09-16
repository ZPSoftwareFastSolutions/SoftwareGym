/**
 * CAPA: Presentation / Sections
 *
 * El horario de atención dicho en pocas líneas, para la portada (V4.2).
 *
 * La tabla completa sigue en `/horarios`: allí se consulta día por día. En la
 * portada basta con lo que se pregunta al llegar —«¿a qué hora abren?»— dicho
 * como lo dice el propio gimnasio: «Lunes a Viernes · 07:00 – 22:00».
 * El agrupado de días lo decide el dominio (`resumirHorario`), que solo une
 * días CONSECUTIVOS con las mismas horas.
 *
 * Con clases contratadas ofrece también el calendario de clases: para quien
 * viene a Spinning o a Yoga, ése es su horario.
 */

import type { BusinessHours } from '@core/domain/tenant/tenant-config';
import { resumirHorario } from '@core/domain/tenant/horario';
import { tenantHref } from '@/lib/tenant-links';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface HoursSummarySectionProps {
  readonly hours: BusinessHours;
  readonly slug: string;
  readonly conClases: boolean;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

export function HoursSummarySection({
  hours,
  slug,
  conClases,
  eyebrow = 'Horarios',
  title = 'Cuándo puedes venir',
  lead,
}: HoursSummarySectionProps) {
  const tramos = resumirHorario(hours.week);
  if (tramos.length === 0) return null;

  return (
    <section className="section" aria-label={title}>
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <LinkButton href={tenantHref(slug, 'horarios')} variant="secondary" size="md" icon="arrowRight">
              Horario completo
            </LinkButton>
            {conClases && (
              <LinkButton href={tenantHref(slug, 'clases')} variant="primary" size="md" icon="arrowRight">
                Horario de clases
              </LinkButton>
            )}
          </div>
        </div>

        <Reveal delay={80}>
          <ul className={cn('mt-12 grid gap-px overflow-hidden rounded-[var(--t-radius-lg)] border border-line bg-line', tramos.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {tramos.map((tramo) => (
              <li key={tramo.dias} className="flex flex-col gap-3 bg-surface px-7 py-8">
                <span className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted">{tramo.dias}</span>
                <span
                  className={cn('text-4xl leading-none', tramo.cerrado ? 'text-muted' : 'text-ink')}
                  style={{ fontFamily: 'var(--t-font-display)' }}
                >
                  {tramo.horas}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        {hours.holidayNote && (
          <p className="mt-6 flex items-start gap-3 text-[0.88rem] text-muted">
            <Icon name="calendar" size={17} className="mt-0.5 shrink-0 text-action" />
            {hours.holidayNote}
          </p>
        )}
      </div>
    </section>
  );
}
