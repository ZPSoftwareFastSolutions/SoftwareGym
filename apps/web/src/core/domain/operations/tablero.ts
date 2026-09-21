/**
 * CAPA: Domain / Operations — qué ve PRIMERO cada persona al entrar (V4.2).
 *
 * El encargo de GOLD (§9, §10, §11, §21) no pide pantallas nuevas: pide que las
 * que ya existen dejen de enseñarlo todo a la vez y pongan delante lo que cada
 * puesto usa a diario. Recepción quiere escanear; gerencia quiere el dinero;
 * administración quiere el estado del gimnasio.
 *
 * POR QUÉ VIVE EN EL DOMINIO Y NO EN CADA PÁGINA. Si cada dashboard decidiera
 * por su cuenta qué botones enseña, las reglas se irían separando: una pantalla
 * ofrecería «Nuevo socio» a quien no puede crearlos y otra lo escondería a quien
 * sí. Aquí está escrito una vez, se prueba sin base de datos y las páginas solo
 * lo dibujan.
 *
 * LO QUE ESTO **NO** ES. No es control de acceso. Que una acción no aparezca es
 * FOCO, no seguridad: su ruta vuelve a exigir capacidad y permiso, y RLS decide
 * qué filas existen. Al revés también: que aparezca no concede nada.
 *
 * TAMPOCO CONOCE RUTAS NI ICONOS. Devuelve claves; la presentación las traduce
 * a un enlace y a un icono. Así el dominio no importa nada de `next` ni de la
 * capa de vista, que es la regla de dependencias del proyecto.
 */

import type { FeatureFlagKey } from '../tenant/feature-flags';
import type { CodigoDePermiso, EspacioDeTrabajo } from './workspace';

/**
 * Los códigos se escriben literales y NO se importa `PERMISO` como valor.
 *
 * Dos razones. La de fondo: ningún módulo de dominio importa valores de otro
 * —solo tipos—, y romper esa costumbre por una tabla de constantes no compensa.
 * La práctica: el tipo `CodigoDePermiso` ya obliga a que cada cadena de aquí
 * exista de verdad, así que una errata o un permiso renombrado rompe la
 * compilación igual que si se nombrara la constante.
 */

/** Lo que separa a gerencia de recepción: responder por el dinero. */
const REPORTES: CodigoDePermiso = 'reports.read';

/**
 * Con qué mirada se abre el tablero.
 *
 * Se deduce de lo que la persona PUEDE, nunca del nombre de su rol (la misma
 * regla que `espacioDeTrabajo`): recepción y gerencia comparten el espacio
 * `gimnasio` y la diferencia real es que gerencia responde por el dinero, y eso
 * se nombra con `reports.read`, no con la cadena «manager».
 */
export type EnfoqueDeTablero = 'mostrador' | 'gerencia' | 'administracion' | 'socio' | 'entrenador' | 'plataforma';

export function enfoqueDeTablero(espacio: EspacioDeTrabajo, permisos: readonly string[]): EnfoqueDeTablero {
  if (espacio === 'plataforma') return 'plataforma';
  if (espacio === 'administracion') return 'administracion';
  if (espacio === 'entrenador') return 'entrenador';
  if (espacio === 'socio') return 'socio';
  return permisos.includes(REPORTES) ? 'gerencia' : 'mostrador';
}

/**
 * Bloques en que se reparte un dashboard operativo.
 *
 * `operacion` es el día (mostrador, entradas, clases), `dinero` es lo cobrado y
 * lo que falta cobrar, `socios` son las personas y `sucursales` el reparto por
 * sede. El orden cambia con el enfoque; el contenido, no: nadie pierde una
 * sección por mirar desde otro puesto.
 */
export type BloqueDeTablero = 'operacion' | 'dinero' | 'socios' | 'sucursales';

const ORDEN: Readonly<Record<EnfoqueDeTablero, readonly BloqueDeTablero[]>> = {
  // §9: recepción abre con el mostrador. El dinero le interesa —cobra— pero
  // después de haber dejado entrar a quien tiene delante.
  mostrador: ['operacion', 'socios', 'dinero', 'sucursales'],
  // §10 y §13: gerencia responde por ingresos, pagos y comprobantes. Ese bloque
  // va primero aunque la operación siga estando completa más abajo.
  gerencia: ['dinero', 'operacion', 'socios', 'sucursales'],
  administracion: ['dinero', 'operacion', 'socios', 'sucursales'],
  socio: ['operacion', 'socios', 'dinero', 'sucursales'],
  entrenador: ['operacion', 'socios', 'dinero', 'sucursales'],
  plataforma: ['socios', 'operacion', 'dinero', 'sucursales'],
};

/** Cómo se nombra cada puesto en pantalla. El enfoque sale de permisos, no del rol. */
export const NOMBRE_DE_ENFOQUE: Readonly<Record<EnfoqueDeTablero, string>> = {
  mostrador: 'Recepcion',
  gerencia: 'Gerencia',
  administracion: 'Administracion',
  socio: 'Socio',
  entrenador: 'Entrenador',
  plataforma: 'Plataforma',
};

