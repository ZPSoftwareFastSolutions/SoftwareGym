/**
 * CAPA: Domain / Operations
 *
 * Personal y roles del gimnasio (V4): las cuentas, su nivel y cómo se lee la
 * actividad administrativa.
 *
 * La jerarquía (quién puede otorgar qué a quién) vive en `workspace.ts` junto a
 * los permisos, y la decide la base (`roles.level`, `app.puede_otorgar_nivel`).
 * Aquí solo lo que la pantalla necesita para mostrarlo con sentido.
 */

export type EstadoDeCuenta = 'active' | 'suspended' | 'invited';

export const NOMBRE_DE_ESTADO_DE_CUENTA: Readonly<Record<EstadoDeCuenta, string>> = {
  active: 'Activa',
  suspended: 'Suspendida',
  invited: 'Invitada',
};

export function esEstadoDeCuenta(valor: unknown): valor is EstadoDeCuenta {
  return valor === 'active' || valor === 'suspended' || valor === 'invited';
}

export interface CuentaDelGimnasio {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly status: EstadoDeCuenta;
  readonly createdAt: string;
  readonly customerId: string | null;
  /** Códigos de rol, del de mayor nivel al de menor. */
  readonly roles: readonly string[];
  readonly level: number;
  /** Tiene algún rol de personal (administración, gerencia, recepción o entrenador). */
  readonly isStaff: boolean;
}

export type FiltroDeCuentas = 'personal' | 'todas' | 'suspendidas';

export function esFiltroDeCuentas(valor: unknown): valor is FiltroDeCuentas {
  return valor === 'personal' || valor === 'todas' || valor === 'suspendidas';
}

export interface ResumenDePersonal {
  readonly administradores: number;
  readonly gerentes: number;
  readonly recepcion: number;
  readonly entrenadores: number;
  readonly cuentas: number;
  readonly suspendidas: number;
}

export const RESUMEN_DE_PERSONAL_VACIO: ResumenDePersonal = {
  administradores: 0,
  gerentes: 0,
  recepcion: 0,
  entrenadores: 0,
  cuentas: 0,
  suspendidas: 0,
};

export interface EventoAdministrativo {
  readonly id: string;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string | null;
  readonly occurredAt: string;
  readonly actorName: string | null;
  readonly targetName: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

const NOMBRE_CORTO_DE_ROL: Readonly<Record<string, string>> = {
  admin: 'Administración',
  manager: 'Gerencia',
  receptionist: 'Recepción',
  trainer: 'Entrenador',
  customer: 'Socio',
};

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

/**
 * «Otorgó Gerencia a Ana Rojas». Una acción desconocida se muestra con su
 * código: mejor un texto técnico que un evento que desaparece de la lista.
 */
export function describirEvento(evento: EventoAdministrativo): string {
  const destino = evento.targetName ?? 'una cuenta';
  const rol = texto(evento.metadata.role);
  const nombreDeRol = rol ? (NOMBRE_CORTO_DE_ROL[rol] ?? rol) : 'un rol';
  switch (evento.action) {
    case 'role.granted':
      return `Otorgó ${nombreDeRol} a ${destino}`;
    case 'role.revoked':
      return `Quitó ${nombreDeRol} a ${destino}`;
    case 'account.status_changed':
      return texto(evento.metadata.to) === 'active' ? `Reactivó la cuenta de ${destino}` : `Suspendió la cuenta de ${destino}`;
    case 'branch.created':
      return 'Creó una sucursal';
    case 'branch.updated':
      return 'Editó una sucursal';
    case 'branch.operational_changed':
      return 'Cambió su sede de trabajo';
    default:
      return `${evento.action} · ${evento.entity}`;
  }
}

/** Mensaje legible de un error de las RPC de personal. */
export function mensajeDeErrorDePersonal(codigo: string): string {
  if (codigo.includes('ultimo_administrador')) return 'Es el último administrador activo del gimnasio: nombra a otro antes de quitarle el rol o suspenderlo.';
  if (codigo.includes('cuenta_propia')) return 'No puedes cambiar tus propios roles ni suspender tu cuenta.';
  if (codigo.includes('ya_tiene_el_rol')) return 'Esa cuenta ya tiene ese rol.';
  if (codigo.includes('rol_no_otorgable')) return 'Ese rol no se otorga desde aquí. El de entrenador se da al vincular su perfil en «Entrenadores».';
  if (codigo.includes('cuenta_inactiva')) return 'La cuenta está suspendida: reactívala antes de darle un rol.';
  if (codigo.includes('cuenta_no_encontrada')) return 'No hay una cuenta activa con ese correo en este gimnasio. La persona tiene que registrarse primero en el sitio del gimnasio.';
  if (codigo.includes('sin_permiso') || codigo.includes('42501')) return 'Tu rol no puede hacer ese cambio sobre esa cuenta.';
  return 'No se pudo completar el cambio. Vuelve a intentarlo.';
}
