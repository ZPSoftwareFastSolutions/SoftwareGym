/**
 * CAPA: Presentation / UI (átomo)
 *
 * Botón y enlace-botón del sistema. No conoce el dominio: no sabe que existen
 * gimnasios ni planes. Recibe props y se pinta.
 *
 * Las variantes son un ENUM (`variant="primary"`), no un conjunto de booleanos
 * (`isPrimary` + `isGhost`): booleanos combinables producen 2^n estados, la
 * mayoría sin sentido y ninguno documentado.
 */

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type AnyIconKey } from '../icons/Icon';
import { GiroDeEnlace, IconoDeEnlace } from './IconoDeEnlace';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex items-center justify-center gap-2.5 font-semibold ' +
  'transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out ' +
  'select-none active:translate-y-px ' +
  'disabled:pointer-events-none disabled:opacity-45';

const VARIANTS: Record<ButtonVariant, string> = {
  // `relleno-de-marca` (no `fill-*`, que es la utilidad de Tailwind para SVG): con acabado metálico el botón lleva el degradado de la marca;
  // con acabado sólido no pinta nada y queda el color de siempre.
  primary: 'relleno-de-marca bg-action text-on-action hover:bg-action-strong',
  secondary: 'bg-card text-ink border border-line hover:border-action hover:text-action',
  outline: 'border border-action text-action hover:bg-action hover:text-on-action',
  ghost: 'text-ink/90 hover:text-action',
};

/**
 * El área táctil mínima es 44 px de alto en `md` y `lg` (WCAG 2.2 + HIG).
 *
 * V4.2 · ALTURA MÍNIMA, NO FIJA. Con altura fija y `nowrap`, un texto largo en
 * versalitas («PEDIR A RECEPCIÓN POR WHATSAPP») no podía partirse en un
 * teléfono: se salía del botón o lo ensanchaba más que la pantalla. Un botón de
 * ancho completo ahora parte su texto en dos líneas y crece; uno de ancho
 * natural sigue sin partirse. En una línea, la medida es la misma de siempre.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 py-2 text-[0.82rem] tracking-wide',
  md: 'min-h-12 px-5 py-2.5 text-[0.9rem] tracking-wide sm:px-6',
  lg: 'min-h-14 px-6 py-3 text-[0.95rem] tracking-wide sm:px-8',
};

interface CommonProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: AnyIconKey;
  readonly iconPosition?: 'start' | 'end';
  readonly fullWidth?: boolean;
  readonly glow?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

function composeClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
  glow,
  className,
}: CommonProps): string {
  return cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    'rounded-[var(--t-radius-md)]',
    't-label',
    fullWidth ? 'w-full whitespace-normal text-center leading-snug' : 'whitespace-nowrap',
    // V4.2 · el brillo obedece a `shape.glowIntensity` de la marca: con 1 es el
    // de siempre y con 0 desaparece. Antes estaba fijo y una marca sin neón lo
    // seguía teniendo en sus botones.
    glow && variant === 'primary' && 'shadow-[0_0_calc(28px*var(--t-glow-strength))_calc(-6px*var(--t-glow-strength))_var(--t-action)]',
    className,
  );
}

function Content({ icon, iconPosition = 'end', children }: CommonProps) {
  return (
    <>
      {icon && iconPosition === 'start' && <Icon name={icon} size={18} className="shrink-0" />}
      <span className="min-w-0">{children}</span>
      {icon && iconPosition === 'end' && <Icon name={icon} size={18} className="shrink-0" />}
    </>
  );
}

/** Igual que `Content`, pero dentro de un `<Link>`: el icono gira mientras carga el destino (V4). */
function LinkContent({ icon, iconPosition = 'end', children }: CommonProps) {
  return (
    <>
      {icon && iconPosition === 'start' && <IconoDeEnlace name={icon} size={18} className="shrink-0" />}
      <span className="min-w-0">{children}</span>
      {icon && iconPosition === 'end' && <IconoDeEnlace name={icon} size={18} className="shrink-0" />}
      {!icon && <GiroDeEnlace size={16} />}
    </>
  );
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;

export function Button({ type = 'button', ...props }: ButtonProps) {
  const { variant, size, icon, iconPosition, fullWidth, glow, children, className, ...rest } = props;

  return (
    <button type={type} className={composeClasses(props)} {...rest}>
      <Content {...props} />
    </button>
  );
}

type LinkButtonProps = CommonProps & {
  readonly href: string;
  readonly external?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | 'href'>;

export function LinkButton(props: LinkButtonProps) {
  const {
    href,
    external,
    variant,
    size,
    icon,
    iconPosition,
    fullWidth,
    glow,
    children,
    className,
    ...rest
  } = props;

  const classes = composeClasses(props);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        // `noopener` evita que el destino manipule `window.opener`;
        // `noreferrer` no filtra la URL de origen.
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        <Content {...props} />
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      <LinkContent {...props} />
    </Link>
  );
}
