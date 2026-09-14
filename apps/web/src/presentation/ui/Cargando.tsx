/**
 * CAPA: Presentation / UI (átomo)
 *
 * El giro de carga del panel (V4). Lo usan el enlace que se está siguiendo
 * (`IconoDeEnlace`), la paginación, los filtros, el ZIP de comprobantes y los
 * formularios de personal: un solo indicador, el mismo en todas partes.
 *
 * Es la ÚLTIMA capa contra la sensación de congelamiento, no la primera: antes
 * se corrigió lo que tardaba (políticas evaluadas por fila, listas completas para
 * contar, sin paginar). Lo que todavía tarda —una red lenta— al menos avisa en el
 * acto de que la app respondió.
 *
 * Sin estado ni efectos. Respeta `prefers-reduced-motion`: sin movimiento, el
 * botón o el enlace siguen diciendo en texto que están esperando.
 */

import { cn } from '@/lib/cn';

export function Spinner({ tamano = 18, className }: { readonly tamano?: number; readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0 animate-spin motion-reduce:animate-none', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
