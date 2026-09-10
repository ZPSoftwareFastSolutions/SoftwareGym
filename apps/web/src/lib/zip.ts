/**
 * Escritor de archivos ZIP mínimo, sin compresión («stored»).
 *
 * POR QUÉ PROPIO Y POR QUÉ EN EL NAVEGADOR.
 *
 * Se arma en el navegador de quien descarga, no en el servidor: las funciones
 * de Vercel cortan las respuestas en 4,5 MB, y un día de comprobantes pasa de
 * eso con facilidad. Cada imagen viaja sola —bien por debajo del límite— y el
 * ZIP se junta en el cliente.
 *
 * Y es propio porque aquí, a diferencia del codificador QR, sí se puede
 * comprobar: se genera un ZIP y se abre con un descompresor independiente. Las
 * imágenes ya vienen comprimidas (JPEG, PNG, WebP), así que comprimirlas otra
 * vez no ahorra casi nada; sin compresión, el formato son tres cabeceras y un
 * CRC-32. Una librería de ZIP con Deflate pesaría diez veces esto.
 *
 * Límites del formato clásico, que no se alcanzan con comprobantes: 65 535
 * entradas y 4 GB.
 */

export interface EntradaDeZip {
  readonly nombre: string;
  readonly datos: Uint8Array;
  readonly fecha?: Date;
}

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

export function crc32(datos: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < datos.length; i += 1) {
    const byte = datos[i] ?? 0;
    crc = (TABLA_CRC[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Fecha y hora en el formato de MS-DOS que usa ZIP (resolución de 2 s, desde 1980). */
function fechaDos(fecha: Date): { hora: number; dia: number } {
  const anio = Math.max(1980, Math.min(2107, fecha.getFullYear()));
  return {
    hora: (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | Math.floor(fecha.getSeconds() / 2),
    dia: ((anio - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate(),
  };
}

export function crearZip(entradas: readonly EntradaDeZip[]): Uint8Array {
  if (entradas.length > 65_535) throw new Error('Demasiados archivos para un ZIP clásico.');

  const codificador = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const entrada of entradas) {
    // Barra normal y sin ruta absoluta ni `..`: un nombre como
    // `../../windows/x.jpg` escaparía de la carpeta al descomprimir en
    // algunos programas (zip slip).
    const seguro = entrada.nombre.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\.\//g, '');
    const nombre = codificador.encode(seguro);
    const { hora, dia } = fechaDos(entrada.fecha ?? new Date());
    const crc = crc32(entrada.datos);
    const tamano = entrada.datos.length;

    const local = new Uint8Array(30 + nombre.length);
    const vl = new DataView(local.buffer);
    vl.setUint32(0, 0x04034b50, true); // firma de cabecera local
    vl.setUint16(4, 20, true); // versión necesaria: 2.0
    vl.setUint16(6, 0x0800, true); // bit 11: nombres en UTF-8
    vl.setUint16(8, 0, true); // método 0: sin compresión
    vl.setUint16(10, hora, true);
    vl.setUint16(12, dia, true);
    vl.setUint32(14, crc, true);
    vl.setUint32(18, tamano, true); // tamaño comprimido
    vl.setUint32(22, tamano, true); // tamaño original
    vl.setUint16(26, nombre.length, true);
    vl.setUint16(28, 0, true); // sin campo extra
    local.set(nombre, 30);

    const central = new Uint8Array(46 + nombre.length);
    const vc = new DataView(central.buffer);
    vc.setUint32(0, 0x02014b50, true); // firma del directorio central
    vc.setUint16(4, 20, true); // hecho por: 2.0
    vc.setUint16(6, 20, true); // versión necesaria
    vc.setUint16(8, 0x0800, true);
    vc.setUint16(10, 0, true);
    vc.setUint16(12, hora, true);
    vc.setUint16(14, dia, true);
    vc.setUint32(16, crc, true);
    vc.setUint32(20, tamano, true);
    vc.setUint32(24, tamano, true);
    vc.setUint16(28, nombre.length, true);
    vc.setUint16(30, 0, true); // extra
    vc.setUint16(32, 0, true); // comentario
    vc.setUint16(34, 0, true); // disco
    vc.setUint16(36, 0, true); // atributos internos
    vc.setUint32(38, 0, true); // atributos externos
    vc.setUint32(42, desplazamiento, true); // dónde empieza su cabecera local
    central.set(nombre, 46);

    locales.push(local, entrada.datos);
    centrales.push(central);
    desplazamiento += local.length + tamano;
  }

  const tamanoCentral = centrales.reduce((suma, parte) => suma + parte.length, 0);
  const fin = new Uint8Array(22);
  const vf = new DataView(fin.buffer);
  vf.setUint32(0, 0x06054b50, true); // firma de fin de directorio central
  vf.setUint16(4, 0, true);
  vf.setUint16(6, 0, true);
  vf.setUint16(8, entradas.length, true);
  vf.setUint16(10, entradas.length, true);
  vf.setUint32(12, tamanoCentral, true);
  vf.setUint32(16, desplazamiento, true);
  vf.setUint16(20, 0, true);

  const total = desplazamiento + tamanoCentral + fin.length;
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const parte of [...locales, ...centrales, fin]) {
    zip.set(parte, cursor);
    cursor += parte.length;
  }
  return zip;
}
