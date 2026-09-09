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
async function destinoSeguro(slugCrudo: string | null): Promise<string> {
  if (!slugCrudo) return '/';
  const tenant = await getTenantBySlug(tenantRepository(), slugCrudo.trim().toLowerCase());
  return tenant ? `/${tenant.slug}/acceso` : '/';
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

  const base = await destinoSeguro(searchParams.get('gimnasio'));
  const exito = new URL(base, origin);
  const fallo = new URL(base, origin);
  exito.searchParams.set('confirmado', '1');
  fallo.searchParams.set('confirmado', '0');

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
    return NextResponse.redirect(error ? fallo : exito);
  }

  const tokenHash = searchParams.get('token_hash');
  const tipo = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && tipo && TIPOS_VALIDOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    return NextResponse.redirect(error ? fallo : exito);
  }

  // Sin parámetros no hay nada que verificar: alguien llegó aquí a mano.
  return NextResponse.redirect(fallo);
}
