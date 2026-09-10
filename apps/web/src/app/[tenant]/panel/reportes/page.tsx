/**
 * CAPA: Presentation / App — índice de reportes.
 *
 * No hay una lista escrita a mano: se recorre el catálogo del dominio y se
 * filtra por permisos. Añadir un reporte es añadir una entrada en
 * `core/domain/operations/reports.ts` y esta página lo muestra sola.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO } from '@core/domain/operations/workspace';
import { reportesDisponibles } from '@core/domain/operations/reports';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = {
  title: 'Reportes',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ReportesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableReports']);
  const { slug } = tenant;

  const { perfil } = await exigirPermiso(slug, PERMISO.verReportes);
  const disponibles = reportesDisponibles(perfil.permissions);

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card p-6 sm:p-7">
        <h2 className="t-h3">Reportes</h2>
        <p className="mt-1.5 max-w-[62ch] text-[0.88rem] leading-relaxed text-muted">
          Cada reporte se puede exportar a CSV para abrirlo en una hoja de cálculo, o imprimir —y
          guardar como PDF desde el propio navegador— con el formato ya preparado para papel.
        </p>
      </section>

      {disponibles.length === 0 ? (
        <section className="surface-card">
          <EmptyState
            icono="lock"
            titulo="No hay reportes disponibles para tu cuenta"
            descripcion="Los reportes dependen de qué datos puede leer cada rol. Consúltalo con la gerencia del gimnasio."
          />
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {disponibles.map((reporte) => (
            <li key={reporte.clave}>
              <Link
                href={tenantHref(slug, `panel/reportes/${reporte.clave}`)}
                className="surface-card group flex h-full flex-col gap-3 p-6 transition-colors hover:border-action"
              >
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 place-items-center rounded-[var(--t-radius-sm)] bg-action/12 text-action"
                >
                  <Icon name={reporte.icono} size={19} />
                </span>
                <span className="text-[1.02rem] font-semibold text-ink">{reporte.titulo}</span>
                <span className="flex-1 text-[0.86rem] leading-relaxed text-muted">
                  {reporte.descripcion}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-action">
                  Abrir
                  <Icon
                    name="arrowRight"
                    size={15}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
