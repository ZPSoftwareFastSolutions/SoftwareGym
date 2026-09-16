/**
 * CAPA: Presentation / Sections
 * Planes de membresía, agrupados por familia comercial.
 *
 * V4.2 · DOS PRESENTACIONES, elegidas por el gimnasio (`home.planes`):
 *   tarjetas   la retícula de siempre, una tarjeta por plan;
 *   tarifario  filas como las de un folleto de precios: nombre y lo que
 *              incluye a la izquierda, el precio grande a la derecha. Se lee
 *              de arriba abajo comparando precios, que es como compara quien
 *              ya conoce el gimnasio y solo quiere saber cuánto cuesta.
 * Los datos, el cobro por QR y el enlace son los mismos en las dos.
 */

import type { ReactNode } from 'react';
import type { EstiloDePlanes } from '@core/domain/tenant/home-layout';
import type { MembershipPlan, PlanGroup } from '@core/domain/catalog/catalog';
import type { CobroPorQr } from '@/lib/cobro';
import { cn } from '@/lib/cn';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { PaymentQrModal } from '../patterns/PaymentQrModal';
import { PERIOD_LABEL, PlanCard } from '../patterns/PlanCard';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface PlansSectionProps {
  readonly groups: readonly PlanGroup[];
  readonly note: string;
  readonly slug: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
  /**
   * Cobro por QR. Cuando llega, el botón del paquete abre la ventana de pago
   * en vez de mandar al formulario de contacto. Ausente en los gimnasios que
   * no tienen la capacidad contratada, y entonces el botón es el de siempre.
   */
  readonly cobro?: CobroPorQr;
  /** V4.2 · Tarjetas (por defecto) o tarifario en filas. */
  readonly estilo?: EstiloDePlanes;
}

/** Una fila del tarifario. El precio va aparte para alinearse en columna. */
function FilaDeTarifario({ plan, accion }: { readonly plan: MembershipPlan; readonly accion: ReactNode }) {
  const incluye = plan.features.filter((f) => f.included);
  return (
    <li className="grid gap-5 py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-10">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h4 className={cn('t-h3', plan.featured && 'text-action')}>{plan.name}</h4>
          {plan.badge && <Badge tone="action">{plan.badge}</Badge>}
        </div>
        <p className="mt-1.5 text-[0.92rem] text-muted">{plan.tagline}</p>
        {incluye.length > 0 && (
          <p className="mt-3 text-[0.86rem] leading-relaxed text-ink/85">{incluye.map((f) => f.label).join(' · ')}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:justify-end">
        <p className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[0.9rem] font-semibold text-muted">{plan.currency}</span>
          <span className="text-5xl leading-none text-ink" style={{ fontFamily: 'var(--t-font-display)' }}>
            {plan.price.toLocaleString('es-BO')}
          </span>
          <span className="text-[0.82rem] text-muted">{PERIOD_LABEL[plan.period]}</span>
        </p>
        <div className="w-full sm:w-auto sm:min-w-[10rem]">{accion}</div>
      </div>
    </li>
  );
}

/**
 * La retícula se adapta al número de planes del grupo. Ninguna clase está
 * fijada a un tenant concreto: tres para una oferta corta, cuatro para una
 * larga, y el resto se reparte solo.
 */
function gridFor(count: number): string {
  // El hueco vertical es mayor que el horizontal a propósito: la tarjeta
  // destacada saca su distintivo por encima del borde, y con un `gap` simétrico
  // ese distintivo queda pegado a la tarjeta de la fila anterior.
  return cn(
    'grid gap-x-6 gap-y-10',
    count === 2 && 'sm:grid-cols-2',
    count === 3 && 'md:grid-cols-3',
    count >= 4 && 'sm:grid-cols-2 xl:grid-cols-3',
  );
}

export function PlansSection({
  groups,
  note,
  slug,
  eyebrow = 'Planes',
  title = 'Elige cómo quieres entrenar',
  lead,
  cobro,
  estilo = 'tarjetas',
}: PlansSectionProps) {
  const withPlans = groups.filter((g) => g.plans.length > 0);
  if (withPlans.length === 0) return null;

  // Un solo grupo no necesita encabezado propio: repetiría el de la sección.
  const showGroupHeadings = withPlans.length > 1;
  const href = tenantHref(slug, 'contacto');

  const accionDe = (plan: MembershipPlan): ReactNode =>
    cobro ? (
      <PaymentQrModal
        slug={cobro.slug}
        codigoDePlan={plan.id}
        nombreDelPaquete={plan.name}
        precio={`${plan.currency} ${plan.price.toLocaleString('es-BO')}`}
        // Con cobro por QR contratado, el botón dice lo que hace: pagar.
        // «Consultar» mandaba a un formulario.
        etiquetaDelBoton="Pagar con QR"
        destacado={plan.featured}
        pago={cobro.pago}
        whatsappHref={cobro.whatsappHref}
        gimnasio={cobro.gimnasio}
      />
    ) : undefined;

  if (estilo === 'tarifario') {
    return (
      <section className="section relative overflow-hidden" aria-labelledby="planes-title">
        <div className="shell relative">
          <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

          <div className="mt-12 grid gap-8 lg:mt-14">
            {withPlans.map((group) => (
              <Reveal key={group.id}>
                <div className="surface-card px-6 py-2 sm:px-10">
                  <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-6">
                    <h3 className="t-h2">{group.name}</h3>
                    <p className="text-[0.9rem] text-muted">{group.description}</p>
                  </header>
                  <ul className="divide-y divide-line">
                    {group.plans.map((plan) => (
                      <FilaDeTarifario
                        key={plan.id}
                        plan={plan}
                        accion={
                          accionDe(plan) ?? (
                            <LinkButton href={href} variant={plan.featured ? 'primary' : 'secondary'} size="md" fullWidth>
                              {plan.ctaLabel}
                            </LinkButton>
                          )
                        }
                      />
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mt-8 flex max-w-3xl items-start gap-3 text-[0.88rem] text-muted">
            <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-action" />
            <span>{note}</span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section relative overflow-hidden" aria-labelledby="planes-title">
      <div aria-hidden="true" className="bg-aura opacity-60" />

      <div className="shell relative">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align="center" />

        <div className="mt-16 flex flex-col gap-20 lg:mt-20">
          {withPlans.map((group) => (
            <div key={group.id}>
              {showGroupHeadings && (
                <Reveal>
                  {/* `mb-14` deja sitio al distintivo de la tarjeta destacada,
                      que sobresale 12 px por encima del borde superior. */}
                  <header className="mx-auto mb-14 max-w-2xl text-center">
                    <h3 className="t-h2 text-balance">{group.name}</h3>
                    <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-muted">
                      {group.description}
                    </p>
                  </header>
                </Reveal>
              )}

              <div className={gridFor(group.plans.length)}>
                {group.plans.map((plan, index) => (
                  <Reveal key={plan.id} delay={Math.min(index, 4) * 90} className="h-full">
                    <PlanCard
                      plan={plan}
                      href={href}
                      accion={accionDe(plan)}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Reveal delay={150}>
          <p className="mx-auto mt-16 flex max-w-2xl items-start justify-center gap-3 text-center text-[0.88rem] text-muted">
            <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-action" />
            <span>{note}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
