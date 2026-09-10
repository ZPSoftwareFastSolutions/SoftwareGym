/**
 * CAPA: Domain / Operations
 *
 * Asistencia: registro de entrada, historial y estadística.
 */

/** Cómo se registró la entrada. Coincide con el enum `attendance_method`. */
export type MetodoDeAsistencia = 'manual' | 'qr' | 'kiosk';

export const NOMBRE_DE_METODO: Readonly<Record<MetodoDeAsistencia, string>> = {
  manual: 'Manual',
  qr: 'QR',
  kiosk: 'Tótem',
};

export interface RegistroDeAsistencia {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerCode: string | null;
  readonly checkedInAt: string;
  readonly attendanceDate: string;
  readonly method: MetodoDeAsistencia;
}

export interface EstadisticasDeAsistencia {
  readonly totalPeriodo: number;
  readonly promedioDiario: number;
  readonly mejorDia: { readonly dia: string; readonly visitas: number } | null;
  readonly horaPico: number | null;
  readonly diaMasFrecuente: string | null;
}

/**
 * Resultado de un intento de check-in.
 *
 * Es un tipo cerrado y no un `{ ok: boolean; mensaje: string }` porque cada
 * caso tiene una respuesta distinta en pantalla: repetido es informativo, no
 * es un error, y sin membresía es una venta, no un rechazo.
 */
export type ResultadoDeCheckIn =
  | { readonly tipo: 'registrado'; readonly socio: string; readonly hora: string; readonly diasRestantes: number | null }
  | { readonly tipo: 'repetido'; readonly socio: string; readonly hora: string }
  | { readonly tipo: 'sin-membresia'; readonly socio: string }
  | { readonly tipo: 'desconocido' }
  | { readonly tipo: 'error'; readonly mensaje: string };

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

/**
 * Estadística a partir de la serie diaria y las horas de entrada.
 *
 * Pura y sin I/O: es la parte que más fácil se rompe al cambiar el rango de
 * fechas, y aquí se puede probar sin base de datos.
 */
export function calcularEstadisticas(
  serie: readonly { readonly dia: string; readonly visitas: number }[],
  horas: readonly number[],
): EstadisticasDeAsistencia {
  const total = serie.reduce((suma, punto) => suma + punto.visitas, 0);

  // El promedio se divide entre los días del rango, NO entre los días con
  // visitas: si el gimnasio cerró una semana, esa semana cuenta como cero y
  // el promedio debe bajar. Dividir entre los días con actividad daría un
  // número bonito que oculta justo lo que hay que ver.
  const promedio = serie.length > 0 ? total / serie.length : 0;

  let mejorDia: { dia: string; visitas: number } | null = null;
  for (const punto of serie) {
    if (!mejorDia || punto.visitas > mejorDia.visitas) {
      mejorDia = { dia: punto.dia, visitas: punto.visitas };
    }
  }

  const conteoPorHora = new Map<number, number>();
  for (const hora of horas) {
    if (!Number.isInteger(hora) || hora < 0 || hora > 23) continue;
    conteoPorHora.set(hora, (conteoPorHora.get(hora) ?? 0) + 1);
  }
  let horaPico: number | null = null;
  let maximoHora = 0;
  for (const [hora, cuantas] of conteoPorHora) {
    if (cuantas > maximoHora) {
      maximoHora = cuantas;
      horaPico = hora;
    }
  }

  const conteoPorDia = new Map<number, number>();
  for (const punto of serie) {
    const fecha = new Date(`${punto.dia}T12:00:00Z`);
    if (Number.isNaN(fecha.getTime())) continue;
    const indice = fecha.getUTCDay();
    conteoPorDia.set(indice, (conteoPorDia.get(indice) ?? 0) + punto.visitas);
  }
  let diaMasFrecuente: string | null = null;
  let maximoDia = 0;
  for (const [indice, cuantas] of conteoPorDia) {
    if (cuantas > maximoDia) {
      maximoDia = cuantas;
      diaMasFrecuente = DIAS[indice] ?? null;
    }
  }

  return {
    totalPeriodo: total,
    promedioDiario: promedio,
    mejorDia,
    horaPico,
    diaMasFrecuente,
  };
}

/**
 * Racha de días consecutivos con asistencia, contada hacia atrás desde hoy.
 *
 * Tolera que hoy todavía no haya venido: si la última visita fue ayer, la
 * racha sigue viva. Cortarla a las 00:00 castigaría a quien entrena por la
 * mañana y aún no ha llegado.
 */
export function rachaDeDias(fechas: readonly string[], hoy: string): number {
  const conjunto = new Set(fechas);
  const inicio = new Date(`${hoy}T12:00:00Z`);
  if (Number.isNaN(inicio.getTime())) return 0;

  let racha = 0;
  let desplazamiento = conjunto.has(hoy) ? 0 : 1;

  // Si tampoco vino ayer, no hay racha que contar.
  if (desplazamiento === 1) {
    const ayer = new Date(inicio);
    ayer.setUTCDate(ayer.getUTCDate() - 1);
    if (!conjunto.has(ayer.toISOString().slice(0, 10))) return 0;
  }

  for (;;) {
    const dia = new Date(inicio);
    dia.setUTCDate(dia.getUTCDate() - desplazamiento);
    const clave = dia.toISOString().slice(0, 10);
    if (!conjunto.has(clave)) break;
    racha += 1;
    desplazamiento += 1;
    if (racha > 400) break; // Cinturón: nunca un bucle infinito en una página.
  }

  return racha;
}
