/**
 * CAPA: Domain / Shared
 *
 * Paginación de listas largas (V4).
 *
 * POR QUÉ EN LA BASE Y NO EN EL NAVEGADOR. Las listas del panel traían hasta 500
 * u 800 filas «por si acaso» y las cortaban en silencio; una paginación que
 * ocultara filas ya descargadas seguiría pagando la consulta entera. Aquí solo
 * se calcula QUÉ tramo pedir (`desde`/`hasta` para `range` de PostgREST) y cómo
 * dibujar los números; la base devuelve ese tramo y el total.
 *
 * Todo lo que llega de la URL es texto de quien escribe la dirección: se valida
 * y se acota, nunca se confía.
 */

export interface Pagina<T> {
  readonly filas: readonly T[];
  /** Total de filas que cumplen el filtro, no las de esta página. */
  readonly total: number;
  readonly pagina: number;
  readonly porPagina: number;
}

export const FILAS_POR_PAGINA = 25;
/** Tope duro: ninguna pantalla pide más de esto de una vez aunque la URL lo diga. */
export const MAXIMO_POR_PAGINA = 100;
/** Una página más allá de esto es un enlace inventado, no navegación. */
const PAGINA_MAXIMA = 10_000;

/** Número de página desde `?pagina=`. Cualquier cosa que no sea un entero positivo es la 1. */
export function paginaDeLaUrl(valor: string | readonly string[] | undefined): number {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  if (typeof bruto !== 'string' || !/^[0-9]{1,5}$/.test(bruto.trim())) return 1;
  const numero = Number(bruto.trim());
  return numero >= 1 ? Math.min(numero, PAGINA_MAXIMA) : 1;
}

export function acotarPorPagina(porPagina: number | undefined): number {
  if (porPagina === undefined || !Number.isInteger(porPagina) || porPagina < 1) return FILAS_POR_PAGINA;
  return Math.min(porPagina, MAXIMO_POR_PAGINA);
}

/** Tramo inclusivo para `range(desde, hasta)`. */
export function rangoDePagina(pagina: number, porPagina: number): { readonly desde: number; readonly hasta: number } {
  const tamano = acotarPorPagina(porPagina);
  const numero = Number.isInteger(pagina) && pagina >= 1 ? Math.min(pagina, PAGINA_MAXIMA) : 1;
  const desde = (numero - 1) * tamano;
  return { desde, hasta: desde + tamano - 1 };
}

export function totalDePaginas(total: number, porPagina: number): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.ceil(total / acotarPorPagina(porPagina));
}

/**
 * Números a dibujar: siempre la primera, la última y dos alrededor de la actual;
 * los huecos se marcan con `null` («…»). Con siete o menos, todas.
 */
export function paginasVisibles(actual: number, total: number): readonly (number | null)[] {
  if (total <= 7) return Array.from({ length: Math.max(total, 1) }, (_, i) => i + 1);
  const pagina = Math.min(Math.max(actual, 1), total);
  const cercanas = new Set([1, total, pagina - 1, pagina, pagina + 1]);
  if (pagina <= 3) [2, 3, 4].forEach((n) => cercanas.add(n));
  if (pagina >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => cercanas.add(n));

  const ordenadas = [...cercanas].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida: (number | null)[] = [];
  ordenadas.forEach((n, i) => {
    const anterior = ordenadas[i - 1];
    if (anterior !== undefined && n - anterior > 1) salida.push(null);
    salida.push(n);
  });
  return salida;
}

/**
 * Una página de filas que YA están en el servidor. Solo para los reportes, cuyos
 * totales y gráfico necesitan el periodo entero: se ahorra dibujar y enviar al
 * navegador, no la consulta. Una página fuera de rango vuelve a la última.
 */
export function paginaDeFilas<T>(filas: readonly T[], pagina: number, porPagina: number): { readonly filas: readonly T[]; readonly pagina: number } {
  const tamano = acotarPorPagina(porPagina);
  const ultima = totalDePaginas(filas.length, tamano);
  const numero = Math.min(Math.max(Number.isInteger(pagina) ? pagina : 1, 1), ultima);
  const { desde } = rangoDePagina(numero, tamano);
  return { filas: filas.slice(desde, desde + tamano), pagina: numero };
}

/** «26–50 de 312». Sin filas, «0 resultados». */
export function describirTramo(pagina: number, porPagina: number, total: number, filasEnPagina: number): string {
  if (total <= 0 || filasEnPagina <= 0) return '0 resultados';
  const { desde } = rangoDePagina(pagina, porPagina);
  const primera = desde + 1;
  const ultima = desde + filasEnPagina;
  return `${primera}–${ultima} de ${total}`;
}

/**
 * La dirección de otra página conservando los filtros. Los parámetros vacíos se
 * omiten y la página 1 no se escribe: la URL de la lista sin paginar es la misma.
 */
export function consultaDePagina(
  parametros: Readonly<Record<string, string | readonly string[] | undefined>>,
  pagina: number,
): string {
  const salida = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (clave === 'pagina') continue;
    const primero = Array.isArray(valor) ? valor[0] : valor;
    if (typeof primero === 'string' && primero !== '') salida.set(clave, primero);
  }
  if (pagina > 1) salida.set('pagina', String(pagina));
  const texto = salida.toString();
  return texto ? `?${texto}` : '';
}
