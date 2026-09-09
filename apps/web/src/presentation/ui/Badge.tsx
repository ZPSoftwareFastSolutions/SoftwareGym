/**
 * CAPA: Presentation / UI (átomo)
 * Etiqueta breve: "Más elegido", "Premium", estado de un tenant.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'action' | 'neutral' | 'structural';

const TONES: Record<BadgeTone, string> = {
  action: 'bg-action text-on-action',
  neutral: 'bg-card text-muted border border-line',
  structural: 'bg-structural text-white',
};

interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Badge({ tone = 'action', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1',
        'text-[0.66rem] font-bold uppercase tracking-[0.16em] leading-none',
        'rounded-[var(--t-radius-sm)]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
