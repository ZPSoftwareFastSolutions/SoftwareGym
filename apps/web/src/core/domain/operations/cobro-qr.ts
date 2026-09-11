/**
 * CAPA: Domain / Operations
 *
 * Cobro por QR: qué QR se enseña para cada plan y si un importe cubre lo que
 * cuesta.
 *
 * Todo es puro. Las reglas que protegen el dinero las aplica la base
 * (`payment_qr_codes`, disparadores de `payment_receipts`, RPC
 * `revisar_comprobante`); aquí se repiten para que la pantalla ofrezca el QR
 * correcto y avise antes de enviar, no para decidir.
 */

/** `global`: un QR para todo. `por_plan`: cada plan puede tener el suyo. */
export type ModoDeQr = 'global' | 'por_plan';

/** `libre`: quien paga escribe el importe. `exacto`: el QR trae el importe grabado. */
export type ModoDeMonto = 'libre' | 'exacto';

export interface QrDeCobro {
  readonly id: string;
  /** `null` = QR general del gimnasio. */
  readonly planId: string | null;
  readonly qrPath: string;
  readonly amountMode: ModoDeMonto;
  readonly fixedAmount: number | null;
  /** `YYYY-MM-DD`, o `null` si no vence. */
  readonly expiresOn: string | null;
  readonly updatedAt: string | null;
}

export interface PlanACobrar {
  readonly id: string;
  readonly price: number;
}

/**
 * Por qué un QR no se puede ofrecer:
 * - `vencido`: pasó su fecha; el banco ya lo rechaza.
 * - `monto_desactualizado`: es de importe exacto y el plan ya no cuesta eso;
 *   cobraría otra cifra.
 */
export type EstadoDeQr = 'vigente' | 'vencido' | 'monto_desactualizado';

export interface QrSeleccionado {
  readonly qr: QrDeCobro;
  /** De dónde salió: el QR propio del plan o el general como respaldo. */
  readonly origen: 'plan' | 'general';
  /** Importe grabado en el QR, si es exacto. */
  readonly montoExacto: number | null;
}

export type ResultadoDeSeleccion =
  | { readonly disponible: true; readonly seleccion: QrSeleccionado }
  /** `vencido`: había QR, pero ninguno vigente. `sin_qr`: no hay ninguno. */
  | { readonly disponible: false; readonly motivo: 'vencido' | 'sin_qr' };

export const NOMBRE_DE_MODO_DE_QR: Readonly<Record<ModoDeQr, string>> = {
  global: 'Un QR para todos los planes',
  por_plan: 'QR por plan',
};

export const NOMBRE_DE_ESTADO_DE_QR: Readonly<Record<EstadoDeQr, string>> = {
  vigente: 'Vigente',
  vencido: 'Vencido',
  monto_desactualizado: 'Monto desactualizado',
};

export function esModoDeQr(valor: unknown): valor is ModoDeQr {
  return valor === 'global' || valor === 'por_plan';
}

export function esModoDeMonto(valor: unknown): valor is ModoDeMonto {
  return valor === 'libre' || valor === 'exacto';
}

/** Dos importes en bolivianos comparados al centavo, sin sorpresas de coma flotante. */
function centavos(importe: number): number {
  return Math.round(importe * 100);
}

export function estadoDeQr(qr: QrDeCobro, plan: PlanACobrar | null, hoy: string): EstadoDeQr {
  if (qr.expiresOn && qr.expiresOn < hoy) return 'vencido';
  if (qr.amountMode === 'exacto' && plan && (qr.fixedAmount === null || centavos(qr.fixedAmount) !== centavos(plan.price))) {
    return 'monto_desactualizado';
  }
  return 'vigente';
}

