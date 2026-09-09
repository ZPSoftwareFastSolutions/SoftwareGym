/**
 * CAPA: Presentation / Sections
 *
 * Programas de entrenamiento personalizado.
 *
 * Sección propia, separada de la retícula de paquetes. Un paquete y un programa
 * no son alternativas del mismo tipo: ponerlos a comparar en la misma tabla
 * hace que el visitante lea «400 Bs» al lado de «180 Bs» y concluya que uno es
 * caro, cuando no está comparando lo mismo.
 *
 * La tarjeta no lleva nombre comercial: lo que identifica al programa es su
 * precio, lo que incluye y las rutinas asignadas.
 */

import type { TrainingPlan } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

const PERIOD_LABEL: Record<TrainingPlan['period'], string> = {
  diario: 'por día',
  quincenal: 'por 15 días',
  mensual: 'por mes',
  trimestral: 'por trimestre',
  semestral: 'por semestre',
  anual: 'por año',
};

interface TrainingPlansSectionProps {
  readonly plans: readonly TrainingPlan[];
  readonly slug: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
  readonly note?: string;
}

export function TrainingPlansSection({
  plans,
  slug,
  eyebrow = 'Entrenamientos personalizados',
  title = 'Descubrí el héroe que vive en vos',
  lead = 'Planes de entrenamiento con temática de superhéroes. Cada programa trae sus rutinas asignadas.',
  note,
}: TrainingPlansSectionProps) {
  if (plans.length === 0) return null;

  const href = tenantHref(slug, 'contacto');

  return (
    <section
      className="section relative overflow-hidden"
      aria-labelledby="entrenamientos-title"
    >
      <div aria-hidden="true" className="bg-aura opacity-40" />

      <div className="shell relative">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align="center" />

        <div
          className={cn(
            'mt-16 grid gap-6 lg:mt-20',
            plans.length === 2 && 'sm:grid-cols-2',
            plans.length === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
            plans.length >= 4 && 'sm:grid-cols-2 xl:grid-cols-4',
          )}
        >
          {plans.map((plan, index) => (
            <Reveal key={plan.id} delay={Math.min(index, 4) * 90} className="h-full">
              <article
                className={cn(
                  'surface-card relative flex h-full flex-col overflow-hidden',
                  'transition-[transform,border-color] duration-300',
                  plan.featured
                    ? 'border-action/60'
                    : 'hover:-translate-y-1 hover:border-action/35',
                )}
              >
                {/* Hueco reservado para la fotografía de referencia del
                    programa. Mientras no llegue, el marco generativo mantiene
                    el aspect ratio y evita el salto de layout. */}
                <ArtFrame
                  seed={plan.seed}
                  src={plan.imageSrc}
                  alt={plan.imageAlt ?? ''}
                  icon="trainer"
                  ratio="16 / 10"
                  className="w-full"
                />

                <div className="flex flex-1 flex-col p-7">
                  {plan.badge && (
                    <div className="mb-4">
                      <Badge tone={plan.featured ? 'action' : 'structural'}>{plan.badge}</Badge>
                    </div>
                  )}

                  <p className="flex items-end gap-2">
                    <span className="text-[0.9rem] font-semibold text-muted">{plan.currency}</span>
                    <span
                      className="text-4xl font-bold leading-none text-ink"
                      style={{ fontFamily: 'var(--t-font-display)' }}
                    >
                      {plan.price.toLocaleString('es-BO')}
                    </span>
                    <span className="pb-0.5 text-[0.82rem] text-muted">
                      {PERIOD_LABEL[plan.period]}
                    </span>
                  </p>

                  <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-line pt-6">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.label}
                        className={cn(
                          'flex items-start gap-3 text-[0.88rem]',
                          feature.included ? 'text-ink/90' : 'text-muted/55',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
                            feature.included ? 'bg-action/15 text-action' : 'bg-line/50 text-muted/60',
                          )}
                        >
                          <Icon
                            name={feature.included ? 'check' : 'close'}
                            size={12}
                            strokeWidth={2.6}
                          />
                        </span>
                        <span className={cn(!feature.included && 'line-through decoration-1')}>
                          {feature.label}
                        </span>
                        <span className="sr-only">
                          {feature.included ? '(incluido)' : '(no incluido)'}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 border-t border-line pt-6">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      Rutinas asignadas
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {plan.routines.map((routine) => (
                        <li key={routine}>
                          <Badge tone="structural">{routine}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-7">
                    <LinkButton
                      href={href}
                      variant={plan.featured ? 'primary' : 'secondary'}
                      size="lg"
                      fullWidth
                      glow={plan.featured}
                    >
                      {plan.ctaLabel}
                    </LinkButton>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {note && (
          <Reveal delay={150}>
            <p className="mx-auto mt-14 flex max-w-2xl items-start justify-center gap-3 text-center text-[0.88rem] text-muted">
              <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-action" />
              <span>{note}</span>
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
