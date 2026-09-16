/**
 * CAPA: Infrastructure / Tenants
 *
 * Registro estático de gimnasios aprovisionados.
 *
 * DAR DE ALTA UN GIMNASIO NUEVO = 2 pasos:
 *   1. Crear `tenants/<slug>.tenant.ts` satisfaciendo `TenantConfig`.
 *   2. Añadirlo a este array.
 *
 * Nada más. Ni una ruta, ni un componente, ni una hoja de estilo.
 *
 * Esta rama sirve UN SOLO GIMNASIO: es el sitio de Mítico Fitness, no la
 * demostración de la plataforma. El registro sigue siendo una lista porque el
 * contrato no cambia por tener un elemento, y porque así la raíz del dominio
 * puede seguir resolviendo por host sin ningún caso especial.
 */

import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { miticoTenant } from '@tenants/mitico.tenant';

export const TENANT_REGISTRY: readonly TenantConfig[] = [miticoTenant];

/**
 * Gimnasio servido en la raíz del dominio cuando no se puede resolver por host.
 */
export const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_TENANT?.trim() || 'mitico';
