/**
 * CAPA: Infrastructure / Operations
 *
 * Comprobantes de pago y ajustes de cobro contra Supabase (tablas y Storage).
 *
 * LAS IMÁGENES NO SALEN NUNCA CON URL FIRMADA. Una URL firmada la abre
 * cualquiera que la tenga durante su vigencia, y la foto de una transferencia
 * lleva nombre, banco e importe: acaba pegada en un chat. Se leen aquí, con la
 * sesión de quien pregunta —RLS de Storage decide—, y la aplicación las sirve
 * con `Cache-Control: private, no-store`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AjustesDeCobro,
  CambiosDeAjustesDeCobro,
  DatosDeQrDeCobro,
  ImagenValidada,
  NuevoComprobante,
  PaymentSettingsPort,
  PlanPublico,
  ReceiptsRepositoryPort,
} from '@core/application/ports/receipts-repository.port';
import {
  esModoDeMonto,
  esModoDeQr,
  mensajeDeErrorDeCobro,
  type QrDeCobro,
} from '@core/domain/operations/cobro-qr';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import {
  detectarTipoDeImagen,
  esEstadoDeComprobante,
  esOrigenDeComprobante,
  extensionDeImagen,
  mensajeDeErrorDeComprobante,
  TAMANO_MAXIMO_DE_IMAGEN,
  type Comprobante,
  type FiltroDeComprobantes,
} from '@core/domain/operations/receipts';
import { esMetodoDePago } from '@core/domain/operations/members';
import { numero } from '@core/domain/operations/dashboard';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET_COMPROBANTES = 'comprobantes';
const BUCKET_QR = 'qr-pagos';

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function importeONulo(valor: unknown): number | null {
  return valor === null || valor === undefined || valor === '' ? null : numero(valor);
}

function mapear(fila: Record<string, unknown>): Comprobante {
  const tipo = fila.mime_type;
  return {
    id: String(fila.id),
    customerId: String(fila.customer_id),
    customerCode: texto(fila.customer_code),
    customerName: texto(fila.customer_name) ?? 'Socio',
    customerPhone: texto(fila.customer_phone),
    customerEmail: texto(fila.customer_email),
    planId: texto(fila.plan_id),
    planName: texto(fila.plan_name),
    membershipId: texto(fila.membership_id),
    paymentId: texto(fila.payment_id),
    amount: numero(fila.amount),
    expectedAmount: importeONulo(fila.expected_amount),
    verifiedAmount: importeONulo(fila.verified_amount),
    currency: texto(fila.currency) ?? 'BOB',
    method: esMetodoDePago(fila.method) ? fila.method : 'qr',
    status: esEstadoDeComprobante(fila.status) ? fila.status : 'pendiente',
    source: esOrigenDeComprobante(fila.source) ? fila.source : 'recepcion',
    mimeType: tipo === 'image/png' || tipo === 'image/webp' ? tipo : 'image/jpeg',
    sizeBytes: numero(fila.size_bytes),
    note: texto(fila.note),
    reviewNote: texto(fila.review_note),
    createdAt: String(fila.created_at ?? ''),
    createdLocal: String(fila.created_local ?? ''),
    receiptDate: texto(fila.receipt_date) ?? '',
    reviewedAt: texto(fila.reviewed_at),
  };
}

/** Convierte lo que devuelve Storage en bytes verificados, o `null`. */
async function bytesVerificados(blob: Blob | null): Promise<ImagenValidada | null> {
  if (!blob || blob.size === 0 || blob.size > TAMANO_MAXIMO_DE_IMAGEN) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Se vuelven a leer los bytes mágicos al SERVIR, no solo al subir: si algún
  // día entra un archivo por otro camino —la consola de Supabase, una
  // migración—, la aplicación sigue sin servir nada que no sea una imagen.
  const tipo = detectarTipoDeImagen(bytes);
  return tipo ? { bytes, tipo } : null;
}

