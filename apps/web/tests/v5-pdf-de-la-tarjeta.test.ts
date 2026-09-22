/**
 * Pruebas del PDF de la tarjeta de QR (V5).
 *
 * Aquí no se mide geometría en abstracto: se ejecuta `dibujarTarjetaQr`, el
 * MISMO código que corre en el navegador al pulsar «Descargar PDF», contra un
 * lienzo de mentira que apunta cada orden de dibujo. Después se comprueba
 * dónde cayó cada cosa.
 *
 * Es la respuesta a lo que se vio en el papel y no en la pantalla: el token de
 * 24 caracteres saliéndose del marco, las letras partidas por la mitad y el QR
 * achatado. Un defecto así no lo encuentra un typecheck; lo encuentra saber
 * en qué coordenada acabó cada trazo.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  celdaDeLaHoja,
  distribucionDeTarjeta,
  HOJAS,
  lineasDelToken,
  type TamanoDeHoja,
} from '../src/core/domain/operations/impresion-de-qr.ts';
import { dibujarTarjetaQr, type LienzoDePdf } from '../src/presentation/patterns/qr-pdf.ts';

const TOKEN = 'A1B2C3D4E5F6A7B8C9D0E1F2';

/** Un QR de 25×25 con un patrón cualquiera: lo que importa es dónde se dibuja. */
const MATRIZ = Array.from({ length: 25 }, (_, f) => Array.from({ length: 25 }, (_, c) => (f + c) % 3 !== 0));

interface RectanguloDibujado {
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly alto: number;
  readonly relleno: boolean;
}

interface TextoDibujado {
  readonly texto: string;
  readonly x: number;
  readonly y: number;
  readonly cuerpo: number;
  readonly familia: string;
}

/** Lienzo de mentira: anota lo que le piden en vez de dibujarlo. */
function lienzo() {
  const rectangulos: RectanguloDibujado[] = [];
  const textos: TextoDibujado[] = [];
  let cuerpo = 10;
  let familia = 'helvetica';

  const pdf: LienzoDePdf = {
    setFont: (f) => void (familia = f),
    setFontSize: (t) => void (cuerpo = t),
    // Ancho aproximado de Helvetica: sirve para que el encogido se comporte
    // como en el navegador sin necesitar las métricas reales de la fuente.
    getTextWidth: (texto: string) => texto.length * cuerpo * 0.352_778 * 0.52,
    setTextColor: () => undefined,
    setDrawColor: () => undefined,
    setFillColor: () => undefined,
    setLineWidth: () => undefined,
    setLineDashPattern: () => undefined,
    rect: (x, y, ancho, alto, estilo) => void rectangulos.push({ x, y, ancho, alto, relleno: estilo === 'F' }),
    text: (texto, x, y) => void textos.push({ texto, x, y, cuerpo, familia }),
  };

  return { pdf, rectangulos, textos };
}

function dibujar(tamano: TamanoDeHoja, fila: number, columna: number, nombre: string, codigo: string | null = 'GO-004') {
  const { pdf, rectangulos, textos } = lienzo();
  dibujarTarjetaQr(pdf, {
    hoja: HOJAS[tamano],
    fila,
    columna,
    gimnasio: "Gold's Gym Premium",
    nombre,
    codigo,
    token: TOKEN,
    matriz: MATRIZ,
  });
  const celda = celdaDeLaHoja(HOJAS[tamano], fila, columna);
  const tarjeta = distribucionDeTarjeta(celda, lineasDelToken(TOKEN).length);
  return { rectangulos, textos, tarjeta };
}

