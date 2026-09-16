/**
 * CAPA: Domain / Operations
 *
 * Admisiones a una sesión de clase (V4.2).
 *
 * EL PROBLEMA QUE RESUELVEN. Hasta aquí, quién entraba a una clase lo decidía
 * solo el plan, y el modo `abierta` significaba «cualquiera que tenga ficha en
 * el gimnasio»: exactamente lo que el cliente pidió evitar. Y un NO SOCIO no
 * podía ni registrarse.
 *
 * Una admisión dice: «esta persona concreta está autorizada a esta sesión
 * concreta». Vale para las dos audiencias con la misma forma:
 *
 *   SOCIO AUTORIZADO      un socio al que se deja entrar a una clase que su
 *                         plan no cubre (una promoción)
 *   INVITADO AUTORIZADO   alguien sin ficha, del que se guarda nombre,
 *                         documento y teléfono
 *
 * Y quien no tiene admisión, en una clase de modo `autorizados`, no entra
 * aunque tenga la mejor membresía del gimnasio. Lo decide la BASE
 * (`app.acceso_a_clase`), no esta capa: aquí solo están las reglas puras que la
 * pantalla necesita para anticipar y para no ofrecer lo que la base rechaza.
 */

/**
 * El modo de acceso `autorizados` vive en `classes.ts` junto a los otros tres,
 * no aquí: duplicar el tipo habría dejado dos listas que se contradicen en
 * cuanto alguien añada un modo en una sola de ellas.
 */

/** Una persona autorizada a una sesión, sea socia o invitada. */
export interface Admision {
  readonly id: string;
  readonly sessionId: string;
  /** `null` cuando es un invitado sin ficha. */
  readonly customerId: string | null;
  readonly customerCode: string | null;
  readonly nombre: string;
  readonly esInvitado: boolean;
  readonly documento: string | null;
  readonly telefono: string | null;
  readonly motivo: string | null;
  /** ISO de la llegada, o `null` si está autorizada y todavía no vino. */
  readonly llegadaEn: string | null;
  readonly vino: boolean;
}

export const LARGO_MINIMO_DE_NOMBRE = 2;
export const LARGO_MAXIMO_DE_NOMBRE = 120;
export const LARGO_MAXIMO_DE_MOTIVO = 200;

export interface DatosDeAdmision {
  /** Uno de los dos, nunca los dos ni ninguno. */
  readonly customerId: string | null;
  readonly nombre: string;
  readonly documento: string;
  readonly telefono: string;
  readonly motivo: string;
}

/**
 * Validación de lo que llega del formulario. La base lo vuelve a comprobar con
 * su CHECK; esto existe para decir QUÉ campo está mal, que un 23514 no lo dice.
 */
export function validarAdmision(datos: DatosDeAdmision): Readonly<Record<string, string>> {
  const errores: Record<string, string> = {};
  const esSocio = datos.customerId !== null && datos.customerId.trim() !== '';
  const nombre = datos.nombre.trim();

  if (esSocio) {
    // El nombre de un socio sale de su ficha: escribirlo aquí sería un dato
    // duplicado que puede contradecir al original.
    if (nombre !== '') errores.nombre = 'Para un socio no se escribe el nombre: sale de su ficha.';
  } else if (nombre.length < LARGO_MINIMO_DE_NOMBRE || nombre.length > LARGO_MAXIMO_DE_NOMBRE) {
    errores.nombre = `Escribe el nombre del invitado (entre ${LARGO_MINIMO_DE_NOMBRE} y ${LARGO_MAXIMO_DE_NOMBRE} caracteres).`;
  }

  const documento = datos.documento.trim();
  if (documento !== '' && (documento.length < 3 || documento.length > 30)) {
    errores.documento = 'El documento tiene entre 3 y 30 caracteres.';
  }

  if (datos.motivo.length > LARGO_MAXIMO_DE_MOTIVO) {
    errores.motivo = `El motivo no puede pasar de ${LARGO_MAXIMO_DE_MOTIVO} caracteres.`;
  }

  return errores;
}

/** Cuántos lugares consume una lista de admisiones sobre el cupo de la sesión. */
export function lugaresQueOcupan(admisiones: readonly Admision[]): number {
  // Un SOCIO admitido ya cuenta por su asistencia o su reserva cuando llega:
  // contarlo también aquí lo contaría dos veces (la lección del contador de
  // «ocupados» de V3.4). El invitado, en cambio, no existe en ninguna otra
  // tabla, así que es el único que suma.
  return admisiones.filter((a) => a.esInvitado).length;
}

export interface ResumenDeAdmisiones {
  readonly total: number;
  readonly invitados: number;
  readonly socios: number;
  readonly vinieron: number;
}

export function resumirAdmisiones(admisiones: readonly Admision[]): ResumenDeAdmisiones {
  return {
    total: admisiones.length,
    invitados: admisiones.filter((a) => a.esInvitado).length,
    socios: admisiones.filter((a) => !a.esInvitado).length,
    vinieron: admisiones.filter((a) => a.vino).length,
  };
}

/** Mensaje de mostrador para un error de la base al admitir. */
export function mensajeDeErrorDeAdmision(codigo: string): string {
  if (codigo.includes('clase_llena')) return 'La sesión está llena: no quedan lugares que autorizar.';
  if (codigo.includes('sesion_cancelada')) return 'Esta sesión está cancelada.';
  if (codigo.includes('sesion_no_disponible')) return 'Esa sesión no existe o no es de este gimnasio.';
  if (codigo.includes('csa_un_invitado_por_sesion') || codigo.includes('csa_un_socio_por_sesion') || codigo.includes('23505')) {
    return 'Esa persona ya está autorizada en esta sesión.';
  }
  if (codigo.includes('csa_socio_o_invitado') || codigo.includes('23514')) {
    return 'Autoriza a un socio o a un invitado con nombre, no a los dos.';
  }
  if (codigo.includes('sin_permiso') || codigo.includes('42501')) {
    return 'Tu cuenta no puede autorizar personas en esta sesión.';
  }
  return 'No se pudo autorizar. Vuelve a intentarlo.';
}
