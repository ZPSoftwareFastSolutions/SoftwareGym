/**
 * CAPA: Infrastructure / Operations
 *
 * Implementación del puerto de operación contra Supabase.
 *
 * TODO el aislamiento entre gimnasios lo hace RLS, no este archivo. Aquí no
 * hay un solo `where tenant_id = ...` de seguridad: los que hay son para
 * elegir QUÉ mirar, no para decidir qué se puede mirar. Si alguna consulta se
 * escribiera mal, la base seguiría devolviendo únicamente las filas del
 * gimnasio de quien pregunta.
 *
 * Se instancia POR PETICIÓN, no como singleton de proceso: el cliente de
 * Supabase lleva las cookies de la sesión, y compartirlo entre peticiones
 * serviría los datos de un usuario a otro. Es la diferencia con
 * `tenantRepository()`, que no depende de quién pregunta.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FiltroDeAsistencia,
  OperationsRepositoryPort,
  SerieDiaria,
  SerieMensual,
} from '@core/application/ports/operations-repository.port';
import type {
  GimnasioDeLaPlataforma,
  IndicadoresDelGimnasio,
  VencimientoProximo,
} from '@core/domain/operations/dashboard';
import { numero } from '@core/domain/operations/dashboard';
import type {
  MetodoDeAsistencia,
  RegistroDeAsistencia,
  ResultadoDeCheckIn,
} from '@core/domain/operations/attendance';
import { FILTRO_SIN_SUCURSAL } from '@core/domain/operations/branches';
import type { AvisoInterno, MembresiaParaAvisar } from '@core/domain/operations/notifications';
import type { ClaveDeReporte, FilaDeReporte } from '@core/domain/operations/reports';
import type { PerfilOperativo } from '@core/domain/operations/workspace';

/**
 * Traducciones de los valores de la base para los reportes.
 *
 * `expiring_soon` es un valor de dominio; en una hoja de calculo que abre el
 * gerente tiene que decir «Por vencer». La base guarda el codigo y la
 * presentacion decide como se lee: al reves, cambiar el idioma de una
 * etiqueta obligaria a migrar datos.
 */
const ESTADO_LEGIBLE: Readonly<Record<string, string>> = {
  active: 'Activa',
  expiring_soon: 'Por vencer',
  expired: 'Vencida',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
};

