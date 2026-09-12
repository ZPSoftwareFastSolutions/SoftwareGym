/**
 * CAPA: Domain / Operations
 *
 * Programas, rutinas, asignaciones y lectura del entrenamiento (V3.2).
 *
 *   PROGRAMA (plantilla por objetivo) → RUTINA (Día A, Día B…) → EJERCICIOS
 *
 * Asignar a un socio COPIA la rutina: el entrenador la ajusta sin tocar la
 * plantilla. Aquí viven las reglas de forma (qué es una serie válida, qué
 * repeticiones se entienden) y la LECTURA de los datos: qué ejercicio se hace
 * más, qué grupo muscular toca cada día y qué conclusiones salen de eso.
 *
 * Todo es puro y sin I/O: los números llegan ya agregados por las vistas de la
 * base. Lo que protege los datos es RLS, no este archivo.
 */

// ------------------------------------------------------------------ catálogos

export type Objetivo = 'fuerza' | 'hipertrofia' | 'perdida_grasa' | 'resistencia' | 'salud' | 'rendimiento' | 'otro';
export type Nivel = 'principiante' | 'intermedio' | 'avanzado' | 'todos';

export const NOMBRE_DE_OBJETIVO: Readonly<Record<Objetivo, string>> = {
  fuerza: 'Fuerza',
  hipertrofia: 'Hipertrofia',
  perdida_grasa: 'Pérdida de grasa',
  resistencia: 'Resistencia',
  salud: 'Salud general',
  rendimiento: 'Rendimiento deportivo',
  otro: 'Otro',
};

export const NOMBRE_DE_NIVEL: Readonly<Record<Nivel, string>> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  todos: 'Todos los niveles',
};

export function esObjetivo(valor: unknown): valor is Objetivo {
  return typeof valor === 'string' && valor in NOMBRE_DE_OBJETIVO;
}