export function ordenDelTablero(enfoque: EnfoqueDeTablero): readonly BloqueDeTablero[] {
  return ORDEN[enfoque];
}

/**
 * V5 · CUÁNTO SE ENSEÑA DE CADA BLOQUE AL ABRIR LA PÁGINA.
 *
 * El encargo del cliente fue claro: el tablero de recepción tiene que ser
 * agradable y no saturar a quien no es del área. Pero «quitar» tampoco vale:
 * recepción cobra, así que necesita el dinero a mano.
 *
 * La salida es la misma que usa cualquier panel de mostrador serio: lo del
 * turno, abierto; lo demás, a un clic y con su título a la vista. Nada
 * desaparece —ningún bloque se deja de dibujar— y quien quiera el detalle lo
 * abre. Un plegado no es seguridad: lo de dentro es lo mismo que antes.
 */
export type ProfundidadDeBloque = 'abierto' | 'plegado';

const PROFUNDIDAD: Readonly<Record<EnfoqueDeTablero, Readonly<Record<BloqueDeTablero, ProfundidadDeBloque>>>> = {
  // Recepción: el turno. El dinero y las personas quedan a un clic.
  mostrador: { operacion: 'abierto', dinero: 'plegado', socios: 'plegado', sucursales: 'plegado' },
  // Gerencia responde por el dinero y por el día; el resto, a un clic.
  gerencia: { dinero: 'abierto', operacion: 'abierto', socios: 'plegado', sucursales: 'plegado' },
  // Administración mira el gimnasio entero, pero tampoco necesita todo abierto.
  administracion: { dinero: 'abierto', operacion: 'abierto', socios: 'plegado', sucursales: 'plegado' },
  socio: { operacion: 'abierto', dinero: 'abierto', socios: 'abierto', sucursales: 'abierto' },
  entrenador: { operacion: 'abierto', dinero: 'abierto', socios: 'abierto', sucursales: 'abierto' },
  plataforma: { socios: 'abierto', operacion: 'abierto', dinero: 'abierto', sucursales: 'abierto' },
};

export function profundidadDelBloque(enfoque: EnfoqueDeTablero, bloque: BloqueDeTablero): ProfundidadDeBloque {
  return PROFUNDIDAD[enfoque][bloque];
}

/**
 * El saludo de la cabecera, con la hora LOCAL DEL GIMNASIO (nunca la del
 * servidor: a las 23:00 de La Paz el servidor ya está en el día siguiente).
 */
export function saludoDelTablero(hora: number): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * LO QUE NECESITA ATENCIÓN HOY.
 *
 * Un tablero que enseña doce números obliga a la persona a decidir cuál importa.
 * Esto lo decide antes: convierte los contadores en una lista corta de cosas que
 * alguien tiene que hacer, ordenada por urgencia, y vacía cuando no hay nada
 * —que es una respuesta, no un hueco—.
 */
export type ClaveDeAtencion = 'comprobantes' | 'por-vencer' | 'vencidas' | 'sin-membresia' | 'sin-venir';

export interface AsuntoDeAtencion {
  readonly clave: ClaveDeAtencion;
  readonly cantidad: number;
  /** `urgente` se pinta con el color de acción; `aviso`, sin gritar. */
  readonly tono: 'urgente' | 'aviso';
}

export interface ConteosDelDia {
  /** Comprobantes subidos esperando revisión. */
  readonly comprobantesPendientes: number;
  /** Membresías que vencen en los próximos días. */
  readonly porVencer: number;
  readonly vencidas: number;
  readonly sinMembresia: number;
  readonly sinVenir7d: number;
}

/**
 * Orden: primero lo que tiene a alguien esperando (un comprobante sin revisar
 * es un socio que pagó y no puede entrenar), después lo que se pierde si nadie
 * llama, y al final lo que conviene mirar.
 */
export function asuntosDelDia(conteos: ConteosDelDia): readonly AsuntoDeAtencion[] {
  const asuntos: AsuntoDeAtencion[] = [
    { clave: 'comprobantes', cantidad: conteos.comprobantesPendientes, tono: 'urgente' },
    { clave: 'por-vencer', cantidad: conteos.porVencer, tono: 'urgente' },
    { clave: 'vencidas', cantidad: conteos.vencidas, tono: 'aviso' },
    { clave: 'sin-membresia', cantidad: conteos.sinMembresia, tono: 'aviso' },
    { clave: 'sin-venir', cantidad: conteos.sinVenir7d, tono: 'aviso' },
  ];
  return asuntos.filter((asunto) => asunto.cantidad > 0);
}

export type ClaveDeAccionRapida =
  | 'escanear'
  | 'nuevo-socio'
  | 'socios'
  | 'membresias'
  | 'comprobantes'
  | 'clases'
  | 'ingresos'
  | 'accesos'
  | 'personal'
  | 'anuncios'
  | 'inventario';

/**
 * Una acción de la primera fila del tablero, con lo que hace falta para verla.
 *
 * `capacidad` es lo que el gimnasio CONTRATÓ y `permiso` lo que la persona
 * puede: las dos hacen falta y significan cosas distintas, igual que en la
 * navegación del panel.
 */
