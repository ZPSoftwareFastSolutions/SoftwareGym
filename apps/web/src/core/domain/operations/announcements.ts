/**
 * CAPA: Domain / Operations
 *
 * Anuncios del gimnasio (V4.1): los panfletos que publica en su sitio.
 *
 * Reglas puras, sin I/O. La base es la que decide qué se ve —su política deja
 * al anónimo solo lo activo, publicado y vigente—; esto existe para que la
 * pantalla pueda ANTICIPAR lo mismo sin preguntar, y para que el estado de un
 * anuncio («programado», «vencido») se calcule en un solo sitio.
 *
 * Es capacidad del PRODUCTO, no de un cliente: ningún gimnasio se nombra aquí.
 */

/** Para qué es el anuncio. Lista cerrada, igual que en la base (CHECK). */
export type TipoDeAnuncio =
  | 'clase'
  | 'evento'
  | 'promocion'
  | 'actividad'
  | 'novedad'
  | 'informacion'
  | 'comunicado';

export const TIPOS_DE_ANUNCIO: readonly TipoDeAnuncio[] = [
  'clase',
  'evento',
  'promocion',
  'actividad',
  'novedad',
  'informacion',
  'comunicado',
];

export const NOMBRE_DE_TIPO_DE_ANUNCIO: Readonly<Record<TipoDeAnuncio, string>> = {
  clase: 'Clase nueva',
  evento: 'Evento',
  promocion: 'Promoción',
  actividad: 'Actividad',
  novedad: 'Novedad',
  informacion: 'Información',
  comunicado: 'Comunicado',
};

export function esTipoDeAnuncio(valor: unknown): valor is TipoDeAnuncio {
  return typeof valor === 'string' && (TIPOS_DE_ANUNCIO as readonly string[]).includes(valor);
}

export const LARGO_MAXIMO_DE_TITULO = 160;
export const LARGO_MAXIMO_DE_RESUMEN = 300;

/** Un anuncio tal como lo ve el gimnasio en su panel. */
export interface Anuncio {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly body: string | null;
  /** Ruta dentro del bucket `anuncios`. La URL pública la arma el adaptador. */
  readonly imagePath: string | null;
  readonly imageAlt: string | null;
  readonly kind: TipoDeAnuncio;
  readonly linkUrl: string | null;
  readonly linkLabel: string | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
  /** ISO. Antes de esta fecha el anuncio existe pero no se publica. */
  readonly publishedAt: string;
  readonly expiresAt: string | null;
}

/**
 * Un anuncio tal como lo ve la vitrina: ya filtrado por la base, con la imagen
 * resuelta a una URL que el navegador puede pedir.
 */
export interface AnuncioPublico {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly body: string | null;
  readonly imageUrl: string | null;
  readonly imageAlt: string | null;
  readonly kind: TipoDeAnuncio;
  readonly linkUrl: string | null;
  readonly linkLabel: string | null;
  readonly publishedAt: string;
}

export type EstadoDeAnuncio = 'publicado' | 'programado' | 'vencido' | 'retirado';

export const NOMBRE_DE_ESTADO_DE_ANUNCIO: Readonly<Record<EstadoDeAnuncio, string>> = {
  publicado: 'Publicado',
  programado: 'Programado',
  vencido: 'Vencido',
  retirado: 'Retirado',
};

/**
 * En qué estado está un anuncio AHORA.
 *
 * El orden importa: «retirado» gana a todo lo demás porque es una decisión
 * explícita de alguien, mientras que «vencido» y «programado» son consecuencia
 * del reloj. Un anuncio retirado y además vencido se explica mejor por lo
 * primero: reactivarlo no bastaría.
 */
export function estadoDeAnuncio(anuncio: Anuncio, ahora: Date = new Date()): EstadoDeAnuncio {
  if (!anuncio.isActive) return 'retirado';
  const momento = ahora.getTime();
  if (anuncio.expiresAt !== null && Date.parse(anuncio.expiresAt) <= momento) return 'vencido';
  if (Date.parse(anuncio.publishedAt) > momento) return 'programado';
  return 'publicado';
}

