/**
 * CAPA: Infrastructure / Tenants
 *
 * Validación de configuración de tenant en el arranque.
 *
 * TypeScript garantiza la FORMA del objeto en compilación. No garantiza que
 * los valores sean válidos: un color mal escrito, un slug con mayúsculas o un
 * WhatsApp con símbolos pasan el compilador y rompen en producción.
 *
 * Esta función es la puerta: si un tenant está mal configurado, el build falla.
 */

import { parseCssColor, parseTenantSlug } from '@core/domain/shared/branding.types';
import type { TenantConfig } from '@core/domain/tenant/tenant-config';

export class InvalidTenantConfigError extends Error {
  constructor(slug: string, issues: readonly string[]) {
    super(
      `Configuración inválida para el tenant "${slug}":\n` +
        issues.map((i) => `  · ${i}`).join('\n'),
    );
    this.name = 'InvalidTenantConfigError';
  }
}

export function validateTenantConfig(tenant: TenantConfig): readonly string[] {
  const issues: string[] = [];

  const slug = parseTenantSlug(tenant.slug);
  if (!slug.ok) issues.push(slug.error);

  if (!tenant.name.trim()) issues.push('`name` no puede estar vacío.');
  if (!tenant.legalName.trim()) issues.push('`legalName` no puede estar vacío.');

  // Todo color termina dentro de una etiqueta <style>: validar es obligatorio.
  for (const [key, value] of Object.entries(tenant.branding.palette)) {
    const parsed = parseCssColor(value);
    if (!parsed.ok) issues.push(`branding.palette.${key}: ${parsed.error}`);
  }

  // Las familias tipográficas también acaban dentro de <style>. Se permite
  // únicamente la forma de una `font-family` legítima: nombres, comillas,
  // comas y `var(--token)`. Cualquier `;`, `{` o `url(` queda fuera.
  const FONT_STACK_PATTERN = /^[\w\s,'"()\-.]*$/;
  for (const key of ['display', 'body'] as const) {
    const stack = tenant.branding.typography[key];
    if (!FONT_STACK_PATTERN.test(stack) || stack.includes('url(')) {
      issues.push(`branding.typography.${key} contiene caracteres no permitidos.`);
    }
  }

  if (!/^-?[\d.]+(em|rem|px|%)?$/.test(tenant.branding.typography.headingTracking)) {
    issues.push('branding.typography.headingTracking debe ser una longitud CSS válida.');
  }

  const glow = tenant.branding.shape.glowIntensity;
  if (glow < 0 || glow > 2) {
    issues.push('branding.shape.glowIntensity debe estar entre 0 y 2.');
  }

  if (!/^\d{8,15}$/.test(tenant.contact.whatsapp)) {
    issues.push('contact.whatsapp debe ser solo dígitos en formato internacional (sin + ni espacios).');
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(tenant.contact.email)) {
    issues.push(`contact.email no tiene formato válido: "${tenant.contact.email}".`);
  }

  if (tenant.hours.week.length !== 7) {
    issues.push(`hours.week debe tener 7 días, tiene ${tenant.hours.week.length}.`);
  }

  if (tenant.navigation.length === 0) {
    issues.push('navigation no puede estar vacía.');
  }

  const homeItem = tenant.navigation.find((n) => n.segment === '');
  if (!homeItem) issues.push('navigation debe incluir un ítem de inicio (segment: "").');

  // Coherencia entre flags y contenido: una sección encendida sin datos
  // renderiza un bloque vacío, que es peor que no mostrarla.
  if (tenant.features.showPlans && tenant.content.plans.length === 0) {
    issues.push('features.showPlans está activo pero content.plans está vacío.');
  }
  if (tenant.features.showGallery && tenant.content.gallery.length === 0) {
    issues.push('features.showGallery está activo pero content.gallery está vacío.');
  }
  if (tenant.features.showFacilities && tenant.content.facilities.length === 0) {
    issues.push('features.showFacilities está activo pero content.facilities está vacío.');
  }
  if (tenant.features.showTeam && tenant.content.team.length === 0) {
    issues.push('features.showTeam está activo pero content.team está vacío.');
  }
  if (tenant.features.showFaq && tenant.content.faq.length === 0) {
    issues.push('features.showFaq está activo pero content.faq está vacío.');
  }

  const featuredPlans = tenant.content.plans.filter((p) => p.featured);
  if (featuredPlans.length > 1) {
    issues.push(`Solo un plan puede tener featured: true (hay ${featuredPlans.length}).`);
  }

  const planIds = new Set(tenant.content.plans.map((p) => p.id));
  if (planIds.size !== tenant.content.plans.length) {
    issues.push('Hay identificadores de plan duplicados en content.plans.');
  }

  return issues;
}

export function assertValidTenantConfig(tenant: TenantConfig): void {
  const issues = validateTenantConfig(tenant);
  if (issues.length > 0) {
    throw new InvalidTenantConfigError(tenant.slug, issues);
  }
}
