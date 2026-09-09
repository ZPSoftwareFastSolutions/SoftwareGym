/**
 * CAPA: Infrastructure / Auth
 *
 * Endurecimiento de la cookie de sesión.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO: `@supabase/ssr` no marca la cookie como
 * `HttpOnly`, porque su caso general contempla un cliente de Supabase
 * ejecutándose en el navegador que necesita leer el token. Aquí no lo hay:
 * el acceso, el registro y el cierre de sesión son acciones de servidor, y las
 * consultas salen de Server Components. Nada en el navegador necesita leer ese
 * valor.
 *
 * Dejarlo legible significaba que `document.cookie` devolvía el token de
 * acceso Y el de refresco. Con `'unsafe-inline'` todavía presente en la
 * política de scripts, un XSS habría podido llevarse la sesión completa y
 * renovarla indefinidamente desde fuera. Marcándola `HttpOnly`, un XSS puede
 * actuar como el usuario mientras la página está abierta, pero no se lleva la
 * credencial.
 *
 * Si algún día hace falta un cliente de Supabase en el navegador, esto habrá
 * que revisarlo, y la decisión debe ser consciente: no volver a quitarlo solo
 * porque «algo dejó de funcionar».
 */

import type { CookieOptions } from '@supabase/ssr';

const EN_PRODUCCION = process.env.NODE_ENV === 'production';

export function endurecerCookie(options: CookieOptions | undefined): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    // `Secure` solo en producción: en desarrollo el sitio va por http y el
    // navegador descartaría la cookie, dejando la sesión imposible de probar.
    secure: EN_PRODUCCION,
    // `lax` deja pasar la navegación normal desde fuera pero corta el envío en
    // peticiones cruzadas de terceros, que es el vector de CSRF.
    sameSite: 'lax',
    path: '/',
  };
}
