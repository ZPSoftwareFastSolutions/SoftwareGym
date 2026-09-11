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

import type {
  BranchesRepositoryPort,
  PublicBranchesPort,
} from '@core/application/ports/branches-repository.port';
import type { MembersRepositoryPort } from '@core/application/ports/members-repository.port';
import type { OperationsRepositoryPort } from '@core/application/ports/operations-repository.port';
import type {
  PaymentSettingsPort,
  ReceiptsRepositoryPort,
} from '@core/application/ports/receipts-repository.port';
import type { ReportsRepositoryPort } from '@core/application/ports/reports-repository.port';
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

/**
 * Repositorios de gestión (V2.2). Mismo motivo que el de operación para no
 * cachearlos: llevan el cliente con las cookies de QUIEN pregunta, y es esa
 * sesión la que RLS usa para decidir qué filas existen.
 */
export async function membersRepository(): Promise<MembersRepositoryPort> {
  const { createSupabaseServerClient } = await import('../auth/supabase.server');
  const { SupabaseMembersRepository } = await import('../operations/supabase-members.repository');
  return new SupabaseMembersRepository(await createSupabaseServerClient());
}

export async function receiptsRepository(): Promise<ReceiptsRepositoryPort> {
  const { createSupabaseServerClient } = await import('../auth/supabase.server');
  const { SupabaseReceiptsRepository } = await import('../operations/supabase-receipts.repository');
  return new SupabaseReceiptsRepository(await createSupabaseServerClient());
}

export async function reportsRepository(): Promise<ReportsRepositoryPort> {
  const { createSupabaseServerClient } = await import('../auth/supabase.server');
  const { SupabaseReportsRepository } = await import('../operations/supabase-reports.repository');
  return new SupabaseReportsRepository(await createSupabaseServerClient());
}

/** Sucursales (V3.0), con la sesión de quien pregunta. */
export async function branchesRepository(): Promise<BranchesRepositoryPort> {
  const { createSupabaseServerClient } = await import('../auth/supabase.server');
  const { SupabaseBranchesRepository } = await import('../operations/supabase-branches.repository');
  return new SupabaseBranchesRepository(await createSupabaseServerClient());
}

/**
 * Sucursales para la vitrina ESTÁTICA. Cliente anónimo sin cookies: leer
 * cookies sacaría la página del CDN. RLS solo le deja ver sedes activas.
 */
export async function publicBranchesRepository(): Promise<PublicBranchesPort> {
  const { createSupabasePublicClient } = await import('../auth/supabase.public');
  const { SupabasePublicBranchesRepository } = await import('../operations/supabase-branches.repository');
  return new SupabasePublicBranchesRepository(createSupabasePublicClient());
}

/**
 * Ajustes de cobro. Lo usa también el sitio público SIN sesión: el cliente de
 * servidor sin cookie actúa como visitante anónimo, que es exactamente el
 * alcance que tiene la política de lectura de esos ajustes.
 */
export async function paymentSettingsRepository(): Promise<PaymentSettingsPort> {
  const { createSupabaseServerClient } = await import('../auth/supabase.server');
  const { SupabasePaymentSettingsRepository } = await import(
    '../operations/supabase-receipts.repository'
  );
  return new SupabasePaymentSettingsRepository(await createSupabaseServerClient());
}
