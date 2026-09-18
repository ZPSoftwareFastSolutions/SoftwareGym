/**
 * CAPA: Domain / Operations
 *
 * Alta del socio (V4.2): en línea o en recepción, y el paso de «socio
 * pendiente» a socio completo.
 *
 * «SOCIO PENDIENTE» NO ES UN ESTADO DE LA BASE. Es una lectura: la persona ya
 * tiene una membresía (su pago se aprobó) pero a su ficha le faltan los datos
 * que el gimnasio toma EN PERSONA —documento, teléfono, nacimiento—. Qué datos
 * son lo declara cada gimnasio (`TenantConfig.members.inPersonFields`); sin
 * declararlos no hay «pendiente» y la plataforma se comporta como siempre.
 * Recepción completa esos campos en la ficha de siempre y la condición se va
 * sola: no hay estado que alguien tenga que acordarse de cambiar.
 */

export type CampoDeFichaPresencial = 'documentId' | 'phone' | 'birthDate';

export const CAMPOS_DE_FICHA_PRESENCIAL: readonly CampoDeFichaPresencial[] = ['documentId', 'phone', 'birthDate'];

export const NOMBRE_DE_CAMPO_PRESENCIAL: Readonly<Record<CampoDeFichaPresencial, string>> = {
  documentId: 'documento de identidad',
  phone: 'teléfono',
  birthDate: 'fecha de nacimiento',
};

export interface FichaParaCompletar {
  readonly documentId: string | null;
  readonly phone: string | null;
  readonly birthDate: string | null;
}

/** Qué datos presenciales faltan en la ficha, en el orden declarado por el gimnasio. */
export function datosPresencialesPendientes(
  ficha: FichaParaCompletar,
  campos: readonly CampoDeFichaPresencial[],
): readonly CampoDeFichaPresencial[] {
  return campos.filter((campo) => {
    const valor = ficha[campo];
    return valor === null || valor.trim() === '';
  });
}

/** «documento de identidad, teléfono y fecha de nacimiento». */
export function listaDeCampos(campos: readonly CampoDeFichaPresencial[]): string {
  const nombres = campos.map((c) => NOMBRE_DE_CAMPO_PRESENCIAL[c]);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * En qué punto del alta está el socio que mira su panel.
 *
 * - `sin-ficha`: tiene cuenta pero todavía no pagó (o no hay alta en línea).
 * - `pago-en-revision`: subió su comprobante y espera a recepción. Sin QR.
 * - `sin-membresia`: tiene ficha pero ninguna membresía ni comprobante pendiente.
 * - `pendiente`: membresía aprobada, faltan datos presenciales. Con QR.
 * - `completo`: membresía y ficha completas.
 */
export type SituacionDelSocio = 'sin-ficha' | 'pago-en-revision' | 'sin-membresia' | 'pendiente' | 'completo';

export function situacionDelSocio(estado: {
  readonly tieneFicha: boolean;
  /** La ficha la creó el propio socio y aún no tiene ninguna membresía (regla de la base). */
  readonly fichaSinPagoAprobado: boolean;
  readonly comprobantesPendientes: number;
  readonly tieneMembresia: boolean;
  readonly datosPendientes: readonly CampoDeFichaPresencial[];
}): SituacionDelSocio {
  if (!estado.tieneFicha) return 'sin-ficha';
  if (!estado.tieneMembresia || estado.fichaSinPagoAprobado) {
    return estado.comprobantesPendientes > 0 ? 'pago-en-revision' : 'sin-membresia';
  }
  return estado.datosPendientes.length > 0 ? 'pendiente' : 'completo';
}

/**
 * El QR se enseña cuando la base dejaría entrar con él: nunca con una ficha
 * creada en línea que aún no tiene un pago aprobado. Una ficha de recepción sin
 * membresía lo conserva, como siempre (la entrada se registra y avisa).
 */
export function qrHabilitado(estado: { readonly tieneFicha: boolean; readonly fichaSinPagoAprobado: boolean }): boolean {
  return estado.tieneFicha && !estado.fichaSinPagoAprobado;
}

/** Mensaje legible de los errores del alta en línea (`crear_mi_ficha`). */
export function mensajeDeAltaEnLinea(codigo: string): string {
  if (codigo.includes('correo_sin_confirmar')) return 'Confirma tu correo antes de subir el comprobante: revisa tu bandeja.';
  if (codigo.includes('ficha_ambigua')) return 'Hay más de una ficha con tu correo. Acércate a recepción para que la unan a tu cuenta.';
  if (codigo.includes('ficha_de_otra_cuenta')) return 'Ya hay una ficha con tu correo unida a otra cuenta. Acércate a recepción.';
  if (codigo.includes('sin_permiso') || codigo.includes('sin_cuenta') || codigo.includes('42501')) {
    return 'Tu cuenta no puede darse de alta en línea en este gimnasio.';
  }
  return 'No pudimos preparar tu ficha de socio. Vuelve a intentarlo.';
}
