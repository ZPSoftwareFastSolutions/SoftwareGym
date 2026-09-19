'use server';

/**
 * Acciones de gestión de socios.
 *
 * Ninguna decide permisos por su cuenta: la escritura la aplica RLS en la
 * base. Si recepción intenta editar, la actualización afecta a cero filas y
 * aquí solo se traduce eso a un mensaje. El permiso que se comprueba en
 * `contextoDeAccion` existe para contestar pronto y claro, no para proteger.
 */

import { revalidatePath } from 'next/cache';
import {
  importeDeTexto,
  esMetodoDePago,
  validarAlta,
  validarDatosDeSocio,
  type DatosDeAlta,
  type DatosDeSocio,
  type FichaDeSocio,
  type MembresiaDeHistorial,
  type PagoDeHistorial,
} from '@core/domain/operations/members';
import { calcularRacha, diasCerradosDelHorario, type ResumenDeRacha } from '@core/domain/operations/streak';
import type { Comprobante } from '@core/domain/operations/receipts';
import { evaluarImporte } from '@core/domain/operations/cobro-qr';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { membersRepository, receiptsRepository } from '@infra/config/composition-root';
import { enviarEnlaceDeAcceso } from '@infra/auth/enlace-de-acceso';
import { mensajeDeEnlaceDeAcceso, mutarEmailParaTenant } from '@core/application/auth/login.usecase';
import { datosPresencialesPendientes, type CampoDeFichaPresencial } from '@core/domain/operations/alta-del-socio';
import { SITE_URL } from '@/lib/site-url';
import { importe, formatoTelefono } from '@/lib/formato';
import {
  contextoDeAccion,
  imagenDeFormulario,
  nulo,
  texto,
  type EstadoDeFormulario,
} from '../_acciones';

export interface EstadoDeAlta extends EstadoDeFormulario {
  readonly registrado?: {
    readonly customerId: string;
    readonly code: string;
    readonly nombre: string;
    readonly token: string | null;
    readonly cuentaVinculada: boolean;
    readonly membresiaActiva: boolean;
    readonly comprobante: 'ninguno' | 'pendiente' | 'aprobado' | 'error';
    readonly correo?: string;
  };
}

function datosDeSocio(form: FormData): DatosDeSocio {
  return {
    nombre: texto(form, 'nombre', 80),
    apellido: texto(form, 'apellido', 80),
    documento: texto(form, 'documento', 20),
    telefono: texto(form, 'telefono', 20),
    correo: texto(form, 'correo', 254),
    nacimiento: texto(form, 'nacimiento', 10),
    nota: texto(form, 'nota', 500),
  };
}

function normalizar(datos: DatosDeSocio) {
  const telLimpio = nulo(datos.telefono);
  const telefonoNormalizado = telLimpio ? formatoTelefono(telLimpio) : null;
  
  return {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    documento: nulo(datos.documento),
    telefono: telefonoNormalizado === '—' ? null : telefonoNormalizado,
    correo: nulo(datos.correo)?.toLowerCase() ?? null,
    nacimiento: nulo(datos.nacimiento),
    nota: nulo(datos.nota),
  };
}

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@infra/auth/supabase.config';

