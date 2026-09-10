/**
 * CAPA: Presentation / App — dashboard operativo del gimnasio.
 *
 * Lo ven gerencia y recepción. La diferencia entre las dos no la decide esta
 * página con un `if` sobre el nombre del rol: la decide qué permisos tiene
 * cada una, y por debajo, qué filas le entrega RLS. Recepción no tiene
 * `reports.read`, así que no ve la sección de reportes ni el gráfico de
 * ingresos; si alguien escribiera la URL a mano, la guarda de esa ruta la
 * devolvería aquí y la consulta no daría ni una fila.
 *
 * ESO SÍ, QUE QUEDE CLARO: esconder un gráfico es una decisión de foco, no un
 * control de seguridad. Recepción sí puede leer los pagos —los cobra— y lo
 * que se le ahorra es una serie mensual que no necesita para atender el
 * mostrador. Lo que de verdad no puede tocar (configuración, personal) se lo
 * niega la base, no este archivo.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { variacion, type PuntoDeSerie } from '@core/domain/operations/dashboard';
import { NOMBRE_DE_METODO } from '@core/domain/operations/attendance';
import { CheckInPanel } from '@/presentation/patterns/CheckInPanel';
import { BarChart } from '@/presentation/ui/BarChart';
import { DataTable } from '@/presentation/ui/DataTable';
import { DonutChart } from '@/presentation/ui/DonutChart';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { exigirPermiso, fechaCorta, hora, importe } from '../_datos';

export const metadata: Metadata = {
  title: 'Resumen del gimnasio',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function etiquetaDeMes(iso: string): string {
  const mes = Number(iso.slice(5, 7)) - 1;
  return MESES[mes] ?? iso.slice(5, 7);
}

export default async function DashboardDelGimnasioPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug } = tenant;

  // `dashboard.read` es lo que separa a quien opera el gimnasio de quien solo
  // es socio. El administrador de la plataforma tampoco lo tiene: su sitio es
  // otro y esta guarda lo devuelve allí.
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verDashboard);

  const puedeVerReportes = tienePermiso(perfil, PERMISO.verReportes);
  const puedeRegistrar = tienePermiso(perfil, PERMISO.registrarAsistencia);

  const [kpis, serie, ingresos, vencimientos, ultimos] = await Promise.all([
    repo.indicadores(slug),
    repo.asistenciaDiaria(30),
    puedeVerReportes ? repo.ingresosMensuales() : Promise.resolve([]),
    repo.vencimientos(),
    repo.historialDeAsistencia({ limite: 8 }),
  ]);

  if (!kpis) {
    return (
      <section className="surface-card">
        <EmptyState
          icono="shield"
          titulo="Todavía no hay datos de este gimnasio"
          descripcion="En cuanto se registren socios, membresías y entradas, el resumen se llena solo."
        />
      </section>
    );
  }

  const moneda = kpis.currency;

  // La serie viene solo con los días que tuvieron visitas. Se rellenan los
  // huecos con cero: un gráfico que salta del lunes al jueves da a entender
  // que el martes y el miércoles no existieron, cuando lo que pasó es que no
  // vino nadie —que es justo el dato que hay que ver—.
  const porDia = new Map(serie.map((punto) => [punto.dia, punto.visitas]));
  const puntosDeAsistencia: PuntoDeSerie[] = [];
  for (let indice = 29; indice >= 0; indice -= 1) {
    const fecha = new Date(`${kpis.hoy}T12:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() - indice);
    const clave = fecha.toISOString().slice(0, 10);
    const visitas = porDia.get(clave) ?? 0;
    puntosDeAsistencia.push({
      etiqueta: clave.slice(8, 10),
      valor: visitas,
      detalle: `${fechaCorta(clave)}: ${visitas} ${visitas === 1 ? 'entrada' : 'entradas'}`,
    });
  }

  const puntosDeIngreso: PuntoDeSerie[] = ingresos.map((punto) => ({
    etiqueta: etiquetaDeMes(punto.mes),
    valor: punto.total,
    detalle: `${etiquetaDeMes(punto.mes)} ${punto.mes.slice(0, 4)}: ${importe(punto.total, moneda)} en ${punto.cobros} cobros`,
  }));

  const totalMembresias =
    kpis.membresiasActivas + kpis.membresiasPorVencer + kpis.membresiasVencidas;

  const porVencerPronto = vencimientos.filter(
    (v) => v.effectiveStatus !== 'expired' && v.daysRemaining <= 10,
  );

  return (
    <div className="flex flex-col gap-6">
      {puedeRegistrar && (
        <section className="surface-card flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7">
          <div className="min-w-0">
            <h2 className="t-h3">Mostrador</h2>
            <p className="mt-1.5 text-[0.88rem] text-muted">
              Registra la entrada de un socio escaneando su QR o tecleando su código.
            </p>
          </div>

          {/* La ventana se abre sobre el resumen en vez de llevar a otra
              página: en el mostrador, perder de vista los números del día
              para registrar una entrada y volver es una interrupción que se
              repite cien veces al día. */}
          <Modal
            titulo="Registrar entrada"
            descripcion="El lector escribe el código y pulsa Enter por su cuenta."
            anchoMaximo="md"
            disparador={
              <Button variant="primary" size="md" icon="check" iconPosition="start" glow>
                Registrar entrada
              </Button>
            }
          >
            <CheckInPanel slug={slug} />
          </Modal>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Socios activos"
          valor={`${kpis.sociosActivos}`}
          icono="group"
          tono="accion"
          comparacion={`${kpis.sociosActivosMes} entrenaron este mes`}
        />
        <StatCard
          etiqueta="Entradas hoy"
          valor={`${kpis.asistenciasHoy}`}
          icono="calendar"
          comparacion={`${kpis.asistenciasSemana} en los últimos 7 días`}
        />
        <StatCard
          etiqueta="Por vencer"
          valor={`${kpis.membresiasPorVencer}`}
          icono="clock"
          tono={kpis.membresiasPorVencer > 0 ? 'alerta' : 'neutro'}
          comparacion={`${kpis.membresiasVencidas} ya vencidas`}
          subirEsMalo
        />
        {puedeVerReportes ? (
          <StatCard
            etiqueta="Ingresos del mes"
            valor={importe(kpis.ingresosMes, moneda)}
            icono="star"
            variacion={variacion(kpis.ingresosMes, kpis.ingresosMesAnterior)}
            comparacion="frente al mes anterior"
          />
        ) : (
          <StatCard
            etiqueta="Membresías activas"
            valor={`${kpis.membresiasActivas}`}
            icono="shield"
            tono="accion"
            comparacion={`de ${totalMembresias} registradas`}
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-asistencia">
          <h2 id="titulo-asistencia" className="t-h3">
            Entradas de los últimos 30 días
          </h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            La barra de la derecha es hoy. Los días sin barra son días sin nadie.
          </p>
          <BarChart
            titulo="Entradas por día en los últimos 30 días"
            puntos={puntosDeAsistencia}
            unidad="entradas"
            alto={190}
            className="mt-6"
          />
        </section>

        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-membresias">
          <h2 id="titulo-membresias" className="t-h3">
            Estado de las membresías
          </h2>
          <DonutChart
            titulo="Reparto de membresías por estado"
            className="mt-6"
            centroValor={`${totalMembresias}`}
            centroEtiqueta="membresías"
            segmentos={[
              { etiqueta: 'Activas', valor: kpis.membresiasActivas, color: 'var(--t-action)' },
              {
                etiqueta: 'Por vencer',
                valor: kpis.membresiasPorVencer,
                color: 'var(--t-structural)',
              },
              {
                etiqueta: 'Vencidas',
                valor: kpis.membresiasVencidas,
                color: 'color-mix(in srgb, var(--t-muted) 60%, transparent)',
              },
            ]}
          />
        </section>
      </div>

      {puedeVerReportes && (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-ingresos">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="titulo-ingresos" className="t-h3">
                Ingresos por mes
              </h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">
                Cobros registrados en los últimos doce meses.
              </p>
            </div>
            <LinkButton
              href={tenantHref(slug, 'panel/reportes/pagos')}
              variant="ghost"
              size="sm"
              icon="arrowRight"
            >
              Ver detalle
            </LinkButton>
          </div>
          <BarChart
            titulo="Ingresos por mes"
            puntos={puntosDeIngreso}
            unidad={moneda === 'BOB' ? 'bolivianos' : moneda}
            alto={170}
            saltoDeEtiqueta={1}
            className="mt-6"
          />
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-vencimientos">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="titulo-vencimientos" className="t-h3">
              A punto de vencer
            </h2>
            {porVencerPronto.length > 0 && (
              <Badge tone="structural">{porVencerPronto.length} para llamar</Badge>
            )}
          </div>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            Los diez días siguientes. Es la lista de a quién conviene avisar hoy.
          </p>

          <DataTable
            titulo="Membresías que vencen en los próximos diez días"
            className="mt-5"
            columnas={[
              { clave: 'socio', titulo: 'Socio', celda: (fila) => fila.customerName },
              {
                clave: 'plan',
                titulo: 'Plan',
                secundaria: true,
                celda: (fila) => fila.planName ?? '—',
              },
              { clave: 'vence', titulo: 'Vence', celda: (fila) => fechaCorta(fila.endDate) },
              {
                clave: 'dias',
                titulo: 'Días',
                numerica: true,
                celda: (fila) => fila.daysRemaining,
              },
            ]}
            filas={porVencerPronto.slice(0, 8)}
            claveDeFila={(fila) => fila.membershipId}
            vacio={
              <EmptyState
                icono="check"
                titulo="Nadie vence en los próximos diez días"
                descripcion="Cuando alguna membresía entre en la ventana de aviso, aparecerá aquí."
              />
            }
          />
        </section>

        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-ultimas">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="titulo-ultimas" className="t-h3">
              Últimas entradas
            </h2>
            <LinkButton
              href={tenantHref(slug, 'panel/asistencia')}
              variant="ghost"
              size="sm"
              icon="arrowRight"
            >
              Control de asistencia
            </LinkButton>
          </div>

          <DataTable
            titulo="Últimas entradas registradas"
            className="mt-5"
            columnas={[
              { clave: 'socio', titulo: 'Socio', celda: (fila) => fila.customerName },
              { clave: 'fecha', titulo: 'Fecha', celda: (fila) => fechaCorta(fila.attendanceDate) },
              { clave: 'hora', titulo: 'Hora', celda: (fila) => hora(fila.checkedInAt) },
              {
                clave: 'metodo',
                titulo: 'Método',
                secundaria: true,
                celda: (fila) => NOMBRE_DE_METODO[fila.method],
              },
            ]}
            filas={ultimos}
            claveDeFila={(fila) => fila.id}
            vacio={
              <EmptyState
                icono="calendar"
                titulo="Todavía no hay entradas"
                descripcion="Registra la primera desde el mostrador y aparecerá aquí."
              />
            }
          />
        </section>
      </div>
    </div>
  );
}
