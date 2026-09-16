/**
 * Pruebas de V4.2 · Admisiones a una sesión (socios autorizados e invitados).
 *
 * Lo que se fija aquí es la validación del formulario y el conteo de lugares.
 * Quién puede autorizar y a quién NO se prueba aquí: vive en RLS y en el
 * disparador, y se comprueba con sesión simulada en el bloque 3 de
 * `docs/runbooks/pruebas-rls-v4.2-identidad-y-accesos.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lugaresQueOcupan,
  mensajeDeErrorDeAdmision,
  resumirAdmisiones,
  validarAdmision,
  type Admision,
  type DatosDeAdmision,
} from '../src/core/domain/operations/admissions.ts';
import { NOMBRE_DE_MODO_DE_ACCESO, esModoDeAcceso } from '../src/core/domain/operations/classes.ts';

function datos(parcial: Partial<DatosDeAdmision> = {}): DatosDeAdmision {
  return { customerId: null, nombre: 'Ana Invitada', documento: '', telefono: '', motivo: '', ...parcial };
}

function admision(parcial: Partial<Admision> = {}): Admision {
  return {
    id: 'a1',
    sessionId: 's1',
    customerId: null,
    customerCode: null,
    nombre: 'Ana Invitada',
    esInvitado: true,
    documento: null,
    telefono: null,
    motivo: null,
    llegadaEn: null,
    vino: false,
    ...parcial,
  };
}

describe('V4.2 · el modo de acceso nuevo', () => {
  it('«autorizados» es un modo válido y tiene nombre legible', () => {
    assert.ok(esModoDeAcceso('autorizados'));
    assert.equal(NOMBRE_DE_MODO_DE_ACCESO.autorizados, 'Solo personas autorizadas');
  });

  it('los tres modos que ya existían siguen siendo válidos', () => {
    for (const modo of ['membresia', 'planes', 'abierta']) assert.ok(esModoDeAcceso(modo));
  });

  it('un modo inventado no pasa', () => {
    assert.ok(!esModoDeAcceso('gratis'));
  });
});

describe('V4.2 · validación de una admisión', () => {
  it('un invitado con nombre es válido', () => {
    assert.deepEqual(validarAdmision(datos()), {});
  });

  it('un invitado sin nombre no: es el único dato que lo identifica', () => {
    assert.ok(validarAdmision(datos({ nombre: ' ' })).nombre);
  });

  it('un socio es válido sin nombre: sale de su ficha', () => {
    assert.deepEqual(validarAdmision(datos({ customerId: 'c-1', nombre: '' })), {});
  });

  it('a un socio NO se le escribe el nombre: sería un dato duplicado que puede contradecir la ficha', () => {
    assert.ok(validarAdmision(datos({ customerId: 'c-1', nombre: 'Otro Nombre' })).nombre);
  });

  it('el documento es opcional, pero si se pone tiene que ser plausible', () => {
    assert.deepEqual(validarAdmision(datos({ documento: '' })), {});
    assert.ok(validarAdmision(datos({ documento: 'xy' })).documento);
  });

  it('el motivo no puede pasar del límite de la base', () => {
    assert.ok(validarAdmision(datos({ motivo: 'x'.repeat(201) })).motivo);
  });
});

describe('V4.2 · cuántos lugares ocupan', () => {
  it('solo los invitados suman: un socio ya cuenta por su asistencia o su reserva', () => {
    const lista = [admision({ id: '1' }), admision({ id: '2', esInvitado: false, customerId: 'c-1' })];
    assert.equal(lugaresQueOcupan(lista), 1);
  });

  it('sin invitados no ocupan nada', () => {
    assert.equal(lugaresQueOcupan([admision({ esInvitado: false, customerId: 'c-1' })]), 0);
  });
});

describe('V4.2 · resumen de la lista', () => {
  it('separa invitados de socios y cuenta quién llegó', () => {
    const lista = [
      admision({ id: '1', vino: true }),
      admision({ id: '2' }),
      admision({ id: '3', esInvitado: false, customerId: 'c-1', vino: true }),
    ];
    assert.deepEqual(resumirAdmisiones(lista), { total: 3, invitados: 2, socios: 1, vinieron: 2 });
  });

  it('una lista vacía no devuelve «NaN»', () => {
    assert.deepEqual(resumirAdmisiones([]), { total: 0, invitados: 0, socios: 0, vinieron: 0 });
  });
});

describe('V4.2 · errores de la base traducidos', () => {
  it('la sesión llena se explica sin jerga', () => {
    assert.match(mensajeDeErrorDeAdmision('22023 clase_llena'), /llena/);
  });

  it('el duplicado dice que ya está autorizada, no «23505»', () => {
    assert.match(mensajeDeErrorDeAdmision('23505 csa_un_invitado_por_sesion'), /ya está autorizada/);
  });

  it('el CHECK de socio-o-invitado se explica', () => {
    assert.match(mensajeDeErrorDeAdmision('23514 csa_socio_o_invitado'), /socio o a un invitado/);
  });

  it('un error desconocido no deja al mostrador sin mensaje', () => {
    assert.ok(mensajeDeErrorDeAdmision('XX000 vaya').length > 0);
  });
});
