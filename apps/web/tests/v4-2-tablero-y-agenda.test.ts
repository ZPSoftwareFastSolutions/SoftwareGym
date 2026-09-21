/**
 * Pruebas de V4.2 · Qué ve primero cada puesto y cómo lee el socio sus clases.
 *
 * Lo que se fija aquí son DOS decisiones que antes vivían repartidas por las
 * pantallas: con qué mirada se abre un tablero (§9, §10, §11, §21) y en qué
 * situación está un socio frente a una sesión (§15, §16).
 *
 * Que una acción no aparezca NO es seguridad, y estas pruebas no lo pretenden:
 * la ruta vuelve a exigir capacidad y permiso y RLS decide qué filas existen.
 * Lo que se prueba es el foco: que nadie vea un botón que no puede usar y que
 * nadie pierda uno que sí.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCIONES_RAPIDAS,
  accionesRapidas,
  enfoqueDeTablero,
  ordenDelTablero,
  type ContextoDeTablero,
  asuntosDelDia,
  profundidadDelBloque,
  saludoDelTablero,
} from '../src/core/domain/operations/tablero.ts';
import {
  agruparPorDia,
  describirDisponibilidad,
  estaInscrito,
  estadoDeClaseDelSocio,
  lugaresLibres,
  NOMBRE_DE_ESTADO_DE_CLASE,
  type ContextoDeClaseDelSocio,
  type SesionParaElSocio,
} from '../src/core/domain/operations/agenda-del-socio.ts';
import { diaDelHorario } from '../src/core/domain/operations/streak.ts';

const TODO_CONTRATADO = {
  enableAttendance: true,
  enableMemberManagement: true,
  enablePayments: true,
  enableClasses: true,
  enableReports: true,
  enableAnnouncements: true,
} as const;

/** Permisos reales de recepción en el proyecto (§4.6), sin inventar ninguno. */
const RECEPCION = [
  'dashboard.read',
  'attendance.read',
  'attendance.create',
  'customers.read',
  'customers.create',
  'memberships.read',
  'memberships.create',
  'payments.read',
  'payments.create',
  'classes.read',
  'classes.attend',
];

const GERENCIA = [...RECEPCION, 'reports.read', 'customers.update', 'settings.manage', 'content.manage', 'users.read'];
const ADMINISTRACION = [...GERENCIA, 'roles.manage'];

function contexto(parcial: Partial<ContextoDeTablero> = {}): ContextoDeTablero {
  return {
    enfoque: 'mostrador',
    capacidades: TODO_CONTRATADO,
    permisos: RECEPCION,
    puedeOperarEnSede: true,
    ...parcial,
  };
}

describe('V4.2 · con qué mirada se abre el tablero', () => {
  it('recepción y gerencia comparten espacio, y aun así se distinguen', () => {
    // Las dos son espacio `gimnasio`: lo que las separa es responder por el
    // dinero, y eso se nombra con un permiso, no con el nombre del rol.
    assert.equal(enfoqueDeTablero('gimnasio', RECEPCION), 'mostrador');
    assert.equal(enfoqueDeTablero('gimnasio', GERENCIA), 'gerencia');
  });

  it('administración, entrenador, socio y plataforma tienen el suyo', () => {
    assert.equal(enfoqueDeTablero('administracion', ADMINISTRACION), 'administracion');
    assert.equal(enfoqueDeTablero('entrenador', ['trainers.self']), 'entrenador');
    assert.equal(enfoqueDeTablero('socio', []), 'socio');
    assert.equal(enfoqueDeTablero('plataforma', ['tenants.manage']), 'plataforma');
  });

  it('recepción empieza por la operación y gerencia por el dinero', () => {
    assert.equal(ordenDelTablero('mostrador')[0], 'operacion');
    assert.equal(ordenDelTablero('gerencia')[0], 'dinero');
    assert.equal(ordenDelTablero('administracion')[0], 'dinero');
  });

  it('nadie pierde un bloque por mirar desde otro puesto: solo cambia el orden', () => {
    const esperados = ['operacion', 'dinero', 'socios', 'sucursales'];
    for (const enfoque of ['mostrador', 'gerencia', 'administracion'] as const) {
      assert.deepEqual([...ordenDelTablero(enfoque)].sort(), [...esperados].sort());
    }
  });
});

