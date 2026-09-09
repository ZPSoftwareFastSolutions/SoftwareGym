/**
 * CAPA: Infrastructure / Auth
 *
 * Cliente de Supabase para el SERVIDOR (Server Components, Server Actions y
 * Route Handlers).
 *
 * La sesión viaja en COOKIES, no en `localStorage`. Es la diferencia entre un
 * token que cualquier script inyectado en la página puede leer y uno que el
 * navegador guarda y envía solo. `@supabase/ssr` marca esas cookies como
 * `HttpOnly`, `Secure` y `SameSite=Lax`.
 *
 * Este módulo NUNCA debe importarse desde un componente de cliente.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { endurecerCookie } from './cookie-options';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase.config';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
