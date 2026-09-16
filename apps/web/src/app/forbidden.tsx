/**
 * CAPA: Presentation / App — 403, acceso no autorizado (V4.2).
 *
 * La responde `forbidden()` cuando alguien AUTENTICADO pide algo que su cuenta
 * no puede: la sesión es válida y no se toca.
 *
 * POR QUÉ EXISTE. Antes esta situación se resolvía devolviendo a la persona a
 * su propio espacio, sin decir nada. El efecto era que pulsabas un enlace y
 * «no pasaba nada», y no había forma de saber si era un fallo o una norma.
 *
 * Y por qué NO es un 404: el recurso existe y la diferencia importa. Un 404 se
 * reserva para el tenant que no existe y para la capacidad que el gimnasio no
 * contrató —ahí sí, decir «existe pero no es para ti» filtraría qué módulos
 * tiene contratado otro cliente—.
 *
 * Sin marca de gimnasio a propósito: esta pantalla se sirve fuera del layout
 * del tenant y no puede resolver sus tokens de color.
 */

import Link from 'next/link';

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-muted">Error 403</p>

      <h1 className="t-h1">Tu cuenta no tiene acceso a esta sección</h1>

      <p className="t-lead">
        Tu sesión sigue abierta: no hace falta que vuelvas a entrar. Esta parte del sistema está
        reservada a otros roles. Si crees que deberías verla, pídeselo a la administración de tu
        gimnasio.
      </p>

      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-opacity hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
