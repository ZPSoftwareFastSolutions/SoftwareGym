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

  // Vacío es válido y significa «este gimnasio no publica correo»: la vitrina
  // omite la línea, igual que una red social sin URL se muestra inerte en vez
  // de rota. Lo que no se admite es un correo escrito a medias, que sí sería un
  // enlace `mailto:` que no lleva a ninguna parte.
  if (tenant.contact.email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(tenant.contact.email)) {
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

  for (const plan of allPlans) {
    if (plan.altPrice && plan.altPrice.price <= 0) {
      issues.push(`El plan "${plan.id}" declara un altPrice que no es un precio.`);
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

  // --- Sedes -------------------------------------------------------------
  //
  // En la landing la sede ES el archivo: si aquí hay una errata, no hay panel
  // ni base que la corrija después. Por eso se valida entera, no solo su código.
  const CODIGO_DE_SEDE = /^[A-Z0-9]{2,12}$/;
  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

  const branches = tenant.content.branches;
  const sedes = branches?.sedes ?? [];
  const codigosDeSede = new Set(sedes.map((s) => s.code));

  if (tenant.features.showBranches && sedes.length === 0) {
    issues.push('features.showBranches está activo pero content.branches no declara ninguna sede.');
  }

  if (branches) {
    if (new Set(sedes.map((s) => s.code)).size !== sedes.length) {
      issues.push('Hay códigos de sucursal duplicados en content.branches.sedes.');
    }

    const principales = sedes.filter((s) => s.isPrimary);
    if (sedes.length > 0 && principales.length !== 1) {
      issues.push(`Debe haber exactamente una sede con isPrimary: true (hay ${principales.length}).`);
    }

    for (const sede of sedes) {
      if (!CODIGO_DE_SEDE.test(sede.code)) {
        issues.push(`content.branches.sedes: el código "${sede.code}" debe ser A-Z y 0-9, de 2 a 12 caracteres.`);
      }
      if (!sede.name.trim()) issues.push(`content.branches.sedes "${sede.code}": name no puede estar vacío.`);
      if (!sede.address.trim()) issues.push(`content.branches.sedes "${sede.code}": address no puede estar vacía.`);
      if (sede.whatsapp !== undefined && !/^\d{10,15}$/.test(sede.whatsapp)) {
        issues.push(`content.branches.sedes "${sede.code}": whatsapp debe ser solo dígitos con código de país (sin + ni espacios).`);
      }
      if (sede.highlights.length > 5) {
        issues.push(`content.branches.sedes "${sede.code}": máximo cinco highlights (tiene ${sede.highlights.length}).`);
      }
      // Siete días o ninguno: una semana a medias deja huecos que la tabla
      // dibuja como si el gimnasio no abriera, y eso no es lo que dice el dato.
      if (sede.week.length !== 7) {
        issues.push(`content.branches.sedes "${sede.code}": week debe tener 7 días, tiene ${sede.week.length}.`);
      }
      for (const dia of sede.week) {
        if (dia.closed) continue;
        if (!HORA.test(dia.open) || !HORA.test(dia.close)) {
          issues.push(`content.branches.sedes "${sede.code}", ${dia.day}: las horas deben ser HH:MM en 24 h.`);
        }
      }
    }

    if (branches.benefits.length > 4) {
      issues.push(`content.branches.benefits: máximo cuatro beneficios (tiene ${branches.benefits.length}).`);
    }
  }

  // --- Instalaciones repartidas por sede ----------------------------------
  //
  // Un código mal escrito no rompe nada: el área cae al grupo general y nadie
  // se entera de que iba a una sede concreta. Por eso se comprueba aquí.
  for (const facility of tenant.content.facilities) {
    if (facility.branchCode === undefined) continue;
    if (!CODIGO_DE_SEDE.test(facility.branchCode)) {
      issues.push(
        `content.facilities "${facility.id}": branchCode "${facility.branchCode}" debe ser A-Z y 0-9, de 2 a 12 caracteres.`,
      );
    } else if (!codigosDeSede.has(facility.branchCode)) {
      issues.push(`content.facilities "${facility.id}": branchCode "${facility.branchCode}" no corresponde a ninguna sede declarada.`);
    }
  }

  const reparteInstalaciones = tenant.content.facilities.some((f) => f.branchCode !== undefined);
  if (reparteInstalaciones && !tenant.features.showBranches) {
    issues.push('Hay instalaciones con branchCode pero features.showBranches está apagada: el reparto por sede no se vería.');
  }

  // --- Clases dirigidas ----------------------------------------------------
  const clases = tenant.content.classes;

  if (tenant.features.showClasses && clases.length === 0) {
    issues.push('features.showClasses está activo pero content.classes está vacío.');
  }

  const idsDeClase = new Set(clases.map((c) => c.id));
  if (idsDeClase.size !== clases.length) {
    issues.push('Hay identificadores duplicados en content.classes.');
  }

  for (const clase of clases) {
    if (clase.horarios.length === 0 && clase.note === undefined) {
      issues.push(`content.classes "${clase.id}": sin horarios hay que explicar por qué (note).`);
    }
    for (const franja of clase.horarios) {
      if (!HORA.test(franja.startTime) || (franja.endTime !== undefined && !HORA.test(franja.endTime))) {
        issues.push(`content.classes "${clase.id}": las horas deben ser HH:MM en 24 h.`);
      } else if (franja.endTime !== undefined && franja.endTime <= franja.startTime) {
        issues.push(`content.classes "${clase.id}": el fin (${franja.endTime}) debe ser posterior al inicio (${franja.startTime}).`);
      }
      // Una franja que apunta a una sede inexistente desaparece en silencio de
      // la agenda: la clase se anuncia y nunca se ve en ninguna pestaña.
      if (sedes.length > 0 && !codigosDeSede.has(franja.branchCode)) {
        issues.push(`content.classes "${clase.id}": branchCode "${franja.branchCode}" no corresponde a ninguna sede declarada.`);
      }
    }
  }

  // --- Navegación ligada a capacidades -------------------------------------
  const exigeCapacidad: readonly (readonly [string, keyof typeof tenant.features])[] = [
    ['planes', 'showPlans'],
    ['sucursales', 'showBranches'],
    ['clases', 'showClasses'],
    ['instalaciones', 'showFacilities'],
    ['galeria', 'showGallery'],
    ['horarios', 'showSchedule'],
  ];
  for (const [segmento, bandera] of exigeCapacidad) {
    const entrada = tenant.navigation.find((n) => n.segment === segmento);
    if (entrada && entrada.requiresFeature !== bandera) {
      issues.push(`La entrada de navegación "${segmento}" debe exigir la capacidad ${bandera}.`);
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
