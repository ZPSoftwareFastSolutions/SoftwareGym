'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Alta y edición de una sucursal.
 *
 * El código se propone solo a partir del nombre mientras nadie lo haya tocado:
 * la mayoría de las veces «Zona Sur» → «ZONASUR» es exactamente lo que se
 * quiere, y quien necesita otro lo escribe. La validación es la del dominio,
 * repetida en la acción y otra vez en la base.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { guardarSucursal } from '@/app/[tenant]/panel/sucursales/actions';
import { sugerirCodigo, type Sucursal } from '@core/domain/operations/branches';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon } from '../icons/Icon';

interface SucursalFormProps {
  readonly slug: string;
  /** Sin sucursal, es un alta. */
  readonly sucursal?: Sucursal;
}

function Enviar({ texto }: { readonly texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : 'check'} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Guardando…' : texto}
    </button>
  );
}

function inicial(sucursal: Sucursal | undefined): Readonly<Record<string, string>> {
  if (!sucursal) return {};
  return {
    code: sucursal.code,
    name: sucursal.name,
    address: sucursal.address ?? '',
    phone: sucursal.phone ?? '',
    email: sucursal.email ?? '',
    openingHours: sucursal.openingHours ?? '',
    latitude: sucursal.latitude?.toString() ?? '',
    longitude: sucursal.longitude?.toString() ?? '',
    googleMapsUrl: sucursal.googleMapsUrl ?? '',
  };
}

export function SucursalForm({ slug, sucursal }: SucursalFormProps) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarSucursal, {});
  const valores = estado.valores ?? inicial(sucursal);
  const errores = estado.errores ?? {};
  const [codigo, setCodigo] = useState(valores.code ?? '');
  const [codigoTocado, setCodigoTocado] = useState(Boolean(sucursal));

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {sucursal && <input type="hidden" name="branchId" value={sucursal.id} />}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Campo id="sucursal-nombre" etiqueta="Nombre" error={errores.name} obligatorio ayuda="Como la reconoce la gente: «Centro», «Zona Sur».">
          <input
            name="name"
            defaultValue={valores.name}
            required
            minLength={2}
            maxLength={80}
            autoComplete="off"
            onChange={(evento) => {
              if (!codigoTocado) setCodigo(sugerirCodigo(evento.target.value));
            }}
            className={CLASE_DE_CONTROL}
          />
        </Campo>
        <Campo id="sucursal-codigo" etiqueta="Código" error={errores.code} obligatorio ayuda="Letras y números. Va en reportes.">
          <input
            name="code"
            value={codigo}
            onChange={(evento) => {
              setCodigoTocado(true);
              setCodigo(evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12));
            }}
            required
            pattern="[A-Z0-9]{2,12}"
            maxLength={12}
            autoComplete="off"
            className={cn(CLASE_DE_CONTROL, 'font-mono tracking-[0.08em]')}
          />
        </Campo>
      </div>

      <Campo id="sucursal-direccion" etiqueta="Dirección" error={errores.address} ayuda="Se muestra en la web y resuelve el mapa si no hay coordenadas.">
        <input name="address" defaultValue={valores.address} maxLength={200} className={CLASE_DE_CONTROL} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="sucursal-telefono" etiqueta="Teléfono de la sede" error={errores.phone} ayuda="Vacío: la web usa el teléfono general.">
          <input name="phone" type="tel" defaultValue={valores.phone} maxLength={40} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="sucursal-correo" etiqueta="Correo de la sede" error={errores.email}>
          <input name="email" type="email" defaultValue={valores.email} maxLength={120} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Campo id="sucursal-horario" etiqueta="Horario" error={errores.openingHours} ayuda="Una franja por línea. Ej.: «Lunes a viernes 05:30 a 23:00».">
        <textarea
          name="openingHours"
          defaultValue={valores.openingHours}
          maxLength={400}
          rows={3}
          className={cn(CLASE_DE_CONTROL, 'h-auto min-h-24 resize-y py-3')}
        />
      </Campo>

      <Campo id="sucursal-mapa" etiqueta="Enlace de Google Maps" error={errores.googleMapsUrl} ayuda="En Google Maps: Compartir → Copiar enlace. Es el botón «Ver ubicación» de la web.">
        <input name="googleMapsUrl" type="url" defaultValue={valores.googleMapsUrl} maxLength={300} placeholder="https://maps.app.goo.gl/…" className={CLASE_DE_CONTROL} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="sucursal-latitud" etiqueta="Latitud" error={errores.latitude} ayuda="Opcional. Fija el punto exacto del mapa.">
          <input name="latitude" inputMode="decimal" defaultValue={valores.latitude} maxLength={14} placeholder="-16.500000" className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="sucursal-longitud" etiqueta="Longitud" error={errores.longitude}>
          <input name="longitude" inputMode="decimal" defaultValue={valores.longitude} maxLength={14} placeholder="-68.150000" className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      {(estado.mensaje || estado.exito) && (
        <p
          role="status"
          className={cn(
            'flex items-start gap-2.5 rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.88rem] text-ink',
            estado.exito ? 'border-action/40 bg-action/10' : 'border-structural/50 bg-structural/10',
          )}
        >
          <Icon name={estado.exito ? 'check' : 'alert'} size={17} className={cn('mt-0.5 shrink-0', estado.exito ? 'text-action' : 'text-structural')} />
          {estado.exito ?? estado.mensaje}
        </p>
      )}

      <div className="flex justify-end">
        <Enviar texto={sucursal ? 'Guardar cambios' : 'Crear sucursal'} />
      </div>
    </form>
  );
}
