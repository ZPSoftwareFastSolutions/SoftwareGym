/**
 * CAPA: Presentation / App — imagen de un comprobante.
 *
 * La imagen NUNCA se entrega con una URL firmada de Storage: esa URL la abre
 * cualquiera que la tenga mientras dure, y la foto de una transferencia lleva
 * nombre, banco e importe. Aquí se comprueba la sesión, se lee con los
 * permisos de quien pide —RLS de la tabla y de Storage— y se sirve sin caché.
 *
 * Se sirve además con una CSP propia y `sandbox`: si alguna vez entrara un
 * archivo que no es una imagen, abrirlo en una pestaña no ejecutaría nada en
 * nuestro dominio. Los bytes ya se verificaron al subir y otra vez al leer;
 * esto es la tercera línea.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { operationsRepository, receiptsRepository, tenantRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { getAuthenticatedUser } from '@infra/auth/supabase.server';

interface Contexto {
  readonly params: Promise<{ tenant: string; id: string }>;
}

const NO_ENCONTRADO = () => new NextResponse('No encontrado', { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(_peticion: Request, { params }: Contexto) {
  const { tenant: slugCrudo, id } = await params;

  const tenant = await getTenantBySlug(tenantRepository(), slugCrudo.trim().toLowerCase());
  if (!tenant || tenant.features.memberLogin !== true || tenant.features.enablePayments !== true) {
    return NO_ENCONTRADO();
  }
  if (!isSupabaseConfigured()) return NO_ENCONTRADO();

  const usuario = await getAuthenticatedUser();
  if (!usuario) return new NextResponse('Sin sesión', { status: 401, headers: { 'Cache-Control': 'no-store' } });

  // Sesión de otro gimnasio: 404, igual que un comprobante que no existe. Un
  // 403 diría «existe pero no es tuyo», que ya es información.
  const perfil = await (await operationsRepository()).perfil();
  if (!perfil || perfil.tenantSlug !== tenant.slug) return NO_ENCONTRADO();

  const imagen = await (await receiptsRepository()).imagen(id);
  if (!imagen) return NO_ENCONTRADO();

  return new NextResponse(new Uint8Array(imagen.bytes).buffer as ArrayBuffer, {
    headers: {
      'Content-Type': imagen.tipo,
      'Content-Length': String(imagen.bytes.length),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
