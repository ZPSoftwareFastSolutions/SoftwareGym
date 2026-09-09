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

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex items-center justify-center gap-2.5 font-semibold ' +
  'transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out ' +
  'select-none whitespace-nowrap active:translate-y-px ' +
  'disabled:pointer-events-none disabled:opacity-45';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-action text-on-action hover:bg-action-strong',
  secondary: 'bg-card text-ink border border-line hover:border-action hover:text-action',
  outline: 'border border-action text-action hover:bg-action hover:text-on-action',
  ghost: 'text-ink/90 hover:text-action',
};

/** El área táctil mínima es 44 px de alto en `md` y `lg` (WCAG 2.2 + HIG). */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-[0.82rem] tracking-wide',
  md: 'h-12 px-6 text-[0.9rem] tracking-wide',
  lg: 'h-14 px-8 text-[0.95rem] tracking-wide',
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
    fullWidth && 'w-full',
    glow && variant === 'primary' && 'shadow-[0_0_28px_-6px_var(--t-action)]',
    className,
  );
}

function Content({ icon, iconPosition = 'end', children }: CommonProps) {
  return (
    <>
      {icon && iconPosition === 'start' && <Icon name={icon} size={18} />}
      <span>{children}</span>
      {icon && iconPosition === 'end' && <Icon name={icon} size={18} />}
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
      <Content {...props} />
    </Link>
  );
}
