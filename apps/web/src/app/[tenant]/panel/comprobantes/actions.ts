'use server';

/**
 * Acciones de comprobantes y de ajustes de cobro.
 *
 * El socio y el personal suben comprobantes por acciones DISTINTAS a propósito.
 * La del socio no recibe `customerId` del formulario: lo toma de su perfil.
 * Si lo leyera del formulario, bastaría con cambiar un campo oculto para subir
 * un comprobante a nombre de otro —la base lo impediría igual, pero la acción
 * ni siquiera debe ofrecer esa puerta—.
 */

import { revalidatePath } from 'next/cache';
import { esMetodoDePago, importeDeTexto } from '@core/domain/operations/members';
import { esModoDeMonto, esModoDeQr, evaluarImporte } from '@core/domain/operations/cobro-qr';
import { fechaIsoValida } from '@core/domain/operations/periodo';
import { PERMISO } from '@core/domain/operations/workspace';
import {
  membersRepository,
  paymentSettingsRepository,
  receiptsRepository,
} from '@infra/config/composition-root';
import { importe } from '@/lib/formato';
import {
  contextoDeAccion,
  imagenDeFormulario,
  nulo,
  texto,
  type EstadoDeFormulario,
} from '../_acciones';

const TAMANO_MAXIMO_DE_QR = 2 * 1024 * 1024;

/**
 * Plan y importe de un comprobante.
 *
 * El precio sale de `membership_plans` leído con la sesión (RLS: solo planes
 * del propio gimnasio), nunca del formulario. Un importe menor que el precio se
 * rechaza aquí para avisar antes de subir la imagen; la base lo vuelve a
 * rechazar al insertar (`app.fijar_importe_esperado`) aunque alguien se salte
 * esta acción.
 */
async function validarImporteYPlan(form: FormData) {
  const planId = texto(form, 'planId', 40);
  const montoTexto = texto(form, 'monto', 12);
  const errores: Record<string, string> = {};

  const planes = await (await membersRepository()).planesVendibles();
  const plan = planId ? planes.find((candidato) => candidato.id === planId) : undefined;
  if (planId && !plan) errores.planId = 'Ese plan no está disponible.';

  const monto = importeDeTexto(montoTexto) ?? plan?.price ?? null;
  if (monto === null || !(monto > 0) || monto >= 100_000) errores.monto = 'Indica el importe pagado.';
  else if (plan && evaluarImporte(plan.price, monto) === 'insuficiente') {
    errores.monto = `El importe no puede ser menor que el precio del plan (${importe(plan.price, plan.currency)}).`;
  }

  return { plan, monto, errores };
}

export async function subirComprobante(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enablePayments'], PERMISO.cobrar);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const { plan, monto, errores } = await validarImporteYPlan(form);
  const customerId = texto(form, 'customerId', 40);
  if (!customerId) errores.customerId = 'Elige el socio.';
  const metodo = texto(form, 'metodo', 20) || 'qr';
  if (!esMetodoDePago(metodo)) errores.metodo = 'Método inválido.';

  const imagen = await imagenDeFormulario(form, 'comprobante');
  if (!imagen) errores.comprobante = 'Adjunta la imagen del comprobante.';
  else if (!imagen.ok) errores.comprobante = imagen.mensaje;

  if (Object.keys(errores).length > 0 || !imagen?.ok || !perfil.tenantId || monto === null) {
    return { errores, mensaje: 'Revisa los campos marcados.' };
  }

  const recibos = await receiptsRepository();
  const subida = await recibos.subir({
    tenantId: perfil.tenantId,
    customerId,
    planId: plan?.id ?? null,
    amount: monto,
    method: esMetodoDePago(metodo) ? metodo : 'qr',
    source: 'recepcion',
    note: nulo(texto(form, 'nota', 500)),
    imagen: imagen.imagen,
  });
  if (!subida.ok) return { mensaje: subida.mensaje };

  let exito = 'Comprobante adjuntado. Queda pendiente de revisión.';
  if (texto(form, 'verificado') === 'si') {
    // Quien marca «verificado» vio el pago en el banco por el importe escrito.
    const revision = await recibos.revisar(subida.valor, true, 'Verificado al adjuntar', monto);
    exito = revision.ok
      ? plan
        ? 'Comprobante aprobado: cobro registrado y membresía activada.'
        : 'Comprobante aprobado: cobro registrado.'
      : `Comprobante adjuntado, pero no se pudo aprobar: ${revision.mensaje}`;
  }

  revalidatePath(`/${slug}/panel`, 'layout');
  return { exito };
}

