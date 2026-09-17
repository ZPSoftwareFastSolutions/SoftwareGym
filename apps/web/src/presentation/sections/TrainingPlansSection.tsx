'use client';

import type { TrainingPlan } from '@core/domain/catalog/catalog';
import { tenantHref } from '@/lib/tenant-links';
import { cn } from '@/lib/cn';
import { Icon } from '@/presentation/icons/Icon';
import { LinkButton } from '@/presentation/ui/Button';
import { Reveal } from '@/presentation/ui/Reveal';

interface TrainingPlansProps {
  readonly plans: readonly TrainingPlan[];
  readonly slug: string;
}

export function TrainingPlansSection({ plans, slug }: TrainingPlansProps) {
  if (plans.length === 0) return null;

  return (
    <section className="relative w-full py-20 overflow-hidden">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        <div className="mb-16 md:text-center max-w-3xl md:mx-auto">
          <Reveal>
            <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">Rutinas Especiales</h2>
            <h3 className="text-4xl md:text-6xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
              Conviértete en héroe
            </h3>
            <p className="mt-4 text-white/70 text-lg">
              Entrenamientos personalizados inspirados en tus ídolos, con seguimiento y complementos incluidos.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            // Lógica de tema para superhéroes
            let emoji = '🦸';
            let bgClass = 'from-action/20 to-black';
            
            const lowerName = plan.name.toLowerCase();
            if (lowerName.includes('spider') || lowerName.includes('viuda')) {
              emoji = '🕷️';
              bgClass = 'from-red-600/30 to-black';
            } else if (lowerName.includes('batman') || lowerName.includes('gamora')) {
              emoji = '🦇';
              bgClass = 'from-purple-600/30 to-black';
            } else if (lowerName.includes('capitán') || lowerName.includes('marvel')) {
              emoji = '🛡️';
              bgClass = 'from-blue-600/30 to-black';
            } else if (lowerName.includes('thor') || lowerName.includes('fénix')) {
              emoji = '⚡';
              bgClass = 'from-amber-500/30 to-black';
            } else if (lowerName.includes('hulk') || lowerName.includes('maravilla')) {
              emoji = '🟢';
              bgClass = 'from-green-600/30 to-black';
            } else if (lowerName.includes('avengers')) {
              emoji = '♾️';
              bgClass = 'from-yellow-500/30 via-red-500/20 to-black';
            }

            return (
              <Reveal key={plan.id} delay={i * 100}>
                <article className={cn(
                  "group relative h-full flex flex-col p-8 overflow-hidden rounded-[32px] bg-black/60 border transition-all duration-500",
                  plan.featured 
                    ? "border-action/50 shadow-[0_0_30px_rgba(57,255,20,0.15)] md:-translate-y-2 md:scale-[1.02] z-20" 
                    : "border-white/10 hover:border-white/30 z-10 hover:-translate-y-1 hover:shadow-2xl"
                )}>
                  {/* Fondo temático */}
                  <div className={cn('absolute inset-0 bg-gradient-to-t z-0 opacity-80 group-hover:opacity-100 transition-opacity duration-500', bgClass)} />
                  
                  {/* Resplandor superior para destacados */}
                  {plan.featured && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-action to-transparent shadow-[0_0_20px_var(--color-action)] z-10" />
                  )}

                  {/* Gran emoji de fondo */}
                  <div className="absolute top-6 right-6 text-8xl opacity-[0.15] transform group-hover:scale-125 transition-transform duration-700 pointer-events-none z-0">
                    {emoji}
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl group-hover:bg-white/20 transition-colors duration-500 backdrop-blur-sm border border-white/5">
                      {emoji}
                    </div>
                    
                    {plan.badge && (
                      <span className="absolute top-0 right-0 bg-action text-black text-[0.65rem] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}

                    <h4 className="text-3xl font-black text-white mb-2 uppercase leading-none" style={{ fontFamily: 'var(--t-font-display)' }}>
                      {plan.name.replace('Rutina ', '')}
                    </h4>
                    <p className="text-white/60 text-sm mb-6 min-h-[40px]">{plan.tagline}</p>
                    
                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white/50">{plan.currency}</span>
                        <span className="text-5xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
                          {plan.price}
                        </span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-white/40">/{plan.period}</span>
                    </div>

                    <ul className="flex-1 space-y-4 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className={cn("flex items-start gap-3", !feature.included && "opacity-40")}>
                          <span className={cn(
                            "flex-shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded-full",
                            feature.included ? "bg-white/10 text-white" : "bg-white/5 text-white/20"
                          )}>
                            <Icon name={feature.included ? 'check' : 'close'} size={12} strokeWidth={3} />
                          </span>
                          <span className={cn("text-sm leading-snug text-white/90", !feature.included && "line-through")}>
                            {feature.label}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      <LinkButton
                        href={tenantHref(slug, `contacto?interes=${encodeURIComponent(plan.name)}`)}
                        fullWidth
                        size="lg"
                        variant={plan.featured ? 'primary' : 'outline'}
                        className={cn(
                          "h-14 text-base font-bold",
                          !plan.featured && "text-white border-white/20 hover:bg-white hover:text-black"
                        )}
                      >
                        {plan.ctaLabel}
                      </LinkButton>
                    </div>
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
