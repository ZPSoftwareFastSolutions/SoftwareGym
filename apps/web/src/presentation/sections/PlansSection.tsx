/**
 * CAPA: Presentation / Sections
 * Retícula de planes de membresía, agrupada por familia comercial.
 */

import type { PlanGroup } from '@core/domain/catalog/catalog';
import type { CobroPorQr } from '@/lib/cobro';
import { cn } from '@/lib/cn';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { PaymentQrModal } from '../patterns/PaymentQrModal';
import { PlanCard } from '../patterns/PlanCard';
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
}: PlansSectionProps) {
  const withPlans = groups.filter((g) => g.plans.length > 0);
  if (withPlans.length === 0) return null;

  // Un solo grupo no necesita encabezado propio: repetiría el de la sección.
  const showGroupHeadings = withPlans.length > 1;
  const href = tenantHref(slug, 'contacto');

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
                      accion={
                        cobro ? (
                          <PaymentQrModal
                            slug={cobro.slug}
                            codigoDePlan={plan.id}
                            nombreDelPaquete={plan.name}
                            precio={`${plan.currency} ${plan.price.toLocaleString('es-BO')}`}
                            // Con cobro por QR contratado, el botón dice lo que
                            // hace: pagar. «Consultar» mandaba a un formulario.
                            etiquetaDelBoton="Pagar con QR"
                            destacado={plan.featured}
                            pago={cobro.pago}
                            whatsappHref={cobro.whatsappHref}
                            gimnasio={cobro.gimnasio}
                          />
                        ) : undefined
                      }
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
