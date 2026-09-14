/**
 * CAPA: Presentation / UI (átomos)
 *
 * Indicadores de carga del panel (V4): un giro para acciones cortas y esqueletos
 * para páginas y tablas.
 *
 * Son la ÚLTIMA capa contra la sensación de congelamiento, no la primera: antes
 * se corrigió lo que tardaba (políticas evaluadas por fila, listas completas
 * para contar, sin paginar). Lo que todavía tarda —una red lenta, un reporte de
 * un año— al menos avisa en el acto de que la app respondió.
 *
 * Sin estado ni efectos: sirven igual en servidor (`loading.tsx`) que en cliente.
 * Respetan `prefers-reduced-motion`: sin movimiento, el aviso sigue siendo texto.
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

/** Giro con texto para lectores de pantalla y para quien no ve la animación. */
export function Cargando({ texto = 'Cargando…', className }: { readonly texto?: string; readonly className?: string }) {
  return (
    <p role="status" aria-live="polite" className={cn('flex items-center gap-2.5 text-[0.88rem] text-muted', className)}>
      <Spinner className="text-action" />
      {texto}
    </p>
  );
}

export function Esqueleto({ className }: { readonly className?: string }) {
  return <span aria-hidden="true" className={cn('block rounded-[var(--t-radius-sm)] bg-line/60 animate-pulse motion-reduce:animate-none', className)} />;
}

/** Filas grises con la forma de una tabla, mientras llegan los datos. */
export function EsqueletoDeTabla({ filas = 6, columnas = 4 }: { readonly filas?: number; readonly columnas?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
        {Array.from({ length: columnas }, (_, i) => (
          <Esqueleto key={i} className="h-3 w-2/3" />
        ))}
      </div>
      {Array.from({ length: filas }, (_, fila) => (
        <div key={fila} className="grid gap-4 border-t border-line pt-3" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
          {Array.from({ length: columnas }, (_, i) => (
            <Esqueleto key={i} className={cn('h-4', i === 0 ? 'w-5/6' : 'w-1/2')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** La forma de una página del panel: encabezado, tarjetas y una tabla. */
export function EsqueletoDePagina({ texto = 'Cargando la sección…' }: { readonly texto?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-col gap-3 p-6 sm:p-7">
        <Cargando texto={texto} />
        <Esqueleto className="h-6 w-56 max-w-full" />
        <Esqueleto className="h-4 w-96 max-w-full" />
      </section>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="surface-card flex flex-col gap-3 p-5">
            <Esqueleto className="h-3 w-24" />
            <Esqueleto className="h-7 w-16" />
            <Esqueleto className="h-3 w-32" />
          </div>
        ))}
      </div>
      <section className="surface-card p-6 sm:p-7">
        <EsqueletoDeTabla />
      </section>
    </div>
  );
}
