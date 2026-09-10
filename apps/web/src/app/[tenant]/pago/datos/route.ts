/**
 * CAPA: Presentation / App — datos públicos de cobro por QR.
 *
 * La página de planes es ESTÁTICA (se sirve desde CDN) y el QR lo sube
 * gerencia cuando quiere, sin volver a desplegar. Por eso la ventana de pago
 * pide estos datos al abrirse, en vez de llevarlos incrustados del build: el
 * QR nuevo se ve al instante sin sacar la página de planes del CDN.
 *
 * Todo lo que devuelve es público por naturaleza —lo mismo que un QR pegado en
 * el mostrador—. Nada de socios ni de pagos.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { paymentSettingsRepository, tenantRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { hoyEnZona } from '@/lib/formato';

interface Contexto {
  readonly params: Promise<{ tenant: string }>;
}

export interface DatosPublicosDeCobro {
  readonly disponible: boolean;
  readonly vencido: boolean;
  readonly titular: string | null;
  readonly banco: string | null;
  readonly nota: string | null;
  readonly vence: string | null;
  /** Cambia cuando gerencia sube otro QR: evita que el navegador enseñe el viejo. */
  readonly version: string | null;
}

export async function GET(_peticion: Request, { params }: Contexto) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug.trim().toLowerCase());
  if (!tenant || tenant.features.publicSite !== true || tenant.features.enablePayments !== true) {
    return NextResponse.json({ error: 'no_disponible' }, { status: 404 });
  }

  const deConfiguracion = tenant.content.paymentQr;
  const ajustes = isSupabaseConfigured() ? await (await paymentSettingsRepository()).porSlug(tenant.slug) : null;

  // Hoy según el reloj DEL GIMNASIO. El visitante anónimo no puede leer la
  // zona horaria de la base, pero la configuración del gimnasio la tiene.
  const hoy = hoyEnZona(tenant.hours.timezone);
  const vence = ajustes?.expiresOn ?? null;
  const vencido = Boolean(vence && vence < hoy);

  const cuerpo: DatosPublicosDeCobro = {
    disponible: Boolean(ajustes?.qrPath) && !vencido,
    vencido,
    titular: ajustes?.holder ?? deConfiguracion?.holder ?? null,
    banco: ajustes?.bank ?? deConfiguracion?.bank ?? null,
    nota: ajustes?.note ?? deConfiguracion?.note ?? null,
    vence,
    version: ajustes?.updatedAt ?? null,
  };

  return NextResponse.json(cuerpo, {
    // Un minuto de caché compartida: gerencia ve el QR nuevo casi al instante
    // y una tarde con mucho tráfico no golpea la base en cada apertura.
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
