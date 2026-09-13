/**
 * Pruebas del dominio de reservas (V3.4): ventana de reserva, cancelación
 * tardía, cupo compartido con lista de espera, bloqueo por faltas, validación de
 * las reglas del gimnasio y la lectura para gerencia. También los avisos
 * personales en la bandeja del socio.
 *
 * Las mismas reglas las aplica la base; se prueban con sesión simulada en
 * `docs/runbooks/pruebas-rls-v3.4-reservas.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AJUSTES_RECOMENDADOS,
  bloqueoDeReservas,
  cancelacionSeriaTardia,
  conclusionesDeReservas,
  cupoReservable,
  describirAjustes,
  mensajeDeErrorDeReservas,
  resultadoDeReservar,
  sesionIniciada,
  tasaDeAsistencia,
  textoDePosicion,
  validarAjustesDeReserva,
  ventanaDeReserva,
  type EstadisticaDeReservas,
} from '../src/core/domain/operations/reservations.ts';
import { construirNotificaciones, PREFIJO_DE_AVISO_PERSONAL } from '../src/core/domain/operations/notifications.ts';

const SESION = { sessionDate: '2026-09-14', startTime: '18:00' };

describe('ventana de reserva', () => {
  it('se abre 7 días antes y se cierra al empezar', () => {
    const v = ventanaDeReserva(SESION, AJUSTES_RECOMENDADOS, '2026-09-12T22:00');
    assert.equal(v.estado, 'abierta');
    assert.equal(v.abre, '2026-09-07T18:00');
    assert.equal(v.cierra, '2026-09-14T18:00');
    assert.equal(v.cancelacionLibreHasta, '2026-09-14T16:00');
  });

  it('antes de abrir y después de cerrar', () => {
    assert.equal(ventanaDeReserva(SESION, AJUSTES_RECOMENDADOS, '2026-09-07T17:59').estado, 'no_abierta');
    assert.equal(ventanaDeReserva(SESION, AJUSTES_RECOMENDADOS, '2026-09-14T18:00').estado, 'cerrada');
    const cierraAntes = { ...AJUSTES_RECOMENDADOS, closeMinutesBefore: 60 };
    assert.equal(ventanaDeReserva(SESION, cierraAntes, '2026-09-14T17:30').estado, 'cerrada');
  });

  it('cruza el cambio de mes sin depender de la zona del servidor', () => {
    const v = ventanaDeReserva({ sessionDate: '2026-10-02', startTime: '07:00' }, AJUSTES_RECOMENDADOS, '2026-09-30T08:00');
    assert.equal(v.abre, '2026-09-25T07:00');
    assert.equal(v.estado, 'abierta');
  });
});

describe('cancelación', () => {
  it('es tardía dentro de las 2 horas previas y solo con lugar ocupado', () => {
    assert.equal(cancelacionSeriaTardia(SESION, 'reservada', AJUSTES_RECOMENDADOS, '2026-09-14T15:59'), false);
    assert.equal(cancelacionSeriaTardia(SESION, 'reservada', AJUSTES_RECOMENDADOS, '2026-09-14T16:01'), true);
    assert.equal(cancelacionSeriaTardia(SESION, 'en_espera', AJUSTES_RECOMENDADOS, '2026-09-14T17:30'), false);
  });

  it('una sesión iniciada ya no se cancela', () => {
    assert.equal(sesionIniciada(SESION, '2026-09-14T17:59'), false);
    assert.equal(sesionIniciada(SESION, '2026-09-14T18:00'), true);
  });
});

describe('cupo compartido y lista de espera', () => {
  it('los lugares sin reserva no se pueden reservar', () => {
    assert.equal(cupoReservable(12, 2), 10);
    assert.equal(cupoReservable(4, -1), 4);
  });

  it('reservada mientras haya lugar; después espera; sin espera, llena', () => {
    const base = { capacity: 10, walkinSpots: 2, ocupados: 7, enEspera: 0 };
    assert.equal(resultadoDeReservar(base, AJUSTES_RECOMENDADOS), 'reservada');
    assert.equal(resultadoDeReservar({ ...base, ocupados: 8 }, AJUSTES_RECOMENDADOS), 'en_espera');
    assert.equal(resultadoDeReservar({ ...base, ocupados: 8, enEspera: 10 }, AJUSTES_RECOMENDADOS), 'llena');
    assert.equal(resultadoDeReservar({ ...base, ocupados: 8 }, { ...AJUSTES_RECOMENDADOS, waitlistEnabled: false }), 'llena');
  });

  it('texto de la posición', () => {
    assert.match(textoDePosicion(1), /siguiente/);
    assert.match(textoDePosicion(3), /Puesto 3/);
  });
});

describe('bloqueo por faltas', () => {
  const HOY = '2026-09-12';

  it('tres faltas en 30 días bloquean 7 días desde la última', () => {
    const faltas = [
      { sessionDate: '2026-09-04', status: 'no_asistio' as const, lateCancel: false },
      { sessionDate: '2026-09-07', status: 'no_asistio' as const, lateCancel: false },
      { sessionDate: '2026-09-11', status: 'no_asistio' as const, lateCancel: false },
    ];
    assert.equal(bloqueoDeReservas(faltas, AJUSTES_RECOMENDADOS, HOY), '2026-09-18');
  });

  it('la cancelación tardía cuenta según la regla; la justificada nunca', () => {
    const faltas = [
      { sessionDate: '2026-09-04', status: 'no_asistio' as const, lateCancel: false },
      { sessionDate: '2026-09-07', status: 'cancelada' as const, lateCancel: true },
      { sessionDate: '2026-09-11', status: 'justificada' as const, lateCancel: false },
    ];
    assert.equal(bloqueoDeReservas(faltas, AJUSTES_RECOMENDADOS, HOY), null);
    const conTercera = [...faltas, { sessionDate: '2026-09-10', status: 'no_asistio' as const, lateCancel: false }];
    assert.equal(bloqueoDeReservas(conTercera, AJUSTES_RECOMENDADOS, HOY), '2026-09-17');
    assert.equal(bloqueoDeReservas(conTercera, { ...AJUSTES_RECOMENDADOS, lateCancelCounts: false }, HOY), null);
  });

  it('faltas viejas o un bloqueo ya cumplido no bloquean', () => {
    const viejas = [
      { sessionDate: '2026-08-01', status: 'no_asistio' as const, lateCancel: false },
      { sessionDate: '2026-08-02', status: 'no_asistio' as const, lateCancel: false },
      { sessionDate: '2026-08-03', status: 'no_asistio' as const, lateCancel: false },
    ];
    assert.equal(bloqueoDeReservas(viejas, AJUSTES_RECOMENDADOS, HOY), null);
    const cumplido = viejas.map((f, i) => ({ ...f, sessionDate: `2026-08-2${i + 1}` }));
    assert.equal(bloqueoDeReservas(cumplido, AJUSTES_RECOMENDADOS, HOY), null);
    assert.equal(bloqueoDeReservas(cumplido, { ...AJUSTES_RECOMENDADOS, blockDays: 0 }, HOY), null);
  });
});

describe('reglas del gimnasio', () => {
  const formulario = {
    openDaysBefore: '7',
    closeMinutesBefore: '0',
    cancelMinutesBefore: '120',
    maxActive: '3',
    waitlistEnabled: true,
    waitlistMax: '10',
    noShowLimit: '3',
    noShowWindowDays: '30',
    blockDays: '7',
    lateCancelCounts: true,
  };

  it('las recomendadas son válidas', () => {
    const r = validarAjustesDeReserva(formulario);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.datos, AJUSTES_RECOMENDADOS);
  });

  it('rechaza lo que la base rechazaría', () => {
    assert.equal(validarAjustesDeReserva({ ...formulario, openDaysBefore: '0' }).ok, false);
    assert.equal(validarAjustesDeReserva({ ...formulario, maxActive: '21' }).ok, false);
    assert.equal(validarAjustesDeReserva({ ...formulario, noShowWindowDays: '3' }).ok, false);
    assert.equal(validarAjustesDeReserva({ ...formulario, blockDays: 'siete' }).ok, false);
  });

  it('la cancelación libre no puede terminar después de que se cierran las reservas', () => {
    const r = validarAjustesDeReserva({ ...formulario, closeMinutesBefore: '180', cancelMinutesBefore: '60' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errores.cancelMinutesBefore);
  });

  it('describe las reglas para el socio', () => {
    const lineas = describirAjustes(AJUSTES_RECOMENDADOS);
    assert.ok(lineas.some((l) => l.includes('7 días antes')));
    assert.ok(lineas.some((l) => l.includes('2 horas')));
    assert.ok(lineas.some((l) => l.includes('bloquean')));
    assert.ok(!describirAjustes({ ...AJUSTES_RECOMENDADOS, blockDays: 0 }).some((l) => l.includes('bloquean')));
  });
});

describe('lectura para gerencia', () => {
  function stat(parcial: Partial<EstadisticaDeReservas> & Pick<EstadisticaDeReservas, 'classId' | 'name'>): EstadisticaDeReservas {
    return {
      reservas30d: 10,
      asistieron30d: 8,
      inasistencias30d: 2,
      tardias30d: 0,
      canceladasATiempo30d: 0,
      promovidas30d: 0,
      justificadas30d: 0,
      sesionesConEspera30d: 0,
      ...parcial,
    };
  }

  it('tasa de asistencia', () => {
    assert.equal(tasaDeAsistencia(8, 2), 80);
    assert.equal(tasaDeAsistencia(0, 0), null);
  });

  it('señala la clase con más faltas, la demanda y los bloqueados', () => {
    const conclusiones = conclusionesDeReservas(
      [
        stat({ classId: 'a', name: 'Box', asistieron30d: 20, inasistencias30d: 1, sesionesConEspera30d: 3, promovidas30d: 2 }),
        stat({ classId: 'b', name: 'Karate', asistieron30d: 3, inasistencias30d: 4 }),
      ],
      { reservasFuturas: 12, enEsperaAhora: 2, sociosBloqueados: 1 },
    );
    const por = (clave: string) => conclusiones.find((c) => c.clave === clave);
    assert.match(por('clase-con-faltas')?.titulo ?? '', /Karate/);
    assert.match(por('demanda')?.titulo ?? '', /Box/);
    assert.match(por('demanda')?.detalle ?? '', /2 personas/);
    assert.equal(por('bloqueados')?.tono, 'atencion');
  });

  it('sin reservas resueltas no inventa una tasa', () => {
    const c = conclusionesDeReservas([stat({ classId: 'a', name: 'Box', asistieron30d: 0, inasistencias30d: 0 })], null);
    assert.equal(c.length, 1);
    assert.equal(c[0]?.clave, 'sin-reservas');
  });

  it('traduce los errores de la base', () => {
    assert.match(mensajeDeErrorDeReservas('22023 limite_de_reservas') ?? '', /máximo/);
    assert.match(mensajeDeErrorDeReservas('23P01 reserva_cruzada') ?? '', /otra clase/);
    assert.equal(mensajeDeErrorDeReservas('22023 clase_llena'), null);
  });
});

describe('avisos personales en la bandeja', () => {
  it('van primero, con prefijo propio, y el bloqueo es urgente', () => {
    const lista = construirNotificaciones(
      null,
      [{ id: 'n1', title: 'Feriado', body: 'Cerramos el lunes', startsAt: '2026-09-10', endsAt: null, leido: false }],
      false,
      [
        { id: 'm1', kind: 'reservas_bloqueadas', title: 'Bloqueado', body: 'Tres faltas', createdAt: '2026-09-12', leido: false },
        { id: 'm2', kind: 'reserva_promovida', title: 'Tienes lugar', body: 'Box', createdAt: '2026-09-11', leido: true },
      ],
    );
    assert.equal(lista[0]?.id, `${PREFIJO_DE_AVISO_PERSONAL}m1`);
    assert.equal(lista[0]?.urgencia, 'alta');
    assert.equal(lista[1]?.urgencia, 'informativa');
    assert.equal(lista[2]?.id, 'aviso:n1');
  });
});
