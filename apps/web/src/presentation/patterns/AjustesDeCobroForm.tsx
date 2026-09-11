'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Configuración del cobro por QR del gimnasio:
 * - `AjustesDeCobroForm`: titular, banco, instrucción y MODALIDAD (un QR para
 *   todos los planes o un QR por plan).
 * - `QrDeCobroForm`: la imagen de UN QR —el general o el de un plan—, si es de
 *   monto libre o exacto y su vencimiento.
 *
 * Cada gimnasio sube los suyos desde aquí: el QR es CONFIGURACIÓN que cambia
 * cuando cambia la cuenta, no algo que se despliega con el código. Y la fecha
 * de vencimiento no es decorativa: los QR bancarios caducan, y al pasar la
 * fecha la página de planes deja de enseñarlo en vez de mandar a la gente a
 * pagar a un QR que el banco ya rechaza.
 *
 * Nada de lo que se elige aquí es la autorización: la acción y la base vuelven
 * a comprobar gimnasio, permiso, plan e importe.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { fechaLarga, importe } from '@/lib/formato';
import { guardarAjustesDeCobro, guardarQrDeCobro } from '@/app/[tenant]/panel/comprobantes/actions';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { NOMBRE_DE_MODO_DE_QR, type ModoDeMonto, type ModoDeQr } from '@core/domain/operations/cobro-qr';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon } from '../icons/Icon';
import { SelectorDeImagen } from './SelectorDeImagen';

function Guardar({ etiqueta }: { readonly etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : 'check'} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Guardando…' : etiqueta}
    </button>
  );
}

function Resultado({ estado }: { readonly estado: EstadoDeFormulario }) {
  if (!estado.exito && !estado.mensaje) return null;
  return (
    <p
      role="status"
      className={cn(
        'rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.88rem]',
        estado.exito ? 'border-action/40 bg-action/10' : 'border-structural/50 bg-structural/10',
      )}
    >
      {estado.exito ?? estado.mensaje}
    </p>
  );
}

const AYUDA_DE_MODO: Readonly<Record<ModoDeQr, string>> = {
  global: 'Todos los planes se pagan con el QR general. Es lo más simple si tu banco te dio un solo QR.',
  por_plan:
    'Cada plan usa su propio QR (por ejemplo, uno con el importe grabado). Si un plan no tiene el suyo, se usa el QR general.',
};

interface AjustesDeCobroFormProps {
  readonly slug: string;
  readonly holder: string | null;
  readonly bank: string | null;
  readonly note: string | null;
  readonly qrMode: ModoDeQr;
}

export function AjustesDeCobroForm(props: AjustesDeCobroFormProps) {
  const [estado, accion] = useActionState(guardarAjustesDeCobro, {});
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={props.slug} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[0.86rem] font-semibold">Modalidad de cobro</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(NOMBRE_DE_MODO_DE_QR) as ModoDeQr[]).map((modo) => (
            <label
              key={modo}
              className="flex cursor-pointer gap-3 rounded-[var(--t-radius-md)] border border-line p-4 transition-colors has-[:checked]:border-action has-[:checked]:bg-action/5"
            >
              <input type="radio" name="qrMode" value={modo} defaultChecked={props.qrMode === modo} className="mt-1 h-4 w-4 accent-[var(--t-action)]" />
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{NOMBRE_DE_MODO_DE_QR[modo]}</span>
                <span className="text-[0.82rem] leading-relaxed text-muted">{AYUDA_DE_MODO[modo]}</span>
              </span>
            </label>
          ))}
        </div>
        {errores.qrMode && <p role="alert" className="text-[0.8rem] text-structural">{errores.qrMode}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo id="cobro-titular" etiqueta="Titular de la cuenta" error={errores.holder} ayuda="Quien paga confirma a quién le paga.">
          <input name="holder" defaultValue={props.holder ?? ''} maxLength={120} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="cobro-banco" etiqueta="Banco" error={errores.bank}>
          <input name="bank" defaultValue={props.bank ?? ''} maxLength={80} placeholder="Ej. Banco Unión" className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="cobro-nota" etiqueta="Instrucción para quien paga" error={errores.note}>
          <input name="note" defaultValue={props.note ?? ''} maxLength={500} placeholder="Envía el comprobante desde tu panel" className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Resultado estado={estado} />
      <div>
        <Guardar etiqueta="Guardar datos de cobro" />
      </div>
    </form>
  );
}

