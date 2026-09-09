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
import { COOKIE_PISTA_SESION, opcionesPistaSesion } from '@infra/auth/session-hint';
import {
  mensajeDeErrorDeAcceso,
  validarLogin,
  validarRegistro,
} from '@core/application/auth/login.usecase';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';
import { createSupabaseServerClient } from '@infra/auth/supabase.server';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { SITE_URL } from '@/lib/site-url';

export interface EstadoFormulario {
  readonly errores?: Readonly<Record<string, string>>;
  readonly mensaje?: string;
  readonly exito?: string;
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

  const { error } = await supabase.auth.signUp({
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
      emailRedirectTo: `${SITE_URL}/auth/confirmar?gimnasio=${encodeURIComponent(slug)}`,

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

  // No se distingue entre «cuenta creada» y «ese correo ya existía»: Supabase
  // devuelve éxito en ambos casos a propósito, para no filtrar qué correos
  // están registrados. El mensaje es el mismo.
  return {
    exito:
      'Listo. Si el correo es nuevo, te enviamos un enlace para confirmarlo. ' +
      'Revisa tu bandeja de entrada.',
  };
}

export async function cerrarSesion(form: FormData): Promise<void> {
  const slug = await resolverTenant(form.get('tenantSlug'));

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  // La pista de la cabecera se retira AQUÍ y no se deja al middleware.
  //
  // Al cerrar sesión, el middleware ya se había ejecutado para esta petición
  // —con la sesión todavía viva— y la navegación posterior la resuelve el
  // enrutador del cliente sin volver a pasar por él. Resultado observado: la
  // sesión se cerraba de verdad pero la cabecera seguía ofreciendo «Mi panel».
  (await cookies()).set(COOKIE_PISTA_SESION, '', {
    ...opcionesPistaSesion(process.env.NODE_ENV === 'production'),
    maxAge: 0,
  });

  if (slug) revalidatePath(`/${slug}`, 'layout');
  redirect(slug ? `/${slug}/acceso` : '/');
}
