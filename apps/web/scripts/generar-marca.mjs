/**
 * Genera los recursos de marca de un gimnasio a partir de su logotipo maestro.
 *
 *   node scripts/generar-marca.mjs <slug> [--fondo=#0c0e0f]
 *
 * Entrada:  brand/<slug>/logo-plano.png   (PNG con transparencia, alta resolución)
 * Salida:   public/tenants/<slug>/
 *             logo.png          logotipo completo, recortado y aligerado
 *             isotipo.png       solo el símbolo, para la cabecera
 *             favicon.ico       16, 32 y 48 px en un solo archivo
 *             icon-192.png      Android y pestañas de alta densidad
 *             icon-512.png      instalación como aplicación
 *             apple-icon.png    180 px, opaco (iOS rellena la transparencia de negro)
 *
 * POR QUÉ UN SCRIPT Y NO ARCHIVOS EXPORTADOS A MANO. El maestro vive en el
 * repositorio y todo lo demás sale de él. Si el cliente manda otra versión del
 * logo, se reemplaza `logo-plano.png`, se vuelve a ejecutar esto y los seis
 * archivos quedan coherentes entre sí. Exportados a mano, el favicon acaba
 * siendo de una versión y la cabecera de otra.
 *
 * EL ISOTIPO SE DETECTA SOLO: es el primer bloque del logo separado del resto
 * por una franja horizontal vacía (en un logotipo apilado, el símbolo arriba y
 * el nombre debajo). Si un logo no sigue ese esquema, `--isotipo=x,y,ancho,alto`
 * fija el recorte a mano.
 *
 * Usa `sharp`, que ya viene instalado con Next.js: no añade dependencias.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const [slug, ...opciones] = process.argv.slice(2);
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Uso: node scripts/generar-marca.mjs <slug> [--fondo=#0c0e0f] [--isotipo=x,y,ancho,alto]');
  process.exit(1);
}

const opcion = (nombre) => opciones.find((o) => o.startsWith(`--${nombre}=`))?.split('=')[1];
const FONDO = opcion('fondo') ?? '#0c0e0f';
const ENTRADA = join(RAIZ, 'brand', slug, 'logo-plano.png');
const SALIDA = join(RAIZ, 'public', 'tenants', slug);

if (!existsSync(ENTRADA)) {
  console.error(`No existe ${ENTRADA}`);
  process.exit(1);
}
mkdirSync(SALIDA, { recursive: true });

// Un píxel cuenta como «dibujado» por encima de este alfa. Por debajo es la
// cola casi invisible de la sombra paralela, que no debe ensanchar el recorte.
const ALFA_MINIMO = 10;

/** Caja del contenido visible y los bloques verticales separados por franjas vacías. */
async function analizar(ruta) {
  const { data, info } = await sharp(ruta).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const filaConTinta = (y) => {
    let n = 0;
    for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > ALFA_MINIMO) n++;
    return n > 2;
  };

  const bloques = [];
  let inicio = -1;
  for (let y = 0; y < H; y++) {
    const tinta = filaConTinta(y);
    if (tinta && inicio < 0) inicio = y;
    if (!tinta && inicio >= 0) {
      bloques.push([inicio, y - 1]);
      inicio = -1;
    }
  }
  if (inicio >= 0) bloques.push([inicio, H - 1]);

  const cajaDe = (y0, y1) => {
    let x0 = W, x1 = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = 0; x < W; x++)
        if (data[(y * W + x) * 4 + 3] > ALFA_MINIMO) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
        }
    return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  };

  if (bloques.length === 0) throw new Error('El logotipo está vacío (todo transparente).');
  const primero = bloques[0];
  const ultimo = bloques[bloques.length - 1];

  return {
    todo: cajaDe(primero[0], ultimo[1]),
    isotipo: cajaDe(primero[0], primero[1]),
    bloques: bloques.length,
  };
}

/** PNG con paleta: los logotipos planos tienen pocos colores y así pesan una fracción. */
const pngLigero = (img) => img.png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 });

