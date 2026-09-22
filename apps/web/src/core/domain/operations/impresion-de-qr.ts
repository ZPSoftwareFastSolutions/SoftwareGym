/**
 * CAPA: Domain / Operations
 *
 * La tarjeta de QR que se imprime y se recorta (V5).
 *
 * POR QUÉ ESTO ES DOMINIO Y NO CSS. El PDF y la vista previa tienen que
 * enseñar LO MISMO, y antes no lo hacían: la vista previa se dibujaba siempre
 * con proporción A4 y el PDF se generaba en Carta u Oficio estirando esa
 * imagen, así que el QR salía achatado y las letras partidas. Aquí se calcula
 * la geometría UNA vez, en milímetros de la hoja real, y las dos la dibujan.
 *
 * Todo es aritmética pura y sin I/O: se puede probar sin navegador, que es lo
 * que hace que un fallo de maquetación se vea antes de llegar a la impresora.
 */

export type TamanoDeHoja = 'carta' | 'oficio' | 'a4';

export interface Hoja {
  readonly nombre: string;
  /** Milímetros reales: son los que entiende la impresora. */
  readonly ancho: number;
  readonly alto: number;
  /** Cómo se llama ese tamaño en el generador de PDF. */
  readonly formato: 'letter' | 'legal' | 'a4';
}

export const HOJAS: Readonly<Record<TamanoDeHoja, Hoja>> = {
  carta: { nombre: 'Carta', ancho: 215.9, alto: 279.4, formato: 'letter' },
  oficio: { nombre: 'Oficio', ancho: 215.9, alto: 330.2, formato: 'legal' },
  a4: { nombre: 'A4', ancho: 210, alto: 297, formato: 'a4' },
};

/** Doce tarjetas por hoja: el tamaño de una credencial que entra en una billetera. */
export const FILAS = 4;
export const COLUMNAS = 3;

/** Margen de la hoja: ninguna impresora doméstica imprime hasta el borde. */
export const MARGEN = 10;

export interface Recuadro {
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly alto: number;
}

export function celdaDeLaHoja(hoja: Hoja, fila: number, columna: number): Recuadro {
  const anchoUtil = hoja.ancho - MARGEN * 2;
  const altoUtil = hoja.alto - MARGEN * 2;
  const ancho = anchoUtil / COLUMNAS;
  const alto = altoUtil / FILAS;
  return {
    x: MARGEN + Math.min(Math.max(columna, 0), COLUMNAS - 1) * ancho,
    y: MARGEN + Math.min(Math.max(fila, 0), FILAS - 1) * alto,
    ancho,
    alto,
  };
}

/**
 * Dónde va cada cosa dentro de la tarjeta.
 *
 * El orden de arriba abajo es el de quien la mira: de qué gimnasio es, el
 * código que se escanea, de quién es, y el número por si el lector falla y hay
 * que teclearlo. Las alturas de texto se reservan ANTES de repartir el resto al
 * QR: así el código nunca empuja al QR fuera del recuadro, que es justo lo que
 * pasaba cuando el token de 24 caracteres se salía del marco.
 */
export interface DistribucionDeTarjeta {
  /** El marco de corte, ya con su holgura respecto a la celda. */
  readonly marco: Recuadro;
  readonly gimnasio: Recuadro;
  readonly qr: Recuadro;
  readonly nombre: Recuadro;
  readonly codigo: Recuadro;
  /** Una línea por grupo del token. */
  readonly token: readonly Recuadro[];
  /** Cuerpos de letra en puntos, ya proporcionales a la tarjeta. */
  readonly cuerpos: {
    readonly gimnasio: number;
    readonly nombre: number;
    readonly codigo: number;
    readonly token: number;
  };
}

/** Separación entre el borde de la celda y el marco de la tarjeta. */
const HOLGURA = 1.5;
/** Aire dentro del marco. */
const RELLENO = 3;

/**
 * El token se parte en grupos de seis: así se lee y se teclea sin perder el
 * sitio, y cabe en dos líneas en vez de desbordar el marco en una sola.
 */
export function gruposDelToken(token: string): readonly string[] {
  const limpio = token.trim().toUpperCase();
  return limpio.match(/.{1,6}/g) ?? [];
}

/** Las líneas del token, de dos grupos cada una. */
export function lineasDelToken(token: string): readonly string[] {
  const grupos = gruposDelToken(token);
  const lineas: string[] = [];
  for (let i = 0; i < grupos.length; i += 2) {
    lineas.push(grupos.slice(i, i + 2).join(' '));
  }
  return lineas;
}

