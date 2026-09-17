/**
 * Datos de cobro por QR listos para la presentación.
 *
 * Vive aquí y no dentro de cada sección para que la condición —capacidad
 * contratada Y datos configurados— se escriba una sola vez. Repetida en tres
 * páginas, sería cuestión de tiempo que una se olvidara de comprobar la flag
 * y el gimnasio que no contrató el cobro por QR acabara ofreciéndolo.
 */

import type { PaymentQrInfo, TenantConfig } from '@core/domain/tenant/tenant-config';
import { whatsappHref } from './tenant-links';

export interface CobroPorQr {
  readonly slug: string;
  readonly pago: PaymentQrInfo;
  readonly whatsappHref: string;
  readonly gimnasio: string;
}

export function cobroDeTenant(tenant: TenantConfig): CobroPorQr | undefined {
  if (tenant.features.enablePayments !== true) return undefined;

  return {
    slug: tenant.slug,
    // V4.2 · El QR, el titular y el banco los guarda gerencia en la BASE
    // (`/panel/cobros`); la ventana los pide al abrirse. `paymentQr` del archivo
    // es solo respaldo. Antes se exigía, y un gimnasio con su QR ya cargado en
    // la base pero sin ese bloque (GOLD) no mostraba «Pagar con QR».
    pago: tenant.content.paymentQr ?? {},
    whatsappHref: whatsappHref(tenant.contact),
    gimnasio: tenant.name,
  };
}
