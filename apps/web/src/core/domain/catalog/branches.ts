/**
 * CAPA: Domain / Catalog
 *
 * Sedes en la vitrina.
 *
 * EN ESTA VERSIÓN LA SEDE ES UN DATO DEL ARCHIVO, NO DE UNA BASE. El sitio es
 * una landing: no hay panel donde gerencia edite sucursales, así que no hay
 * nada que leer de ningún lado. Una sede se declara entera —sus datos de puerta
 * y su texto comercial— en la configuración del gimnasio.
 *
 * POR QUÉ UN SOLO OBJETO Y NO DOS. Antes la sede vivía partida: los datos en la
 * base y el texto de vitrina en el archivo, unidos por `code`. Ese puente
 * existía porque las dos mitades cambiaban por vías distintas. Sin base, el
 * puente solo aporta la posibilidad de que una mitad quede huérfana de la otra.
 *
 * Sin I/O y sin React: se prueba sola.
 */

import type { DaySchedule } from './schedule';

export interface SedeDeVitrina {
  /** Identificador estable: MAYÚSCULAS y dígitos. Es el ancla (`#sede-PRADO`). */
  readonly code: string;
  readonly name: string;
  /** Frase corta que la distingue: «El clásico del centro». */
  readonly tagline: string;
  readonly description: string;
  /** Lo que la hace especial, en frases breves. Máximo cinco. */
  readonly highlights: readonly string[];
  readonly address: string;
  readonly phone: string;
  readonly email?: string;
  /** Horario de atención PROPIO: dos sedes del mismo gimnasio no cierran igual. */
  readonly week: readonly DaySchedule[];
  readonly scheduleNote?: string;
  /** URL de mapa embebido. Ausente: se busca por dirección. */
  readonly mapEmbedUrl?: string;
  readonly mapLinkUrl?: string;
  readonly isPrimary: boolean;
  /** Semilla de la composición gráfica mientras no haya fotografía. */
  readonly seed?: number;
}

function conCiudad(direccion: string, ciudad?: string): string {
  if (!ciudad || direccion.toLowerCase().includes(ciudad.toLowerCase())) return direccion;
  return `${direccion}, ${ciudad}`;
}

/**
 * Dirección del mapa embebido de la sede.
 *
 * Con URL declarada, esa; si no, la dirección escrita, que Google resuelve
 * solo. No se usa el enlace corto de «Compartir»: Google no permite
 * incrustarlo en un iframe.
 */
export function urlDeMapaEmbebido(sede: SedeDeVitrina, ciudad?: string): string | null {
  if (sede.mapEmbedUrl) return sede.mapEmbedUrl;
  if (sede.address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(conCiudad(sede.address, ciudad))}&z=17&output=embed`;
  }
  return null;
}

/** Enlace «Ver ubicación»: el del negocio si lo hay; si no, una búsqueda. */
export function urlDeUbicacion(sede: SedeDeVitrina, ciudad?: string): string | null {
  if (sede.mapLinkUrl) return sede.mapLinkUrl;
  if (sede.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(conCiudad(sede.address, ciudad))}`;
  }
  return null;
}

/** La sede principal primero; el resto en el orden en que las escribió el gimnasio. */
export function ordenarSedes(sedes: readonly SedeDeVitrina[]): readonly SedeDeVitrina[] {
  return [...sedes].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function sedePorCodigo(
  sedes: readonly SedeDeVitrina[],
  code: string,
): SedeDeVitrina | undefined {
  return sedes.find((sede) => sede.code === code);
}