export function esNivel(valor: unknown): valor is Nivel {
  return typeof valor === 'string' && valor in NOMBRE_DE_NIVEL;
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo (el mismo que usa la base). */
export type DiaDeSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DIAS_DE_SEMANA: readonly DiaDeSemana[] = [1, 2, 3, 4, 5, 6, 7];

export const NOMBRE_DE_DIA: Readonly<Record<DiaDeSemana, string>> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export const DIA_CORTO: Readonly<Record<DiaDeSemana, string>> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

export function esDiaDeSemana(valor: unknown): valor is DiaDeSemana {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 7;
}

/**
 * Familia de movimiento de cada grupo muscular.
 *
 * Sirve para nombrar el día cuando ningún músculo domina solo: tres ejercicios
 * de cuádriceps, glúteo e isquiotibiales no son «día de cuádriceps», son día de
 * pierna. Los códigos son los de `exercises.ts`; una prueba comprueba que no se
 * quede ninguno fuera (aquí no se importa para no acoplar dos módulos de
 * dominio que se usan por separado).
 */
export type FamiliaMuscular = 'pierna' | 'empuje' | 'tiron' | 'core' | 'general';

export const FAMILIA_POR_GRUPO: Readonly<Record<string, FamiliaMuscular>> = {
  cuadriceps: 'pierna',
  isquiotibiales: 'pierna',
  gluteos: 'pierna',
  pantorrillas: 'pierna',
  pecho: 'empuje',
  hombros: 'empuje',
  triceps: 'empuje',
  espalda: 'tiron',
  biceps: 'tiron',
  antebrazos: 'tiron',
  core: 'core',
  cuerpo_completo: 'general',
  cardio: 'general',
  movilidad: 'general',
};

export const NOMBRE_DE_FAMILIA: Readonly<Record<FamiliaMuscular, string>> = {
  pierna: 'pierna',
  empuje: 'empuje (pecho, hombro y tríceps)',
  tiron: 'espalda (tirón)',
  core: 'core',
  general: 'trabajo general',
};

/** Cómo se llama el día cuando un solo grupo manda. */
export const DIA_POR_GRUPO: Readonly<Record<string, string>> = {
  pecho: 'pecho',
  espalda: 'espalda',
  hombros: 'hombro',
  biceps: 'bíceps',
  triceps: 'tríceps',
  antebrazos: 'antebrazo',
  core: 'core',
  gluteos: 'glúteo',
  cuadriceps: 'pierna',
  isquiotibiales: 'pierna',
  pantorrillas: 'pantorrilla',
  cuerpo_completo: 'cuerpo completo',
  cardio: 'cardio',
  movilidad: 'movilidad',
};

// ------------------------------------------------------------------ entidades

export interface Programa {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly goal: Objetivo;
  readonly level: Nivel;
  readonly weeks: number | null;
  readonly isActive: boolean;
  readonly rutinas: number;
}

export interface Rutina {
  readonly id: string;
  readonly programId: string | null;
  readonly programName: string | null;
  readonly name: string;
  readonly dayLabel: string | null;
  readonly position: number;
  readonly notes: string | null;
  readonly estimatedMinutes: number | null;
  readonly isActive: boolean;
  readonly ejercicios: number;
  readonly asignaciones: number;
  readonly grupos: readonly string[];
}

export interface EjercicioDeRutina {
  readonly id: string;
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly muscleGroup: string;
  readonly position: number;
  readonly sets: number;
  readonly reps: string;
  readonly weightKg: number | null;
  readonly restSeconds: number | null;
  readonly notes: string | null;
}

export interface RutinaAsignada {
  readonly id: string;
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly customerName: string;
  readonly routineId: string | null;
  readonly programName: string | null;
  readonly trainerName: string | null;
  readonly name: string;
  readonly dayLabel: string | null;
  readonly position: number;
  readonly notes: string | null;
  readonly startsOn: string;
  readonly endedOn: string | null;
  readonly ejercicios: number;
  readonly completados7d: number;
  readonly ultimoRegistro: string | null;
}

/** Un ejercicio de la rutina de un socio, con lo que ya registró. */
export interface EjercicioAsignado extends EjercicioDeRutina {
  readonly completadoHoy: boolean;
  readonly ultimaVez: string | null;
  readonly vecesUltimos30: number;
}

export interface EstadisticaDeEjercicio {
  readonly exerciseId: string;
  readonly name: string;
  readonly muscleGroup: string;
  readonly isActive: boolean;
  readonly veces30d: number;
  readonly veces90d: number;
  readonly socios30d: number;
  readonly socios90d: number;
  readonly ultimaVez: string | null;
  readonly enRutinasVigentes: number;
  readonly pesoPromedio30d: number | null;
}

export interface EstadisticaDeSocio {
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly customerName: string;
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly muscleGroup: string;
  readonly veces30d: number;
  readonly vecesTotal: number;
  readonly ultimaVez: string | null;
  readonly pesoMaximo: number | null;
}

export interface ConteoPorDia {
  readonly dia: DiaDeSemana;
  readonly grupo: string;
  readonly veces: number;
  readonly socios: number;
  readonly fechas: number;
}

export interface ResumenDeEntrenamiento {
  readonly hoy: string;
  readonly programas: number;
  readonly rutinas: number;
  readonly asignaciones: number;
  readonly sociosConRutina: number;
  readonly sociosActivos: number;
  readonly completados7d: number;
  readonly completados30d: number;
  readonly sociosEntrenando30d: number;
  readonly diasConRegistro30d: number;
}

export type Validacion<T> =
  | { readonly ok: true; readonly datos: T }
  | { readonly ok: false; readonly errores: Readonly<Record<string, string>> };

// ------------------------------------------------------------------ validación

const PATRON_REPETICIONES = /^([0-9]{1,3}(-[0-9]{1,3})?|al fallo|m[áa]ximo|[0-9]{1,3} ?(seg|min))$/i;

function limpio(valor: string): string | null {
  const recortado = valor.trim().replace(/\s+/g, ' ');
  return recortado === '' ? null : recortado;
}

function entero(valor: string): number | null {
  const texto = valor.trim();
  if (texto === '' || !/^[0-9]{1,4}$/.test(texto)) return null;
  return Number(texto);
}

function decimal(valor: string): number | null | 'invalido' {
  const texto = valor.trim().replace(',', '.');
  if (texto === '') return null;
  if (!/^[0-9]{1,3}(\.[0-9]{1,2})?$/.test(texto)) return 'invalido';
  return Number(texto);
}

export interface FormularioDePrograma {
  readonly name: string;
  readonly description: string;
  readonly goal: string;
  readonly level: string;
  readonly weeks: string;
}

export interface DatosDePrograma {
  readonly name: string;
  readonly description: string | null;
  readonly goal: Objetivo;
  readonly level: Nivel;
  readonly weeks: number | null;
}

export function validarPrograma(formulario: FormularioDePrograma): Validacion<DatosDePrograma> {
  const errores: Record<string, string> = {};
  const name = formulario.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) errores.name = 'El nombre debe tener entre 2 y 80 caracteres.';

  const description = limpio(formulario.description);
  if (description && description.length > 400) errores.description = 'Hasta 400 caracteres.';

  const { goal, level } = formulario;
  if (!esObjetivo(goal)) errores.goal = 'Elige el objetivo.';
  if (!esNivel(level)) errores.level = 'Elige el nivel.';

  const weeks = formulario.weeks.trim() === '' ? null : entero(formulario.weeks);
  if (formulario.weeks.trim() !== '' && (weeks === null || weeks < 1 || weeks > 52)) {
    errores.weeks = 'Entre 1 y 52 semanas, o vacío.';
  }

  if (Object.keys(errores).length > 0 || !esObjetivo(goal) || !esNivel(level)) return { ok: false, errores };
  return { ok: true, datos: { name, description, goal, level, weeks } };
}

