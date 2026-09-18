/**
 * Pruebas de V4.2 · Lectura del horario semanal de clases en la vitrina.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ClasePublica } from '../src/core/domain/operations/classes.ts';
import { diasDeLaClase, franjasPorDia, horasDeLaClase, tramoDelDia, tramosDelDia } from '../src/core/domain/operations/horario-de-clases.ts';

function clase(id: string, nombre: string, horarios: ClasePublica['horarios']): ClasePublica {
  return {
    id, name: nombre, description: null, category: 'fit', level: 'todos', kind: 'regular',
    accessMode: 'membresia', durationMinutes: 60, planes: [], horarios,
  };
}

const SEDE = 'b1';
const yoga = clase('c1', 'Yoga', [
  { weekday: 5, startTime: '19:00', branchId: SEDE, durationMinutes: 60 },
  { weekday: 1, startTime: '07:00', branchId: SEDE, durationMinutes: 60 },
  { weekday: 1, startTime: '19:00', branchId: SEDE, durationMinutes: 60 },
]);
const ubound = clase('c2', 'Ubound', [{ weekday: 1, startTime: '07:00', branchId: SEDE, durationMinutes: 45 }]);

describe('V4.2 · horario de clases por día', () => {
  it('agrupa por día y ordena por hora y, a igual hora, por nombre', () => {
    const lunes = franjasPorDia([yoga, ubound]).get(1) ?? [];
    assert.deepEqual(lunes.map((f) => `${f.inicio} ${f.clase}`), ['07:00 Ubound', '07:00 Yoga', '19:00 Yoga']);
    assert.equal(lunes[0]?.fin, '07:45');
    assert.deepEqual(franjasPorDia([yoga]).get(3), []);
  });

  it('los tramos del día: mañana antes de las 12, tarde antes de las 18, noche después', () => {
    assert.equal(tramoDelDia('11:59'), 'manana');
    assert.equal(tramoDelDia('12:00'), 'tarde');
    assert.equal(tramoDelDia('18:00'), 'noche');
    const tramos = tramosDelDia(franjasPorDia([yoga, ubound]).get(1) ?? []);
    assert.deepEqual(tramos.map((t) => [t.tramo, t.franjas.length]), [['manana', 2], ['noche', 1]]);
  });

  it('una clase se resume en sus días y sus horas, sin repetir', () => {
    assert.deepEqual(diasDeLaClase(yoga), [1, 5]);
    assert.deepEqual(horasDeLaClase(yoga), ['07:00', '19:00']);
  });
});
