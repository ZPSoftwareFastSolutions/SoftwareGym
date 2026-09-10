/**
 * CAPA: Presentation / App — un reporte.
 *
 * Una sola ruta sirve los cinco reportes: qué columnas tiene y qué permiso
 * pide sale del catálogo del dominio. Cinco páginas casi idénticas serían
 * cinco sitios donde arreglar el mismo fallo.
 *
 * DOS GUARDAS, NO UNA. `reports.read` abre la sección; el permiso propio del
 * reporte —`payments.read` para pagos, `customers.read` para clientes— abre
 * ese reporte concreto. Sin la segunda, un rol con reportes pero sin pagos
 * vería la tabla de cobros vacía y creería que el gimnasio no ha facturado
 * nada, que es peor que decirle que no le corresponde.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO } from '@core/domain/operations/workspace';
import { reportePorClave } from '@core/domain/operations/reports';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { PrintButton } from '@/presentation/patterns/PrintButton';
import { LinkButton } from '@/presentation/ui/Button';
import { exigirPermiso } from '../../_datos';

interface ReportePageProps {
  readonly params: Promise<{ tenant: string; reporte: string }>;
}

export async function generateMetadata({ params }: ReportePageProps): Promise<Metadata> {
  const { reporte: clave } = await params;
  const definicion = reportePorClave(clave);
  return {
    title: definicion ? `Reporte de ${definicion.titulo.toLowerCase()}` : 'Reporte',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function ReportePage({ params }: ReportePageProps) {
  const { reporte: clave } = await params;
  const definicion = reportePorClave(clave);

  // Una clave que no está en el catálogo no es un reporte vacío: no existe.
  if (!definicion) notFound();

  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, [
    'memberLogin',
    'enableReports',
  ]);
  const { slug } = tenant;

  await exigirPermiso(slug, PERMISO.verReportes);
  const { repo } = await exigirPermiso(slug, definicion.permiso);

  const [filas, hoy] = await Promise.all([
    repo.filasDeReporte(definicion.clave),
    // La fecha del gimnasio, no la del servidor. En Vercel el servidor va en
    // UTC: un reporte descargado a las 21:00 en La Paz saldría fechado al día
    // siguiente, y quien lo archive no sabría a qué jornada corresponde.
    // Solo la fecha, sin hora: el minuto no aporta nada y volvería a abrir la
    // pregunta de en qué reloj está medido.
    repo.hoyDelGimnasio(slug),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h2 className="t-h3">{definicion.titulo}</h2>
            <p className="mt-1.5 max-w-[58ch] text-[0.88rem] leading-relaxed text-muted">
              {definicion.descripcion}
            </p>
            <p className="mt-3 text-[0.78rem] text-muted">
              {filas.length} {filas.length === 1 ? 'registro' : 'registros'} · al {hoy}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5" data-print="hide">
            <LinkButton href={tenantHref(slug, 'panel/reportes')} variant="ghost" size="sm">
              Todos los reportes
            </LinkButton>
            <PrintButton />
            {/* La descarga es un enlace normal, no un botón con JavaScript:
                así funciona con el clic derecho, se puede abrir en otra
                pestaña y no depende de que el script haya cargado. */}
            <LinkButton
              href={tenantHref(slug, `panel/reportes/${definicion.clave}/csv`)}
              variant="primary"
              size="sm"
              icon="arrowDown"
              iconPosition="start"
              // `download` fuerza la descarga en vez de la navegación; el
              // nombre real lo pone la cabecera del servidor.
              download
            >
              Descargar CSV
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="surface-card p-6 sm:p-7">
        <DataTable
          titulo={`Reporte de ${definicion.titulo.toLowerCase()}`}
          tituloOculto={false}
          columnas={definicion.columnas.map((columna) => ({
            clave: columna.clave,
            titulo: columna.titulo,
            numerica: columna.numerica,
            celda: (fila: Readonly<Record<string, string | number | null>>) => {
              const valor = fila[columna.clave];
              if (valor === null || valor === undefined || valor === '') return '—';
              return typeof valor === 'number'
                ? valor.toLocaleString('es-BO', { maximumFractionDigits: 2 })
                : valor;
            },
          }))}
          filas={filas}
          claveDeFila={(_fila, indice) => `fila-${indice}`}
          vacio={
            <EmptyState
              icono={definicion.icono}
              titulo="No hay datos para este reporte"
              descripcion="Cuando se registren movimientos, aparecerán aquí y podrás exportarlos."
            />
          }
        />
      </section>
    </div>
  );
}
