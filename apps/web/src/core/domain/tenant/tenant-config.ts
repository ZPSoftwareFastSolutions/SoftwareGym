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
  PlanGroup,
  ProductCategory,
  ServiceItem,
  StatItem,
  TeamMember,
  Testimonial,
  TrainingPlan,
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

/**
 * Datos de cobro por QR que viven en la configuración: solo el RESPALDO.
 *
 * La imagen del QR del banco NO está aquí. Desde V2.2 gerencia la sube en
 * `/[tenant]/panel/cobros`, con su vencimiento, y se guarda en Supabase
 * (`tenant_payment_settings` + bucket `qr-pagos`): es un dato del cliente que
 * cambia sin desplegar. Estos campos rellenan titular, banco y nota mientras
 * el gimnasio no haya cargado los suyos en el panel.
 *
 * Mientras no haya QR vigente, la ventana de pago reserva el hueco y explica
 * que se paga en recepción, en vez de esconder la sección: un espacio vacío
 * que se rellena luego es una decisión; una sección que aparece de la nada al
 * mes siguiente es una sorpresa para quien ya conocía la página.
 */
export interface PaymentQrInfo {
  /** Titular de la cuenta, para que quien paga confirme a quién le paga. */
  readonly holder?: string;
  readonly bank?: string;
  /** Instrucción breve: qué poner en el concepto, a quién enviar el comprobante. */
  readonly note?: string;
}

/**
 * Presentación comercial de UNA sede (V3.0).
 *
 * La sede en sí —nombre, dirección, horario, mapa, si está activa— vive en la
 * base y la edita gerencia. Aquí va solo el TEXTO DE VITRINA, que es marketing
 * del cliente y cambia con el sitio, no con la operación. El puente es el
 * `code` de la sede, igual que el `code` une los planes del archivo con los de
 * la base. Una sede sin texto aquí se publica igual, con sus datos.
 */
export interface BranchShowcase {
  /** `branches.code` de la sede: MAYÚSCULAS y dígitos, 2 a 12. */
  readonly code: string;
  /** Frase corta que la distingue: «El clásico del centro». */
  readonly tagline: string;
  readonly description: string;
  /** Lo que la hace especial, en frases breves. Máximo cinco. */
  readonly highlights: readonly string[];
  /** Semilla de la composición gráfica mientras no haya fotografía. */
  readonly seed?: number;
}

/** Sección de sucursales del sitio. Solo tiene efecto con `enableMultiBranch`. */
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
  readonly showcase: readonly BranchShowcase[];
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
  /**
   * V3.1 · Turnos de trabajo del personal («no disponible por la mañana»), en
   * la hora local del gimnasio. Ausente: Mañana 06–12, Tarde 12–18, Noche 18–22.
   */
  readonly staffShifts?: readonly {
    readonly code: string;
    readonly label: string;
    readonly start: string;
    readonly end: string;
  }[];
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
  readonly gallery: readonly GalleryItem[];
  readonly team: readonly TeamMember[];
  readonly testimonials: readonly Testimonial[];
  readonly faq: readonly FaqItem[];
  readonly closingCta: {
    readonly title: string;
    readonly subtitle: string;
    readonly label: string;
  };
  /** Cobro por QR. Ausente en gimnasios que solo cobran en mostrador. */
  readonly paymentQr?: PaymentQrInfo;
  /** Vitrina de sucursales (V3.0). Ausente: la sección usa textos genéricos. */
  readonly branches?: BranchesContent;
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
