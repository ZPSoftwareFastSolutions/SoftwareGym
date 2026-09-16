'use server';

/**
 * Acciones de servidor del acceso de socios.
 *
 * TODO lo que decide algo ocurre aquí, no en el formulario. El componente
 * valida para que el usuario no pierda el tiempo; esta capa valida porque
 * cualquiera puede saltarse el formulario y llamar directo.
 *
 * DECISIÓN DE SEGURIDAD — el gimnasio sale de la RUTA, no del formulario.
 * `tenantSlug` se resuelve contra el registro de tenants del servidor. Si
 * viniera de un campo del formulario, un usuario podría registrarse diciendo
 * que pertenece a otro gimnasio. Es la regla §11 del documento maestro
 * aplicada al registro: el tenant nunca es dato del cliente.
 */

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { marcarSesionAbierta, marcarSesionCerrada } from '@infra/auth/session-hint';
import {
  correoValido,
  MENSAJE_CORREO_YA_REGISTRADO,
  MENSAJE_CUENTA_DE_OTRO_GIMNASIO,
  mensajeDeErrorDeAcceso,
  resultadoDelAlta,
  validarLogin,
  validarRegistro,
} from '@core/application/auth/login.usecase';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { decidirLoginPorGimnasio, type CuentaAlIniciarSesion } from '@core/domain/operations/acceso-al-panel';
import { tenantRepository } from '@infra/config/composition-root';
import { createSupabaseServerClient } from '@infra/auth/supabase.server';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { SITE_URL } from '@/lib/site-url';

export interface EstadoFormulario {
  readonly errores?: Readonly<Record<string, string>>;
  readonly mensaje?: string;
  readonly exito?: string;
  /**
   * Correo de un alta que quedó esperando confirmación. Permite ofrecer
   * «reenviar» sin pedirlo otra vez: el formulario ya se vació.
   */
  readonly correoPendiente?: string;
}

/** Adónde vuelve el enlace del correo. El gimnasio lo valida la ruta de retorno. */
function retornoDelCorreo(slug: string): string {
  return `${SITE_URL}/auth/confirmar?gimnasio=${encodeURIComponent(slug)}`;
}

/** El slug solo es válido si corresponde a un gimnasio del registro. */
async function resolverTenant(slugCrudo: unknown): Promise<string | null> {
  if (typeof slugCrudo !== 'string') return null;
  const tenant = await getTenantBySlug(tenantRepository(), slugCrudo.trim().toLowerCase());
  return tenant?.slug ?? null;
}

/**
 * Un despliegue sin las variables de Supabase no puede autenticar. Se dice
 * así, en vez de dejar que reviente: el socio no tiene por qué ver una traza,
 * y quien administra el sitio necesita saber que el fallo es de configuración
 * y no de sus credenciales.
 */
const ACCESO_NO_CONFIGURADO =
  'El acceso de socios no está disponible en este momento. Escríbenos por WhatsApp y lo resolvemos.';

/**
 * A qué gimnasio pertenece la cuenta que acaba de autenticarse, según la BASE.
 *
 * Se consulta con el MISMO cliente que hizo `signInWithPassword`, que ya lleva
 * la sesión en memoria: así la lectura pasa por RLS como esa cuenta, y no
 * depende de que las cookies recién escritas se relean en esta misma petición.
 */
async function cuentaRecienAutenticada(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CuentaAlIniciarSesion> {
  const { data, error } = await supabase.from('v_my_profile').select('tenant_slug, permissions').maybeSingle();
  if (error) return { estado: 'indisponible' };
  if (!data) return { estado: 'sin-cuenta' };
  const fila = data as { tenant_slug: unknown; permissions: unknown };
  const permisos = Array.isArray(fila.permissions) ? fila.permissions : [];
  return {
    estado: 'ok',
    tenantSlug: typeof fila.tenant_slug === 'string' ? fila.tenant_slug : null,
    esPlataforma: permisos.includes('tenants.manage'),
  };
}

function texto(form: FormData, campo: string): string {
  const valor = form.get(campo);
  return typeof valor === 'string' ? valor : '';
}

export async function iniciarSesion(
  _estadoPrevio: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const slug = await resolverTenant(form.get('tenantSlug'));
  if (!slug) return { mensaje: 'No se pudo determinar el gimnasio.' };
  if (!isSupabaseConfigured()) return { mensaje: ACCESO_NO_CONFIGURADO };

  const email = texto(form, 'email').trim().toLowerCase();
  const password = texto(form, 'password');

  const validacion = validarLogin({ email, password });
  if (!validacion.ok) return { errores: validacion.errores };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // El código del proveedor no se expone: solo un mensaje neutro. Devolver
    // «ese usuario no existe» convertiría el formulario en un comprobador de
    // qué correos están registrados en el gimnasio.
    return { mensaje: mensajeDeErrorDeAcceso(error.code) };
  }

  // V4.2 · LA PUERTA DE UN GIMNASIO SOLO ABRE A LOS SUYOS. Supabase Auth es
  // uno para todos los gimnasios, así que la contraseña correcta de una cuenta
  // de otro gimnasio pasaba este punto y abría sesión. Ahora se pregunta a la
  // base a qué gimnasio pertenece y, si no es el de la ruta, la sesión que se
  // acaba de crear se cierra antes de devolver nada.
  const decision = decidirLoginPorGimnasio(await cuentaRecienAutenticada(supabase), slug);
  if (decision !== 'permitir') {
    // `local`: cierra SOLO esta sesión recién abierta. Con el alcance global se
    // cerrarían también las sesiones legítimas que esa persona tenga abiertas
    // en su propio gimnasio, en otro dispositivo.
    await supabase.auth.signOut({ scope: 'local' });
    marcarSesionCerrada(await cookies());
    return {
      mensaje:
        decision === 'reintentar'
          ? 'No pudimos comprobar tu cuenta en este momento. Vuelve a intentarlo.'
          : decision === 'otro-gimnasio'
            // Solo llega aquí quien escribió la contraseña CORRECTA: decirle
            // que su cuenta es de otro gimnasio no enseña nada a un atacante.
            // Con «contraseña incorrecta» la persona probaba claves contra un
            // problema que no era suyo, y luego intentaba registrarse.
            ? MENSAJE_CUENTA_DE_OTRO_GIMNASIO
            // Sin gimnasio: el mismo texto que una contraseña incorrecta.
            : mensajeDeErrorDeAcceso(undefined),
    };
  }

  // La pista de la cabecera se escribe AQUÍ y no se deja al middleware.
  //
  // La respuesta de esta acción ya trae renderizado el panel al que redirige:
  // el navegador no pide una página nueva, el middleware no se ejecuta y la
  // pista no se escribía. El socio entraba, veía su panel, y la cabecera
  // seguía ofreciéndole «Acceso socios» hasta que navegaba a otra parte.
  marcarSesionAbierta(await cookies());

  revalidatePath(`/${slug}`, 'layout');
  redirect(`/${slug}/panel`);
}

