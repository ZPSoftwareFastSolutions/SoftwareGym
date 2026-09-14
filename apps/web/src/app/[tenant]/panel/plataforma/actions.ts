'use server';

/**
 * Acciones de la plataforma (V4).
 *
 * Designar el primer administrador de un gimnasio. La plataforma no entra al
 * gimnasio ni lee sus socios: solo otorga el rol a una cuenta que ya se
 * registró en el sitio de ese gimnasio. `contextoDeAccion` no sirve aquí —exige
 * que la sesión sea DEL gimnasio de la ruta, y la plataforma no pertenece a
 * ninguno—, así que esta acción comprueba su propio permiso y la RPC lo repite.
 */

import { revalidatePath } from 'next/cache';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { operationsRepository, staffRepository, tenantRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { texto, type EstadoDeFormulario } from '../_acciones';

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function designarAdministrador(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const slug = texto(form, 'tenantSlug', 60).trim().toLowerCase();
  const tenant = slug ? await getTenantBySlug(tenantRepository(), slug) : null;
  if (!tenant || !isSupabaseConfigured()) return { mensaje: 'No se pudo determinar la plataforma.' };

  const perfil = await (await operationsRepository()).perfil();
  if (!perfil) return { mensaje: 'Tu sesión terminó. Vuelve a entrar.' };
  if (!tienePermiso(perfil, PERMISO.administrarGimnasios)) return { mensaje: 'Tu cuenta no puede hacer esta operación.' };

  const correo = texto(form, 'correo', 120).trim();
  if (!PATRON_CORREO.test(correo)) return { errores: { correo: 'Escribe un correo válido.' } };

  const resultado = await (await staffRepository()).designarAdministrador(texto(form, 'tenantId', 40), correo);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  revalidatePath(`/${tenant.slug}/panel/plataforma`);
  return { exito: 'Listo: esa cuenta ya administra su gimnasio. Lo verá al volver a entrar.' };
}
