/**
 * Pruebas de V4.2 · Sesión, permisos y redirecciones (§19, §20, §24).
 *
 * Este archivo existe por un defecto concreto: CUATRO situaciones distintas
 * terminaban en el mismo `redirect('/acceso')`, así que un fallo de red se le
 * presentaba al usuario como «tu sesión terminó». La regla del producto es que
 * **una operación fallida no cierra la sesión de nadie**, y aquí se fija.
 *
 * Lo que NO se prueba aquí: los códigos de estado reales. Esos se miden con
 * `curl` sobre el dominio después de desplegar, porque la lección del
 * `loading.tsx` de V4 fue exactamente que leer el código no basta.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  conservaLaSesion,
  exigeVolverAEntrar,
  respuestaDeAcceso,
  type SituacionDeAcceso,
} from '../src/core/domain/operations/acceso-al-panel.ts';

const TODAS: readonly SituacionDeAcceso[] = [
  'anonimo',
  'indisponible',
  'sin-perfil',
  'gimnasio-ajeno',
  'sin-permiso',
  'ok',
];

describe('V4.2 · una respuesta por situación, y solo una lleva al login', () => {
  it('sin sesión: al formulario de acceso', () => {
    assert.equal(respuestaDeAcceso('anonimo'), 'ir-al-acceso');
  });

  it('un fallo al comprobar la sesión NO manda al login', () => {
    // El defecto original. Un timeout de PostgREST no es una sesión caducada.
    assert.equal(respuestaDeAcceso('indisponible'), 'no-disponible');
    assert.ok(!exigeVolverAEntrar('indisponible'));
    assert.ok(conservaLaSesion('indisponible'));
  });

  it('autenticado sin permiso es 403, no una vuelta al login ni un silencio', () => {
    assert.equal(respuestaDeAcceso('sin-permiso'), 'prohibido');
    assert.ok(conservaLaSesion('sin-permiso'));
  });

  it('una cuenta sin ficha operativa es 403, no un intruso', () => {
    assert.equal(respuestaDeAcceso('sin-perfil'), 'prohibido');
    assert.ok(conservaLaSesion('sin-perfil'));
  });

  it('el gimnasio equivocado devuelve al panel propio, sin error', () => {
    assert.equal(respuestaDeAcceso('gimnasio-ajeno'), 'ir-a-su-panel');
    assert.ok(conservaLaSesion('gimnasio-ajeno'));
  });

  it('con todo en orden, se continúa', () => {
    assert.equal(respuestaDeAcceso('ok'), 'continuar');
  });

  it('EXACTAMENTE una situación exige volver a entrar', () => {
    // El cinturón contra la regresión: si mañana alguien hace que otro caso
    // acabe en el formulario de acceso, esta prueba lo dice.
    const alLogin = TODAS.filter(exigeVolverAEntrar);
    assert.deepEqual(alLogin, ['anonimo']);
  });

  it('ninguna situación deja a alguien autenticado sin respuesta', () => {
    for (const situacion of TODAS) {
      assert.ok(respuestaDeAcceso(situacion), `«${situacion}» no tiene respuesta`);
    }
  });

  it('las respuestas no se solapan: cada una dice algo distinto', () => {
    const respuestas = new Set(TODAS.map(respuestaDeAcceso));
    // Cinco respuestas para seis situaciones: «sin-perfil» y «sin-permiso»
    // comparten el 403 a propósito, porque para quien mira son lo mismo.
    assert.equal(respuestas.size, 5);
  });
});
