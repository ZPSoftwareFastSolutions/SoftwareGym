/**
 * CAPA: Domain / Tenant — cómo se compone la portada de un gimnasio (V4.2).
 *
 * EL PROBLEMA. El inicio tenía el orden de sus secciones escrito en la página,
 * igual para todos los gimnasios. Por eso Gold's Gym Premium, que comunica por
 * panfletos y pidió abrir con sus anuncios, sus tarifas y sus horarios (encargo
 * V4.1 §6 y §17), se veía exactamente como Mítico con otro color: la paleta era
 * lo único que cambiaba de un cliente a otro.
 *
 * LA DECISIÓN. La composición pasa a ser DATO del gimnasio, como ya lo eran su
 * marca y su contenido. Se eligen tres cosas, cada una entre variantes cerradas:
 *
 *   estilo     la portada a pantalla completa de siempre, o una portada que
 *              abre con los anuncios como pieza principal;
 *   secciones  qué bloques van debajo y en qué orden;
 *   planes     tarjetas, o un tarifario en filas como el de un folleto.
 *
 * Variantes cerradas y no «cualquier componente en cualquier sitio»: así cada
 * combinación se puede probar y ningún gimnasio necesita código propio. Un
 * gimnasio que no declara nada recibe `COMPOSICION_CLASICA`, que es EXACTAMENTE
 * el orden que tenía la página, y no nota el cambio.
 *
 * Que una sección esté en la lista no la enciende: si su capacidad está apagada
 * no se dibuja (`seccionesVisibles`). La composición decide el orden; lo
 * contratado sigue decidiendo lo que existe.
 */

import type { FeatureFlagKey } from './feature-flags';

export type SeccionDePortada =
  | 'anuncios'
  | 'marquesina'
  | 'servicios'
  | 'sucursales'
  | 'planes'
  | 'horarios'
  | 'instalaciones'
  | 'por-dentro'
  | 'productos'
  | 'testimonios'
  | 'preguntas'
  | 'cierre';

export const SECCIONES_DE_PORTADA: readonly SeccionDePortada[] = [
  'anuncios',
  'marquesina',
  'servicios',
  'sucursales',
  'planes',
  'horarios',
  'instalaciones',
  'por-dentro',
  'productos',
  'testimonios',
  'preguntas',
  'cierre',
];

/**
 * `clasica`  portada a pantalla completa con cifras; los anuncios, si los hay,
 *            van como una sección más.
 * `anuncios` portada compacta con la identidad del gimnasio y, a su lado, los
 *            anuncios como pieza principal. Pensada para quien comunica por
 *            panfletos: lo que está pasando esta semana es lo primero que se ve.
 */
export type EstiloDePortada = 'clasica' | 'anuncios';

export type EstiloDePlanes = 'tarjetas' | 'tarifario';

export interface ComposicionDePortada {
  readonly estilo: EstiloDePortada;
  readonly secciones: readonly SeccionDePortada[];
  readonly planes: EstiloDePlanes;
}

/** El inicio tal como era antes de que existiera esta capacidad. No se toca. */
export const COMPOSICION_CLASICA: ComposicionDePortada = {
  estilo: 'clasica',
  secciones: ['anuncios', 'marquesina', 'servicios', 'sucursales', 'planes', 'productos', 'testimonios', 'preguntas', 'cierre'],
  planes: 'tarjetas',
};

/**
 * La capacidad contratada que hace falta para dibujar cada sección.
 *
 * `null` = no depende de ninguna flag: la sección decide sola con sus datos
 * (las sucursales no se pintan con una sola sede; la marquesina y el cierre son
 * parte de cualquier sitio).
 */
export const CAPACIDAD_DE_SECCION: Readonly<Record<SeccionDePortada, FeatureFlagKey | null>> = {
  anuncios: 'enableAnnouncements',
  marquesina: null,
  servicios: null,
  sucursales: null,
  planes: 'showPlans',
  horarios: 'showSchedule',
  instalaciones: 'showFacilities',
  'por-dentro': 'showGallery',
  productos: 'showProducts',
  testimonios: 'showTestimonials',
  preguntas: 'showFaq',
  cierre: null,
};

/** La composición de un gimnasio, con lo que no declaró tomado de la clásica. */
export function composicionDe(declarada: Partial<ComposicionDePortada> | undefined): ComposicionDePortada {
  return {
    estilo: declarada?.estilo ?? COMPOSICION_CLASICA.estilo,
    secciones: declarada?.secciones ?? COMPOSICION_CLASICA.secciones,
    planes: declarada?.planes ?? COMPOSICION_CLASICA.planes,
  };
}

/** Las secciones que de verdad se dibujan, en su orden, según lo contratado. */
export function seccionesVisibles(
  composicion: ComposicionDePortada,
  capacidades: Readonly<Partial<Record<FeatureFlagKey, boolean>>>,
): readonly SeccionDePortada[] {
  return composicion.secciones.filter((seccion) => {
    const capacidad = CAPACIDAD_DE_SECCION[seccion];
    return capacidad === null || capacidades[capacidad] === true;
  });
}

/**
 * Qué está mal en una composición declarada. Vacío = válida.
 *
 * Lo corre el validador de tenants en el BUILD: una portada mal compuesta rompe
 * el despliegue, no la página que ve el público.
 */
export function erroresDeComposicion(declarada: Partial<ComposicionDePortada> | undefined): readonly string[] {
  if (declarada === undefined) return [];
  const errores: string[] = [];
  const composicion = composicionDe(declarada);

  if (composicion.estilo !== 'clasica' && composicion.estilo !== 'anuncios') {
    errores.push(`home.estilo desconocido: «${String(composicion.estilo)}»`);
  }
  if (composicion.planes !== 'tarjetas' && composicion.planes !== 'tarifario') {
    errores.push(`home.planes desconocido: «${String(composicion.planes)}»`);
  }

  const vistas = new Set<string>();
  for (const seccion of composicion.secciones) {
    if (!SECCIONES_DE_PORTADA.includes(seccion)) errores.push(`home.secciones: sección desconocida «${String(seccion)}»`);
    if (vistas.has(seccion)) errores.push(`home.secciones: «${seccion}» aparece dos veces`);
    vistas.add(seccion);
  }

  // Con la portada de anuncios, el carrusel YA está arriba: listarlo otra vez
  // pintaría los mismos panfletos dos veces en la misma página.
  if (composicion.estilo === 'anuncios' && vistas.has('anuncios')) {
    errores.push('home.secciones: con estilo «anuncios» el carrusel ya va en la portada; quita «anuncios» de la lista');
  }

  return errores;
}
