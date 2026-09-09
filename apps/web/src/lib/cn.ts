/**
 * Composición de clases sin dependencias externas.
 *
 * No se usa `tailwind-merge`: las variantes de los componentes se resuelven
 * con enums internos, no sobreescribiendo clases desde fuera. Añadirlo sería
 * peso en el bundle sin beneficio.
 *
 * CONTRAPARTIDA — regla que hay que respetar:
 * al pasar `className` a un componente NO se puede enviar una utilidad que
 * compita con las suyas propias. `hidden` sobre un botón que ya trae
 * `inline-flex` no lo oculta: ambas son utilidades de `display` y gana la que
 * Tailwind emita más tarde en la hoja, no la última escrita.
 *
 * Para esos casos se compone: un contenedor con `hidden md:contents` controla
 * la visibilidad sin tocar el display del hijo. Ver `SiteHeader`.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
