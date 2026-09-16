/**
 * CAPA: Presentation / UI (molécula)
 *
 * Logotipo compuesto tipográficamente a partir de `branding.logo`.
 *
 * Se resuelve con tipografía y CSS en lugar de con un archivo de imagen porque
 * así hereda el tema del tenant, escala sin pérdida, pesa cero bytes de red y
 * no exige que cada gimnasio entregue un SVG antes de poder ver su sitio.
 * Cuando el cliente aporte su logotipo real, este componente es el único punto
 * a tocar.
 */

import Link from 'next/link';
import type { BrandLogo } from '@core/domain/tenant/branding';
import { cn } from '@/lib/cn';

interface LogoProps {
  readonly logo: BrandLogo;
  readonly href: string;
  readonly name: string;
  readonly compact?: boolean;
}

/** El fragmento acentuado del wordmark, si lo hay y aparece en él. */
function partirWordmark(logo: BrandLogo): readonly [string, string, string] {
  const acento = logo.wordmarkAccent?.trim();
  const indice = acento ? logo.wordmark.lastIndexOf(acento) : -1;
  if (!acento || indice < 0) return [logo.wordmark, '', ''];
  return [logo.wordmark.slice(0, indice), acento, logo.wordmark.slice(indice + acento.length)];
}

export function Logo({ logo, href, name, compact = false }: LogoProps) {
  const [antes, acento, despues] = partirWordmark(logo);
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-[var(--t-radius-sm)]"
      aria-label={`${name} — ir al inicio`}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative grid place-items-center font-bold leading-none',
          'border border-action/45 text-action',
          'rounded-[var(--t-radius-md)]',
          'transition-[box-shadow,border-color] duration-300',
          'group-hover:border-action',
          compact ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-xl',
        )}
        style={{
          fontFamily: 'var(--t-font-display)',
          background:
            'linear-gradient(140deg, color-mix(in srgb, var(--t-action) 14%, transparent), transparent 70%)',
          boxShadow: 'inset 0 0 22px -12px var(--t-action)',
        }}
      >
        {logo.monogram}
      </span>

      <span className="flex flex-col leading-none">
        <span
          className={cn('font-bold tracking-tight text-ink', compact ? 'text-base' : 'text-lg')}
          style={{
            fontFamily: 'var(--t-font-display)',
            textTransform: 'var(--t-heading-transform)' as never,
          }}
        >
          {antes}
          {acento && <span className="t-accent">{acento}</span>}
          {despues}
        </span>
        <span className="mt-0.5 whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[var(--t-submark-tracking)] text-muted">
          {logo.subMark}
        </span>
      </span>
    </Link>
  );
}
