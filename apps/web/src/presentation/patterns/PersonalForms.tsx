'use client';

/**
 * CAPA: Presentation / Patterns (moléculas)
 *
 * Formularios de personal y roles (V4): otorgar un rol a una cuenta y, desde la
 * plataforma, designar el administrador de un gimnasio.
 *
 * Las opciones llegan YA FILTRADAS por la jerarquía desde el servidor (un
 * gerente no ve «Administración» en la lista), pero eso es cortesía: la base
 * rechaza lo mismo aunque alguien fabrique el envío.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { otorgarRol } from '@/app/[tenant]/panel/personal/actions';
import { designarAdministrador } from '@/app/[tenant]/panel/plataforma/actions';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Spinner } from '../ui/Cargando';
import { Icon } from '../icons/Icon';

function Enviar({ texto }: { readonly texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-4 text-[0.86rem] font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? <Spinner tamano={16} /> : <Icon name="key" size={16} />}
      {pending ? 'Guardando…' : texto}
    </button>
  );
}

function Mensaje({ estado }: { readonly estado: EstadoDeFormulario }) {
  const texto = estado.exito ?? estado.mensaje;
  if (!texto) return null;
  return (
    <p aria-live="polite" className={cn('text-[0.82rem]', estado.exito ? 'text-action' : 'text-structural')}>
      {texto}
    </p>
  );
}

export interface OpcionDeRol {
  readonly codigo: string;
  readonly nombre: string;
}

export function OtorgarRolForm({
  slug,
  cuentaId,
  opciones,
}: {
  readonly slug: string;
  readonly cuentaId: string;
  readonly opciones: readonly OpcionDeRol[];
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(otorgarRol, {});
  if (opciones.length === 0) return null;
  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="cuentaId" value={cuentaId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="sr-only" htmlFor={`rol-${cuentaId}`}>
          Rol a otorgar
        </label>
        <div className="min-w-[10rem] flex-1">
          <select id={`rol-${cuentaId}`} name="rol" required defaultValue="" className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Dar rol…
            </option>
            {opciones.map((opcion) => (
              <option key={opcion.codigo} value={opcion.codigo}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </div>
        <Enviar texto="Otorgar" />
      </div>
      <Mensaje estado={estado} />
    </form>
  );
}

export function DesignarAdministradorForm({ slug, tenantId, gimnasio }: { readonly slug: string; readonly tenantId: string; readonly gimnasio: string }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(designarAdministrador, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="tenantId" value={tenantId} />
      <Campo
        id={`admin-${tenantId}`}
        etiqueta="Correo de la cuenta"
        error={estado.errores?.correo}
        obligatorio
        ayuda={`La persona se registra antes en el sitio de ${gimnasio} y confirma su correo. Aquí solo se le da el rol: la plataforma no crea cuentas ni contraseñas.`}
      >
        <input name="correo" type="email" required maxLength={120} autoComplete="off" className={CLASE_DE_CONTROL} />
      </Campo>
      <div className="flex flex-wrap items-center gap-3">
        <Enviar texto="Designar administrador" />
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}