export interface FormularioDeRutina {
  readonly name: string;
  readonly dayLabel: string;
  readonly position: string;
  readonly notes: string;
  readonly estimatedMinutes: string;
}

export interface DatosDeRutina {
  readonly name: string;
  readonly dayLabel: string | null;
  readonly position: number;
  readonly notes: string | null;
  readonly estimatedMinutes: number | null;
}

export function validarRutina(formulario: FormularioDeRutina): Validacion<DatosDeRutina> {
  const errores: Record<string, string> = {};
  const name = formulario.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) errores.name = 'El nombre debe tener entre 2 y 80 caracteres.';

  const dayLabel = limpio(formulario.dayLabel);
  if (dayLabel && dayLabel.length > 40) errores.dayLabel = 'Hasta 40 caracteres.';

  const position = formulario.position.trim() === '' ? 1 : entero(formulario.position);
  if (position === null || position < 1 || position > 30) errores.position = 'Entre 1 y 30.';

  const notes = limpio(formulario.notes);
  if (notes && notes.length > 400) errores.notes = 'Hasta 400 caracteres.';

  const minutos = formulario.estimatedMinutes.trim() === '' ? null : entero(formulario.estimatedMinutes);
  if (formulario.estimatedMinutes.trim() !== '' && (minutos === null || minutos < 5 || minutos > 240)) {
    errores.estimatedMinutes = 'Entre 5 y 240 minutos, o vacío.';
  }

  if (Object.keys(errores).length > 0 || position === null) return { ok: false, errores };
  return { ok: true, datos: { name, dayLabel, position, notes, estimatedMinutes: minutos } };
}

export interface FormularioDeEjercicioDeRutina {
  readonly exerciseId: string;
  readonly position: string;
  readonly sets: string;
  readonly reps: string;
  readonly weightKg: string;
  readonly restSeconds: string;
  readonly notes: string;
}

