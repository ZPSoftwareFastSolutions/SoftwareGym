/**
 * Pruebas del cobro por QR (V3.0): qué QR se ofrece para cada plan y si un
 * importe cubre el precio.
 *
 * Esto es lo que decide la PANTALLA. Lo que protege el dinero —rechazar 179
 * contra 180, QR de otro gimnasio, permisos— lo decide la base y se prueba con
 * sesión simulada en `docs/runbooks/pruebas-rls-v3.0-cobro-qr.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  esModoDeMonto,
  esModoDeQr,
  estadoDeQr,
  evaluarImporte,
  importeValido,
  mensajeDeErrorDeCobro,
  seleccionarQrDeCobro,
  type QrDeCobro,
} from '../src/core/domain/operations/cobro-qr.ts';

const HOY = '2026-09-11';
const FIT = { id: 'plan-fit', price: 180 };
const BASICO = { id: 'plan-basico', price: 160 };

function qr(parcial: Partial<QrDeCobro> & Pick<QrDeCobro, 'id'>): QrDeCobro {
  return {
    planId: null,
    qrPath: `tenant/${parcial.id}.png`,
    amountMode: 'libre',
    fixedAmount: null,
    expiresOn: null,
    updatedAt: '2026-09-10T12:00:00Z',
    ...parcial,
  };
}

const GENERAL = qr({ id: 'general' });
const PROPIO_FIT = qr({ id: 'fit', planId: FIT.id });
const EXACTO_FIT = qr({ id: 'fit-exacto', planId: FIT.id, amountMode: 'exacto', fixedAmount: 180 });

describe('evaluarImporte: el pago tiene que cubrir el precio', () => {
  it('180 esperado, 180 pagado → exacto y válido', () => {
    assert.equal(evaluarImporte(180, 180), 'exacto');
    assert.equal(importeValido(180, 180), true);
  });

  it('180 esperado, 179 pagado → insuficiente, NO válido', () => {
    assert.equal(evaluarImporte(180, 179), 'insuficiente');
    assert.equal(importeValido(180, 179), false);
  });

  it('180 esperado, 181 pagado → excedente, válido (se registra lo pagado)', () => {
    assert.equal(evaluarImporte(180, 181), 'excedente');
    assert.equal(importeValido(180, 181), true);
  });

  it('un centavo menos también es insuficiente, sin errores de coma flotante', () => {
    assert.equal(evaluarImporte(180, 179.99), 'insuficiente');
    assert.equal(evaluarImporte(0.3, 0.1 + 0.2), 'exacto');
  });

  it('sin plan (sin precio esperado) vale cualquier importe positivo', () => {
    assert.equal(importeValido(null, 25), true);
    assert.equal(importeValido(null, 0), false);
    assert.equal(importeValido(180, 0), false);
  });
});

describe('seleccionarQrDeCobro · modalidad global', () => {
  it('usa el QR general aunque el plan tenga el suyo', () => {
    const r = seleccionarQrDeCobro({ modo: 'global', qrs: [GENERAL, PROPIO_FIT], plan: FIT, hoy: HOY });
    assert.ok(r.disponible);
    assert.equal(r.seleccion.qr.id, 'general');
    assert.equal(r.seleccion.origen, 'general');
    assert.equal(r.seleccion.montoExacto, null);
  });

  it('sin QR general no hay QR, aunque existan QR por plan', () => {
    const r = seleccionarQrDeCobro({ modo: 'global', qrs: [PROPIO_FIT], plan: FIT, hoy: HOY });
    assert.deepEqual(r, { disponible: false, motivo: 'sin_qr' });
  });

  it('general vencido → «vencido», no se ofrece', () => {
    const r = seleccionarQrDeCobro({ modo: 'global', qrs: [qr({ id: 'general', expiresOn: '2026-09-10' })], plan: FIT, hoy: HOY });
    assert.deepEqual(r, { disponible: false, motivo: 'vencido' });
  });

  it('el día del vencimiento todavía vale', () => {
    const r = seleccionarQrDeCobro({ modo: 'global', qrs: [qr({ id: 'general', expiresOn: HOY })], plan: null, hoy: HOY });
    assert.equal(r.disponible, true);
  });
});

describe('seleccionarQrDeCobro · modalidad por plan', () => {
  it('el plan con QR propio vigente usa el suyo', () => {
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [GENERAL, PROPIO_FIT], plan: FIT, hoy: HOY });
    assert.ok(r.disponible);
    assert.equal(r.seleccion.qr.id, 'fit');
    assert.equal(r.seleccion.origen, 'plan');
  });

  it('QR exacto con el precio actual → se ofrece con su importe', () => {
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [GENERAL, EXACTO_FIT], plan: FIT, hoy: HOY });
    assert.ok(r.disponible);
    assert.equal(r.seleccion.qr.id, 'fit-exacto');
    assert.equal(r.seleccion.montoExacto, 180);
  });

  it('plan sin QR propio → respaldo en el QR general (siempre de monto libre)', () => {
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [GENERAL, PROPIO_FIT], plan: BASICO, hoy: HOY });
    assert.ok(r.disponible);
    assert.equal(r.seleccion.qr.id, 'general');
    assert.equal(r.seleccion.origen, 'general');
    assert.equal(r.seleccion.montoExacto, null);
  });

  it('un QR exacto de OTRO plan nunca se reutiliza', () => {
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [EXACTO_FIT], plan: BASICO, hoy: HOY });
    assert.deepEqual(r, { disponible: false, motivo: 'sin_qr' });
  });

  it('QR propio vencido → respaldo en el general', () => {
    const vencido = qr({ id: 'fit', planId: FIT.id, expiresOn: '2026-01-01' });
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [GENERAL, vencido], plan: FIT, hoy: HOY });
    assert.ok(r.disponible);
    assert.equal(r.seleccion.qr.id, 'general');
  });

  it('QR exacto cuyo importe ya no es el precio → no se ofrece; respaldo en el general', () => {
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [GENERAL, EXACTO_FIT], plan: { id: FIT.id, price: 200 }, hoy: HOY });
    assert.ok(r.disponible);
    assert.equal(r.seleccion.qr.id, 'general');
  });

  it('QR exacto desactualizado y sin general → no hay QR (pagar en recepción)', () => {
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [EXACTO_FIT], plan: { id: FIT.id, price: 200 }, hoy: HOY });
    assert.equal(r.disponible, false);
  });

  it('propio y general vencidos → «vencido»', () => {
    const r = seleccionarQrDeCobro({
      modo: 'por_plan',
      qrs: [qr({ id: 'general', expiresOn: '2026-01-01' }), qr({ id: 'fit', planId: FIT.id, expiresOn: '2026-01-01' })],
      plan: FIT,
      hoy: HOY,
    });
    assert.deepEqual(r, { disponible: false, motivo: 'vencido' });
  });

  it('pago sin plan → QR general', () => {
    const r = seleccionarQrDeCobro({ modo: 'por_plan', qrs: [GENERAL, PROPIO_FIT], plan: null, hoy: HOY });
    assert.ok(r.disponible);
    assert.equal(r.seleccion.qr.id, 'general');
  });

  it('sin ningún QR → «sin_qr»', () => {
    assert.deepEqual(seleccionarQrDeCobro({ modo: 'por_plan', qrs: [], plan: FIT, hoy: HOY }), { disponible: false, motivo: 'sin_qr' });
  });
});

describe('estadoDeQr', () => {
  it('distingue vigente, vencido y monto desactualizado', () => {
    assert.equal(estadoDeQr(EXACTO_FIT, FIT, HOY), 'vigente');
    assert.equal(estadoDeQr(EXACTO_FIT, { id: FIT.id, price: 179 }, HOY), 'monto_desactualizado');
    assert.equal(estadoDeQr(qr({ id: 'x', expiresOn: '2026-09-10' }), null, HOY), 'vencido');
    // Un QR libre vale para cualquier precio.
    assert.equal(estadoDeQr(PROPIO_FIT, { id: FIT.id, price: 999 }, HOY), 'vigente');
  });
});

describe('validación de valores que llegan de fuera', () => {
  it('modalidades', () => {
    assert.equal(esModoDeQr('global'), true);
    assert.equal(esModoDeQr('por_plan'), true);
    assert.equal(esModoDeQr('POR_PLAN'), false);
    assert.equal(esModoDeMonto('exacto'), true);
    assert.equal(esModoDeMonto('parcial'), false);
  });

  it('los errores de la base se traducen sin culpar al rol por error', () => {
    assert.match(mensajeDeErrorDeCobro('P0001 monto_insuficiente'), /menor que el precio/);
    assert.match(mensajeDeErrorDeCobro('42501 permission denied'), /settings\.manage/);
    assert.match(mensajeDeErrorDeCobro('P0001 plan_invalido'), /plan/);
    assert.doesNotMatch(mensajeDeErrorDeCobro('XX000 algo raro'), /gerencia|permiso/);
  });
});
