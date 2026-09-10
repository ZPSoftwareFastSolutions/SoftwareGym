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

/** Los cuatro roles del sistema. Se conservan por nombre solo para mostrarlos. */
export type CodigoDeRol = 'super_admin' | 'manager' | 'receptionist' | 'customer';

export const NOMBRE_DE_ROL: Readonly<Record<CodigoDeRol, string>> = {
  super_admin: 'Administrador de la plataforma',
  manager: 'Gerencia',
  receptionist: 'Recepción',
  customer: 'Socio',
};

/**
 * Los espacios de trabajo. Cada uno es una ruta distinta y una pantalla
 * distinta: mezclarlos en una sola con condicionales termina en una página
 * que nadie entiende y que filtra por descuido.
 */
export type EspacioDeTrabajo = 'plataforma' | 'gimnasio' | 'socio';

/** Segmento de ruta de cada espacio, bajo `/[tenant]/panel`. */
export const SEGMENTO_DE_ESPACIO: Readonly<Record<EspacioDeTrabajo, string>> = {
  plataforma: 'panel/plataforma',
  gimnasio: 'panel/gimnasio',
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
  return 'socio';
}

/** Nombre legible del rol de mayor alcance, para saludar sin adivinar. */
export function rolPrincipal(perfil: PerfilOperativo): string {
  const orden: readonly CodigoDeRol[] = ['super_admin', 'manager', 'receptionist', 'customer'];
  const encontrado = orden.find((codigo) => perfil.roles.includes(codigo));
  return encontrado ? NOMBRE_DE_ROL[encontrado] : 'Cuenta';
}
