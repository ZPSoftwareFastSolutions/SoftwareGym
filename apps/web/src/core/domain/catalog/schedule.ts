/**
 * CAPA: Domain / Catalog
 *
 * Horario de atención.
 *
 * Vive en `catalog` y no en `tenant` porque un horario es CONTENIDO DE VITRINA:
 * se escribe en el archivo del gimnasio, se lee en la página y no decide nada.
 * Nada aquí calcula si el gimnasio está abierto ahora mismo: eso dependería del
 * reloj del servidor y de la zona horaria del visitante, y una página estática
 * servida desde CDN no puede contestarlo sin mentir.
 *
 * Sin I/O y sin React: se prueba sola.
 */

export interface DaySchedule {
  readonly day: string;
  readonly open: string;
  readonly close: string;
  readonly closed: boolean;
  readonly note?: string;
}

export interface BusinessHours {
  readonly timezone: string;
  readonly week: readonly DaySchedule[];
  readonly holidayNote?: string;
}

/** Los siete días, en el orden en que se leen. Ninguna sede puede saltárselos. */
export const DIAS_DE_LA_SEMANA: readonly string[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

/**
 * Resume una semana en frases: «Lunes a viernes · 07:00 a 23:00».
 *
 * Agrupa los días CONSECUTIVOS que abren a la misma hora, que es como lo
 * escribiría una persona en un cartel. Enumerar siete líneas idénticas es
 * correcto y nadie lo lee; el resumen es lo que se pone en una tarjeta.
 */
export function resumirSemana(week: readonly DaySchedule[]): readonly string[] {
  const lineas: string[] = [];
  let bloque: DaySchedule[] = [];

  const cerrar = () => {
    if (bloque.length === 0) return;
    const primero = bloque[0]!;
    const ultimo = bloque[bloque.length - 1]!;
    const dias =
      bloque.length === 1
        ? primero.day
        : `${primero.day} a ${ultimo.day.toLowerCase()}`;
    lineas.push(primero.closed ? `${dias} · Cerrado` : `${dias} · ${primero.open} a ${primero.close}`);
    bloque = [];
  };

  for (const dia of week) {
    const anterior = bloque[bloque.length - 1];
    // La nota corta el bloque a propósito: si un día tiene una salvedad, no
    // puede esconderse dentro de un rango que dice lo mismo para todos.
    const mismaFranja =
      anterior !== undefined &&
      anterior.closed === dia.closed &&
      anterior.open === dia.open &&
      anterior.close === dia.close &&
      anterior.note === undefined &&
      dia.note === undefined;

    if (mismaFranja) bloque.push(dia);
    else {
      cerrar();
      bloque = [dia];
    }
  }
  cerrar();

  return lineas;
}

/** Los días que abren, para decir «abrimos 6 días a la semana» sin contarlos a mano. */
export function diasAbiertos(week: readonly DaySchedule[]): number {
  return week.filter((dia) => !dia.closed).length;
}
