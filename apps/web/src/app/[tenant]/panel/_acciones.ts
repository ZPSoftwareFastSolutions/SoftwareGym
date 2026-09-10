/**
 * Contexto compartido de las acciones de servidor del panel.
 *
 * Toda acción de gestión empieza igual: resolver el gimnasio contra el
 * registro —nunca confiar en el campo oculto del formulario—, comprobar que la
 * capacidad está contratada, que hay sesión y que la sesión pertenece a ESE
 * gimnasio. Escrito una vez aquí, ninguna acción puede olvidarse un paso.
 *
 * Nada de esto sustituye a RLS. Es la capa que devuelve un mensaje legible;
 * la que impide la escritura sigue siendo la base.
 */

import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import type { FeatureFlags } from '@core/domain/tenant/feature-flags';
import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { tienePermiso, type PerfilOperativo } from '@core/domain/operations/workspace';
import type { ImagenValidada } from '@core/application/ports/receipts-repository.port';
import {
  detectarTipoDeImagen,
  TAMANO_MAXIMO_DE_IMAGEN,
} from '@core/domain/operations/receipts';
import type { OperationsRepositoryPort } from '@core/application/ports/operations-repository.port';
import { operationsRepository, tenantRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';

export interface EstadoDeFormulario {
  readonly errores?: Readonly<Record<string, string>>;
  readonly mensaje?: string;
  readonly exito?: string;
  /** Lo que se envió, para volver a pintarlo si hubo errores. */
  readonly valores?: Readonly<Record<string, string>>;
}

export interface ContextoDeAccion {
  readonly slug: string;
  readonly tenant: TenantConfig;
  readonly perfil: PerfilOperativo;
  readonly repo: OperationsRepositoryPort;
}

export function texto(form: FormData, campo: string, largo = 500): string {
  const valor = form.get(campo);
  return typeof valor === 'string' ? valor.slice(0, largo) : '';
}

export function nulo(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

export async function contextoDeAccion(
  form: FormData,
  capacidades: readonly (keyof FeatureFlags)[],
  permiso?: string,
): Promise<{ ok: true; contexto: ContextoDeAccion } | { ok: false; mensaje: string }> {
  const slugCrudo = texto(form, 'tenantSlug', 60).trim().toLowerCase();
  const tenant = slugCrudo ? await getTenantBySlug(tenantRepository(), slugCrudo) : null;
  if (!tenant) return { ok: false, mensaje: 'No se pudo determinar el gimnasio.' };

  for (const capacidad of ['memberLogin', ...capacidades] as const) {
    if (tenant.features[capacidad] !== true) {
      return { ok: false, mensaje: 'Esta función no está disponible en este gimnasio.' };
    }
  }

  if (!isSupabaseConfigured()) return { ok: false, mensaje: 'El sistema no está disponible ahora mismo.' };

  const repo = await operationsRepository();
  const perfil = await repo.perfil();
  if (!perfil) return { ok: false, mensaje: 'Tu sesión terminó. Vuelve a entrar.' };

  // La sesión tiene que ser de ESTE gimnasio. Sin esto, un formulario de la
  // página de Aurora enviado con la sesión de Mítico escribiría en Mítico.
  if (perfil.tenantSlug !== tenant.slug) {
    return { ok: false, mensaje: 'Tu cuenta no pertenece a este gimnasio.' };
  }

  if (permiso && !tienePermiso(perfil, permiso)) {
    return { ok: false, mensaje: 'Tu cuenta no puede hacer esta operación.' };
  }

  return { ok: true, contexto: { slug: tenant.slug, tenant, perfil, repo } };
}

/**
 * Imagen subida en un formulario, validada por sus BYTES.
 *
 * El `type` del `File` lo escribe el navegador de quien sube —se falsifica con
 * cambiar la extensión—, así que no se usa para decidir nada. Se leen los
 * bytes mágicos: un HTML renombrado a `.jpg` no pasa.
 */
export async function imagenDeFormulario(
  form: FormData,
  campo: string,
): Promise<{ ok: true; imagen: ImagenValidada } | { ok: false; mensaje: string } | null> {
  const archivo = form.get(campo);
  if (!(archivo instanceof File) || archivo.size === 0) return null;

  if (archivo.size > TAMANO_MAXIMO_DE_IMAGEN) {
    return { ok: false, mensaje: 'La imagen pesa más de 5 MB. Usa una captura de pantalla.' };
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = detectarTipoDeImagen(bytes);
  if (!tipo) {
    return {
      ok: false,
      mensaje: 'Ese archivo no es una imagen JPG, PNG o WebP. Si es una foto HEIC de iPhone, sube una captura de pantalla.',
    };
  }
  return { ok: true, imagen: { bytes, tipo } };
}
