/**
 * CAPA: Application / Theming
 *
 * Deriva los TOKENS DE TENANT (`--t-*`) a partir de los primitivos declarados
 * en el branding del gimnasio.
 *
 * Cadena completa de tokens (ver docs/architecture/theming.md):
 *
 *   TenantConfig.branding   →   --t-*        →   --color-* / --radius-* / --font-*
 *   (primitivos de marca)       (runtime)         (semánticos de Tailwind)
 *                                                        ↓
 *                                            lo único que consume un componente
 *
 * Los dos namespaces están separados a propósito: si el token de tenant y el
 * semántico compartieran nombre, `--color-surface: var(--color-surface)` se
 * auto-referenciaría y el tema entero colapsaría al valor inicial.
 *
 * SEGURIDAD: todo valor que termina dentro de una etiqueta <style> pasa antes
 * por `parseCssColor`. Un color proveniente de configuración (mañana, de base
 * de datos) sin validar es un vector de inyección de CSS.
 */

import { parseCssColor } from '../../domain/shared/branding.types';
import type { CornerStyle, TenantBranding, TypographyScale } from '../../domain/tenant/branding';

const CORNER_RADII: Record<CornerStyle, { sm: string; md: string; lg: string; xl: string }> = {
  sharp: { sm: '0px', md: '0px', lg: '2px', xl: '2px' },
  soft: { sm: '4px', md: '6px', lg: '10px', xl: '14px' },
  rounded: { sm: '8px', md: '12px', lg: '18px', xl: '26px' },
  pill: { sm: '10px', md: '16px', lg: '26px', xl: '38px' },
};

const TYPE_SCALES: Record<TypographyScale, Record<string, string>> = {
  compact: {
    '--t-size-display': 'clamp(2.2rem, 1.4rem + 3.4vw, 4.2rem)',
    '--t-size-h1': 'clamp(1.9rem, 1.3rem + 2.4vw, 3.1rem)',
    '--t-size-h2': 'clamp(1.5rem, 1.2rem + 1.4vw, 2.2rem)',
    '--t-size-h3': 'clamp(1.15rem, 1.05rem + 0.5vw, 1.4rem)',
    '--t-size-lead': 'clamp(1rem, 0.96rem + 0.25vw, 1.12rem)',
    '--t-section-space': 'clamp(3.5rem, 2.5rem + 4vw, 6rem)',
  },
  balanced: {
    '--t-size-display': 'clamp(2.6rem, 1.5rem + 4.6vw, 5.4rem)',
    '--t-size-h1': 'clamp(2.1rem, 1.4rem + 3vw, 3.6rem)',
    '--t-size-h2': 'clamp(1.7rem, 1.3rem + 1.8vw, 2.6rem)',
    '--t-size-h3': 'clamp(1.2rem, 1.08rem + 0.6vw, 1.55rem)',
    '--t-size-lead': 'clamp(1.02rem, 0.97rem + 0.32vw, 1.2rem)',
    '--t-section-space': 'clamp(4.5rem, 3rem + 5.5vw, 8rem)',
  },
  editorial: {
    '--t-size-display': 'clamp(2.8rem, 1.6rem + 5.4vw, 6rem)',
    '--t-size-h1': 'clamp(2.3rem, 1.5rem + 3.6vw, 4rem)',
    '--t-size-h2': 'clamp(1.8rem, 1.35rem + 2.1vw, 2.9rem)',
    '--t-size-h3': 'clamp(1.25rem, 1.1rem + 0.7vw, 1.7rem)',
    '--t-size-lead': 'clamp(1.05rem, 0.98rem + 0.42vw, 1.3rem)',
    '--t-section-space': 'clamp(5rem, 3.2rem + 6.5vw, 9rem)',
  },
};

/** Convierte `#rrggbb` a la terna `r g b` que usan las capas alfa del tema. */
function toRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  if ([r, g, b].some(Number.isNaN)) return '255 255 255';
  return `${r} ${g} ${b}`;
}

function safeColor(raw: string, fallback: string): string {
  const parsed = parseCssColor(raw);
  return parsed.ok ? parsed.value : fallback;
}

/**
 * Produce el bloque de declaraciones CSS del tema del tenant.
 * Se inyecta una sola vez, en el servidor, en el layout del tenant.
 */
export function buildThemeVariables(branding: TenantBranding): string {
  const p = branding.palette;
  const radii = CORNER_RADII[branding.shape.corners];
  const scale = TYPE_SCALES[branding.typography.scale];

  const primary = safeColor(p.primary, '#39ff14');
  const structural = safeColor(p.structural, '#38761d');
  const surface = safeColor(p.surface, '#0c0e0f');
  const text = safeColor(p.text, '#ffffff');
  const glow = branding.shape.glowIntensity;

  const declarations: Record<string, string> = {
    // --- Acción ---
    '--t-action': primary,
    '--t-action-strong': safeColor(p.primaryStrong, primary),
    '--t-action-rgb': toRgbChannels(primary),
    '--t-on-action': branding.mode === 'dark' ? surface : '#ffffff',
    '--t-focus': primary,

    // --- Estructura ---
    '--t-structural': structural,
    '--t-structural-deep': safeColor(p.structuralDeep, structural),
    '--t-structural-rgb': toRgbChannels(structural),

    // --- Superficies ---
    '--t-surface': surface,
    '--t-raised': safeColor(p.surfaceRaised, surface),
    '--t-card': safeColor(p.surfaceCard, surface),
    '--t-surface-rgb': toRgbChannels(surface),

    // --- Texto y bordes ---
    '--t-ink': text,
    '--t-muted': safeColor(p.textMuted, text),
    '--t-line': safeColor(p.border, '#252a26'),
    '--t-accent': safeColor(p.accent, primary),

    // --- Forma ---
    '--t-radius-sm': radii.sm,
    '--t-radius-md': radii.md,
    '--t-radius-lg': radii.lg,
    '--t-radius-xl': radii.xl,

    // --- Tipografía ---
    '--t-font-display': branding.typography.display,
    '--t-font-body': branding.typography.body,
    '--t-heading-transform': branding.typography.uppercaseHeadings ? 'uppercase' : 'none',
    '--t-heading-tracking': branding.typography.headingTracking,

    // --- Efectos ---
    '--t-glow-strength': String(glow),
    '--t-glow': glow > 0 ? `0 0 ${18 * glow}px rgb(${toRgbChannels(primary)} / ${0.4 * glow})` : 'none',
    '--t-grid-opacity': branding.shape.showGrid ? '1' : '0',
    '--t-blur': branding.shape.surfaceStyle === 'glass' ? '14px' : '0px',
    '--t-card-alpha': branding.shape.surfaceStyle === 'glass' ? '0.6' : '1',
    '--t-elevation':
      branding.shape.surfaceStyle === 'elevated'
        ? '0 1px 2px rgb(0 0 0 / 0.04), 0 14px 34px -14px rgb(0 0 0 / 0.16)'
        : 'none',

    ...scale,
  };

  return Object.entries(declarations)
    .map(([key, value]) => `${key}:${value};`)
    .join('');
}

/** Esquema de color nativo del navegador (scrollbars, controles, autofill). */
export function browserColorScheme(branding: TenantBranding): 'dark' | 'light' {
  return branding.mode;
}
