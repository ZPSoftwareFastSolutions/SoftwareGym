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
  decidirLoginPorGimnasio,
  exigeVolverAEntrar,
  respuestaDeAcceso,
  type SituacionDeAcceso,
} from '../src/core/domain/operations/acceso-al-panel.ts';
import {
  correoValido,
  MENSAJE_CORREO_YA_REGISTRADO,
  MENSAJE_CUENTA_DE_OTRO_GIMNASIO,
  resultadoDelAlta,
  correosParaIniciarSesion,
  limpiarEmailDeTenant,
  mutarEmailParaTenant,
} from '../src/core/application/auth/login.usecase.ts';

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

describe('V4.2 · la puerta de un gimnasio solo abre a los suyos', () => {
  const GOLD = 'golds-gym-premium';

  it('una cuenta de GOLD entra por el login de GOLD', () => {
    assert.equal(decidirLoginPorGimnasio({ estado: 'ok', tenantSlug: GOLD, esPlataforma: false }, GOLD), 'permitir');
  });

  it('credenciales CORRECTAS de Mítico en el login de GOLD: denegado', () => {
    // El caso que pidió el cliente. La contraseña está bien; la puerta no es la suya.
    assert.equal(decidirLoginPorGimnasio({ estado: 'ok', tenantSlug: 'mitico', esPlataforma: false }, GOLD), 'otro-gimnasio');
  });

  it('y al revés: una cuenta de GOLD no entra por Mítico', () => {
    assert.equal(decidirLoginPorGimnasio({ estado: 'ok', tenantSlug: GOLD, esPlataforma: false }, 'mitico'), 'otro-gimnasio');
  });

  it('una cuenta sin gimnasio (y que no es plataforma) no entra por ninguno', () => {
    assert.equal(decidirLoginPorGimnasio({ estado: 'ok', tenantSlug: null, esPlataforma: false }, GOLD), 'denegar');
    assert.equal(decidirLoginPorGimnasio({ estado: 'sin-cuenta' }, GOLD), 'denegar');
  });

  it('la plataforma no pertenece a ningún gimnasio y entra por cualquiera', () => {
    assert.equal(decidirLoginPorGimnasio({ estado: 'ok', tenantSlug: null, esPlataforma: true }, GOLD), 'permitir');
    assert.equal(decidirLoginPorGimnasio({ estado: 'ok', tenantSlug: null, esPlataforma: true }, 'mitico'), 'permitir');
  });

  it('si no se pudo leer la cuenta no se adivina: ni se deja entrar ni se dice «incorrecto»', () => {
    assert.equal(decidirLoginPorGimnasio({ estado: 'indisponible' }, GOLD), 'reintentar');
  });
});

describe('V4.2 · alta con un correo que ya existe y cuenta de otro gimnasio', () => {
  it('Supabase da éxito sin enviar nada si el correo ya está registrado: se detecta', () => {
    // Con confirmación por correo, `signUp` devuelve `identities: []` para un
    // correo ya confirmado y NO envía el correo. Era «te enviamos un enlace».
    assert.equal(resultadoDelAlta([]), 'ya-registrado');
  });

  it('un alta nueva trae su identidad y sí envía el correo', () => {
    assert.equal(resultadoDelAlta([{ provider: 'email' }]), 'correo-enviado');
  });

  it('sin información de identidades no se afirma que ya exista', () => {
    assert.equal(resultadoDelAlta(undefined), 'correo-enviado');
    assert.equal(resultadoDelAlta(null), 'correo-enviado');
  });

  it('contraseña correcta de otro gimnasio: sigue sin entrar, pero se dice por qué', () => {
    const decision = decidirLoginPorGimnasio({ estado: 'ok', tenantSlug: 'mitico', esPlataforma: false }, 'golds-gym-premium');
    assert.equal(decision, 'otro-gimnasio');
    assert.notEqual(decision, 'permitir');
  });

  it('los mensajes dicen qué hacer y no nombran el otro gimnasio', () => {
    for (const m of [MENSAJE_CORREO_YA_REGISTRADO, MENSAJE_CUENTA_DE_OTRO_GIMNASIO]) {
      assert.match(m, /correo distinto/);
      assert.doesNotMatch(m, /M[ií]tico|Aurora|GOLD/i);
    }
  });

  it('el reenvío valida el formato del correo antes de llamar a Auth', () => {
    assert.equal(correoValido('socio@gmail.com'), true);
    assert.equal(correoValido('  '), false);
    assert.equal(correoValido('sin-arroba'), false);
  });
});

describe('V5 · el alias de correo por gimnasio no puede dejar a nadie fuera', () => {
  it('escribe el alias del gimnasio en el correo de la persona', () => {
    assert.equal(mutarEmailParaTenant('Juan@Gmail.com', 'golds-gym-premium'), 'juan+golds-gym-premium@gmail.com');
    // Repetirlo no encadena alias.
    assert.equal(
      mutarEmailParaTenant('juan+golds-gym-premium@gmail.com', 'golds-gym-premium'),
      'juan+golds-gym-premium@gmail.com',
    );
  });

  it('lo quita para enseñárselo a una persona', () => {
    assert.equal(limpiarEmailDeTenant('juan+golds-gym-premium@gmail.com', 'golds-gym-premium'), 'juan@gmail.com');
    // La etiqueta que puso la propia persona no se toca.
    assert.equal(limpiarEmailDeTenant('juan+casa+golds-gym-premium@gmail.com', 'golds-gym-premium'), 'juan+casa@gmail.com');
  });

  it('al entrar se prueba el alias y, después, el correo tal cual', () => {
    // Las cuentas anteriores a V5 se registraron sin alias: si solo se probara
    // el alias, su contraseña correcta daría «datos incorrectos» para siempre.
    assert.deepEqual(correosParaIniciarSesion('juan@gmail.com', 'golds-gym-premium'), [
      'juan+golds-gym-premium@gmail.com',
      'juan@gmail.com',
    ]);
  });

  it('quien ya escribe su alias no genera un intento repetido', () => {
    assert.deepEqual(correosParaIniciarSesion('juan+golds-gym-premium@gmail.com', 'golds-gym-premium'), [
      'juan+golds-gym-premium@gmail.com',
    ]);
  });

  it('un correo sin arroba no se convierte en otra cosa', () => {
    assert.deepEqual(correosParaIniciarSesion('sin-arroba', 'golds-gym-premium'), ['sin-arroba']);
  });
});
