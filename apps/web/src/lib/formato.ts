/**
 * Formato de fechas, horas e importes para la interfaz.
 *
 * Sin dependencias de servidor: lo usan igual las páginas y los componentes de
 * cliente. Todo en `es-BO`.
 */

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** `160 Bs`. Sin decimales cuando son cero: en el mostrador nadie dice «160,00». */
export function importe(valor: number, moneda = 'BOB'): string {
  const decimales = Number.isInteger(valor) ? 0 : 2;
  const cifra = valor.toLocaleString('es-BO', { minimumFractionDigits: decimales, maximumFractionDigits: 2 });
  return `${cifra} ${moneda === 'BOB' ? 'Bs' : moneda}`;
}

/**
 * `10 sep` a partir de `2026-09-10`.
 *
 * Se lee del TEXTO, sin construir un `Date`: una fecha sin zona convertida por
 * el motor de JavaScript cae en el día anterior en cualquier zona al oeste de
 * UTC, y La Paz lo está.
 */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso || !PATRON_FECHA.test(iso.slice(0, 10))) return iso ?? '—';
  const mes = MESES[Number(iso.slice(5, 7)) - 1];
  return mes ? `${iso.slice(8, 10)} ${mes}` : iso;
}

/** `10 de septiembre de 2026`. */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso || !PATRON_FECHA.test(iso.slice(0, 10))) return iso ?? '—';
  const mes = MESES_LARGOS[Number(iso.slice(5, 7)) - 1];
  return mes ? `${Number(iso.slice(8, 10))} de ${mes} de ${iso.slice(0, 4)}` : iso;
}

/**
 * Hora `18:04`.
 *
 * Si el texto ya viene en hora local del gimnasio —`2026-09-10T18:04:00`, sin
 * zona— se recorta tal cual: volver a convertirlo lo desplazaría. Solo un
 * instante con zona (`Z` o `+00:00`) se formatea con `Date`.
 */
export function hora(valor: string | null | undefined): string {
  if (!valor) return '';
  const local = /^\d{4}-\d{2}-\d{2}[T ](\d{2}:\d{2})(:\d{2}(\.\d+)?)?$/.exec(valor);
  if (local?.[1]) return local[1];
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Fecha de hoy en una zona horaria IANA, como `YYYY-MM-DD`. */
export function hoyEnZona(zona: string): string {
  try {
    // `en-CA` formatea como AAAA-MM-DD, que es justo el ISO que se necesita.
    return new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
