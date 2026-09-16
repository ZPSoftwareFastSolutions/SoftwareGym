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
  /** Sede donde ocurrió. `null` en el histórico anterior a V3.0, que no la guardó. */
  readonly branchId: string | null;
  readonly branchName: string | null;
  /**
   * Membresía vigente ese día, DERIVADA en la base (no se guarda). `null` si
   * entró sin membresía vigente: la entrada se registra igual (decisión 12).
   */
  readonly membershipId: string | null;
}

/** V4 · Entradas de 30 días agregadas por la base: día ISO (1 = lunes), hora local, método y sede. */
export interface PatronDeAsistencia {
  readonly diaIso: number;
  readonly hora: number;
  readonly metodo: MetodoDeAsistencia;
  readonly branchId: string | null;
  readonly branchName: string | null;
  readonly veces: number;
}

export interface ResumenDePatrones {
  readonly total: number;
  /** 7 filas (lunes a domingo) × las horas pedidas. */
  readonly calor: readonly (readonly number[])[];
  readonly porHora: ReadonlyMap<number, number>;
  readonly porMetodo: ReadonlyMap<MetodoDeAsistencia, number>;
  readonly horaPico: number | null;
  /** Índice 0 = lunes; `null` sin entradas. */
  readonly diaPico: number | null;
}

/**
 * Mapa de calor, reparto por hora y por método a partir de los conteos que ya
 * agregó la base. Antes se contaban aquí las 500 últimas filas enteras, y con
 * más entradas que eso las estadísticas «de 30 días» eran de los últimos días.
 */
export function resumirPatrones(patrones: readonly PatronDeAsistencia[], horas: readonly number[]): ResumenDePatrones {
  const calor = Array.from({ length: 7 }, () => horas.map(() => 0));
  const porHora = new Map<number, number>();
  const porMetodo = new Map<MetodoDeAsistencia, number>();
  let total = 0;
  for (const patron of patrones) {
    if (!Number.isInteger(patron.veces) || patron.veces <= 0) continue;
    total += patron.veces;
    porHora.set(patron.hora, (porHora.get(patron.hora) ?? 0) + patron.veces);
    porMetodo.set(patron.metodo, (porMetodo.get(patron.metodo) ?? 0) + patron.veces);
    const fila = calor[patron.diaIso - 1];
    const columna = horas.indexOf(patron.hora);
    if (fila && columna >= 0) fila[columna] = (fila[columna] ?? 0) + patron.veces;
  }

  let horaPico: number | null = null;
  for (const [hora, veces] of porHora) {
    if (horaPico === null || veces > (porHora.get(horaPico) ?? 0) || (veces === porHora.get(horaPico) && hora < horaPico)) horaPico = hora;
  }

  const porDia = Array.from({ length: 7 }, () => 0);
  for (const patron of patrones) {
    if (patron.diaIso >= 1 && patron.diaIso <= 7 && patron.veces > 0) porDia[patron.diaIso - 1] = (porDia[patron.diaIso - 1] ?? 0) + patron.veces;
  }
  const maximo = Math.max(...porDia);
  const diaPico = maximo > 0 ? porDia.indexOf(maximo) : null;

  return { total, calor, porHora, porMetodo, horaPico, diaPico };
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
/**
 * Quién es quien acaba de pasar el QR (V4.2).
 *
 * Va aparte del resultado porque acompaña a los tres desenlaces en que hay una
 * persona identificada, y porque lo que el mostrador necesita ver es siempre lo
 * mismo: cara, nombre, código y estado. **Todo sale del BACKEND**: el QR solo
 * lleva un token opaco y nada de lo que viaja desde el navegador decide qué se
 * muestra aquí.
 */
export interface IdentidadDeSocio {
  readonly nombre: string;
  /** Código correlativo visible (`MF-001`). Confirma la ficha sin exponer el id. */
  readonly codigo: string | null;
  /** URL firmada y de corta duración. `null` si el socio aún no subió foto. */
  readonly fotoUrl: string | null;
  /** Días seguidos entrenando, para saludar con algo que el socio reconoce. */
  readonly racha: number;
}

export type ResultadoDeCheckIn =
  | {
      readonly tipo: 'registrado';
      readonly socio: string;
      readonly hora: string;
      readonly diasRestantes: number | null;
      readonly sucursal: string;
      readonly identidad: IdentidadDeSocio;
    }
  /** `sucursal` y `hora` son las de la entrada que YA tenía hoy, que puede ser de otra sede. */
  | {
      readonly tipo: 'repetido';
      readonly socio: string;
      readonly hora: string;
      readonly sucursal: string | null;
      readonly identidad: IdentidadDeSocio;
    }
  | {
      readonly tipo: 'sin-membresia';
      readonly socio: string;
      readonly sucursal: string;
      readonly identidad: IdentidadDeSocio;
    }
  | { readonly tipo: 'desconocido' }
  | { readonly tipo: 'error'; readonly mensaje: string };

/** Si este resultado trae a alguien identificado (y, por tanto, hay modal que enseñar). */
export function identidadDelResultado(resultado: ResultadoDeCheckIn): IdentidadDeSocio | null {
  return resultado.tipo === 'registrado' || resultado.tipo === 'repetido' || resultado.tipo === 'sin-membresia'
    ? resultado.identidad
    : null;
}

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
