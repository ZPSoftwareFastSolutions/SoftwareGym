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
  const allPlans = tenant.content.planGroups.flatMap((g) => g.plans);

  if (tenant.features.showPlans && allPlans.length === 0) {
    issues.push('features.showPlans está activo pero content.planGroups no tiene ningún plan.');
  }
  if (tenant.features.showProducts && tenant.content.products.length === 0) {
    issues.push('features.showProducts está activo pero content.products está vacío.');
  }
  if (tenant.features.showTrainingPlans && tenant.content.trainingPlans.length === 0) {
    issues.push('features.showTrainingPlans está activo pero content.trainingPlans está vacío.');
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

  // El destacado se juzga POR GRUPO: cada familia comercial compite consigo
  // misma. Un único destacado global obligaría a elegir entre resaltar una
  // mensualidad o un plan de entrenamiento, que no son alternativas entre sí.
  for (const group of tenant.content.planGroups) {
    if (group.plans.length === 0) {
      issues.push(`El grupo de planes "${group.id}" no tiene ningún plan.`);
    }
    const featured = group.plans.filter((p) => p.featured);
    if (featured.length > 1) {
      issues.push(
        `Solo un plan por grupo puede tener featured: true (grupo "${group.id}" tiene ${featured.length}).`,
      );
    }
  }

  const groupIds = new Set(tenant.content.planGroups.map((g) => g.id));
  if (groupIds.size !== tenant.content.planGroups.length) {
    issues.push('Hay identificadores duplicados en content.planGroups.');
  }

  // Los ids de plan deben ser únicos en TODO el tenant, no solo dentro de su
  // grupo: son la clave de React en la retícula y, en V1.5, la clave natural
  // de la fila de la tabla `MembershipPlans`.
  const planIds = new Set(allPlans.map((p) => p.id));
  if (planIds.size !== allPlans.length) {
    issues.push('Hay identificadores de plan duplicados entre los grupos de content.planGroups.');
  }

  const trainingFeatured = tenant.content.trainingPlans.filter((p) => p.featured);
  if (trainingFeatured.length > 1) {
    issues.push(
      `Solo un programa de entrenamiento puede tener featured: true (hay ${trainingFeatured.length}).`,
    );
  }
  const trainingIds = new Set(tenant.content.trainingPlans.map((p) => p.id));
  if (trainingIds.size !== tenant.content.trainingPlans.length) {
    issues.push('Hay identificadores duplicados en content.trainingPlans.');
  }
  for (const program of tenant.content.trainingPlans) {
    if (program.routines.length === 0) {
      issues.push(`El programa "${program.id}" no declara ninguna rutina.`);
    }
  }

  const productIds = new Set(tenant.content.products.flatMap((c) => c.items.map((i) => i.id)));
  const productCount = tenant.content.products.reduce((n, c) => n + c.items.length, 0);
  if (productIds.size !== productCount) {
    issues.push('Hay identificadores de producto duplicados en content.products.');
  }

  // Textos de vitrina de sucursales (V3.0). El código tiene que poder existir
  // en la base (mismo patrón que `branches.code`): uno mal escrito no rompería
  // nada, simplemente su texto no aparecería nunca, y eso no se nota a simple vista.
  const branches = tenant.content.branches;
  if (branches) {
    const codes = branches.showcase.map((s) => s.code);
    for (const code of codes) {
      if (!/^[A-Z0-9]{2,12}$/.test(code)) {
        issues.push(`content.branches.showcase: el código "${code}" no tiene el formato de branches.code (A-Z, 0-9, 2 a 12).`);
      }
    }
    if (new Set(codes).size !== codes.length) {
      issues.push('Hay códigos de sucursal duplicados en content.branches.showcase.');
    }
    for (const sede of branches.showcase) {
      if (sede.highlights.length > 5) {
        issues.push(`content.branches.showcase "${sede.code}": máximo cinco highlights (tiene ${sede.highlights.length}).`);
      }
    }
    if (branches.benefits.length > 4) {
      issues.push(`content.branches.benefits: máximo cuatro beneficios (tiene ${branches.benefits.length}).`);
    }
  }

  const navSucursales = tenant.navigation.find((n) => n.segment === 'sucursales');
  if (navSucursales && navSucursales.requiresFeature !== 'enableMultiBranch') {
    issues.push('La entrada de navegación "sucursales" debe exigir la capacidad enableMultiBranch.');
  }

  const navClases = tenant.navigation.find((n) => n.segment === 'clases');
  if (navClases && navClases.requiresFeature !== 'enableClasses') {
    issues.push('La entrada de navegación "clases" debe exigir la capacidad enableClasses.');
  }

  // V3.4: una reserva es de una sesión de clase. Reservas sin clases dejarían
  // pantallas y reportes de reservas encendidos sobre un módulo que no existe.
  if (tenant.features.enableReservations && !tenant.features.enableClasses) {
    issues.push('La capacidad enableReservations exige enableClasses.');
  }

  // Turnos del personal (V3.1). El código se guarda con cada ausencia (mismo
  // patrón que la restricción de la base) y las horas deben ser un tramo real.
  const turnos = tenant.hours.staffShifts;
  if (turnos) {
    if (turnos.length === 0 || turnos.length > 6) issues.push('hours.staffShifts: entre 1 y 6 turnos.');
    const codigos = turnos.map((t) => t.code);
    if (new Set(codigos).size !== codigos.length) issues.push('hours.staffShifts: códigos de turno repetidos.');
    for (const t of turnos) {
      if (!/^[a-z0-9-]{2,20}$/.test(t.code)) issues.push(`hours.staffShifts: el código "${t.code}" debe usar a-z, 0-9 y guiones (2 a 20).`);
      const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!hora.test(t.start) || !hora.test(t.end) || t.end <= t.start) {
        issues.push(`hours.staffShifts "${t.code}": horas HH:MM y el fin después del inicio.`);
      }
    }
  }

  return issues;
}

export function assertValidTenantConfig(tenant: TenantConfig): void {
  const issues = validateTenantConfig(tenant);
  if (issues.length > 0) {
    throw new InvalidTenantConfigError(tenant.slug, issues);
  }
}
