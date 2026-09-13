'use server';

/**
 * Acciones de reservas de clases (V3.4).
 *
 * Exigen las capacidades `enableClasses` y `enableReservations`. Reservar y
 * cancelar NO exigen permiso —el socio reserva lo suyo y no tiene ninguno—; si
 * se reserva para OTRO socio, hace falta tomar asistencia o gerencia, y la base
 * vuelve a exigir que sea en una sesión donde esa cuenta opera. La ventana, el
 * tope, el bloqueo y la lista de espera los aplica el disparador
 * `app.preparar_reserva`, no esta capa.
 */

import { revalidatePath } from 'next/cache';
import { textoDePosicion, validarAjustesDeReserva } from '@core/domain/operations/reservations';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { reservationsRepository } from '@infra/config/composition-root';
import { contextoDeAccion, nulo, texto, type EstadoDeFormulario } from '../_acciones';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAPACIDADES = ['enableClasses', 'enableReservations'] as const;

function revalidar(slug: string) {
  revalidatePath(`/${slug}/panel`, 'layout');
}

export async function reservarClase(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, CAPACIDADES);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil } = acceso.contexto;

  const sessionId = texto(form, 'sessionId', 40);
  const customerCrudo = texto(form, 'customerId', 40).trim();
  if (!PATRON_UUID.test(sessionId)) return { mensaje: 'Esa sesión no existe.' };

  const paraOtro = customerCrudo !== '' && customerCrudo !== perfil.customerId;
  if (paraOtro) {
    if (!PATRON_UUID.test(customerCrudo)) return { mensaje: 'Elige al socio.' };
    if (!tienePermiso(perfil, PERMISO.tomarAsistenciaDeClase) && !tienePermiso(perfil, PERMISO.gestionarClases)) {
      return { mensaje: 'Tu cuenta no puede reservar para otros socios.' };
    }
  } else if (!perfil.customerId) {
    return { mensaje: 'Tu cuenta no tiene ficha de socio: pide en recepción que la vinculen.' };
  }

  const resultado = await (await reservationsRepository()).reservar(sessionId, paraOtro ? customerCrudo : null);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(slug);
  if (resultado.valor.estado === 'en_espera') {
    return { exito: `La clase está llena. ${textoDePosicion(resultado.valor.posicion)}: te avisamos si se libera un lugar.` };
  }
  return { exito: paraOtro ? 'Reserva hecha para el socio.' : '¡Listo! Tienes tu lugar reservado.' };
}

export async function cancelarReserva(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, CAPACIDADES);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await reservationsRepository()).cancelar(texto(form, 'reservationId', 40), nulo(texto(form, 'motivo', 200)));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return {
    exito: resultado.valor.tardia
      ? 'Reserva cancelada. Como faltaba poco para empezar, cuenta como cancelación tardía.'
      : 'Reserva cancelada. El lugar queda libre para otra persona.',
  };
}

export async function justificarInasistencia(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, CAPACIDADES, PERMISO.gestionarClases);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await reservationsRepository()).justificar(texto(form, 'reservationId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Falta justificada: ya no cuenta para el bloqueo y el socio recibió un aviso.' };
}

export async function cerrarListaDeSesion(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, CAPACIDADES, PERMISO.tomarAsistenciaDeClase);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await (await reservationsRepository()).cerrarLista(texto(form, 'sessionId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  const { inasistencias, esperaCerrada } = resultado.valor;
  return {
    exito: `Lista cerrada: ${inasistencias} ${inasistencias === 1 ? 'falta registrada' : 'faltas registradas'}${
      esperaCerrada > 0 ? ` y ${esperaCerrada} de la lista de espera sin lugar` : ''
    }.`,
  };
}

export async function guardarAjustesDeReserva(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, CAPACIDADES, PERMISO.gestionarClases);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const crudo = {
    openDaysBefore: texto(form, 'openDaysBefore', 4),
    closeMinutesBefore: texto(form, 'closeMinutesBefore', 5),
    cancelMinutesBefore: texto(form, 'cancelMinutesBefore', 5),
    maxActive: texto(form, 'maxActive', 3),
    waitlistMax: texto(form, 'waitlistMax', 4),
    noShowLimit: texto(form, 'noShowLimit', 3),
    noShowWindowDays: texto(form, 'noShowWindowDays', 4),
    blockDays: texto(form, 'blockDays', 3),
  };
  const validacion = validarAjustesDeReserva({
    ...crudo,
    waitlistEnabled: form.get('waitlistEnabled') === 'on',
    lateCancelCounts: form.get('lateCancelCounts') === 'on',
  });
  if (!validacion.ok) return { errores: validacion.errores, valores: crudo, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await reservationsRepository()).guardarAjustes(validacion.datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(acceso.contexto.slug);
  return { exito: 'Reglas de reserva guardadas. Valen desde la próxima reserva.' };
}