export async function registrarSocio(_previo: EstadoDeAlta, form: FormData): Promise<EstadoDeAlta> {
  const acceso = await contextoDeAccion(form, ['enableMemberManagement'], PERMISO.crearSocios);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, perfil, repo } = acceso.contexto;

  const datosBase = datosDeSocio(form);
  let correo = datosBase.correo.trim().toLowerCase();
  const documento = datosBase.documento.trim();

  const datos: DatosDeAlta = {
    ...datosBase,
    correo: correo ? mutarEmailParaTenant(correo, slug) : '',
    planId: texto(form, 'planId', 40),
    inicio: texto(form, 'inicio', 10),
    metodo: texto(form, 'metodo', 20) || 'cash',
    monto: texto(form, 'monto', 12),
  };
  const valores = { ...datosBase } as Record<string, string>;
  const hoy = await repo.hoyDelGimnasio(slug);
  const errores: Record<string, string> = { ...validarAlta(datos, hoy) };

  const pagaConQr = Boolean(datos.planId) && datos.metodo === 'qr';
  const imagen = pagaConQr ? await imagenDeFormulario(form, 'comprobante') : null;
  if (imagen && !imagen.ok) errores.comprobante = imagen.mensaje;
  if (pagaConQr && !imagen && texto(form, 'comprobanteDespues') !== 'si') {
    errores.comprobante = 'Adjunta el comprobante del QR, o marca que lo adjuntarás después.';
  }

  if (Object.keys(errores).length > 0) {
    return { errores, valores, mensaje: 'Revisa los campos marcados.' };
  }

  const socios = await membersRepository();
  const planes = datos.planId ? await socios.planesVendibles() : [];
  const plan = planes.find((candidato) => candidato.id === datos.planId);
  if (datos.planId && !plan) return { errores: { planId: 'Ese plan no está disponible.' }, valores };

  const monto = importeDeTexto(datos.monto) ?? plan?.price ?? null;
  const metodo = esMetodoDePago(datos.metodo) ? datos.metodo : 'cash';

  if (plan && monto !== null && (pagaConQr || metodo === 'qr') && evaluarImporte(plan.price, monto) === 'insuficiente') {
    return { errores: { monto: `Un cobro por QR no puede ser menor que el precio del plan (${importe(plan.price, plan.currency)}).` }, valores };
  }

  const resultado = await socios.registrar({
    ...normalizar(datos),
    planId: pagaConQr ? null : plan?.id ?? null,
    inicio: pagaConQr ? null : nulo(datos.inicio),
    metodo,
    monto: pagaConQr ? null : plan ? monto : null,
  });

  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };

  let comprobante: 'ninguno' | 'pendiente' | 'aprobado' | 'error' = 'ninguno';
  if (pagaConQr && imagen?.ok && plan && perfil.tenantId && monto) {
    const recibos = await receiptsRepository();
    const subida = await recibos.subir({
      tenantId: perfil.tenantId,
      customerId: resultado.valor.customerId,
      planId: plan.id,
      amount: monto,
      method: 'qr',
      source: 'recepcion',
      note: 'Adjuntado en el alta',
      imagen: imagen.imagen,
    });
    if (!subida.ok) comprobante = 'error';
    else if (texto(form, 'verificado') === 'si') {
      const revision = await recibos.revisar(subida.valor, true, 'Verificado en el alta', monto);
      comprobante = revision.ok ? 'aprobado' : 'pendiente';
    } else comprobante = 'pendiente';
  }

  revalidatePath(`/${slug}/panel`, 'layout');

  return {
    exito: 'Socio registrado.',
    registrado: {
      customerId: resultado.valor.customerId,
      code: resultado.valor.code,
      nombre: `${datos.nombre.trim()} ${datos.apellido.trim()}`,
      token: resultado.valor.token,
      cuentaVinculada: resultado.valor.cuentaVinculada,
      membresiaActiva: Boolean(resultado.valor.membershipId) || comprobante === 'aprobado',
      comprobante,
      correo: correo,
    },
  };
}

export async function actualizarSocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableMemberManagement'], PERMISO.editarSocios);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug, repo } = acceso.contexto;

  const customerId = texto(form, 'customerId', 40);
  const datosBase = datosDeSocio(form);
  const datos = {
    ...datosBase,
    correo: datosBase.correo ? mutarEmailParaTenant(datosBase.correo, slug) : '',
  };
  const errores = validarDatosDeSocio(datos, await repo.hoyDelGimnasio(slug));
  if (Object.keys(errores).length > 0) {
    return { errores, valores: datosBase as unknown as Record<string, string>, mensaje: 'Revisa los campos marcados.' };
  }

  const resultado = await (await membersRepository()).actualizar(customerId, normalizar(datos));
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores: datosBase as unknown as Record<string, string> };

  revalidatePath(`/${slug}/panel`, 'layout');
  return { exito: 'Datos guardados.' };
}

async function accionSimple(
  form: FormData,
  permiso: string,
  hacer: (customerId: string) => Promise<{ ok: true } | { ok: false; mensaje: string }>,
  exito: string,
): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableMemberManagement'], permiso);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const resultado = await hacer(texto(form, 'customerId', 40));
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidatePath(`/${acceso.contexto.slug}/panel`, 'layout');
  return { exito };
}

