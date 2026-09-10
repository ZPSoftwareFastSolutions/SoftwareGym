/**
 * CAPA: Presentation / App — alta de socio.
 *
 * Recepción y gerencia registran aquí a un socio con su plan y su forma de
 * pago. El QR de entrada se genera en la base al crear la ficha: sale de aquí
 * listo para usar, sin paso aparte.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO } from '@core/domain/operations/workspace';
import { membersRepository } from '@infra/config/composition-root';
import { AltaDeSocioForm } from '@/presentation/patterns/SocioForms';
import { exigirPermiso } from '../../_datos';

export const metadata: Metadata = { title: 'Nuevo socio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function NuevoSocioPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableMemberManagement']);
  const { slug, features } = tenant;
  const { repo } = await exigirPermiso(slug, PERMISO.crearSocios);

  const [hoy, planes] = await Promise.all([repo.hoyDelGimnasio(slug), (await membersRepository()).planesVendibles()]);

  return (
    <section className="surface-card p-6 sm:p-8">
      <h2 className="t-h3">Registrar socio</h2>
      <p className="mt-1.5 max-w-[62ch] text-[0.88rem] text-muted">
        Con plan y pago en efectivo, tarjeta o transferencia, la membresía queda activa al guardar.
        Con pago por QR se activa al aprobar el comprobante.
      </p>
      <div className="mt-7">
        <AltaDeSocioForm
          slug={slug}
          planes={planes}
          hoy={hoy}
          rutaDeFichas={tenantHref(slug, 'panel/socios')}
          admiteComprobante={features.enablePayments === true}
        />
      </div>
    </section>
  );
}