export function distribucionDeTarjeta(celda: Recuadro, lineasDeToken: number): DistribucionDeTarjeta {
  const marco: Recuadro = {
    x: celda.x + HOLGURA,
    y: celda.y + HOLGURA,
    ancho: celda.ancho - HOLGURA * 2,
    alto: celda.alto - HOLGURA * 2,
  };

  const anchoUtil = marco.ancho - RELLENO * 2;
  const izquierda = marco.x + RELLENO;

  // Alturas de cada línea de texto (mm). Se reservan primero.
  const altoGimnasio = 3.6;
  const altoNombre = 4.2;
  const altoCodigo = 3.6;
  const altoLinea = 3.2;
  const altoToken = Math.max(0, lineasDeToken) * altoLinea;
  const separacion = 1.2;

  const reservado = altoGimnasio + altoNombre + altoCodigo + altoToken + separacion * 4;
  // Cuadrado siempre: un QR estirado no escanea. Si sobra alto, se centra.
  const ladoQr = Math.max(0, Math.min(anchoUtil, marco.alto - RELLENO * 2 - reservado));

  let y = marco.y + RELLENO;
  const gimnasio: Recuadro = { x: izquierda, y, ancho: anchoUtil, alto: altoGimnasio };
  y += altoGimnasio + separacion;

  const qr: Recuadro = { x: marco.x + (marco.ancho - ladoQr) / 2, y, ancho: ladoQr, alto: ladoQr };
  y += ladoQr + separacion;

  const nombre: Recuadro = { x: izquierda, y, ancho: anchoUtil, alto: altoNombre };
  y += altoNombre + separacion;

  const codigo: Recuadro = { x: izquierda, y, ancho: anchoUtil, alto: altoCodigo };
  y += altoCodigo + separacion;

  const token: Recuadro[] = [];
  for (let i = 0; i < lineasDeToken; i += 1) {
    token.push({ x: izquierda, y, ancho: anchoUtil, alto: altoLinea });
    y += altoLinea;
  }

  return {
    marco,
    gimnasio,
    qr,
    nombre,
    codigo,
    token,
    cuerpos: { gimnasio: 7, nombre: 9, codigo: 7.5, token: 6.5 },
  };
}

/**
 * Tramos horizontales de módulos oscuros de una fila del QR.
 *
 * Dibujar 841 cuadraditos sueltos infla el PDF y lo hace lento de abrir;
 * unir los módulos contiguos de cada fila da el MISMO dibujo con tres o
 * cuatro veces menos operaciones. Es exacto, no una aproximación: un tramo
 * cubre justo los módulos que estaban pintados.
 */
export interface TramoDeQr {
  readonly desde: number;
  readonly largo: number;
}

export function tramosDeFila(fila: readonly boolean[]): readonly TramoDeQr[] {
  const tramos: TramoDeQr[] = [];
  let desde = -1;
  for (let i = 0; i < fila.length; i += 1) {
    if (fila[i]) {
      if (desde < 0) desde = i;
    } else if (desde >= 0) {
      tramos.push({ desde, largo: i - desde });
      desde = -1;
    }
  }
  if (desde >= 0) tramos.push({ desde, largo: fila.length - desde });
  return tramos;
}

/** Un punto tipográfico en milímetros: el PDF mide en puntos y la vista previa, en mm. */
export const PUNTO_EN_MM = 0.352_778;

/**
 * Cuerpo de letra que hace caber un texto en un ancho dado.
 *
 * Es una ESTIMACIÓN para la vista previa: el ancho real de una letra solo lo
 * sabe quien tiene la fuente, y el PDF sí lo mide (`getTextWidth`) antes de
 * dibujar. Aquí basta con que la pantalla no prometa algo que el papel no
 * cumple: con el mismo texto, la previa encoge igual o un poco más.
 *
 * `factor` es el ancho medio de una letra en proporción al cuerpo: 0,52 para
 * la Helvetica en negrita y 0,60 para la monoespaciada del token.
 */
export function cuerpoQueCabe(texto: string, anchoDisponible: number, cuerpo: number, factor: number): number {
  const letras = texto.length;
  if (letras === 0 || anchoDisponible <= 0) return cuerpo;
  const anchoEstimado = letras * cuerpo * PUNTO_EN_MM * factor;
  if (anchoEstimado <= anchoDisponible) return cuerpo;
  return Math.max(4, (anchoDisponible / (letras * PUNTO_EN_MM * factor)));
}

/** Nombre del archivo, sin acentos ni espacios: viaja por correo y por WhatsApp. */
export function nombreDelArchivo(nombreDelSocio: string, codigo: string | null): string {
  const limpio = nombreDelSocio
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `qr-${codigo ? `${codigo}-` : ''}${limpio || 'socio'}.pdf`;
}
