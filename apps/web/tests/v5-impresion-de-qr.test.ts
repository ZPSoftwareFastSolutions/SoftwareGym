/**
 * Pruebas de la tarjeta de QR impresa (V5).
 *
 * Existen por tres defectos que se vieron en el papel, no en la pantalla: el
 * token de 24 caracteres se salía del marco, el QR salía achatado al elegir
 * Carta u Oficio (la vista previa era siempre A4 y el PDF estiraba esa imagen)
 * y las letras aparecían partidas. Lo que se afirma aquí es que la geometría
 * CABE y es cuadrada; cómo se ve, se mira en el PDF generado.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  celdaDeLaHoja,
  COLUMNAS,
  cuerpoQueCabe,
  distribucionDeTarjeta,
  FILAS,
  gruposDelToken,
  HOJAS,
  lineasDelToken,
  MARGEN,
  nombreDelArchivo,
  PUNTO_EN_MM,
  tramosDeFila,
  type TamanoDeHoja,
} from '../src/core/domain/operations/impresion-de-qr.ts';

const TAMANOS: readonly TamanoDeHoja[] = ['carta', 'oficio', 'a4'];
const TOKEN = 'A1B2C3D4E5F6A7B8C9D0E1F2';

describe('V5 · la hoja y sus doce casillas', () => {
  it('cada tamaño es el de verdad, en milímetros', () => {
    assert.deepEqual([HOJAS.carta.ancho, HOJAS.carta.alto], [215.9, 279.4]);
    assert.deepEqual([HOJAS.oficio.ancho, HOJAS.oficio.alto], [215.9, 330.2]);
    assert.deepEqual([HOJAS.a4.ancho, HOJAS.a4.alto], [210, 297]);
  });

  it('ninguna casilla se sale de la hoja, en ningún tamaño', () => {
    for (const tamano of TAMANOS) {
      const hoja = HOJAS[tamano];
      for (let fila = 0; fila < FILAS; fila += 1) {
        for (let col = 0; col < COLUMNAS; col += 1) {
          const celda = celdaDeLaHoja(hoja, fila, col);
          assert.ok(celda.x >= MARGEN - 0.001, `${tamano} ${fila},${col} se sale por la izquierda`);
          assert.ok(celda.y >= MARGEN - 0.001, `${tamano} ${fila},${col} se sale por arriba`);
          assert.ok(celda.x + celda.ancho <= hoja.ancho - MARGEN + 0.001, `${tamano} ${fila},${col} se sale por la derecha`);
          assert.ok(celda.y + celda.alto <= hoja.alto - MARGEN + 0.001, `${tamano} ${fila},${col} se sale por abajo`);
        }
      }
    }
  });

  it('una posición inventada no rompe la hoja: se queda en la última casilla', () => {
    const celda = celdaDeLaHoja(HOJAS.a4, 99, 99);
    const ultima = celdaDeLaHoja(HOJAS.a4, FILAS - 1, COLUMNAS - 1);
    assert.deepEqual(celda, ultima);
  });
});

describe('V5 · la tarjeta cabe en su casilla', () => {
  it('el QR es CUADRADO en los tres tamaños de hoja', () => {
    // Un QR estirado es un QR que no escanea. Este era el defecto que más se
    // notaba al elegir Carta u Oficio.
    for (const tamano of TAMANOS) {
      const celda = celdaDeLaHoja(HOJAS[tamano], 1, 1);
      const tarjeta = distribucionDeTarjeta(celda, lineasDelToken(TOKEN).length);
      assert.equal(tarjeta.qr.ancho, tarjeta.qr.alto, `el QR de ${tamano} no es cuadrado`);
      assert.ok(tarjeta.qr.ancho > 20, `el QR de ${tamano} es demasiado pequeño para escanearse`);
    }
  });

  it('nada se sale del marco de corte, ni siquiera la última línea del token', () => {
    for (const tamano of TAMANOS) {
      const celda = celdaDeLaHoja(HOJAS[tamano], 0, 0);
      const tarjeta = distribucionDeTarjeta(celda, lineasDelToken(TOKEN).length);
      const piezas = [tarjeta.gimnasio, tarjeta.qr, tarjeta.nombre, tarjeta.codigo, ...tarjeta.token];
      for (const pieza of piezas) {
        assert.ok(pieza.x >= tarjeta.marco.x - 0.001, `${tamano}: una pieza se sale por la izquierda`);
        assert.ok(pieza.x + pieza.ancho <= tarjeta.marco.x + tarjeta.marco.ancho + 0.001, `${tamano}: una pieza se sale por la derecha`);
        assert.ok(pieza.y >= tarjeta.marco.y - 0.001, `${tamano}: una pieza se sale por arriba`);
        assert.ok(
          pieza.y + pieza.alto <= tarjeta.marco.y + tarjeta.marco.alto + 0.001,
          `${tamano}: una pieza se sale por abajo`,
        );
      }
    }
  });

  it('las piezas van en orden y no se pisan entre sí', () => {
    const celda = celdaDeLaHoja(HOJAS.carta, 2, 0);
    const tarjeta = distribucionDeTarjeta(celda, 2);
    const orden = [tarjeta.gimnasio, tarjeta.qr, tarjeta.nombre, tarjeta.codigo, ...tarjeta.token];
    for (let i = 1; i < orden.length; i += 1) {
      const anterior = orden[i - 1]!;
      const actual = orden[i]!;
      assert.ok(actual.y >= anterior.y + anterior.alto - 0.001, `la pieza ${i} se monta sobre la anterior`);
    }
  });

  it('el marco deja holgura dentro de su casilla, para poder recortar', () => {
    const celda = celdaDeLaHoja(HOJAS.a4, 0, 2);
    const tarjeta = distribucionDeTarjeta(celda, 2);
    assert.ok(tarjeta.marco.x > celda.x);
    assert.ok(tarjeta.marco.ancho < celda.ancho);
  });

  it('sin token la tarjeta sigue siendo válida y el QR se lleva ese espacio', () => {
    const celda = celdaDeLaHoja(HOJAS.carta, 0, 0);
    const conToken = distribucionDeTarjeta(celda, 2);
    const sinToken = distribucionDeTarjeta(celda, 0);
    assert.equal(sinToken.token.length, 0);
    assert.ok(sinToken.qr.ancho >= conToken.qr.ancho);
  });
});

describe('V5 · el token se lee y se teclea', () => {
  it('se parte en grupos de seis y en dos líneas', () => {
    assert.deepEqual(gruposDelToken(TOKEN), ['A1B2C3', 'D4E5F6', 'A7B8C9', 'D0E1F2']);
    assert.deepEqual(lineasDelToken(TOKEN), ['A1B2C3 D4E5F6', 'A7B8C9 D0E1F2']);
  });

  it('un token corto no inventa líneas vacías', () => {
    assert.deepEqual(lineasDelToken('ABC'), ['ABC']);
    assert.deepEqual(lineasDelToken(''), []);
  });
});

describe('V5 · el texto se encoge antes que desbordarse', () => {
  it('un nombre largo baja de cuerpo; uno corto no', () => {
    const ancho = 30;
    assert.equal(cuerpoQueCabe('Ana Paz', ancho, 9, 0.52), 9);
    const largo = cuerpoQueCabe('Maria Fernanda de los Angeles Villarroel', ancho, 9, 0.52);
    assert.ok(largo < 9);
    assert.ok(largo * PUNTO_EN_MM * 0.52 * 40 <= ancho + 0.001, 'el nombre encogido sigue sin caber');
  });

  it('nunca encoge por debajo de lo legible', () => {
    assert.ok(cuerpoQueCabe('x'.repeat(500), 10, 9, 0.52) >= 4);
  });
});

describe('V5 · el QR se dibuja por tramos, no módulo a módulo', () => {
  it('une los módulos contiguos de una fila', () => {
    assert.deepEqual(tramosDeFila([true, true, false, true]), [
      { desde: 0, largo: 2 },
      { desde: 3, largo: 1 },
    ]);
  });

  it('cubre exactamente los módulos oscuros, ni uno más', () => {
    const fila = [false, true, true, true, false, false, true];
    const cubiertos = new Set<number>();
    for (const tramo of tramosDeFila(fila)) {
      for (let i = tramo.desde; i < tramo.desde + tramo.largo; i += 1) cubiertos.add(i);
    }
    const esperados = fila.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    assert.deepEqual([...cubiertos].sort((a, b) => a - b), esperados);
  });

  it('una fila entera oscura es un solo tramo, y una vacía ninguno', () => {
    assert.deepEqual(tramosDeFila([true, true, true]), [{ desde: 0, largo: 3 }]);
    assert.deepEqual(tramosDeFila([false, false]), []);
  });
});

describe('V5 · el archivo que se descarga', () => {
  it('lleva el código del socio y su nombre sin acentos ni espacios', () => {
    assert.equal(nombreDelArchivo('María Fernández Solíz', 'GO-004'), 'qr-GO-004-Maria-Fernandez-Soliz.pdf');
    assert.equal(nombreDelArchivo('Ana', null), 'qr-Ana.pdf');
    assert.equal(nombreDelArchivo('   ', null), 'qr-socio.pdf');
  });
});
