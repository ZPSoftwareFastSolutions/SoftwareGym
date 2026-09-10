/**
 * CAPA: Presentation / App — datos de cobro del gimnasio.
 *
 * Gerencia sube aquí la imagen del QR de su banco. Es la pieza que hace que
 * «Pagar con QR» funcione en la página de planes sin tocar código: cada
 * gimnasio pone el suyo, y cuando cambia de cuenta lo cambia aquí.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO } from '@core/domain/operations/workspace';
import { paymentSettingsRepository } from '@infra/config/composition-root';
import { AjustesDeCobroForm } from '@/presentation/patterns/AjustesDeCobroForm';
import { LinkButton } from '@/presentation/ui/Button';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = { title: 'Cobro por QR', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function CobrosPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enablePayments']);
  const { slug } = tenant;
  const { repo } = await exigirPermiso(slug, PERMISO.configurar);

  const [hoy, ajustes] = await Promise.all([repo.hoyDelGimnasio(slug), (await paymentSettingsRepository()).porSlug(slug)]);
  const respaldo = tenant.content.paymentQr;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-4 p-6 sm:p-7">
        <div className="max-w-[62ch]">
          <h2 className="t-h3">Cobro por QR</h2>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">
            Sube la imagen del QR que te da tu banco. Aparece en el botón «Pagar con QR» de cada paquete, y los socios
            envían su comprobante desde su panel para que recepción lo apruebe.
          </p>
        </div>
        <LinkButton href={tenantHref(slug, 'planes')} variant="secondary" size="sm" icon="eye" iconPosition="start" external>
          Ver página de planes
        </LinkButton>
      </section>

      <section className="surface-card p-6 sm:p-7">
        <AjustesDeCobroForm
          slug={slug}
          holder={ajustes?.holder ?? respaldo?.holder ?? null}
          bank={ajustes?.bank ?? respaldo?.bank ?? null}
          note={ajustes?.note ?? respaldo?.note ?? null}
          expiresOn={ajustes?.expiresOn ?? null}
          tieneQr={Boolean(ajustes?.qrPath)}
          version={ajustes?.updatedAt ?? null}
          hoy={hoy}
        />
      </section>
    </div>
  );
}
