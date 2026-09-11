'use client';

/**
 * CAPA: Presentation / Patterns (molécula)
 *
 * Sede de trabajo de este dispositivo, en la cabecera del panel.
 *
 * Elegir otra sede la guarda al instante (sin botón «Aplicar»): en el
 * mostrador, un paso de más es un paso que se olvida y deja las entradas en la
 * sede equivocada. Sin JavaScript, el botón «Cambiar» hace lo mismo.
 *
 * Con una sola sede operable no hay nada que elegir: se muestra el nombre, y
 * así nadie duda de dónde está registrando.
 */

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { cambiarSucursalDeTrabajo } from '@/app/[tenant]/panel/actions';
import { Icon } from '../icons/Icon';

interface SelectorDeSucursalProps {
  readonly slug: string;
  readonly sucursales: readonly { readonly id: string; readonly name: string }[];
  readonly actualId: string;
}

function Estado() {
  const { pending } = useFormStatus();
  return (
    <span aria-live="polite" className="sr-only">
      {pending ? 'Cambiando de sucursal' : ''}
    </span>
  );
}

export function SelectorDeSucursal({ slug, sucursales, actualId }: SelectorDeSucursalProps) {
  const formulario = useRef<HTMLFormElement>(null);

  return (
    <form ref={formulario} action={cambiarSucursalDeTrabajo} className="flex items-center gap-2" data-print="hide">
      <input type="hidden" name="tenantSlug" value={slug} />
      <label htmlFor="sucursal-de-trabajo" className="flex items-center gap-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">
        <Icon name="pin" size={15} className="text-action" />
        Sucursal actual
      </label>
      <select
        // Remontar con la sede que confirmó el servidor: si rechazó el cambio,
        // el selector no puede quedarse enseñando una sede que no es la vigente.
        key={actualId}
        id="sucursal-de-trabajo"
        name="sucursal"
        defaultValue={actualId}
        onChange={() => formulario.current?.requestSubmit()}
        className={cn(
          'h-11 min-w-[10rem] rounded-[var(--t-radius-md)] border border-action/50 bg-raised px-3 text-[0.9rem] font-semibold text-ink',
          'focus:border-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action/40',
        )}
      >
        {sucursales.map((sucursal) => (
          <option key={sucursal.id} value={sucursal.id}>
            {sucursal.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-11 rounded-[var(--t-radius-md)] border border-line px-3 text-[0.84rem]">
          Cambiar
        </button>
      </noscript>
      <Estado />
    </form>
  );
}
