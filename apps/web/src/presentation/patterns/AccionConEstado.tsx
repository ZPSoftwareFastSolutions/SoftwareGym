'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Un botón que ejecuta una acción de servidor y enseña su resultado.
 *
 * Para las acciones de un clic —archivar, restaurar, renovar el QR,
 * desvincular una cuenta—, que no merecen un formulario entero pero sí una
 * confirmación y una respuesta visible. Las destructivas piden confirmación:
 * archivar a un socio por un clic mal dado en una tabla es fácil y deshacerlo
 * obliga a encontrarlo entre los archivados.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { Icon, type AnyIconKey } from '../icons/Icon';

interface AccionConEstadoProps {
  readonly accion: (previo: EstadoDeFormulario, form: FormData) => Promise<EstadoDeFormulario>;
  readonly campos: Readonly<Record<string, string>>;
  readonly etiqueta: string;
  readonly icono?: AnyIconKey;
  readonly variante?: 'primario' | 'secundario' | 'peligro';
  /** Texto de confirmación. Si falta, no se pregunta. */
  readonly confirmar?: string;
  readonly className?: string;
}

const VARIANTES = {
  primario: 'bg-action text-on-action hover:bg-action-strong',
  secundario: 'border border-line text-ink hover:border-action hover:text-action',
  peligro: 'border border-structural/50 text-structural hover:bg-structural/10',
} as const;

function Boton({ etiqueta, icono, variante }: Pick<AccionConEstadoProps, 'etiqueta' | 'icono' | 'variante'>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-[var(--t-radius-md)] px-4 text-[0.86rem] font-semibold transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTES[variante ?? 'secundario'],
      )}
    >
      {icono && <Icon name={pending ? 'refresh' : icono} size={16} className={cn(pending && 'animate-spin')} />}
      {pending ? 'Un momento…' : etiqueta}
    </button>
  );
}

export function AccionConEstado({ accion, campos, etiqueta, icono, variante, confirmar, className }: AccionConEstadoProps) {
  const [estado, ejecutar] = useActionState(accion, {});

  return (
    <form
      action={ejecutar}
      onSubmit={(evento) => {
        if (confirmar && !window.confirm(confirmar)) evento.preventDefault();
      }}
      className={cn('flex flex-col gap-2', className)}
    >
      {Object.entries(campos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      <Boton etiqueta={etiqueta} icono={icono} variante={variante} />
      <p aria-live="polite" className={cn('text-[0.8rem]', estado.exito ? 'text-action' : 'text-structural')}>
        {estado.exito ?? estado.mensaje ?? ''}
      </p>
    </form>
  );
}
