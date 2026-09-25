/**
 * Datos estructurados (schema.org, JSON-LD) del gimnasio, para buscadores.
 *
 * Le dicen a Google qué es el negocio, dónde está, cómo contactarlo y cuándo
 * abre, sin que tenga que deducirlo del HTML. Es lo que alimenta la ficha de
 * negocio en los resultados.
 *
 * SOLO DATOS VERIFICADOS de la configuración: nombre, sedes, teléfonos,
 * horario oficial, redes y logo. No se declaran valoraciones, reseñas ni
 * precios medios: Google penaliza (y la ley de consumo prohíbe) marcar datos
 * que la página no respalda.
 */

import type { DaySchedule } from '@core/domain/catalog/schedule';
import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { tenantHref } from '@/lib/tenant-links';

const DIA_SCHEMA: Readonly<Record<string, string>> = {
  Lunes: 'Monday',
  Martes: 'Tuesday',
  Miércoles: 'Wednesday',
  Jueves: 'Thursday',
  Viernes: 'Friday',
  Sábado: 'Saturday',
  Domingo: 'Sunday',
};

function horario(week: readonly DaySchedule[]) {
  return week
    .filter((d) => !d.closed && DIA_SCHEMA[d.day])
    .map((d) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${DIA_SCHEMA[d.day]}`,
      opens: d.open,
      closes: d.close,
    }));
}

function telefonoInternacional(t: TenantConfig, local: string): string {
  // El código de país sale del WhatsApp general (formato internacional).
  const digitos = local.replace(/\D/g, '');
  const whatsapp = t.contact.whatsapp.replace(/\D/g, '');
  const prefijo = whatsapp.endsWith(digitos) ? whatsapp.slice(0, whatsapp.length - digitos.length) : '';
  return prefijo ? `+${prefijo}${digitos}` : digitos;
}

export function datosEstructurados(t: TenantConfig, baseUrl: string): Record<string, unknown> {
  const url = `${baseUrl}${tenantHref(t.slug)}`;
  const sedes = t.content.branches?.sedes ?? [];
  const redes = Object.values(t.social).filter((u): u is string => typeof u === 'string' && u.trim() !== '');
  const logo = t.branding.logo.full ?? t.branding.logo.mark;

  const sede = (s: (typeof sedes)[number]) => ({
    '@type': 'HealthClub',
    name: `${t.name} — ${s.name}`,
    telephone: telefonoInternacional(t, s.phone),
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.address,
      addressLocality: t.contact.city,
      addressCountry: t.contact.country,
    },
    openingHoursSpecification: horario(s.week),
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'HealthClub',
    name: t.name,
    url,
    ...(logo ? { logo: `${baseUrl}${logo.src}`, image: `${baseUrl}${logo.src}` } : {}),
    telephone: telefonoInternacional(t, t.contact.phone),
    address: {
      '@type': 'PostalAddress',
      addressLocality: t.contact.city,
      addressCountry: t.contact.country,
    },
    ...(sedes.length > 0 ? { department: sedes.map(sede) } : { openingHoursSpecification: horario(t.hours.week) }),
    ...(redes.length > 0 ? { sameAs: redes } : {}),
  };
}

/**
 * JSON-LD listo para un `<script>`. `<` se escapa: un `</script>` dentro de un
 * texto de la configuración cerraría la etiqueta y abriría la puerta a
 * inyectar HTML.
 */
export function jsonLd(datos: Record<string, unknown>): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c');
}
