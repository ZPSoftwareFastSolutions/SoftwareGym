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