export async function registrarse(
  _estadoPrevio: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const slug = await resolverTenant(form.get('tenantSlug'));
  if (!slug) return { mensaje: 'No se pudo determinar el gimnasio.' };
  if (!isSupabaseConfigured()) return { mensaje: ACCESO_NO_CONFIGURADO };

  const email = texto(form, 'email').trim().toLowerCase();
  const password = texto(form, 'password');
  const fullName = texto(form, 'fullName').trim();

  const validacion = validarRegistro({ email, password, fullName, tenantSlug: slug });
  if (!validacion.ok) return { errores: validacion.errores };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // SIN ESTO el enlace del correo caía en la «Site URL» del panel de
      // Supabase, que apuntaba a localhost: el socio recibía un enlace a su
      // propia máquina y no había nada que confirmara la cuenta.
      //
      // El dominio sale de SITE_URL, que en Vercel se deduce solo. El gimnasio
      // viaja como parámetro para devolver al socio a la página de acceso del
      // suyo, y la ruta de retorno lo valida contra el registro antes de usarlo.
      emailRedirectTo: retornoDelCorreo(slug),

      // Estos metadatos los consume el disparador `app.handle_new_auth_user`,
      // que valida el slug contra la tabla `tenants` y asigna SIEMPRE el rol
      // `customer`. Aunque alguien llamara a la API de Supabase directamente
      // con otros metadatos, no podría concederse un rol: el rol no se lee de
      // aquí, se escribe en el disparador.
      data: { tenant_slug: slug, full_name: fullName },
    },
  });

  if (error) {
    return { mensaje: mensajeDeErrorDeAcceso(error.code, 'registro') };
  }

  // V4.2 · «YA REGISTRADO» SE DICE. Antes el mensaje era el mismo en los dos
  // casos para no revelar qué correos existen, pero con el correo ya
  // registrado Supabase NO envía nada: la persona esperaba un correo que no
  // llegaba y concluía que el registro estaba roto. Es la misma respuesta que
  // esta app ya da cuando Supabase devuelve `user_already_exists`, así que no
  // abre una fuga nueva; los intentos seguidos los frena el límite de Auth.
  if (resultadoDelAlta(data.user?.identities) === 'ya-registrado') {
    return { mensaje: MENSAJE_CORREO_YA_REGISTRADO };
  }

  return {
    exito:
      `Listo. Te enviamos un enlace de confirmación a ${email}. ` +
      'Si no lo ves en unos minutos, revisa la carpeta de spam o promociones.',
    correoPendiente: email,
  };
}

/**
 * Reenvía el enlace de confirmación de un alta pendiente.
 *
 * La respuesta es la misma exista o no una cuenta pendiente con ese correo:
 * aquí sí se puede ser neutro sin engañar, porque la persona acaba de ver el
 * mensaje del alta y sabe qué correo espera.
 */
export async function reenviarConfirmacion(
  _estadoPrevio: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const slug = await resolverTenant(form.get('tenantSlug'));
  if (!slug) return { mensaje: 'No se pudo determinar el gimnasio.' };
  if (!isSupabaseConfigured()) return { mensaje: ACCESO_NO_CONFIGURADO };

  const email = texto(form, 'email').trim().toLowerCase();
  if (!correoValido(email)) return { mensaje: 'Ese correo no tiene un formato válido.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: retornoDelCorreo(slug) },
  });

  if (error) {
    return { mensaje: mensajeDeErrorDeAcceso(error.code, 'registro'), correoPendiente: email };
  }
  return {
    exito:
      `Te volvimos a enviar el enlace a ${email}. ` +
      'Revisa también spam o promociones; si pides otro enseguida, el anterior deja de valer.',
    correoPendiente: email,
  };
}

export async function cerrarSesion(form: FormData): Promise<void> {
  const slug = await resolverTenant(form.get('tenantSlug'));

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  // La pista de la cabecera se retira AQUÍ y no se deja al middleware, por el
  // mismo motivo simétrico que al entrar: el middleware ya se ejecutó para
  // esta petición —con la sesión todavía viva— y la respuesta de la acción
  // trae ya renderizado el destino, sin petición nueva que lo vuelva a pasar.
  marcarSesionCerrada(await cookies());

  if (slug) revalidatePath(`/${slug}`, 'layout');
  redirect(slug ? `/${slug}/acceso` : '/');
}
