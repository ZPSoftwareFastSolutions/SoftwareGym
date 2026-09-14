/**
 * Pruebas de V4 · Administración, rutinas, paginación y navegación.
 *
 * - Jerarquía de roles: el espejo del dominio de `roles.level` (la base decide;
 *   estas pruebas fijan que la pantalla no ofrezca lo que la base rechaza).
 * - Rutinas: «Día A · Día A · Empuje» no vuelve a aparecer.
 * - Paginación: tramos, números visibles y URLs que conservan los filtros.
 * - Navegación agrupada: ninguna entrada se pierde al agrupar.
 * - Patrones de asistencia agregados en la base.
 *
 * El aislamiento entre gimnasios y la jerarquía en la base se prueban con
 * sesión simulada en `docs/runbooks/pruebas-rls-v4-administracion-y-rendimiento.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  espacioDeTrabajo,
  nivelDeRoles,
  puedeAdministrarCuenta,
  puedeOtorgarRol,
  rolPrincipal,
  ROLES_OTORGABLES,
  type PerfilOperativo,
} from '../src/core/domain/operations/workspace.ts';
import { nombreSinEtiquetaDelDia, tituloDeRutina, validarRutina } from '../src/core/domain/operations/training.ts';
import {
  acotarPorPagina,
  consultaDePagina,
  describirTramo,
  paginaDeFilas,
  paginaDeLaUrl,
  paginasVisibles,
  rangoDePagina,
  totalDePaginas,
} from '../src/core/domain/shared/paginacion.ts';
import { agruparEntradas, entradaActiva, MAXIMO_SIN_AGRUPAR, type GrupoDeNavegacion } from '../src/lib/navegacion.ts';
import { resumirPatrones, type PatronDeAsistencia } from '../src/core/domain/operations/attendance.ts';
import { repartoPorSucursal } from '../src/core/domain/operations/branches.ts';
import { describirEvento, mensajeDeErrorDePersonal } from '../src/core/domain/operations/staff.ts';

// ------------------------------------------------------------------ perfiles de prueba

const PERMISOS_DE_GERENCIA = [
  'attendance.create', 'attendance.read', 'audit.read', 'branches.all', 'branches.manage', 'classes.attend',
  'classes.manage', 'classes.read', 'customers.archive', 'customers.create', 'customers.read', 'customers.update',
  'dashboard.read', 'exercises.manage', 'exercises.read', 'memberships.create', 'memberships.read',
  'memberships.update', 'payments.create', 'payments.read', 'plans.manage', 'plans.read', 'reports.read',
  'routines.assign', 'routines.manage', 'routines.read', 'settings.manage', 'trainers.manage', 'trainers.read',
  'training.log', 'training.read', 'users.manage', 'users.read',
];

function perfil(roles: readonly string[], permissions: readonly string[], id = 'yo'): PerfilOperativo {
  return {
    appUserId: id,
    tenantId: 'gimnasio-a',
    fullName: 'Prueba',
    email: 'prueba@ejemplo.test',
    tenantSlug: 'gimnasio-a',
    tenantName: 'Gimnasio A',
    customerId: null,
    roles,
    permissions,
  };
}

const ADMIN = perfil(['admin'], [...PERMISOS_DE_GERENCIA, 'roles.manage']);
const GERENCIA = perfil(['manager'], PERMISOS_DE_GERENCIA);
const RECEPCION = perfil(['receptionist'], ['attendance.create', 'attendance.read', 'customers.read', 'dashboard.read']);
const PLATAFORMA = perfil(['super_admin'], ['audit.read', 'tenants.manage', 'users.manage', 'users.read']);

describe('V4 · jerarquía de roles del gimnasio', () => {
  it('ordena los niveles: administración > gerencia > recepción > entrenador > socio', () => {
    assert.equal(nivelDeRoles(['admin']), 40);
    assert.equal(nivelDeRoles(['manager', 'customer']), 30);
    assert.equal(nivelDeRoles(['receptionist']), 20);
    assert.equal(nivelDeRoles(['trainer', 'customer']), 10);
    assert.equal(nivelDeRoles(['customer']), 0);
    // La plataforma no es un rol de gimnasio y un código desconocido no suma.
    assert.equal(nivelDeRoles(['super_admin']), 0);
    assert.equal(nivelDeRoles(['inventado']), 0);
  });

  it('administración otorga todos los roles de «Personal y roles», incluido otro administrador', () => {
    assert.deepEqual(ROLES_OTORGABLES.filter((rol) => puedeOtorgarRol(ADMIN, rol)), ['admin', 'manager', 'receptionist']);
  });

  it('gerencia solo otorga por DEBAJO de su nivel: ni gerentes ni administradores', () => {
    assert.deepEqual(ROLES_OTORGABLES.filter((rol) => puedeOtorgarRol(GERENCIA, rol)), ['receptionist']);
  });

  it('sin users.manage no se otorga nada', () => {
    assert.deepEqual(ROLES_OTORGABLES.filter((rol) => puedeOtorgarRol(RECEPCION, rol)), []);
  });

  it('nadie administra su propia cuenta ni la de alguien de nivel superior', () => {
    assert.equal(puedeAdministrarCuenta(ADMIN, { id: 'yo', roles: ['admin'] }), false);
    assert.equal(puedeAdministrarCuenta(ADMIN, { id: 'otro', roles: ['admin'] }), true);
    assert.equal(puedeAdministrarCuenta(GERENCIA, { id: 'otro', roles: ['admin'] }), false);
    assert.equal(puedeAdministrarCuenta(GERENCIA, { id: 'otro', roles: ['manager'] }), false);
    assert.equal(puedeAdministrarCuenta(GERENCIA, { id: 'otro', roles: ['receptionist'] }), true);
    assert.equal(puedeAdministrarCuenta(RECEPCION, { id: 'otro', roles: ['customer'] }), false);
  });

  it('el espacio de trabajo sale de los permisos: administración, gerencia y plataforma', () => {
    assert.equal(espacioDeTrabajo(ADMIN), 'administracion');
    assert.equal(espacioDeTrabajo(GERENCIA), 'gimnasio');
    assert.equal(espacioDeTrabajo(RECEPCION), 'gimnasio');
    assert.equal(espacioDeTrabajo(PLATAFORMA), 'plataforma');
    assert.equal(rolPrincipal(perfil(['manager', 'admin'], [])), 'Administración');
  });

  it('describe los cambios de rol y traduce los rechazos de la base', () => {
    const base = { id: '1', entity: 'user_roles', entityId: 'x', occurredAt: '2026-09-14T12:00:00Z', actorName: 'Ana', targetName: 'Luis' };
    assert.equal(describirEvento({ ...base, action: 'role.granted', metadata: { role: 'manager' } }), 'Otorgó Gerencia a Luis');
    assert.equal(describirEvento({ ...base, action: 'role.revoked', metadata: { role: 'admin' } }), 'Quitó Administración a Luis');
    assert.equal(describirEvento({ ...base, action: 'account.status_changed', metadata: { to: 'suspended' } }), 'Suspendió la cuenta de Luis');
    assert.match(mensajeDeErrorDePersonal('P0001 ultimo_administrador'), /último administrador/);
    assert.match(mensajeDeErrorDePersonal('42501 sin_permiso'), /no puede hacer ese cambio/);
  });
});

describe('V4 · rutinas sin el día repetido', () => {
  it('quita la etiqueta del nombre con cualquier separador habitual', () => {
    assert.equal(nombreSinEtiquetaDelDia('Día A · Empuje', 'Día A'), 'Empuje');
    assert.equal(nombreSinEtiquetaDelDia('Día 1 - Cuerpo completo A', 'Día 1'), 'Cuerpo completo A');
    assert.equal(nombreSinEtiquetaDelDia('día b: Pierna', 'Día B'), 'Pierna');
    assert.equal(nombreSinEtiquetaDelDia('Día 1 * Día 1 * Tirón', 'Día 1'), 'Tirón');
    assert.equal(tituloDeRutina({ name: 'Día A · Día A · Empuje', dayLabel: 'Día A' }), 'Día A · Empuje');
  });

  it('no se come otra etiqueta ni deja el nombre vacío', () => {
    assert.equal(nombreSinEtiquetaDelDia('Día 10 · Brazos', 'Día 1'), 'Día 10 · Brazos');
    assert.equal(nombreSinEtiquetaDelDia('Día A', 'Día A'), 'Día A');
    assert.equal(nombreSinEtiquetaDelDia('Empuje', 'Día A'), 'Empuje');
    assert.equal(nombreSinEtiquetaDelDia('Empuje', null), 'Empuje');
  });

  it('el título lleva la etiqueta UNA sola vez, aunque el dato viejo la repita', () => {
    assert.equal(tituloDeRutina({ name: 'Día A · Empuje', dayLabel: 'Día A' }), 'Día A · Empuje');
    assert.equal(tituloDeRutina({ name: 'Empuje', dayLabel: 'Día A' }), 'Día A · Empuje');
    assert.equal(tituloDeRutina({ name: 'Día 1 · Cuerpo completo A', dayLabel: 'Día 1' }), 'Día 1 · Cuerpo completo A');
    assert.equal(tituloDeRutina({ name: 'Rutina suelta', dayLabel: null }), 'Rutina suelta');
    assert.equal(tituloDeRutina({ name: 'Día A', dayLabel: 'Día A' }), 'Día A');
    assert.doesNotMatch(tituloDeRutina({ name: 'Día A · Empuje', dayLabel: 'Día A' }), /Día A · Día A/);
  });

  it('al guardar, el nombre se normaliza sin la etiqueta', () => {
    const resultado = validarRutina({ name: 'Día B · Pierna', dayLabel: 'Día B', position: '2', notes: '', estimatedMinutes: '' });
    assert.equal(resultado.ok, true);
    if (resultado.ok) assert.equal(resultado.datos.name, 'Pierna');
  });
});

describe('V4 · paginación en la base', () => {
  it('lee la página de la URL sin confiar en ella', () => {
    assert.equal(paginaDeLaUrl('3'), 3);
    assert.equal(paginaDeLaUrl(['4', '9']), 4);
    for (const malo of [undefined, '', '0', '-2', 'dos', '1.5', '999999']) assert.equal(paginaDeLaUrl(malo), 1);
  });

  it('calcula el tramo inclusivo para range y acota el tamaño', () => {
    assert.deepEqual(rangoDePagina(1, 25), { desde: 0, hasta: 24 });
    assert.deepEqual(rangoDePagina(3, 25), { desde: 50, hasta: 74 });
    assert.equal(acotarPorPagina(5000), 100);
    assert.equal(acotarPorPagina(0), 25);
    assert.equal(totalDePaginas(0, 25), 1);
    assert.equal(totalDePaginas(51, 25), 3);
  });

  it('dibuja primera, última y vecinas, con huecos', () => {
    assert.deepEqual(paginasVisibles(1, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(paginasVisibles(10, 20), [1, null, 9, 10, 11, null, 20]);
    assert.deepEqual(paginasVisibles(1, 20), [1, 2, 3, 4, null, 20]);
    assert.deepEqual(paginasVisibles(20, 20), [1, null, 17, 18, 19, 20]);
  });

  it('describe el tramo y conserva los filtros en la URL', () => {
    assert.equal(describirTramo(2, 25, 60, 25), '26–50 de 60');
    assert.equal(describirTramo(1, 25, 0, 0), '0 resultados');
    assert.equal(consultaDePagina({ q: 'ana', estado: 'active', pagina: '4', vacio: '' }, 2), '?q=ana&estado=active&pagina=2');
    assert.equal(consultaDePagina({ q: 'ana', pagina: '4' }, 1), '?q=ana');
    assert.equal(consultaDePagina({}, 1), '');
  });

  it('pagina filas ya calculadas (reportes) y vuelve a la última si se pasa', () => {
    const filas = Array.from({ length: 120 }, (_, i) => i);
    assert.deepEqual(paginaDeFilas(filas, 3, 50), { filas: filas.slice(100, 120), pagina: 3 });
    assert.equal(paginaDeFilas(filas, 99, 50).pagina, 3);
  });
});

describe('V4 · navegación agrupada', () => {
  const entradas: { href: string; grupo: GrupoDeNavegacion; insignia?: number }[] = [
    { href: '/g/panel/administracion', grupo: 'inicio' },
    { href: '/g/panel/gimnasio', grupo: 'dia' },
    { href: '/g/panel/asistencia', grupo: 'dia' },
    { href: '/g/panel/comprobantes', grupo: 'dia', insignia: 3 },
    { href: '/g/panel/socios', grupo: 'socios' },
    { href: '/g/panel/rutinas', grupo: 'entrenamiento' },
    { href: '/g/panel/reportes', grupo: 'gestion' },
    { href: '/g/panel/personal', grupo: 'gestion' },
  ];

  it('no pierde ninguna entrada y suma las insignias por grupo', () => {
    const grupos = agruparEntradas(entradas);
    assert.equal(grupos.reduce((suma, g) => suma + g.entradas.length, 0), entradas.length);
    assert.deepEqual(grupos.map((g) => g.grupo), ['inicio', 'dia', 'socios', 'entrenamiento', 'gestion']);
    assert.equal(grupos.find((g) => g.grupo === 'dia')?.insignia, 3);
    assert.ok(entradas.length > MAXIMO_SIN_AGRUPAR, 'con más entradas que el máximo, se agrupa');
  });

  it('marca como activa la entrada más específica', () => {
    assert.equal(entradaActiva('/g/panel/rutinas/asignada/x', entradas)?.href, '/g/panel/rutinas');
    assert.equal(entradaActiva('/g/panel/socios', entradas)?.href, '/g/panel/socios');
    assert.equal(entradaActiva('/g/panel/sociosx', entradas), null);
  });
});

describe('V4 · patrones de asistencia agregados en la base', () => {
  const patrones: PatronDeAsistencia[] = [
    { diaIso: 1, hora: 7, metodo: 'qr', branchId: 'prado', branchName: 'Prado', veces: 40 },
    { diaIso: 1, hora: 18, metodo: 'manual', branchId: 'prado', branchName: 'Prado', veces: 12 },
    { diaIso: 3, hora: 7, metodo: 'qr', branchId: 'mira', branchName: 'Miraflores', veces: 25 },
    { diaIso: 6, hora: 10, metodo: 'manual', branchId: null, branchName: null, veces: 5 },
  ];
  const horas = Array.from({ length: 19 }, (_, i) => i + 5);

  it('suma calor, horas y métodos sin volver a contar filas', () => {
    const resumen = resumirPatrones(patrones, horas);
    assert.equal(resumen.total, 82);
    assert.equal(resumen.horaPico, 7);
    assert.equal(resumen.diaPico, 0);
    assert.equal(resumen.calor[0]?.[horas.indexOf(7)], 40);
    assert.equal(resumen.calor[2]?.[horas.indexOf(7)], 25);
    assert.equal(resumen.porMetodo.get('qr'), 65);
    assert.equal(resumen.porMetodo.get('manual'), 17);
  });

  it('sin entradas no inventa hora ni día pico', () => {
    const resumen = resumirPatrones([], horas);
    assert.equal(resumen.total, 0);
    assert.equal(resumen.horaPico, null);
    assert.equal(resumen.diaPico, null);
  });

  it('el reparto por sede acepta conteos y deja el histórico sin sede al final', () => {
    const reparto = repartoPorSucursal(patrones);
    assert.deepEqual(reparto.map((r) => [r.nombre, r.visitas]), [['Prado', 52], ['Miraflores', 25], ['Sin sucursal registrada', 5]]);
  });
});
