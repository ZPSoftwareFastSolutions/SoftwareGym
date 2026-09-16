/**
 * CAPA: Presentation / UI (átomo)
 *
 * El giro de carga. Lo usa el enlace que se está siguiendo (`IconoDeEnlace`),
 * que es el único sitio de esta versión donde hay algo que esperar: las páginas
 * están prerenderizadas, así que aparece solo cuando la red va lenta.
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
