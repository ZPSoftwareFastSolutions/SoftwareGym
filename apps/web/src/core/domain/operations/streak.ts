/**
 * CAPA: Domain / Operations
 *
 * Racha de asistencia.
 *
 * QUÉ CUENTA COMO RACHA. Días seguidos con entrada, con dos reglas que la
 * primera versión no tenía y que son las que la hacen justa:
 *
 * 1. **Un día que el gimnasio está CERRADO no rompe la racha.** Sale del
 *    horario de la configuración del propio gimnasio. Si un gimnasio cierra
 *    los domingos, ir de lunes a sábado dos semanas seguidas son doce días de
 *    racha, no dos rachas de seis. Castigar al socio por un día en que no
 *    podía entrar es exactamente lo que hace que deje de mirar el contador.
 * 2. **Hoy no rompe la racha hasta que termina.** Quien entrena por la tarde
 *    no puede ver su racha a cero a las diez de la mañana. Hoy pendiente
 *    cuenta como «en riesgo», no como «rota».
 *
 * Pura y sin I/O: se prueba sin base de datos y la usan igual el panel del
 * socio y la ficha que ve recepción.
 */

export interface DiaDeCalendario {
  readonly fecha: string;
  readonly asistio: boolean;
  readonly cerrado: boolean;
  readonly futuro: boolean;
  readonly hoy: boolean;
}

/**
 * - `viva`: hoy ya entró (o hoy el gimnasio cierra y la racha sigue).
 * - `en-riesgo`: tiene racha pero hoy todavía no vino.
 * - `rota`: tiene visitas, pero la última racha se cortó.
 * - `sin-visitas`: nunca registró una entrada.
 */
export type EstadoDeRacha = 'viva' | 'en-riesgo' | 'rota' | 'sin-visitas';

export interface ResumenDeRacha {
  readonly actual: number;
  readonly mejor: number;
  readonly estado: EstadoDeRacha;
  readonly ultimaVisita: string | null;
  /** Semanas de lunes a domingo, de la más antigua a la actual. */
  readonly semanas: readonly (readonly DiaDeCalendario[])[];
  readonly visitasEnCalendario: number;
}

const DIA_MS = 86_400_000;

/** Tope de días recorridos. Una página nunca puede quedar en un bucle. */
const TOPE_DE_DIAS = 800;

/** Índice de `Date.getUTCDay()` para cada nombre de día del horario. */
const INDICE_DE_DIA: Readonly<Record<string, number>> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
};

function aFecha(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  // Mediodía UTC: lejos de la medianoche, ningún desfase horario del motor
  // puede mover la fecha al día anterior o al siguiente.
  const fecha = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function iso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA_MS);
}

/**
 * Días de la semana (0 = domingo) en que el gimnasio no abre, según su horario.
 *
 * Un nombre de día que no se reconoce se ignora: mejor contar un día cerrado
 * como abierto —la racha se corta de más— que al revés —una racha que nunca se
 * corta y deja de significar algo—.
 */
export function diasCerradosDelHorario(
  semana: readonly { readonly day: string; readonly closed: boolean }[],
): readonly number[] {
  return semana
    .filter((dia) => dia.closed)
    .map((dia) => INDICE_DE_DIA[dia.day.trim().toLowerCase()])
    .filter((indice): indice is number => typeof indice === 'number');
}

export function calcularRacha(
  fechas: readonly string[],
  hoy: string,
  cerrados: readonly number[] = [],
  semanasDeCalendario = 12,
): ResumenDeRacha {
  const base = aFecha(hoy);
  const conjunto = new Set(fechas.filter((fecha) => aFecha(fecha) !== null && fecha <= hoy));
  const diasCerrados = new Set(cerrados);

  const vacio: ResumenDeRacha = {
    actual: 0,
    mejor: 0,
    estado: 'sin-visitas',
    ultimaVisita: null,
    semanas: [],
    visitasEnCalendario: 0,
  };
  if (!base) return vacio;

  // Un horario con los siete días cerrados no tiene racha posible, y sin este
  // corte el recorrido hacia atrás no encontraría nunca un día abierto.
  const todoCerrado = diasCerrados.size >= 7;
  const estaCerrado = (fecha: Date) => !todoCerrado && diasCerrados.has(fecha.getUTCDay());

  // --- Racha actual ---
  const hoyAsistio = conjunto.has(hoy);
  let cursor = hoyAsistio ? base : sumarDias(base, -1);
  let actual = 0;
  for (let paso = 0; paso < TOPE_DE_DIAS; paso += 1) {
    const clave = iso(cursor);
    if (conjunto.has(clave)) {
      actual += 1;
    } else if (!estaCerrado(cursor)) {
      break;
    }
    // Un día cerrado SIN entrada se salta: ni suma ni corta. Uno cerrado CON
    // entrada —un feriado que abrió— sí suma.
    cursor = sumarDias(cursor, -1);
  }

  // --- Mejor racha ---
  const ordenadas = [...conjunto].sort();
  const primera = ordenadas[0];
  const ultimaVisita = ordenadas[ordenadas.length - 1] ?? null;

  let mejor = 0;
  if (primera) {
    let dia = aFecha(primera);
    let corrida = 0;
    for (let paso = 0; dia && paso < TOPE_DE_DIAS; paso += 1) {
      const clave = iso(dia);
      if (clave > hoy) break;
      if (conjunto.has(clave)) {
        corrida += 1;
        if (corrida > mejor) mejor = corrida;
      } else if (!estaCerrado(dia) && clave !== hoy) {
        corrida = 0;
      }
      dia = sumarDias(dia, 1);
    }
  }
  mejor = Math.max(mejor, actual);

  let estado: EstadoDeRacha;
  if (!ultimaVisita) estado = 'sin-visitas';
  else if (hoyAsistio || (actual > 0 && estaCerrado(base))) estado = 'viva';
  else if (actual > 0) estado = 'en-riesgo';
  else estado = 'rota';

  // --- Calendario: semanas de lunes a domingo que terminan en la actual ---
  const semanas: DiaDeCalendario[][] = [];
  const cantidad = Math.max(1, Math.min(semanasDeCalendario, 53));
  const desplazamientoLunes = (base.getUTCDay() + 6) % 7;
  const inicio = sumarDias(base, -desplazamientoLunes - (cantidad - 1) * 7);
  let visitasEnCalendario = 0;

  for (let semana = 0; semana < cantidad; semana += 1) {
    const dias: DiaDeCalendario[] = [];
    for (let dia = 0; dia < 7; dia += 1) {
      const fecha = sumarDias(inicio, semana * 7 + dia);
      const clave = iso(fecha);
      const asistio = conjunto.has(clave);
      if (asistio) visitasEnCalendario += 1;
      dias.push({
        fecha: clave,
        asistio,
        cerrado: estaCerrado(fecha),
        futuro: clave > hoy,
        hoy: clave === hoy,
      });
    }
    semanas.push(dias);
  }

  return { actual, mejor, estado, ultimaVisita, semanas, visitasEnCalendario };
}
