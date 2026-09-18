/**
 * CAPA: Presentation / App — ¿puede esta persona subir un comprobante aquí?
 *
 * La ventana «Pagar con QR» vive en páginas ESTÁTICAS, que no leen cookies. Al
 * pulsar «Ya pagué» pregunta a esta ruta, que sí es dinámica, en qué situación
 * está quien pregunta: socio, sin sesión, sin ficha, cuenta de otro gimnasio o
 * no se pudo comprobar. Con eso la ventana decide si lo manda al panel o le
 * explica qué le falta, antes de que llegue a una pantalla que no le sirve.
 *
 * Solo habla de la PROPIA persona (su sesión, leída por RLS). No acepta
 * parámetros sobre nadie, y no se cachea en ningún sitio: es privado.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { cuentaParaSubirComprobante, type PerfilParaComprobante } from '@core/domain/operations/receipts';
import { tenantRepository } from '@infra/config/composition-root';
import { createSupabaseServerClient, estadoDeSesion } from '@infra/auth/supabase.server';

export const dynamic = 'force-dynamic';

interface Contexto {
  readonly params: Promise<{ tenant: string }>;
}

const PRIVADO = { 'Cache-Control': 'private, no-store' };

export async function GET(_peticion: Request, { params }: Contexto) {
  const { tenant: crudo } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), crudo.trim().toLowerCase());
  if (!tenant || tenant.features.publicSite !== true || tenant.features.enablePayments !== true) {
    return NextResponse.json({ error: 'no_disponible' }, { status: 404, headers: PRIVADO });
  }

  const sesion = await estadoDeSesion();
  let perfil: PerfilParaComprobante | null | 'error' = null;

  if (sesion.estado === 'autenticado') {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.from('v_my_profile').select('tenant_slug, customer_id').maybeSingle();
      if (error) perfil = 'error';
      else if (data) {
        const fila = data as { tenant_slug: unknown; customer_id: unknown };
        perfil = {
          tenantSlug: typeof fila.tenant_slug === 'string' ? fila.tenant_slug : null,
          customerId: typeof fila.customer_id === 'string' ? fila.customer_id : null,
        };
      }
    } catch {
      perfil = 'error';
    }
  }

  const altaEnLinea = tenant.members?.onlineSignup === true;
  return NextResponse.json({ estado: cuentaParaSubirComprobante(sesion.estado, perfil, tenant.slug, altaEnLinea) }, { headers: PRIVADO });
}
