/**
 * CAPA: Application / Cobro
 *
 * Caso de uso: qué QR se enseña para pagar un plan de un gimnasio.
 *
 * Lo usan la ventana «Pagar con QR» (`/pago/datos`), la imagen (`/pago/qr`) y
 * el panel del socio. Existe como caso de uso y no dentro de las rutas para
 * que las tres respondan con la MISMA elección: si la ventana dijera un QR y
 * la imagen sirviera otro, alguien pagaría a la cuenta equivocada.
 */

import type { AjustesDeCobro, PaymentSettingsPort, PlanPublico } from '../ports/receipts-repository.port';
import { seleccionarQrDeCobro, type ResultadoDeSeleccion } from '../../domain/operations/cobro-qr';

export interface CobroQrResuelto {
  readonly ajustes: AjustesDeCobro | null;
  /** Plan pedido, si existe y está activo. `null` = pago sin plan o código desconocido. */
  readonly plan: PlanPublico | null;
  readonly resultado: ResultadoDeSeleccion;
}

const PATRON_CODIGO = /^[a-z0-9][a-z0-9-]{0,39}$/;

export async function resolverCobroQr(
  puerto: PaymentSettingsPort,
  tenantSlug: string,
  codigoDePlan: string | null,
  hoy: string,
): Promise<CobroQrResuelto> {
  const [ajustes, { tenantId, qrs }] = await Promise.all([puerto.porSlug(tenantSlug), puerto.qrsPorSlug(tenantSlug)]);

  // El id del gimnasio sale de sus filas de cobro. Si no tiene ninguna, no hay
  // QR que ofrecer y el precio de la base no hace falta: la ventana enseña el
  // de la página y manda a recepción.
  const idDelGimnasio = ajustes?.tenantId ?? tenantId;
  const codigo = codigoDePlan?.trim().toLowerCase() ?? '';
  // El código llega en la URL: solo se busca si tiene forma de código.
  const plan =
    idDelGimnasio && codigo && PATRON_CODIGO.test(codigo) ? await puerto.planPorCodigo(idDelGimnasio, codigo) : null;

  return {
    ajustes,
    plan,
    resultado: seleccionarQrDeCobro({ modo: ajustes?.qrMode ?? 'global', qrs, plan, hoy }),
  };
}
