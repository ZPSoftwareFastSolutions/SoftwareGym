/**
 * CAPA: Infrastructure / Operations
 *
 * Reportes contra Supabase.
 *
 * Cada reporte aplica SOLO los filtros que su definición declara: la página ya
 * no ofrece los demás, pero una URL escrita a mano sí podría traerlos, y un
 * filtro que no tiene sentido para ese reporte no debe vaciarlo en silencio.
 *
 * Los valores de la base (`expiring_soon`, `cash`) se traducen aquí a texto
 * legible. La base guarda códigos y el reporte habla español: al revés, cambiar
 * una etiqueta obligaría a migrar datos.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportsRepositoryPort } from '@core/application/ports/reports-repository.port';
import {
  reportePorClave,
  type ClaveDeReporte,
  type FilaDeReporte,
  type FiltroDeReporte,
  type TipoDeFiltro,
} from '@core/domain/operations/reports';
import {
  diasDesde,
  esEstadoDeMembresia,
  esMetodoDePago,
  NOMBRE_DE_ESTADO_DE_MEMBRESIA,
  NOMBRE_DE_ESTADO_DE_SOCIO,
  NOMBRE_DE_METODO_DE_PAGO,
} from '@core/domain/operations/members';
import {
  esEstadoDeComprobante,
  esOrigenDeComprobante,
  NOMBRE_DE_ESTADO_DE_COMPROBANTE,
  NOMBRE_DE_ORIGEN,
} from '@core/domain/operations/receipts';
import { NOMBRE_DE_METODO, type MetodoDeAsistencia } from '@core/domain/operations/attendance';
import { NOMBRE_DE_ROL, type CodigoDeRol } from '@core/domain/operations/workspace';
import { numero } from '@core/domain/operations/dashboard';
import { ETIQUETA_SIN_SUCURSAL, FILTRO_SIN_SUCURSAL } from '@core/domain/operations/branches';
import { diasDelRango, porcentaje } from '@core/domain/operations/reports';

const TOPE = 2000;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ESTADO_DE_CUENTA: Readonly<Record<string, string>> = {
  invited: 'Invitada',
  active: 'Activa',
  suspended: 'Suspendida',
};

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function busquedaSegura(q: string | undefined): string | null {
  const limpia = (q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
  return limpia || null;
}

function esMetodoDeAsistencia(valor: unknown): valor is MetodoDeAsistencia {
  return valor === 'manual' || valor === 'qr' || valor === 'kiosk';
}

/** Código de sede (el mismo patrón que la base) o el histórico sin sede. */
function esFiltroDeSucursal(valor: unknown): valor is string {
  return typeof valor === 'string' && (valor === FILTRO_SIN_SUCURSAL || /^[A-Z0-9]{2,12}$/.test(valor));
}

function esRol(valor: unknown): valor is CodigoDeRol {
  return typeof valor === 'string' && valor in NOMBRE_DE_ROL;
}

/**
 * Filtro recortado a lo que el reporte admite. Lo que no declara, desaparece;
 * lo que trae un valor fuera de su dominio, también.
 */
function filtroAdmitido(clave: ClaveDeReporte, filtro: FiltroDeReporte): FiltroDeReporte {
  const admitidos = new Set<TipoDeFiltro>(reportePorClave(clave)?.filtros ?? []);
  const estado = filtro.estado;
  const estadoValido =
    (admitidos.has('estado-membresia') && (esEstadoDeMembresia(estado) || estado === 'sin-membresia')) ||
    (admitidos.has('estado-comprobante') && esEstadoDeComprobante(estado)) ||
    (admitidos.has('estado-socio') && (estado === 'active' || estado === 'inactive' || estado === 'archived'));

  const metodoValido =
    (admitidos.has('metodo-pago') && esMetodoDePago(filtro.metodo)) ||
    (admitidos.has('metodo-asistencia') && esMetodoDeAsistencia(filtro.metodo));

  return {
    ...(admitidos.has('periodo') && filtro.desde ? { desde: filtro.desde } : {}),
    ...(admitidos.has('periodo') && filtro.hasta ? { hasta: filtro.hasta } : {}),
    ...(estadoValido ? { estado } : {}),
    ...(admitidos.has('plan') && filtro.planId && PATRON_UUID.test(filtro.planId) ? { planId: filtro.planId } : {}),
    ...(metodoValido ? { metodo: filtro.metodo } : {}),
    ...(admitidos.has('origen') && esOrigenDeComprobante(filtro.origen) ? { origen: filtro.origen } : {}),
    ...(admitidos.has('rol') && esRol(filtro.rol) ? { rol: filtro.rol } : {}),
    ...(admitidos.has('sucursal') && esFiltroDeSucursal(filtro.sucursal) ? { sucursal: filtro.sucursal } : {}),
    ...(admitidos.has('busqueda') && busquedaSegura(filtro.q) ? { q: busquedaSegura(filtro.q) ?? undefined } : {}),
  };
}

