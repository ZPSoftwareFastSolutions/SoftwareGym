/**
 * CAPA: Presentation / Sections
 * Retícula de servicios. `limit` permite reutilizar la misma sección como
 * adelanto en la portada y como listado completo en /servicios: un componente,
 * dos usos, cero duplicación.
 */

import type { ServiceItem } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface ServicesSectionProps {
  readonly services: readonly ServiceItem[];
  readonly slug: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
  readonly limit?: number;
  readonly showCta?: boolean;
  readonly detailed?: boolean;
}

export function ServicesSection({
  services,
  slug,
  eyebrow = 'Servicios',
  title = 'Todo lo que necesitás, bajo el mismo techo',
  lead,
  limit,
  showCta = false,
  detailed = false,
}: ServicesSectionProps) {
  const visible = limit ? services.slice(0, limit) : services;
  if (visible.length === 0) return null;

  return (
    <section className="section" aria-labelledby="servicios-title">
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service, index) => (
            <li key={service.id}>
              <Reveal delay={Math.min(index, 5) * 70}>
                <article
                  className={cn(
                    'surface-card group flex h-full flex-col p-7',
                    'transition-[transform,border-color] duration-300',
                    'hover:-translate-y-1.5 hover:border-action/40',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-12 w-12 place-items-center rounded-[var(--t-radius-md)]',
                      'bg-structural/25 text-action',
                      'transition-colors duration-300 group-hover:bg-action group-hover:text-on-action',
                    )}
                  >
                    <Icon name={service.icon} size={23} />
                  </span>

                  <h3 className="t-h3 mt-6">{service.name}</h3>
                  <p className="mt-3 text-[0.94rem] leading-relaxed text-muted">
                    {detailed ? service.description : service.summary}
                  </p>

                  <ul className="mt-6 flex flex-col gap-2 border-t border-line pt-5">
                    {service.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2.5 text-[0.85rem] text-muted">
                        <Icon name="check" size={13} className="shrink-0 text-action" strokeWidth={2.6} />
                        {h}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        {showCta && (
          <Reveal delay={120}>
            <div className="mt-12 flex justify-center">
              <LinkButton
                href={tenantHref(slug, 'servicios')}
                variant="outline"
                size="lg"
                icon="arrowRight"
              >
                Ver todos los servicios
              </LinkButton>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