describe('V4.2 · acciones rápidas', () => {
  it('recepción abre con escanear, dar de alta, cobrar y membresías', () => {
    const claves = accionesRapidas(contexto()).map((a) => a.clave);
    assert.deepEqual(claves.slice(0, 4), ['escanear', 'nuevo-socio', 'comprobantes', 'membresias']);
  });

  it('sin sede donde operar, el botón de escanear NO se ofrece', () => {
    // Tener `attendance.create` no basta: quien trabaja por asignación y no
    // tiene sede operable acabaría en un error de la base.
    const claves = accionesRapidas(contexto({ puedeOperarEnSede: false })).map((a) => a.clave);
    assert.ok(!claves.includes('escanear'));
    assert.ok(claves.includes('nuevo-socio'));
  });

  it('una capacidad no contratada quita su acción, aunque sobre el permiso', () => {
    const claves = accionesRapidas(
      contexto({ capacidades: { ...TODO_CONTRATADO, enablePayments: false } }),
    ).map((a) => a.clave);
    assert.ok(!claves.includes('comprobantes'));
  });

  it('recepción no ve reportes de dinero ni personal; administración sí', () => {
    const recepcion = accionesRapidas(contexto()).map((a) => a.clave);
    assert.ok(!recepcion.includes('ingresos'));
    assert.ok(!recepcion.includes('personal'));

    const admin = accionesRapidas(contexto({ enfoque: 'administracion', permisos: ADMINISTRACION })).map((a) => a.clave);
    assert.ok(admin.includes('ingresos'));
    assert.ok(admin.includes('personal'));
    assert.ok(admin.includes('accesos'));
  });

  it('el socio y el entrenador no reciben acciones de mostrador', () => {
    assert.equal(accionesRapidas(contexto({ enfoque: 'socio', permisos: [] })).length, 0);
    assert.equal(accionesRapidas(contexto({ enfoque: 'entrenador', permisos: ['trainers.self'] })).length, 0);
  });

  it('toda acción del catálogo exige permiso o es de solo lectura declarada', () => {
    // Un `permiso: null` sin querer abriría la acción a cualquier cuenta con
    // sesión. Hoy no hay ninguna, y si se añade una tiene que ser a conciencia.
    for (const accion of ACCIONES_RAPIDAS) {
      assert.ok(accion.permiso !== null, `«${accion.etiqueta}» no declara permiso`);
    }
  });
});

const SESION_BASE: SesionParaElSocio = { estado: 'programada', miReservaEstado: null, ocupados: 4, capacity: 12 };
const CTX_BASE: ContextoDeClaseDelSocio = { incluidaEnSuPlan: true, conReservas: true, ventana: 'abierta' };

