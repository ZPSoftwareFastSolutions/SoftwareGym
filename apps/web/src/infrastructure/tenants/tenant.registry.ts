/**
 * CAPA: Infrastructure / Tenants
 *
 * Registro estático de tenants aprovisionados.
 *
 * DAR DE ALTA UN GIMNASIO NUEVO = 2 pasos:
 *   1. Crear `tenants/<slug>.tenant.ts` satisfaciendo `TenantConfig`.
 *   2. Añadirlo a este array.
 *
 * Nada más. Ni una ruta, ni un componente, ni una hoja de estilo.
 *
 * En V2 este archivo desaparece: el registro pasa a ser la tabla `Tenants` de
 * la API .NET y la implementación del puerto consulta por HTTP. Los
 * consumidores no se enteran porque dependen del puerto, no de este archivo.
 */

import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { auroraFitTenant } from '@tenants/aurora-fit.tenant';
import { miticoTenant } from '@tenants/mitico.tenant';

export const TENANT_REGISTRY: readonly TenantConfig[] = [miticoTenant, auroraFitTenant];

/**
 * Tenant servido en la raíz del dominio cuando no se puede resolver por host.
 * En un despliegue por cliente, cada instancia fija el suyo por variable de
 * entorno.
 */
export const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_TENANT?.trim() || 'mitico';
