/**
 * Pruebas del catálogo de ejercicios y de la política de medios (V3.1).
 *
 * Los límites reales los aplica la base (disparador de `exercise_media` y
 * bucket `ejercicios`): ver el runbook de RLS de V3.1.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectarTipoDeMedio,
  evaluarCuota,
  formatoDeBytes,
  LIMITES_DE_MEDIOS,
  mensajeDeErrorDeEjercicios,
  parsearEnlaceDeVideo,
  rutaDeMedio,
  urlDeInsercion,
  validarArchivoDeMedio,
  validarEjercicio,
} from '../src/core/domain/operations/exercises.ts';

const bytes = (...valores: number[]) => new Uint8Array(valores);

describe('detectarTipoDeMedio (bytes mágicos)', () => {
  it('reconoce los formatos admitidos', () => {
    assert.equal(detectarTipoDeMedio(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
    assert.equal(detectarTipoDeMedio(bytes(0x89, 0x50, 0x4e, 0x47)), 'image/png');
    assert.equal(detectarTipoDeMedio(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), 'image/gif');
    assert.equal(detectarTipoDeMedio(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)), 'image/webp');
    assert.equal(detectarTipoDeMedio(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70)), 'video/mp4');
    assert.equal(detectarTipoDeMedio(bytes(0x1a, 0x45, 0xdf, 0xa3)), 'video/webm');
  });

  it('un HTML disfrazado no es un medio', () => {
    assert.equal(detectarTipoDeMedio(new TextEncoder().encode('<html><script>')), null);
    assert.equal(detectarTipoDeMedio(bytes()), null);
  });
});

describe('validarArchivoDeMedio', () => {
  it('imagen hasta 1 MB, GIF hasta 3 MB, clip hasta 15 MB', () => {
    assert.deepEqual(validarArchivoDeMedio({ mime: 'image/webp', size: 150_000 }), { ok: true, kind: 'imagen' });
    assert.deepEqual(validarArchivoDeMedio({ mime: 'image/webp', size: LIMITES_DE_MEDIOS.imagen + 1 }), { ok: false, motivo: 'demasiado_grande' });
    assert.deepEqual(validarArchivoDeMedio({ mime: 'image/gif', size: 2_000_000 }), { ok: true, kind: 'gif' });
    assert.deepEqual(validarArchivoDeMedio({ mime: 'video/mp4', size: 16 * 1024 * 1024, durationSeconds: 20 }), { ok: false, motivo: 'demasiado_grande' });
  });

  it('el clip exige duración conocida y hasta 60 s', () => {
    assert.deepEqual(validarArchivoDeMedio({ mime: 'video/webm', size: 5_000_000, durationSeconds: 45 }), { ok: true, kind: 'video' });
    assert.deepEqual(validarArchivoDeMedio({ mime: 'video/mp4', size: 5_000_000, durationSeconds: 61 }), { ok: false, motivo: 'video_demasiado_largo' });
    assert.deepEqual(validarArchivoDeMedio({ mime: 'video/mp4', size: 5_000_000 }), { ok: false, motivo: 'video_demasiado_largo' });
  });

  it('otros tipos y archivos vacíos se rechazan', () => {
    assert.deepEqual(validarArchivoDeMedio({ mime: 'application/pdf', size: 10 }), { ok: false, motivo: 'tipo_no_permitido' });
    assert.deepEqual(validarArchivoDeMedio({ mime: 'image/png', size: 0 }), { ok: false, motivo: 'vacio' });
  });
});

describe('parsearEnlaceDeVideo', () => {
  it('YouTube en sus formas habituales', () => {
    const esperado = { provider: 'youtube', id: 'dQw4w9WgXcQ' };
    assert.deepEqual(parsearEnlaceDeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), esperado);
    assert.deepEqual(parsearEnlaceDeVideo('https://youtu.be/dQw4w9WgXcQ'), esperado);
    assert.deepEqual(parsearEnlaceDeVideo('https://youtube.com/shorts/dQw4w9WgXcQ'), esperado);
  });

  it('Vimeo', () => {
    assert.deepEqual(parsearEnlaceDeVideo('https://vimeo.com/123456789'), { provider: 'vimeo', id: '123456789' });
  });

  it('rechaza otros dominios, http y basura', () => {
    assert.equal(parsearEnlaceDeVideo('https://evil.com/watch?v=dQw4w9WgXcQ'), null);
    assert.equal(parsearEnlaceDeVideo('http://youtu.be/dQw4w9WgXcQ'), null);
    assert.equal(parsearEnlaceDeVideo('javascript:alert(1)'), null);
    assert.equal(parsearEnlaceDeVideo('https://youtu.be/corto'), null);
  });

  it('la URL de inserción la arma la aplicación', () => {
    assert.equal(urlDeInsercion('youtube', 'dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
    assert.equal(urlDeInsercion('vimeo', '123456789'), 'https://player.vimeo.com/video/123456789?dnt=1');
  });
});

describe('cuota de medios', () => {
  it('permite mientras quede espacio y avisa al 80 %', () => {
    const cuota = 300 * 1024 * 1024;
    assert.equal(evaluarCuota({ usadoBytes: 10, cuotaBytes: cuota }, 1000).permitido, true);
    assert.equal(evaluarCuota({ usadoBytes: cuota - 10, cuotaBytes: cuota }, 11).permitido, false);
    assert.equal(evaluarCuota({ usadoBytes: cuota * 0.85, cuotaBytes: cuota }).nivel, 'alto');
    assert.equal(evaluarCuota({ usadoBytes: cuota, cuotaBytes: cuota }).nivel, 'lleno');
    assert.equal(evaluarCuota({ usadoBytes: 0, cuotaBytes: 0 }).porcentaje, 100);
  });

  it('formatea tamaños', () => {
    assert.equal(formatoDeBytes(850 * 1024), '850 KB');
    assert.equal(formatoDeBytes(300 * 1024 * 1024), '300 MB');
  });

  it('la ruta del archivo la decide el servidor', () => {
    assert.equal(rutaDeMedio('t', 'e', 'u', 'video/mp4'), 't/e/u.mp4');
    assert.equal(rutaDeMedio('t', 'e', 'u', 'image/webp', true), 't/e/u-poster.webp');
  });
});

describe('validarEjercicio', () => {
  it('normaliza y exige grupo muscular del catálogo', () => {
    const r = validarEjercicio({ name: '  Press   de banca ', muscleGroup: 'pecho', equipment: '', description: '', instructions: '' });
    assert.ok(r.ok);
    assert.equal(r.datos.name, 'Press de banca');
    assert.equal(validarEjercicio({ name: 'X', muscleGroup: 'alas', equipment: '', description: '', instructions: '' }).ok, false);
  });

  it('traduce los errores de la base', () => {
    assert.match(mensajeDeErrorDeEjercicios('53400 cuota_de_medios_excedida'), /cuota/);
    assert.match(mensajeDeErrorDeEjercicios('23505 duplicate key exercises_nombre_uk'), /nombre/);
  });
});
