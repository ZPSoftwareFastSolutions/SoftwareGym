'use client';

/**
 * CAPA: Presentation / Patterns (moléculas)
 *
 * Formulario de búsqueda y filtros de las listas del panel (V4).
 *
 * Antes era un `<form method="get">` nativo: cada búsqueda recargaba el
 * documento entero y, hasta que llegaba, la pantalla no decía nada. Con el
 * `Form` de Next la búsqueda navega en el cliente (la cabecera y la navegación no
 * se vuelven a pedir) y el botón sabe que está esperando: se deshabilita y gira.
 * Sigue siendo GET: el filtro vive en la URL y se puede compartir.
 */

import type { ReactNode } from 'react';
import Form from 'next/form';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { Spinner } from '../ui/Cargando';
import { Icon, type AnyIconKey } from '../icons/Icon';

export function FormularioDeFiltro({
  ruta,
  className,
  children,
}: {
  readonly ruta: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <Form action={ruta} className={className} scroll={false}>
      {children}
    </Form>
  );
}

export function BotonDeFiltrar({ texto = 'Filtrar', icono = 'filter', className }: { readonly texto?: string; readonly icono?: AnyIconKey; readonly className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 font-semibold text-on-action hover:bg-action-strong disabled:cursor-wait disabled:opacity-80',
        className,
      )}
    >
      {pending ? <Spinner tamano={16} /> : <Icon name={icono} size={16} />}
      {pending ? 'Buscando…' : texto}
    </button>
  );
}