export async function archivarSocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const socios = await membersRepository();
  return accionSimple(form, PERMISO.archivarSocios, (id) => socios.archivar(id), 'Socio archivado. Su histórico se conserva.');
}

export async function restaurarSocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const socios = await membersRepository();
  return accionSimple(form, PERMISO.archivarSocios, (id) => socios.restaurar(id), 'Socio restaurado.');
}

export async function rotarQrDeSocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const socios = await membersRepository();
  return accionSimple(
    form,
    PERMISO.editarSocios,
    async (id) => {
      const r = await socios.rotarQr(id);
      return r.ok ? { ok: true } : r;
    },
    'QR renovado. El anterior ya no sirve para entrar.',
  );
}

export async function desvincularCuentaDeSocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const socios = await membersRepository();
  return accionSimple(
    form,
    PERMISO.gestionarUsuarios,
    (id) => socios.desvincularCuenta(id),
    'Cuenta desvinculada. La persona ya no ve esta ficha desde la web.',
  );
}

/**
 * V4.2 · Recepción envía al socio el enlace para activar su cuenta web.
 *
 * El socio dado de alta en el mostrador tiene ficha con correo pero no cuenta.
 * Recepción NO crea contraseñas: Supabase le manda un enlace; al abrirlo crea su
 * contraseña y su cuenta queda unida a esta ficha (correo confirmado + ficha
 * única). El correo sale de la ficha leída con la sesión de quien pide, nunca
 * del formulario.
 */
export async function enviarAccesoWebAlSocio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableMemberManagement', 'memberLogin'], PERMISO.editarSocios);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug } = acceso.contexto;

  const ficha = await (await membersRepository()).ficha(texto(form, 'customerId', 40));
  if (!ficha) return { mensaje: 'Ese socio no existe o no es de este gimnasio.' };
  if (!ficha.email) return { mensaje: 'La ficha no tiene correo. Agrégalo antes de enviar el enlace.' };
  if (ficha.hasAccount) return { mensaje: 'Este socio ya tiene su cuenta web unida a la ficha.' };

  const envio = await enviarEnlaceDeAcceso({
    email: ficha.email,
    slug,
    nombre: ficha.fullName,
    retorno: `${SITE_URL}/auth/confirmar?gimnasio=${encodeURIComponent(slug)}&activar=1`,
  });
  if (!envio.ok) return { mensaje: mensajeDeEnlaceDeAcceso(envio.codigo) };
  return {
    exito: `Enviamos el enlace a ${ficha.email}. Al abrirlo, la persona crea su contraseña y entra a su cuenta, ya unida a esta ficha.`,
  };
}

