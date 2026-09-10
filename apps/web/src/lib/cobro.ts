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

  const pago = tenant.content.paymentQr;
  if (!pago) return undefined;

  return {
    slug: tenant.slug,
    pago,
    whatsappHref: whatsappHref(tenant.contact),
    gimnasio: tenant.name,
  };
}
