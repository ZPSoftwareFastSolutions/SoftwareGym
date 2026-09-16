/**
 * CAPA: Infrastructure / Auth
 *
 * Cliente de Supabase para el SERVIDOR (Server Components, Server Actions y
 * Route Handlers).
 *
 * La sesión viaja en COOKIES, no en `localStorage`. Es la diferencia entre un
 * token que cualquier script inyectado en la página puede leer y uno que el
 * navegador guarda y envía solo. Las opciones de `cookie-options.ts` la marcan
 * `HttpOnly`, `Secure` en producción y `SameSite=Lax`.
 *
 * Este módulo NUNCA debe importarse desde un componente de cliente.
 */

import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { endurecerCookie } from './cookie-options';
import { isSupabaseConfigured, requireSupabaseConfig } from './supabase.config';

export async function createSupabaseServerClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, endurecerCookie(options));
          }
        } catch {
          // Un Server Component no puede escribir cookies. La renovación del
          // token la hace el middleware, así que aquí se ignora sin ruido:
          // lanzar rompería el renderizado por algo que ya está cubierto.
        }
      },
    },
  });
}

/**
 * Usuario autenticado, o `null`.
 *
 * Usa `getUser()` y NO `getSession()`. `getSession()` devuelve lo que venga en
 * la cookie sin comprobar la firma contra el servidor de autenticación: sirve
 * para pintar, no para decidir. Cualquier control de acceso tiene que apoyarse
 * en `getUser()`, que sí valida.
 *
 * Sin configuración de Supabase devuelve `null` en vez de lanzar: para una
 * ruta protegida, «no hay sesión» y «no hay proveedor de sesiones» llevan al
 * mismo sitio —fuera—, y así una variable ausente no convierte un 307 limpio
 * en un error 500.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const estado = await estadoDeSesion();
  return estado.estado === 'autenticado' ? estado.user : null;
}

/**
 * Estado REAL de la sesión, con tres respuestas y no dos.
 *
 * EL BUG QUE ARREGLA (V4.2). `getAuthenticatedUser` devolvía `null` ante
 * cualquier error, y quien lo llamaba mandaba al formulario de acceso. Un hipo
 * de red al validar el token —el servidor de autenticación tarda, la petición
 * se corta— se presentaba como «tu sesión terminó»: la persona perdía lo que
 * estaba haciendo por una incidencia que no tenía nada que ver con su sesión.
 *
 * `anonimo` e `indisponible` NO son lo mismo y no llevan al mismo sitio:
 * - `anonimo`      no hay sesión, o caducó de verdad → al acceso.
 * - `indisponible` no se pudo comprobar → error temporal; la sesión no se toca.
 *
 * CÓMO SE DISTINGUEN. Las cookies dicen si esta persona AFIRMA tener sesión.
 * Sin cookie de Supabase no hay nada que validar: es un visitante, y punto. Con
 * cookie, un fallo de transporte (`AuthRetryableFetchError`, o una excepción de
 * `fetch`) es indisponibilidad; un rechazo explícito del servidor de
 * autenticación —token inválido o caducado— sí es una sesión terminada.
 */
export type EstadoDeSesion =
  | { readonly estado: 'autenticado'; readonly user: User }
  | { readonly estado: 'anonimo' }
  | { readonly estado: 'indisponible' };

/** Cookie de sesión de Supabase: `sb-<ref>-auth-token`, que puede venir troceada. */
function pareceCookieDeSesion(nombre: string): boolean {
  return nombre.startsWith('sb-') && nombre.includes('auth-token');
}

export async function estadoDeSesion(): Promise<EstadoDeSesion> {
  // Sin proveedor de sesiones nadie está autenticado, y eso no es una avería:
  // el sitio público funciona sin Supabase.
  if (!isSupabaseConfigured()) return { estado: 'anonimo' };

  const cookieStore = await cookies();
  const afirmaTenerSesion = cookieStore.getAll().some((c) => pareceCookieDeSesion(c.name));

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (!error && data.user) return { estado: 'autenticado', user: data.user };

    // Sin cookie no hay sesión que validar: visitante, no fallo.
    if (!afirmaTenerSesion) return { estado: 'anonimo' };

    // Con cookie: solo el fallo de transporte es indisponibilidad. Un token
    // rechazado por el servidor es una sesión que de verdad terminó.
    const transporte = error?.name === 'AuthRetryableFetchError' || error?.status === undefined || error?.status === 0;
    return transporte ? { estado: 'indisponible' } : { estado: 'anonimo' };
  } catch {
    // `fetch` lanzó: no se pudo preguntar. Jamás se interpreta como «sin sesión».
    return afirmaTenerSesion ? { estado: 'indisponible' } : { estado: 'anonimo' };
  }
}
