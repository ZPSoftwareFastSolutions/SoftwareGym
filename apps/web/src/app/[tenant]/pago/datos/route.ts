/**
 * CAPA: Presentation / App — datos públicos de cobro por QR.
 *
 * La página de planes es ESTÁTICA (se sirve desde CDN) y el QR lo sube
 * gerencia cuando quiere, sin volver a desplegar. Por eso la ventana de pago
 * pide estos datos al abrirse, en vez de llevarlos incrustados del build: el
 * QR nuevo se ve al instante sin sacar la página de planes del CDN.
 *
 * `?plan=<código>` elige el QR de ese plan (modo «QR por plan») y devuelve el
 * precio que manda la BASE, no el del archivo del gimnasio. La elección la hace
 * `resolverCobroQr`, la misma que usa la imagen: la ventana y la imagen no
 * pueden enseñar QR distintos.
 *
 * Todo lo que devuelve es público por naturaleza —lo mismo que un QR pegado en
 * el mostrador—. Nada de socios ni de pagos. Se lee como visitante anónimo.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { resolverCobroQr } from '@core/application/cobro/resolver-cobro-qr.usecase';
import { publicPaymentSettingsRepository, tenantRepository } from '@infra/config/composition-root';
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
  /** Ruta de la imagen del QR elegido, con su versión: un QR nuevo cambia de URL. */
  readonly imagen: string | null;
  /** `plan`: QR propio del plan · `general`: QR del gimnasio. */
  readonly origen: 'plan' | 'general' | null;
  /** Importe grabado en el QR, si es de monto exacto. */
  readonly montoExacto: number | null;
  /** Plan pedido, con el precio de la base. `null` si no se pidió o no existe. */
  readonly plan: { readonly codigo: string | null; readonly nombre: string; readonly precio: number; readonly moneda: string } | null;
}

export async function GET(peticion: Request, { params }: Contexto) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug.trim().toLowerCase());
  if (!tenant || tenant.features.publicSite !== true || tenant.features.enablePayments !== true) {
    return NextResponse.json({ error: 'no_disponible' }, { status: 404 });
  }

  const deConfiguracion = tenant.content.paymentQr;
  const codigoDePlan = new URL(peticion.url).searchParams.get('plan');
  // Hoy según el reloj DEL GIMNASIO. El visitante anónimo no puede leer la
  // zona horaria de la base, pero la configuración del gimnasio la tiene.
  const hoy = hoyEnZona(tenant.hours.timezone);

  const cobro = isSupabaseConfigured()
    ? await resolverCobroQr(await publicPaymentSettingsRepository(), tenant.slug, codigoDePlan, hoy)
    : null;
  const ajustes = cobro?.ajustes ?? null;
  const resultado = cobro?.resultado ?? null;
  const seleccion = resultado?.disponible ? resultado.seleccion : null;

  const cuerpo: DatosPublicosDeCobro = {
    disponible: Boolean(seleccion),
    vencido: resultado?.disponible === false && resultado.motivo === 'vencido',
    titular: ajustes?.holder ?? deConfiguracion?.holder ?? null,
    banco: ajustes?.bank ?? deConfiguracion?.bank ?? null,
    nota: ajustes?.note ?? deConfiguracion?.note ?? null,
    vence: seleccion?.qr.expiresOn ?? null,
    imagen: seleccion
      ? `/${tenant.slug}/pago/qr?qr=${seleccion.qr.id}&v=${encodeURIComponent(seleccion.qr.updatedAt ?? '')}`
      : null,
    origen: seleccion?.origen ?? null,
    montoExacto: seleccion?.montoExacto ?? null,
    plan: cobro?.plan
      ? { codigo: cobro.plan.code, nombre: cobro.plan.name, precio: cobro.plan.price, moneda: cobro.plan.currency }
      : null,
  };

  return NextResponse.json(cuerpo, {
    // Un minuto de caché compartida (por URL, así que por plan): gerencia ve el
    // QR nuevo casi al instante y una tarde con mucho tráfico no golpea la base.
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
