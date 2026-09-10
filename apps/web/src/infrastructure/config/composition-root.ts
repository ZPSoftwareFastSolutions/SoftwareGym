/**
 * CAPA: Infrastructure / Config
 *
 * COMPOSITION ROOT.
 *
 * Único lugar del sitio donde se decide qué implementación concreta satisface
 * cada puerto. Ninguna otra parte del código construye adaptadores: si un
 * componente hiciera `new StaticTenantRepository()`, la inversión de
 * dependencias dejaría de existir.
 *
 * Cambiar la fuente de configuración (archivo → API .NET) es cambiar esta
 * línea, y solo esta línea.
 */

import type { OperationsRepositoryPort } from '@core/application/ports/operations-repository.port';
import type { TenantRepositoryPort } from '@core/application/ports/tenant-repository.port';
import { StaticTenantRepository } from '../tenants/static-tenant.repository';

let cachedRepository: TenantRepositoryPort | null = null;

/**
 * El repositorio es un singleton de proceso: no guarda estado por petición.
 * La validación del registro corre una sola vez, en la primera resolución.
 */
export function tenantRepository(): TenantRepositoryPort {
  cachedRepository ??= new StaticTenantRepository();
  return cachedRepository;
}

/**
 * Repositorio de operación (dashboard, asistencia, avisos, reportes).
 *
 * A DIFERENCIA del repositorio de tenants, este NO se cachea: lleva dentro el
 * cliente de Supabase con las cookies de la sesión. Un singleton de proceso
 * serviría los datos del primer usuario a todos los siguientes, que es la
 * clase de fallo que no aparece hasta que hay dos personas usando el sistema
 * a la vez.
 */
export async function operationsRepository(): Promise<OperationsRepositoryPort> {
  const { createSupabaseServerClient } = await import('../auth/supabase.server');
  const { SupabaseOperationsRepository } = await import(
    '../operations/supabase-operations.repository'
  );
  return new SupabaseOperationsRepository(await createSupabaseServerClient());
}
