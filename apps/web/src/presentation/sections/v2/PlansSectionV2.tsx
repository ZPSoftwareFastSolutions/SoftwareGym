'use client';

import type { PlanGroup } from '@core/domain/catalog/catalog';
import { tenantHref } from '@/lib/tenant-links';
import { Reveal } from '@/presentation/ui/Reveal';
import { PlanCardV2 } from './PlanCardV2';

interface PlansProps {
  readonly groups: readonly PlanGroup[];
  readonly note: string;
  readonly slug: string;
  readonly hideTitle?: boolean;
}

export function PlansSectionV2({ groups, note, slug, hideTitle }: PlansProps) {
  const withPlans = groups.filter((g) => g.plans.length > 0);
  if (withPlans.length === 0) return null;
  const href = tenantHref(slug, 'v2/contacto?interes=planes');

  return (
    <section className="relative w-full py-16 overflow-visible">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        {!hideTitle && (
          <div className="mb-20 md:text-center max-w-3xl md:mx-auto">
            <Reveal>
              <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">La Inversión</h2>
              <h3 className="text-4xl md:text-6xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
                Elige tu nivel de compromiso
              </h3>
              <p className="mt-6 text-white/70 text-lg">
                Sin contratos forzosos. Sin letras pequeñas. Solo tú y tus resultados.
              </p>
            </Reveal>
          </div>
        )}

        <div className="flex flex-col gap-32">
          {withPlans.map((group) => (
            <div key={group.id} className="relative">
              {withPlans.length > 1 && (
                <Reveal>
                  <header className="mb-12 md:text-center">
                    <h4 className="text-3xl font-bold text-white mb-2">{group.name}</h4>
                    <p className="text-white/60">{group.description}</p>
                  </header>
                </Reveal>
              )}

              <div className="flex flex-col xl:flex-row justify-center items-stretch gap-8 xl:gap-6 w-full max-w-6xl mx-auto">
                {group.plans.map((plan, index) => (
                  <Reveal 
                    key={plan.id} 
                    delay={index * 150} 
                    className="flex-1 flex"
                  >
                    <PlanCardV2 plan={plan} href={href} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Reveal delay={200}>
          <div className="mt-20 flex items-center justify-center text-center">
            <p className="text-sm text-white/40 max-w-lg bg-white/5 px-6 py-3 rounded-full border border-white/10">
              {note}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
