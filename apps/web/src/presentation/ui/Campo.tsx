/**
 * CAPA: Presentation / UI (molécula)
 *
 * Campo de formulario: etiqueta, control, ayuda y error.
 *
 * El error se enlaza al control con `aria-describedby` y marca
 * `aria-invalid`: un lector de pantalla lo anuncia al entrar en el campo, no
 * solo quien lo ve en rojo. Y la etiqueta es un `<label for>` real, que además
 * agranda la zona pulsable en un móvil.
 *
 * No trae el control dentro: lo recibe como hijo. Un campo que supiera pintar
 * `input`, `select` y `textarea` terminaría con una prop por cada atributo de
 * los tres (§2.5, composición sobre configuración).
 */

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Clases compartidas por todos los controles de texto del panel. */
export const CLASE_DE_CONTROL =
  'h-12 w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-4 text-[0.92rem] text-ink ' +
  'placeholder:text-muted/70 transition-colors focus:border-action focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-action/40 aria-[invalid=true]:border-structural ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

interface CampoProps {
  readonly id: string;
  readonly etiqueta: string;
  readonly error?: string;
  readonly ayuda?: string;
  readonly obligatorio?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Campo({ id, etiqueta, error, ayuda, obligatorio = false, className, children }: CampoProps) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const descritoPor = [idAyuda, idError].filter(Boolean).join(' ') || undefined;

  const control = Children.only(children);
  const enlazado = isValidElement(control)
    ? cloneElement(control as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': descritoPor,
        'aria-required': obligatorio || undefined,
      })
    : control;

  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={id} className="mb-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {etiqueta}
        {obligatorio && (
          <span className="text-structural" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {enlazado}
      {ayuda && !error && (
        <p id={idAyuda} className="mt-1.5 text-[0.76rem] text-muted">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} role="alert" className="mt-1.5 text-[0.78rem] font-medium text-structural">
          {error}
        </p>
      )}
    </div>
  );
}
