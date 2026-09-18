/**
 * CAPA: Domain / Operations
 *
 * Lectura del horario semanal de clases para la vitrina (V4.2).
 *
 * EL PROBLEMA QUE RESUELVE. Un gimnasio con sesenta horarios los enseñaba como
 * siete columnas largas, y cada tarjeta de clase repetía todas sus franjas: una
 * página inacabable donde nadie encontraba «qué hay hoy a la tarde». Aquí se
 * decide, sin I/O y con pruebas, cómo se agrupa: por día, y dentro del día por
 * tramo (mañana, tarde, noche), y cómo se resume una clase en una línea.
 */

import type { ClasePublica, DiaIso } from './classes';

// Solo tipos de `classes.ts`: los archivos de dominio no se importan valores
// entre sí (las pruebas cargan el TypeScript tal cual, sin empaquetador).
const DIAS_ISO: readonly DiaIso[] = [1, 2, 3, 4, 5, 6, 7];

function horaDeFin(inicio: string, duracion: number): string {
  const [h = 0, m = 0] = inicio.split(':').map(Number);
  const total = (h * 60 + m + duracion) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export interface FranjaDeClase {
  readonly id: string;
  readonly classId: string;
  readonly clase: string;
  readonly categoria: ClasePublica['category'];
  readonly weekday: DiaIso;
  readonly inicio: string;
  readonly fin: string;
  readonly branchId: string;
}

export type TramoDelDia = 'manana' | 'tarde' | 'noche';

export const NOMBRE_DE_TRAMO: Readonly<Record<TramoDelDia, string>> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
};

/** Antes de las 12:00, mañana; antes de las 18:00, tarde; el resto, noche. */
export function tramoDelDia(hora: string): TramoDelDia {
  if (hora < '12:00') return 'manana';
  if (hora < '18:00') return 'tarde';
  return 'noche';
}

/** Todas las franjas de la semana, por día y ordenadas por hora (y por nombre a igual hora). */
export function franjasPorDia(clases: readonly ClasePublica[]): ReadonlyMap<DiaIso, readonly FranjaDeClase[]> {
  const mapa = new Map<DiaIso, FranjaDeClase[]>(DIAS_ISO.map((d) => [d, []]));
  for (const clase of clases) {
    for (const h of clase.horarios) {
      mapa.get(h.weekday)?.push({
        id: `${clase.id}-${h.weekday}-${h.startTime}-${h.branchId}`,
        classId: clase.id,
        clase: clase.name,
        categoria: clase.category,
        weekday: h.weekday,
        inicio: h.startTime,
        fin: horaDeFin(h.startTime, h.durationMinutes),
        branchId: h.branchId,
      });
    }
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.clase.localeCompare(b.clase, 'es'));
  }
  return mapa;
}

/** Las franjas de un día agrupadas por tramo, sin tramos vacíos, en orden. */
export function tramosDelDia(franjas: readonly FranjaDeClase[]): readonly { readonly tramo: TramoDelDia; readonly franjas: readonly FranjaDeClase[] }[] {
  return (['manana', 'tarde', 'noche'] as const)
    .map((tramo) => ({ tramo, franjas: franjas.filter((f) => tramoDelDia(f.inicio) === tramo) }))
    .filter((grupo) => grupo.franjas.length > 0);
}

/** Días en que se dicta una clase, ordenados de lunes a domingo, sin repetir. */
export function diasDeLaClase(clase: Pick<ClasePublica, 'horarios'>): readonly DiaIso[] {
  return DIAS_ISO.filter((dia) => clase.horarios.some((h) => h.weekday === dia));
}

/** Horas de inicio distintas de una clase, ordenadas. */
export function horasDeLaClase(clase: Pick<ClasePublica, 'horarios'>): readonly string[] {
  return [...new Set(clase.horarios.map((h) => h.startTime))].sort();
}

/** Iniciales de día para una tira compacta: L M M J V S D. */
export const INICIAL_DE_DIA: Readonly<Record<DiaIso, string>> = { 1: 'L', 2: 'M', 3: 'M', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };
