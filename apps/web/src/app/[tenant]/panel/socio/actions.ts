'use server';

import { revalidatePath } from 'next/cache';
import { supabaseConfig } from '@infra/auth/supabase.config';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  const config = supabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Para obtener el usuario que inició sesión
import { getAuthenticatedUser } from '@infra/auth/supabase.server';

export interface EstadoCambioContrasena {
  readonly mensaje?: string;
  readonly exito?: string;
  readonly errores?: { readonly password?: string; readonly confirmacion?: string };
}

export async function descartarSugerenciaContrasena() {
  const user = await getAuthenticatedUser();
  if (!user) return;

  const adminAuth = getAdminSupabase();
  if (!adminAuth) return;

  await adminAuth.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, needs_password_change: false }
  });
}

export async function cambiarContrasenaSugerida(previo: EstadoCambioContrasena, formData: FormData): Promise<EstadoCambioContrasena> {
  const user = await getAuthenticatedUser();
  if (!user) return { mensaje: 'No estás autenticado.' };

  const password = formData.get('password') as string | null;
  const confirmacion = formData.get('confirmacion') as string | null;

  if (!password || password.length < 8) {
    return { errores: { password: 'La contraseña debe tener al menos 8 caracteres.' } };
  }
  if (password !== confirmacion) {
    return { errores: { confirmacion: 'Las contraseñas no coinciden.' } };
  }

  const adminAuth = getAdminSupabase();
  if (!adminAuth) return { mensaje: 'Error interno del servidor.' };

  const { error } = await adminAuth.auth.admin.updateUserById(user.id, {
    password: password,
    user_metadata: { ...user.user_metadata, needs_password_change: false }
  });

  if (error) {
    return { mensaje: error.message };
  }

  const tenantSlug = user.user_metadata.tenant_slug;
  if (tenantSlug) revalidatePath(`/${tenantSlug}/panel/socio`);

  return { exito: 'Contraseña actualizada.' };
}