export async function revisarComprobante(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enablePayments'], PERMISO.cobrar);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const decision = texto(form, 'decision', 10);
  const nota = nulo(texto(form, 'nota', 500));
  if (decision !== 'aprobar' && decision !== 'rechazar') return { mensaje: 'Elige aprobar o rechazar.' };
  if (decision === 'rechazar' && (!nota || nota.length < 3)) {
    return { errores: { nota: 'Escribe el motivo: el socio necesita saber qué corregir.' } };
  }

  // Importe que se vio en el banco. Vacío = el declarado. El mínimo lo compara
  // la base contra el precio fijado al subir el comprobante, no contra un
  // número que venga de la pantalla.
  const montoTexto = texto(form, 'montoVerificado', 12).trim();
  const montoVerificado = montoTexto ? importeDeTexto(montoTexto) : null;
  if (decision === 'aprobar' && montoTexto && (montoVerificado === null || !(montoVerificado > 0))) {
    return { errores: { montoVerificado: 'Escribe el importe que llegó al banco.' } };
  }

  const recibos = await receiptsRepository();
  if (decision === 'aprobar') {
    const comprobante = await recibos.obtener(texto(form, 'receiptId', 40));
    const pagado = montoVerificado ?? comprobante?.amount ?? 0;
    if (comprobante && evaluarImporte(comprobante.expectedAmount, pagado) === 'insuficiente') {
      return {
        errores: {
          montoVerificado: `Llegó menos que el precio del plan (${importe(comprobante.expectedAmount ?? 0, comprobante.currency)}). No se puede aprobar: recházalo con el motivo.`,
        },
      };
    }
  }

  const resultado = await recibos.revisar(texto(form, 'receiptId', 40), decision === 'aprobar', nota, decision === 'aprobar' ? montoVerificado : null);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${acceso.contexto.slug}/panel`, 'layout');
  return { exito: decision === 'aprobar' ? 'Aprobado. El cobro ya cuenta en los dashboards.' : 'Rechazado. El socio verá el motivo.' };
}

export async function subirMiComprobante(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enablePayments']);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  if (!perfil.customerId || !perfil.tenantId) {
    return { mensaje: 'Tu cuenta todavía no está vinculada a tu ficha de socio. Acércate a recepción.' };
  }

  const { plan, monto, errores } = await validarImporteYPlan(form);
  const imagen = await imagenDeFormulario(form, 'comprobante');
  if (!imagen) errores.comprobante = 'Adjunta la captura o foto del comprobante.';
  else if (!imagen.ok) errores.comprobante = imagen.mensaje;

  if (Object.keys(errores).length > 0 || !imagen?.ok || monto === null) {
    return { errores, mensaje: 'Revisa los campos marcados.' };
  }

  const subida = await (await receiptsRepository()).subir({
    tenantId: perfil.tenantId,
    customerId: perfil.customerId,
    planId: plan?.id ?? null,
    amount: monto,
    method: 'qr',
    source: 'socio',
    note: nulo(texto(form, 'nota', 500)),
    imagen: imagen.imagen,
  });
  if (!subida.ok) return { mensaje: subida.mensaje };

  revalidatePath(`/${slug}/panel`, 'layout');
  return { exito: 'Comprobante enviado. Recepción lo revisa y tu membresía se activa al aprobarlo.' };
}

/**
 * Titular, banco, instrucción y modalidad (un QR para todo o QR por plan).
 *
 * El gimnasio NO viaja en el formulario: la RPC lo toma de la sesión. El
 * `tenantSlug` solo sirve para que `contextoDeAccion` compruebe que la sesión
 * es de este gimnasio y tiene `settings.manage`; la base lo vuelve a exigir.
 */
export async function guardarAjustesDeCobro(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enablePayments'], PERMISO.configurar);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug } = acceso.contexto;

  const holder = nulo(texto(form, 'holder', 120));
  const bank = nulo(texto(form, 'bank', 80));
  const note = nulo(texto(form, 'note', 500));
  const qrMode = texto(form, 'qrMode', 20);
  const errores: Record<string, string> = {};
  if (holder && holder.length < 2) errores.holder = 'Nombre demasiado corto.';
  if (!esModoDeQr(qrMode)) errores.qrMode = 'Elige una modalidad.';

  if (Object.keys(errores).length > 0 || !esModoDeQr(qrMode)) return { errores, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await paymentSettingsRepository()).guardarAjustes({ holder, bank, note, qrMode });
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${slug}/panel`, 'layout');
  return { exito: 'Datos de cobro guardados.' };
}

