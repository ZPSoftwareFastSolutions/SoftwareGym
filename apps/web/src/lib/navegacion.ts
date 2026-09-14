/**
 * Agrupación de la navegación del panel (V4).
 *
 * POR QUÉ. Gerencia llegó a 13 pestañas en una sola fila; la fila se desplazaba
 * en horizontal y las últimas quedaban fuera de la vista sin que nada lo avisara.
 * Esconder pestañas no es opción —cada una es trabajo de alguien—, así que
 * cuando son muchas se agrupan por lo que la persona está haciendo y cada grupo
 * abre su menú. Con pocas se muestran todas, que es lo más rápido de usar.
 *
 * Sin dependencias: lo usan el servidor (qué entradas hay) y el componente de
 * cliente (cómo se dibujan), y lo prueban las pruebas de dominio.
 */

export type GrupoDeNavegacion = 'inicio' | 'dia' | 'socios' | 'entrenamiento' | 'gestion';

export const NOMBRE_DE_GRUPO: Readonly<Record<GrupoDeNavegacion, string>> = {
  inicio: 'Inicio',
  dia: 'Día a día',
  socios: 'Socios',
  entrenamiento: 'Entrenamiento',
  gestion: 'Gestión',
};

const ORDEN_DE_GRUPOS: readonly GrupoDeNavegacion[] = ['inicio', 'dia', 'socios', 'entrenamiento', 'gestion'];

/** Hasta aquí caben en una fila (con salto de línea si hace falta) sin agrupar. */
export const MAXIMO_SIN_AGRUPAR = 6;

export interface EntradaAgrupable {
  readonly href: string;
  readonly grupo: GrupoDeNavegacion;
  readonly insignia?: number;
}

export interface GrupoArmado<T extends EntradaAgrupable> {
  readonly grupo: GrupoDeNavegacion;
  readonly entradas: readonly T[];
  /** Suma de las insignias del grupo: «Día a día 3» avisa sin abrir el menú. */
  readonly insignia: number;
}

/** Grupos en orden fijo, sin grupos vacíos, conservando el orden de las entradas dentro de cada uno. */
export function agruparEntradas<T extends EntradaAgrupable>(entradas: readonly T[]): readonly GrupoArmado<T>[] {
  return ORDEN_DE_GRUPOS.map((grupo) => {
    const delGrupo = entradas.filter((entrada) => entrada.grupo === grupo);
    return {
      grupo,
      entradas: delGrupo,
      insignia: delGrupo.reduce((suma, entrada) => suma + (entrada.insignia && entrada.insignia > 0 ? entrada.insignia : 0), 0),
    };
  }).filter((armado) => armado.entradas.length > 0);
}

/** Si una ruta pertenece a una entrada: la misma o una de sus subpáginas. */
export function rutaActiva(ruta: string, href: string): boolean {
  return ruta === href || ruta.startsWith(`${href}/`);
}

/**
 * La entrada activa es la de href MÁS LARGO que coincide: en
 * `/panel/rutinas/asignada/x` gana «Rutinas» y no un «Resumen» que fuera prefijo.
 */
export function entradaActiva<T extends EntradaAgrupable>(ruta: string, entradas: readonly T[]): T | null {
  let mejor: T | null = null;
  for (const entrada of entradas) {
    if (rutaActiva(ruta, entrada.href) && (!mejor || entrada.href.length > mejor.href.length)) mejor = entrada;
  }
  return mejor;
}
