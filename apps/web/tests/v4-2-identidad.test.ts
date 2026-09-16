/**
 * Pruebas de V4.2 · Identidad del socio en el ingreso.
 *
 * Lo que se fija aquí es lo que el mostrador ve al escanear un QR: las
 * iniciales cuando todavía no hay foto, los límites del avatar y el conteo de
 * días seguidos que saluda al socio.
 *
 * La autorización (quién puede subir la foto de quién) NO se prueba aquí: vive
 * en RLS y en un disparador, y se comprueba con sesión simulada en
 * `docs/runbooks/pruebas-rls-v4.2-identidad-y-accesos.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  esTipoDeAvatar,
  inicialesDe,
  motivoDeRechazo,
  rutaDeAvatar,
  TAMANO_MAXIMO_DE_AVATAR,
} from '../src/core/domain/operations/avatars.ts';
import { diasSeguidos } from '../src/core/domain/operations/streak.ts';
import { identidadDelResultado, type ResultadoDeCheckIn } from '../src/core/domain/operations/attendance.ts';

describe('V4.2 · iniciales cuando no hay foto', () => {
  it('toma la primera y la última palabra', () => {
    assert.equal(inicialesDe('Juan Pérez'), 'JP');
    assert.equal(inicialesDe('María Fernanda Rojas Vargas'), 'MV');
  });

  it('con un solo nombre usa una inicial', () => {
    assert.equal(inicialesDe('Madonna'), 'M');
  });

  it('nunca devuelve vacío: un hueco sin explicación es peor que un signo', () => {
    assert.equal(inicialesDe(''), '?');
    assert.equal(inicialesDe('   '), '?');
  });
});

describe('V4.2 · qué avatar se acepta', () => {
  it('admite los tres formatos del bucket y nada más', () => {
    assert.ok(esTipoDeAvatar('image/webp'));
    assert.ok(esTipoDeAvatar('image/jpeg'));
    assert.ok(esTipoDeAvatar('image/png'));
    assert.ok(!esTipoDeAvatar('image/gif'));
    assert.ok(!esTipoDeAvatar('application/pdf'));
  });

  it('rechaza lo que pesa de más, con un mensaje que dice qué hacer', () => {
    const motivo = motivoDeRechazo(TAMANO_MAXIMO_DE_AVATAR + 1, 'image/webp');
    assert.ok(motivo !== null);
    assert.match(motivo, /reduce/i);
  });

  it('rechaza un formato que el bucket no admite', () => {
    assert.ok(motivoDeRechazo(1000, 'image/gif') !== null);
  });

  it('acepta lo que cabe', () => {
    assert.equal(motivoDeRechazo(50_000, 'image/webp'), null);
  });

  it('la ruta lleva gimnasio y socio en ese orden: de ahí saca Storage quién puede leerla', () => {
    const ruta = rutaDeAvatar('t-1', 'c-9', 'image/webp', 'abc');
    assert.equal(ruta, 't-1/c-9/abc.webp');
    assert.equal(ruta.split('/')[0], 't-1');
    assert.equal(ruta.split('/')[1], 'c-9');
  });
});

describe('V4.2 · días seguidos para el saludo del mostrador', () => {
  it('cuenta los consecutivos desde la última entrada', () => {
    assert.equal(diasSeguidos(['2026-09-16', '2026-09-15', '2026-09-14']), 3);
  });

  it('un hueco corta la cuenta', () => {
    assert.equal(diasSeguidos(['2026-09-16', '2026-09-15', '2026-09-13']), 2);
  });

  it('las fechas repetidas no inflan el número', () => {
    assert.equal(diasSeguidos(['2026-09-16', '2026-09-16', '2026-09-15']), 2);
  });

  it('sin entradas es cero, no «NaN»', () => {
    assert.equal(diasSeguidos([]), 0);
  });

  it('ignora lo que no es una fecha', () => {
    assert.equal(diasSeguidos(['no-es-fecha', '2026-09-16']), 1);
  });

  it('no depende del orden en que lleguen', () => {
    assert.equal(diasSeguidos(['2026-09-14', '2026-09-16', '2026-09-15']), 3);
  });
});

describe('V4.2 · qué resultados traen identidad', () => {
  const identidad = { nombre: 'Juan Pérez', codigo: 'MF-001', fotoUrl: null, racha: 4 };

  it('los tres desenlaces con persona la traen', () => {
    const casos: ResultadoDeCheckIn[] = [
      { tipo: 'registrado', socio: 'Juan', hora: '', diasRestantes: 10, sucursal: 'Prado', identidad },
      { tipo: 'repetido', socio: 'Juan', hora: '', sucursal: 'Prado', identidad },
      { tipo: 'sin-membresia', socio: 'Juan', sucursal: 'Prado', identidad },
    ];
    for (const caso of casos) assert.equal(identidadDelResultado(caso)?.codigo, 'MF-001');
  });

  it('un código desconocido NO identifica a nadie: no se abre ninguna ventana', () => {
    assert.equal(identidadDelResultado({ tipo: 'desconocido' }), null);
    assert.equal(identidadDelResultado({ tipo: 'error', mensaje: 'x' }), null);
  });
});
