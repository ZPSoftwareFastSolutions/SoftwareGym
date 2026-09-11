/**
 * CAPA: Infrastructure / Operations
 *
 * Sucursales contra Supabase.
 *
 * Como en el resto de repositorios operativos, aquí no hay un solo filtro de
 * seguridad: qué sedes existen para quien pregunta lo decide RLS, y si puede
 * operar en una lo decide `app.puede_operar_sucursal`, la misma función que
 * aplica la política de INSERT de asistencia.
 *
 * Los errores de la base se traducen a frases de mostrador. Un
 * `23514 branches_primaria_activa` no le dice nada a un gerente; «primero
 * elige otra sede principal» sí.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BranchesRepositoryPort,
  PublicBranchesPort,
  SerieDiariaDeSucursal,
} from '@core/application/ports/branches-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import type {
  DatosDeSucursal,
  IndicadoresDeSucursal,
  PersonalDeSucursales,
  Sucursal,
  SucursalOperable,
} from '@core/domain/operations/branches';
import { numero } from '@core/domain/operations/dashboard';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNAS = 'id, code, name, address, phone, email, opening_hours, latitude, longitude, google_maps_url, is_primary, is_active';

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function coordenada(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function aSucursal(fila: Record<string, unknown>): Sucursal {
  return {
    id: String(fila.id),
    code: String(fila.code ?? ''),
    name: String(fila.name ?? ''),
    address: texto(fila.address),
    phone: texto(fila.phone),
    email: texto(fila.email),
    openingHours: texto(fila.opening_hours),
    latitude: coordenada(fila.latitude),
    longitude: coordenada(fila.longitude),
    googleMapsUrl: texto(fila.google_maps_url),
    isPrimary: fila.is_primary === true,
    isActive: fila.is_active === true,
  };
}

function aFila(datos: DatosDeSucursal) {
  return {
    code: datos.code,
    name: datos.name,
    address: datos.address,
    phone: datos.phone,
    email: datos.email,
    opening_hours: datos.openingHours,
    latitude: datos.latitude,
    longitude: datos.longitude,
    google_maps_url: datos.googleMapsUrl,
  };
}

function mensajeDeError(error: { code?: string; message?: string } | null): string {
  const detalle = `${error?.code ?? ''} ${error?.message ?? ''}`;
  if (detalle.includes('branches_tenant_code_uk')) return 'Ya hay otra sucursal con ese código.';
  if (detalle.includes('branches_tenant_name_uk')) return 'Ya hay otra sucursal con ese nombre.';
  if (detalle.includes('branches_primaria_activa')) return 'La sucursal principal no se puede desactivar. Elige primero otra sede principal.';
  if (detalle.includes('sucursal_inactiva')) return 'Activa la sucursal antes de hacerla principal.';
  if (detalle.includes('user_branches_usuario_del_mismo_gimnasio')) return 'Esa cuenta no pertenece a este gimnasio.';
  if (detalle.includes('23514')) return 'Algún dato no tiene el formato esperado. Revisa los campos.';
  if (error?.code === '42501' || detalle.includes('sin_permiso')) return 'Tu cuenta no puede administrar sucursales.';
  return 'No se pudo guardar. Vuelve a intentarlo.';
}

export class SupabaseBranchesRepository implements BranchesRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(): Promise<readonly Sucursal[]> {
    const { data } = await this.supabase
      .from('branches')
      .select(COLUMNAS)
      .order('is_active', { ascending: false })
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });
    return (data ?? []).map((fila) => aSucursal(fila));
  }

  async porId(id: string): Promise<Sucursal | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('branches').select(COLUMNAS).eq('id', id).maybeSingle();
    return data ? aSucursal(data) : null;
  }

  async misSucursales(): Promise<readonly SucursalOperable[]> {
    const { data } = await this.supabase
      .from('v_mis_sucursales')
      .select('id, code, name, address, is_primary, is_active, puede_operar, asignada')
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      code: String(fila.code ?? ''),
      name: String(fila.name ?? ''),
      address: texto(fila.address),
      isPrimary: fila.is_primary === true,
      isActive: fila.is_active === true,
      puedeOperar: fila.puede_operar === true,
      asignada: fila.asignada === true,
    }));
  }

  async indicadores(): Promise<readonly IndicadoresDeSucursal[]> {
    const { data } = await this.supabase
      .from('v_branch_overview')
      .select('*')
      .order('is_active', { ascending: false })
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    return (data ?? []).map((fila) => ({
      id: String(fila.id),
      code: String(fila.code ?? ''),
      name: String(fila.name ?? ''),
      address: texto(fila.address),
      isPrimary: fila.is_primary === true,
      isActive: fila.is_active === true,
      hoy: texto(fila.hoy) ?? '',
      asistenciasHoy: numero(fila.asistencias_hoy),
      asistenciasSemana: numero(fila.asistencias_semana),
      asistencias30d: numero(fila.asistencias_30d),
      socios30d: numero(fila.socios_30d),
      ultimaEntrada: texto(fila.ultima_entrada),
      usuariosAsignados: numero(fila.usuarios_asignados),
    }));
  }

  async serieDiaria(dias: number): Promise<readonly SerieDiariaDeSucursal[]> {
    const desde = new Date(Date.now() - Math.max(1, dias) * 86_400_000).toISOString().slice(0, 10);
    const { data } = await this.supabase
      .from('v_attendance_branch_daily')
      .select('branch_id, dia, visitas, socios')
      .gte('dia', desde)
      .order('dia', { ascending: true })
      .limit(2000);

    return (data ?? []).map((fila) => ({
      branchId: texto(fila.branch_id),
      dia: texto(fila.dia) ?? '',
      visitas: numero(fila.visitas),
      socios: numero(fila.socios),
    }));
  }

  async crear(tenantId: string, datos: DatosDeSucursal): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    const { data, error } = await this.supabase
      .from('branches')
      .insert({ tenant_id: tenantId, ...aFila(datos) })
      .select('id')
      .maybeSingle();
    if (error || !data) return fallo(mensajeDeError(error));
    return exito({ id: String(data.id) });
  }

  async actualizar(id: string, datos: DatosDeSucursal): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Sucursal no encontrada.');
    // `.select('id')`: cero filas es «RLS no dejó», que no es lo mismo que «se guardó».
    const { data, error } = await this.supabase.from('branches').update(aFila(datos)).eq('id', id).select('id');
    if (error) return fallo(mensajeDeError(error));
    if (!data || data.length === 0) return fallo('Tu cuenta no puede editar esta sucursal.');
    return exito(null);
  }

  async cambiarEstado(id: string, activa: boolean): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Sucursal no encontrada.');
    const { data, error } = await this.supabase.from('branches').update({ is_active: activa }).eq('id', id).select('id');
    if (error) return fallo(mensajeDeError(error));
    if (!data || data.length === 0) return fallo('Tu cuenta no puede cambiar el estado de esta sucursal.');
    return exito(null);
  }

  async establecerPrimaria(id: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Sucursal no encontrada.');
    const { error } = await this.supabase.rpc('establecer_sucursal_primaria', { p_branch: id });
    if (error) return fallo(mensajeDeError(error));
    return exito(null);
  }

  async personal(): Promise<readonly PersonalDeSucursales[]> {
    const [{ data: cuentas }, { data: asignaciones }, { data: globales }] = await Promise.all([
      this.supabase.from('v_users_roles').select('id, full_name, email, roles, status').eq('status', 'active').order('full_name'),
      this.supabase.from('user_branches').select('app_user_id, branch_id').eq('is_active', true),
      // Roles cuyo alcance cubre todas las sedes. Se pregunta a la base y no se
      // asume «gerencia»: el alcance es un permiso, no un nombre de rol.
      this.supabase.from('role_permissions').select('roles!inner(code), permissions!inner(code)').eq('permissions.code', 'branches.all'),
    ]);

    const rolesGlobales = new Set<string>();
    for (const fila of (globales ?? []) as unknown as { roles: { code?: unknown } | null }[]) {
      if (typeof fila.roles?.code === 'string') rolesGlobales.add(fila.roles.code);
    }

    const porUsuario = new Map<string, string[]>();
    for (const fila of asignaciones ?? []) {
      const lista = porUsuario.get(String(fila.app_user_id)) ?? [];
      lista.push(String(fila.branch_id));
      porUsuario.set(String(fila.app_user_id), lista);
    }

    return (cuentas ?? [])
      .map((fila) => {
        const roles: string[] = Array.isArray(fila.roles) ? fila.roles.filter((r: unknown): r is string => typeof r === 'string') : [];
        return {
          appUserId: String(fila.id),
          fullName: texto(fila.full_name) ?? 'Cuenta',
          email: texto(fila.email) ?? '',
          roles,
          sucursales: porUsuario.get(String(fila.id)) ?? [],
          alcanceGlobal: roles.some((rol) => rolesGlobales.has(rol)),
        };
      })
      // Una cuenta que solo es de socio no opera en ninguna sede: no se ofrece.
      .filter((cuenta) => cuenta.roles.some((rol) => rol !== 'customer'));
  }

  async asignar(tenantId: string, appUserId: string, branchId: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(appUserId) || !PATRON_UUID.test(branchId)) return fallo('Datos de asignación no válidos.');

    // Reactivar antes que insertar: una asignación retirada se conserva (dice
    // quién pudo operar allí), y volver a asignar reutiliza esa fila.
    const { data: reactivada, error: errorDeReactivar } = await this.supabase
      .from('user_branches')
      .update({ is_active: true })
      .eq('app_user_id', appUserId)
      .eq('branch_id', branchId)
      .select('branch_id');
    if (errorDeReactivar) return fallo(mensajeDeError(errorDeReactivar));
    if (reactivada && reactivada.length > 0) return exito(null);

    const { error } = await this.supabase
      .from('user_branches')
      .insert({ tenant_id: tenantId, app_user_id: appUserId, branch_id: branchId });
    if (error) return fallo(error.code === '23505' ? 'Esa persona ya está asignada a esta sede.' : mensajeDeError(error));
    return exito(null);
  }

  async retirar(appUserId: string, branchId: string): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(appUserId) || !PATRON_UUID.test(branchId)) return fallo('Datos de asignación no válidos.');
    const { data, error } = await this.supabase
      .from('user_branches')
      .update({ is_active: false })
      .eq('app_user_id', appUserId)
      .eq('branch_id', branchId)
      .select('branch_id');
    if (error) return fallo(mensajeDeError(error));
    if (!data || data.length === 0) return fallo('No se encontró esa asignación.');
    return exito(null);
  }

  async auditarCambioDeSucursal(tenantId: string, sucursal: Pick<Sucursal, 'id' | 'code'>): Promise<void> {
    // La autoría la pone la base (default de `actor_user_id`). Un fallo aquí no
    // debe impedir trabajar: la bitácora es constancia, no una condición.
    await this.supabase.from('audit_log').insert({
      tenant_id: tenantId,
      action: 'branch.operational_changed',
      entity: 'branch',
      entity_id: sucursal.id,
      metadata: { code: sucursal.code },
    });
  }
}

export class SupabasePublicBranchesRepository implements PublicBranchesPort {
  constructor(private readonly supabase: SupabaseClient | null) {}

  async sucursalesPublicas(tenantSlug: string): Promise<readonly Sucursal[]> {
    if (!this.supabase) return [];
    try {
      const { data, error } = await this.supabase
        .from('branches')
        .select(COLUMNAS)
        .eq('tenant_slug', tenantSlug)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true });
      // Sin datos, la vitrina oculta la sección en vez de romper la página: la
      // dirección de las sedes nunca justifica un error 500 en el inicio.
      if (error) return [];
      return (data ?? []).map((fila) => aSucursal(fila));
    } catch {
      return [];
    }
  }
}
