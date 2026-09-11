/**
 * Reglas de V2.x que V3.0 no debe romper al añadir sucursales.
 *
 * - La racha se calcula con FECHAS: la sede de cada entrada no existe para
 *   ella. Prado → Miraflores → Prado son tres días seguidos.
 * - Los reportes siguen escapando el CSV y el catálogo oculta lo no contratado.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRacha } from '../src/core/domain/operations/streak.ts';
import {
  aCsv,
  diasDelRango,
  porcentaje,
  reportePorClave,
  reportesDisponibles,
} from '../src/core/domain/operations/reports.ts';
import { repartoPorSucursal } from '../src/core/domain/operations/branches.ts';

describe('racha con varias sedes', () => {
  // Registros tal como llegan de `v_attendance_log`: fecha + sede.
  const entradas = [
    { attendanceDate: '2026-09-10', branchId: 'mir', branchName: 'Miraflores' },
    { attendanceDate: '2026-09-11', branchId: 'pra', branchName: 'Prado' },
    { attendanceDate: '2026-09-12', branchId: 'mir', branchName: 'Miraflores' },
  ];

  it('Miraflores → Prado → Miraflores mantiene la racha (3 días)', () => {
    const racha = calcularRacha(entradas.map((e) => e.attendanceDate), '2026-09-12');
    assert.equal(racha.actual, 3);
    assert.equal(racha.estado, 'viva');
  });

  it('el histórico sin sede también cuenta para la racha', () => {
    const conHistorico = ['2026-09-09', ...entradas.map((e) => e.attendanceDate)];
    assert.equal(calcularRacha(conHistorico, '2026-09-12').actual, 4);
  });

  it('y el mismo mes se reparte por sede sin alterar el total', () => {
    const reparto = repartoPorSucursal(entradas);
    assert.equal(reparto.reduce((suma, r) => suma + r.visitas, 0), entradas.length);
    assert.deepEqual(reparto.map((r) => r.nombre), ['Miraflores', 'Prado']);
  });
});

describe('catálogo de reportes', () => {
  const permisos = ['reports.read', 'attendance.read'];

  it('la comparativa por sucursal solo existe con multisucursal contratada', () => {
    const conSedes = reportesDisponibles(permisos, { enableMultiBranch: true }).map((r) => r.clave);
    const sinSedes = reportesDisponibles(permisos, { enableMultiBranch: false }).map((r) => r.clave);
    assert.ok(conSedes.includes('asistencia-por-sucursal'));
    assert.ok(!sinSedes.includes('asistencia-por-sucursal'));
    // Los reportes existentes siguen ahí en los dos casos.
    assert.ok(sinSedes.includes('asistencia') && sinSedes.includes('asistencia-por-socio'));
  });

  it('la asistencia admite filtro y columna de sucursal', () => {
    const asistencia = reportePorClave('asistencia');
    assert.ok(asistencia?.filtros.includes('sucursal'));
    assert.ok(asistencia?.columnas.some((c) => c.clave === 'sucursal'));
  });

  it('el CSV cita todo y neutraliza fórmulas (sin cambios en V3.0)', () => {
    const csv = aCsv([{ clave: 'sucursal', titulo: 'Sucursal' }], [{ sucursal: '=HYPERLINK("x")' }, { sucursal: 'Prado, centro' }]);
    assert.ok(csv.charCodeAt(0) === 0xfeff);
    assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
    assert.ok(csv.includes('"Prado, centro"'));
  });

  it('porcentaje y días de rango no dividen entre cero', () => {
    assert.equal(porcentaje(5, 0), 0);
    assert.equal(porcentaje(1, 3), 33.3);
    assert.equal(diasDelRango('2026-09-01', '2026-09-30', '2026-09-30'), 30);
    assert.equal(diasDelRango(undefined, undefined, '2026-09-11'), 1);
    assert.equal(diasDelRango('2026-09-12', '2026-09-01', '2026-09-12'), 1);
  });
});
