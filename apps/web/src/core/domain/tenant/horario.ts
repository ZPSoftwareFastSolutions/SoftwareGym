/**
 * CAPA: Domain / Tenant — el horario de atención dicho en pocas líneas (V4.2).
 *
 * La página de horarios enseña la semana entera en una tabla, que es lo correcto
 * para consultarla. En la portada eso son siete filas repetidas: «Lunes 07:00 –
 * 22:00», «Martes 07:00 – 22:00»… GOLD entregó su horario como lo escribe
 * cualquier gimnasio —«Lunes a Viernes 07:00 — 22:00»— y así es como se lee.
 *
 * Solo se agrupan días CONSECUTIVOS con el mismo horario. Agrupar «lunes y
 * miércoles» saltándose un martes distinto diría algo falso con una sola línea.
 */

export interface DiaDeHorario {
  readonly day: string;
  readonly open: string;
  readonly close: string;
  readonly closed: boolean;
}

export interface TramoDeHorario {
  /** «Lunes a Viernes», «Sábado», «Lunes y Martes». */
  readonly dias: string;
  /** «07:00 – 22:00» o «Cerrado». */
  readonly horas: string;
  readonly cerrado: boolean;
}

function horasDe(dia: DiaDeHorario): string {
  return dia.closed ? 'Cerrado' : `${dia.open} – ${dia.close}`;
}

export function resumirHorario(semana: readonly DiaDeHorario[]): readonly TramoDeHorario[] {
  const tramos: { primero: string; ultimo: string; cuantos: number; horas: string; cerrado: boolean }[] = [];

  for (const dia of semana) {
    const horas = horasDe(dia);
    const anterior = tramos[tramos.length - 1];
    if (anterior && anterior.horas === horas) {
      anterior.ultimo = dia.day;
      anterior.cuantos += 1;
    } else {
      tramos.push({ primero: dia.day, ultimo: dia.day, cuantos: 1, horas, cerrado: dia.closed });
    }
  }

  return tramos.map((tramo) => ({
    dias:
      tramo.cuantos === 1
        ? tramo.primero
        : tramo.cuantos === 2
          ? `${tramo.primero} y ${tramo.ultimo}`
          : `${tramo.primero} a ${tramo.ultimo}`,
    horas: tramo.horas,
    cerrado: tramo.cerrado,
  }));
}