/** Los que la vitrina mostraría ahora mismo. Es la regla de la base, replicada. */
export function anunciosVisibles(anuncios: readonly Anuncio[], ahora: Date = new Date()): readonly Anuncio[] {
  return anuncios.filter((a) => estadoDeAnuncio(a, ahora) === 'publicado');
}

/**
 * Orden de presentación: prioridad primero, y a igual prioridad el más
 * reciente. Es el mismo `order by` de la vista, escrito aquí para que una lista
 * ya cargada (la del panel) se reordene sin volver a consultar.
 */
export function ordenarAnuncios<T extends { readonly sortOrder: number; readonly publishedAt: string }>(
  anuncios: readonly T[],
): readonly T[] {
  return [...anuncios].sort((a, b) => {
    if (b.sortOrder !== a.sortOrder) return b.sortOrder - a.sortOrder;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}

export interface DatosDeAnuncio {
  readonly title: string;
  readonly summary: string | null;
  readonly body: string | null;
  readonly imagePath: string | null;
  readonly imageAlt: string | null;
  readonly kind: TipoDeAnuncio;
  readonly linkUrl: string | null;
  readonly linkLabel: string | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly publishedAt: string;
  readonly expiresAt: string | null;
}

/**
 * Validación de lo que llega del formulario. La base lo vuelve a comprobar con
 * sus CHECK; esto existe para decir QUÉ campo está mal, que un error 23514 no
 * lo dice.
 */
export function validarAnuncio(datos: DatosDeAnuncio): Readonly<Record<string, string>> {
  const errores: Record<string, string> = {};

  const titulo = datos.title.trim();
  if (titulo === '') errores.title = 'Escribe un título.';
  else if (titulo.length > LARGO_MAXIMO_DE_TITULO) {
    errores.title = `El título no puede pasar de ${LARGO_MAXIMO_DE_TITULO} caracteres.`;
  }

  if (datos.summary !== null && datos.summary.length > LARGO_MAXIMO_DE_RESUMEN) {
    errores.summary = `El resumen no puede pasar de ${LARGO_MAXIMO_DE_RESUMEN} caracteres. El texto largo va en el contenido.`;
  }

  if (!esTipoDeAnuncio(datos.kind)) errores.kind = 'Elige de qué es el anuncio.';

  // Solo http/https: un `javascript:` en un enlace de la vitrina es XSS, y la
  // base rechaza cualquier otra cosa con su CHECK.
  if (datos.linkUrl !== null && !/^https?:\/\/[^\s]{3,500}$/.test(datos.linkUrl)) {
    errores.linkUrl = 'El enlace tiene que empezar por http:// o https://.';
  }

  if (!Number.isInteger(datos.sortOrder) || datos.sortOrder < 0 || datos.sortOrder > 9999) {
    errores.sortOrder = 'La prioridad es un número entre 0 y 9999.';
  }

  if (Number.isNaN(Date.parse(datos.publishedAt))) {
    errores.publishedAt = 'La fecha de publicación no es válida.';
  }

  if (datos.expiresAt !== null) {
    if (Number.isNaN(Date.parse(datos.expiresAt))) {
      errores.expiresAt = 'La fecha de vencimiento no es válida.';
    } else if (Date.parse(datos.expiresAt) <= Date.parse(datos.publishedAt)) {
      errores.expiresAt = 'El vencimiento tiene que ser posterior a la publicación.';
    }
  }

  return errores;
}

/**
 * Qué se lee en la tarjeta del carrusel cuando no hay resumen: el principio del
 * contenido. Nunca corta una palabra por la mitad y no añade puntos suspensivos
 * si cabía entero.
 */
export function resumenDeTarjeta(anuncio: Pick<Anuncio, 'summary' | 'body'>, maximo = 140): string {
  const texto = (anuncio.summary ?? anuncio.body ?? '').replace(/\s+/g, ' ').trim();
  if (texto.length <= maximo) return texto;
  const cortado = texto.slice(0, maximo);
  const ultimoEspacio = cortado.lastIndexOf(' ');
  return `${(ultimoEspacio > maximo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd()}…`;
}