export class SupabaseReceiptsRepository implements ReceiptsRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(filtro: FiltroDeComprobantes): Promise<readonly Comprobante[]> {
    let consulta = this.supabase
      .from('v_receipts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(filtro.limite ?? 300, 500));

    if (filtro.desde) consulta = consulta.gte('receipt_date', filtro.desde);
    if (filtro.hasta) consulta = consulta.lte('receipt_date', filtro.hasta);
    if (filtro.estado) consulta = consulta.eq('status', filtro.estado);
    if (filtro.origen) consulta = consulta.eq('source', filtro.origen);
    if (filtro.metodo) consulta = consulta.eq('method', filtro.metodo);
    if (filtro.planId && PATRON_UUID.test(filtro.planId)) consulta = consulta.eq('plan_id', filtro.planId);
    if (filtro.customerId && PATRON_UUID.test(filtro.customerId)) {
      consulta = consulta.eq('customer_id', filtro.customerId);
    }

    const busqueda = (filtro.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
    if (busqueda) {
      consulta = consulta.or(`customer_name.ilike.%${busqueda}%,customer_code.ilike.%${busqueda}%`);
    }

    const { data } = await consulta;
    return (data ?? []).map((fila) => mapear(fila as Record<string, unknown>));
  }

  async obtener(id: string): Promise<Comprobante | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('v_receipts').select('*').eq('id', id).maybeSingle();
    return data ? mapear(data as Record<string, unknown>) : null;
  }

  async imagen(id: string): Promise<ImagenValidada | null> {
    if (!PATRON_UUID.test(id)) return null;
    // La ruta se busca con RLS: si la fila no es visible, ni se intenta la
    // descarga. Y la descarga vuelve a pasar por las políticas de Storage.
    const { data: fila } = await this.supabase
      .from('payment_receipts')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();
    const ruta = texto(fila?.storage_path);
    if (!ruta) return null;

    const { data } = await this.supabase.storage.from(BUCKET_COMPROBANTES).download(ruta);
    return bytesVerificados(data);
  }

  async subir(nuevo: NuevoComprobante): Promise<ResultadoDeOperacion<string>> {
    if (!PATRON_UUID.test(nuevo.tenantId) || !PATRON_UUID.test(nuevo.customerId)) {
      return fallo('Faltan datos del socio para guardar el comprobante.');
    }
    if (nuevo.planId && !PATRON_UUID.test(nuevo.planId)) return fallo('Ese plan no está disponible.');
    if (!(nuevo.amount > 0 && nuevo.amount < 100_000)) return fallo('Indica el importe pagado.');
    if (nuevo.imagen.bytes.length > TAMANO_MAXIMO_DE_IMAGEN) return fallo('La imagen pesa demasiado.');

    // El nombre del archivo lo decide el servidor, nunca el nombre original:
    // `../../` o caracteres raros en el nombre de una foto no llegan a la ruta.
    const ruta = `${nuevo.tenantId}/${nuevo.customerId}/${crypto.randomUUID()}.${extensionDeImagen(nuevo.imagen.tipo)}`;

    const { error: errorDeSubida } = await this.supabase.storage
      .from(BUCKET_COMPROBANTES)
      .upload(ruta, nuevo.imagen.bytes, { contentType: nuevo.imagen.tipo, upsert: false });

    if (errorDeSubida) return fallo('No se pudo guardar la imagen. Vuelve a intentarlo.');

    const { data, error } = await this.supabase
      .from('payment_receipts')
      .insert({
        tenant_id: nuevo.tenantId,
        customer_id: nuevo.customerId,
        plan_id: nuevo.planId,
        amount: nuevo.amount,
        method: nuevo.method,
        source: nuevo.source,
        storage_path: ruta,
        mime_type: nuevo.imagen.tipo,
        size_bytes: nuevo.imagen.bytes.length,
        note: nuevo.note,
      })
      .select('id')
      .single();

    if (error || !data) {
      // La imagen quedó subida sin fila. No se puede borrar desde aquí —nadie
      // tiene permiso de borrar comprobantes, y es a propósito—, así que queda
      // huérfana e invisible: sin fila no se lista ni se sirve.
      const detalle = `${error?.code ?? ''} ${error?.message ?? ''}`;
      // El importe mínimo lo decide la base con el precio real del plan: si lo
      // rechaza, se dice por qué en vez de «vuelve a intentarlo».
      if (detalle.includes('monto_insuficiente') || detalle.includes('plan_invalido')) {
        return fallo(mensajeDeErrorDeCobro(detalle));
      }
      return fallo('No se pudo registrar el comprobante. Vuelve a intentarlo.');
    }
    return exito(String(data.id));
  }