/**
 * QR que se enseña para cobrar un plan.
 *
 * POLÍTICA (decisión V3.0):
 * 1. Modo `global`: siempre el QR general, aunque existan QR por plan.
 * 2. Modo `por_plan`: el QR propio del plan si está vigente (y, si es exacto,
 *    su importe coincide con el precio actual).
 * 3. Si el plan no tiene QR propio utilizable, se usa el QR GENERAL. Es
 *    seguro porque el general es siempre de monto libre: sirve para cualquier
 *    importe. Un QR exacto de otro plan nunca se reutiliza.
 * 4. Sin QR vigente, no hay QR: se paga en recepción.
 *
 * Sin plan (un pago suelto) se usa el general.
 */
export function seleccionarQrDeCobro(entrada: {
  readonly modo: ModoDeQr;
  readonly qrs: readonly QrDeCobro[];
  readonly plan: PlanACobrar | null;
  readonly hoy: string;
}): ResultadoDeSeleccion {
  const { modo, qrs, plan, hoy } = entrada;
  const general = qrs.find((qr) => qr.planId === null) ?? null;
  const propio = plan ? (qrs.find((qr) => qr.planId === plan.id) ?? null) : null;

  if (modo === 'por_plan' && propio && plan && estadoDeQr(propio, plan, hoy) === 'vigente') {
    return {
      disponible: true,
      seleccion: { qr: propio, origen: 'plan', montoExacto: propio.amountMode === 'exacto' ? propio.fixedAmount : null },
    };
  }

  if (general && estadoDeQr(general, null, hoy) === 'vigente') {
    return { disponible: true, seleccion: { qr: general, origen: 'general', montoExacto: null } };
  }

  const habiaAlguno = Boolean(general) || (modo === 'por_plan' && Boolean(propio));
  return { disponible: false, motivo: habiaAlguno ? 'vencido' : 'sin_qr' };
}

/**
 * ¿Cubre el importe pagado lo que cuesta el plan?
 * - `insuficiente`: menos que el precio. NO se acepta como pagado.
 * - `exacto`: lo mismo.
 * - `excedente`: más. Se acepta como hasta hoy y se registra lo pagado.
 * Sin precio esperado (un pago sin plan), cualquier importe positivo vale.
 */
export type EvaluacionDeImporte = 'insuficiente' | 'exacto' | 'excedente';

export function evaluarImporte(esperado: number | null, pagado: number): EvaluacionDeImporte {
  if (esperado === null) return 'exacto';
  const diferencia = centavos(pagado) - centavos(esperado);
  if (diferencia < 0) return 'insuficiente';
  return diferencia === 0 ? 'exacto' : 'excedente';
}

export function importeValido(esperado: number | null, pagado: number): boolean {
  return pagado > 0 && evaluarImporte(esperado, pagado) !== 'insuficiente';
}

/** Mensaje legible para los errores de negocio que devuelve la base. */
export function mensajeDeErrorDeCobro(codigo: string): string {
  if (codigo.includes('monto_insuficiente')) return 'El importe es menor que el precio del plan. No se puede aceptar como pagado.';
  if (codigo.includes('monto_exacto_distinto_al_precio')) return 'Un QR de monto exacto tiene que cobrar exactamente el precio del plan.';
  if (codigo.includes('qr_general_exacto')) return 'El QR general sirve para todos los planes: tiene que ser de monto libre.';
  if (codigo.includes('plan_invalido')) return 'Ese plan no existe en este gimnasio o ya no está activo.';
  if (codigo.includes('qr_requerido')) return 'Sube la imagen del QR.';
  if (codigo.includes('ruta_invalida')) return 'La imagen del QR no pertenece a este gimnasio.';
  if (codigo.includes('modo_de_qr_invalido') || codigo.includes('modo_de_monto_invalido')) return 'Modalidad no válida.';
  if (codigo.includes('pago_no_valido')) return 'El pago indicado no corresponde a este socio.';
  if (codigo.includes('sin_permiso') || codigo.includes('42501')) {
    return 'Tu cuenta no tiene el permiso para configurar el cobro de este gimnasio (settings.manage).';
  }
  return 'No se pudo guardar. Vuelve a intentarlo.';
}
