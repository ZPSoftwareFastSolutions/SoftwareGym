/**
 * CAPA: Application / Auth
 *
 * Validación de las credenciales ANTES de tocar el proveedor de identidad.
 *
 * Es validación de forma, no de negocio: comprueba que lo que llega parece una
 * credencial. Confirmar quién es el usuario le corresponde a Supabase Auth.
 * Está aquí y no en el componente porque el formulario valida para la
 * experiencia, y el servidor valida para la seguridad; nunca al revés.
 */

export interface CredencialesLogin {
  readonly email: string;
  readonly password: string;
}

export interface DatosRegistro extends CredencialesLogin {
  readonly fullName: string;
  readonly tenantSlug: string;
}

export type ResultadoValidacion =
  | { readonly ok: true }
  | { readonly ok: false; readonly errores: Readonly<Record<string, string>> };

const PATRON_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/**
 * Mínimo de 8 caracteres, alineado con lo que exige Supabase Auth. No se
 * imponen reglas de composición —un símbolo, un número, una mayúscula—: las
 * guías actuales del NIST desaconsejan esas reglas porque empujan a la gente a
 * `Password1!` y a reutilizarla en todas partes. La longitud es lo que importa.
 */
const LARGO_MINIMO_PASSWORD = 8;

export function validarLogin(datos: CredencialesLogin): ResultadoValidacion {
  const errores: Record<string, string> = {};

  if (!datos.email.trim()) {
    errores.email = 'Escribe tu correo.';
  } else if (!PATRON_EMAIL.test(datos.email.trim())) {
    errores.email = 'Ese correo no tiene un formato válido.';
  }

  if (!datos.password) {
    errores.password = 'Escribe tu contraseña.';
  }

  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true };
}

export function validarRegistro(datos: DatosRegistro): ResultadoValidacion {
  const errores: Record<string, string> = {};

  if (!datos.fullName.trim()) {
    errores.fullName = 'Escribe tu nombre completo.';
  } else if (datos.fullName.trim().length < 3) {
    errores.fullName = 'El nombre es demasiado corto.';
  } else if (datos.fullName.trim().length > 120) {
    errores.fullName = 'El nombre es demasiado largo.';
  }

  if (!datos.email.trim()) {
    errores.email = 'Escribe tu correo.';
  } else if (!PATRON_EMAIL.test(datos.email.trim())) {
    errores.email = 'Ese correo no tiene un formato válido.';
  }

  if (!datos.password) {
    errores.password = 'Elige una contraseña.';
  } else if (datos.password.length < LARGO_MINIMO_PASSWORD) {
    errores.password = `La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
  }

  if (!datos.tenantSlug.trim()) {
    errores.general = 'No se pudo determinar el gimnasio.';
  }

  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true };
}

/**
 * Traduce el error del proveedor a un mensaje para el usuario.
 *
 * Al iniciar sesión nunca distingue entre «ese correo no existe» y «la
 * contraseña es incorrecta»: responder cosas distintas convierte el formulario
 * en un comprobador de qué correos están registrados en el gimnasio.
 *
 * El `contexto` existe porque el mensaje por defecto no puede ser el mismo en
 * los dos casos: «correo o contraseña incorrectos» delante de un formulario de
 * alta no significa nada y deja al usuario probando contraseñas contra un
 * problema que no es suyo.
 */
export function mensajeDeErrorDeAcceso(
  codigo: string | undefined,
  contexto: 'login' | 'registro' = 'login',
): string {
  switch (codigo) {
    case 'email_not_confirmed':
      return 'Tienes que confirmar tu correo antes de entrar. Revisa tu bandeja.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Ese correo ya tiene una cuenta. Prueba a iniciar sesión.';
    case 'weak_password':
      return 'Esa contraseña es demasiado débil. Usa una más larga.';
    case 'email_address_invalid':
      // Supabase rechaza dominios que no puede entregar. Sin este caso el
      // usuario recibía «contraseña incorrecta» por escribir mal su correo.
      return 'Ese correo no parece válido. Revisa que el dominio esté bien escrito.';
    case 'signup_disabled':
      return 'El registro está cerrado ahora mismo. Acércate a recepción.';
    default:
      return contexto === 'registro'
        ? 'No pudimos crear la cuenta. Vuelve a intentarlo en un momento.'
        : 'Correo o contraseña incorrectos.';
  }
}
