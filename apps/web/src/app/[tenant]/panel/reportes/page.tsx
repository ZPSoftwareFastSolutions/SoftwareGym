/**
 * CAPA: Presentation / App — índice de reportes.
 *
 * No hay una lista escrita a mano: se recorre el catálogo del dominio, se
 * filtra por permisos y se agrupa por categoría. Añadir un reporte es añadir
 * una entrada en `core/domain/operations/reports.ts`.
 *
 * Cada tarjeta es funcional entera y además ofrece atajos de periodo: quien
 * entra buscando «los pagos de hoy» llega en un clic, sin pasar por el
 * formulario de filtros.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO } from '@core/domain/operations/workspace';
import {
  NOMBRE_DE_CATEGORIA,
  reportesDisponibles,
  type CategoriaDeReporte,
} from '@core/domain/operations/reports';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = {
  title: 'Reportes',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ORDEN: readonly CategoriaDeReporte[] = ['dinero', 'operacion', 'personas'];

const NOMBRE_DE_FILTRO: Readonly<Record<string, string>> = {
  periodo: 'Periodo',
  'estado-membresia': 'Estado',
  'estado-comprobante': 'Estado',
  'estado-socio': 'Estado',
  plan: 'Plan',
  'metodo-pago': 'Método',
  'metodo-asistencia': 'Método',
  origen: 'Origen',
  rol: 'Rol',
  busqueda: 'Búsqueda',
};

const ATAJOS = [
  { preset: 'hoy', texto: 'Hoy' },
  { preset: 'ayer', texto: 'Ayer' },
  { preset: 'mes', texto: 'Este mes' },
] as const;

export default async function ReportesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableReports']);
  const { slug } = tenant;

  const { perfil } = await exigirPermiso(slug, PERMISO.verReportes);
  const disponibles = reportesDisponibles(perfil.permissions, tenant.features);

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card p-6 sm:p-7">
        <h2 className="t-h3">Reportes</h2>
        <p className="mt-1.5 max-w-[66ch] text-[0.88rem] leading-relaxed text-muted">
          Cada reporte se filtra por periodo, estado, plan, método o rol según lo que tenga sentido
          para él, muestra su resumen y su gráfico, y se descarga en CSV o se imprime —y guarda
          como PDF desde el propio navegador— con los mismos filtros aplicados.
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
        ORDEN.map((categoria) => {
          const deEsta = disponibles.filter((reporte) => reporte.categoria === categoria);
          if (deEsta.length === 0) return null;
          return (
            <section key={categoria} aria-labelledby={`categoria-${categoria}`} className="flex flex-col gap-4">
              <h3 id={`categoria-${categoria}`} className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-muted">
                {NOMBRE_DE_CATEGORIA[categoria]}
              </h3>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {deEsta.map((reporte) => {
                  const href = tenantHref(slug, `panel/reportes/${reporte.clave}`);
                  const filtros = [...new Set(reporte.filtros.map((f) => NOMBRE_DE_FILTRO[f]))].filter(Boolean);
                  return (
                    <li key={reporte.clave} className="surface-card group relative flex h-full flex-col gap-3 p-6 transition-colors hover:border-action">
                      <span
                        aria-hidden="true"
                        className="grid h-11 w-11 place-items-center rounded-[var(--t-radius-sm)] bg-action/12 text-action"
                      >
                        <Icon name={reporte.icono} size={19} />
                      </span>
                      {/* El enlace principal cubre la tarjeta entera con un
                          pseudo-elemento; los atajos quedan por encima con
                          `relative z-10` y siguen siendo pulsables. */}
                      <Link
                        href={href}
                        className="text-[1.02rem] font-semibold text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[var(--t-radius-lg)] focus-visible:after:ring-2 focus-visible:after:ring-action"
                      >
                        {reporte.titulo}
                      </Link>
                      <p className="flex-1 text-[0.86rem] leading-relaxed text-muted">{reporte.descripcion}</p>
                      <p className="text-[0.74rem] text-muted">Filtros: {filtros.join(' · ')}</p>
                      <div className="relative z-10 flex flex-wrap items-center gap-2 pt-1">
                        {reporte.filtros.includes('periodo') &&
                          ATAJOS.map((atajo) => (
                            <Link
                              key={atajo.preset}
                              href={`${href}?preset=${atajo.preset}`}
                              className="inline-flex h-9 items-center rounded-full border border-line px-3 text-[0.76rem] text-muted transition-colors hover:border-action hover:text-action"
                            >
                              {atajo.texto}
                            </Link>
                          ))}
                        <span className="ms-auto inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-action">
                          Abrir
                          <Icon name="arrowRight" size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