export class SupabaseReportsRepository implements ReportsRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async filas(clave: ClaveDeReporte, filtroCrudo: FiltroDeReporte, hoy: string): Promise<readonly FilaDeReporte[]> {
    const filtro = filtroAdmitido(clave, filtroCrudo);
    switch (clave) {
      case 'asistencia':
        return this.asistencia(filtro);
      case 'asistencia-por-socio':
        return this.asistenciaPorSocio(filtro, hoy);
      case 'asistencia-por-sucursal':
        return this.asistenciaPorSucursal(filtro, hoy);
      case 'membresias':
        return this.membresias(filtro);
      case 'vencimientos':
        return this.vencimientos(filtro);
      case 'pagos':
        return this.pagos(filtro);
      case 'ingresos-por-plan':
        return this.ingresosPorPlan(filtro);
      case 'comprobantes':
        return this.comprobantes(filtro);
      case 'clientes':
        return this.clientes(filtro);
      case 'usuarios':
        return this.usuarios(filtro);
    }
  }

  /** Nombre del plan a partir de su id, para las vistas que solo traen el nombre. */
  private async nombreDePlan(planId: string | undefined): Promise<string | null> {
    if (!planId) return null;
    const { data } = await this.supabase.from('membership_plans').select('name').eq('id', planId).maybeSingle();
    return typeof data?.name === 'string' ? data.name : '__plan_inexistente__';
  }

  private async asistencia(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    const { data: fichas } = await this.supabase.from('v_customer_detail').select('id, plan_id, plan_name');
    const planDeSocio = new Map((fichas ?? []).map((f) => [String(f.id), texto(f.plan_name)]));

    let consulta = this.supabase
      .from('v_attendance_log')
      .select('attendance_date, checked_in_local, customer_id, customer_name, customer_code, method, branch_name')
      .order('checked_in_local', { ascending: false })
      .limit(TOPE);

    if (filtro.desde) consulta = consulta.gte('attendance_date', filtro.desde);
    if (filtro.hasta) consulta = consulta.lte('attendance_date', filtro.hasta);
    if (filtro.metodo) consulta = consulta.eq('method', filtro.metodo);
    if (filtro.sucursal === FILTRO_SIN_SUCURSAL) consulta = consulta.is('branch_id', null);
    else if (filtro.sucursal) consulta = consulta.eq('branch_code', filtro.sucursal);
    if (filtro.planId) {
      const ids = (fichas ?? []).filter((f) => f.plan_id === filtro.planId).map((f) => String(f.id));
      if (ids.length === 0) return [];
      consulta = consulta.in('customer_id', ids);
    }
    if (filtro.q) consulta = consulta.or(`customer_name.ilike.%${filtro.q}%,customer_code.ilike.%${filtro.q}%`);

    const { data } = await consulta;
    return (data ?? []).map((fila) => ({
      fecha: texto(fila.attendance_date),
      // La hora se recorta del texto local, en 24 h: sin convertir de nuevo.
      hora: texto(fila.checked_in_local).slice(11, 16),
      socio: texto(fila.customer_name),
      codigo: texto(fila.customer_code),
      plan: planDeSocio.get(String(fila.customer_id)) ?? '',
      sucursal: texto(fila.branch_name) || ETIQUETA_SIN_SUCURSAL,
      metodo: esMetodoDeAsistencia(fila.method) ? NOMBRE_DE_METODO[fila.method] : texto(fila.method),
    }));
  }

  private async asistenciaPorSocio(filtro: FiltroDeReporte, hoy: string): Promise<readonly FilaDeReporte[]> {
    let fichas = this.supabase
      .from('v_customer_detail')
      .select('id, full_name, code, plan_name, membership_status, last_visit')
      .is('deleted_at', null)
      .limit(TOPE);
    if (filtro.planId) fichas = fichas.eq('plan_id', filtro.planId);
    if (filtro.estado === 'sin-membresia') fichas = fichas.is('membership_id', null);
    else if (filtro.estado) fichas = fichas.eq('membership_status', filtro.estado);
    if (filtro.q) fichas = fichas.or(`full_name.ilike.%${filtro.q}%,code.ilike.%${filtro.q}%`);

    let entradas = this.supabase.from('v_attendance_log').select('customer_id').limit(20_000);
    if (filtro.desde) entradas = entradas.gte('attendance_date', filtro.desde);
    if (filtro.hasta) entradas = entradas.lte('attendance_date', filtro.hasta);
    if (filtro.sucursal === FILTRO_SIN_SUCURSAL) entradas = entradas.is('branch_id', null);
    else if (filtro.sucursal) entradas = entradas.eq('branch_code', filtro.sucursal);

    const [{ data: socios }, { data: visitas }] = await Promise.all([fichas, entradas]);

    const conteo = new Map<string, number>();
    for (const visita of visitas ?? []) {
      const id = String(visita.customer_id);
      conteo.set(id, (conteo.get(id) ?? 0) + 1);
    }

    return (socios ?? [])
      .map((socio) => {
        const ultima = texto(socio.last_visit) || null;
        return {
          socio: texto(socio.full_name),
          codigo: texto(socio.code),
          plan: texto(socio.plan_name),
          visitas: conteo.get(String(socio.id)) ?? 0,
          ultima: ultima ?? '',
          dias: diasDesde(ultima, hoy),
        };
      })
      .sort((a, b) => b.visitas - a.visitas || a.socio.localeCompare(b.socio));
  }

  /**
   * Comparativa de sedes. Cada sede ACTIVA aparece aunque no tenga entradas:
   * una sede a cero en el periodo es justo lo que el gerente tiene que ver, y
   * omitirla la haría desaparecer del reporte. Las inactivas y el histórico
   * sin sede solo aparecen si tienen entradas en el periodo.
   */
  private async asistenciaPorSucursal(filtro: FiltroDeReporte, hoy: string): Promise<readonly FilaDeReporte[]> {
    let entradas = this.supabase
      .from('v_attendance_log')
      .select('branch_id, customer_id, attendance_date')
      .limit(20_000);
    if (filtro.desde) entradas = entradas.gte('attendance_date', filtro.desde);
    if (filtro.hasta) entradas = entradas.lte('attendance_date', filtro.hasta);
    if (filtro.metodo) entradas = entradas.eq('method', filtro.metodo);

    const [{ data: visitas }, { data: sedes }] = await Promise.all([
      entradas,
      this.supabase.from('branches').select('id, name, is_active').order('name'),
    ]);

    const acumulado = new Map<string, { entradas: number; socios: Set<string> }>();
    let primeraFecha: string | null = null;
    for (const visita of visitas ?? []) {
      const clave = texto(visita.branch_id) || FILTRO_SIN_SUCURSAL;
      const actual = acumulado.get(clave) ?? { entradas: 0, socios: new Set<string>() };
      actual.entradas += 1;
      actual.socios.add(String(visita.customer_id));
      acumulado.set(clave, actual);
      const fecha = texto(visita.attendance_date);
      if (fecha && (!primeraFecha || fecha < primeraFecha)) primeraFecha = fecha;
    }

    const total = [...acumulado.values()].reduce((suma, sede) => suma + sede.entradas, 0);
    const dias = diasDelRango(filtro.desde ?? primeraFecha ?? hoy, filtro.hasta ?? hoy, hoy);
    const fila = (nombre: string, datos: { entradas: number; socios: Set<string> } | undefined) => ({
      sucursal: nombre,
      entradas: datos?.entradas ?? 0,
      socios: datos?.socios.size ?? 0,
      promedio: Math.round(((datos?.entradas ?? 0) / dias) * 10) / 10,
      porcentaje: porcentaje(datos?.entradas ?? 0, total),
    });

    const filas = (sedes ?? [])
      .filter((sede) => sede.is_active === true || acumulado.has(String(sede.id)))
      .map((sede) => fila(sede.is_active === true ? texto(sede.name) ?? 'Sucursal' : `${texto(sede.name) ?? 'Sucursal'} (inactiva)`, acumulado.get(String(sede.id))))
      .sort((a, b) => b.entradas - a.entradas || a.sucursal.localeCompare(b.sucursal, 'es'));

    const historico = acumulado.get(FILTRO_SIN_SUCURSAL);
    return historico ? [...filas, fila(ETIQUETA_SIN_SUCURSAL, historico)] : filas;
  }

  private async membresias(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    const plan = await this.nombreDePlan(filtro.planId);
    let consulta = this.supabase
      .from('v_memberships_report')
      .select('customer_name, customer_code, plan_name, start_date, end_date, effective_status, price')
      .order('start_date', { ascending: false })
      .limit(TOPE);

    if (filtro.desde) consulta = consulta.gte('start_date', filtro.desde);
    if (filtro.hasta) consulta = consulta.lte('start_date', filtro.hasta);
    if (filtro.estado && filtro.estado !== 'sin-membresia') consulta = consulta.eq('effective_status', filtro.estado);
    if (plan) consulta = consulta.eq('plan_name', plan);
    if (filtro.q) consulta = consulta.or(`customer_name.ilike.%${filtro.q}%,customer_code.ilike.%${filtro.q}%`);

    const { data } = await consulta;
    return (data ?? []).map((fila) => ({
      socio: texto(fila.customer_name),
      plan: texto(fila.plan_name),
      inicio: texto(fila.start_date),
      fin: texto(fila.end_date),
      estado: esEstadoDeMembresia(fila.effective_status) ? NOMBRE_DE_ESTADO_DE_MEMBRESIA[fila.effective_status] : '',
      precio: numero(fila.price),
    }));
  }

  private async vencimientos(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    const plan = await this.nombreDePlan(filtro.planId);
    let consulta = this.supabase
      .from('v_expiring_memberships')
      .select('end_date, customer_name, customer_code, plan_name, days_remaining, effective_status, phone')
      .order('end_date', { ascending: true })
      .limit(TOPE);

    if (filtro.estado && filtro.estado !== 'sin-membresia') consulta = consulta.eq('effective_status', filtro.estado);
    if (plan) consulta = consulta.eq('plan_name', plan);
    if (filtro.q) consulta = consulta.or(`customer_name.ilike.%${filtro.q}%,customer_code.ilike.%${filtro.q}%`);

    const { data } = await consulta;
    return (data ?? []).map((fila) => ({
      fin: texto(fila.end_date),
      socio: texto(fila.customer_name),
      plan: texto(fila.plan_name),
      dias: numero(fila.days_remaining),
      estado: esEstadoDeMembresia(fila.effective_status) ? NOMBRE_DE_ESTADO_DE_MEMBRESIA[fila.effective_status] : '',
      telefono: texto(fila.phone),
    }));
  }

  private consultaDePagos(filtro: FiltroDeReporte, columnas: string) {
    let consulta = this.supabase
      .from('v_payments_report')
      .select(columnas)
      // Un cobro con fecha futura no es dinero que haya entrado (V2.1).
      .lte('paid_at', new Date().toISOString())
      .order('paid_at', { ascending: false })
      .limit(TOPE);
    if (filtro.desde) consulta = consulta.gte('paid_date', filtro.desde);
    if (filtro.hasta) consulta = consulta.lte('paid_date', filtro.hasta);
    if (filtro.metodo) consulta = consulta.eq('method', filtro.metodo);
    if (filtro.planId) consulta = consulta.eq('plan_id', filtro.planId);
    return consulta;
  }

  private async pagos(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    let consulta = this.consultaDePagos(filtro, 'paid_date, customer_name, customer_code, plan_name, method, amount, notes');
    if (filtro.q) consulta = consulta.or(`customer_name.ilike.%${filtro.q}%,customer_code.ilike.%${filtro.q}%`);
    const { data } = await consulta;
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((fila) => ({
      fecha: texto(fila.paid_date),
      socio: texto(fila.customer_name),
      plan: texto(fila.plan_name),
      metodo: esMetodoDePago(fila.method) ? NOMBRE_DE_METODO_DE_PAGO[fila.method] : texto(fila.method),
      importe: numero(fila.amount),
      nota: texto(fila.notes),
    }));
  }

  private async ingresosPorPlan(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    const { data } = await this.consultaDePagos(filtro, 'plan_name, amount');
    const acumulado = new Map<string, { cobros: number; total: number }>();
    for (const fila of (data ?? []) as unknown as Record<string, unknown>[]) {
      // Un cobro sin membresía —una sesión suelta, un producto— también es
      // dinero del periodo. Se agrupa aparte en vez de perderse.
      const plan = texto(fila.plan_name) || 'Sin plan asociado';
      const actual = acumulado.get(plan) ?? { cobros: 0, total: 0 };
      actual.cobros += 1;
      actual.total += numero(fila.amount);
      acumulado.set(plan, actual);
    }
    return [...acumulado.entries()]
      .map(([plan, { cobros, total }]) => ({
        plan,
        cobros,
        total: Math.round(total * 100) / 100,
        promedio: cobros > 0 ? Math.round((total / cobros) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  private async comprobantes(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    let consulta = this.supabase
      .from('v_receipts')
      .select('receipt_date, created_local, customer_name, customer_code, plan_name, amount, status, source')
      .order('created_at', { ascending: false })
      .limit(TOPE);
    if (filtro.desde) consulta = consulta.gte('receipt_date', filtro.desde);
    if (filtro.hasta) consulta = consulta.lte('receipt_date', filtro.hasta);
    if (filtro.estado) consulta = consulta.eq('status', filtro.estado);
    if (filtro.origen) consulta = consulta.eq('source', filtro.origen);
    if (filtro.planId) consulta = consulta.eq('plan_id', filtro.planId);
    if (filtro.q) consulta = consulta.or(`customer_name.ilike.%${filtro.q}%,customer_code.ilike.%${filtro.q}%`);

    const { data } = await consulta;
    return (data ?? []).map((fila) => ({
      fecha: texto(fila.receipt_date),
      hora: texto(fila.created_local).slice(11, 16),
      socio: texto(fila.customer_name),
      plan: texto(fila.plan_name),
      importe: numero(fila.amount),
      estado: esEstadoDeComprobante(fila.status) ? NOMBRE_DE_ESTADO_DE_COMPROBANTE[fila.status] : '',
      origen: esOrigenDeComprobante(fila.source) ? NOMBRE_DE_ORIGEN[fila.source] : '',
    }));
  }

  private async clientes(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    let consulta = this.supabase
      .from('v_customer_detail')
      .select('code, full_name, plan_name, membership_status, phone, email, status, deleted_at')
      .order('last_name', { ascending: true })
      .limit(TOPE);

    if (filtro.estado === 'archived') consulta = consulta.not('deleted_at', 'is', null);
    else {
      consulta = consulta.is('deleted_at', null);
      if (filtro.estado === 'active' || filtro.estado === 'inactive') consulta = consulta.eq('status', filtro.estado);
      else if (filtro.estado === 'sin-membresia') consulta = consulta.is('membership_id', null);
      else if (esEstadoDeMembresia(filtro.estado)) consulta = consulta.eq('membership_status', filtro.estado);
    }
    if (filtro.planId) consulta = consulta.eq('plan_id', filtro.planId);
    if (filtro.q) {
      consulta = consulta.or(
        `full_name.ilike.%${filtro.q}%,code.ilike.%${filtro.q}%,email.ilike.%${filtro.q}%,phone.ilike.%${filtro.q}%`,
      );
    }

    const { data } = await consulta;
    return (data ?? []).map((fila) => {
      const estado: unknown = fila.deleted_at ? 'archived' : fila.status;
      return {
        codigo: texto(fila.code),
        socio: texto(fila.full_name),
        plan: texto(fila.plan_name),
        membresia: esEstadoDeMembresia(fila.membership_status)
          ? NOMBRE_DE_ESTADO_DE_MEMBRESIA[fila.membership_status]
          : 'Sin membresía',
        telefono: texto(fila.phone),
        correo: texto(fila.email),
        estado:
          estado === 'active' || estado === 'inactive' || estado === 'archived'
            ? NOMBRE_DE_ESTADO_DE_SOCIO[estado]
            : '',
      };
    });
  }

  private async usuarios(filtro: FiltroDeReporte): Promise<readonly FilaDeReporte[]> {
    let consulta = this.supabase
      .from('v_users_roles')
      .select('full_name, email, roles, status, created_at')
      .order('full_name', { ascending: true })
      .limit(TOPE);
    if (filtro.rol) consulta = consulta.contains('roles', [filtro.rol]);
    if (filtro.q) consulta = consulta.or(`full_name.ilike.%${filtro.q}%,email.ilike.%${filtro.q}%`);

    const { data } = await consulta;
    return (data ?? []).map((fila) => {
      const roles = Array.isArray(fila.roles) ? fila.roles.filter(esRol) : [];
      return {
        nombre: texto(fila.full_name),
        correo: texto(fila.email),
        rol: roles.map((rol) => NOMBRE_DE_ROL[rol]).join(', ') || 'Sin rol',
        estado: ESTADO_DE_CUENTA[texto(fila.status)] ?? texto(fila.status),
        alta: texto(fila.created_at).slice(0, 10),
      };
    });
  }
}
