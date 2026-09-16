/**
 * Pruebas de la landing.
 *
 * QUÉ SE PRUEBA AQUÍ. El dominio puro —agrupar horarios, repartir clases e
 * instalaciones por sede— y el VALIDADOR, que en esta versión es la única red
 * que queda: sin panel ni base de datos, una errata en el archivo del gimnasio
 * no la corrige nadie después. Si el validador la deja pasar, se publica.
 *
 * Y se prueba el contrato de lo que ya NO existe: que el sitio no declare
 * ninguna capacidad de socios, sesión o cobro. Es fácil que una de esas vuelva
 * sin que nadie lo note, porque volvería como una línea en un archivo de
 * configuración, no como una pantalla nueva.
 *
 * Se ejecutan con `npm test` (node --test), sin framework ni navegador.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clasesDeSede,
  diasLegibles,
  duracionEnMinutos,
  rangoLegible,
  semanaDeSede,
  totalDeFranjas,
  type ClaseDeVitrina,
} from '../src/core/domain/catalog/classes.ts';
import { diasAbiertos, resumirSemana } from '../src/core/domain/catalog/schedule.ts';
import {
  agruparInstalacionesPorSede,
  describirGrupo,
  necesitaPestanasDeSede,
} from '../src/core/domain/catalog/facilities.ts';
import { ordenarSedes, urlDeUbicacion } from '../src/core/domain/catalog/branches.ts';
import type { FacilityItem } from '../src/core/domain/catalog/catalog.ts';
import type { TenantConfig } from '../src/core/domain/tenant/tenant-config.ts';
import { validateTenantConfig } from '../src/infrastructure/tenants/tenant.validator.ts';
import { miticoTenant } from '../tenants/mitico.tenant.ts';

// ---------------------------------------------------------------- horarios

test('resumir semana agrupa los días seguidos que abren igual', () => {
  const lineas = resumirSemana([
    { day: 'Lunes', open: '07:00', close: '23:00', closed: false },
    { day: 'Martes', open: '07:00', close: '23:00', closed: false },
    { day: 'Miércoles', open: '07:00', close: '23:00', closed: false },
    { day: 'Jueves', open: '07:00', close: '23:00', closed: false },
    { day: 'Viernes', open: '07:00', close: '23:00', closed: false },
    { day: 'Sábado', open: '09:00', close: '22:00', closed: false },
    { day: 'Domingo', open: '', close: '', closed: true },
  ]);

  assert.deepEqual(lineas, [
    'Lunes a viernes · 07:00 a 23:00',
    'Sábado · 09:00 a 22:00',
    'Domingo · Cerrado',
  ]);
});

test('un día con nota no se esconde dentro de un rango', () => {
  const lineas = resumirSemana([
    { day: 'Lunes', open: '07:00', close: '23:00', closed: false },
    { day: 'Martes', open: '07:00', close: '23:00', closed: false, note: 'Sin clases' },
    { day: 'Miércoles', open: '07:00', close: '23:00', closed: false },
  ]);

  assert.equal(lineas.length, 3);
});

test('los días abiertos se cuentan, no se suponen', () => {
  assert.equal(diasAbiertos(miticoTenant.content.branches!.sedes[0]!.week), 6);
  assert.equal(diasAbiertos(miticoTenant.content.branches!.sedes[1]!.week), 7);
});

// ---------------------------------------------------------------- clases

const CLASES: readonly ClaseDeVitrina[] = [
  {
    id: 'baile',
    name: 'Baile urbano',
    description: '',
    category: 'baile',
    level: 'todos',
    horarios: [
      { weekday: 1, startTime: '18:00', endTime: '19:30', branchCode: 'PRADO' },
      { weekday: 3, startTime: '16:00', endTime: '17:30', branchCode: 'MIRAFLORES' },
    ],
    seed: 1,
  },
  {
    id: 'solo-miraflores',
    name: 'Baile fitness',
    description: '',
    category: 'fit',
    level: 'todos',
    horarios: [{ weekday: 2, startTime: '11:00', branchCode: 'MIRAFLORES' }],
    seed: 2,
  },
];

test('cada sede solo ve sus propias franjas', () => {
  const prado = clasesDeSede(CLASES, 'PRADO');
  assert.deepEqual(
    prado.map((c) => c.id),
    ['baile'],
  );
  assert.equal(prado[0]!.horarios.length, 1);

  assert.equal(totalDeFranjas(CLASES, 'MIRAFLORES'), 2);
});

test('la agenda devuelve solo los días con clase, ordenados por hora', () => {
  const semana = semanaDeSede(CLASES, 'MIRAFLORES');
  assert.deepEqual(
    semana.map((d) => d.dia),
    [2, 3],
  );
  assert.equal(semana[0]!.franjas[0]!.clase, 'Baile fitness');
});

test('una franja sin hora de cierre muestra solo la de inicio', () => {
  assert.equal(rangoLegible({ startTime: '11:00' }), '11:00');
  assert.equal(rangoLegible({ startTime: '18:00', endTime: '19:30' }), '18:00 – 19:30');
  assert.equal(duracionEnMinutos({ startTime: '18:00', endTime: '19:30' }), 90);
  // Sin cierre publicado no se inventa una duración.
  assert.equal(duracionEnMinutos({ startTime: '11:00' }), null);
});

test('los días de una clase se leen como los diría una persona', () => {
  assert.equal(diasLegibles([{ weekday: 1, startTime: '18:00', branchCode: 'X' }]), 'Lunes');
  assert.equal(
    diasLegibles([
      { weekday: 3, startTime: '18:00', branchCode: 'X' },
      { weekday: 1, startTime: '18:00', branchCode: 'X' },
    ]),
    'Lunes y miércoles',
  );
});

// ---------------------------------------------------------------- sedes

test('la sede principal va primero, sin importar cómo se escribió el archivo', () => {
  const ordenadas = ordenarSedes([
    { ...miticoTenant.content.branches!.sedes[1]! },
    { ...miticoTenant.content.branches!.sedes[0]! },
  ]);
  assert.equal(ordenadas[0]!.isPrimary, true);
});

test('sin URL de mapa se busca por dirección, no se pierde el enlace', () => {
  const sede = miticoTenant.content.branches!.sedes[0]!;
  const url = urlDeUbicacion(sede, 'La Paz');
  assert.ok(url?.startsWith('https://www.google.com/maps/search/'));
});

// ---------------------------------------------------- instalaciones por sede

const AREA = (id: string, branchCode?: string): FacilityItem => ({
  id,
  name: id,
  description: '',
  area: '',
  icon: 'dumbbell',
  stats: [],
  ...(branchCode ? { branchCode } : {}),
});

test('sin áreas atribuidas no hay pestañas: una sola lista', () => {
  const grupos = agruparInstalacionesPorSede([AREA('a'), AREA('b')], [
    { code: 'PRADO', name: 'Prado' },
  ]);
  assert.equal(necesitaPestanasDeSede(grupos), false);
  assert.equal(grupos[0]!.facilities.length, 2);
});

test('lo común se repite en cada sede y lo propio va primero', () => {
  const grupos = agruparInstalacionesPorSede(
    [AREA('pesas-prado', 'PRADO'), AREA('pesas-mira', 'MIRAFLORES'), AREA('vestuarios')],
    [
      { code: 'PRADO', name: 'Prado' },
      { code: 'MIRAFLORES', name: 'Miraflores' },
    ],
  );

  assert.equal(necesitaPestanasDeSede(grupos), true);
  assert.deepEqual(
    grupos[0]!.facilities.map((f) => f.id),
    ['pesas-prado', 'vestuarios'],
  );
  assert.equal(describirGrupo(grupos[1]!), '2 áreas');
});

// ---------------------------------------------------------------- validador

test('la configuración de Mítico es válida', () => {
  assert.deepEqual(validateTenantConfig(miticoTenant), []);
});

/** Copia profunda editable del tenant, para romperlo de una forma a la vez. */
function roto(cambio: (t: Record<string, any>) => void): TenantConfig {
  const copia = JSON.parse(JSON.stringify(miticoTenant)) as Record<string, any>;
  cambio(copia);
  return copia as unknown as TenantConfig;
}

