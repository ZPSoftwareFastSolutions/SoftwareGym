/**
 * CAPA: Infrastructure / Operations
 *
 * Gestión de socios contra Supabase.
 *
 * Las escrituras de varias tablas (alta, venta de membresía) van por las
 * funciones `registrar_socio` y `vender_membresia`, que son SECURITY INVOKER:
 * pasan por RLS igual que una escritura directa, pero ocurren enteras o no
 * ocurren. Las escrituras de una sola tabla van directas.
 *
 * Toda actualización pide `.select('id')` de vuelta. Sin eso, una edición que
 * RLS bloquea «funciona»: PostgREST responde bien, afecta a cero filas y la
 * pantalla diría «guardado» a quien no tiene permiso para guardar.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AltaDeSocio,
  CambiosDeMembresia,
  CambiosDeSocio,
  MembersRepositoryPort,
  SocioRegistrado,
  VentaDeMembresia,
} from '@core/application/ports/members-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import {
  cumpleEsteMes,
  diasDesde,
  esEstadoDeMembresia,
  esMetodoDePago,
  mensajeDeErrorDeSocio,
  type EstadoDeSocio,
  type FichaDeSocio,
  type FiltroDeSocios,
  type MembresiaDeHistorial,
  type PagoDeHistorial,
  type PlanVendible,
} from '@core/domain/operations/members';
import { numero } from '@core/domain/operations/dashboard';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOPE = 500;

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function estadoDeSocio(valor: unknown): EstadoDeSocio {
  return valor === 'inactive' || valor === 'archived' ? valor : 'active';
}

/** Quita los caracteres que parten un filtro `or` de PostgREST. */
function busquedaSegura(q: string | undefined): string | null {
  const limpia = (q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
  return limpia || null;
}

export function mapearFicha(fila: Record<string, unknown>): FichaDeSocio {
  const estadoMembresia = fila.membership_status;
  return {
    id: String(fila.id),
    code: texto(fila.code),
    firstName: texto(fila.first_name) ?? '',
    lastName: texto(fila.last_name) ?? '',
    fullName: texto(fila.full_name) ?? 'Socio',
    documentId: texto(fila.document_id),
    phone: texto(fila.phone),
    email: texto(fila.email),
    birthDate: texto(fila.birth_date),
    status: estadoDeSocio(fila.status),
    notes: texto(fila.notes),
    archivedAt: texto(fila.deleted_at),
    createdAt: String(fila.created_at ?? ''),
    membershipId: texto(fila.membership_id),
    planId: texto(fila.plan_id),
    planName: texto(fila.plan_name),
    planCode: texto(fila.plan_code),
    startDate: texto(fila.start_date),
    endDate: texto(fila.end_date),
    membershipStatus: esEstadoDeMembresia(estadoMembresia) ? estadoMembresia : null,
    daysRemaining: fila.days_remaining === null || fila.days_remaining === undefined ? null : numero(fila.days_remaining),
    membershipPrice: fila.membership_price === null || fila.membership_price === undefined ? null : numero(fila.membership_price),
    checkinToken: texto(fila.checkin_token),
    tokenRotatedAt: texto(fila.token_rotated_at),
    totalVisits: numero(fila.total_visits),
    lastVisit: texto(fila.last_visit),
    visits30d: numero(fila.visits_30d),
    totalPaid: numero(fila.total_paid),
    pendingReceipts: numero(fila.pending_receipts),
    hasAccount: typeof fila.has_account === 'boolean' ? fila.has_account : null,
    accountEmail: texto(fila.account_email),
  };
}

export class SupabaseMembersRepository implements MembersRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(filtro: FiltroDeSocios, hoy: string): Promise<readonly FichaDeSocio[]> {
    let consulta = this.supabase
      .from('v_customer_detail')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .limit(Math.min(filtro.limite ?? TOPE, TOPE));

    if (filtro.soloArchivados) consulta = consulta.not('deleted_at', 'is', null);
    else if (!filtro.incluirArchivados) consulta = consulta.is('deleted_at', null);

    if (filtro.estado === 'sin-membresia') consulta = consulta.is('membership_id', null);
    else if (filtro.estado) consulta = consulta.eq('membership_status', filtro.estado);

    if (filtro.planId && PATRON_UUID.test(filtro.planId)) consulta = consulta.eq('plan_id', filtro.planId);

    const busqueda = busquedaSegura(filtro.q);
    if (busqueda) {
      consulta = consulta.or(
        ['full_name', 'code', 'document_id', 'email', 'phone']
          .map((columna) => `${columna}.ilike.%${busqueda}%`)
          .join(','),
      );
    }

    const { data } = await consulta;
    let fichas = (data ?? []).map((fila) => mapearFicha(fila as Record<string, unknown>));

    // Filtros que dependen de «hoy» se aplican aquí y no en la consulta: la
    // base no sabe qué día es para el gimnasio salvo que se lo diga, y
    // pasárselo como parámetro a PostgREST no permite comparar meses.
    if (filtro.cumpleMes) fichas = fichas.filter((ficha) => cumpleEsteMes(ficha.birthDate, hoy));
    if (filtro.inactivosDias && filtro.inactivosDias > 0) {
      const minimo = filtro.inactivosDias;
      fichas = fichas.filter((ficha) => {
        if (ficha.membershipStatus !== 'active' && ficha.membershipStatus !== 'expiring_soon') return false;
        const dias = diasDesde(ficha.lastVisit, hoy);
        return dias === null || dias >= minimo;
      });
    }
    return fichas;
  }

  async ficha(customerId: string): Promise<FichaDeSocio | null> {
    if (!PATRON_UUID.test(customerId)) return null;
    const { data } = await this.supabase.from('v_customer_detail').select('*').eq('id', customerId).maybeSingle();
    return data ? mapearFicha(data as Record<string, unknown>) : null;
  }

  async planesVendibles(): Promise<readonly PlanVendible[]> {
    const { data } = await this.supabase
      .from('membership_plans')
      .select('id, code, name, duration_days, price, currency')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      code: texto(fila.code),
      name: texto(fila.name) ?? 'Plan',
      durationDays: numero(fila.duration_days),
      price: numero(fila.price),
      currency: texto(fila.currency) ?? 'BOB',
    }));
  }

  async membresias(customerId: string): Promise<readonly MembresiaDeHistorial[]> {
    if (!PATRON_UUID.test(customerId)) return [];
    const { data } = await this.supabase
      .from('v_memberships_report')
      .select('id, plan_name, start_date, end_date, effective_status, price')
      .eq('customer_id', customerId)
      .order('end_date', { ascending: false })
      .limit(60);

    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      planName: texto(fila.plan_name),
      startDate: texto(fila.start_date) ?? '',
      endDate: texto(fila.end_date) ?? '',
      status: esEstadoDeMembresia(fila.effective_status) ? fila.effective_status : 'active',
      price: numero(fila.price),
    }));
  }

  async pagos(customerId: string): Promise<readonly PagoDeHistorial[]> {
    if (!PATRON_UUID.test(customerId)) return [];
    const { data } = await this.supabase
      .from('v_payments_report')
      .select('id, paid_date, amount, currency, method, plan_name, notes')
      .eq('customer_id', customerId)
      .lte('paid_at', new Date().toISOString())
      .order('paid_at', { ascending: false })
      .limit(60);

    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      paidDate: texto(fila.paid_date) ?? '',
      amount: numero(fila.amount),
      currency: texto(fila.currency) ?? 'BOB',
      method: esMetodoDePago(fila.method) ? fila.method : 'other',
      planName: texto(fila.plan_name),
      notes: texto(fila.notes),
    }));
  }

  async diasDeAsistencia(customerId: string, dias: number): Promise<readonly string[]> {
    if (!PATRON_UUID.test(customerId)) return [];
    const desde = new Date(Date.now() - Math.max(1, dias) * 86_400_000).toISOString().slice(0, 10);
    const { data } = await this.supabase
      .from('v_attendance_log')
      .select('attendance_date')
      .eq('customer_id', customerId)
      .gte('attendance_date', desde)
      .order('attendance_date', { ascending: false })
      .limit(800);

    return (data ?? []).map((fila) => texto(fila.attendance_date)).filter((fecha): fecha is string => fecha !== null);
  }

  async registrar(alta: AltaDeSocio): Promise<ResultadoDeOperacion<SocioRegistrado>> {
    const { data, error } = await this.supabase.rpc('registrar_socio', {
      p_nombre: alta.nombre,
      p_apellido: alta.apellido,
      p_documento: alta.documento,
      p_telefono: alta.telefono,
      p_correo: alta.correo,
      p_nacimiento: alta.nacimiento,
      p_nota: alta.nota,
      p_plan_id: alta.planId,
      p_inicio: alta.inicio,
      p_metodo: alta.metodo,
      p_monto: alta.monto,
    });

    if (error || !data) return fallo(mensajeDeErrorDeSocio(`${error?.code ?? ''} ${error?.message ?? ''}`));

    const resultado = data as Record<string, unknown>;
    return exito({
      customerId: String(resultado.customer_id),
      code: String(resultado.code ?? ''),
      token: texto(resultado.token),
      membershipId: texto(resultado.membership_id),
      paymentId: texto(resultado.payment_id),
      cuentaVinculada: resultado.cuenta_vinculada === true,
    });
  }

  async actualizar(customerId: string, cambios: CambiosDeSocio): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(customerId)) return fallo('Ese socio no existe.');
    const { data, error } = await this.supabase
      .from('customers')
      .update({
        first_name: cambios.nombre,
        last_name: cambios.apellido,
        document_id: cambios.documento,
        phone: cambios.telefono,
        email: cambios.correo,
        birth_date: cambios.nacimiento,
        notes: cambios.nota,
      })
      .eq('id', customerId)
      .select('id');

    if (error) {
      return fallo(
        error.code === '23505' ? 'Ya hay otro socio con ese documento.' : mensajeDeErrorDeSocio(error.message),
      );
    }
    return data && data.length > 0 ? exito(undefined) : fallo('Tu cuenta no puede editar socios.');
  }

  async archivar(customerId: string): Promise<ResultadoDeOperacion<void>> {
    return this.cambiarArchivo(customerId, true);
  }

  async restaurar(customerId: string): Promise<ResultadoDeOperacion<void>> {
    return this.cambiarArchivo(customerId, false);
  }

  private async cambiarArchivo(customerId: string, archivar: boolean): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(customerId)) return fallo('Ese socio no existe.');
    const { data, error } = await this.supabase
      .from('customers')
      .update(
        archivar
          ? { deleted_at: new Date().toISOString(), status: 'archived' }
          : { deleted_at: null, status: 'active' },
      )
      .eq('id', customerId)
      .select('id');

    if (error) return fallo(mensajeDeErrorDeSocio(error.message));
    return data && data.length > 0
      ? exito(undefined)
      : fallo(archivar ? 'Tu cuenta no puede archivar socios.' : 'Tu cuenta no puede restaurar socios.');
  }

  async rotarQr(customerId: string): Promise<ResultadoDeOperacion<string>> {
    if (!PATRON_UUID.test(customerId)) return fallo('Ese socio no existe.');
    const { data, error } = await this.supabase.rpc('rotar_token_check_in', { p_customer: customerId });
    if (error || typeof data !== 'string') return fallo(mensajeDeErrorDeSocio(error?.message ?? ''));
    return exito(data);
  }

  async venderMembresia(venta: VentaDeMembresia): Promise<ResultadoDeOperacion<{ readonly inicio: string }>> {
    if (!PATRON_UUID.test(venta.customerId) || !PATRON_UUID.test(venta.planId)) {
      return fallo('Elige un socio y un plan válidos.');
    }
    const { data, error } = await this.supabase.rpc('vender_membresia', {
      p_customer: venta.customerId,
      p_plan_id: venta.planId,
      p_inicio: venta.inicio,
      p_metodo: venta.metodo,
      p_monto: venta.monto,
      p_nota: venta.nota,
    });
    if (error || !data) return fallo(mensajeDeErrorDeSocio(`${error?.code ?? ''} ${error?.message ?? ''}`));
    return exito({ inicio: String((data as Record<string, unknown>).inicio ?? '') });
  }

  async actualizarMembresia(
    membershipId: string,
    cambios: CambiosDeMembresia,
  ): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(membershipId)) return fallo('Esa membresía no existe.');
    if (cambios.endDate <= cambios.startDate) return fallo('El fin tiene que ser posterior al inicio.');

    const { data, error } = await this.supabase
      .from('memberships')
      .update({ start_date: cambios.startDate, end_date: cambios.endDate, status: cambios.status })
      .eq('id', membershipId)
      .select('id');

    if (error) return fallo(mensajeDeErrorDeSocio(error.message));
    return data && data.length > 0 ? exito(undefined) : fallo('Tu cuenta no puede editar membresías.');
  }

  async desvincularCuenta(customerId: string): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(customerId)) return fallo('Ese socio no existe.');
    const { data, error } = await this.supabase
      .from('app_users')
      .update({ customer_id: null })
      .eq('customer_id', customerId)
      .select('id');

    if (error) return fallo(mensajeDeErrorDeSocio(error.message));
    return data && data.length > 0 ? exito(undefined) : fallo('Tu cuenta no puede desvincular cuentas.');
  }
}
