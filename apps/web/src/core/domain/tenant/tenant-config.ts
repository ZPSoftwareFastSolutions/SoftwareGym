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
 *
 * EN LA LANDING, ADEMÁS, ES LA ÚNICA FUENTE DE DATOS QUE HAY. No existe base
 * de datos: las sedes, el horario y las clases se escriben aquí junto al resto
 * del contenido, y el sitio entero se prerenderiza a partir de este archivo.
 */

import type {
  ClaseDeVitrina,
  FacilityItem,
  FaqItem,
  GalleryItem,
  PlanGroup,
  ProductCategory,
  SedeDeVitrina,
  ServiceItem,
  StatItem,
  TeamMember,
  Testimonial,
  TrainingPlan,
} from '../catalog/catalog';
import type { BusinessHours } from '../catalog/schedule';
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

/** Sección de sucursales del sitio. Solo tiene efecto con `showBranches`. */
export interface BranchesContent {
  readonly eyebrow: string;
  readonly title: string;
  /** Fragmento del título con tratamiento de color de marca. */
  readonly titleAccent?: string;
  readonly lead: string;
  /** Qué gana el socio al tener varias sedes: tres ideas, con icono. */
  readonly benefits: readonly {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
  }[];
  /** Las sedes, completas: datos de puerta y texto comercial en un solo sitio. */
  readonly sedes: readonly SedeDeVitrina[];
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
  /**
   * Oferta comercial agrupada por familia. Un gimnasio de oferta simple
   * declara un solo grupo; la presentación no distingue el caso.
   */
  readonly planGroups: readonly PlanGroup[];
  readonly plansNote: string;
  /**
   * Programas de entrenamiento personalizado. Categoría distinta de los
   * paquetes: se presentan en su propia sección, nunca en la misma retícula.
   */
  readonly trainingPlans: readonly TrainingPlan[];
  /** Catálogo de mostrador. Vacío en los clientes que no venden productos. */
  readonly products: readonly ProductCategory[];
  readonly facilities: readonly FacilityItem[];
  /** Clases dirigidas con su horario semanal. Vacío sin `showClasses`. */
  readonly classes: readonly ClaseDeVitrina[];
  readonly gallery: readonly GalleryItem[];
  readonly team: readonly TeamMember[];
  readonly testimonials: readonly Testimonial[];
  readonly faq: readonly FaqItem[];
  readonly closingCta: {
    readonly title: string;
    readonly subtitle: string;
    readonly label: string;
  };
  /** Vitrina de sucursales. Ausente en un gimnasio de sede única. */
  readonly branches?: BranchesContent;
}

/**
 * Configuración completa de un gimnasio dentro de la plataforma.
 */
export interface TenantConfig {
  /** Identificador en la URL: `/mitico`. Inmutable. */
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
  /**
   * Horario general del gimnasio.
   *
   * Con varias sedes cada una trae el suyo (`SedeDeVitrina.week`) y es ese el
   * que manda en la página de horarios. Este queda como el dato del gimnasio
   * para los bloques que no hablan de una sede concreta.
   */
  readonly hours: BusinessHours;
  readonly navigation: readonly NavItem[];
  readonly features: FeatureFlags;
  readonly seo: SeoConfig;
  readonly content: TenantContent;
  /**
   * Datos de los avisos legales (`/legal/*`). El texto de los documentos es del
   * producto (`core/domain/legal`); aquí solo lo que es propio del gimnasio.
   */
  readonly legal: {
    /** Fecha de la última revisión de los avisos, `AAAA-MM-DD`. */
    readonly updatedAt: string;
    /** NIT. Ausente mientras el gimnasio no lo entregue: no se inventa. */
    readonly taxId?: string;
  };
  /** Metadatos de aprovisionamiento. Informativos. */
  readonly provisioning: {
    readonly plan: 'starter' | 'professional' | 'enterprise';
    readonly activeSince: string;
    readonly status: 'active' | 'trial' | 'suspended';
  };
}
