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

/**
 * Correo con dominio de al menos dos niveles y TLD alfabético. Rechaza
 * `a@b`, `a@b.` y `a@b.1`, que el patrón anterior dejaba pasar.
 *
 * No pretende ser una implementación de RFC 5322: ese patrón es célebre por su
 * tamaño y sigue aceptando direcciones que ningún servidor entrega. Aquí basta
 * con descartar lo evidentemente mal escrito; quién existe de verdad lo decide
 * el correo de confirmación, que es la única comprobación que no se puede
 * falsear.
 */
const PATRON_EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)*\.[A-Za-z]{2,}$/;

/**
 * Nombre de persona: letras, espacios, apóstrofo y guion.
 *
 * Se permiten tildes, diéresis y ñ —«Muñoz», «Peña», «Aliaga»— y también
 * nombres compuestos con guion. Se rechazan DÍGITOS, que es lo que se pidió,
 * y de paso los símbolos que no aparecen en un nombre real.
 *
 * El rango incluye los caracteres latinos extendidos en vez de una lista de
 * letras concreta: apellidos como «Gonçalves» o «Müller» existen en Bolivia y
 * un patrón más estrecho los rechazaría sin motivo.
 */
const PATRON_NOMBRE = /^[\p{L}\p{M}][\p{L}\p{M}'\-. ]*$/u;

/** El mismo patrón, en la forma que entiende el atributo `pattern` del HTML. */
export const PATRON_NOMBRE_HTML = "[\\p{L}\\p{M}][\\p{L}\\p{M}'\\-. ]*";

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

  const nombre = datos.fullName.trim();
  if (!nombre) {
    errores.fullName = 'Escribe tu nombre completo.';
  } else if (nombre.length < 3) {
    errores.fullName = 'El nombre es demasiado corto.';
  } else if (nombre.length > 120) {
    errores.fullName = 'El nombre es demasiado largo.';
  } else if (/\d/.test(nombre)) {
    // Mensaje propio para el caso más frecuente: el genérico «carácter no
    // permitido» deja al usuario buscando cuál es.
    errores.fullName = 'El nombre no puede llevar números.';
  } else if (!PATRON_NOMBRE.test(nombre)) {
    errores.fullName = 'El nombre solo admite letras, espacios, apóstrofos y guiones.';
  }

  const correo = datos.email.trim();
  if (!correo) {
    errores.email = 'Escribe tu correo.';
  } else if (correo.length > 254) {
    // Límite de la RFC 5321 para la dirección completa.
    errores.email = 'Ese correo es demasiado largo.';
  } else if (!PATRON_EMAIL.test(correo)) {
    errores.email = 'Ese correo no tiene un formato válido.';
  }

  if (!datos.password) {
    errores.password = 'Elige una contraseña.';
  } else if (datos.password.length < LARGO_MINIMO_PASSWORD) {
    errores.password = `La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
  } else if (datos.password.length > 72) {
    // bcrypt trunca en 72 bytes: más allá, los caracteres extra no cuentan y
    // el usuario creería tener una contraseña más fuerte de la que tiene.
    errores.password = 'La contraseña no puede pasar de 72 caracteres.';
  } else if (correo && datos.password.toLowerCase() === correo.toLowerCase()) {
    errores.password = 'La contraseña no puede ser igual a tu correo.';
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
