/**
 * CAPA: Presentation / UI (molécula)
 *
 * Encabezado de sección. Unifica el ritmo tipográfico de todas las páginas:
 * cambiar aquí el espaciado lo cambia en el sitio entero.
 *
 * `as` permite fijar el nivel semántico correcto (`h1` en la cabecera de
 * página, `h2` en las secciones) sin duplicar el componente. Saltarse niveles
 * de encabezado rompe la navegación por landmarks del lector de pantalla.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';

interface SectionHeadingProps {
  readonly eyebrow?: string;
  readonly title: ReactNode;
  readonly lead?: string;
  readonly align?: 'start' | 'center';
  readonly as?: 'h1' | 'h2' | 'h3';
  readonly size?: 'display' | 'h1' | 'h2';
  readonly children?: ReactNode;
  readonly className?: string;
}

const SIZE_CLASS = {
  display: 't-display',
  h1: 't-h1',
  h2: 't-h2',
} as const;

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'start',
  as: Tag = 'h2',
  size = 'h2',
  children,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <span className="t-eyebrow">{eyebrow}</span>
        </Reveal>
      )}

      <Reveal delay={60}>
        <Tag className={cn(SIZE_CLASS[size], 'max-w-3xl')}>{title}</Tag>
      </Reveal>

      {lead && (
        <Reveal delay={120}>
          <p className={cn('t-lead max-w-2xl', align === 'center' && 'mx-auto')}>{lead}</p>
        </Reveal>
      )}

      {children && <Reveal delay={180}>{children}</Reveal>}
    </div>
  );
}
