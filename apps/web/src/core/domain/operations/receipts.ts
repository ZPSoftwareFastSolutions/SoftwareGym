/**
 * CAPA: Domain / Operations
 *
 * Comprobantes de pago por QR.
 *
 * Un comprobante es la foto de una transferencia. No es un pago todavía: es
 * la PRUEBA de uno, y lo convierte en pago una persona del gimnasio al
 * revisarlo. Por eso tiene estado y por eso, una vez revisado, no se toca.
 */

import type { MetodoDePago } from './members';

export type EstadoDeComprobante = 'pendiente' | 'aprobado' | 'rechazado';
export type OrigenDeComprobante = 'recepcion' | 'socio';

export const NOMBRE_DE_ESTADO_DE_COMPROBANTE: Readonly<Record<EstadoDeComprobante, string>> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const NOMBRE_DE_ORIGEN: Readonly<Record<OrigenDeComprobante, string>> = {
  recepcion: 'Recepción',
  socio: 'Socio',
};

export function esEstadoDeComprobante(valor: unknown): valor is EstadoDeComprobante {
  return valor === 'pendiente' || valor === 'aprobado' || valor === 'rechazado';
}

export function esOrigenDeComprobante(valor: unknown): valor is OrigenDeComprobante {
  return valor === 'recepcion' || valor === 'socio';
}

export interface Comprobante {
  readonly id: string;
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly customerName: string;
  readonly customerPhone: string | null;
  readonly customerEmail: string | null;
  readonly planId: string | null;
  readonly planName: string | null;
  readonly membershipId: string | null;
  readonly paymentId: string | null;
  /** Importe que declaró quien subió la captura. */
  readonly amount: number;
  /** Precio del plan al subir el comprobante, fijado por la base. `null` sin plan. */
  readonly expectedAmount: number | null;
  /** Importe del pago con el que se aprobó. `null` mientras no esté aprobado. */
  readonly verifiedAmount: number | null;
  readonly currency: string;
  readonly method: MetodoDePago;
  readonly status: EstadoDeComprobante;
  readonly source: OrigenDeComprobante;
  readonly mimeType: TipoDeImagen;
  readonly sizeBytes: number;
  readonly note: string | null;
  readonly reviewNote: string | null;
  readonly createdAt: string;
  /** Fecha y hora en la zona del gimnasio, sin zona: `2026-09-10T18:04:00`. */
  readonly createdLocal: string;
  readonly receiptDate: string;
  readonly reviewedAt: string | null;
}

export interface FiltroDeComprobantes {
  readonly desde?: string;
  readonly hasta?: string;
  readonly estado?: EstadoDeComprobante;
  readonly origen?: OrigenDeComprobante;
  readonly planId?: string;
  readonly metodo?: MetodoDePago;
  readonly q?: string;
  readonly customerId?: string;
  readonly limite?: number;
}

export type TipoDeImagen = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Tope por imagen. Coincide con el límite del bucket en la base. El cliente
 * reduce la foto antes de subirla, así que en la práctica llegan de 200-600
 * KB; el tope existe para quien se salte el formulario.
 */
export const TAMANO_MAXIMO_DE_IMAGEN = 5 * 1024 * 1024;

/**
 * Tipo real de la imagen, leído de sus primeros bytes.
 *
 * NO del nombre ni del `Content-Type` que manda el navegador: los dos los
 * escribe quien sube el archivo. Un `factura.jpg` que en realidad es un HTML
 * servido luego desde nuestro dominio es un XSS almacenado. Los bytes
 * mágicos no se falsifican sin dejar de ser una imagen.
 */
export function detectarTipoDeImagen(bytes: Uint8Array): TipoDeImagen | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp';
  }
  return null;
}

export function extensionDeImagen(tipo: TipoDeImagen): 'jpg' | 'png' | 'webp' {
  return tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
}

/**
 * Nombre de archivo dentro del ZIP de comprobantes.
 *
 * Pensado para quien lo abre: el dueño de la cuenta del QR, que concilia
 * contra su extracto bancario. Fecha primero —para que el explorador los
 * ordene solos—, luego código e importe, que es lo que busca en el banco.
 * Sin tildes ni espacios: algunos descompresores de Windows todavía rompen
 * los nombres UTF-8 dentro de un ZIP.
 */
export function nombreEnZip(comprobante: Comprobante, indice: number): string {
  const limpiar = (texto: string) =>
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

  const hora = comprobante.createdLocal.slice(11, 16).replace(':', '');
  const importe = Number.isInteger(comprobante.amount)
    ? String(comprobante.amount)
    : comprobante.amount.toFixed(2).replace('.', ',');
  const partes = [
    comprobante.receiptDate,
    hora || '0000',
    limpiar(comprobante.customerCode ?? 'sin-codigo'),
    limpiar(comprobante.customerName),
    `${importe}${comprobante.currency === 'BOB' ? 'Bs' : comprobante.currency}`,
    comprobante.status,
  ];
  const numero = String(indice + 1).padStart(3, '0');
  return `${numero}_${partes.filter(Boolean).join('_')}.${extensionDeImagen(comprobante.mimeType)}`;
}

export function mensajeDeErrorDeComprobante(codigo: string): string {
  if (codigo.includes('comprobante_ya_revisado')) return 'Ese comprobante ya fue revisado por otra persona.';
  if (codigo.includes('motivo_requerido')) return 'Escribe el motivo del rechazo: el socio necesita saber qué corregir.';
  if (codigo.includes('comprobante_no_encontrado')) return 'Ese comprobante no existe.';
  if (codigo.includes('monto_insuficiente')) {
    return 'El importe verificado es menor que el precio del plan. No se puede aprobar: recházalo indicando el motivo.';
  }
  if (codigo.includes('monto_invalido')) return 'El importe verificado no es válido.';
  if (codigo.includes('pago_no_valido')) return 'El pago no corresponde a este socio.';
  if (codigo.includes('sin_permiso') || codigo.includes('42501')) return 'Tu cuenta no puede revisar comprobantes.';
  return 'No se pudo completar la revisión. Vuelve a intentarlo.';
}