export interface DatosDeEjercicioDeRutina {
  readonly exerciseId: string;
  readonly position: number;
  readonly sets: number;
  readonly reps: string;
  readonly weightKg: number | null;
  readonly restSeconds: number | null;
  readonly notes: string | null;
}

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarEjercicioDeRutina(formulario: FormularioDeEjercicioDeRutina): Validacion<DatosDeEjercicioDeRutina> {
  const errores: Record<string, string> = {};

  const exerciseId = formulario.exerciseId.trim();
  if (!PATRON_UUID.test(exerciseId)) errores.exerciseId = 'Elige el ejercicio.';

  const position = formulario.position.trim() === '' ? 1 : entero(formulario.position);
  if (position === null || position < 1 || position > 40) errores.position = 'Entre 1 y 40.';

  const sets = entero(formulario.sets);
  if (sets === null || sets < 1 || sets > 12) errores.sets = 'Entre 1 y 12 series.';

  const reps = formulario.reps.trim().toLowerCase();
  if (!PATRON_REPETICIONES.test(reps)) {
    errores.reps = 'Escribe «10», «8-12», «al fallo», «máximo» o «45 seg».';
  }

  const peso = decimal(formulario.weightKg);
  if (peso === 'invalido' || (typeof peso === 'number' && peso > 500)) errores.weightKg = 'Peso en kilos, hasta 500.';

  const descanso = formulario.restSeconds.trim() === '' ? null : entero(formulario.restSeconds);
  if (formulario.restSeconds.trim() !== '' && (descanso === null || descanso > 600)) {
    errores.restSeconds = 'Descanso en segundos, hasta 600.';
  }

  const notes = limpio(formulario.notes);
  if (notes && notes.length > 200) errores.notes = 'Hasta 200 caracteres.';

  if (Object.keys(errores).length > 0 || position === null || sets === null) return { ok: false, errores };
  return {
    ok: true,
    datos: { exerciseId, position, sets, reps, weightKg: typeof peso === 'number' ? peso : null, restSeconds: descanso, notes },
  };
}

/** Lo que se anota al marcar un ejercicio: todo opcional menos el hecho de marcarlo. */
export function validarMarca(seriesTexto: string, pesoTexto: string): Validacion<{ readonly sets: number | null; readonly weightKg: number | null }> {
  const errores: Record<string, string> = {};
  const sets = seriesTexto.trim() === '' ? null : entero(seriesTexto);
  if (seriesTexto.trim() !== '' && (sets === null || sets < 1 || sets > 20)) errores.sets = 'Entre 1 y 20 series.';
  const peso = decimal(pesoTexto);
  if (peso === 'invalido' || (typeof peso === 'number' && peso > 500)) errores.weightKg = 'Peso en kilos, hasta 500.';
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { sets, weightKg: typeof peso === 'number' ? peso : null } };
}

/** Resumen legible de una serie: «4 × 8-12 · 40 kg · 90 s». */
export function describirSerie(ejercicio: Pick<EjercicioDeRutina, 'sets' | 'reps' | 'weightKg' | 'restSeconds'>): string {
  const partes = [`${ejercicio.sets} × ${ejercicio.reps}`];
  if (ejercicio.weightKg !== null) partes.push(`${ejercicio.weightKg} kg`);
  if (ejercicio.restSeconds !== null) partes.push(`${ejercicio.restSeconds} s de descanso`);
  return partes.join(' · ');
}

// ------------------------------------------------------------------ lectura

export interface EtiquetaDeDia {
  readonly dia: DiaDeSemana;
  readonly etiqueta: string;
  /** Grupo o familia que manda; `null` si no hay datos. */
  readonly grupo: string | null;
  readonly veces: number;
  /** Porcentaje del día que se lleva ese grupo o familia (0-100). */
  readonly porcentaje: number;
  readonly confianza: 'alta' | 'media' | 'baja';
}

/** Debajo de esto, un día no dice nada: son cuatro registros sueltos. */
const MINIMO_PARA_ETIQUETAR = 5;

