/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Tarjeta de plan de membresía.
 *
 * Las prestaciones NO incluidas se muestran atenuadas y tachadas en vez de
 * ocultarse: comunicar el límite del plan es lo que permite comparar, y evitar
 * la conversación incómoda en recepción.
 */

import type { ReactNode } from 'react';
import type { MembershipPlan } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/Button';

const PERIOD_LABEL: Record<MembershipPlan['period'], string> = {
  diario: 'por día',
  quincenal: 'por 15 días',
  mensual: 'por mes',
  trimestral: 'por trimestre',
  semestral: 'por semestre',
  anual: 'por año',
};

interface PlanCardProps {
  readonly plan: MembershipPlan;
  readonly href: string;
  /** Acción del pie. Si falta, se usa el enlace de `href`. */
  readonly accion?: ReactNode;
}

export function PlanCard({ plan, href, accion }: PlanCardProps) {
  const featured = plan.featured;

  return (
    <article
      className={cn(
        'surface-card relative flex flex-col p-7 lg:p-8 shimmer-effect overflow-hidden w-full max-w-sm mx-auto',
        'transition-all duration-500 ease-out',
        featured
          ? 'border-[var(--color-action)] lg:-translate-y-5 lg:scale-[1.08] z-20 shadow-[0_0_50px_rgba(57,255,20,0.3)]'
          : 'hover:-translate-y-2 hover:border-action/50 hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] z-10',
      )}
      style={{
        clipPath: featured 
          ? 'polygon(5% 0, 95% 0, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0 95%, 0 5%)'
          : 'polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%)',
      }}
    >
      {featured && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ boxShadow: '0 0 46px -18px var(--t-action), inset 0 0 40px -32px var(--t-action)' }}
        />
      )}

      {plan.badge && (
        <div className="absolute -top-3 start-7">
          <Badge tone={featured ? 'action' : 'structural'}>{plan.badge}</Badge>
        </div>
      )}

      <header className="relative">
        <h3 className="t-h3">{plan.name}</h3>
        <p className="mt-1.5 text-[0.88rem] text-muted">{plan.tagline}</p>
      </header>

      <div className="relative mt-6 flex items-end gap-2.5">
        <span className="text-[0.95rem] font-semibold text-muted">{plan.currency}</span>
        <span
          className="text-5xl font-bold leading-none text-ink"
          style={{ fontFamily: 'var(--t-font-display)' }}
        >
          {plan.price.toLocaleString('es-BO')}
        </span>
        <span className="pb-1 text-[0.85rem] text-muted">{PERIOD_LABEL[plan.period]}</span>
      </div>

      {/* Segundo precio del mismo paquete («con las dos sucursales»). Va pegado
          al precio y en la misma unidad, no como una prestación más de la
          lista: es una alternativa de compra, no algo que el paquete incluya. */}
      {plan.altPrice && (
        <p className="relative mt-2.5 flex items-baseline gap-2 text-[0.86rem]">
          <span className="font-semibold text-action">
            {plan.currency} {plan.altPrice.price.toLocaleString('es-BO')}
          </span>
          <span className="text-muted">{plan.altPrice.label}</span>
        </p>
      )}

      {plan.compareAtPrice && (
        <p className="relative mt-2 text-[0.85rem] text-muted">
          <span className="line-through">
            {plan.currency} {plan.compareAtPrice.toLocaleString('es-BO')}
          </span>{' '}
          <span className="font-semibold text-action">
            Ahorras {plan.currency} {(plan.compareAtPrice - plan.price).toLocaleString('es-BO')}
          </span>
        </p>
      )}

      <ul className="relative mt-7 flex flex-1 flex-col gap-3.5 border-t border-line pt-7">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              'flex items-start gap-3 text-[0.9rem]',
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
              <Icon name={feature.included ? 'check' : 'close'} size={12} strokeWidth={2.6} />
            </span>
            <span className={cn(!feature.included && 'line-through decoration-1')}>
              {feature.label}
            </span>
            <span className="sr-only">{feature.included ? '(incluido)' : '(no incluido)'}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-8">
        {/* Composición sobre configuración (§2.5): en vez de añadir props
            —«¿abre modal?», «¿qué modal?»— la tarjeta acepta la acción ya
            construida. Sin `accion` sigue siendo el enlace de siempre, así
            que ningún consumidor anterior se entera del cambio. */}
        {accion ?? (
          <LinkButton
            href={href}
            variant={featured ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            glow={featured}
          >
            {plan.ctaLabel}
          </LinkButton>
        )}
      </div>
    </article>
  );
}