test('una clase que apunta a una sede inexistente no se publica en silencio', () => {
  const issues = validateTenantConfig(
    roto((t) => {
      t.content.classes[0].horarios[0].branchCode = 'NOEXISTE';
    }),
  );
  assert.ok(issues.some((i) => i.includes('NOEXISTE')));
});

test('un área que apunta a una sede inexistente se detecta', () => {
  const issues = validateTenantConfig(
    roto((t) => {
      t.content.facilities[0].branchCode = 'FANTASMA';
    }),
  );
  assert.ok(issues.some((i) => i.includes('FANTASMA')));
});

test('una sede con la semana a medias no pasa', () => {
  const issues = validateTenantConfig(
    roto((t) => {
      t.content.branches.sedes[0].week = t.content.branches.sedes[0].week.slice(0, 5);
    }),
  );
  assert.ok(issues.some((i) => i.includes('week debe tener 7 días')));
});

test('tiene que haber exactamente una sede principal', () => {
  const issues = validateTenantConfig(
    roto((t) => {
      t.content.branches.sedes[1].isPrimary = true;
    }),
  );
  assert.ok(issues.some((i) => i.includes('isPrimary')));
});

test('el segundo precio de un paquete también tiene que ser un precio', () => {
  const issues = validateTenantConfig(
    roto((t) => {
      t.content.planGroups[1].plans[0].altPrice = { label: 'dos sucursales', price: 0 };
    }),
  );
  assert.ok(issues.some((i) => i.includes('altPrice')));
});

