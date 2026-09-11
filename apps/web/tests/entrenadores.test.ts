/**
 * Pruebas del dominio de entrenadores (V3.1).
 *
 * Lo que decide la pantalla. Lo que protege los datos (aislamiento, regla del
 * plan en la base, cuentas) se prueba con sesión simulada en
 * `docs/runbooks/pruebas-rls-v3.1-entrenadores-ejercicios.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ausenciasPendientes,
  describirAusencia,
  disponibilidadEn,
  evaluarAsignacion,
  limitesDeAusencia,
  mensajeDeErrorDeEntrenadores,
  normalizarEspecialidades,
  resumenDeReglaDePlan,
  seSolapan,
  TURNOS_POR_DEFECTO,
  validarAusencia,
  validarEntrenador,
  validarFoco,
  validarReglaDePlan,
  type Ausencia,
  type FormularioDeAusencia,
} from '../src/core/domain/operations/trainers.ts';

const vacio: FormularioDeAusencia = { kind: '', shiftCode: '', startDate: '', endDate: '', startTime: '', endTime: '', reason: '' };

function ausencia(parcial: Partial<Ausencia>): Ausencia {
  return {
    id: 'a',
    trainerId: 't',
    kind: 'dia',
    shiftCode: null,
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    startTime: null,
    endTime: null,
    reason: null,
    ...parcial,
  };
}

describe('validarEntrenador', () => {
  it('normaliza correo y especialidades sin repetir mayúsculas', () => {
    const r = validarEntrenador({ firstName: ' Ana ', lastName: 'López', email: 'ANA@Gym.BO', phone: '', bio: '', specialties: 'Fuerza, fuerza,\nBaile,  ' });
    assert.ok(r.ok);
    assert.equal(r.datos.email, 'ana@gym.bo');
    assert.deepEqual(r.datos.specialties, ['Fuerza', 'Baile']);
  });

  it('exige nombre y apellido y rechaza correos o teléfonos inválidos', () => {
    const r = validarEntrenador({ firstName: '', lastName: '', email: 'no-es-correo', phone: 'abc', bio: '', specialties: '' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(Object.keys(r.errores).sort(), ['email', 'firstName', 'lastName', 'phone']);
  });

  it('limita a 8 especialidades', () => {
    assert.equal(normalizarEspecialidades('a1,a2,a3,a4,a5,a6,a7,a8,a9').length, 9);
    const r = validarEntrenador({ firstName: 'A', lastName: 'B', email: '', phone: '', bio: '', specialties: 'aa,bb,cc,dd,ee,ff,gg,hh,ii' });
    assert.equal(r.ok, false);
  });
});

describe('validarAusencia', () => {
  it('turno: toma las horas del turno del gimnasio', () => {
    const r = validarAusencia({ ...vacio, kind: 'turno', shiftCode: 'manana', startDate: '2026-09-15' }, TURNOS_POR_DEFECTO);
    assert.ok(r.ok);
    assert.deepEqual([r.datos.startTime, r.datos.endTime, r.datos.endDate], ['06:00', '12:00', '2026-09-15']);
  });

  it('horas: el fin tiene que ser posterior al inicio', () => {
    const r = validarAusencia({ ...vacio, kind: 'horas', startDate: '2026-09-15', startTime: '10:00', endTime: '09:00' }, TURNOS_POR_DEFECTO);
    assert.equal(r.ok, false);
  });

  it('periodo: de 1 a 366 días; un solo día debe ser «Un día»', () => {
    assert.equal(validarAusencia({ ...vacio, kind: 'periodo', startDate: '2026-09-15', endDate: '2026-09-15' }, []).ok, false);
    assert.equal(validarAusencia({ ...vacio, kind: 'periodo', startDate: '2026-09-15', endDate: '2027-09-20' }, []).ok, false);
    const r = validarAusencia({ ...vacio, kind: 'periodo', startDate: '2026-09-15', endDate: '2026-09-29' }, []);
    assert.ok(r.ok);
    assert.equal(r.datos.startTime, null);
  });

  it('rechaza fechas imposibles y tipos desconocidos', () => {
    assert.equal(validarAusencia({ ...vacio, kind: 'dia', startDate: '2026-02-31' }, []).ok, false);
    assert.equal(validarAusencia({ ...vacio, kind: 'vacaciones', startDate: '2026-09-15' }, []).ok, false);
  });
});

describe('ausencias en el tiempo del gimnasio', () => {
  it('un día completo termina a medianoche del día siguiente', () => {
    assert.deepEqual(limitesDeAusencia(ausencia({ endDate: '2026-09-30' })), { inicio: '2026-09-15T00:00', fin: '2026-10-01T00:00' });
  });

  it('solapes: horas contiguas no se pisan; un día pisa sus horas', () => {
    const manana = ausencia({ kind: 'horas', startTime: '08:00', endTime: '10:00' });
    const siguiente = ausencia({ kind: 'horas', startTime: '10:00', endTime: '12:00' });
    assert.equal(seSolapan(manana, siguiente), false);
    assert.equal(seSolapan(manana, ausencia({})), true);
    assert.equal(seSolapan(ausencia({ startDate: '2026-09-16', endDate: '2026-09-16' }), ausencia({})), false);
  });

  it('disponibilidad: ausente ahora, ausencia más tarde o disponible', () => {
    const tarde = ausencia({ kind: 'turno', shiftCode: 'tarde', startTime: '12:00', endTime: '18:00' });
    assert.equal(disponibilidadEn([tarde], '2026-09-15', '13:30').estado, 'ausente');
    assert.equal(disponibilidadEn([tarde], '2026-09-15', '09:00').estado, 'ausencia_hoy');
    assert.equal(disponibilidadEn([tarde], '2026-09-16', '13:30').estado, 'disponible');
  });

  it('pendientes: ordenadas y sin las ya terminadas', () => {
    const pasada = ausencia({ id: 'p', startDate: '2026-09-01', endDate: '2026-09-01' });
    const lejana = ausencia({ id: 'l', startDate: '2026-10-01', endDate: '2026-10-01' });
    const cercana = ausencia({ id: 'c', startDate: '2026-09-20', endDate: '2026-09-20' });
    assert.deepEqual(ausenciasPendientes([lejana, pasada, cercana], '2026-09-15', '08:00').map((a) => a.id), ['c', 'l']);
  });

  it('describe cada tipo en una frase corta', () => {
    assert.equal(describirAusencia(ausencia({ kind: 'turno', shiftCode: 'noche', startTime: '18:00', endTime: '22:00' }), TURNOS_POR_DEFECTO), 'Noche (18:00–22:00)');
    assert.equal(describirAusencia(ausencia({ kind: 'periodo', endDate: '2026-09-26' }), []), '12 días');
  });
});

describe('evaluarAsignacion · regla del plan', () => {
  const base = { entrenadorActivo: true, yaAsignado: false, tienePrincipal: false, secundariosVigentes: 0 } as const;

  it('sin membresía vigente no se asigna', () => {
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'principal', plan: null }), { ok: false, motivo: 'sin_membresia_vigente' });
  });

  it('principal solo si el plan lo incluye', () => {
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'principal', plan: { includesTrainer: false, maxSecondaryTrainers: 2 } }), { ok: false, motivo: 'plan_sin_entrenador' });
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'principal', plan: { includesTrainer: true, maxSecondaryTrainers: 0 } }), { ok: true });
  });

  it('secundarios hasta el tope del plan', () => {
    const plan = { includesTrainer: true, maxSecondaryTrainers: 1 };
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'secundario', plan }), { ok: true });
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'secundario', plan, secundariosVigentes: 1 }), { ok: false, motivo: 'plan_sin_mas_secundarios' });
  });

  it('un principal a la vez y el mismo entrenador una sola vez', () => {
    const plan = { includesTrainer: true, maxSecondaryTrainers: 3 };
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'principal', plan, tienePrincipal: true }), { ok: false, motivo: 'ya_tiene_principal' });
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'secundario', plan, yaAsignado: true }), { ok: false, motivo: 'entrenador_ya_asignado' });
    assert.deepEqual(evaluarAsignacion({ ...base, kind: 'secundario', plan, entrenadorActivo: false }), { ok: false, motivo: 'entrenador_inactivo' });
  });

  it('regla del plan: validación y resumen', () => {
    assert.equal(validarReglaDePlan('si', '6').ok, false);
    const r = validarReglaDePlan('si', '2');
    assert.ok(r.ok);
    assert.equal(resumenDeReglaDePlan(r.datos), 'Entrenador principal · hasta 2 secundarios');
    assert.equal(resumenDeReglaDePlan({ includesTrainer: false, maxSecondaryTrainers: 0 }), 'Sin entrenador principal · sin secundarios');
  });

  it('foco opcional de 2 a 60 caracteres', () => {
    assert.deepEqual(validarFoco('  '), { ok: true, foco: null });
    assert.equal(validarFoco('x').ok, false);
    assert.deepEqual(validarFoco(' Baile   latino '), { ok: true, foco: 'Baile latino' });
  });

  it('los errores de la base se traducen', () => {
    assert.match(mensajeDeErrorDeEntrenadores('P0001 plan_sin_mas_secundarios'), /secundarios/);
    assert.match(mensajeDeErrorDeEntrenadores('cuenta_no_encontrada'), /registre/);
    assert.match(mensajeDeErrorDeEntrenadores('42501'), /no puede/);
  });
});
