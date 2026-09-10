/**
 * CAPA: Application / Ports
 *
 * Resultado de una operación que escribe.
 *
 * Las escrituras de gestión no lanzan hacia la presentación: devuelven un
 * resultado con un mensaje ya legible. Que un documento esté repetido o que un
 * comprobante ya lo haya revisado otra persona son casos del día a día del
 * mostrador, no averías, y una excepción los convertiría en una pantalla de
 * error.
 */

export type ResultadoDeOperacion<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly mensaje: string };

export function exito<T>(valor: T): ResultadoDeOperacion<T> {
  return { ok: true, valor };
}

export function fallo<T = never>(mensaje: string): ResultadoDeOperacion<T> {
  return { ok: false, mensaje };
}
