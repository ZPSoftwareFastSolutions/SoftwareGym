/**
 * Construcción de enlaces internos con el prefijo del tenant.
 *
 * Todo enlace del sitio público pasa por aquí. Concatenar rutas a mano en los
 * componentes es la forma segura de que, al migrar de rutas por path a rutas
 * por dominio (V2), queden enlaces rotos dispersos por toda la aplicación.
 */

import type { ContactInfo } from '@core/domain/tenant/tenant-config';

/** `/mitico`, `/mitico/planes`. Un segmento vacío devuelve la raíz del tenant. */
export function tenantHref(slug: string, segment = ''): string {
  const clean = segment.replace(/^\/+|\/+$/g, '');
  return clean ? `/${slug}/${clean}` : `/${slug}`;
}

/** Enlace `wa.me` con el mensaje precargado del gimnasio. */
export function whatsappHref(contact: ContactInfo): string {
  const digits = contact.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(contact.whatsappMessage)}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

/**
 * Los enlaces a redes llegan vacíos a propósito en la configuración de V1:
 * el cliente los completa antes de publicar. Un `href=""` navegaría a la
 * página actual, así que se degradan a un botón inerte y anunciado como tal.
 */
export function isLiveLink(url: string | undefined): url is string {
  return typeof url === 'string' && url.trim().length > 0;
}