describe('V4.2 · en qué situación está el socio frente a una clase', () => {
  it('una sesión cancelada lo es aunque el socio tuviera su lugar', () => {
    const estado = estadoDeClaseDelSocio({ ...SESION_BASE, estado: 'cancelada', miReservaEstado: 'reservada' }, CTX_BASE);
    assert.equal(estado, 'cancelado');
  });

  it('quien reservó está inscrito aunque la clase esté llena', () => {
    // Decisión 40: quien reservó entra a SU lugar; la ocupación no lo desplaza.
    const estado = estadoDeClaseDelSocio(
      { ...SESION_BASE, miReservaEstado: 'reservada', ocupados: 12, capacity: 12 },
      CTX_BASE,
    );
    assert.equal(estado, 'inscrito');
    assert.ok(estaInscrito(estado));
  });

  it('la lista de espera cuenta como estar anotado, pero se nombra distinto', () => {
    const estado = estadoDeClaseDelSocio({ ...SESION_BASE, miReservaEstado: 'en_espera' }, CTX_BASE);
    assert.equal(estado, 'en-espera');
    assert.ok(estaInscrito(estado));
    assert.equal(NOMBRE_DE_ESTADO_DE_CLASE[estado], 'En lista de espera');
  });

  it('sin lugares es «completo», no «disponible»', () => {
    assert.equal(estadoDeClaseDelSocio({ ...SESION_BASE, ocupados: 12, capacity: 12 }, CTX_BASE), 'completo');
    assert.equal(estadoDeClaseDelSocio({ ...SESION_BASE, ocupados: 13, capacity: 12 }, CTX_BASE), 'completo');
  });

  it('si el plan no la incluye, es «no disponible» aunque sobren lugares', () => {
    assert.equal(estadoDeClaseDelSocio(SESION_BASE, { ...CTX_BASE, incluidaEnSuPlan: false }), 'no-disponible');
  });

  it('con la ventana sin abrir es «próximo»; sin reservas contratadas, no', () => {
    assert.equal(estadoDeClaseDelSocio(SESION_BASE, { ...CTX_BASE, ventana: 'no_abierta' }), 'proximo');
    assert.equal(
      estadoDeClaseDelSocio(SESION_BASE, { ...CTX_BASE, ventana: 'no_abierta', conReservas: false }),
      'disponible',
    );
  });

  it('lo que ya ocurrió pesa más que lo que podría ocurrir', () => {
    assert.equal(estadoDeClaseDelSocio({ ...SESION_BASE, estado: 'en_curso' }, CTX_BASE), 'en-curso');
    assert.equal(estadoDeClaseDelSocio({ ...SESION_BASE, estado: 'realizada' }, CTX_BASE), 'terminado');
    assert.equal(estadoDeClaseDelSocio({ ...SESION_BASE, miReservaEstado: 'asistio' }, CTX_BASE), 'asistido');
  });
});

describe('V4.2 · disponibilidad y agrupación por día', () => {
  it('los lugares libres nunca son negativos', () => {
    assert.equal(lugaresLibres({ ...SESION_BASE, ocupados: 15, capacity: 12 }), 0);
    assert.equal(lugaresLibres({ ...SESION_BASE, ocupados: 4, capacity: 12 }), 8);
  });

  it('la disponibilidad se lee sin restar', () => {
    assert.equal(describirDisponibilidad({ ...SESION_BASE, ocupados: 12, capacity: 12 }), 'Sin lugares');
    assert.equal(describirDisponibilidad({ ...SESION_BASE, ocupados: 11, capacity: 12 }), 'Queda 1 lugar');
    assert.equal(describirDisponibilidad({ ...SESION_BASE, ocupados: 9, capacity: 12 }), 'Quedan 3 lugares');
  });

  it('agrupar por día conserva el orden que dio la base', () => {
    const dias = agruparPorDia([
      { sessionDate: '2026-09-16', id: 'a' },
      { sessionDate: '2026-09-16', id: 'b' },
      { sessionDate: '2026-09-17', id: 'c' },
    ]);
    assert.equal(dias.length, 2);
    assert.deepEqual(
      dias.map((d) => d.sesiones.map((s) => s.id)),
      [['a', 'b'], ['c']],
    );
  });

  it('un día repetido más adelante NO se funde con el anterior', () => {
    // Fundirlos cambiaría el orden que decidió la base, que es quien ordena.
    const dias = agruparPorDia([
      { sessionDate: '2026-09-16' },
      { sessionDate: '2026-09-17' },
      { sessionDate: '2026-09-16' },
    ]);
    assert.deepEqual(dias.map((d) => d.fecha), ['2026-09-16', '2026-09-17', '2026-09-16']);
  });

  it('sin sesiones no hay días', () => {
    assert.deepEqual(agruparPorDia([]), []);
  });
});

