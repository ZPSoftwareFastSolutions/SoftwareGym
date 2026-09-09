/**
 * CAPA: Domain / Shared
 * Tipos base compartidos por todo el dominio. Sin dependencias de framework.
 */

/** Marca nominal para evitar que dos `string` distintos se confundan entre sí. */
export type Branded<T, TBrand extends string> = T & { readonly __brand: TBrand };

/** Identificador de tenant en URL y configuración. Siempre kebab-case. */
export type TenantSlug = Branded<string, 'TenantSlug'>;

/** Color en formato CSS válido y validado (`#rrggbb` u `oklch(...)`). */
export type CssColor = Branded<string, 'CssColor'>;

/** Ruta interna de la aplicación, relativa a la raíz del tenant. */
export type RoutePath = Branded<string, 'RoutePath'>;

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Expresión estricta de color. Se aplica ANTES de interpolar cualquier valor
 * de configuración dentro de una etiqueta <style>, para cerrar el vector de
 * inyección de CSS desde datos de tenant.
 */
const CSS_COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(\s*\/\s*[\d.]+%?)?\s*\)|rgb\(\s*\d{1,3}\s+\d{1,3}\s+\d{1,3}(\s*\/\s*[\d.]+%?)?\s*\))$/;

export function parseCssColor(raw: string): Result<CssColor> {
  const value = raw.trim();
  if (!CSS_COLOR_PATTERN.test(value)) {
    return Err(`Color CSS no permitido: "${raw}"`);
  }
  return Ok(value as CssColor);
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseTenantSlug(raw: string): Result<TenantSlug> {
  const value = raw.trim().toLowerCase();
  if (value.length < 2 || value.length > 40 || !SLUG_PATTERN.test(value)) {
    return Err(`Slug de tenant inválido: "${raw}"`);
  }
  return Ok(value as TenantSlug);
}