  async revisar(
    id: string,
    aprobar: boolean,
    nota: string | null,
    montoVerificado: number | null,
  ): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(id)) return fallo('Ese comprobante no existe.');
    const { error } = await this.supabase.rpc('revisar_comprobante', {
      p_id: id,
      p_aprobar: aprobar,
      p_nota: nota,
      p_monto_verificado: montoVerificado,
    });
    return error ? fallo(mensajeDeErrorDeComprobante(`${error.code ?? ''} ${error.message}`)) : exito(undefined);
  }

  async contarPendientes(): Promise<number> {
    const { count } = await this.supabase
      .from('payment_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendiente');
    return count ?? 0;
  }
}

function aQr(fila: Record<string, unknown>): QrDeCobro {
  return {
    id: String(fila.id),
    planId: texto(fila.plan_id),
    qrPath: String(fila.qr_path ?? ''),
    amountMode: esModoDeMonto(fila.amount_mode) ? fila.amount_mode : 'libre',
    fixedAmount: importeONulo(fila.fixed_amount),
    expiresOn: texto(fila.expires_on),
    updatedAt: texto(fila.updated_at),
  };
}

/** Traduce un error de las RPC de cobro y deja el código en el log del servidor. */
function falloDeCobro(operacion: string, error: { code?: string; message: string }): ResultadoDeOperacion<never> {
  // Antes el mensaje se inventaba el diagnóstico («revisa que seas gerencia»)
  // y ocultaba el 42501 real. El código queda en el log para que la causa
  // esté a la vista la próxima vez.
  console.error(`[cobro-qr] ${operacion}`, error.code ?? '', error.message);
  return fallo(mensajeDeErrorDeCobro(`${error.code ?? ''} ${error.message}`));
}

/**
 * Ajustes y QR de cobro.
 *
 * LAS ESCRITURAS VAN POR RPC. El guardado anterior era un `upsert` de
 * PostgREST, que escribe `tenant_id = EXCLUDED.tenant_id` en su UPDATE; la base
 * no concede UPDATE sobre `tenant_id` (a propósito) y cada intento de gerencia
 * fallaba con 42501. Las RPC toman el gimnasio de la sesión y no tocan esa
 * columna, así que no hizo falta ampliar ningún permiso.
 */
export class SupabasePaymentSettingsRepository implements PaymentSettingsPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async porSlug(tenantSlug: string): Promise<AjustesDeCobro | null> {
    const { data } = await this.supabase
      .from('tenant_payment_settings')
      .select('tenant_id, holder, bank, note, qr_mode, updated_at')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle();

