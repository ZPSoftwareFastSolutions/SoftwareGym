/**
 * CAPA: Domain / Catalog
 *
 * Contenido comercial del gimnasio: servicios, planes, instalaciones, galería,
 * equipo, testimonios y preguntas frecuentes.
 *
 * Todo es DATO configurable. Ninguna de estas estructuras conoce React ni el
 * transporte por el que llega (hoy archivo TS, mañana la API .NET).
 */

export interface ServiceItem {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  /** Clave de icono resuelta por `presentation/icons`. */
  readonly icon: IconKey;
  readonly highlights: readonly string[];
}

export type IconKey =
  | 'dumbbell'
  | 'heart'
  | 'yoga'
  | 'boxing'
  | 'nutrition'
  | 'trainer'
  | 'group'
  | 'spa'
  | 'cycling'
  | 'clock'
  | 'shield'
  | 'sparkle';

export type BillingPeriod =
  | 'diario'
  | 'quincenal'
  | 'mensual'
  | 'trimestral'
  | 'semestral'
  | 'anual';

export interface PlanFeature {
  readonly label: string;
  /** `false` renderiza la línea tachada/atenuada: comunica el límite del plan. */
  readonly included: boolean;
}

export interface MembershipPlan {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly price: number;
  readonly currency: string;
  readonly period: BillingPeriod;
  /** Precio anterior tachado. Omitir si no hay promoción vigente. */
  readonly compareAtPrice?: number;
  /** Destaca visualmente el plan y lo eleva en la retícula. */
  readonly featured: boolean;
  readonly badge?: string;
  readonly features: readonly PlanFeature[];
  readonly ctaLabel: string;
  /**
   * Rutinas asociadas al plan, cuando el gimnasio comercializa su
   * entrenamiento con nombre propio. Es opcional porque la mayoría de los
   * clientes vende acceso, no programas nombrados.
   */
  readonly routines?: readonly string[];
}

/**
 * Familia comercial de planes.
 *
 * Un gimnasio con una oferta simple declara un único grupo; uno que vende por
 * líneas —mensualidades, entrenamiento personalizado, planes extendidos—
 * declara varias. La agrupación es DATO: la retícula se arma sola a partir de
 * lo que traiga la configuración, sin que ninguna página sepa cuántas familias
 * existen ni cómo se llaman.
 */
export interface PlanGroup {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly plans: readonly MembershipPlan[];
}

/**
 * Artículo del catálogo comercial del gimnasio (indumentaria, suplementos,
 * accesorios). Es venta de mostrador, no una capacidad del sistema: en V1 no
 * hay carrito ni stock, solo exhibición con derivación a WhatsApp.
 */
export interface ProductItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly currency: string;
  /** Distintivo comercial: «Más popular», «Nuevo», «Últimas unidades». */
  readonly badge?: string;
  readonly note?: string;
}

export interface ProductCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: IconKey;
  readonly items: readonly ProductItem[];
}

export interface FacilityItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly area: string;
  readonly icon: IconKey;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
}

export interface GalleryItem {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  /**
   * Ruta de la fotografía real del gimnasio. Cuando está vacía se renderiza
   * la composición generativa de marca (ver `presentation/ui/ArtFrame`), de
   * modo que el sitio nunca muestra una imagen rota en la demo del cliente.
   */
  readonly src?: string;
  /** Peso en la retícula tipo mosaico: 1 = normal, 2 = doble ancho. */
  readonly span: 1 | 2;
  readonly seed: number;
}

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly bio: string;
  readonly specialties: readonly string[];
  readonly seed: number;
}

export interface Testimonial {
  readonly id: string;
  readonly quote: string;
  readonly author: string;
  readonly context: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
}

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export interface StatItem {
  readonly value: string;
  readonly label: string;
}