/**
 * Qué se entrena cada día de la semana.
 *
 * Primero mira si un grupo muscular se lleva al menos el 35 % del día («día de
 * pecho»); si no, agrupa por familia de movimiento y pide la mitad («día de
 * pierna»). Sin eso, un día variado se llamaría «día de bíceps» porque el
 * bíceps sacó un registro más que el resto.
 */
export function etiquetasPorDia(conteos: readonly ConteoPorDia[]): readonly EtiquetaDeDia[] {
  return DIAS_DE_SEMANA.map((dia) => {
    const delDia = conteos.filter((c) => c.dia === dia);
    const total = delDia.reduce((suma, c) => suma + c.veces, 0);
    if (total === 0) {
      return { dia, etiqueta: 'Sin registros', grupo: null, veces: 0, porcentaje: 0, confianza: 'baja' as const };
    }

    const porGrupo = [...delDia].sort((a, b) => b.veces - a.veces || a.grupo.localeCompare(b.grupo, 'es'));
    const dominante = porGrupo[0];
    const porcentajeDeGrupo = dominante ? Math.round((dominante.veces / total) * 100) : 0;

    const porFamilia = new Map<FamiliaMuscular, number>();
    for (const c of delDia) {
      const familia = FAMILIA_POR_GRUPO[c.grupo] ?? 'general';
      porFamilia.set(familia, (porFamilia.get(familia) ?? 0) + c.veces);
    }
    const familiaTop = [...porFamilia.entries()].sort((a, b) => b[1] - a[1])[0];
    const porcentajeDeFamilia = familiaTop ? Math.round((familiaTop[1] / total) * 100) : 0;

    const confianza: 'alta' | 'media' | 'baja' = total < MINIMO_PARA_ETIQUETAR ? 'baja' : total < 20 ? 'media' : 'alta';

    if (total < MINIMO_PARA_ETIQUETAR) {
      return { dia, etiqueta: 'Pocos registros', grupo: dominante?.grupo ?? null, veces: total, porcentaje: porcentajeDeGrupo, confianza };
    }
    if (dominante && porcentajeDeGrupo >= 35) {
      return {
        dia,
        etiqueta: `Día de ${DIA_POR_GRUPO[dominante.grupo] ?? dominante.grupo}`,
        grupo: dominante.grupo,
        veces: total,
        porcentaje: porcentajeDeGrupo,
        confianza,
      };
    }
    if (familiaTop && porcentajeDeFamilia >= 50) {
      return {
        dia,
        etiqueta: `Día de ${NOMBRE_DE_FAMILIA[familiaTop[0]]}`,
        grupo: familiaTop[0],
        veces: total,
        porcentaje: porcentajeDeFamilia,
        confianza,
      };
    }
    return { dia, etiqueta: 'Día mixto', grupo: null, veces: total, porcentaje: porcentajeDeGrupo, confianza };
  });
}

/** Veces que se entrenó cada grupo muscular, de más a menos. */
export function rankingDeGrupos(conteos: readonly ConteoPorDia[]): readonly { readonly grupo: string; readonly veces: number }[] {
  const total = new Map<string, number>();
  for (const c of conteos) total.set(c.grupo, (total.get(c.grupo) ?? 0) + c.veces);
  return [...total.entries()]
    .map(([grupo, veces]) => ({ grupo, veces }))
    .sort((a, b) => b.veces - a.veces || a.grupo.localeCompare(b.grupo, 'es'));
}

/** Total por día de la semana, para el gráfico de barras. */
export function vecesPorDia(conteos: readonly ConteoPorDia[]): readonly { readonly dia: DiaDeSemana; readonly veces: number }[] {
  return DIAS_DE_SEMANA.map((dia) => ({ dia, veces: conteos.filter((c) => c.dia === dia).reduce((s, c) => s + c.veces, 0) }));
}

export type TonoDeConclusion = 'bueno' | 'neutro' | 'atencion';

export interface Conclusion {
  readonly clave: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly tono: TonoDeConclusion;
}