    if (!data) return null;
    return {
      tenantId: String(data.tenant_id),
      holder: texto(data.holder),
      bank: texto(data.bank),
      note: texto(data.note),
      qrMode: esModoDeQr(data.qr_mode) ? data.qr_mode : 'global',
      updatedAt: texto(data.updated_at),
    };
  }

  async qrsPorSlug(tenantSlug: string): Promise<{ readonly tenantId: string | null; readonly qrs: readonly QrDeCobro[] }> {
    const { data } = await this.supabase
      .from('payment_qr_codes')
      .select('id, tenant_id, plan_id, qr_path, amount_mode, fixed_amount, expires_on, updated_at')
      .eq('tenant_slug', tenantSlug);
    const filas = (data ?? []) as Record<string, unknown>[];
    return { tenantId: texto(filas[0]?.tenant_id), qrs: filas.map(aQr) };
  }

  async planPorCodigo(tenantId: string, codigo: string): Promise<PlanPublico | null> {
    if (!PATRON_UUID.test(tenantId)) return null;
    const { data } = await this.supabase
      .from('membership_plans')
      .select('id, code, name, price, currency')
      .eq('tenant_id', tenantId)
      .eq('code', codigo)
      .eq('is_active', true)
      .maybeSingle();
    if (!data) return null;
    return {
      id: String(data.id),
      code: texto(data.code),
      name: texto(data.name) ?? 'Plan',
      price: numero(data.price),
      currency: texto(data.currency) ?? 'BOB',
    };
  }

  async imagenDeQr(qrPath: string): Promise<ImagenValidada | null> {
    if (!qrPath) return null;
    // Bucket público: se lee por su URL pública, que no exige sesión. Así
    // funciona igual para el visitante anónimo del sitio de planes.
    const { data } = this.supabase.storage.from(BUCKET_QR).getPublicUrl(qrPath);
    try {
      const respuesta = await fetch(data.publicUrl, { cache: 'no-store' });
      if (!respuesta.ok) return null;
      return bytesVerificados(await respuesta.blob());
    } catch {
      return null;
    }
  }

  async guardarAjustes(cambios: CambiosDeAjustesDeCobro): Promise<ResultadoDeOperacion<void>> {
    const { error } = await this.supabase.rpc('guardar_ajustes_de_cobro', {
      p_holder: cambios.holder,
      p_bank: cambios.bank,
      p_note: cambios.note,
      p_qr_mode: cambios.qrMode,
    });
    return error ? falloDeCobro('guardar_ajustes_de_cobro', error) : exito(undefined);
  }

  async guardarQr(
    tenantId: string,
    datos: DatosDeQrDeCobro,
    imagen: ImagenValidada | null,
  ): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(tenantId)) return fallo('No se pudo determinar el gimnasio.');
    if (datos.planId !== null && !PATRON_UUID.test(datos.planId)) return fallo('Ese plan no existe en este gimnasio.');

    let rutaNueva: string | null = null;
    if (imagen) {
      // Nombre nuevo en cada subida, y no sobrescribir: el navegador y la CDN
      // cachean la imagen por su URL, y reutilizar el nombre dejaría a los
      // visitantes viendo el QR VIEJO —con la cuenta vieja— durante horas.
      const prefijo = datos.planId ? `plan-${datos.planId}` : 'qr';
      rutaNueva = `${tenantId}/${prefijo}-${Date.now()}.${extensionDeImagen(imagen.tipo)}`;
      const { error } = await this.supabase.storage
        .from(BUCKET_QR)
        .upload(rutaNueva, imagen.bytes, { contentType: imagen.tipo, upsert: false });
      if (error) {
        console.error('[cobro-qr] subir imagen', error.message);
        return fallo('No se pudo subir la imagen del QR. Usa JPG, PNG o WebP de hasta 2 MB.');
      }
    }

    const { data, error } = await this.supabase.rpc('guardar_qr_de_cobro', {
      p_plan_id: datos.planId,
      p_qr_path: rutaNueva,
      p_amount_mode: datos.amountMode,
      p_fixed_amount: datos.fixedAmount,
      p_expires_on: datos.expiresOn,
    });

    if (error) {
      // La imagen recién subida no quedó enlazada a nada: se retira para no
      // repetir las huérfanas que dejó el defecto anterior.
      if (rutaNueva) await this.supabase.storage.from(BUCKET_QR).remove([rutaNueva]);
      return falloDeCobro('guardar_qr_de_cobro', error);
    }

    // La imagen anterior se borra DESPUÉS de guardar la nueva: si el guardado
    // fallara, la página seguiría mostrando un QR que funciona.
    const anterior = texto((data as Record<string, unknown> | null)?.qr_path_anterior);
    if (anterior && anterior !== rutaNueva) await this.supabase.storage.from(BUCKET_QR).remove([anterior]);
    return exito(undefined);
  }

  async eliminarQr(id: string): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(id)) return fallo('Ese QR no existe.');
    const { data, error } = await this.supabase.rpc('eliminar_qr_de_cobro', { p_id: id });
    if (error) return falloDeCobro('eliminar_qr_de_cobro', error);
    const ruta = texto(data);
    if (ruta) await this.supabase.storage.from(BUCKET_QR).remove([ruta]);
    return exito(undefined);
  }
}
