/**
 * CAPA: Infrastructure / Auth
 *
 * Enlace de acceso por correo (V4.2, ampliado en V5): entrar sin contraseña
 * para CREARLA.
 *
 * Resuelve dos casos con el mismo mecanismo de Supabase Auth
 * (`signInWithOtp`), sin `service_role` y sin guardar contraseñas en tablas
 * propias:
 *   · el socio que dio de alta recepción: tiene ficha con correo pero nunca tuvo
 *     cuenta. Se le crea al abrir el enlace; el correo queda confirmado y el
 *     disparador `vincular_cuenta_confirmada` la une a su ficha (correo
 *     confirmado + una sola ficha candidata).
 *   · quien olvidó su contraseña: el enlace le abre la sesión y la cambia.
 *
 * V5 · QUÉ DIRECCIÓN RECIBE EL ENLACE. Con el alias por gimnasio conviven dos
 * formas del mismo correo (`juan@` y `juan+gimnasio@`). Mandar el enlace a la
 * forma equivocada no falla: CREA UNA CUENTA NUEVA y la persona acaba con dos,
 * ninguna unida a su ficha. Por eso primero se busca a quién pertenece ya el
 * correo —probando las dos formas SIN permitir altas— y solo si no existe
 * ninguna se crea, con el alias, que es la forma canónica.
 *
 * FLUJO `implicit` Y SIN COOKIES, A PROPÓSITO. Con PKCE (el de la sesión
 * normal) el verificador se guarda en el navegador que PIDE el enlace; cuando lo
 * pide recepción desde el mostrador, el socio lo abre en su teléfono y el canje
 * fallaría. Con `implicit` el resultado viaja en el fragmento del enlace y lo
 * recoge la pantalla de acceso, que lo manda al servidor para abrir la sesión
 * con cookies HttpOnly.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { correosParaIniciarSesion } from '@core/application/auth/login.usecase';
import { supabaseConfig } from './supabase.config';

export interface PeticionDeEnlace {
  readonly email: string;
  readonly slug: string;
  /** URL absoluta a la que vuelve el enlace (`/auth/confirmar?...&activar=1`). */
  readonly retorno: string;
  /** Nombre para la cuenta que se crea (el de la ficha, si lo pide recepción). */
  readonly nombre?: string;
  /**
   * Crear la cuenta si no existe ninguna con ese correo. Lo piden recepción
   * («enviar acceso a este socio») y el primer acceso del socio; una
   * recuperación de contraseña a secas no tiene por qué crear nada.
   */
  readonly crearSiNoExiste?: boolean;
}

export type ResultadoDeEnlace =
  | { readonly ok: true; readonly correo: string; readonly cuentaNueva: boolean }
  | { readonly ok: false; readonly codigo: string };

/** Supabase responde esto cuando la dirección no tiene cuenta y no se permite crearla. */
const SIN_CUENTA = 'otp_disabled';

async function enviar(
  cliente: SupabaseClient,
  correo: string,
  peticion: PeticionDeEnlace,
  crear: boolean,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly codigo: string }> {
  const { error } = await cliente.auth.signInWithOtp({
    email: correo,
    options: {
      shouldCreateUser: crear,
      emailRedirectTo: peticion.retorno,
      // Solo cuenta para una cuenta NUEVA: el disparador `handle_new_auth_user`
      // valida el slug contra `tenants` y asigna SIEMPRE el rol de socio.
      data: { tenant_slug: peticion.slug, ...(peticion.nombre ? { full_name: peticion.nombre } : {}) },
    },
  });
  return error ? { ok: false, codigo: error.code ?? String(error.status ?? 'desconocido') } : { ok: true };
}

export async function enviarEnlaceDeAcceso(peticion: PeticionDeEnlace): Promise<ResultadoDeEnlace> {
  const config = supabaseConfig();
  if (!config) return { ok: false, codigo: 'no_configurado' };

  const cliente = createClient(config.url, config.publishableKey, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const candidatos = correosParaIniciarSesion(peticion.email, peticion.slug);

    for (const correo of candidatos) {
      const intento = await enviar(cliente, correo, peticion, false);
      if (intento.ok) return { ok: true, correo, cuentaNueva: false };
      // Si esa dirección no tiene cuenta se prueba la otra forma; cualquier otro
      // fallo (límite de envíos, servicio caído) se devuelve tal cual.
      if (intento.codigo !== SIN_CUENTA) return { ok: false, codigo: intento.codigo };
    }

    if (!peticion.crearSiNoExiste) return { ok: false, codigo: 'sin_cuenta' };

    const alias = candidatos[0] ?? peticion.email.trim().toLowerCase();
    const alta = await enviar(cliente, alias, peticion, true);
    return alta.ok ? { ok: true, correo: alias, cuentaNueva: true } : { ok: false, codigo: alta.codigo };
  } catch {
    return { ok: false, codigo: 'indisponible' };
  }
}
