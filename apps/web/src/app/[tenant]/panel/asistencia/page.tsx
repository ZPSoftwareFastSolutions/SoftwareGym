/**
 * CAPA: Presentation / App — control de asistencia.
 *
 * Check-in, estadística, búsqueda e historial en una sola pantalla, porque en
 * el mostrador son la misma tarea: registrar a quien llega y comprobar a quien
 * dice que vino.
 *
 * La búsqueda va por `searchParams` y un formulario GET, no por estado de
 * cliente. Tres motivos, en orden de importancia: el resultado es un enlace
 * que se puede guardar o pasar a un compañero, funciona con JavaScript
 * desactivado, y el filtrado ocurre en la base —que es donde vive el índice—
 * en vez de traerse todas las filas al navegador para descartarlas allí.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import {
  NOMBRE_DE_METODO,
  calcularEstadisticas,
} from '@core/domain/operations/attendance';
import type { PuntoDeSerie } from '@core/domain/operations/dashboard';
import { CheckInPanel } from '@/presentation/patterns/CheckInPanel';
import { BarChart } from '@/presentation/ui/BarChart';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { exigirPermiso, fechaCorta, hora } from '../_datos';

export const metadata: Metadata = {
  title: 'Control de asistencia',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface AsistenciaPageProps extends TenantPageParams {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Un parámetro de URL puede llegar repetido; se toma el primero y se acota. */
function parametro(valor: string | string[] | undefined, largoMaximo = 60): string {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return typeof bruto === 'string' ? bruto.slice(0, largoMaximo).trim() : '';
}

/** Solo se acepta una fecha con forma de fecha; lo demás se ignora en silencio. */
function fechaValida(valor: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined;
}

