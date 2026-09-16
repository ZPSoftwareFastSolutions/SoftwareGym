/**
 * CAPA: Domain / Catalog
 *
 * Instalaciones repartidas por sede (V4.1).
 *
 * EL PROBLEMA. Hasta aquí las instalaciones eran una lista plana: valía para un
 * gimnasio de una sede, o para uno cuyas sedes son equivalentes. Un gimnasio con
 * cuatro sedes distintas necesita decir qué hay en cada una sin que la página
 * crezca por cuatro.
 *
 * LA REGLA. El reparto es DATO (`FacilityItem.branchCode`), no código:
 *
 * - Ninguna área declara sede → una sola lista, como siempre. Los gimnasios que
 *   ya existían no cambian de aspecto.
 * - Las áreas declaran sede → un grupo por sede, en el orden en que la base
 *   devuelve las sedes (la principal primero).
 * - Un área sin sede, conviviendo con otras que sí la tienen, es de TODAS: se
 *   repite en cada grupo. Es lo que significa «esto lo hay en cualquier sede» y
 *   evita obligar al gimnasio a copiar seis veces el mismo vestuario.
 * - Un `branchCode` que no corresponde a ninguna sede activa no se pierde: cae
 *   en el grupo general. Una errata no debe hacer desaparecer contenido en
 *   silencio; el validador del build ya avisa del formato.
 *
 * Sin I/O y sin React: se prueba sola.
 */

import type { FacilityItem } from './catalog';

/** Lo mínimo que hace falta saber de una sede aquí. Evita atar el catálogo a `Sucursal`. */
export interface SedeDeInstalaciones {
  readonly code: string;
  readonly name: string;
}

export interface GrupoDeInstalaciones {
  readonly code: string;
  readonly name: string;
  readonly facilities: readonly FacilityItem[];
}

/**
 * Agrupa las instalaciones por sede. Devuelve un solo grupo sin nombre cuando
 * no hay reparto que hacer: quien consume decide si eso merece pestañas.
 */
export function agruparInstalacionesPorSede(
  facilities: readonly FacilityItem[],
  sedes: readonly SedeDeInstalaciones[],
): readonly GrupoDeInstalaciones[] {
  const codigosDeSede = new Set(sedes.map((s) => s.code));

  // Solo cuenta como «atribuida» la que apunta a una sede que existe. Con eso,
  // un archivo que nombra una sede aún no creada en la base se comporta como si
  // no la nombrara, en vez de generar una pestaña fantasma.
  const atribuidas = facilities.filter((f) => f.branchCode !== undefined && codigosDeSede.has(f.branchCode));
  if (atribuidas.length === 0 || sedes.length === 0) {
    return [{ code: '', name: '', facilities }];
  }

  const comunes = facilities.filter((f) => f.branchCode === undefined || !codigosDeSede.has(f.branchCode));

  return sedes
    .map((sede) => ({
      code: sede.code,
      name: sede.name,
      // Primero lo propio de la sede y después lo común: lo que la distingue se
      // lee antes que lo que comparte con las demás.
      facilities: [...facilities.filter((f) => f.branchCode === sede.code), ...comunes],
    }))
    .filter((grupo) => grupo.facilities.length > 0);
}

/** Si el reparto justifica pestañas: más de una sede con contenido distinto. */
export function necesitaPestanasDeSede(grupos: readonly GrupoDeInstalaciones[]): boolean {
  return grupos.length > 1;
}

/** «6 áreas» / «1 área». Para la segunda línea de la pestaña. */
export function describirGrupo(grupo: GrupoDeInstalaciones): string {
  const total = grupo.facilities.length;
  return total === 1 ? '1 área' : `${total} áreas`;
}
