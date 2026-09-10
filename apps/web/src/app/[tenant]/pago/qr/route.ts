/**
 * CAPA: Presentation / App — imagen pública del QR de cobro.
 *
 * Se sirve desde nuestro propio dominio y no enlazando a Storage: la CSP del
 * sitio declara `img-src 'self'`, y así sigue siéndolo. Abrir la CSP al
 * dominio de Supabase para mostrar un QR la abriría para cualquier imagen de
 * cualquier proyecto alojado allí.
 *
 * Un QR VENCIDO no se sirve (410). Enseñar la cuenta de cobro después de su
 * fecha de vencimiento es invitar a pagar a un QR que el banco ya rechaza, y
 * el socio se enteraría cuando el dinero no llega.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { paymentSettingsRepository, tenantRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { hoyEnZona } from '@/lib/formato';

interface Contexto {
  readonly params: Promise<{ tenant: string }>;
}

export async function GET(_peticion: Request, { params }: Contexto) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug.trim().toLowerCase());
  if (!tenant || tenant.features.publicSite !== true || tenant.features.enablePayments !== true || !isSupabaseConfigured()) {
    return new NextResponse('No disponible', { status: 404 });
  }

  const repositorio = await paymentSettingsRepository();
  const ajustes = await repositorio.porSlug(tenant.slug);
  if (!ajustes?.qrPath) return new NextResponse('Sin QR', { status: 404 });

  if (ajustes.expiresOn && ajustes.expiresOn < hoyEnZona(tenant.hours.timezone)) {
    return new NextResponse('QR vencido', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  const imagen = await repositorio.imagenQr(ajustes);
  if (!imagen) return new NextResponse('Sin QR', { status: 404 });

  return new NextResponse(new Uint8Array(imagen.bytes).buffer as ArrayBuffer, {
    headers: {
      'Content-Type': imagen.tipo,
      'Content-Length': String(imagen.bytes.length),
      // Cinco minutos: la ventana de pago pide la imagen con `?v=` de la
      // versión, así que un QR nuevo cambia de URL y no espera a la caché.
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
