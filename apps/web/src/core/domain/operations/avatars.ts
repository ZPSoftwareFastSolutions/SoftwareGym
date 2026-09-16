/**
 * CAPA: Domain / Operations
 *
 * Foto de perfil del socio (V4.2).
 *
 * PARA QUÉ EXISTE. El QR del socio es un token opaco y rotable (decisión 11):
 * identifica una ficha, no una cara. Quien presta su QR a un amigo hoy no
 * encuentra ningún obstáculo en el mostrador. La foto no es decoración del
 * panel: es lo que permite a recepción confirmar de un vistazo que quien pasa
 * el código es quien dice ser.
 *
 * Reglas puras, sin I/O. Los límites viven aquí y se repiten en el bucket:
 * el navegador reduce, el servidor comprueba los bytes y Storage corta.
 */

/** Formatos que el bucket admite. WebP primero: es a lo que reduce el navegador. */
export type TipoDeAvatar = 'image/webp' | 'image/jpeg' | 'image/png';

export const TIPOS_DE_AVATAR: readonly TipoDeAvatar[] = ['image/webp', 'image/jpeg', 'image/png'];

/**
 * 512 KB. No es una fotografía que haya que conservar: es un avatar para
 * reconocer una cara en un mostrador, y sube por una Server Action (que Vercel
 * corta en 4,5 MB). El navegador lo deja muy por debajo.
 */
export const TAMANO_MAXIMO_DE_AVATAR = 512 * 1024;

/** Lado del cuadrado al que reduce el navegador antes de subir. */
export const LADO_DE_AVATAR = 400;

export function esTipoDeAvatar(valor: unknown): valor is TipoDeAvatar {
  return typeof valor === 'string' && (TIPOS_DE_AVATAR as readonly string[]).includes(valor);
}

export const EXTENSION_DE_AVATAR: Readonly<Record<TipoDeAvatar, string>> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/**
 * Ruta dentro del bucket `avatares`.
 *
 * El ORDEN de los segmentos no es estético: las políticas de Storage sacan de
 * ahí el gimnasio (`app.tenant_de_ruta`) y el socio (`app.customer_de_ruta`)
 * para decidir quién puede leer y escribir. Cambiarlo rompe la autorización.
 */
export function rutaDeAvatar(tenantId: string, customerId: string, tipo: TipoDeAvatar, id: string): string {
  return `${tenantId}/${customerId}/${id}.${EXTENSION_DE_AVATAR[tipo]}`;
}

/** Mensaje de mostrador para un avatar que no se puede aceptar. */
export function motivoDeRechazo(bytes: number, tipo: string | null): string | null {
  if (tipo !== null && !esTipoDeAvatar(tipo)) {
    return 'Esa imagen no es JPG, PNG ni WebP. Si es una foto HEIC de iPhone, sube una captura de pantalla.';
  }
  if (bytes > TAMANO_MAXIMO_DE_AVATAR) {
    return 'La foto pesa demasiado. Vuelve a elegirla: se reduce sola antes de subirse.';
  }
  return null;
}

/**
 * Iniciales para cuando todavía no hay foto.
 *
 * Un hueco gris no dice nada; «JP» al menos confirma a recepción que la ficha
 * abierta es la que esperaba. Nunca devuelve vacío.
 */
export function inicialesDe(nombre: string): string {
  const partes = nombre
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p !== '');

  const primera = partes[0]?.charAt(0) ?? '';
  const segunda = partes.length > 1 ? (partes[partes.length - 1]?.charAt(0) ?? '') : '';
  const iniciales = `${primera}${segunda}`.toUpperCase();
  return iniciales === '' ? '?' : iniciales;
}
