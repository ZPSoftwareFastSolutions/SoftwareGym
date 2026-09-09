/**
 * CAPA: Domain / Tenant
 *
 * CONTRATO CENTRAL DEL SOFTWARE ENLATADO.
 *
 * `TenantConfig` es el único punto por el que un gimnasio se diferencia de
 * otro. Añadir un cliente nuevo = añadir un archivo de configuración que
 * satisface este contrato. Cero cambios en componentes, rutas o estilos.
 *
 * Si para dar de alta un gimnasio hiciera falta tocar un componente, el
 * producto habría dejado de ser enlatado. Esa es la prueba de aceptación
 * arquitectónica de todo el proyecto.
 */

import type {
  FacilityItem,
  FaqItem,
  GalleryItem,
  MembershipPlan,
  ServiceItem,
  StatItem,
  TeamMember,
  Testimonial,
} from '../catalog/catalog';
import type { TenantBranding } from './branding';
import type { FeatureFlags } from './feature-flags';

export interface SocialLinks {
  readonly instagram?: string;
  readonly facebook?: string;
  readonly tiktok?: string;
  readonly youtube?: string;
  readonly x?: string;
  readonly linkedin?: string;
}

export interface ContactInfo {
  readonly phone: string;
  /** Formato internacional sin `+` ni espacios: se inyecta en wa.me. */
  readonly whatsapp: string;
  readonly whatsappMessage: string;
  readonly email: string;
  readonly addressLine: string;
  readonly city: string;
  readonly country: string;
  /** URL de mapa embebido. Vacío desactiva el bloque de ubicación. */
  readonly mapEmbedUrl?: string;
  readonly mapLinkUrl?: string;
}

export interface DaySchedule {
  readonly day: string;
  readonly open: string;
  readonly close: string;
  readonly closed: boolean;
  readonly note?: string;
}

export interface BusinessHours {
  readonly timezone: string;
  readonly week: readonly DaySchedule[];
  readonly holidayNote?: string;
}

export interface NavItem {
  readonly label: string;
  /** Segmento relativo a la raíz del tenant. Cadena vacía = inicio. */
  readonly segment: string;
  /** Flag que debe estar activa para que el enlace se muestre. */
  readonly requiresFeature?: keyof FeatureFlags;
}

export interface SeoConfig {
  readonly title: string;
  readonly titleTemplate: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly locale: string;
}

export interface HeroContent {
  readonly eyebrow: string;
  readonly title: string;
  /** Fragmento del título que recibe el tratamiento de color de marca. */
  readonly titleAccent: string;
  readonly subtitle: string;
  readonly primaryCta: { readonly label: string; readonly segment: string };
  readonly secondaryCta: { readonly label: string; readonly segment: string };
  readonly stats: readonly StatItem[];
}

export interface AboutContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly paragraphs: readonly string[];
  readonly values: readonly {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
  }[];
  readonly milestones: readonly { readonly year: string; readonly text: string }[];
}

export interface TenantContent {
  readonly hero: HeroContent;
  readonly about: AboutContent;
  readonly services: readonly ServiceItem[];
  readonly plans: readonly MembershipPlan[];
  readonly plansNote: string;
  readonly facilities: readonly FacilityItem[];
  readonly gallery: readonly GalleryItem[];
  readonly team: readonly TeamMember[];
  readonly testimonials: readonly Testimonial[];
  readonly faq: readonly FaqItem[];
  readonly closingCta: {
    readonly title: string;
    readonly subtitle: string;
    readonly label: string;
  };
}

/**
 * Configuración completa de un gimnasio dentro de la plataforma.
 */
export interface TenantConfig {
  /** Identificador en la URL: `/mitico`, `/aurora-fit`. Inmutable. */
  readonly slug: string;
  /** Nombre comercial mostrado al usuario final. */
  readonly name: string;
  /** Razón social, para pie de página y textos legales. */
  readonly legalName: string;
  readonly tagline: string;
  /** Dominios que resuelven a este tenant (resolución por host en producción). */
  readonly domains: readonly string[];
  readonly branding: TenantBranding;
  readonly contact: ContactInfo;
  readonly social: SocialLinks;
  readonly hours: BusinessHours;
  readonly navigation: readonly NavItem[];
  readonly features: FeatureFlags;
  readonly seo: SeoConfig;
  readonly content: TenantContent;
  /** Metadatos de aprovisionamiento. Informativos en V1. */
  readonly provisioning: {
    readonly plan: 'starter' | 'professional' | 'enterprise';
    readonly activeSince: string;
    readonly status: 'active' | 'trial' | 'suspended';
  };
}
