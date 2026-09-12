/**
 * Pruebas del dominio de entrenamiento (V3.2): validación de rutinas y, sobre
 * todo, la LECTURA de los datos —qué día es día de qué y qué conclusiones se
 * sacan—, que es lo que ve el gerente.
 *
 * El aislamiento y los permisos se prueban con sesión simulada en
 * `docs/runbooks/pruebas-rls-v3.2-rutinas-y-progreso.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  conclusionesDeEntrenamiento,
  describirSerie,
  etiquetasPorDia,
  FAMILIA_POR_GRUPO,
  mensajeDeErrorDeEntrenamiento,
  rankingDeGrupos,
  validarEjercicioDeRutina,
  validarMarca,
  validarPrograma,
  validarRutina,
  vecesPorDia,
  type ConteoPorDia,
  type DatosDeConclusiones,
  type EstadisticaDeEjercicio,
  type ResumenDeEntrenamiento,
} from '../src/core/domain/operations/training.ts';
import { GRUPOS_MUSCULARES } from '../src/core/domain/operations/exercises.ts';

const UUID = '11fa3b38-18b4-49f8-973f-cca5da4556ba';

function conteo(dia: number, grupo: string, veces: number): ConteoPorDia {
  return { dia: dia as ConteoPorDia['dia'], grupo, veces, socios: 3, fechas: 4 };
}

function ejercicio(parcial: Partial<EstadisticaDeEjercicio>): EstadisticaDeEjercicio {
  return {
    exerciseId: parcial.exerciseId ?? 'e1',
    name: parcial.name ?? 'Ejercicio',
    muscleGroup: parcial.muscleGroup ?? 'pecho',
    isActive: parcial.isActive ?? true,
    veces30d: parcial.veces30d ?? 0,
    veces90d: parcial.veces90d ?? 0,
    socios30d: parcial.socios30d ?? 0,
    socios90d: parcial.socios90d ?? 0,
    ultimaVez: parcial.ultimaVez ?? null,
    enRutinasVigentes: parcial.enRutinasVigentes ?? 0,
    pesoPromedio30d: parcial.pesoPromedio30d ?? null,
  };
}

const resumen: ResumenDeEntrenamiento = {
  hoy: '2026-09-12',
  programas: 1,
  rutinas: 3,
  asignaciones: 15,
  sociosConRutina: 5,
  sociosActivos: 10,
  completados7d: 30,
  completados30d: 189,
  sociosEntrenando30d: 5,
  diasConRegistro30d: 13,
};

describe('validación de plantillas', () => {
  it('normaliza el nombre del programa y admite semanas vacías', () => {
    const r = validarPrograma({ name: '  Full   Body 3 días ', description: '', goal: 'hipertrofia', level: 'todos', weeks: '' });
    assert.ok(r.ok);
    assert.equal(r.datos.name, 'Full Body 3 días');
    assert.equal(r.datos.weeks, null);
  });

  it('rechaza objetivo, nivel y semanas fuera de catálogo', () => {
    const r = validarPrograma({ name: 'Plan', description: '', goal: 'volumen', level: 'experto', weeks: '80' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(Object.keys(r.errores).sort(), ['goal', 'level', 'weeks']);
  });

  it('la rutina admite día y posición, con tope de 30', () => {
    const r = validarRutina({ name: 'Día A', dayLabel: ' Día A ', position: '2', notes: '', estimatedMinutes: '60' });
    assert.ok(r.ok);
    assert.deepEqual([r.datos.dayLabel, r.datos.position, r.datos.estimatedMinutes], ['Día A', 2, 60]);
    assert.equal(validarRutina({ name: 'Día A', dayLabel: '', position: '99', notes: '', estimatedMinutes: '' }).ok, false);
  });
});

describe('validarEjercicioDeRutina', () => {
  it('acepta las formas de repetición que se usan en sala', () => {
    for (const reps of ['10', '8-12', 'al fallo', 'máximo', '45 seg', '3 min']) {
      const r = validarEjercicioDeRutina({ exerciseId: UUID, position: '1', sets: '4', reps, weightKg: '', restSeconds: '', notes: '' });
      assert.ok(r.ok, `debería aceptar «${reps}»`);
    }
  });

  it('rechaza repeticiones inventadas, series fuera de rango y pesos imposibles', () => {
    const base = { exerciseId: UUID, position: '1', sets: '4', reps: '10', weightKg: '', restSeconds: '', notes: '' };
    assert.equal(validarEjercicioDeRutina({ ...base, reps: 'muchas' }).ok, false);
    assert.equal(validarEjercicioDeRutina({ ...base, sets: '20' }).ok, false);
    assert.equal(validarEjercicioDeRutina({ ...base, weightKg: '900' }).ok, false);
    assert.equal(validarEjercicioDeRutina({ ...base, restSeconds: '900' }).ok, false);
    assert.equal(validarEjercicioDeRutina({ ...base, exerciseId: 'no-es-uuid' }).ok, false);
  });

  it('admite la coma decimal del teclado', () => {
    const r = validarEjercicioDeRutina({ exerciseId: UUID, position: '1', sets: '3', reps: '10', weightKg: '42,5', restSeconds: '90', notes: '' });
    assert.ok(r.ok);
    assert.equal(r.datos.weightKg, 42.5);
  });

  it('la marca guarda series y peso solo si se anotan', () => {
    assert.deepEqual(validarMarca('', ''), { ok: true, datos: { sets: null, weightKg: null } });
    assert.deepEqual(validarMarca('4', '60'), { ok: true, datos: { sets: 4, weightKg: 60 } });
    assert.equal(validarMarca('40', '').ok, false);
  });

  it('describe la serie como se lee en la ficha', () => {
    assert.equal(describirSerie({ sets: 4, reps: '8-12', weightKg: 40, restSeconds: 90 }), '4 × 8-12 · 40 kg · 90 s de descanso');
    assert.equal(describirSerie({ sets: 3, reps: 'al fallo', weightKg: null, restSeconds: null }), '3 × al fallo');
  });
});

describe('etiquetasPorDia', () => {
  it('un grupo que se lleva el día le da nombre', () => {
    const dias = etiquetasPorDia([conteo(1, 'pecho', 25), conteo(1, 'triceps', 12), conteo(1, 'hombros', 8)]);
    const lunes = dias.find((d) => d.dia === 1);
    assert.equal(lunes?.etiqueta, 'Día de pecho');
    assert.equal(lunes?.confianza, 'alta');
    assert.equal(lunes?.porcentaje, 56);
  });

  it('sin un grupo dominante, manda la familia: día de pierna', () => {
    const dias = etiquetasPorDia([conteo(3, 'cuadriceps', 10), conteo(3, 'gluteos', 10), conteo(3, 'isquiotibiales', 9)]);
    assert.equal(dias.find((d) => d.dia === 3)?.etiqueta, 'Día de pierna');
  });

  it('un día variado es mixto, no «día de bíceps» por un registro de más', () => {
    const dias = etiquetasPorDia([conteo(4, 'biceps', 6), conteo(4, 'cuadriceps', 5), conteo(4, 'core', 5), conteo(4, 'cardio', 5)]);
    assert.equal(dias.find((d) => d.dia === 4)?.etiqueta, 'Día mixto');
  });

  it('pocos registros no inventan patrón, y un día vacío lo dice', () => {
    assert.equal(etiquetasPorDia([conteo(2, 'pecho', 3)]).find((d) => d.dia === 2)?.etiqueta, 'Pocos registros');
    assert.equal(etiquetasPorDia([]).find((d) => d.dia === 7)?.etiqueta, 'Sin registros');
  });

  it('devuelve siempre los siete días, en orden', () => {
    assert.deepEqual(etiquetasPorDia([]).map((d) => d.dia), [1, 2, 3, 4, 5, 6, 7]);
  });

  it('cada grupo muscular del catálogo tiene familia', () => {
    for (const grupo of GRUPOS_MUSCULARES) {
      assert.ok(FAMILIA_POR_GRUPO[grupo.code], `falta la familia de ${grupo.code}`);
    }
  });
});

describe('agregados', () => {
  it('ordena los grupos de más a menos trabajados', () => {
    const r = rankingDeGrupos([conteo(1, 'pecho', 10), conteo(3, 'gluteos', 24), conteo(5, 'pecho', 5)]);
    assert.deepEqual(r, [{ grupo: 'gluteos', veces: 24 }, { grupo: 'pecho', veces: 15 }]);
  });

  it('suma por día de la semana incluyendo los vacíos', () => {
    const r = vecesPorDia([conteo(1, 'pecho', 10), conteo(1, 'triceps', 5)]);
    assert.equal(r.length, 7);
    assert.equal(r[0]?.veces, 15);
    assert.equal(r[6]?.veces, 0);
  });
});

describe('conclusionesDeEntrenamiento', () => {
  const datos: DatosDeConclusiones = {
    resumen,
    ejercicios: [
      ejercicio({ exerciseId: 'a', name: 'Plancha', muscleGroup: 'core', veces30d: 22, socios30d: 5 }),
      ejercicio({ exerciseId: 'b', name: 'Press de banca', muscleGroup: 'pecho', veces30d: 17, socios30d: 5, pesoPromedio30d: 41.3 }),
      ejercicio({ exerciseId: 'c', name: 'Curl de bíceps', muscleGroup: 'biceps', veces30d: 4, socios30d: 2 }),
      ejercicio({ exerciseId: 'd', name: 'Burpees', muscleGroup: 'cuerpo_completo', veces30d: 0 }),
    ],
    porDia: [conteo(1, 'pecho', 25), conteo(1, 'triceps', 25), conteo(3, 'gluteos', 24), conteo(5, 'espalda', 48)],
    sinRegistroReciente: 2,
  };

  it('sin registros, dice qué hacer en vez de mostrar ceros', () => {
    const r = conclusionesDeEntrenamiento({ ...datos, resumen: { ...resumen, completados30d: 0 } });
    assert.equal(r.length, 1);
    assert.equal(r[0]?.clave, 'sin-datos');
    assert.equal(r[0]?.tono, 'atencion');
  });

  it('nombra el ejercicio más hecho con su número', () => {
    const r = conclusionesDeEntrenamiento(datos);
    const top = r.find((c) => c.clave === 'ejercicio-top');
    assert.match(top?.titulo ?? '', /Plancha/);
    assert.match(top?.detalle ?? '', /22 registros de 5 socios en 30 días/);
  });

  it('avisa de los ejercicios del catálogo que nadie hace', () => {
    const sinUso = conclusionesDeEntrenamiento(datos).find((c) => c.clave === 'catalogo-sin-uso');
    assert.match(sinUso?.detalle ?? '', /Burpees/);
    assert.equal(sinUso?.tono, 'atencion');
  });

  it('resume qué se entrena cada día', () => {
    const dias = conclusionesDeEntrenamiento(datos).find((c) => c.clave === 'dias');
    assert.match(dias?.detalle ?? '', /Lunes: día de/);
    assert.match(dias?.detalle ?? '', /Viernes: día de espalda/);
  });

  it('marca la cobertura baja como algo que atender', () => {
    const cobertura = conclusionesDeEntrenamiento(datos).find((c) => c.clave === 'cobertura');
    assert.equal(cobertura?.tono, 'atencion');
    assert.match(cobertura?.titulo ?? '', /5 de 10 socios/);

    const buena = conclusionesDeEntrenamiento({ ...datos, resumen: { ...resumen, sociosConRutina: 8 } }).find((c) => c.clave === 'cobertura');
    assert.equal(buena?.tono, 'bueno');
  });

  it('señala a quienes tienen rutina y no registran nada', () => {
    const r = conclusionesDeEntrenamiento(datos).find((c) => c.clave === 'sin-registro');
    assert.match(r?.titulo ?? '', /2 socios con rutina/);
    assert.equal(conclusionesDeEntrenamiento({ ...datos, sinRegistroReciente: 0 }).find((c) => c.clave === 'sin-registro'), undefined);
  });
});

describe('mensajes de error', () => {
  it('traduce los códigos de la base', () => {
    assert.match(mensajeDeErrorDeEntrenamiento('22023 rutina_sin_ejercicios'), /Agrega ejercicios/);
    assert.match(mensajeDeErrorDeEntrenamiento('fecha_futura'), /todavía no pasó/);
    assert.match(mensajeDeErrorDeEntrenamiento('42501'), /no puede/);
  });
});
