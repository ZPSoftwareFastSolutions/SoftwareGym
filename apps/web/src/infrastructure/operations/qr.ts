/**
 * CAPA: Infrastructure / Operations
 *
 * Generación de la matriz de un código QR.
 *
 * SOLO SERVIDOR. Se usa desde componentes de servidor y de ahí sale una
 * matriz de booleanos; la librería no entra en el paquete que descarga el
 * navegador. Por eso su tamaño no cuenta contra el presupuesto de bundle
 * (§2.9): el coste en el cliente es exactamente cero.
 *
 * POR QUÉ UNA DEPENDENCIA Y NO CÓDIGO PROPIO. En V1 se descartaron
 * `framer-motion`, una librería de iconos y `tailwind-merge` porque lo que
 * ahorraban se escribía en pocas líneas. Aquí no es el caso: un codificador
 * QR son unas cuatrocientas líneas de aritmética en GF(256) —Reed-Solomon,
 * información de formato con BCH, ocho máscaras y sus reglas de penalización—
 * y equivocarse produce un código que se ve perfecto y no escanea. Sin un
 * decodificador con el que comprobarlo, ese fallo se descubre en el mostrador
 * del gimnasio. La librería no tiene dependencias, está fijada a una versión
 * exacta y no llega al navegador.
 */

import qrcode from 'qrcode-generator';

/** Matriz de módulos: `true` es un módulo oscuro. */
export type MatrizQr = readonly (readonly boolean[])[];

/**
 * Nivel de corrección de errores.
 *
 * 'M' (~15 % recuperable) es el equilibrio habitual. El QR de un socio se
 * enseña en la pantalla de un teléfono, muchas veces con el brillo bajo y con
 * huellas encima: bajar a 'L' ahorraría unos módulos y empezaría a fallar
 * justo en esas condiciones.
 */
const CORRECCION = 'M' as const;

/** Tope de lo que se acepta codificar. Un QR gigante no se lee en pantalla. */
const LARGO_MAXIMO = 256;

export function matrizQr(contenido: string): MatrizQr | null {
  const texto = contenido.trim();
  if (!texto || texto.length > LARGO_MAXIMO) return null;

  try {
    // La versión 0 deja que la librería elija la más pequeña que quepa: el
    // token de check-in ocupa una versión 3 y no tiene sentido fijarla, que
    // el contenido puede cambiar de largo.
    const codigo = qrcode(0, CORRECCION);
    codigo.addData(texto);
    codigo.make();

    const lado = codigo.getModuleCount();
    const matriz: boolean[][] = [];
    for (let fila = 0; fila < lado; fila += 1) {
      const modulos: boolean[] = [];
      for (let columna = 0; columna < lado; columna += 1) {
        modulos.push(codigo.isDark(fila, columna));
      }
      matriz.push(modulos);
    }
    return matriz;
  } catch {
    // Un contenido que no cabe en ninguna versión no puede tumbar la página
    // del socio: se devuelve `null` y el componente enseña el código en texto,
    // que recepción siempre puede teclear.
    return null;
  }
}

/**
 * Convierte la matriz en el atributo `d` de un único `<path>`.
 *
 * Un `<rect>` por módulo son 841 nodos en un QR de versión 3, y con varios en
 * pantalla el navegador lo nota. Un solo camino pinta lo mismo con un nodo.
 * Devuelve una cadena de datos, no marcado: se pasa como prop y no hace falta
 * inyectar HTML en ningún sitio.
 */
export function caminoDeMatriz(matriz: MatrizQr): string {
  const trozos: string[] = [];
  for (let fila = 0; fila < matriz.length; fila += 1) {
    const modulos = matriz[fila];
    if (!modulos) continue;
    for (let columna = 0; columna < modulos.length; columna += 1) {
      if (modulos[columna]) trozos.push(`M${columna} ${fila}h1v1h-1z`);
    }
  }
  return trozos.join('');
}
