/**
 * CAPA: Presentation / UI (molécula)
 *
 * Estado vacío. Existe para que «no hay datos» no se confunda con «se rompió»:
 * son dos cosas distintas y el usuario no puede distinguirlas si las dos se
 * ven como una tabla en blanco.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type AnyIconKey } from '../icons/Icon';

interface EmptyStateProps {
  readonly icono?: AnyIconKey;
  readonly titulo: string;
  readonly descripcion?: string;
  readonly accion?: ReactNode;
  readonly className?: string;
}

export function EmptyState({ icono = 'sparkle', titulo, descripcion, accion, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-full bg-raised text-muted"
      >
        <Icon name={icono} size={20} />
      </span>
      <p className="text-[1rem] font-semibold text-ink">{titulo}</p>
      {descripcion && <p className="max-w-[38ch] text-[0.86rem] text-muted">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}
