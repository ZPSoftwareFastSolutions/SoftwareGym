/**
 * CAPA: Infrastructure / Auth
 *
 * Pista de sesión para la cabecera.
 *
 * EL PROBLEMA. La cabecera tiene que saber si hay sesión para no ofrecer
 * «Acceso socios» a quien ya entró. Lo natural sería leer la sesión en el
 * layout del tenant, pero ese layout es el que prerenderiza las 24 páginas del
 * sitio público: en cuanto lee cookies, Next.js las pasa de estáticas a
 * dinámicas. Se perdería el servido desde CDN de todo el sitio comercial para
 * decidir el texto de un botón.
 *
 * LA SOLUCIÓN. El middleware —que ya valida la sesión en cada petición—
 * escribe esta cookie de pista. NO lleva token ni identidad: es un `1` que
 * solo dice «hay sesión». Al no ser `HttpOnly`, la cabecera la lee desde el
 * navegador y decide qué enlace mostrar, sin fetch adicional y sin sacar una
 * sola página del prerenderizado.
 *
 * NO ES UN CONTROL DE SEGURIDAD, Y NO DEBE USARSE COMO TAL. Cualquiera puede
 * escribirla desde la consola. Lo único que consigue con eso es ver un enlace
 * a «Mi panel» que, al pulsarlo, lo devuelve al formulario de acceso: el panel
 * comprueba la sesión de verdad con `getUser()` y, por debajo, RLS no entrega
 * una fila sin identidad válida. Falsear esta cookie no abre nada.
 */

export const COOKIE_PISTA_SESION = 'gp-sesion';

/**
 * Opciones de la cookie de pista.
 *
 * Deliberadamente SIN `httpOnly`: si no la puede leer el navegador, no sirve
 * para nada. Es la única cookie del proyecto de la que eso es cierto, y por
 * eso está aislada aquí en vez de mezclada con las opciones de la sesión real.
 */
export function opcionesPistaSesion(enProduccion: boolean) {
  return {
    httpOnly: false,
    secure: enProduccion,
    sameSite: 'lax' as const,
    path: '/',
    // Se refresca en cada petición desde el middleware; una hora basta para
    // que no sobreviva mucho a una sesión caducada si el usuario cierra todo.
    maxAge: 60 * 60,
  };
}
