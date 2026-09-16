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
 * En la landing hay UN SOLO PUERTO, porque hay una sola fuente de datos: el
 * archivo de configuración del gimnasio. No hay base, ni sesión, ni cliente
 * HTTP que componer. Cambiar esa fuente por una API sigue siendo cambiar esta
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
