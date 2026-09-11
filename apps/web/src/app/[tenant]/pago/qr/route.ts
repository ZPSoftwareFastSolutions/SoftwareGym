/**
 * CAPA: Presentation / App — imagen pública del QR de cobro.
 *
 * Se sirve desde nuestro propio dominio y no enlazando a Storage: la CSP del
 * sitio declara `img-src 'self'`, y así sigue siéndolo. Abrir la CSP al
 * dominio de Supabase para mostrar un QR la abriría para cualquier imagen de
 * cualquier proyecto alojado allí.
 *
 * Qué QR:
 * - `?qr=<id>`: ese QR, si es de ESTE gimnasio (se busca entre los suyos por
 *   slug; un id de otro gimnasio no aparece y da 404). Lo usa la ventana de
 *   pago con el id que le dio `/pago/datos`, y el panel de cobros.
 * - `?plan=<código>` o nada: la misma elección que `/pago/datos`.
 *
 * Un QR VENCIDO no se sirve (410). Enseñar la cuenta de cobro después de su
 * fecha de vencimiento es invitar a pagar a un QR que el banco ya rechaza, y
 * el socio se enteraría cuando el dinero no llega.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { resolverCobroQr } from '@core/application/cobro/resolver-cobro-qr.usecase';
import { estadoDeQr, type QrDeCobro } from '@core/domain/operations/cobro-qr';
import { publicPaymentSettingsRepository, tenantRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { hoyEnZona } from '@/lib/formato';

interface Contexto {
  readonly params: Promise<{ tenant: string }>;
}

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SIN_QR = () => new NextResponse('Sin QR', { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(peticion: Request, { params }: Contexto) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug.trim().toLowerCase());
  if (!tenant || tenant.features.publicSite !== true || tenant.features.enablePayments !== true || !isSupabaseConfigured()) {
    return new NextResponse('No disponible', { status: 404 });
  }

  const busqueda = new URL(peticion.url).searchParams;
  const hoy = hoyEnZona(tenant.hours.timezone);
  const repositorio = await publicPaymentSettingsRepository();

  let qr: QrDeCobro | null = null;
  const id = busqueda.get('qr');
  if (id !== null) {
    if (!PATRON_UUID.test(id)) return SIN_QR();
    const { qrs } = await repositorio.qrsPorSlug(tenant.slug);
    qr = qrs.find((candidato) => candidato.id === id) ?? null;
    if (!qr) return SIN_QR();
    if (estadoDeQr(qr, null, hoy) === 'vencido') {
      return new NextResponse('QR vencido', { status: 410, headers: { 'Cache-Control': 'no-store' } });
    }
  } else {
    const { resultado } = await resolverCobroQr(repositorio, tenant.slug, busqueda.get('plan'), hoy);
    if (!resultado.disponible) {
      return resultado.motivo === 'vencido'
        ? new NextResponse('QR vencido', { status: 410, headers: { 'Cache-Control': 'no-store' } })
        : SIN_QR();
    }
    qr = resultado.seleccion.qr;
  }

  const imagen = await repositorio.imagenDeQr(qr.qrPath);
  if (!imagen) return SIN_QR();

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
