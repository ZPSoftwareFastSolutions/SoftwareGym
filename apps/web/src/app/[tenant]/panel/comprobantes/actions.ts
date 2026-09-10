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
import { fechaIsoValida } from '@core/domain/operations/periodo';
import { PERMISO } from '@core/domain/operations/workspace';
import {
  membersRepository,
  paymentSettingsRepository,
  receiptsRepository,
} from '@infra/config/composition-root';
import {
  contextoDeAccion,
  imagenDeFormulario,
  nulo,
  texto,
  type EstadoDeFormulario,
} from '../_acciones';

async function validarImporteYPlan(form: FormData) {
  const planId = texto(form, 'planId', 40);
  const montoTexto = texto(form, 'monto', 12);
  const errores: Record<string, string> = {};

  const planes = await (await membersRepository()).planesVendibles();
  const plan = planId ? planes.find((candidato) => candidato.id === planId) : undefined;
  if (planId && !plan) errores.planId = 'Ese plan no está disponible.';

  const monto = importeDeTexto(montoTexto) ?? plan?.price ?? null;
  if (monto === null || !(monto > 0) || monto >= 100_000) errores.monto = 'Indica el importe pagado.';

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
    const revision = await recibos.revisar(subida.valor, true, 'Verificado al adjuntar');
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

  const resultado = await (await receiptsRepository()).revisar(texto(form, 'receiptId', 40), decision === 'aprobar', nota);
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

export async function guardarAjustesDeCobro(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enablePayments'], PERMISO.configurar);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const holder = nulo(texto(form, 'holder', 120));
  const bank = nulo(texto(form, 'bank', 80));
  const note = nulo(texto(form, 'note', 500));
  const vencimiento = texto(form, 'expiresOn', 10);
  const errores: Record<string, string> = {};
  if (holder && holder.length < 2) errores.holder = 'Nombre demasiado corto.';
  if (vencimiento && !fechaIsoValida(vencimiento)) errores.expiresOn = 'Fecha inválida.';

  const imagen = await imagenDeFormulario(form, 'qr');
  if (imagen && !imagen.ok) errores.qr = imagen.mensaje;
  if (imagen?.ok && imagen.imagen.bytes.length > 2 * 1024 * 1024) errores.qr = 'El QR no puede pesar más de 2 MB.';

  if (Object.keys(errores).length > 0 || !perfil.tenantId) return { errores, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await paymentSettingsRepository()).guardar(
    perfil.tenantId,
    { holder, bank, note, expiresOn: vencimiento || null },
    imagen?.ok ? imagen.imagen : null,
  );
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${slug}/panel`, 'layout');
  return { exito: 'Datos de cobro guardados. Ya se ven en la página de planes.' };
}
