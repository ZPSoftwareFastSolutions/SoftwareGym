/**
 * Pruebas del dominio de clases (V3.3): la regla de acceso por plan, las fechas
 * que genera un horario, los cruces, el estado de una sesión, la ocupación y las
 * conclusiones que lee gerencia.
 *
 * Son las reglas que la pantalla ANTICIPA; la base aplica las mismas por su
 * cuenta y eso se prueba con sesión simulada en
 * `docs/runbooks/pruebas-rls-v3.3-clases-y-sesiones.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  accesoAClase,
  agendaPorDia,
  claseSinAcceso,
  clasesDelPlan,
  conclusionesDeClases,
  cuposLibres,
  diaIsoDe,
  esFecha,
  estadoDeSesion,
  fechasDelHorario,
  horaDeFin,
  mensajeDeErrorDeClases,
  nivelDeOcupacion,
  porcentajeDeOcupacion,
  proximosSieteDias,
  seSolapan,
  validarClase,
  validarHorario,
  validarMotivoDeCancelacion,
  validarRangoDeGeneracion,
  validarSesion,
  type DatosDeConclusionesDeClases,
  type EstadisticaDeClase,
  type ResumenDeClases,
} from '../src/core/domain/operations/classes.ts';

const HOY = '2026-09-12'; // sábado
const PLAN_FIT = '11111111-1111-4111-8111-111111111111';
const PLAN_DANCE = '22222222-2222-4222-8222-222222222222';
const SEDE = '33333333-3333-4333-8333-333333333333';

describe('acceso a una clase según el plan', () => {
  it('«solo planes» admite únicamente a los planes marcados', () => {
    const box = { accessMode: 'planes' as const, planIds: [PLAN_FIT] };
    assert.equal(accesoAClase(box, PLAN_FIT), 'ok');
    assert.equal(accesoAClase(box, PLAN_DANCE), 'plan_no_incluye_clase');
    assert.equal(accesoAClase(box, null), 'sin_membresia_vigente');
  });

  it('«cualquier membresía» exige solo que haya una vigente', () => {
    const fit = { accessMode: 'membresia' as const, planIds: [] };
    assert.equal(accesoAClase(fit, PLAN_DANCE), 'ok');
    assert.equal(accesoAClase(fit, null), 'sin_membresia_vigente');
  });

  it('una clase abierta (evento) no pide membresía', () => {
    assert.equal(accesoAClase({ accessMode: 'abierta', planIds: [] }, null), 'ok');
  });

  it('las clases del plan excluyen archivadas y las de otros planes', () => {
    const clases = [
      { name: 'Box', accessMode: 'planes' as const, planIds: [PLAN_FIT], isActive: true },
      { name: 'Bachata', accessMode: 'planes' as const, planIds: [PLAN_DANCE], isActive: true },
      { name: 'Fit', accessMode: 'membresia' as const, planIds: [], isActive: true },
      { name: 'Vieja', accessMode: 'membresia' as const, planIds: [], isActive: false },
    ];
    assert.deepEqual(clasesDelPlan(clases, PLAN_FIT).map((c) => c.name), ['Box', 'Fit']);
    assert.deepEqual(clasesDelPlan(clases, null).map((c) => c.name), []);
  });

  it('detecta la clase «solo planes» que nadie puede tomar', () => {
    assert.equal(claseSinAcceso({ accessMode: 'planes', planIds: [], isActive: true }), true);
    assert.equal(claseSinAcceso({ accessMode: 'planes', planIds: [PLAN_FIT], isActive: true }), false);
    assert.equal(claseSinAcceso({ accessMode: 'membresia', planIds: [], isActive: true }), false);
    assert.equal(claseSinAcceso({ accessMode: 'planes', planIds: [], isActive: false }), false);
  });
});

describe('tiempo de las sesiones', () => {
  it('calcula la hora de fin y da la vuelta a medianoche', () => {
    assert.equal(horaDeFin('19:00', 90), '20:30');
    assert.equal(horaDeFin('23:30', 60), '00:30');
  });

  it('el día ISO no depende de la zona del servidor', () => {
    assert.equal(diaIsoDe('2026-09-12'), 6);
    assert.equal(diaIsoDe('2026-09-13'), 7);
    assert.equal(diaIsoDe('2026-09-14'), 1);
  });

  it('rechaza fechas imposibles', () => {
    assert.equal(esFecha('2026-02-30'), false);
    assert.equal(esFecha('2026-02-28'), true);
  });

  it('la semana arranca hoy y trae siete días', () => {
    const dias = proximosSieteDias(HOY);
    assert.equal(dias.length, 7);
    assert.equal(dias[0], HOY);
    assert.equal(dias[6], '2026-09-18');
  });

  it('el borde no cuenta como cruce', () => {
    assert.equal(seSolapan({ startTime: '18:00', durationMinutes: 60 }, { startTime: '19:00', durationMinutes: 60 }), false);
    assert.equal(seSolapan({ startTime: '07:00', durationMinutes: 45 }, { startTime: '07:30', durationMinutes: 60 }), true);
    assert.equal(seSolapan({ startTime: '10:00', durationMinutes: 120 }, { startTime: '10:30', durationMinutes: 15 }), true);
  });

  it('estado según la hora local del gimnasio', () => {
    const sesion = { status: 'programada' as const, sessionDate: HOY, startTime: '18:00', durationMinutes: 60 };
    assert.equal(estadoDeSesion(sesion, `${HOY}T17:59`), 'programada');
    assert.equal(estadoDeSesion(sesion, `${HOY}T18:00`), 'en_curso');
    assert.equal(estadoDeSesion(sesion, `${HOY}T19:00`), 'realizada');
    assert.equal(estadoDeSesion({ ...sesion, status: 'cancelada' }, `${HOY}T10:00`), 'cancelada');
  });

  it('una sesión que cruza la medianoche sigue en curso pasadas las 00:00', () => {
    const tarde = { status: 'programada' as const, sessionDate: HOY, startTime: '23:30', durationMinutes: 60 };
    assert.equal(estadoDeSesion(tarde, '2026-09-13T00:15'), 'en_curso');
    assert.equal(estadoDeSesion(tarde, '2026-09-13T00:30'), 'realizada');
  });
});

describe('fechas que genera un horario', () => {
  const lunes = { weekday: 1 as const, startsOn: '2026-09-01', endsOn: null, isActive: true };

  it('los lunes de un rango, sin pasar por el pasado', () => {
    assert.deepEqual(fechasDelHorario(lunes, '2026-09-01', '2026-09-30', HOY), ['2026-09-14', '2026-09-21', '2026-09-28']);
  });

  it('respeta el inicio y el fin del horario', () => {
    assert.deepEqual(fechasDelHorario({ ...lunes, startsOn: '2026-09-20', endsOn: '2026-09-27' }, HOY, '2026-10-31', HOY), ['2026-09-21']);
  });

  it('un horario inactivo o un rango vacío no generan nada', () => {
    assert.deepEqual(fechasDelHorario({ ...lunes, isActive: false }, HOY, '2026-09-30', HOY), []);
    assert.deepEqual(fechasDelHorario(lunes, HOY, '2026-09-13', HOY), []);
  });

  it('incluye hoy si hoy toca', () => {
    assert.deepEqual(fechasDelHorario({ ...lunes, weekday: 6 }, HOY, '2026-09-19', HOY), ['2026-09-12', '2026-09-19']);
  });
});

describe('ocupación', () => {
  it('porcentaje y niveles de lectura', () => {
    assert.equal(porcentajeDeOcupacion(9, 12), 75);
    assert.equal(porcentajeDeOcupacion(5, 0), 0);
    assert.equal(nivelDeOcupacion(0, 12), 'vacia');
    assert.equal(nivelDeOcupacion(3, 12), 'baja');
    assert.equal(nivelDeOcupacion(6, 12), 'media');
    assert.equal(nivelDeOcupacion(10, 12), 'alta');
    assert.equal(nivelDeOcupacion(12, 12), 'llena');
    assert.equal(cuposLibres({ capacity: 10, asistentes: 12 }), 0);
  });

  it('la agenda agrupa por día y ordena por hora', () => {
    const agenda = agendaPorDia(
      [
        { sessionDate: HOY, startTime: '19:00' },
        { sessionDate: HOY, startTime: '07:00' },
        { sessionDate: '2026-09-13', startTime: '10:00' },
      ],
      [HOY, '2026-09-13', '2026-09-14'],
    );
    assert.deepEqual(agenda.map((d) => d.sesiones.map((s) => s.startTime)), [['07:00', '19:00'], ['10:00'], []]);
  });
});

describe('validación', () => {
  const clase = {
    name: '  Box   intermedio ',
    description: '',
    category: 'combate',
    level: 'todos',
    kind: 'regular',
    accessMode: 'planes',
    durationMinutes: '60',
    capacity: '12',
    trainerId: '',
    isPublic: false,
  };

  it('una clase válida normaliza el nombre y deja sin instructor', () => {
    const r = validarClase(clase);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.datos.name, 'Box intermedio');
      assert.equal(r.datos.trainerId, null);
    }
  });

  it('la capacidad es obligatoria', () => {
    const r = validarClase({ ...clase, capacity: '' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errores.capacity);
    assert.equal(validarClase({ ...clase, capacity: '0' }).ok, false);
    assert.equal(validarClase({ ...clase, capacity: '201' }).ok, false);
  });

  it('rechaza categorías y modos inventados', () => {
    assert.equal(validarClase({ ...clase, category: 'crossfit' }).ok, false);
    assert.equal(validarClase({ ...clase, accessMode: 'gratis' }).ok, false);
  });

  it('un horario pide sede, al menos un día válido y hora', () => {
    const base = { branchId: SEDE, trainerId: '', weekdays: ['1', '3', '5'], startTime: '19:00', durationMinutes: '', capacity: '', endsOn: '' };
    const r = validarHorario(base, HOY);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.datos.weekdays, [1, 3, 5]);
      assert.equal(r.datos.capacity, null);
    }
    assert.equal(validarHorario({ ...base, weekdays: [] }, HOY).ok, false);
    assert.equal(validarHorario({ ...base, weekdays: ['1', '9'] }, HOY).ok, false);
    assert.equal(validarHorario({ ...base, startTime: '25:00' }, HOY).ok, false);
    assert.equal(validarHorario({ ...base, endsOn: '2026-09-01' }, HOY).ok, false);
  });

  it('una sesión no se programa en el pasado', () => {
    const base = {
      classId: PLAN_FIT,
      branchId: SEDE,
      trainerId: '',
      sessionDate: '2026-09-19',
      startTime: '11:30',
      durationMinutes: '90',
      capacity: '30',
      title: 'Masterclass',
      notes: '',
    };
    assert.equal(validarSesion(base, HOY).ok, true);
    assert.equal(validarSesion({ ...base, sessionDate: '2026-09-11' }, HOY).ok, false);
    assert.equal(validarSesion({ ...base, sessionDate: HOY }, HOY).ok, true);
  });

  it('el rango de generación empieza hoy y no pasa de 62 días', () => {
    const r = validarRangoDeGeneracion('2026-09-01', '2026-10-10', HOY);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.datos.desde, HOY);
    assert.equal(validarRangoDeGeneracion(HOY, '2026-11-14', HOY).ok, false);
    assert.equal(validarRangoDeGeneracion(HOY, '2026-11-13', HOY).ok, true);
    assert.equal(validarRangoDeGeneracion('2026-09-20', '2026-09-15', HOY).ok, false);
  });

  it('cancelar exige un motivo legible', () => {
    assert.equal(validarMotivoDeCancelacion('  ').ok, false);
    assert.equal(validarMotivoDeCancelacion('Feriado nacional').ok, true);
  });
});

describe('conclusiones para gerencia', () => {
  const resumen: ResumenDeClases = {
    hoy: HOY,
    clases: 4,
    horarios: 8,
    sesionesHoy: 2,
    sesiones7d: 20,
    asistencias30d: 120,
    socios30d: 25,
    canceladas30d: 1,
  };

  function estadistica(parcial: Partial<EstadisticaDeClase> & Pick<EstadisticaDeClase, 'classId' | 'name'>): EstadisticaDeClase {
    return {
      category: 'fit',
      kind: 'regular',
      accessMode: 'planes',
      isActive: true,
      capacity: 12,
      sesiones30d: 8,
      canceladas30d: 0,
      asistencias30d: 40,
      socios30d: 10,
      ocupacion30d: 50,
      maximo30d: 9,
      ...parcial,
    };
  }

  const datos: DatosDeConclusionesDeClases = {
    resumen,
    estadisticas: [
      estadistica({ classId: 'a', name: 'Box', ocupacion30d: 92, asistencias30d: 88 }),
      estadistica({ classId: 'b', name: 'Karate', ocupacion30d: 18, asistencias30d: 17 }),
      estadistica({ classId: 'c', name: 'Evento', kind: 'evento', ocupacion30d: 10, sesiones30d: 3 }),
      estadistica({ classId: 'd', name: 'Nueva', ocupacion30d: 5, sesiones30d: 2 }),
      estadistica({ classId: 'e', name: 'Bachata', canceladas30d: 1, ocupacion30d: 60 }),
    ],
    franjas: [
      { dia: 1, hora: 18, sesiones: 4, asistencias: 44, capacidad: 48 },
      { dia: 2, hora: 7, sesiones: 4, asistencias: 12, capacidad: 48 },
    ],
    clases: [
      { name: 'Box', accessMode: 'planes', planIds: [PLAN_FIT], isActive: true, horarios: 3, kind: 'regular' },
      { name: 'Twerking', accessMode: 'planes', planIds: [], isActive: true, horarios: 1, kind: 'regular' },
      { name: 'Pilates', accessMode: 'membresia', planIds: [], isActive: true, horarios: 0, kind: 'regular' },
    ],
  };

  const conclusiones = conclusionesDeClases(datos);
  const por = (clave: string) => conclusiones.find((c) => c.clave === clave);

  it('avisa de la clase «solo planes» sin planes y de la que no tiene horario', () => {
    assert.match(por('sin-acceso')?.detalle ?? '', /Twerking/);
    assert.equal(por('sin-acceso')?.tono, 'atencion');
    assert.match(por('sin-horario')?.detalle ?? '', /Pilates/);
  });

  it('la más llena sugiere abrir otro horario por encima del 80 %', () => {
    assert.match(por('clase-top')?.titulo ?? '', /Box/);
    assert.match(por('clase-top')?.detalle ?? '', /otro horario/);
    assert.equal(por('clase-top')?.tono, 'bueno');
  });

  it('la ocupación baja ignora eventos y clases con pocas sesiones', () => {
    const detalle = por('ocupacion-baja')?.detalle ?? '';
    assert.match(detalle, /Karate \(18 %\)/);
    assert.doesNotMatch(detalle, /Evento/);
    assert.doesNotMatch(detalle, /Nueva/);
  });

  it('la franja pico es la de más asistentes por sesión', () => {
    assert.match(por('franja-pico')?.titulo ?? '', /lunes a las 18:00/);
    assert.match(por('franja-pico')?.detalle ?? '', /11 asistentes por sesión/);
  });

  it('sin asistencia registrada no inventa lecturas', () => {
    const vacio = conclusionesDeClases({ ...datos, resumen: { ...resumen, asistencias30d: 0 } });
    assert.ok(vacio.some((c) => c.clave === 'sin-datos'));
    assert.ok(!vacio.some((c) => c.clave === 'clase-top'));
  });
});

describe('mensajes de error', () => {
  it('traduce los códigos de la base a frases de mostrador', () => {
    assert.match(mensajeDeErrorDeClases('22023 plan_no_incluye_clase'), /plan/);
    assert.match(mensajeDeErrorDeClases('22023 clase_llena'), /llena/);
    assert.match(mensajeDeErrorDeClases('23P01 entrenador_ocupado'), /otra sesión/);
    assert.match(mensajeDeErrorDeClases('42501 permission denied'), /no puede/);
    assert.match(mensajeDeErrorDeClases('XX000 algo raro'), /Vuelve a intentarlo/);
  });
});
