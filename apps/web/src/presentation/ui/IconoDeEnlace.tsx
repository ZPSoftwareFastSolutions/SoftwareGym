'use client';

/**
 * CAPA: Presentation / UI (átomos)
 *
 * El icono de un enlace, que gira mientras la página a la que lleva se carga.
 *
 * POR QUÉ NO `loading.tsx`. V4 puso primero un esqueleto por sección
 * (`panel/loading.tsx`). Funcionaba a la vista, pero un límite de carga hace que
 * Next envíe la respuesta con estado 200 ANTES de que la página decida: la
 * redirección al acceso sin sesión dejaba de ser un 307 y la capacidad apagada
 * dejaba de ser un 404 (pasaban a redirección y 404 dibujados en el navegador).
 * La regla del producto es «capacidad apagada = 404 real». El aviso vive ahora en
 * el enlace pulsado (`useLinkStatus`), que no toca la respuesta del servidor.
 *
 * Solo dentro de un `<Link>` de Next: fuera de él no hay navegación que observar.
 */

import { useLinkStatus } from 'next/link';
import { Icon, type AnyIconKey } from '../icons/Icon';
import { Spinner } from './Cargando';

export function IconoDeEnlace({ name, size = 16, className }: { readonly name: AnyIconKey; readonly size?: number; readonly className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner tamano={size} className={className} /> : <Icon name={name} size={size} className={className} />;
}

/** Para enlaces sin icono: un giro que solo aparece mientras se navega. */
export function GiroDeEnlace({ size = 16 }: { readonly size?: number }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner tamano={size} /> : null;
}
