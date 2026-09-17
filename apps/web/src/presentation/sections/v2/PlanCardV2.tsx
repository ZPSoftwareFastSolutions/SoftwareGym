'use client';

import type { MembershipPlan } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { Icon } from '@/presentation/icons/Icon';
import { LinkButton } from '@/presentation/ui/Button';

interface PlanCardV2Props {
  readonly plan: MembershipPlan;
  readonly href: string;
}

export function PlanCardV2({ plan, href }: PlanCardV2Props) {
  const { featured } = plan;

  return (
    <article
      className={cn(
        'relative flex flex-col h-full w-full max-w-[400px] mx-auto rounded-[32px] overflow-hidden',
        'backdrop-blur-xl border transition-all duration-500',
        featured
          ? 'bg-[#121a14]/80 border-action/50 shadow-[0_0_50px_rgba(57,255,20,0.15)] z-20 md:-translate-y-4 md:scale-[1.05]'
          : 'bg-black/60 border-white/10 hover:border-white/30 z-10'
      )}
    >
      {/* Resplandor superior para el destacado */}
      {featured && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-action to-transparent shadow-[0_0_20px_var(--color-action)]" />
      )}

      <div className="flex flex-col flex-1 p-8 md:p-10">
        <header className="mb-8">
          {plan.badge && (
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4",
              featured ? "bg-action text-black" : "bg-white/10 text-white"
            )}>
              {plan.badge}
            </span>
          )}
          <h3 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
            {plan.name}
          </h3>
          <p className="mt-2 text-sm text-white/60">{plan.tagline}</p>
        </header>

        <div className="mb-8 flex items-baseline gap-2">
          <span className="text-xl font-medium text-white/50">{plan.currency}</span>
          <span className="text-6xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--t-font-display)' }}>
            {plan.price.toLocaleString('es-BO')}
          </span>
        </div>

        <ul className="flex-1 flex flex-col gap-4 mb-10">
          {plan.features.map((feature) => (
            <li key={feature.label} className={cn(
              "flex items-start gap-3",
              feature.included ? "text-white/90" : "text-white/30"
            )}>
              <span className={cn(
                "flex-shrink-0 mt-1 flex items-center justify-center w-5 h-5 rounded-full",
                feature.included ? "bg-action/20 text-action" : "bg-white/5 text-white/20"
              )}>
                <Icon name={feature.included ? 'check' : 'close'} size={12} strokeWidth={3} />
              </span>
              <span className={cn("text-sm leading-relaxed", !feature.included && "line-through")}>
                {feature.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6 border-t border-white/10">
          <LinkButton
            href={href}
            fullWidth
            size="lg"
            variant={featured ? 'primary' : 'outline'}
            className={cn(
              "h-14 text-base",
              !featured && "text-white border-white/20 hover:bg-white hover:text-black"
            )}
          >
            {plan.ctaLabel}
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