export interface AccionRapida {
  readonly clave: ClaveDeAccionRapida;
  readonly etiqueta: string;
  /** Una línea que dice qué pasa al pulsar. Sin ella la tarjeta es un icono mudo. */
  readonly descripcion: string;
  readonly capacidad: FeatureFlagKey | null;
  readonly permiso: CodigoDePermiso | null;
  readonly enfoques: readonly EnfoqueDeTablero[];
}

const OPERACION: readonly EnfoqueDeTablero[] = ['mostrador', 'gerencia', 'administracion'];

/**
 * El catálogo, en ORDEN DE PRIORIDAD.
 *
 * El orden es el del encargo (§9): escanear, dar de alta, cobrar, membresías.
 * Lo que sigue son las operaciones que el mismo puesto repite durante el día.
 */
export const ACCIONES_RAPIDAS: readonly AccionRapida[] = [
  {
    clave: 'escanear',
    etiqueta: 'Escanear QR',
    descripcion: 'Registra la entrada de quien está en el mostrador',
    capacidad: 'enableAttendance',
    permiso: 'attendance.create',
    enfoques: OPERACION,
  },
  {
    clave: 'nuevo-socio',
    etiqueta: 'Nuevo socio',
    descripcion: 'Alta con plan, cobro y QR en un solo formulario',
    capacidad: 'enableMemberManagement',
    permiso: 'customers.create',
    enfoques: OPERACION,
  },
  {
    clave: 'comprobantes',
    etiqueta: 'Pagos por revisar',
    descripcion: 'Comprobantes de pago por QR esperando aprobación',
    capacidad: 'enablePayments',
    permiso: 'payments.read',
    enfoques: OPERACION,
  },
  {
    clave: 'inventario',
    etiqueta: 'Inventario',
    descripcion: 'Qué queda en el mostrador de esta sede',
    capacidad: 'enableInventory',
    permiso: 'inventory.read',
    enfoques: OPERACION,
  },
  {
    clave: 'membresias',
    etiqueta: 'Membresías',
    descripcion: 'A quién le vence y a quién hay que renovar',
    capacidad: 'enableMemberManagement',
    permiso: 'customers.read',
    enfoques: OPERACION,
  },
  {
    clave: 'clases',
    etiqueta: 'Clases de hoy',
    descripcion: 'Tomar asistencia y autorizar a quien llega',
    capacidad: 'enableClasses',
    permiso: 'classes.attend',
    enfoques: OPERACION,
  },
  {
    clave: 'accesos',
    etiqueta: 'Ingresos',
    descripcion: 'Quién cruzó qué puerta, a qué hora y en qué sede',
    capacidad: 'enableAttendance',
    permiso: 'attendance.read',
    enfoques: ['gerencia', 'administracion'],
  },
  {
    clave: 'ingresos',
    etiqueta: 'Reportes de dinero',
    descripcion: 'Pagos, ingresos por plan y comprobantes del periodo',
    capacidad: 'enableReports',
    permiso: 'reports.read',
    enfoques: ['gerencia', 'administracion'],
  },
  {
    clave: 'anuncios',
    etiqueta: 'Anuncios',
    descripcion: 'Lo que ve el socio al abrir la página del gimnasio',
    capacidad: 'enableAnnouncements',
    permiso: 'content.manage',
    enfoques: ['gerencia', 'administracion'],
  },
  {
    clave: 'personal',
    etiqueta: 'Personal y roles',
    descripcion: 'Quién trabaja aquí y qué puede hacer cada cuenta',
    capacidad: null,
    permiso: 'users.read',
    enfoques: ['administracion'],
  },
];

export interface ContextoDeTablero {
  readonly enfoque: EnfoqueDeTablero;
  /** Capacidades contratadas por el gimnasio. */
  readonly capacidades: Readonly<Partial<Record<FeatureFlagKey, boolean>>>;
  readonly permisos: readonly string[];
  /**
   * Si hay una sede donde esta persona pueda registrar entradas AHORA.
   *
   * No basta con tener `attendance.create`: quien trabaja por asignación y no
   * tiene ninguna sede operable no puede escanear, y ofrecerle el botón sería
   * mandarlo a un error. Lo resuelve la capa de arriba con la misma regla que
   * usa la base (`app.puede_operar_sucursal`).
   */
  readonly puedeOperarEnSede: boolean;
}

/**
 * Las acciones que le tocan a esta persona, en orden de prioridad.
 *
 * Cuántas se enseñan lo decide la pantalla; aquí solo se filtra y se ordena.
 */
export function accionesRapidas(contexto: ContextoDeTablero): readonly AccionRapida[] {
  return ACCIONES_RAPIDAS.filter((accion) => {
    if (!accion.enfoques.includes(contexto.enfoque)) return false;
    if (accion.capacidad !== null && contexto.capacidades[accion.capacidad] !== true) return false;
    if (accion.permiso !== null && !contexto.permisos.includes(accion.permiso)) return false;
    if (accion.clave === 'escanear' && !contexto.puedeOperarEnSede) return false;
    return true;
  });
}
