/**
 * CAPA: Presentation / Sections
 * Retícula de planes de membresía.
 */

import type { MembershipPlan } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { PlanCard } from '../patterns/PlanCard';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface PlansSectionProps {
  readonly plans: readonly MembershipPlan[];
  readonly note: string;
  readonly slug: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

export function PlansSection({
  plans,
  note,
  slug,
  eyebrow = 'Planes',
  title = 'Elegí cómo querés entrenar',
  lead,
}: PlansSectionProps) {
  if (plans.length === 0) return null;

  // La retícula se adapta al número de planes configurado: tres para Mítico,
  // cuatro para Aurora. Ninguna clase está fijada a un tenant concreto.
  const columns = cn(
    'grid gap-6',
    plans.length === 2 && 'sm:grid-cols-2',
    plans.length === 3 && 'md:grid-cols-3',
    plans.length >= 4 && 'sm:grid-cols-2 xl:grid-cols-4',
  );

  return (
    <section className="section relative overflow-hidden" aria-labelledby="planes-title">
      <div aria-hidden="true" className="bg-aura opacity-60" />

      <div className="shell relative">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align="center" />

        <div className={cn(columns, 'mt-16 lg:mt-20')}>
          {plans.map((plan, index) => (
            <Reveal key={plan.id} delay={Math.min(index, 4) * 90} className="h-full">
              <PlanCard plan={plan} href={tenantHref(slug, 'contacto')} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <p className="mx-auto mt-12 flex max-w-2xl items-start justify-center gap-3 text-center text-[0.88rem] text-muted">
            <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-action" />
            <span>{note}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