const ESTADO_DE_SOCIO_LEGIBLE: Readonly<Record<string, string>> = {
  active: 'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

const METODO_DE_PAGO_LEGIBLE: Readonly<Record<string, string>> = {
  cash: 'Efectivo',
  qr: 'QR',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
};

/** Tope duro de filas. Una consulta sin límite es una página que se cuelga el día que hay datos de verdad. */
const TOPE_DE_FILAS = 500;

/** Formato del identificador de check-in, el mismo que impone la base. */
const PATRON_TOKEN = /^[0-9A-F]{24}$/;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fechaIso(desplazamiento: number): string {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() - desplazamiento);
  return fecha.toISOString().slice(0, 10);
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function metodo(valor: unknown): MetodoDeAsistencia {
  return valor === 'qr' || valor === 'kiosk' ? valor : 'manual';
}

export class SupabaseOperationsRepository implements OperationsRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async perfil(): Promise<PerfilOperativo | null> {
    const { data } = await this.supabase
      .from('v_my_profile')
      .select('id, tenant_id, full_name, email, tenant_slug, tenant_name, customer_id, roles, permissions')
      .maybeSingle();

    if (!data) return null;

    return {
      appUserId: String(data.id),
      tenantId: texto(data.tenant_id),
      fullName: texto(data.full_name) ?? 'Cuenta',
      email: texto(data.email) ?? '',
      tenantSlug: texto(data.tenant_slug),
      tenantName: texto(data.tenant_name),
      customerId: texto(data.customer_id),
      // `roles` y `permissions` llegan como arreglos de PostgreSQL. Un perfil
      // recién creado puede traerlos nulos; sin este saneado, `.includes()`
      // reventaría al decidir el espacio de trabajo.
      roles: Array.isArray(data.roles) ? data.roles.filter((r: unknown) => typeof r === 'string') : [],
      permissions: Array.isArray(data.permissions)
        ? data.permissions.filter((p: unknown) => typeof p === 'string')
        : [],
    };
  }

  async hoyDelGimnasio(tenantSlug: string): Promise<string> {
    // `v_dashboard_kpis` la calcula con la zona horaria del propio gimnasio.
    // Es legible por cualquiera que pertenezca a él —la fila sale de
    // `tenants`, no de los agregados—, así que también sirve para el socio.
    const { data } = await this.supabase
      .from('v_dashboard_kpis')
      .select('hoy')
      .eq('slug', tenantSlug)
      .maybeSingle();

    // Si no hubiera fila, la fecha del servidor es peor que nada pero mejor
    // que romper la página por un dato de presentación.
    return texto(data?.hoy) ?? fechaIso(0);
  }

  async indicadores(tenantSlug: string): Promise<IndicadoresDelGimnasio | null> {
    const { data } = await this.supabase
      .from('v_dashboard_kpis')
      .select('*')
      .eq('slug', tenantSlug)
      .maybeSingle();

    if (!data) return null;

    return {
      tenantName: texto(data.tenant_name) ?? '',
      currency: texto(data.currency) ?? 'BOB',
      hoy: texto(data.hoy) ?? fechaIso(0),
      sociosActivos: numero(data.socios_activos),
      membresiasActivas: numero(data.membresias_activas),
      membresiasPorVencer: numero(data.membresias_por_vencer),
      membresiasVencidas: numero(data.membresias_vencidas),
      asistenciasHoy: numero(data.asistencias_hoy),
      asistenciasSemana: numero(data.asistencias_semana),
      sociosActivosMes: numero(data.socios_activos_mes),
      ingresosMes: numero(data.ingresos_mes),
      ingresosMesAnterior: numero(data.ingresos_mes_anterior),
    };
  }

  async asistenciaDiaria(dias: number): Promise<readonly SerieDiaria[]> {
    const { data } = await this.supabase
      .from('v_attendance_daily')
      .select('dia, visitas, socios')
      .gte('dia', fechaIso(dias))
      .order('dia', { ascending: true });

    return (data ?? []).map((fila) => ({
      dia: texto(fila.dia) ?? '',
      visitas: numero(fila.visitas),
      socios: numero(fila.socios),
    }));
  }

  async ingresosMensuales(): Promise<readonly SerieMensual[]> {
    const { data } = await this.supabase
      .from('v_revenue_monthly')
      .select('mes, total, cobros')
      .order('mes', { ascending: true });

    return (data ?? []).map((fila) => ({
      mes: texto(fila.mes) ?? '',
      total: numero(fila.total),
      cobros: numero(fila.cobros),
    }));
  }

  async horasDeEntrada(dias: number): Promise<readonly number[]> {
    const { data } = await this.supabase
      .from('v_attendance_log')
      .select('checked_in_local')
      .gte('attendance_date', fechaIso(dias))
      .limit(TOPE_DE_FILAS);

    // `checked_in_local` llega como `2026-09-09T18:04:00`, SIN zona: ya viene
    // en la hora del gimnasio. Se leen las dos cifras de la hora del texto en
    // vez de construir un `Date`, porque a una cadena sin zona el motor de
    // JavaScript le aplica la SUYA y la hora pico saldria desplazada.
    return (data ?? [])
      .map((fila) => Number(String(fila.checked_in_local).slice(11, 13)))
      .filter((hora) => Number.isInteger(hora) && hora >= 0 && hora <= 23);
  }

  async historialDeAsistencia(
    filtro: FiltroDeAsistencia,
  ): Promise<readonly RegistroDeAsistencia[]> {
    let consulta = this.supabase
      .from('v_attendance_log')
      .select(
        'id, customer_id, customer_name, customer_code, checked_in_local, attendance_date, method, branch_id, branch_name, membership_id',
      )
      .order('checked_in_at', { ascending: false })
      .limit(Math.min(filtro.limite ?? 50, TOPE_DE_FILAS));

    if (filtro.desde) consulta = consulta.gte('attendance_date', filtro.desde);
    if (filtro.hasta) consulta = consulta.lte('attendance_date', filtro.hasta);
    if (filtro.customerId && PATRON_UUID.test(filtro.customerId)) consulta = consulta.eq('customer_id', filtro.customerId);
    if (filtro.sucursal === FILTRO_SIN_SUCURSAL) consulta = consulta.is('branch_id', null);
    else if (filtro.sucursal && PATRON_UUID.test(filtro.sucursal)) consulta = consulta.eq('branch_id', filtro.sucursal);

    const busqueda = filtro.busqueda?.trim();
    if (busqueda) {
      // Se escapan las comas y los paréntesis antes de meterlos en un `or`:
      // PostgREST separa las condiciones por coma, y un socio buscado como
      // «Pérez, Juan» partiría la expresión en dos filtros sin sentido.
      const seguro = busqueda.replace(/[,()*]/g, ' ').trim();
      if (seguro) {
        consulta = consulta.or(`customer_name.ilike.%${seguro}%,customer_code.ilike.%${seguro}%`);
      }
    }

    const { data } = await consulta;

    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      customerId: String(fila.customer_id),
      customerName: texto(fila.customer_name) ?? 'Socio',
      customerCode: texto(fila.customer_code),
      checkedInAt: String(fila.checked_in_local),
      attendanceDate: texto(fila.attendance_date) ?? '',
      method: metodo(fila.method),
      branchId: texto(fila.branch_id),
      branchName: texto(fila.branch_name),
      membershipId: texto(fila.membership_id),
    }));
  }

  async vencimientos(): Promise<readonly VencimientoProximo[]> {
    const { data } = await this.supabase
      .from('v_expiring_memberships')
      .select(
        'membership_id, customer_id, customer_name, customer_code, plan_name, end_date, days_remaining, effective_status, phone',
      )
      .order('end_date', { ascending: true })
      .limit(TOPE_DE_FILAS);

    return (data ?? []).map((fila) => ({
      membershipId: String(fila.membership_id),
      customerId: String(fila.customer_id),
      customerName: texto(fila.customer_name) ?? 'Socio',
      customerCode: texto(fila.customer_code),
      planName: texto(fila.plan_name),
      endDate: texto(fila.end_date) ?? '',
      daysRemaining: numero(fila.days_remaining),
      effectiveStatus: texto(fila.effective_status) ?? 'active',
      phone: texto(fila.phone),
    }));
  }

  async avisos(): Promise<readonly AvisoInterno[]> {
    const { data } = await this.supabase
      .from('notices')
      .select('id, title, body, starts_at, ends_at, notice_reads(read_at)')
      .order('starts_at', { ascending: false })
      .limit(20);

    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      title: texto(fila.title) ?? '',
      body: texto(fila.body) ?? '',
      startsAt: String(fila.starts_at),
      endsAt: texto(fila.ends_at),
      // `notice_reads` solo devuelve las marcas del propio usuario: su RLS no
      // deja ver las de nadie más. Que venga una fila significa «yo lo leí».
      leido: Array.isArray(fila.notice_reads) && fila.notice_reads.length > 0,
    }));
  }

  async gimnasios(): Promise<readonly GimnasioDeLaPlataforma[]> {
    const { data } = await this.supabase
      .from('v_platform_overview')
      .select('*')
      .order('name', { ascending: true });

    return (data ?? []).map((fila) => ({
      tenantId: String(fila.tenant_id),
      slug: texto(fila.slug) ?? '',
      name: texto(fila.name) ?? '',
      status: texto(fila.status) ?? 'active',
      isDemo: fila.is_demo === true,
      timezone: texto(fila.timezone) ?? 'UTC',
      currency: texto(fila.currency) ?? 'BOB',
      cuentas: numero(fila.cuentas),
      cuentasActivas: numero(fila.cuentas_activas),
      sucursales: numero(fila.sucursales),
    }));
  }

  async miMembresia(): Promise<MembresiaParaAvisar | null> {
    // Sin `eq('customer_id', ...)`: la política `memberships_select_self` ya
    // reduce la vista a las filas del socio. Filtrar aquí sería repetir en la
    // aplicación una decisión que ya toma la base, y repetirla es cómo se
    // acaba confiando en la copia equivocada.
    const { data } = await this.supabase
      .from('v_memberships')
      .select('end_date, effective_status, days_remaining')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      endDate: texto(data.end_date) ?? '',
      effectiveStatus: texto(data.effective_status) ?? 'active',
      daysRemaining: numero(data.days_remaining),
    };
  }

  async miTokenDeCheckIn(): Promise<string | null> {
    const { data } = await this.supabase
      .from('check_in_tokens')
      .select('token')
      .maybeSingle();

    return texto(data?.token);
  }

  async misDiasDeAsistencia(dias: number): Promise<readonly string[]> {
    const { data } = await this.supabase
      .from('v_attendance_log')
      .select('attendance_date')
      .gte('attendance_date', fechaIso(dias))
      .order('attendance_date', { ascending: false })
      .limit(TOPE_DE_FILAS);

    return (data ?? []).map((fila) => texto(fila.attendance_date) ?? '').filter(Boolean);
  }

  async registrarCheckIn(
    token: string,
    sucursal: { readonly id: string; readonly name: string },
  ): Promise<ResultadoDeCheckIn> {
    const limpio = token.trim().toUpperCase();

    // Se valida la forma antes de consultar. No es una optimización: evita
    // mandar a la base cualquier cosa que alguien teclee en el buscador.
    if (!PATRON_TOKEN.test(limpio)) return { tipo: 'desconocido' };

    const { data: fila } = await this.supabase
      .from('check_in_tokens')
      .select('customer_id, tenant_id')
      .eq('token', limpio)
      .maybeSingle();

    // Token inexistente y token de otro gimnasio dan el MISMO resultado, y no
    // por descuido: distinguirlos convertiría el mostrador en un comprobador
    // de qué códigos existen en la instalación. Aquí ni siquiera hace falta
    // acordarse, porque RLS no devuelve la fila ajena.
    if (!fila) return { tipo: 'desconocido' };

    const customerId = String(fila.customer_id);
    const tenantId = String(fila.tenant_id);

    const { data: socio } = await this.supabase
      .from('customers')
      .select('first_name, last_name')
      .eq('id', customerId)
      .maybeSingle();

    const nombre = socio
      ? `${texto(socio.first_name) ?? ''} ${texto(socio.last_name) ?? ''}`.trim()
      : 'Socio';

    const { data: membresia } = await this.supabase
      .from('v_memberships')
      .select('effective_status, days_remaining')
      .eq('customer_id', customerId)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const ahora = new Date();
    // Ni la hora ni la fecha ni la autoría viajan desde aquí: la base las pone
    // (y no concede permiso para escribirlas). Lo que decide esta capa es la
    // SEDE, y la base vuelve a comprobar que quien escanea puede operar en ella.
    const { error } = await this.supabase.from('attendance_records').insert({
      tenant_id: tenantId,
      customer_id: customerId,
      branch_id: sucursal.id,
      method: 'qr',
    });

    if (error) {
      // 23505 es la violación de `attendance_tenant_customer_dia_uk`: ya se
      // registró hoy. No es un fallo, es información para el mostrador. La
      // regla sigue siendo UNA entrada por día aunque sea en otra sede, y
      // decir dónde entró evita la discusión en el mostrador.
      if (error.code === '23505') {
        const { data: previa } = await this.supabase
          .from('v_attendance_log')
          .select('checked_in_at, branch_name')
          .eq('customer_id', customerId)
          .order('checked_in_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          tipo: 'repetido',
          socio: nombre,
          hora: texto(previa?.checked_in_at) ?? ahora.toISOString(),
          sucursal: texto(previa?.branch_name),
        };
      }
      if (error.message.includes('sucursal_no_disponible') || error.message.includes('sucursal_requerida')) {
        return { tipo: 'error', mensaje: `La sucursal ${sucursal.name} no está activa. Elige otra sede de trabajo.` };
      }
      // 42501 es «RLS lo bloqueó»: sin permiso de asistencia o sin alcance en
      // esta sede. Para quien está en el mostrador, las dos se arreglan igual.
      if (error.code === '42501') {
        return { tipo: 'error', mensaje: `Tu cuenta no puede registrar entradas en ${sucursal.name}. Pide a gerencia que te asigne a esta sede.` };
      }
      return { tipo: 'error', mensaje: 'No se pudo registrar la entrada. Vuelve a intentarlo.' };
    }

    if (!membresia || membresia.effective_status === 'expired') {
      // La entrada QUEDÓ registrada: quien llegó, llegó, y borrarlo sería
      // falsear la asistencia. Lo que devuelve es el aviso para que
      // recepción le ofrezca la renovación.
      return { tipo: 'sin-membresia', socio: nombre, sucursal: sucursal.name };
    }

    return {
      tipo: 'registrado',
      socio: nombre,
      hora: ahora.toISOString(),
      diasRestantes: numero(membresia.days_remaining, 0),
      sucursal: sucursal.name,
    };
  }
}
