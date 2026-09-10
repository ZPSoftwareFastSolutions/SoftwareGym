'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Datos de cobro del gimnasio: la imagen del QR del banco, el titular y su
 * vencimiento.
 *
 * Cada gimnasio sube el suyo desde aquí: el QR es CONFIGURACIÓN que cambia
 * cuando cambia la cuenta, no algo que se despliega con el código. Y la fecha
 * de vencimiento no es decorativa: los QR bancarios caducan, y al pasar la
 * fecha la página de planes deja de enseñarlo en vez de mandar a la gente a
 * pagar a un QR que el banco ya rechaza.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { fechaLarga } from '@/lib/formato';
import { guardarAjustesDeCobro } from '@/app/[tenant]/panel/comprobantes/actions';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon } from '../icons/Icon';
import { SelectorDeImagen } from './SelectorDeImagen';

interface AjustesDeCobroFormProps {
  readonly slug: string;
  readonly holder: string | null;
  readonly bank: string | null;
  readonly note: string | null;
  readonly expiresOn: string | null;
  readonly tieneQr: boolean;
  readonly version: string | null;
  readonly hoy: string;
}

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : 'check'} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Guardando…' : 'Guardar datos de cobro'}
    </button>
  );
}

export function AjustesDeCobroForm(props: AjustesDeCobroFormProps) {
  const { slug, tieneQr, version, hoy } = props;
  const [estado, accion] = useActionState(guardarAjustesDeCobro, {});
  const [imagenRota, setImagenRota] = useState(false);
  const errores = estado.errores ?? {};
  const vencido = Boolean(props.expiresOn && props.expiresOn < hoy);

  return (
    <form action={accion} className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      <input type="hidden" name="tenantSlug" value={slug} />

      <div className="flex flex-col items-center gap-3">
        <div className="grid aspect-square w-full max-w-[17rem] place-items-center overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-white p-3">
          {tieneQr && !imagenRota ? (
            <img
              src={`/${slug}/pago/qr?v=${encodeURIComponent(version ?? '')}`}
              alt="QR de cobro publicado"
              className="h-full w-full object-contain"
              onError={() => setImagenRota(true)}
            />
          ) : (
            <span className="flex flex-col items-center gap-2 px-4 text-center text-[0.82rem] text-neutral-500">
              <Icon name="qr" size={34} />
              {vencido ? 'El QR está vencido y no se muestra' : 'Todavía no hay QR publicado'}
            </span>
          )}
        </div>
        {props.expiresOn && (
          <p className={cn('text-center text-[0.8rem]', vencido ? 'font-semibold text-structural' : 'text-muted')}>
            {vencido ? 'Venció el ' : 'Vence el '}
            {fechaLarga(props.expiresOn)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <SelectorDeImagen id="cobro-qr" nombre="qr" etiqueta={tieneQr ? 'Reemplazar imagen del QR' : 'Imagen del QR del banco'} obligatorio={!tieneQr} />
        {errores.qr && <p role="alert" className="-mt-2 text-[0.8rem] text-structural">{errores.qr}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="cobro-titular" etiqueta="Titular de la cuenta" error={errores.holder} ayuda="Quien paga confirma a quién le paga.">
            <input name="holder" defaultValue={props.holder ?? ''} maxLength={120} className={CLASE_DE_CONTROL} />
          </Campo>
          <Campo id="cobro-banco" etiqueta="Banco" error={errores.bank}>
            <input name="bank" defaultValue={props.bank ?? ''} maxLength={80} placeholder="Ej. Banco Unión" className={CLASE_DE_CONTROL} />
          </Campo>
          <Campo id="cobro-vence" etiqueta="Vencimiento del QR" error={errores.expiresOn} ayuda="Figura debajo del QR en la app del banco.">
            <input name="expiresOn" type="date" defaultValue={props.expiresOn ?? ''} className={CLASE_DE_CONTROL} />
          </Campo>
          <Campo id="cobro-nota" etiqueta="Instrucción para quien paga" error={errores.note}>
            <input name="note" defaultValue={props.note ?? ''} maxLength={500} placeholder="Envía el comprobante desde tu panel" className={CLASE_DE_CONTROL} />
          </Campo>
        </div>

        {(estado.exito || estado.mensaje) && (
          <p role="status" className={cn('rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.88rem]', estado.exito ? 'border-action/40 bg-action/10' : 'border-structural/50 bg-structural/10')}>
            {estado.exito ?? estado.mensaje}
          </p>
        )}
        <div>
          <Guardar />
        </div>
      </div>
    </form>
  );
}