export default async function AsistenciaPage({ params, searchParams }: AsistenciaPageProps) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableAttendance']);
  const { slug } = tenant;

  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verAsistencia);
  const puedeRegistrar = tienePermiso(perfil, PERMISO.registrarAsistencia);

  const consulta = await searchParams;
  const busqueda = parametro(consulta.q);
  const desde = fechaValida(parametro(consulta.desde, 10));
  const hasta = fechaValida(parametro(consulta.hasta, 10));
  const hayFiltro = Boolean(busqueda || desde || hasta);

  const [kpis, serie, horas, registros] = await Promise.all([
    repo.indicadores(slug),
    repo.asistenciaDiaria(30),
    repo.horasDeEntrada(30),
    repo.historialDeAsistencia({ busqueda, desde, hasta, limite: 60 }),
  ]);

  const estadisticas = calcularEstadisticas(
    serie.map((punto) => ({ dia: punto.dia, visitas: punto.visitas })),
    horas,
  );

  const hoy = kpis?.hoy ?? new Date().toISOString().slice(0, 10);

  // Se rellenan los días sin visitas: un hueco en el eje se lee como «no pasó
  // nada ese día», que es exactamente lo contrario de lo que significa una
  // barra ausente cuando el gráfico solo dibuja los días con datos.
  const porDia = new Map(serie.map((punto) => [punto.dia, punto.visitas]));
  const puntos: PuntoDeSerie[] = [];
  for (let indice = 29; indice >= 0; indice -= 1) {
    const fecha = new Date(`${hoy}T12:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() - indice);
    const clave = fecha.toISOString().slice(0, 10);
    const visitas = porDia.get(clave) ?? 0;
    puntos.push({
      etiqueta: clave.slice(8, 10),
      valor: visitas,
      detalle: `${fechaCorta(clave)}: ${visitas} ${visitas === 1 ? 'entrada' : 'entradas'}`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {puedeRegistrar ? (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-checkin">
          <h2 id="titulo-checkin" className="t-h3">
            Registrar entrada
          </h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            Escanea el QR del socio con el lector o teclea su código. No hace falta pulsar nada más.
          </p>
          <div className="mt-6">
            <CheckInPanel slug={slug} />
          </div>
        </section>
      ) : (
        <section className="surface-card">
          <EmptyState
            icono="lock"
            titulo="Puedes consultar la asistencia, pero no registrarla"
            descripcion="Tu cuenta tiene permiso de lectura. Registrar entradas le corresponde a recepción y a gerencia."
          />
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Entradas hoy"
          valor={`${kpis?.asistenciasHoy ?? 0}`}
          icono="calendar"
          tono="accion"
          comparacion={`${kpis?.asistenciasSemana ?? 0} en los últimos 7 días`}
        />
        <StatCard
          etiqueta="Promedio diario"
          valor={estadisticas.promedioDiario.toFixed(1)}
          icono="dumbbell"
          comparacion="en los últimos 30 días"
        />
        <StatCard
          etiqueta="Hora pico"
          valor={
            estadisticas.horaPico === null
              ? '—'
              : `${String(estadisticas.horaPico).padStart(2, '0')}:00`
          }
          icono="clock"
          comparacion={
            estadisticas.diaMasFrecuente
              ? `día más movido: ${estadisticas.diaMasFrecuente}`
              : 'sin datos suficientes'
          }
        />
        <StatCard
          etiqueta="Mejor día"
          valor={estadisticas.mejorDia ? `${estadisticas.mejorDia.visitas}` : '—'}
          icono="star"
          comparacion={
            estadisticas.mejorDia ? `entradas el ${fechaCorta(estadisticas.mejorDia.dia)}` : 'sin datos'
          }
        />
      </div>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-grafico">
        <h2 id="titulo-grafico" className="t-h3">
          Entradas por día
        </h2>
        <BarChart
          titulo="Entradas por día en los últimos 30 días"
          puntos={puntos}
          unidad="entradas"
          alto={190}
          className="mt-6"
        />
      </section>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-historial">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="titulo-historial" className="t-h3">
            Historial
          </h2>
          {hayFiltro && <Badge tone="neutral">{registros.length} resultados</Badge>}
        </div>

        <form
          method="get"
          data-print="hide"
          className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end"
        >
          <div>
            <label
              htmlFor="q"
              className="mb-1.5 block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Socio o código
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={busqueda}
              maxLength={60}
              placeholder="Buscar por nombre o código"
              className="h-12 w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-4 text-[0.9rem] text-ink placeholder:text-muted/70 focus:border-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action/40"
            />
          </div>

          <div>
            <label
              htmlFor="desde"
              className="mb-1.5 block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Desde
            </label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={desde ?? ''}
              className="h-12 w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-3 text-[0.9rem] text-ink focus:border-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action/40"
            />
          </div>

          <div>
            <label
              htmlFor="hasta"
              className="mb-1.5 block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Hasta
            </label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={hasta ?? ''}
              className="h-12 w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-3 text-[0.9rem] text-ink focus:border-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action/40"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="md" icon="arrowRight">
              Buscar
            </Button>
            {hayFiltro && (
              <LinkButton href={tenantHref(slug, 'panel/asistencia')} variant="ghost" size="md">
                Limpiar
              </LinkButton>
            )}
          </div>
        </form>

        <DataTable
          titulo="Entradas registradas"
          className="mt-6"
          columnas={[
            { clave: 'socio', titulo: 'Socio', celda: (fila) => fila.customerName },
            {
              clave: 'codigo',
              titulo: 'Código',
              secundaria: true,
              celda: (fila) => fila.customerCode ?? '—',
            },
            { clave: 'fecha', titulo: 'Fecha', celda: (fila) => fechaCorta(fila.attendanceDate) },
            { clave: 'hora', titulo: 'Hora', celda: (fila) => hora(fila.checkedInAt) },
            {
              clave: 'metodo',
              titulo: 'Método',
              secundaria: true,
              celda: (fila) => NOMBRE_DE_METODO[fila.method],
            },
          ]}
          filas={registros}
          claveDeFila={(fila) => fila.id}
          vacio={
            <EmptyState
              icono="calendar"
              titulo={hayFiltro ? 'Ninguna entrada coincide con la búsqueda' : 'Todavía no hay entradas'}
              descripcion={
                hayFiltro
                  ? 'Prueba con otro nombre, otro código o un rango de fechas más amplio.'
                  : 'Registra la primera desde el mostrador y aparecerá aquí.'
              }
              accion={
                hayFiltro ? (
                  <LinkButton href={tenantHref(slug, 'panel/asistencia')} variant="secondary" size="sm">
                    Quitar filtros
                  </LinkButton>
                ) : undefined
              }
            />
          }
        />
      </section>
    </div>
  );
}
