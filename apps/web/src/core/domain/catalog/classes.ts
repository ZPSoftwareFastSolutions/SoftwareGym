/**
 * CAPA: Domain / Catalog
 *
 * Clases dirigidas en la vitrina.
 *
 * Es el horario que el gimnasio reparte en papel, puesto en una página: qué
 * clase, qué días, a qué hora y en qué sede. Nada más. No hay cupo, ni
 * instructor asignado, ni reserva: eso es operación, y esta versión del sitio
 * no opera nada.
 *
 * LAS FRANJAS LLEVAN INICIO Y FIN, no una duración. El material del gimnasio
 * dice «18:00 a 19:30»; guardar 90 minutos y volver a calcular el final es
 * introducir un redondeo propio en un dato que llegó exacto.
 *
 * Y EL FIN ES OPCIONAL, porque a veces el material solo dice «martes a las
 * 11:00». Deducir el cierre copiándolo de otro día de la misma clase sería
 * inventar un dato con aspecto de oficial; la página muestra la hora de inicio
 * y ya, que es exactamente lo que el gimnasio publicó.
 *
 * Sin I/O y sin React: se prueba sola.
 */

/** Día ISO: 1 = lunes … 7 = domingo. */
export type DiaIso = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DIAS_ISO: readonly DiaIso[] = [1, 2, 3, 4, 5, 6, 7];

export const NOMBRE_DE_DIA_ISO: Readonly<Record<DiaIso, string>> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export type CategoriaDeClase = 'baile' | 'combate' | 'fit' | 'mente_cuerpo' | 'fuerza' | 'otro';

export const NOMBRE_DE_CATEGORIA: Readonly<Record<CategoriaDeClase, string>> = {
  baile: 'Baile',
  combate: 'Deportes de combate',
  fit: 'Fit y funcional',
  mente_cuerpo: 'Mente y cuerpo',
  fuerza: 'Fuerza',
  otro: 'Otra',
};

export type NivelDeClase = 'principiante' | 'intermedio' | 'avanzado' | 'todos';

export const NOMBRE_DE_NIVEL_DE_CLASE: Readonly<Record<NivelDeClase, string>> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  todos: 'Todos los niveles',
};

/** Una franja semanal: se repite todas las semanas en esa sede. */
export interface FranjaDeClase {
  readonly weekday: DiaIso;
  /** `HH:MM`, 24 h. */
  readonly startTime: string;
  /** `HH:MM`. Ausente cuando el gimnasio solo publicó la hora de inicio. */
  readonly endTime?: string;
  /** `SedeDeVitrina.code` donde se dicta. */
  readonly branchCode: string;
}

export interface ClaseDeVitrina {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: CategoriaDeClase;
  readonly level: NivelDeClase;
  readonly horarios: readonly FranjaDeClase[];
  /**
   * Salvedad de la clase: «en esta sede, consultar horarios en recepción».
   * Se escribe porque el gimnasio lo dice así; inventar una hora para que la
   * retícula quede llena es peor que reconocer que ese dato no está cerrado.
   */
  readonly note?: string;
  /** Semilla de la composición gráfica mientras no haya fotografía. */
  readonly seed: number;
}

/** `18:00 – 19:30`, o solo `11:00` si no se publicó la hora de cierre. */
export function rangoLegible(franja: Pick<FranjaDeClase, 'startTime' | 'endTime'>): string {
  return franja.endTime ? `${franja.startTime} – ${franja.endTime}` : franja.startTime;
}

function minutos(hora: string): number {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

/** Minutos que dura la franja, o `null` si no se publicó la hora de cierre. */
export function duracionEnMinutos(franja: Pick<FranjaDeClase, 'startTime' | 'endTime'>): number | null {
  if (!franja.endTime) return null;
  const diferencia = minutos(franja.endTime) - minutos(franja.startTime);
  return diferencia > 0 ? diferencia : diferencia + 24 * 60;
}

/** Las clases que se dictan en una sede. Una clase sin franjas allí no aparece. */
export function clasesDeSede(
  clases: readonly ClaseDeVitrina[],
  branchCode: string,
): readonly ClaseDeVitrina[] {
  return clases
    .map((clase) => ({ ...clase, horarios: clase.horarios.filter((h) => h.branchCode === branchCode) }))
    .filter((clase) => clase.horarios.length > 0 || clase.note !== undefined);
}

export interface FranjaConClase extends FranjaDeClase {
  readonly claseId: string;
  readonly clase: string;
  readonly category: CategoriaDeClase;
}

export interface DiaDeAgenda {
  readonly dia: DiaIso;
  readonly franjas: readonly FranjaConClase[];
}

/**
 * La semana de una sede: los días CON clase, cada uno con sus franjas ordenadas
 * por hora. Los días vacíos no se devuelven — una columna «Domingo: —» ocupa el
 * mismo sitio que una con contenido y no dice nada.
 */
export function semanaDeSede(
  clases: readonly ClaseDeVitrina[],
  branchCode: string,
): readonly DiaDeAgenda[] {
  const franjas: FranjaConClase[] = clases.flatMap((clase) =>
    clase.horarios
      .filter((h) => h.branchCode === branchCode)
      .map((h) => ({ ...h, claseId: clase.id, clase: clase.name, category: clase.category })),
  );

  return DIAS_ISO.map((dia) => ({
    dia,
    franjas: franjas
      .filter((f) => f.weekday === dia)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })).filter((jornada) => jornada.franjas.length > 0);
}

/** «Lunes y miércoles» / «Martes, jueves y sábado». Para la ficha de la clase. */
export function diasLegibles(franjas: readonly FranjaDeClase[]): string {
  const dias = [...new Set(franjas.map((f) => f.weekday))].sort((a, b) => a - b);
  const nombres = dias.map((d) => NOMBRE_DE_DIA_ISO[d]);
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0]!;
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]!.toLowerCase()}`;
}

/** Cuántas franjas semanales hay en una sede. Para el detalle de la pestaña. */
export function totalDeFranjas(clases: readonly ClaseDeVitrina[], branchCode: string): number {
  return clases.reduce(
    (suma, clase) => suma + clase.horarios.filter((h) => h.branchCode === branchCode).length,
    0,
  );
}