/** El isotipo centrado sobre un cuadrado del color de fondo de la marca. */
async function iconoCuadrado(isotipo, lado, { redondeado }) {
  const margen = Math.round(lado * 0.12);
  const interior = lado - margen * 2;
  const simbolo = await sharp(isotipo)
    .resize(interior, interior, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const radio = redondeado ? Math.round(lado * 0.22) : 0;
  const fondo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">` +
      `<rect width="${lado}" height="${lado}" rx="${radio}" ry="${radio}" fill="${FONDO}"/></svg>`,
  );

  return sharp(fondo).composite([{ input: simbolo, gravity: 'center' }]).png();
}

/**
 * Empaqueta varios PNG en un `.ico`. El formato admite PNG dentro desde Windows
 * Vista y todos los navegadores lo leen: no hace falta convertir a mapa de bits.
 */
function construirIco(pngs) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0);
  cabecera.writeUInt16LE(1, 2);
  cabecera.writeUInt16LE(pngs.length, 4);

  const entradas = [];
  let desplazamiento = 6 + 16 * pngs.length;
  for (const { lado, datos } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado >= 256 ? 0 : lado, 0);
    e.writeUInt8(lado >= 256 ? 0 : lado, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(datos.length, 8);
    e.writeUInt32LE(desplazamiento, 12);
    entradas.push(e);
    desplazamiento += datos.length;
  }
  return Buffer.concat([cabecera, ...entradas, ...pngs.map((p) => p.datos)]);
}

const analisis = await analizar(ENTRADA);
const recorteManual = opcion('isotipo')?.split(',').map(Number);
const cajaIsotipo = recorteManual
  ? { left: recorteManual[0], top: recorteManual[1], width: recorteManual[2], height: recorteManual[3] }
  : analisis.isotipo;

if (!recorteManual && analisis.bloques < 2) {
  console.warn('Aviso: el logo no tiene bloques separados; el isotipo será el logo entero. Usa --isotipo=x,y,ancho,alto.');
}

// --- Logotipo completo --------------------------------------------------
const logo = await pngLigero(
  sharp(ENTRADA).extract(analisis.todo).resize({ width: 640, withoutEnlargement: true }),
).toBuffer({ resolveWithObject: true });
writeFileSync(join(SALIDA, 'logo.png'), logo.data);

// --- Isotipo ------------------------------------------------------------
// 192 px de alto: la cabecera lo pinta a ~44 px, así que cubre pantallas 4×.
const isotipoMaestro = await sharp(ENTRADA).extract(cajaIsotipo).png().toBuffer();
const isotipo = await pngLigero(sharp(isotipoMaestro).resize({ height: 192, withoutEnlargement: true })).toBuffer({
  resolveWithObject: true,
});
writeFileSync(join(SALIDA, 'isotipo.png'), isotipo.data);

// --- Iconos -------------------------------------------------------------
// Todos se componen a 512 y se reducen: reducir la composición entera da mejor
// antialias en 16 px que componer directamente a ese tamaño.
const maestro512 = await (await iconoCuadrado(isotipoMaestro, 512, { redondeado: true })).toBuffer();
writeFileSync(join(SALIDA, 'icon-512.png'), await pngLigero(sharp(maestro512)).toBuffer());
writeFileSync(join(SALIDA, 'icon-192.png'), await pngLigero(sharp(maestro512).resize(192)).toBuffer());

const apple = await (await iconoCuadrado(isotipoMaestro, 180, { redondeado: false })).flatten({ background: FONDO }).toBuffer();
writeFileSync(join(SALIDA, 'apple-icon.png'), await pngLigero(sharp(apple)).toBuffer());

const tamanosIco = [16, 32, 48];
const pngsIco = await Promise.all(
  tamanosIco.map(async (lado) => ({
    lado,
    datos: await sharp(maestro512).resize(lado, lado, { kernel: 'lanczos3' }).png().toBuffer(),
  })),
);
writeFileSync(join(SALIDA, 'favicon.ico'), construirIco(pngsIco));

console.log(`Recursos de «${slug}» generados en public/tenants/${slug}/`);
console.log(`  logo.png     ${logo.info.width}×${logo.info.height}`);
console.log(`  isotipo.png  ${isotipo.info.width}×${isotipo.info.height}`);
console.log(`  favicon.ico  ${tamanosIco.join(', ')} px · icon-192/512 · apple-icon 180 · fondo ${FONDO}`);
console.log('Copia las dimensiones de logo e isotipo en `branding.logo` del archivo del gimnasio.');
