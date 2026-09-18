/**
 * CAPA: Infrastructure / Auth
 *
 * Enlace de acceso por correo (V4.2): entrar sin contraseña para CREARLA.
 *
 * Resuelve dos casos con el mismo mecanismo de Supabase Auth
 * (`signInWithOtp`), sin `service_role` y sin guardar contraseñas en tablas
 * propias:
 *   · el socio que dio de alta recepción: tiene ficha con correo pero nunca tuvo
 *     cuenta. `shouldCreateUser` crea la cuenta; al abrir el enlace el correo
 *     queda confirmado y el disparador `vincular_cuenta_confirmada` la une a su
 *     ficha (correo confirmado + una sola ficha candidata).
 *   · quien olvidó su contraseña: el enlace le abre la sesión y la cambia.
 *
 * FLUJO `implicit` Y SIN COOKIES, A PROPÓSITO. Con PKCE (el de la sesión
 * normal) el verificador se guarda en el navegador que PIDE el enlace; cuando lo
 * pide recepción desde el mostrador, el socio lo abre en su teléfono y el canje
 * fallaría. Con `implicit` el resultado viaja en el fragmento del enlace y lo
 * recoge la pantalla de acceso, que lo manda al servidor para abrir la sesión
 * con cookies HttpOnly.
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase.config';

export interface PeticionDeEnlace {
  readonly email: string;
  readonly slug: string;
  /** URL absoluta a la que vuelve el enlace (`/auth/confirmar?...&activar=1`). */
  readonly retorno: string;
  /** Nombre para la cuenta que se crea (el de la ficha, si lo pide recepción). */
  readonly nombre?: string;
}

export type ResultadoDeEnlace = { readonly ok: true } | { readonly ok: false; readonly codigo: string };

export async function enviarEnlaceDeAcceso(peticion: PeticionDeEnlace): Promise<ResultadoDeEnlace> {
  const config = supabaseConfig();
  if (!config) return { ok: false, codigo: 'no_configurado' };

  const cliente = createClient(config.url, config.publishableKey, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { error } = await cliente.auth.signInWithOtp({
      email: peticion.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: peticion.retorno,
        // Solo cuenta para una cuenta NUEVA: el disparador `handle_new_auth_user`
        // valida el slug contra `tenants` y asigna SIEMPRE el rol de socio.
        data: { tenant_slug: peticion.slug, ...(peticion.nombre ? { full_name: peticion.nombre } : {}) },
      },
    });
    return error ? { ok: false, codigo: error.code ?? String(error.status ?? 'desconocido') } : { ok: true };
  } catch {
    return { ok: false, codigo: 'indisponible' };
  }
}