export interface DatosDeConclusiones {
  readonly resumen: ResumenDeEntrenamiento;
  /** Todos los ejercicios del catálogo activo, con sus veces. */
  readonly ejercicios: readonly EstadisticaDeEjercicio[];
  readonly porDia: readonly ConteoPorDia[];
  /** Socios con rutina vigente que no registran nada en la última semana. */
  readonly sinRegistroReciente: number;
  readonly ventanaDias?: number;
}

function lista(nombres: readonly string[], maximo = 3): string {
  const visibles = nombres.slice(0, maximo);
  const resto = nombres.length - visibles.length;
  return resto > 0 ? `${visibles.join(', ')} y ${resto} más` : visibles.join(', ');
}

/**
 * Conclusiones automáticas para la pantalla del gerente.
 *
 * Son frases, no gráficos: alguien que abre el panel cinco minutos quiere leer
 * qué pasó, no interpretar barras. Cada una dice el número que la sostiene,
 * para que se pueda comprobar en la tabla de al lado.
 */
export function conclusionesDeEntrenamiento(datos: DatosDeConclusiones): readonly Conclusion[] {
  const ventana = datos.ventanaDias ?? 30;
  const { resumen } = datos;
  const conclusiones: Conclusion[] = [];

  if (resumen.completados30d === 0) {
    return [
      {
        clave: 'sin-datos',
        titulo: 'Todavía no hay entrenamientos registrados',
        detalle:
          'Las métricas se llenan cuando el socio o su entrenador marcan los ejercicios de una rutina asignada. Asigna rutinas y pide que marquen lo que hacen.',
        tono: 'atencion',
      },
    ];
  }

  const hechos = [...datos.ejercicios].filter((e) => e.veces30d > 0).sort((a, b) => b.veces30d - a.veces30d);
  const top = hechos[0];
  if (top) {
    conclusiones.push({
      clave: 'ejercicio-top',
      titulo: `«${top.name}» es el ejercicio más hecho`,
      detalle: `${top.veces30d} registros de ${top.socios30d} socio${top.socios30d === 1 ? '' : 's'} en ${ventana} días${
        top.pesoPromedio30d !== null ? `, con ${top.pesoPromedio30d} kg de promedio` : ''
      }.`,
      tono: 'neutro',
    });
  }

  const menos = hechos[hechos.length - 1];
  if (menos && hechos.length > 2 && menos.exerciseId !== top?.exerciseId) {
    conclusiones.push({
      clave: 'ejercicio-menos',
      titulo: `El que menos se hace es «${menos.name}»`,
      detalle: `Solo ${menos.veces30d} registro${menos.veces30d === 1 ? '' : 's'} en ${ventana} días, de ${menos.socios30d} socio${
        menos.socios30d === 1 ? '' : 's'
      }.`,
      tono: 'neutro',
    });
  }

  const sinUso = datos.ejercicios.filter((e) => e.isActive && e.veces30d === 0);
  if (sinUso.length > 0) {
    conclusiones.push({
      clave: 'catalogo-sin-uso',
      titulo: `${sinUso.length} ejercicio${sinUso.length === 1 ? '' : 's'} del catálogo sin usar`,
      detalle: `Nadie los registró en ${ventana} días: ${lista(sinUso.map((e) => e.name))}. O no están en ninguna rutina, o la gente los salta.`,
      tono: 'atencion',
    });
  }

  const grupos = rankingDeGrupos(datos.porDia);
  const grupoTop = grupos[0];
  const grupoUltimo = grupos[grupos.length - 1];
  if (grupoTop && grupoUltimo && grupos.length > 1) {
    conclusiones.push({
      clave: 'grupos',
      titulo: `Se trabaja sobre todo ${DIA_POR_GRUPO[grupoTop.grupo] ?? grupoTop.grupo}`,
      detalle: `${grupoTop.veces} registros frente a ${grupoUltimo.veces} de ${DIA_POR_GRUPO[grupoUltimo.grupo] ?? grupoUltimo.grupo}, el menos trabajado.`,
      tono: 'neutro',
    });
  }

  const etiquetas = etiquetasPorDia(datos.porDia).filter((d) => d.veces > 0);
  const conPatron = etiquetas.filter((d) => d.confianza !== 'baja' && d.grupo !== null);
  if (conPatron.length > 0) {
    conclusiones.push({
      clave: 'dias',
      titulo: 'Cada día tiene su músculo',
      detalle: conPatron.map((d) => `${NOMBRE_DE_DIA[d.dia]}: ${d.etiqueta.toLowerCase()} (${d.porcentaje} %)`).join(' · '),
      tono: 'bueno',
    });
  }

  const masActivo = [...etiquetas].sort((a, b) => b.veces - a.veces)[0];
  if (masActivo) {
    conclusiones.push({
      clave: 'dia-activo',
      titulo: `El ${NOMBRE_DE_DIA[masActivo.dia].toLowerCase()} es el día de más movimiento`,
      detalle: `${masActivo.veces} ejercicios registrados. El gimnasio se llena ese día: conviene tener más personal en sala.`,
      tono: 'neutro',
    });
  }

  if (resumen.sociosActivos > 0) {
    const porcentaje = Math.round((resumen.sociosConRutina / resumen.sociosActivos) * 100);
    conclusiones.push({
      clave: 'cobertura',
      titulo: `${resumen.sociosConRutina} de ${resumen.sociosActivos} socios activos tienen rutina`,
      detalle:
        porcentaje >= 60
          ? `Cobertura del ${porcentaje} %. El resto entrena por su cuenta.`
          : `Cobertura del ${porcentaje} %. Asignar rutina al resto es la vía más directa para que vuelvan más seguido.`,
      tono: porcentaje >= 60 ? 'bueno' : 'atencion',
    });
  }

  if (datos.sinRegistroReciente > 0) {
    conclusiones.push({
      clave: 'sin-registro',
      titulo: `${datos.sinRegistroReciente} socio${datos.sinRegistroReciente === 1 ? '' : 's'} con rutina no registra${
        datos.sinRegistroReciente === 1 ? '' : 'n'
      } nada hace una semana`,
      detalle: 'O dejaron de venir, o entrenan sin marcar. Vale una llamada antes de que se vayan.',
      tono: 'atencion',
    });
  }

  return conclusiones;
}

