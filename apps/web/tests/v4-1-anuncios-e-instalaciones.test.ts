/**
 * Pruebas de V4.1 · Anuncios e instalaciones por sucursal.
 *
 * Las dos capacidades genéricas que necesitó la incorporación de un gimnasio
 * con cuatro sedes que comunica por panfletos. Lo que se fija aquí:
 *
 * - Anuncios: qué se considera publicado AHORA (la misma regla que aplica la
 *   política de la base para el anónimo), el orden del carrusel, la validación
 *   del formulario y el texto de la tarjeta.
 * - Instalaciones: el reparto por sede es DATO, y sin reparto el comportamiento
 *   es exactamente el de antes (regresión de los tenants que ya existían).
 *
 * El aislamiento entre gimnasios y los permisos se prueban con sesión simulada
 * en `docs/runbooks/pruebas-rls-v4.1-anuncios.sql`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  anunciosVisibles,
  estadoDeAnuncio,
  ordenarAnuncios,
  resumenDeTarjeta,
  validarAnuncio,
  type Anuncio,
  type DatosDeAnuncio,
} from '../src/core/domain/operations/announcements.ts';
import {
  agruparInstalacionesPorSede,
  describirGrupo,
  necesitaPestanasDeSede,
} from '../src/core/domain/catalog/facilities.ts';
import type { FacilityItem } from '../src/core/domain/catalog/catalog.ts';

const AHORA = new Date('2026-09-15T12:00:00.000Z');

function anuncio(parcial: Partial<Anuncio> = {}): Anuncio {
  return {
    id: 'a1',
    title: 'Nueva clase de Ubound',
    summary: null,
    body: null,
    imagePath: null,
    imageAlt: null,
    kind: 'clase',
    linkUrl: null,
    linkLabel: null,
    sortOrder: 0,
    isActive: true,
    publishedAt: '2026-09-10T10:00:00.000Z',
    expiresAt: null,
    ...parcial,
  };
}

describe('V4.1 · estado de un anuncio', () => {
  it('publicado: activo, ya publicado y sin vencer', () => {
    assert.equal(estadoDeAnuncio(anuncio(), AHORA), 'publicado');
  });

  it('programado: la fecha de publicación todavía no llegó', () => {
    assert.equal(estadoDeAnuncio(anuncio({ publishedAt: '2026-10-01T10:00:00.000Z' }), AHORA), 'programado');
  });

  it('vencido: la fecha de expiración ya pasó', () => {
    assert.equal(estadoDeAnuncio(anuncio({ expiresAt: '2026-09-14T10:00:00.000Z' }), AHORA), 'vencido');
  });

  it('retirado gana a vencido: es una decisión de alguien, no del reloj', () => {
    const retiradoYVencido = anuncio({ isActive: false, expiresAt: '2026-09-14T10:00:00.000Z' });
    assert.equal(estadoDeAnuncio(retiradoYVencido, AHORA), 'retirado');
  });

  it('el vencimiento justo en este instante ya no se muestra', () => {
    assert.equal(estadoDeAnuncio(anuncio({ expiresAt: AHORA.toISOString() }), AHORA), 'vencido');
  });

  it('la vitrina solo ve los publicados', () => {
    const lista = [
      anuncio({ id: 'ok' }),
      anuncio({ id: 'futuro', publishedAt: '2026-12-01T10:00:00.000Z' }),
      anuncio({ id: 'viejo', expiresAt: '2026-09-01T10:00:00.000Z' }),
      anuncio({ id: 'retirado', isActive: false }),
    ];
    assert.deepEqual(anunciosVisibles(lista, AHORA).map((a) => a.id), ['ok']);
  });
});

describe('V4.1 · orden del carrusel', () => {
  it('mayor prioridad primero y, a igual prioridad, el más reciente', () => {
    const lista = [
      anuncio({ id: 'viejo-alto', sortOrder: 10, publishedAt: '2026-09-01T10:00:00.000Z' }),
      anuncio({ id: 'bajo', sortOrder: 1, publishedAt: '2026-09-14T10:00:00.000Z' }),
      anuncio({ id: 'nuevo-alto', sortOrder: 10, publishedAt: '2026-09-12T10:00:00.000Z' }),
    ];
    assert.deepEqual(ordenarAnuncios(lista).map((a) => a.id), ['nuevo-alto', 'viejo-alto', 'bajo']);
  });

  it('no muta la lista que recibe', () => {
    const lista = [anuncio({ id: 'a', sortOrder: 1 }), anuncio({ id: 'b', sortOrder: 9 })];
    ordenarAnuncios(lista);
    assert.deepEqual(lista.map((a) => a.id), ['a', 'b']);
  });
});

describe('V4.1 · validación del anuncio', () => {
  function datos(parcial: Partial<DatosDeAnuncio> = {}): DatosDeAnuncio {
    return {
      title: 'Evento de aniversario',
      summary: null,
      body: null,
      imagePath: null,
      imageAlt: null,
      kind: 'evento',
      linkUrl: null,
      linkLabel: null,
      sortOrder: 0,
      isActive: true,
      publishedAt: '2026-09-15T10:00:00.000Z',
      expiresAt: null,
      ...parcial,
    };
  }

  it('un anuncio correcto no tiene errores', () => {
    assert.deepEqual(validarAnuncio(datos()), {});
  });

  it('exige título', () => {
    assert.ok(validarAnuncio(datos({ title: '   ' })).title);
  });

  it('rechaza un resumen más largo que el límite de la base', () => {
    assert.ok(validarAnuncio(datos({ summary: 'x'.repeat(301) })).summary);
  });

  it('rechaza un enlace que no sea http o https (un javascript: sería XSS)', () => {
    assert.ok(validarAnuncio(datos({ linkUrl: 'javascript:alert(1)' })).linkUrl);
    assert.ok(validarAnuncio(datos({ linkUrl: 'https://ejemplo.com/inscripcion' })).linkUrl === undefined);
  });

  it('el vencimiento tiene que ser posterior a la publicación', () => {
    const invalido = datos({ publishedAt: '2026-09-15T10:00:00.000Z', expiresAt: '2026-09-15T09:00:00.000Z' });
    assert.ok(validarAnuncio(invalido).expiresAt);
  });

  it('acota la prioridad', () => {
    assert.ok(validarAnuncio(datos({ sortOrder: -1 })).sortOrder);
    assert.ok(validarAnuncio(datos({ sortOrder: 10_000 })).sortOrder);
  });
});

describe('V4.1 · texto de la tarjeta', () => {
  it('usa el resumen cuando existe', () => {
    assert.equal(resumenDeTarjeta({ summary: 'Empieza el lunes', body: 'Otro texto' }), 'Empieza el lunes');
  });

  it('sin resumen cae al contenido', () => {
    assert.equal(resumenDeTarjeta({ summary: null, body: 'Contenido completo' }), 'Contenido completo');
  });

  it('corta por palabra y marca que sigue', () => {
    const largo = 'palabra '.repeat(40).trim();
    const corto = resumenDeTarjeta({ summary: largo, body: null }, 20);
    assert.ok(corto.endsWith('…'));
    assert.ok(corto.length <= 21);
    assert.ok(!corto.includes('  '));
  });

  it('sin nada que decir devuelve cadena vacía, no «undefined»', () => {
    assert.equal(resumenDeTarjeta({ summary: null, body: null }), '');
  });
});

describe('V4.1 · instalaciones por sucursal', () => {
  function area(id: string, branchCode?: string): FacilityItem {
    return {
      id,
      name: id,
      description: '',
      area: '',
      icon: 'dumbbell',
      stats: [],
      ...(branchCode === undefined ? {} : { branchCode }),
    };
  }

  const SEDES = [
    { code: 'LAVITA', name: 'Gold’s Gym Premium' },
    { code: 'GARITA', name: 'Gold Gym Body Garita' },
  ];

  it('REGRESIÓN: sin reparto declarado hay un solo grupo y no se pintan pestañas', () => {
    const grupos = agruparInstalacionesPorSede([area('pesas'), area('cardio')], SEDES);
    assert.equal(grupos.length, 1);
    assert.equal(necesitaPestanasDeSede(grupos), false);
    assert.deepEqual(grupos[0]?.facilities.map((f) => f.id), ['pesas', 'cardio']);
  });

  it('REGRESIÓN: sin sedes tampoco agrupa, aunque las áreas declaren código', () => {
    const grupos = agruparInstalacionesPorSede([area('pesas', 'LAVITA')], []);
    assert.equal(grupos.length, 1);
    assert.equal(necesitaPestanasDeSede(grupos), false);
  });

  it('con reparto declarado hay un grupo por sede, en el orden de la base', () => {
    const grupos = agruparInstalacionesPorSede(
      [area('pesas', 'LAVITA'), area('salon', 'GARITA')],
      SEDES,
    );
    assert.deepEqual(grupos.map((g) => g.code), ['LAVITA', 'GARITA']);
    assert.equal(necesitaPestanasDeSede(grupos), true);
    assert.deepEqual(grupos[0]?.facilities.map((f) => f.id), ['pesas']);
    assert.deepEqual(grupos[1]?.facilities.map((f) => f.id), ['salon']);
  });

  it('un área sin sede es de TODAS, y va después de lo propio de cada una', () => {
    const grupos = agruparInstalacionesPorSede(
      [area('vestuario'), area('pesas', 'LAVITA')],
      SEDES,
    );
    assert.deepEqual(grupos[0]?.facilities.map((f) => f.id), ['pesas', 'vestuario']);
    assert.deepEqual(grupos[1]?.facilities.map((f) => f.id), ['vestuario']);
  });

  it('un código que no corresponde a ninguna sede no desaparece: cae en todas', () => {
    const grupos = agruparInstalacionesPorSede(
      [area('pesas', 'LAVITA'), area('fantasma', 'NOEXISTE')],
      SEDES,
    );
    const todas = grupos.flatMap((g) => g.facilities.map((f) => f.id));
    assert.ok(todas.includes('fantasma'));
  });

  it('una sede sin nada que enseñar no genera pestaña vacía', () => {
    const grupos = agruparInstalacionesPorSede([area('pesas', 'LAVITA')], SEDES);
    assert.deepEqual(grupos.map((g) => g.code), ['LAVITA']);
    assert.equal(necesitaPestanasDeSede(grupos), false);
  });

  it('la pestaña dice cuántas áreas tiene, en singular y en plural', () => {
    assert.equal(describirGrupo({ code: 'A', name: 'A', facilities: [area('x')] }), '1 área');
    assert.equal(describirGrupo({ code: 'A', name: 'A', facilities: [area('x'), area('y')] }), '2 áreas');
  });
});