describe('V5 · el PDF dibuja dentro del marco', () => {
  it('ningún texto se sale del marco de corte, en ningún tamaño de hoja', () => {
    for (const tamano of ['carta', 'oficio', 'a4'] as const) {
      const { textos, tarjeta } = dibujar(tamano, 1, 1, 'Valeria Mamani Quispe');
      const izquierda = tarjeta.marco.x;
      const derecha = tarjeta.marco.x + tarjeta.marco.ancho;
      for (const texto of textos) {
        // El texto va centrado: su mitad no puede pasar de ningún borde.
        const mitad = (texto.texto.length * texto.cuerpo * 0.352_778 * 0.6) / 2;
        assert.ok(texto.x - mitad >= izquierda - 0.5, `${tamano}: «${texto.texto}» se sale por la izquierda`);
        assert.ok(texto.x + mitad <= derecha + 0.5, `${tamano}: «${texto.texto}» se sale por la derecha`);
        assert.ok(texto.y >= tarjeta.marco.y, `${tamano}: «${texto.texto}» se dibuja encima del marco`);
        assert.ok(texto.y <= tarjeta.marco.y + tarjeta.marco.alto, `${tamano}: «${texto.texto}» cae fuera por abajo`);
      }
    }
  });

  it('el token entero se imprime, partido en dos líneas y dentro del marco', () => {
    const { textos, tarjeta } = dibujar('carta', 0, 0, 'Ana Paz');
    const delToken = textos.filter((t) => t.familia === 'courier');
    assert.equal(delToken.length, 2, 'el token debería ocupar dos líneas');
    assert.equal(delToken.map((t) => t.texto.replace(' ', '')).join(''), TOKEN);
    for (const linea of delToken) {
      assert.ok(linea.y <= tarjeta.marco.y + tarjeta.marco.alto, 'una línea del token cae fuera del marco');
    }
  });

  it('un nombre larguísimo encoge en vez de desbordarse', () => {
    const corto = dibujar('carta', 0, 0, 'Ana Paz');
    const largo = dibujar('carta', 0, 0, 'Maria Fernanda de los Angeles Villarroel Chuquimia');
    const cuerpoCorto = corto.textos.find((t) => t.texto === 'Ana Paz')?.cuerpo ?? 0;
    const cuerpoLargo = largo.textos.find((t) => t.texto.startsWith('Maria Fernanda'))?.cuerpo ?? 0;
    assert.ok(cuerpoCorto > 0 && cuerpoLargo > 0);
    assert.ok(cuerpoLargo < cuerpoCorto, 'el nombre largo debería dibujarse más pequeño');
    assert.ok(cuerpoLargo >= 4, 'no puede encoger hasta ser ilegible');
  });

  it('cada línea de texto se escribe por debajo de la anterior: nada se monta', () => {
    const { textos } = dibujar('a4', 2, 1, 'Valeria Mamani Quispe');
    for (let i = 1; i < textos.length; i += 1) {
      assert.ok(textos[i]!.y > textos[i - 1]!.y, 'dos textos comparten línea base');
    }
  });
});

describe('V5 · el QR sale cuadrado y completo', () => {
  it('su recuadro es cuadrado y cabe en el marco, en los tres tamaños', () => {
    for (const tamano of ['carta', 'oficio', 'a4'] as const) {
      const { rectangulos, tarjeta } = dibujar(tamano, 0, 2, 'Ana Paz');
      const modulos = rectangulos.filter((r) => r.relleno);
      assert.ok(modulos.length > 0, `${tamano}: no se dibujó ningún módulo`);

      const x0 = Math.min(...modulos.map((r) => r.x));
      const y0 = Math.min(...modulos.map((r) => r.y));
      const x1 = Math.max(...modulos.map((r) => r.x + r.ancho));
      const y1 = Math.max(...modulos.map((r) => r.y + r.alto));

      // Cuadrado: un QR estirado no escanea. Se admite el margen de los
      // módulos claros del borde, que no se dibujan.
      const ancho = x1 - x0;
      const alto = y1 - y0;
      assert.ok(Math.abs(ancho - alto) < 0.2, `${tamano}: el QR no es cuadrado (${ancho} × ${alto})`);

      assert.ok(x0 >= tarjeta.marco.x, `${tamano}: el QR se sale por la izquierda`);
      assert.ok(x1 <= tarjeta.marco.x + tarjeta.marco.ancho, `${tamano}: el QR se sale por la derecha`);
      assert.ok(y0 >= tarjeta.marco.y, `${tamano}: el QR se sale por arriba`);
      assert.ok(y1 <= tarjeta.marco.y + tarjeta.marco.alto, `${tamano}: el QR se sale por abajo`);
    }
  });

  it('los módulos oscuros se dibujan todos, agrupados en tramos', () => {
    const { rectangulos } = dibujar('carta', 0, 0, 'Ana Paz');
    const modulos = rectangulos.filter((r) => r.relleno);
    const oscuros = MATRIZ.flat().filter(Boolean).length;
    const dibujados = modulos.reduce((suma, r) => suma + Math.round(r.ancho / modulos[0]!.alto), 0);
    assert.equal(dibujados, oscuros, 'los tramos no cubren los mismos módulos que la matriz');
    assert.ok(modulos.length < oscuros, 'los tramos deberían ser menos que los módulos sueltos');
  });

  it('el marco de corte se dibuja sin relleno, para que no tape nada', () => {
    const { rectangulos, tarjeta } = dibujar('carta', 0, 0, 'Ana Paz');
    const marco = rectangulos.find((r) => !r.relleno);
    assert.ok(marco, 'falta el marco de corte');
    assert.equal(marco.x, tarjeta.marco.x);
    assert.equal(marco.ancho, tarjeta.marco.ancho);
  });
});
