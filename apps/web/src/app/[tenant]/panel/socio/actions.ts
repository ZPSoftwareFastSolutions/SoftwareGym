'use server';

/**
 * CAPA: Presentation / App — acciones del panel del socio (V4.3).
 *
 * CAMBIAR LA CONTRASEÑA SUGERIDA SE HACE CON LA SESIÓN DEL PROPIO SOCIO.
 * Antes esto usaba `service_role` con `auth.admin.updateUserById`, y eso rompe
 * la regla 4 del proyecto: esa clave tiene BYPASSRLS, sirve para leer y
 * escribir CUALQUIER fila de CUALQUIER gimnasio, y con ella en el entorno del
 * servidor web un fallo de cualquier ruta pasa de «ver lo tuyo» a «ver todo».
 * No hacía falta para nada: `auth.updateUser` cambia la contraseña y los
 * metadatos de QUIEN TIENE LA SESIÓN, que es exactamente lo que se quiere, y
 * Supabase ya exige la sesión válida.
 *
 * El aviso aparece cuando la cuenta trae `needs_password_change` en sus
 * metadatos (la marca quien crea la cuenta con una contraseña provisional).
 * Descartarlo solo borra esa marca; no es una decisión de seguridad.
 */

import { revalidatePath } from 'next/cache';
import { errorDeContrasenaNueva } from '@core/application/auth/login.usecase';
import { operationsRepository } from '@infra/config/composition-root';
import { createSupabaseServerClient } from '@infra/auth/supabase.server';
import { getAuthenticatedUser } from '@infra/auth/supabase.server';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';

export interface EstadoCambioContrasena {
  readonly mensaje?: string;
  readonly exito?: string;
  readonly errores?: { readonly password?: string; readonly confirmacion?: string };
}

/** El gimnasio sale del perfil de la sesión, nunca de `user_metadata`: eso lo reescribe el propio usuario. */
async function slugDeLaSesion(): Promise<string | null> {
  const perfil = await (await operationsRepository()).perfil();
  return perfil?.tenantSlug ?? null;
}

export async function descartarSugerenciaContrasena(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const usuario = await getAuthenticatedUser();
  if (!usuario) return;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.updateUser({ data: { needs_password_change: false } });

  const slug = await slugDeLaSesion();
  if (slug) revalidatePath(`/${slug}/panel/socio`);
}

export async function cambiarContrasenaSugerida(
  _previo: EstadoCambioContrasena,
  form: FormData,
): Promise<EstadoCambioContrasena> {
  if (!isSupabaseConfigured()) return { mensaje: 'El acceso no está configurado en este entorno.' };

  const usuario = await getAuthenticatedUser();
  if (!usuario) return { mensaje: 'Tu sesión expiró. Vuelve a entrar para cambiar tu contraseña.' };

  const password = String(form.get('password') ?? '');
  const confirmacion = String(form.get('confirmacion') ?? '');

  // Las mismas reglas que el registro y que el alta por enlace: una sola
  // función del dominio, para que no haya tres ideas de «contraseña válida».
  const error = errorDeContrasenaNueva(password, usuario.email ?? '');
  if (error) return { errores: { password: error } };
  if (password !== confirmacion) return { errores: { confirmacion: 'Las dos contraseñas tienen que ser iguales.' } };

  const supabase = await createSupabaseServerClient();
  const { error: fallo } = await supabase.auth.updateUser({
    password,
    data: { needs_password_change: false },
  });

  if (fallo) {
    // `same_password`: Supabase rechaza repetir la actual. Para quien la escribe
    // es información útil, no un error del sistema.
    if (fallo.code === 'same_password') {
      return { errores: { password: 'Esa es la contraseña que ya tienes. Escribe una distinta.' } };
    }
    return { mensaje: 'No se pudo cambiar la contraseña. Vuelve a intentarlo.' };
  }

  const slug = await slugDeLaSesion();
  if (slug) revalidatePath(`/${slug}/panel/socio`);

  return { exito: 'Contraseña actualizada.' };
}