export function mensajeDeErrorDeEntrenamiento(codigo: string): string {
  const c = codigo;
  if (c.includes('rutina_no_disponible')) return 'Esa rutina no existe o está inactiva.';
  if (c.includes('rutina_sin_ejercicios')) return 'Agrega ejercicios a la rutina antes de asignarla.';
  if (c.includes('ejercicio_no_disponible')) return 'Ese ejercicio no está en una rutina vigente tuya.';
  if (c.includes('fecha_futura')) return 'No se puede marcar un entrenamiento que todavía no pasó.';
  if (c.includes('fecha_demasiado_antigua')) return 'Solo se puede registrar hasta una semana atrás.';
  if (c.includes('asignacion_finalizada')) return 'Esa rutina ya estaba finalizada. Asigna una nueva.';
  if (c.includes('socio_no_disponible')) return 'Ese socio no está disponible en este gimnasio.';
  if (c.includes('routines_nombre_en_programa_uk') || c.includes('routines_nombre_suelta_uk')) return 'Ya hay una rutina con ese nombre.';
  if (c.includes('training_programs_nombre_uk')) return 'Ya hay un programa con ese nombre.';
  if (c.includes('23505')) return 'Esa rutina ya está asignada a ese socio.';
  if (c.includes('23503')) return 'Ese ejercicio o socio no pertenece a este gimnasio.';
  if (c.includes('23514')) return 'Algún dato no tiene el formato esperado. Revisa series y repeticiones.';
  if (c.includes('sin_permiso') || c.includes('42501')) return 'Tu cuenta no puede hacer esta operación sobre este socio.';
  return 'No se pudo guardar. Vuelve a intentarlo.';
}