test('encender las clases sin declararlas no se permite', () => {
  const issues = validateTenantConfig(
    roto((t) => {
      t.content.classes = [];
    }),
  );
  assert.ok(issues.some((i) => i.includes('showClasses')));
});

test('un enlace del menú tiene que exigir la capacidad que abre su página', () => {
  const issues = validateTenantConfig(
    roto((t) => {
      const clases = t.navigation.find((n: any) => n.segment === 'clases');
      delete clases.requiresFeature;
    }),
  );
  assert.ok(issues.some((i) => i.includes('"clases"')));
});

// ------------------------------------------------- contrato de la landing

test('el menú es exactamente el acordado con el cliente, en orden', () => {
  assert.deepEqual(
    miticoTenant.navigation.map((n) => n.label),
    [
      'Inicio',
      'Nosotros',
      'Servicios',
      'Planes',
      'Sucursales',
      'Clases',
      'Instalaciones',
      'Galería',
      'Horarios',
      'Contacto',
    ],
  );
});

test('no existe ninguna capacidad de socios, sesión, cobro ni gestión', () => {
  const prohibidas = [
    'memberLogin',
    'enablePayments',
    'enableAttendance',
    'enableQrAttendance',
    'enableReservations',
    'enableMemberManagement',
    'enableReports',
    'enableTrainers',
    'enableRoutines',
    'enableNotifications',
  ];
  const declaradas = Object.keys(miticoTenant.features);
  for (const bandera of prohibidas) {
    assert.ok(!declaradas.includes(bandera), `La capacidad "${bandera}" volvió al contrato.`);
  }
});

test('ningún paquete invita a pagar en la página: todos llevan a consultar', () => {
  const planes = miticoTenant.content.planGroups.flatMap((g) => g.plans);
  for (const plan of planes) {
    assert.equal(plan.ctaLabel, 'Consultar', `El paquete "${plan.id}" no dice «Consultar».`);
  }
  for (const programa of miticoTenant.content.trainingPlans) {
    assert.equal(programa.ctaLabel, 'Consultar', `El programa "${programa.id}" no dice «Consultar».`);
  }
});

test('el tarifario oficial está completo', () => {
  const precios = new Map(
    miticoTenant.content.planGroups.flatMap((g) => g.plans).map((p) => [p.id, p.price]),
  );
  // Paquetes mensuales del documento del cliente.
  assert.equal(precios.get('basico'), 180);
  assert.equal(precios.get('basico-life'), 200);
  assert.equal(precios.get('basico-dance'), 300);
  assert.equal(precios.get('basico-dance-life'), 400);
  assert.equal(precios.get('fit'), 220);
  assert.equal(precios.get('basico-fit'), 280);
  assert.equal(precios.get('fit-dance'), 300);
  assert.equal(precios.get('mitico'), 300);
  assert.equal(precios.get('mitico-dance'), 400);
  assert.equal(precios.get('mitico-fitness'), 430);
  // Otros planes.
  assert.equal(precios.get('sesion'), 30);
  assert.equal(precios.get('trimestral'), 420);
  assert.equal(precios.get('semestral'), 820);
  assert.equal(precios.get('anual'), 1500);

  // Y los seis programas de entrenamiento personalizado.
  assert.deepEqual(
    miticoTenant.content.trainingPlans.map((p) => p.price),
    [240, 240, 370, 420, 500, 550],
  );
});

test('los precios de dos sucursales son los del tarifario', () => {
  const alt = new Map(
    miticoTenant.content.planGroups
      .flatMap((g) => g.plans)
      .filter((p) => p.altPrice)
      .map((p) => [p.id, p.altPrice!.price]),
  );
  assert.deepEqual(
    [...alt.entries()].sort(),
    [
      ['basico-fit', 300],
      ['fit', 240],
      ['fit-dance', 420],
      ['mitico', 320],
      ['mitico-dance', 450],
      ['mitico-fitness', 530],
    ],
  );
});