/**
 * Crea o reemplaza el QR general (`planId` vacío) o el de un plan.
 *
 * - El plan se busca entre los planes activos que la SESIÓN puede leer (su
 *   gimnasio); un id de otro gimnasio no aparece. La RPC lo repite.
 * - El importe de un QR exacto es el precio del plan leído de la base: el
 *   formulario no lo manda. La RPC exige que coincida.
 */
export async function guardarQrDeCobro(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enablePayments'], PERMISO.configurar);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const planId = texto(form, 'planId', 40).trim();
  const modoDeMonto = texto(form, 'amountMode', 10);
  const vencimiento = texto(form, 'expiresOn', 10).trim();
  const errores: Record<string, string> = {};

  const plan = planId ? (await (await membersRepository()).planesVendibles()).find((candidato) => candidato.id === planId) : undefined;
  if (planId && !plan) errores.planId = 'Ese plan no existe en este gimnasio o ya no está activo.';
  if (!esModoDeMonto(modoDeMonto)) errores.amountMode = 'Elige si el QR es de monto libre o exacto.';
  else if (modoDeMonto === 'exacto' && !plan) errores.amountMode = 'El QR general tiene que ser de monto libre.';
  if (vencimiento && !fechaIsoValida(vencimiento)) errores.expiresOn = 'Fecha inválida.';

  const imagen = await imagenDeFormulario(form, 'qr');
  if (imagen && !imagen.ok) errores.qr = imagen.mensaje;
  if (imagen?.ok && imagen.imagen.bytes.length > TAMANO_MAXIMO_DE_QR) errores.qr = 'El QR no puede pesar más de 2 MB.';

  if (Object.keys(errores).length > 0 || !esModoDeMonto(modoDeMonto) || !perfil.tenantId) {
    return { errores, mensaje: 'Revisa los campos marcados.' };
  }

  const resultado = await (await paymentSettingsRepository()).guardarQr(
    perfil.tenantId,
    {
      planId: plan?.id ?? null,
      amountMode: modoDeMonto,
      fixedAmount: modoDeMonto === 'exacto' && plan ? plan.price : null,
      expiresOn: vencimiento || null,
    },
    imagen?.ok ? imagen.imagen : null,
  );
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${slug}/panel`, 'layout');
  return { exito: plan ? `QR de «${plan.name}» guardado.` : 'QR general guardado. Ya se ve en la página de planes.' };
}

export async function eliminarQrDeCobro(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enablePayments'], PERMISO.configurar);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const resultado = await (await paymentSettingsRepository()).eliminarQr(texto(form, 'qrId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${acceso.contexto.slug}/panel`, 'layout');
  return { exito: 'QR eliminado.' };
}
