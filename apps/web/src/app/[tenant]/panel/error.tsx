'use client';

/**
 * CAPA: Presentation / App — fallo temporal del panel (V4.2).
 *
 * LA REGLA QUE HACE CUMPLIR: **una operación fallida no cierra la sesión de
 * nadie.** Cuando no se puede comprobar la sesión —red, timeout, un 5xx de la
 * base— el panel ya no manda al formulario de acceso: enseña esto, con un
 * botón para reintentar, y las cookies siguen donde estaban. Al reintentar,
 * quien ya estaba dentro sigue dentro.
 *
 * Un límite de error NO tiene el problema del `loading.tsx` que se retiró en V4:
 * aquel adelantaba una respuesta 200 antes de que la página decidiera y rompía
 * los 307/404 reales. Éste solo actúa cuando el renderizado ya lanzó.
 */

import { useEffect } from 'react';

export default function ErrorDelPanel({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    // El detalle va al log del servidor, no a la pantalla: un mensaje de la
    // base puede nombrar tablas y columnas.
    console.error('Fallo en el panel:', error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-muted">
        No se pudo cargar
      </p>

      <h1 className="t-h2">Algo falló al preparar esta página</h1>

      <p className="t-lead">
        Tu sesión sigue abierta. Suele ser algo momentáneo: vuelve a intentarlo y, si se repite,
        avisa a la administración de tu gimnasio.
      </p>

      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-opacity hover:opacity-90"
      >
        Reintentar
      </button>
    </main>
  );
}
