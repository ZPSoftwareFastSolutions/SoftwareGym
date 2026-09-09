/**
 * Renovación de la sesión en cada petición.
 *
 * Los tokens de Supabase caducan en una hora. Sin esto, la sesión se cae sola
 * mientras alguien está trabajando: recepción registrando un cobro y, de
 * pronto, de vuelta al formulario de acceso. El middleware refresca la cookie
 * y la reenvía en la respuesta.
 *
 * NO decide accesos. La comprobación de permisos vive en cada página con
 * `getAuthenticatedUser()` y, sobre todo, en las políticas RLS de la base. Un
 * middleware es un filtro de conveniencia: se le escapan las rutas que no
 * coinciden con su `matcher`, y confiar en él para autorizar es cómo se dejan
 * huecos.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { endurecerCookie } from '@infra/auth/cookie-options';
import { supabaseConfig } from '@infra/auth/supabase.config';
import { COOKIE_PISTA_SESION, opcionesPistaSesion } from '@infra/auth/session-hint';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sin configuración de Supabase el sitio público debe seguir funcionando:
  // el sitio público no depende de la base para nada.
  const config = supabaseConfig();
  if (!config) return response;

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          // Mismo endurecimiento que en el cliente de servidor: si el
          // middleware reescribiera la cookie con las opciones por defecto,
          // desharía el `HttpOnly` en la siguiente renovación de token.
          response.cookies.set(name, value, endurecerCookie(options));
        }
      },
    },
  });

  // `getUser()` valida la firma contra el servidor de autenticación y, de
  // paso, dispara la renovación. `getSession()` no valida nada.
  const { data } = await supabase.auth.getUser();

  // Pista para la cabecera: sin ella habría que leer la sesión en el layout
  // del tenant, y eso sacaría del prerenderizado a las 24 páginas del sitio
  // público solo para decidir el texto de un botón. No lleva token; ver
  // `session-hint.ts`.
  const opciones = opcionesPistaSesion(process.env.NODE_ENV === 'production');
  if (data.user) {
    response.cookies.set(COOKIE_PISTA_SESION, '1', opciones);
  } else if (request.cookies.has(COOKIE_PISTA_SESION)) {
    // La sesión caducó o se cerró en otra pestaña: la pista se retira sola.
    response.cookies.set(COOKIE_PISTA_SESION, '', { ...opciones, maxAge: 0 });
  }

  return response;
}

export const config = {
  matcher: [
    // Todo salvo estáticos e imágenes: no tiene sentido renovar la sesión
    // mientras se sirve un tipo de letra.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
