/**
 * CAPA: Presentation / Sections
 * Instalaciones: alterna imagen y texto en filas para dar ritmo de lectura.
 */

import type { FacilityItem } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Badge } from '../ui/Badge';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface FacilitiesSectionProps {
  readonly facilities: readonly FacilityItem[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
  readonly layout?: 'rows' | 'grid';
}

export function FacilitiesSection({
  facilities,
  eyebrow = 'Instalaciones',
  title = 'El espacio también entrena',
  lead,
  layout = 'rows',
}: FacilitiesSectionProps) {
  if (facilities.length === 0) return null;

  if (layout === 'grid') {
    return (
      <section className="section" aria-labelledby="instalaciones-title">
        <div className="shell">
          <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility, index) => (
              <li key={facility.id}>
                <Reveal delay={Math.min(index, 5) * 70}>
                  <article className="surface-card h-full overflow-hidden">
                    <ArtFrame seed={index * 29 + 13} icon={facility.icon} ratio="16 / 10" />
                    <div className="p-6">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="t-h3">{facility.name}</h3>
                        <Badge tone="neutral">{facility.area}</Badge>
                      </div>
                      <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
                        {facility.description}
                      </p>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="section" aria-labelledby="instalaciones-title">
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        <div className="mt-16 flex flex-col gap-16 lg:gap-24">
          {facilities.map((facility, index) => {
            const reversed = index % 2 === 1;

            return (
              <Reveal key={facility.id}>
                <article
                  className={cn(
                    'grid items-center gap-8 lg:grid-cols-2 lg:gap-14',
                    reversed && 'lg:[&>*:first-child]:order-2',
                  )}
                >
                  <ArtFrame
                    seed={index * 37 + 5}
                    icon={facility.icon}
                    ratio="4 / 3"
                    className="w-full"
                  />

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid h-11 w-11 place-items-center rounded-[var(--t-radius-md)] bg-structural/25 text-action"
                      >
                        <Icon name={facility.icon} size={21} />
                      </span>
                      <Badge tone="neutral">{facility.area}</Badge>
                    </div>

                    <h3 className="t-h2 mt-5">{facility.name}</h3>
                    <p className="t-lead mt-4">{facility.description}</p>

                    <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-line">
                      {facility.stats.map((stat) => (
                        <div key={stat.label} className="bg-surface px-4 py-5 text-center">
                          <dt className="text-[0.7rem] uppercase tracking-[0.12em] text-muted">
                            {stat.label}
                          </dt>
                          <dd className="mt-2 text-lg font-bold text-ink">{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
