/**
 * CAPA: Domain / Tenant
 *
 * Identidad visual de un gimnasio. Es la pieza que convierte el producto
 * enlatado en "el sitio de este gimnasio" sin tocar una sola línea de
 * componente.
 *
 * Arquitectura de tokens en dos capas (ver docs/architecture/theming.md):
 *   1. PRIMITIVOS  -> lo que se declara aquí (marca, superficies, acentos).
 *   2. SEMÁNTICOS  -> se derivan en `core/application/theming` y son lo único
 *                     que consumen los componentes.
 *
 * Ningún componente lee de este objeto directamente.
 */

export type ThemeMode = 'dark' | 'light';
export type SurfaceStyle = 'flat' | 'glass' | 'elevated';
export type CornerStyle = 'sharp' | 'soft' | 'rounded' | 'pill';
export type TypographyScale = 'compact' | 'balanced' | 'editorial';

export interface BrandPalette {
  /** Color de acción principal: CTAs, foco, énfasis. */
  readonly primary: string;
  /** Variante para hover/estados presionados del color primario. */
  readonly primaryStrong: string;
  /** Color estructural: tarjetas destacadas, barras, bloques de sección. */
  readonly structural: string;
  /** Variante profunda del estructural: barras de título, pies. */
  readonly structuralDeep: string;
  /** Fondo base del sitio. */
  readonly surface: string;
  /** Fondo de un nivel de elevación por encima de `surface`. */
  readonly surfaceRaised: string;
  /** Fondo de tarjetas y contenedores sobre `surfaceRaised`. */
  readonly surfaceCard: string;
  /** Texto principal. */
  readonly text: string;
  /** Texto secundario / descripciones. */
  readonly textMuted: string;
  /** Bordes y separadores. */
  readonly border: string;
  /** Acento de apoyo para gráficos y detalles. */
  readonly accent: string;
}

export interface BrandTypography {
  /** Familia para títulos. Debe existir en `styles/fonts.css`. */
  readonly display: string;
  /** Familia para texto corrido. */
  readonly body: string;
  readonly scale: TypographyScale;
  /** `uppercase` en títulos de sección: refuerza marcas deportivas. */
  readonly uppercaseHeadings: boolean;
  readonly headingTracking: string;
}

export interface BrandShape {
  readonly corners: CornerStyle;
  readonly surfaceStyle: SurfaceStyle;
  /** Intensidad del resplandor del color primario (0 = sin glow). */
  readonly glowIntensity: number;
  /** Muestra la retícula/grano de fondo característico del tema oscuro. */
  readonly showGrid: boolean;
}

/**
 * Imagen de marca servida desde `public/`.
 *
 * Lleva sus dimensiones porque la cabecera la pinta antes de que la imagen
 * llegue: sin ancho y alto el navegador no puede reservar el hueco y la
 * navegación salta de sitio al cargar.
 */
export interface BrandImage {
  /** Ruta dentro del sitio: `/tenants/<slug>/isotipo.png`. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Iconos del navegador. Salen de `scripts/generar-marca.mjs`, que los genera
 * todos a partir del mismo logotipo maestro.
 */
export interface BrandIcons {
  /** `.ico` multitamaño: lo piden navegadores antiguos y quien llama a `/favicon.ico`. */
  readonly favicon: string;
  /** PNG cuadrado de 192 px o más, para pestañas de alta densidad y Android. */
  readonly icon: string;
  /** PNG de 180 × 180 opaco para la pantalla de inicio de iOS. */
  readonly apple: string;
}

export interface BrandLogo {
  /** Texto del logotipo, compuesto con la tipografía de la marca. */
  readonly wordmark: string;
  /** Palabra secundaria bajo el wordmark. */
  readonly subMark: string;
  /** Monograma de 1–2 letras: la marca compacta mientras no haya isotipo. */
  readonly monogram: string;
  /**
   * Isotipo gráfico entregado por el cliente. Si falta, la cabecera compone el
   * monograma con tipografía: ningún gimnasio queda sin marca por no haber
   * entregado todavía su archivo.
   */
  readonly mark?: BrandImage;
  /** Logotipo completo (isotipo más nombre), para usos grandes. */
  readonly full?: BrandImage;
  /** Iconos de pestaña. Si faltan, el navegador muestra el suyo por defecto. */
  readonly icons?: BrandIcons;
}

export interface TenantBranding {
  readonly mode: ThemeMode;
  readonly logo: BrandLogo;
  readonly palette: BrandPalette;
  readonly typography: BrandTypography;
  readonly shape: BrandShape;
}
