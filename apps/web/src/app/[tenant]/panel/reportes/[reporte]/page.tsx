/**
 * CAPA: Presentation / App — un reporte.
 *
 * Una sola ruta sirve todos los reportes: qué columnas, qué filtros, qué
 * gráfico y qué permiso sale del catálogo del dominio.
 *
 * DOS GUARDAS, NO UNA. `reports.read` abre la sección; el permiso propio del
 * reporte —`payments.read` para pagos, `users.read` para usuarios— abre ese
 * reporte concreto. Sin la segunda, un rol con reportes pero sin pagos vería la
 * tabla de cobros vacía y creería que el gimnasio no ha facturado nada.
 *
 * IMPRESIÓN. La cabecera `print:block` solo aparece en papel y lleva lo que un
 * reporte archivado necesita para entenderse solo: gimnasio, título, periodo y
 * filtros. El pie del sitio, la navegación y los filtros no salen al PDF.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO } from '@core/domain/operations/workspace';
import {
  reportePorClave,
  resumirReporte,
  serieDeReporte,
  type ColumnaDeReporte,
  type FilaDeReporte,
} from '@core/domain/operations/reports';
import { describirRango } from '@core/domain/operations/periodo';
import { membersRepository, reportsRepository } from '@infra/config/composition-root';
import { BarChart } from '@/presentation/ui/BarChart';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { PrintButton } from '@/presentation/patterns/PrintButton';
import { ReportFilters } from '@/presentation/patterns/ReportFilters';
import { LinkButton } from '@/presentation/ui/Button';
import { exigirPermiso, fechaCorta, importe } from '../../_datos';
import { leerFiltros, type ParametrosDeUrl } from '../_filtros';

interface ReportePageProps {
  readonly params: Promise<{ tenant: string; reporte: string }>;
  readonly searchParams: Promise<ParametrosDeUrl>;
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

function formatear(columna: ColumnaDeReporte, valor: string | number | null | undefined, moneda: string) {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'number') {
    return columna.moneda ? importe(valor, moneda) : valor.toLocaleString('es-BO', { maximumFractionDigits: 2 });
  }
  return valor;
}

export default async function ReportePage({ params, searchParams }: ReportePageProps) {
  const { reporte: clave } = await params;
  const definicion = reportePorClave(clave);

  // Una clave que no está en el catálogo no es un reporte vacío: no existe.
  if (!definicion) notFound();

  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, [
    'memberLogin',
    'enableReports',
  ]);
  const { slug, name } = tenant;

  await exigirPermiso(slug, PERMISO.verReportes);
  const { repo, perfil } = await exigirPermiso(slug, definicion.permiso);

  const kpis = await repo.indicadores(slug);
  const hoy = kpis?.hoy ?? (await repo.hoyDelGimnasio(slug));
  const moneda = kpis?.currency ?? 'BOB';

  const { filtro, rango, preset, consulta } = leerFiltros(definicion, await searchParams, hoy);
  const rutaBase = tenantHref(slug, `panel/reportes/${definicion.clave}`);

  const [reportes, socios] = await Promise.all([reportsRepository(), membersRepository()]);
  const [filas, planes] = await Promise.all([
    reportes.filas(definicion.clave, filtro, hoy),
    definicion.filtros.includes('plan') ? socios.planesVendibles() : Promise.resolve([]),
  ]);

  const resumen = resumirReporte(definicion, filas);
  const serie = serieDeReporte(definicion, filas).map((punto) => ({
    etiqueta: definicion.grafico?.agruparPor === 'fecha' ? fechaCorta(punto.etiqueta) : punto.etiqueta.slice(0, 14),
    valor: punto.valor,
    detalle: `${punto.etiqueta}: ${
      definicion.grafico?.medida && definicion.columnas.find((c) => c.clave === definicion.grafico?.medida)?.moneda
        ? importe(punto.valor, moneda)
        : punto.valor.toLocaleString('es-BO')
    }`,
  }));

  const planElegido = planes.find((plan) => plan.id === filtro.planId)?.name;
  const filtrosActivos = [
    definicion.filtros.includes('periodo') ? `Periodo: ${describirRango(rango)}` : null,
    filtro.estado ? `Estado: ${filtro.estado}` : null,
    planElegido ? `Plan: ${planElegido}` : null,
    filtro.metodo ? `Método: ${filtro.metodo}` : null,
    filtro.origen ? `Origen: ${filtro.origen}` : null,
    filtro.rol ? `Rol: ${filtro.rol}` : null,
    filtro.q ? `Búsqueda: «${filtro.q}»` : null,
  ].filter((texto): texto is string => texto !== null);

  const totales: Record<string, string> = {};
  for (const columna of definicion.columnas) {
    const total = resumen.totales.find((t) => t.titulo === columna.titulo);
    if (total) totales[columna.clave] = total.moneda ? importe(total.valor, moneda) : total.valor.toLocaleString('es-BO');
  }

  const csv = `${tenantHref(slug, `panel/reportes/${definicion.clave}/csv`)}${consulta ? `?${consulta}` : ''}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Solo en papel. */}
      <header className="hidden border-b-2 border-black pb-4 print:block">
        <p className="text-[0.8rem] uppercase tracking-[0.2em]">{name}</p>
        <h1 className="mt-1 text-[1.6rem] font-bold">Reporte de {definicion.titulo.toLowerCase()}</h1>
        <p className="mt-2 text-[0.85rem]">{filtrosActivos.join(' · ') || 'Sin filtros'}</p>
        <p className="mt-1 text-[0.8rem]">
          {resumen.registros} registros · generado el {hoy} por {perfil.fullName}
        </p>
      </header>

      <section className="surface-card p-6 sm:p-7" data-print="hide">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h2 className="t-h3">{definicion.titulo}</h2>
            <p className="mt-1.5 max-w-[60ch] text-[0.88rem] leading-relaxed text-muted">{definicion.descripcion}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <LinkButton href={tenantHref(slug, 'panel/reportes')} variant="ghost" size="sm">
              Todos los reportes
            </LinkButton>
            <PrintButton />
            {/* Enlace normal y no botón con JavaScript: funciona con clic
                derecho, en otra pestaña y sin que cargue ningún script. El CSV
                lleva los MISMOS filtros que la tabla. */}
            <LinkButton href={csv} variant="primary" size="sm" icon="download" iconPosition="start" download>
              Descargar CSV
            </LinkButton>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-6">
          <ReportFilters
            definicion={definicion}
            filtro={filtro}
            rango={rango}
            preset={preset}
            planes={planes}
            rutaBase={rutaBase}
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Registros"
          valor={resumen.registros.toLocaleString('es-BO')}
          icono={definicion.icono}
          tono="accion"
          comparacion={filtrosActivos[0] ?? 'con los filtros aplicados'}
        />
        {resumen.totales.map((total) => (
          <StatCard
            key={total.titulo}
            etiqueta={`Total ${total.titulo.toLowerCase()}`}
            valor={total.moneda ? importe(total.valor, moneda) : total.valor.toLocaleString('es-BO')}
            icono={total.moneda ? 'wallet' : 'chart'}
            comparacion={
              total.moneda && resumen.registros > 0
                ? `promedio ${importe(total.valor / resumen.registros, moneda)} por registro`
                : 'en el periodo filtrado'
            }
          />
        ))}
      </div>

      {definicion.grafico && serie.length > 0 && (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-grafico-reporte">
          <h2 id="titulo-grafico-reporte" className="t-h3">
            {definicion.grafico.titulo}
          </h2>
          <BarChart
            titulo={definicion.grafico.titulo}
            puntos={serie}
            alto={200}
            saltoDeEtiqueta={serie.length > 12 ? Math.ceil(serie.length / 10) : 1}
            className="mt-6"
          />
        </section>
      )}

      <section className="surface-card p-6 sm:p-7">
        <DataTable
          titulo={`Reporte de ${definicion.titulo.toLowerCase()}`}
          tituloOculto={false}
          columnas={definicion.columnas.map((columna) => ({
            clave: columna.clave,
            titulo: columna.titulo,
            numerica: columna.numerica,
            celda: (fila: FilaDeReporte) => formatear(columna, fila[columna.clave], moneda),
          }))}
          filas={filas}
          claveDeFila={(_fila, indice) => `fila-${indice}`}
          filaDeTotales={Object.keys(totales).length > 0 ? totales : undefined}
          vacio={
            <EmptyState
              icono={definicion.icono}
              titulo="Ningún registro coincide con estos filtros"
              descripcion="Prueba con un periodo más amplio o quita alguno de los filtros."
              accion={
                <LinkButton href={rutaBase} variant="secondary" size="sm">
                  Quitar filtros
                </LinkButton>
              }
            />
          }
        />
      </section>
    </div>
  );
}
