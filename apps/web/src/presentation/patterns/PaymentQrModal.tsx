/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Ventana de pago por QR de un paquete.
 *
 * ANTES el botón de un paquete llevaba a «Contacto», que obligaba al visitante
 * a salir de la página de precios, rellenar un formulario y esperar. Ahora se
 * abre aquí mismo, con el precio delante y la forma de pagar a la vista.
 *
 * El QR sale de la CONFIGURACIÓN del gimnasio, no de este componente: cada
 * cliente tiene el suyo, y un componente que supiera cuál pintar dejaría de
 * ser enlatado en el primer cliente nuevo. Mientras el gimnasio no entregue su
 * imagen, se reserva el hueco con su medida final y se explica cómo pagar; así
 * la ventana no cambia de tamaño el día que llegue la imagen.
 */

import type { PaymentQrInfo } from '@core/domain/tenant/tenant-config';
import { Modal } from '../ui/Modal';
import { Button, LinkButton } from '../ui/Button';
import { Icon } from '../icons/Icon';

interface PaymentQrModalProps {
  readonly nombreDelPaquete: string;
  readonly precio: string;
  readonly etiquetaDelBoton: string;
  readonly destacado: boolean;
  readonly pago: PaymentQrInfo;
  readonly whatsappHref: string;
  readonly gimnasio: string;
}

export function PaymentQrModal({
  nombreDelPaquete,
  precio,
  etiquetaDelBoton,
  destacado,
  pago,
  whatsappHref,
  gimnasio,
}: PaymentQrModalProps) {
  return (
    <Modal
      titulo={nombreDelPaquete}
      descripcion={`${precio} · pago por QR o en recepción`}
      anchoMaximo="sm"
      disparador={
        <Button
          variant={destacado ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          glow={destacado}
          icon="whatsapp"
          iconPosition="start"
        >
          {etiquetaDelBoton}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-[2rem] font-bold leading-none text-action">{precio}</p>

        {pago.imageSrc ? (
          <img
            src={pago.imageSrc}
            alt={pago.imageAlt ?? `Código QR para pagar en ${gimnasio}`}
            width={240}
            height={240}
            className="h-auto w-[15rem] rounded-[var(--t-radius-md)] bg-white p-3"
          />
        ) : (
          /* El hueco reservado tiene ya la medida final del QR: cuando llegue
             la imagen, la ventana no cambiará de alto y nadie tendrá que
             reajustar nada. */
          <div
            className="grid h-[15rem] w-[15rem] place-items-center rounded-[var(--t-radius-md)] border border-dashed border-line bg-raised"
            aria-hidden="true"
          >
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <Icon name="sparkle" size={22} className="text-muted" />
              <span className="text-[0.78rem] leading-relaxed text-muted">
                Aquí irá el QR de pago de {gimnasio}
              </span>
            </div>
          </div>
        )}

        {pago.holder && (
          <p className="text-[0.86rem] text-ink">
            <span className="text-muted">A nombre de </span>
            <strong className="font-semibold">{pago.holder}</strong>
            {pago.bank && <span className="text-muted"> · {pago.bank}</span>}
          </p>
        )}

        {pago.note && (
          <p className="max-w-[40ch] text-[0.85rem] leading-relaxed text-muted">{pago.note}</p>
        )}

        <LinkButton href={whatsappHref} external variant="primary" size="md" icon="whatsapp" iconPosition="start" fullWidth>
          Escribir por WhatsApp
        </LinkButton>
      </div>
    </Modal>
  );
}