interface QrDeCobroFormProps {
  readonly slug: string;
  /** Plan al que pertenece el QR; `null` = QR general (siempre de monto libre). */
  readonly plan: { readonly id: string; readonly name: string; readonly price: number; readonly currency: string } | null;
  /** QR guardado, si ya existe. */
  readonly actual: {
    readonly id: string;
    readonly amountMode: ModoDeMonto;
    readonly expiresOn: string | null;
    readonly updatedAt: string | null;
    readonly vencido: boolean;
  } | null;
}

export function QrDeCobroForm({ slug, plan, actual }: QrDeCobroFormProps) {
  const [estado, accion] = useActionState(guardarQrDeCobro, {});
  const [imagenRota, setImagenRota] = useState(false);
  const [modo, setModo] = useState<ModoDeMonto>(actual?.amountMode ?? 'libre');
  const errores = estado.errores ?? {};
  const prefijo = plan ? `qr-${plan.id}` : 'qr-general';

  return (
    <form action={accion} className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="planId" value={plan?.id ?? ''} />

      <div className="flex flex-col items-center gap-3">
        <div className="grid aspect-square w-full max-w-[15rem] place-items-center overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-white p-3">
          {actual && !actual.vencido && !imagenRota ? (
            <img
              src={`/${slug}/pago/qr?qr=${actual.id}&v=${encodeURIComponent(actual.updatedAt ?? '')}`}
              alt={plan ? `QR de cobro del plan ${plan.name}` : 'QR general de cobro'}
              className="h-full w-full object-contain"
              onError={() => setImagenRota(true)}
            />
          ) : (
            <span className="flex flex-col items-center gap-2 px-4 text-center text-[0.82rem] text-neutral-500">
              <Icon name="qr" size={34} />
              {actual?.vencido ? 'Este QR está vencido y no se muestra' : actual ? 'No se pudo cargar la imagen' : 'Todavía no hay QR'}
            </span>
          )}
        </div>
        {actual?.expiresOn && (
          <p className={cn('text-center text-[0.8rem]', actual.vencido ? 'font-semibold text-structural' : 'text-muted')}>
            {actual.vencido ? 'Venció el ' : 'Vence el '}
            {fechaLarga(actual.expiresOn)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <SelectorDeImagen
          id={`${prefijo}-imagen`}
          nombre="qr"
          etiqueta={actual ? 'Reemplazar imagen del QR' : 'Imagen del QR del banco'}
          obligatorio={!actual}
        />
        {errores.qr && <p role="alert" className="-mt-2 text-[0.8rem] text-structural">{errores.qr}</p>}
        {errores.planId && <p role="alert" className="text-[0.8rem] text-structural">{errores.planId}</p>}

        {plan ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[0.86rem] font-semibold">Importe del QR</legend>
            <label className="flex items-start gap-2 text-[0.88rem]">
              <input type="radio" name="amountMode" value="libre" checked={modo === 'libre'} onChange={() => setModo('libre')} className="mt-1 h-4 w-4 accent-[var(--t-action)]" />
              <span>
                <strong>Monto libre</strong> · quien paga escribe el importe en su app.
              </span>
            </label>
            <label className="flex items-start gap-2 text-[0.88rem]">
              <input type="radio" name="amountMode" value="exacto" checked={modo === 'exacto'} onChange={() => setModo('exacto')} className="mt-1 h-4 w-4 accent-[var(--t-action)]" />
              <span>
                <strong>Monto exacto</strong> · el QR ya trae grabado {importe(plan.price, plan.currency)}, el precio actual del plan.
              </span>
            </label>
            {modo === 'exacto' && (
              <p className="text-[0.8rem] leading-relaxed text-muted">
                Si cambias el precio del plan, este QR deja de ofrecerse hasta que subas uno nuevo con el importe correcto.
              </p>
            )}
            {errores.amountMode && <p role="alert" className="text-[0.8rem] text-structural">{errores.amountMode}</p>}
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="amountMode" value="libre" />
            <p className="text-[0.82rem] leading-relaxed text-muted">
              El QR general es de <strong>monto libre</strong>: sirve para cualquier plan y es el respaldo de los planes sin
              QR propio.
            </p>
          </>
        )}

        <Campo id={`${prefijo}-vence`} etiqueta="Vencimiento del QR" error={errores.expiresOn} ayuda="Figura debajo del QR en la app del banco. Déjalo vacío si no vence.">
          <input name="expiresOn" type="date" defaultValue={actual?.expiresOn ?? ''} className={cn(CLASE_DE_CONTROL, 'max-w-[14rem]')} />
        </Campo>

        <Resultado estado={estado} />
        <div>
          <Guardar etiqueta={actual ? 'Guardar cambios' : 'Publicar QR'} />
        </div>
      </div>
    </form>
  );
}
