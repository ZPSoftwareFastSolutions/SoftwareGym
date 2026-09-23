/**
 * Pruebas de V6 · tableros limpios al entrar.
 *
 * El encargo: que Recepción, Gerencia y Administración abran su tablero y vean
 * botones y resúmenes, no una pared de gráficas y tablas; que cada cosa pesada
 * espere a su «Ver»; y que «Últimas entradas» se hojee con `‹ ›` en vez de
 * encoger su tabla.
 *
 * Lo que aquí se afirma son las REGLAS, que viven en el dominio: qué panel
 * empieza abierto y cómo se reparte una lista corta en páginas. Las piezas de
 * pantalla solo las leen.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ordenDelTablero,
  panelesAbiertosAlCargar,
  profundidadDelBloque,
  ULTIMAS_ENTRADAS,
  type BloqueDeTablero,
  type EnfoqueDeTablero,
} from '../src/core/domain/operations/tablero.ts';
import { describirTramo, trocearEnPaginas } from '../src/core/domain/shared/paginacion.ts';

const PUESTOS: readonly EnfoqueDeTablero[] = ['mostrador', 'gerencia', 'administracion'];
const BLOQUES: readonly BloqueDeTablero[] = ['operacion', 'dinero', 'socios', 'sucursales'];

describe('V6 · qué se ve al abrir el tablero', () => {
  it('ningún puesto abre la página con una gráfica o una tabla desplegada', () => {
    // Un panel pesado está A LA VISTA al cargar solo si su bloque está abierto
    // y el panel también. La regla tiene que hacer imposible esa combinación.
    for (const puesto of PUESTOS) {
      for (const bloque of ordenDelTablero(puesto)) {
        const bloqueAbierto = profundidadDelBloque(puesto, bloque) === 'abierto';
        const panelAbierto = panelesAbiertosAlCargar(puesto, bloque);
        assert.ok(!(bloqueAbierto && panelAbierto), `${puesto} abre «${bloque}» con sus paneles desplegados`);
      }
    }
  });

  it('recepción ve la operación del día como resumen: sus dos minipaneles empiezan cerrados', () => {
    assert.equal(profundidadDelBloque('mostrador', 'operacion'), 'abierto');
    assert.equal(panelesAbiertosAlCargar('mostrador', 'operacion'), false);
  });

  it('gerencia y administración ven el dinero y la operación como tarjetas, con la curva cerrada', () => {
    for (const puesto of ['gerencia', 'administracion'] as const) {
      assert.equal(profundidadDelBloque(puesto, 'dinero'), 'abierto');
      assert.equal(panelesAbiertosAlCargar(puesto, 'dinero'), false);
      assert.equal(panelesAbiertosAlCargar(puesto, 'operacion'), false);
    }
  });

  it('quien abre un bloque plegado ve su contenido entero, sin un segundo clic', () => {
    // «Socios y membresías» empieza plegado en los tres puestos: abrirlo ya es
    // pedir el detalle, y sus paneles no deben volver a pedir «Ver».
    for (const puesto of PUESTOS) {
      assert.equal(profundidadDelBloque(puesto, 'socios'), 'plegado');
      assert.equal(panelesAbiertosAlCargar(puesto, 'socios'), true);
    }
    assert.equal(panelesAbiertosAlCargar('mostrador', 'dinero'), true);
  });

  it('la regla es la misma para todos los puestos y bloques: sin excepciones escondidas', () => {
    const todos: readonly EnfoqueDeTablero[] = ['mostrador', 'gerencia', 'administracion', 'socio', 'entrenador', 'plataforma'];
    for (const puesto of todos) {
      for (const bloque of BLOQUES) {
        assert.equal(panelesAbiertosAlCargar(puesto, bloque), profundidadDelBloque(puesto, bloque) === 'plegado');
      }
    }
  });

  it('plegar no es quitar: los cuatro bloques siguen en el orden de cada puesto', () => {
    for (const puesto of PUESTOS) {
      assert.deepEqual([...ordenDelTablero(puesto)].sort(), [...BLOQUES].sort());
    }
  });
});

describe('V6 · «Últimas entradas» se hojea, no se encoge', () => {
  it('trae una ventana acotada que se reparte en páginas completas', () => {
    assert.ok(ULTIMAS_ENTRADAS.porPagina > 0);
    assert.ok(ULTIMAS_ENTRADAS.total >= ULTIMAS_ENTRADAS.porPagina);
    assert.equal(ULTIMAS_ENTRADAS.total % ULTIMAS_ENTRADAS.porPagina, 0, 'la última página no debería quedar a medias');
  });

  it('la ventana llena da páginas del mismo tamaño', () => {
    const filas = Array.from({ length: ULTIMAS_ENTRADAS.total }, (_, i) => i);
    const paginas = trocearEnPaginas(filas, ULTIMAS_ENTRADAS.porPagina);
    assert.equal(paginas.length, ULTIMAS_ENTRADAS.total / ULTIMAS_ENTRADAS.porPagina);
    for (const pagina of paginas) assert.equal(pagina.length, ULTIMAS_ENTRADAS.porPagina);
  });
});

describe('V6 · trocearEnPaginas', () => {
  it('reparte en orden, sin perder ni repetir filas', () => {
    const filas = Array.from({ length: 12 }, (_, i) => `e${i}`);
    const paginas = trocearEnPaginas(filas, 5);
    assert.deepEqual(paginas.map((p) => p.length), [5, 5, 2]);
    assert.deepEqual(paginas.flat(), filas);
  });

  it('sin filas devuelve UNA página vacía, para que la pantalla no trate el caso aparte', () => {
    assert.deepEqual(trocearEnPaginas([], 5), [[]]);
  });

  it('una lista que cabe en una página es una sola página', () => {
    assert.deepEqual(trocearEnPaginas([1, 2, 3], 5), [[1, 2, 3]]);
  });

  it('un tamaño de página inválido cae al de siempre en vez de romper', () => {
    const filas = Array.from({ length: 30 }, (_, i) => i);
    assert.deepEqual(trocearEnPaginas(filas, 0).map((p) => p.length), [25, 5]);
    assert.deepEqual(trocearEnPaginas(filas, -3).map((p) => p.length), [25, 5]);
  });

  it('cada página se describe con su tramo real, también la última incompleta', () => {
    const filas = Array.from({ length: 12 }, (_, i) => i);
    const tramos = trocearEnPaginas(filas, 5).map((pagina, i) => describirTramo(i + 1, 5, filas.length, pagina.length));
    assert.deepEqual(tramos, ['1–5 de 12', '6–10 de 12', '11–12 de 12']);
  });
});
