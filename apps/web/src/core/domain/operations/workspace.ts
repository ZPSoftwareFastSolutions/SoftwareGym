/**
 * CAPA: Domain / Operations
 *
 * Qué espacio de trabajo le corresponde a quien entra.
 *
 * LA DECISIÓN QUE IMPORTA: el destino sale de los PERMISOS, no del nombre
 * del rol. Un rol es una bolsa de permisos y el producto es enlatado: mañana
 * un gimnasio querrá un rol «encargado de turno» que no existe hoy, y si el
 * enrutado mirara `rol === 'manager'` habría que tocar código para darle de
 * alta. Mirando permisos, el rol nuevo llega a su sitio solo.
 *
 * Esto NO es control de acceso. Decide qué pantalla se ofrece; quién puede
 * leer qué lo decide RLS en la base, y cada ruta lo vuelve a comprobar por su
 * cuenta. Falsear esta decisión solo lleva a una pantalla vacía.
 */

/** Los roles del sistema. Se conservan por nombre solo para mostrarlos. */
export type CodigoDeRol = 'super_admin' | 'manager' | 'receptionist' | 'trainer' | 'customer';

export const NOMBRE_DE_ROL: Readonly<Record<CodigoDeRol, string>> = {
  super_admin: 'Administrador de la plataforma',
  manager: 'Gerencia',
  receptionist: 'Recepción',
  trainer: 'Entrenador',
  customer: 'Socio',
};

/**
 * Los espacios de trabajo. Cada uno es una ruta distinta y una pantalla
 * distinta: mezclarlos en una sola con condicionales termina en una página
 * que nadie entiende y que filtra por descuido.
 */
export type EspacioDeTrabajo = 'plataforma' | 'gimnasio' | 'entrenador' | 'socio';

/** Segmento de ruta de cada espacio, bajo `/[tenant]/panel`. */
export const SEGMENTO_DE_ESPACIO: Readonly<Record<EspacioDeTrabajo, string>> = {
  plataforma: 'panel/plataforma',
  gimnasio: 'panel/gimnasio',
  entrenador: 'panel/entrenador',
  socio: 'panel/socio',
};

/**
 * Permisos que este módulo consulta. Se nombran aquí para que un cambio en la
 * base rompa la compilación en un sitio y no en quince.
 */
export const PERMISO = {
  administrarGimnasios: 'tenants.manage',
  verDashboard: 'dashboard.read',
  verReportes: 'reports.read',
  verAsistencia: 'attendance.read',
  registrarAsistencia: 'attendance.create',
  verSocios: 'customers.read',
  verPagos: 'payments.read',
  configurar: 'settings.manage',
  // --- V2.2 · gestión ---
  crearSocios: 'customers.create',
  editarSocios: 'customers.update',
  archivarSocios: 'customers.archive',
  verMembresias: 'memberships.read',
  venderMembresias: 'memberships.create',
  editarMembresias: 'memberships.update',
  cobrar: 'payments.create',
  verUsuarios: 'users.read',
  gestionarUsuarios: 'users.manage',
  // --- V3.0 · multisucursal ---
  /** Alta, edición, activación, primaria y asignación de personal a sedes. */
  gestionarSucursales: 'branches.manage',
  /** Alcance: opera y consulta todas las sedes sin estar asignado a cada una. */
  todasLasSucursales: 'branches.all',
  // --- V3.1 · entrenadores + ejercicios ---
  verEntrenadores: 'trainers.read',
  /** Perfiles, cuenta, sedes, ausencias y asignaciones de socios. */
  gestionarEntrenadores: 'trainers.manage',
  /** Trabajar como entrenador: su perfil y sus socios asignados. */
  trabajarComoEntrenador: 'trainers.self',
  verEjercicios: 'exercises.read',
  gestionarEjercicios: 'exercises.manage',
  // --- V3.2 · programas, rutinas y progreso ---
  verRutinas: 'routines.read',
  gestionarRutinas: 'routines.manage',
  asignarRutinas: 'routines.assign',
  /** Marcar ejercicios completados de un socio (el socio marca los suyos sin permiso). */
  registrarEntrenamiento: 'training.log',
  verMetricasDeEntrenamiento: 'training.read',
  // --- V3.3 · clases grupales y sesiones ---
  verClases: 'classes.read',
  /** Clases, planes que las incluyen, horarios, generación y cancelación de sesiones. */
  gestionarClases: 'classes.manage',
  /** Registrar asistencia a una sesión (recepción en sus sedes, el instructor en las suyas). */
  tomarAsistenciaDeClase: 'classes.attend',
  /** Reglas comerciales de los planes (V3.1: si incluyen entrenador). */
  gestionarPlanes: 'plans.manage',
} as const;

export type CodigoDePermiso = (typeof PERMISO)[keyof typeof PERMISO];

export interface PerfilOperativo {
  readonly appUserId: string;
  /** Id del gimnasio. Las rutas de archivos empiezan por él. */
  readonly tenantId: string | null;
  readonly fullName: string;
  readonly email: string;
  readonly tenantSlug: string | null;
  readonly tenantName: string | null;
  readonly customerId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export function tienePermiso(perfil: PerfilOperativo, permiso: string): boolean {
  return perfil.permissions.includes(permiso);
}

/**
 * El orden de las comprobaciones no es casual: va del alcance más amplio al
 * más estrecho. Quien administra la plataforma no cae en el panel de un
 * gimnasio aunque tuviera también permisos de gimnasio.
 */
export function espacioDeTrabajo(perfil: PerfilOperativo): EspacioDeTrabajo {
  if (tienePermiso(perfil, PERMISO.administrarGimnasios)) return 'plataforma';
  if (tienePermiso(perfil, PERMISO.verDashboard)) return 'gimnasio';
  // Un entrenador con cuenta también suele tener rol de socio (se registró por
  // la web): su espacio de trabajo es el de entrenador.
  if (tienePermiso(perfil, PERMISO.trabajarComoEntrenador)) return 'entrenador';
  return 'socio';
}

/** Nombre legible del rol de mayor alcance, para saludar sin adivinar. */
export function rolPrincipal(perfil: PerfilOperativo): string {
  const orden: readonly CodigoDeRol[] = ['super_admin', 'manager', 'receptionist', 'trainer', 'customer'];
  const encontrado = orden.find((codigo) => perfil.roles.includes(codigo));
  return encontrado ? NOMBRE_DE_ROL[encontrado] : 'Cuenta';
}
