/**
 * CAPA: Presentation / Patterns
 *
 * Lo que se dibuja en el PDF de la tarjeta de QR (V5).
 *
 * Vive aparte del componente por una razón práctica: así el PDF se puede
 * generar fuera del navegador —con un script, contra un jsPDF de verdad— y
 * MIRARLO antes de publicarlo. Los tres defectos que tenía la versión anterior
 * (QR achatado, letras partidas, token fuera del marco) no se veían en la
 * pantalla: se veían en el papel.
 *
 * Recibe el documento ya creado; no lo guarda ni decide su nombre. Solo pinta.
 */

// Import RELATIVO y con extensión, no por alias: este módulo lo carga también
// la prueba que dibuja un PDF de verdad, y esa corre con `node --test`, sin
// empaquetador que resuelva `@core/*` ni que adivine la extensión. Es la misma
// razón por la que los módulos de dominio solo se importan tipos entre sí.
import {
  celdaDeLaHoja,
  distribucionDeTarjeta,
  lineasDelToken,
  tramosDeFila,
  type Hoja,
  type Recuadro,
} from '../../core/domain/operations/impresion-de-qr.ts';

/** Lo mínimo de jsPDF que se usa aquí, para no atar este módulo a su tipo completo. */
export interface LienzoDePdf {
  setFont(familia: string, estilo?: string): unknown;
  setFontSize(tamano: number): unknown;
  getTextWidth(texto: string): number;
  setTextColor(r: number, g: number, b: number): unknown;
  setDrawColor(r: number, g: number, b: number): unknown;
  setFillColor(r: number, g: number, b: number): unknown;
  setLineWidth(ancho: number): unknown;
  setLineDashPattern(patron: readonly number[], fase: number): unknown;
  rect(x: number, y: number, ancho: number, alto: number, estilo?: string): unknown;
  text(texto: string, x: number, y: number, opciones?: { align?: string; charSpace?: number }): unknown;
}

export interface DatosDeTarjetaQr {
  readonly hoja: Hoja;
  readonly fila: number;
  readonly columna: number;
  readonly gimnasio: string;
  readonly nombre: string;
  readonly codigo: string | null;
  readonly token: string;
  readonly matriz: readonly (readonly boolean[])[];
}

const NEGRO = [17, 17, 17] as const;
const GRIS = [110, 110, 110] as const;
const LINEA_DE_CORTE = [190, 190, 190] as const;

export function dibujarTarjetaQr(pdf: LienzoDePdf, datos: DatosDeTarjetaQr): void {
  const lineas = lineasDelToken(datos.token);
  const celda = celdaDeLaHoja(datos.hoja, datos.fila, datos.columna);
  const tarjeta = distribucionDeTarjeta(celda, lineas.length);

  // --- marco de corte
  pdf.setDrawColor(...LINEA_DE_CORTE);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([1.2, 1.2], 0);
  pdf.rect(tarjeta.marco.x, tarjeta.marco.y, tarjeta.marco.ancho, tarjeta.marco.alto);
  pdf.setLineDashPattern([], 0);

  /**
   * Escribe centrado en su recuadro, encogiendo hasta caber.
   *
   * La línea base va al PIE del recuadro reservado (`alto - 0.6`), no a su
   * borde superior: escribir en el borde superior era lo que hacía que las
   * letras con descendente —g, j, p— se vieran cortadas por la mitad.
   */
  const escribir = (
    texto: string,
    recuadro: Recuadro,
    cuerpo: number,
    familia: string,
    estilo: string,
    color: readonly [number, number, number],
    espaciado = 0,
  ) => {
    if (!texto) return;
    pdf.setFont(familia, estilo);
    pdf.setTextColor(color[0], color[1], color[2]);
    let tamano = cuerpo;
    pdf.setFontSize(tamano);
    const anchoDelTexto = () => pdf.getTextWidth(texto) + espaciado * Math.max(0, texto.length - 1);
    while (anchoDelTexto() > recuadro.ancho && tamano > 4) {
      tamano -= 0.25;
      pdf.setFontSize(tamano);
    }
    const opciones = espaciado > 0 ? { align: 'center', charSpace: espaciado } : { align: 'center' };
    pdf.text(texto, recuadro.x + recuadro.ancho / 2, recuadro.y + recuadro.alto - 0.6, opciones);
  };

  escribir(datos.gimnasio.toUpperCase(), tarjeta.gimnasio, tarjeta.cuerpos.gimnasio, 'helvetica', 'bold', NEGRO, 0.35);

  // --- QR: rectángulos desde la matriz, uniendo módulos contiguos
  const modulos = datos.matriz.length;
  if (modulos > 0 && tarjeta.qr.ancho > 0) {
    const lado = tarjeta.qr.ancho / modulos;
    pdf.setFillColor(...NEGRO);
    for (let fila = 0; fila < modulos; fila += 1) {
      const filaDeModulos = datos.matriz[fila];
      if (!filaDeModulos) continue;
      for (const tramo of tramosDeFila(filaDeModulos)) {
        pdf.rect(tarjeta.qr.x + tramo.desde * lado, tarjeta.qr.y + fila * lado, tramo.largo * lado, lado, 'F');
      }
    }
  }

  escribir(datos.nombre, tarjeta.nombre, tarjeta.cuerpos.nombre, 'helvetica', 'bold', NEGRO);
  if (datos.codigo) {
    escribir(datos.codigo, tarjeta.codigo, tarjeta.cuerpos.codigo, 'helvetica', 'normal', NEGRO, 0.2);
  }

  lineas.forEach((linea, indice) => {
    const recuadro = tarjeta.token[indice];
    if (recuadro) escribir(linea, recuadro, tarjeta.cuerpos.token, 'courier', 'normal', GRIS);
  });
}
