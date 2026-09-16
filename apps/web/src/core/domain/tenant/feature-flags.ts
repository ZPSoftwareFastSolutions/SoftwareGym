/**
 * CAPA: Domain / Tenant
 *
 * Feature flags de la LANDING.
 *
 * Esta versión del producto es solo vitrina: no hay panel, ni socios, ni
 * sesión, ni base de datos. Por eso aquí no queda ninguna bandera de operación.
 * No están apagadas: no existen. Una bandera apagada es una capacidad que
 * alguien puede encender por error; una que no existe no tiene interruptor.
 *
 * REGLA: el default de TODA flag es `false`. Una sección se enciende de forma
 * explícita en la configuración del gimnasio. Una flag que falta nunca debe
 * habilitar nada: fallar cerrado es el único comportamiento seguro cuando la
 * configuración es un dato externo al código.
 */
export interface FeatureFlags {
  /** Apagada, el gimnasio no tiene sitio: todas sus rutas responden 404. */
  readonly publicSite: boolean;
  readonly showPlans: boolean;
  readonly showTrainingPlans: boolean;
  readonly showProducts: boolean;
  readonly showGallery: boolean;
  readonly showFacilities: boolean;
  readonly showSchedule: boolean;
  /** Clases dirigidas con su horario semanal por sede. */
  readonly showClasses: boolean;
  /** Página de sucursales y bloques de sede repartidos por el sitio. */
  readonly showBranches: boolean;
  readonly showTeam: boolean;
  readonly showTestimonials: boolean;
  readonly showFaq: boolean;
  readonly showLocationMap: boolean;
  readonly whatsappFloatingButton: boolean;
  /** El formulario no envía a ningún servidor: compone un mensaje de WhatsApp. */
  readonly contactForm: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  publicSite: true,
  showPlans: true,
  showTrainingPlans: false,
  showProducts: false,
  showGallery: true,
  showFacilities: true,
  showSchedule: true,
  showClasses: false,
  showBranches: false,
  showTeam: false,
  showTestimonials: true,
  showFaq: true,
  showLocationMap: true,
  whatsappFloatingButton: true,
  contactForm: true,
};

export type FeatureFlagKey = keyof FeatureFlags;
