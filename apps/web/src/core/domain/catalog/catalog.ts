/**
 * CAPA: Domain / Catalog
 *
 * Contenido comercial del gimnasio: servicios, planes, instalaciones, galería,
 * equipo, testimonios y preguntas frecuentes.
 *
 * Todo es DATO configurable. Ninguna de estas estructuras conoce React ni el
 * transporte por el que llega.
 *
 * Este archivo es también la puerta del catálogo: reexporta los módulos
 * hermanos —horarios, sedes y clases— para que la configuración de un gimnasio
 * importe de un solo sitio y no tenga que saber en qué archivo vive cada tipo.
 */

export type { BusinessHours, DaySchedule } from './schedule';
export { DIAS_DE_LA_SEMANA, diasAbiertos, resumirSemana } from './schedule';
export type { SedeDeVitrina } from './branches';
export { ordenarSedes, sedePorCodigo, urlDeMapaEmbebido, urlDeUbicacion } from './branches';
export type {
  CategoriaDeClase,
  ClaseDeVitrina,
  DiaDeAgenda,
  DiaIso,
  FranjaConClase,
  FranjaDeClase,
  NivelDeClase,
} from './classes';
export {
  clasesDeSede,
  DIAS_ISO,
  diasLegibles,
  duracionEnMinutos,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_NIVEL_DE_CLASE,
  rangoLegible,
  semanaDeSede,
  totalDeFranjas,
} from './classes';

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
  /**
   * Segundo precio del MISMO paquete, no otro paquete: «con entrada a las dos
   * sucursales, 240 Bs». El gimnasio lo vende así, en una línea del tarifario,
   * y partirlo en dos tarjetas obligaría a comparar dos veces lo mismo.
   */
  readonly altPrice?: { readonly label: string; readonly price: number };
  /** Destaca visualmente el plan y lo eleva en la retícula. */
  readonly featured: boolean;
  readonly badge?: string;
  readonly features: readonly PlanFeature[];
  readonly ctaLabel: string;
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
 * Programa de entrenamiento personalizado.
 *
 * NO es un `MembershipPlan`. Un paquete se compra por lo que da acceso; un
 * programa se compra por lo que te hace hacer. Se modelan aparte porque no
 * comparten forma —el programa no tiene periodo de acceso ni grupo comercial,
 * tiene rutinas asignadas e imagen de referencia— y porque mezclarlos en la
 * misma retícula invita a comparar precios entre cosas que no son alternativas.
 */
export interface TrainingPlan {
  readonly id: string;
  /** Cómo lo llama el gimnasio: «Rutina Thor / Fénix». Es lo que se pide en recepción. */
  readonly name: string;
  /** A quién va dirigido o qué lo distingue, en una línea. */
  readonly tagline: string;
  readonly price: number;
  readonly currency: string;
  readonly period: BillingPeriod;
  readonly features: readonly PlanFeature[];
  /** Rutinas asignadas al programa. Es lo que lo identifica. */
  readonly routines: readonly string[];
  /**
   * Imagen de referencia del programa. Vacía deja el marco generativo de
   * marca, de modo que la tarjeta nunca se ve rota mientras falta la foto.
   */
  readonly imageSrc?: string;
  readonly imageAlt?: string;
  readonly featured: boolean;
  readonly badge?: string;
  readonly ctaLabel: string;
  /** Semilla del marco generativo cuando no hay `imageSrc`. */
  readonly seed: number;
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
  /**
   * V4.1 · `branches.code` de la sede a la que pertenece esta área.
   *
   * El mismo puente que ya unen los planes (`code`) y la vitrina de sucursales
   * (`BranchShowcase.code`): la sede vive en la base y su texto comercial en el
   * archivo. Un gimnasio de UNA sede —o uno cuyas sedes tienen las mismas
   * áreas— no lo declara y la sección se comporta igual que siempre, en una
   * sola lista. Cuando hay áreas atribuidas a sedes distintas, la sección se
   * presenta por pestañas.
   */
  readonly branchCode?: string;
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
