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
export type CodigoDeRol = 'super_admin' | 'admin' | 'manager' | 'receptionist' | 'trainer' | 'customer';

export const NOMBRE_DE_ROL: Readonly<Record<CodigoDeRol, string>> = {
  super_admin: 'Administrador de la plataforma',
  admin: 'Administración',
  manager: 'Gerencia',
  receptionist: 'Recepción',
  trainer: 'Entrenador',
  customer: 'Socio',
};

export function esCodigoDeRol(valor: unknown): valor is CodigoDeRol {
  return typeof valor === 'string' && Object.hasOwn(NOMBRE_DE_ROL, valor);
}

/** Roles de un gimnasio: todos menos el de la plataforma. */
export type RolDeGimnasio = Exclude<CodigoDeRol, 'super_admin'>;

/**
 * V4 · JERARQUÍA DE ROLES DEL GIMNASIO. La base guarda el mismo número en
 * `roles.level` y es la que decide; este espejo solo sirve para no ofrecer en
 * pantalla un botón que la base va a rechazar.
 *
 * - Con `roles.manage` (Administración) se otorga y quita hasta el PROPIO nivel:
 *   un administrador puede nombrar a otro.
 * - Con `users.manage` sin `roles.manage` (Gerencia), solo roles POR DEBAJO: un
 *   gerente no nombra gerentes ni administradores, ni toca a quien está a su altura.
 * - Nadie se quita sus propios roles (dejaría el gimnasio sin quien lo administre).
 */
export const NIVEL_DE_ROL: Readonly<Record<RolDeGimnasio, number>> = {
  admin: 40,
  manager: 30,
  receptionist: 20,
  trainer: 10,
  customer: 0,
};

/**
 * Los que se otorgan desde «Personal y roles». Entrenador y socio tienen su
 * propio flujo: el rol de entrenador llega al vincular su perfil (sin perfil
 * sería un espacio vacío) y el de socio nace con el registro.
 */
export const ROLES_OTORGABLES: readonly RolDeGimnasio[] = ['admin', 'manager', 'receptionist'];

/** Nivel más alto entre los roles de gimnasio de una cuenta. Un código desconocido no suma. */
export function nivelDeRoles(roles: readonly string[]): number {
  return roles.reduce((maximo, rol) => {
    if (!esCodigoDeRol(rol) || rol === 'super_admin') return maximo;
    return Math.max(maximo, NIVEL_DE_ROL[rol]);
  }, 0);
}

/** Si quien entra puede otorgar o quitar ESE rol (sin mirar a quién). */
export function puedeOtorgarRol(perfil: PerfilOperativo, rol: RolDeGimnasio): boolean {
  if (!tienePermiso(perfil, PERMISO.gestionarUsuarios)) return false;
  const propio = nivelDeRoles(perfil.roles);
  return tienePermiso(perfil, PERMISO.gestionarRoles) ? NIVEL_DE_ROL[rol] <= propio : NIVEL_DE_ROL[rol] < propio;
}

/** Si quien entra puede tocar los roles o el estado de OTRA cuenta con esos roles. */
export function puedeAdministrarCuenta(perfil: PerfilOperativo, cuenta: { readonly id: string; readonly roles: readonly string[] }): boolean {
  if (cuenta.id === perfil.appUserId) return false;
  if (!tienePermiso(perfil, PERMISO.gestionarUsuarios)) return false;
  const propio = nivelDeRoles(perfil.roles);
  const ajeno = nivelDeRoles(cuenta.roles);
  return tienePermiso(perfil, PERMISO.gestionarRoles) ? ajeno <= propio : ajeno < propio;
}

/**
 * Los espacios de trabajo. Cada uno es una ruta distinta y una pantalla
 * distinta: mezclarlos en una sola con condicionales termina en una página
 * que nadie entiende y que filtra por descuido.
 */
export type EspacioDeTrabajo = 'plataforma' | 'administracion' | 'gimnasio' | 'entrenador' | 'socio';

/** Segmento de ruta de cada espacio, bajo `/[tenant]/panel`. */
export const SEGMENTO_DE_ESPACIO: Readonly<Record<EspacioDeTrabajo, string>> = {
  plataforma: 'panel/plataforma',
  administracion: 'panel/administracion',
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
  // --- V4 · administración del gimnasio ---
  /** Otorgar y quitar roles hasta el propio nivel (Administración). */
  gestionarRoles: 'roles.manage',
  verAuditoria: 'audit.read',
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
  // --- V4.1 · anuncios del sitio ---
  /** Publicar y editar los anuncios de la vitrina. Administración y gerencia. */
  gestionarContenido: 'content.manage',
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
  // Administración del gimnasio: quien gestiona roles llega a su resumen de
  // administración; la operación del día sigue a un clic (`panel/gimnasio`).
  if (tienePermiso(perfil, PERMISO.gestionarRoles) && tienePermiso(perfil, PERMISO.verDashboard)) return 'administracion';
  if (tienePermiso(perfil, PERMISO.verDashboard)) return 'gimnasio';
  // Un entrenador con cuenta también suele tener rol de socio (se registró por
  // la web): su espacio de trabajo es el de entrenador.
  if (tienePermiso(perfil, PERMISO.trabajarComoEntrenador)) return 'entrenador';
  return 'socio';
}

/** Nombre legible del rol de mayor alcance, para saludar sin adivinar. */
export function rolPrincipal(perfil: PerfilOperativo): string {
  const orden: readonly CodigoDeRol[] = ['super_admin', 'admin', 'manager', 'receptionist', 'trainer', 'customer'];
  const encontrado = orden.find((codigo) => perfil.roles.includes(codigo));
  return encontrado ? NOMBRE_DE_ROL[encontrado] : 'Cuenta';
}