describe('V4.2 · el horario del día que le toca a una fecha', () => {
  const semana = [
    { day: 'Lunes', open: '06:00', close: '22:00', closed: false },
    { day: 'Martes', open: '06:00', close: '22:00', closed: false },
    { day: 'Miércoles', open: '06:00', close: '22:00', closed: false },
    { day: 'Domingo', open: '', close: '', closed: true },
  ];

  it('casa la fecha con el nombre del día que escribió el gimnasio', () => {
    // 2026-09-16 es miércoles; se escribe con tilde en la configuración.
    assert.equal(diaDelHorario(semana, '2026-09-16')?.day, 'Miércoles');
    assert.equal(diaDelHorario(semana, '2026-09-20')?.closed, true);
  });

  it('un día que el horario no nombra devuelve null, sin inventar horario', () => {
    assert.equal(diaDelHorario(semana, '2026-09-19'), null); // sábado, no declarado
    assert.equal(diaDelHorario(semana, 'no-es-una-fecha'), null);
  });
});

describe('V5 · el tablero no satura: lo del turno abierto, el resto a un clic', () => {
  it('recepción abre solo con la operación del día', () => {
    assert.equal(profundidadDelBloque('mostrador', 'operacion'), 'abierto');
    assert.equal(profundidadDelBloque('mostrador', 'dinero'), 'plegado');
    assert.equal(profundidadDelBloque('mostrador', 'socios'), 'plegado');
    assert.equal(profundidadDelBloque('mostrador', 'sucursales'), 'plegado');
  });

  it('gerencia y administración abren con el dinero Y la operación', () => {
    for (const enfoque of ['gerencia', 'administracion'] as const) {
      assert.equal(profundidadDelBloque(enfoque, 'dinero'), 'abierto');
      assert.equal(profundidadDelBloque(enfoque, 'operacion'), 'abierto');
    }
  });

  it('ningún bloque desaparece para nadie: plegar no es quitar', () => {
    for (const enfoque of ['mostrador', 'gerencia', 'administracion'] as const) {
      const bloques = ordenDelTablero(enfoque);
      assert.equal(bloques.length, 4);
      for (const bloque of bloques) {
        assert.ok(['abierto', 'plegado'].includes(profundidadDelBloque(enfoque, bloque)));
      }
    }
  });

  it('el saludo va con la hora del gimnasio, no con la del servidor', () => {
    assert.equal(saludoDelTablero(7), 'Buenos días');
    assert.equal(saludoDelTablero(11), 'Buenos días');
    assert.equal(saludoDelTablero(12), 'Buenas tardes');
    assert.equal(saludoDelTablero(18), 'Buenas tardes');
    assert.equal(saludoDelTablero(19), 'Buenas noches');
    assert.equal(saludoDelTablero(23), 'Buenas noches');
  });
});

describe('V5 · lo que necesita atención hoy', () => {
  const NADA = { comprobantesPendientes: 0, porVencer: 0, vencidas: 0, sinMembresia: 0, sinVenir7d: 0 };

  it('sin nada pendiente devuelve una lista vacía, que la pantalla sabe contestar', () => {
    assert.deepEqual(asuntosDelDia(NADA), []);
  });

  it('solo aparece lo que tiene cantidad', () => {
    const asuntos = asuntosDelDia({ ...NADA, comprobantesPendientes: 2, sinVenir7d: 5 });
    assert.deepEqual(asuntos.map((a) => a.clave), ['comprobantes', 'sin-venir']);
    assert.deepEqual(asuntos.map((a) => a.cantidad), [2, 5]);
  });

  it('primero lo que tiene a alguien esperando', () => {
    // Un comprobante sin revisar es un socio que pagó y no puede entrenar:
    // va antes que cualquier lista de seguimiento.
    const asuntos = asuntosDelDia({ comprobantesPendientes: 1, porVencer: 3, vencidas: 4, sinMembresia: 2, sinVenir7d: 9 });
    assert.deepEqual(asuntos.map((a) => a.clave), ['comprobantes', 'por-vencer', 'vencidas', 'sin-membresia', 'sin-venir']);
    assert.deepEqual(
      asuntos.filter((a) => a.tono === 'urgente').map((a) => a.clave),
      ['comprobantes', 'por-vencer'],
    );
  });
});
