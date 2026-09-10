/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * «Pagar con QR» de un paquete.
 *
 * La página de planes es estática y se sirve desde CDN, pero el QR lo cambia
 * gerencia cuando quiere. Por eso esta ventana no lleva el QR incrustado del
 * build: al abrirse pide los datos vigentes y la imagen a nuestras propias
 * rutas (`/pago/datos`, `/pago/qr`). El QR nuevo se ve al instante y la página
 * de planes sigue siendo estática.
 *
 * Y cierra el círculo del pago: pagar, subir el comprobante desde el panel,
 * recepción lo aprueba y la membresía se activa —y los dashboards cambian
 * solos, porque se calculan de los cobros—.
 */

import type { PaymentQrInfo } from '@core/domain/tenant/tenant-config';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ContenidoDePagoQr } from './ContenidoDePagoQr';

interface PaymentQrModalProps {
  readonly slug: string;
  readonly codigoDePlan: string;
  readonly nombreDelPaquete: string;
  readonly precio: string;
  readonly etiquetaDelBoton: string;
  readonly destacado: boolean;
  readonly pago: PaymentQrInfo;
  readonly whatsappHref: string;
  readonly gimnasio: string;
}

export function PaymentQrModal({
  slug,
  codigoDePlan,
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
      descripcion={`${precio} · pago por QR`}
      anchoMaximo="sm"
      // Los datos se piden al abrir, no al cargar la página: una lista de trece
      // paquetes no debe disparar trece peticiones que nadie ha pedido.
      montarSoloAbierto
      disparador={
        <Button variant={destacado ? 'primary' : 'secondary'} size="lg" fullWidth glow={destacado} icon="qr" iconPosition="start">
          {etiquetaDelBoton}
        </Button>
      }
    >
      <ContenidoDePagoQr
        slug={slug}
        codigoDePlan={codigoDePlan}
        precio={precio}
        respaldo={pago}
        whatsappHref={whatsappHref}
        gimnasio={gimnasio}
      />
    </Modal>
  );
}
