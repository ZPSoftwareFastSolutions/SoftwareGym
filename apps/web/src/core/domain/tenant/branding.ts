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

export interface BrandLogo {
  /** Texto del logotipo (se compone tipográficamente, no es imagen). */
  readonly wordmark: string;
  /** Palabra secundaria bajo el wordmark. */
  readonly subMark: string;
  /** Monograma de 1–2 letras para el favicon y la marca compacta. */
  readonly monogram: string;
}

export interface TenantBranding {
  readonly mode: ThemeMode;
  readonly logo: BrandLogo;
  readonly palette: BrandPalette;
  readonly typography: BrandTypography;
  readonly shape: BrandShape;
}