export async function venderMembresia(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableMemberManagement'], PERMISO.venderMembresias);
  if (!acceso.ok) return { mensaje: acceso.mensaje };
  const { slug } = acceso.contexto;

  const planId = texto(form, 'planId', 40);
  const metodo = texto(form, 'metodo', 20);
  const montoTexto = texto(form, 'monto', 12);
  const inicio = texto(form, 'inicio', 10);
  const errores: Record<string, string> = {};
  if (!planId) errores.planId = 'Elige un plan.';
  if (!esMetodoDePago(metodo)) errores.metodo = 'Elige cómo pagó.';
  const monto = importeDeTexto(montoTexto);
  if (montoTexto && (monto === null || monto < 0 || monto >= 100_000)) errores.monto = 'Importe inválido.';
  if (inicio && !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) errores.inicio = 'Fecha inválida.';
  if (Object.keys(errores).length > 0) return { errores, mensaje: 'Revisa los campos marcados.' };

  const socios = await membersRepository();
  const plan = (await socios.planesVendibles()).find((candidato) => candidato.id === planId);
  if (!plan) return { errores: { planId: 'Ese plan no está disponible.' } };
  // Por QR no se vende por debajo del precio (la base lo repite). En efectivo
  // o tarjeta, un descuento sigue siendo decisión del mostrador.
  if (metodo === 'qr' && monto !== null && monto > 0 && evaluarImporte(plan.price, monto) === 'insuficiente') {
    return { errores: { monto: `Un cobro por QR no puede ser menor que el precio del plan (${importe(plan.price, plan.currency)}).` } };
  }

  const resultado = await socios.venderMembresia({
    customerId: texto(form, 'customerId', 40),
    planId,
    inicio: nulo(inicio),
    metodo: esMetodoDePago(metodo) ? metodo : 'cash',
    monto: monto ?? plan.price,
    nota: nulo(texto(form, 'nota', 500)),
  });
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${slug}/panel`, 'layout');
  return { exito: `Membresía registrada. Empieza el ${resultado.valor.inicio}.` };
}

export async function actualizarMembresia(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const acceso = await contextoDeAccion(form, ['enableMemberManagement'], PERMISO.editarMembresias);
  if (!acceso.ok) return { mensaje: acceso.mensaje };

  const inicio = texto(form, 'inicio', 10);
  const fin = texto(form, 'fin', 10);
  const estado = texto(form, 'estado', 20);
  const errores: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) errores.inicio = 'Fecha inválida.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fin)) errores.fin = 'Fecha inválida.';
  if (!errores.inicio && !errores.fin && fin <= inicio) errores.fin = 'Tiene que ser posterior al inicio.';
  if (estado !== 'active' && estado !== 'suspended' && estado !== 'cancelled') errores.estado = 'Estado inválido.';
  if (Object.keys(errores).length > 0) return { errores, mensaje: 'Revisa los campos marcados.' };

  const resultado = await (await membersRepository()).actualizarMembresia(texto(form, 'membershipId', 40), {
    startDate: inicio,
    endDate: fin,
    status: estado as 'active' | 'suspended' | 'cancelled',
  });
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidatePath(`/${acceso.contexto.slug}/panel`, 'layout');
  return { exito: 'Membresía actualizada.' };
}

export interface FichaCompleta {
  readonly ficha: FichaDeSocio;
  readonly membresias: readonly MembresiaDeHistorial[];
  readonly pagos: readonly PagoDeHistorial[];
  readonly comprobantes: readonly Comprobante[];
  readonly racha: ResumenDeRacha;
  readonly hoy: string;
  readonly puedeEditar: boolean;
  /** V4.2 · Datos que el gimnasio toma en persona y faltan (vacío si no declara ninguno). */
  readonly datosPendientes: readonly CampoDeFichaPresencial[];
}

/**
 * Ficha completa para la ventana que se abre desde cualquier fila.
 *
 * Se llama con argumentos y no con un formulario porque la abre un clic, no
 * un envío. Los datos los filtra RLS: pedir la ficha de un socio que no se
 * puede ver devuelve `null`, igual que pedir una que no existe.
 */
export async function obtenerFichaCompleta(tenantSlug: string, customerId: string): Promise<FichaCompleta | null> {
  const form = new FormData();
  form.set('tenantSlug', tenantSlug);
  const acceso = await contextoDeAccion(form, [], PERMISO.verSocios);
  if (!acceso.ok) return null;
  const { tenant, perfil, repo, slug } = acceso.contexto;

  const socios = await membersRepository();
  const ficha = await socios.ficha(customerId);
  if (!ficha) return null;

  const puedeVerComprobantes = tenant.features.enablePayments === true && tienePermiso(perfil, PERMISO.verPagos);
  const [membresias, pagos, dias, comprobantes, hoy] = await Promise.all([
    socios.membresias(customerId),
    tienePermiso(perfil, PERMISO.verPagos) ? socios.pagos(customerId) : Promise.resolve([]),
    socios.diasDeAsistencia(customerId, 365),
    puedeVerComprobantes
      ? (await receiptsRepository()).listar({ customerId, limite: 10 })
      : Promise.resolve([]),
    repo.hoyDelGimnasio(slug),
  ]);

  return {
    ficha,
    membresias,
    pagos,
    comprobantes,
    racha: calcularRacha(dias, hoy, diasCerradosDelHorario(tenant.hours.week), 12),
    hoy,
    puedeEditar: tienePermiso(perfil, PERMISO.editarSocios),
    datosPendientes: datosPresencialesPendientes(ficha, tenant.members?.inPersonFields ?? []),
  };
}
