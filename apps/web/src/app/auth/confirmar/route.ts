/**
 * Retorno del enlace de confirmación de correo.
 *
 * FALTABA ENTERO. `signUp` no enviaba `emailRedirectTo`, así que Supabase caía
 * en la «Site URL» del panel —que estaba en `http://localhost:3000`— y el
 * enlace del correo llevaba a la máquina del propio socio. No había nada que
 * confirmara nada.
 *
 * Esta ruta cubre las dos formas en que puede volver el enlace, porque depende
 * de la plantilla de correo configurada en Supabase y no conviene atarse a una:
 *
 *   · `?code=...`                 flujo PKCE, se canjea por sesión
 *   · `?token_hash=...&type=...`  plantilla con `{{ .TokenHash }}`
 *
 * Es un Route Handler y no una página porque aquí no hay nada que mostrar: se
 * verifica y se redirige. Dejar al usuario en una pantalla intermedia con la
 * palabra «confirmando» solo añade un paso a algo que ya terminó.
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@infra/auth/supabase.server';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';

/**
 * El destino se valida contra el registro de tenants antes de redirigir.
 *
 * Sin esto, `?next=https://sitio-malicioso` convertiría esta ruta en un
 * redirector abierto: un enlace que empieza en nuestro dominio —y por tanto
 * parece de fiar— y termina donde quiera el atacante. Solo se acepta el slug
 * de un gimnasio existente, y la ruta se construye aquí.
 */
async function slugSeguro(slugCrudo: string | null): Promise<string | null> {
  if (!slugCrudo) return null;
  const tenant = await getTenantBySlug(tenantRepository(), slugCrudo.trim().toLowerCase());
  return tenant ? tenant.slug : null;
}

const TIPOS_VALIDOS: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const slug = await slugSeguro(searchParams.get('gimnasio'));

  /**
   * EL BUG QUE ARREGLA (V4.2). Esta ruta SÍ establecía la sesión —canjea el
   * código y escribe las cookies—, pero redirigía SIEMPRE a `/<slug>/acceso`:
   * el usuario terminaba de confirmar su correo y aparecía en el formulario de
   * login, así que volvía a escribir sus credenciales creyendo que no había
   * funcionado. La sesión ya estaba puesta; lo que fallaba era el destino.
   *
   * Ahora, confirmado el correo, se entra directo a `/<slug>/panel`, que
   * reparte a cada quien a su espacio según sus permisos. Si algo falló, el
   * destino sigue siendo el acceso, que es lo correcto.
   */
  const paginaDeAcceso = (marca: '1' | '0' | 'fragmento') => {
    const url = new URL(slug ? `/${slug}/acceso` : '/', origin);
    url.searchParams.set('confirmado', marca);
    return url;
  };

  const paginaDePanel = () => {
    if (!slug) return paginaDeAcceso('1');
    const url = new URL(`/${slug}/panel`, origin);
    url.searchParams.set('confirmado', '1');
    return url;
  };

  const fallo = paginaDeAcceso('0');

  // Supabase puede devolver el error en la propia URL (enlace ya usado o
  // caducado). Se detecta antes de intentar canjear nada.
  if (searchParams.get('error') || searchParams.get('error_code')) {
    return NextResponse.redirect(fallo);
  }

  if (!isSupabaseConfigured()) return NextResponse.redirect(fallo);

  const supabase = await createSupabaseServerClient();

  const code = searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(error ? fallo : paginaDePanel());
  }

  const tokenHash = searchParams.get('token_hash');
  const tipo = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && tipo && TIPOS_VALIDOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (error) return NextResponse.redirect(fallo);
    // `recovery` es la excepción: quien viene a cambiar su contraseña no debe
    // caer en el panel como si nada, sino en la pantalla de acceso.
    return NextResponse.redirect(tipo === 'recovery' ? paginaDeAcceso('1') : paginaDePanel());
  }

  // Sin parámetros en la consulta. Es lo que devuelve un enlace REENVIADO:
  // `resend` no usa PKCE y Supabase pone el resultado en el fragmento
  // (`#access_token=…` o `#error=…`), que nunca llega al servidor. El correo
  // ya quedó confirmado —o no— en Supabase antes de redirigir aquí.
  //
  // Se manda al acceso SIN fragmento en la URL: el navegador conserva el
  // original al seguir la redirección, y el formulario lo lee en cliente y lo
  // borra de la barra. Quien llegó aquí a mano, sin fragmento, ve el acceso
  // sin ningún aviso.
  return NextResponse.redirect(paginaDeAcceso('fragmento'));
}
