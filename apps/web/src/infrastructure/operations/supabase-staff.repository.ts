/**
 * CAPA: Infrastructure / Operations
 *
 * Personal, roles y actividad administrativa contra Supabase (V4).
 *
 * Toda escritura va por RPC invocador (`otorgar_rol`, `retirar_rol`,
 * `cambiar_estado_de_cuenta`, `designar_administrador_de_gimnasio`): la base
 * repite permiso, gimnasio y NIVEL, y un rechazo vuelve como mensaje legible,
 * nunca como excepción hacia la pantalla. Los errores se traducen por su texto
 * de negocio y el código queda en el log (lección de V3.0: un 42501 traducido
 * como «revisa que seas gerencia» escondió la causa real durante horas).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StaffRepositoryPort } from '@core/application/ports/staff-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import {
  esEstadoDeCuenta,
  mensajeDeErrorDePersonal,
  RESUMEN_DE_PERSONAL_VACIO,
  type CuentaDelGimnasio,
  type EventoAdministrativo,
  type FiltroDeCuentas,
  type ResumenDePersonal,
} from '@core/domain/operations/staff';
import type { RolDeGimnasio } from '@core/domain/operations/workspace';
import { numero } from '@core/domain/operations/dashboard';
import { acotarPorPagina, rangoDePagina, type Pagina } from '@core/domain/shared/paginacion';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function mapearCuenta(fila: Record<string, unknown>): CuentaDelGimnasio {
  return {
    id: String(fila.id),
    fullName: texto(fila.full_name) ?? 'Cuenta',
    email: texto(fila.email) ?? '',
    status: esEstadoDeCuenta(fila.status) ? fila.status : 'active',
    createdAt: String(fila.created_at ?? ''),
    customerId: texto(fila.customer_id),
    roles: Array.isArray(fila.roles) ? fila.roles.filter((r): r is string => typeof r === 'string') : [],
    level: numero(fila.level),
    isStaff: fila.is_staff === true,
  };
}

function errorLegible(contexto: string, error: { code?: string; message?: string } | null): ResultadoDeOperacion<void> {
  if (!error) return exito(undefined);
  console.error(`[personal] ${contexto}`, error.code, error.message);
  return fallo(mensajeDeErrorDePersonal(`${error.code ?? ''} ${error.message ?? ''}`));
}

export class SupabaseStaffRepository implements StaffRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async cuentas(filtro: { readonly vista: FiltroDeCuentas; readonly q?: string }, pagina: number, porPagina: number): Promise<Pagina<CuentaDelGimnasio>> {
    const tamano = acotarPorPagina(porPagina);
    const { desde, hasta } = rangoDePagina(pagina, tamano);
    let consulta = this.supabase
      .from('v_staff')
      .select('*', { count: 'exact' })
      .order('level', { ascending: false })
      .order('full_name', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, hasta);

    if (filtro.vista === 'personal') consulta = consulta.eq('is_staff', true);
    if (filtro.vista === 'suspendidas') consulta = consulta.eq('status', 'suspended');

    const busqueda = (filtro.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
    if (busqueda) consulta = consulta.or(`full_name.ilike.%${busqueda}%,email.ilike.%${busqueda}%`);

    const { data, count, error } = await consulta;
    if (error && error.code !== 'PGRST103') console.error('[personal] cuentas', error.code, error.message);
    return { filas: (data ?? []).map((fila) => mapearCuenta(fila as Record<string, unknown>)), total: count ?? 0, pagina, porPagina: tamano };
  }

  async resumen(): Promise<ResumenDePersonal> {
    // Solo cabeceras (`head`): cuántas, sin traer una fila.
    const contar = async (consulta: PromiseLike<{ readonly count: number | null }>) => (await consulta).count ?? 0;
    const [administradores, gerentes, recepcion, entrenadores, cuentas, suspendidas] = await Promise.all([
      contar(this.base().contains('roles', ['admin'])),
      contar(this.base().contains('roles', ['manager'])),
      contar(this.base().contains('roles', ['receptionist'])),
      contar(this.base().contains('roles', ['trainer'])),
      contar(this.base()),
      contar(this.base().eq('status', 'suspended')),
    ]);
    if (cuentas === 0) return RESUMEN_DE_PERSONAL_VACIO;
    return { administradores, gerentes, recepcion, entrenadores, cuentas, suspendidas };
  }

  private base() {
    return this.supabase.from('v_staff').select('id', { count: 'exact', head: true });
  }

  async actividad(limite: number): Promise<readonly EventoAdministrativo[]> {
    const { data, error } = await this.supabase
      .from('audit_log')
      .select('id, action, entity, entity_id, occurred_at, actor_user_id, metadata')
      .order('occurred_at', { ascending: false })
      .limit(Math.min(Math.max(limite, 1), 50));
    if (error) {
      console.error('[personal] actividad', error.code, error.message);
      return [];
    }
    const filas = (data ?? []) as Record<string, unknown>[];

    // Nombres de quién hizo y a quién, en UNA consulta (no una por evento).
    const ids = new Set<string>();
    for (const fila of filas) {
      const actor = texto(fila.actor_user_id);
      if (actor) ids.add(actor);
      const destino = texto(fila.entity_id);
      if (destino && PATRON_UUID.test(destino) && (fila.entity === 'user_roles' || fila.entity === 'app_users')) ids.add(destino);
    }
    const nombres = new Map<string, string>();
    if (ids.size > 0) {
      const { data: cuentas } = await this.supabase.from('v_staff').select('id, full_name').in('id', [...ids]);
      for (const cuenta of cuentas ?? []) nombres.set(String(cuenta.id), texto(cuenta.full_name) ?? 'Cuenta');
    }

    return filas.map((fila) => {
      const destino = texto(fila.entity_id);
      const metadata = fila.metadata && typeof fila.metadata === 'object' && !Array.isArray(fila.metadata) ? (fila.metadata as Record<string, unknown>) : {};
      return {
        id: String(fila.id),
        action: texto(fila.action) ?? '',
        entity: texto(fila.entity) ?? '',
        entityId: destino,
        occurredAt: String(fila.occurred_at ?? ''),
        actorName: nombres.get(texto(fila.actor_user_id) ?? '') ?? null,
        targetName: destino ? (nombres.get(destino) ?? null) : null,
        metadata,
      };
    });
  }

  async otorgarRol(cuentaId: string, rol: RolDeGimnasio): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(cuentaId)) return fallo('Esa cuenta no existe.');
    const { error } = await this.supabase.rpc('otorgar_rol', { p_usuario: cuentaId, p_rol: rol });
    return errorLegible('otorgar_rol', error);
  }

  async retirarRol(cuentaId: string, rol: RolDeGimnasio): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(cuentaId)) return fallo('Esa cuenta no existe.');
    const { error } = await this.supabase.rpc('retirar_rol', { p_usuario: cuentaId, p_rol: rol });
    return errorLegible('retirar_rol', error);
  }

  async cambiarEstado(cuentaId: string, activa: boolean): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(cuentaId)) return fallo('Esa cuenta no existe.');
    const { error } = await this.supabase.rpc('cambiar_estado_de_cuenta', { p_usuario: cuentaId, p_activa: activa });
    return errorLegible('cambiar_estado_de_cuenta', error);
  }

  async designarAdministrador(tenantId: string, correo: string): Promise<ResultadoDeOperacion<void>> {
    if (!PATRON_UUID.test(tenantId)) return fallo('Ese gimnasio no existe.');
    const { error } = await this.supabase.rpc('designar_administrador_de_gimnasio', { p_tenant: tenantId, p_correo: correo });
    return errorLegible('designar_administrador_de_gimnasio', error);
  }
}
