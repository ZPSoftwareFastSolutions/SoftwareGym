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
export async function getAuthenticatedUser() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
