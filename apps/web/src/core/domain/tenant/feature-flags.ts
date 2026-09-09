/**
 * CAPA: Domain / Tenant
 *
 * Feature flags del producto enlatado. Determinan qué capacidades expone la
 * instancia de un gimnasio concreto.
 *
 * REGLA: el default de TODA flag es `false`. Una capacidad se enciende de forma
 * explícita en la configuración del tenant. Un flag que falta nunca debe
 * habilitar nada: fallar cerrado es el único comportamiento seguro cuando la
 * configuración es un dato externo al código.
 */
export interface FeatureFlags {
  // --- Sitio público (V1) ---
  readonly publicSite: boolean;
  readonly showPlans: boolean;
  readonly showGallery: boolean;
  readonly showFacilities: boolean;
  readonly showSchedule: boolean;
  readonly showTeam: boolean;
  readonly showTestimonials: boolean;
  readonly showFaq: boolean;
  readonly showProducts: boolean;
  readonly showLocationMap: boolean;
  readonly whatsappFloatingButton: boolean;
  readonly contactForm: boolean;
  readonly memberLogin: boolean;

  // --- Sistema privado (V2+). Declarados desde V1 para que el contrato
  //     de configuración no cambie de forma; hoy se sirven en false. ---
  readonly enableAttendance: boolean;
  readonly enableQrAttendance: boolean;
  readonly enableReservations: boolean;
  readonly enableTrainers: boolean;
  readonly enableRoutines: boolean;
  readonly enableClasses: boolean;
  readonly enableNotifications: boolean;
  readonly enablePayments: boolean;
  readonly enableReports: boolean;
  readonly enableMultiBranch: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  publicSite: true,
  showPlans: true,
  showGallery: true,
  showFacilities: true,
  showSchedule: true,
  showTeam: false,
  showTestimonials: true,
  showFaq: true,
  showProducts: false,
  showLocationMap: true,
  whatsappFloatingButton: true,
  contactForm: true,
  memberLogin: true,

  enableAttendance: false,
  enableQrAttendance: false,
  enableReservations: false,
  enableTrainers: false,
  enableRoutines: false,
  enableClasses: false,
  enableNotifications: false,
  enablePayments: false,
  enableReports: false,
  enableMultiBranch: false,
};

export type FeatureFlagKey = keyof FeatureFlags;
