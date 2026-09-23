/**
 * CAPA: Presentation / App — control de asistencia.
 *
 * Check-in (cámara o teclado), estadísticas e historial en una pantalla,
 * porque en el mostrador son la misma tarea: registrar a quien llega y
 * comprobar a quien dice que vino.
 *
 * Cada tarjeta lleva a lo que resume, cada fila abre la ficha del socio, y las
 * estadísticas responden las preguntas reales de un gimnasio: a qué hora hay
 * más gente, qué día flojea, cuántos usan el QR.
 *
 * La búsqueda va por URL y formulario GET: el resultado es un enlace que se
 * guarda, funciona sin JavaScript y filtra en la base.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { NOMBRE_DE_METODO, calcularEstadisticas, resumirPatrones } from '@core/domain/operations/attendance';
import { FILAS_POR_PAGINA, paginaDeLaUrl } from '@core/domain/shared/paginacion';
import { BotonDeFiltrar, FormularioDeFiltro } from '@/presentation/patterns/FiltroConCarga';
import { Paginacion } from '@/presentation/patterns/Paginacion';
import type { PuntoDeSerie } from '@core/domain/operations/dashboard';
import { normalizarRango } from '@core/domain/operations/periodo';
import { CheckInPanel } from '@/presentation/patterns/CheckInPanel';
import { BotonFicha, FichaDeSocioProvider } from '@/presentation/patterns/FichaDeSocio';
import { BarChart } from '@/presentation/ui/BarChart';
import { DataTable } from '@/presentation/ui/DataTable';
import { DonutChart } from '@/presentation/ui/DonutChart';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { HeatMap } from '@/presentation/ui/HeatMap';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { CLASE_DE_CONTROL } from '@/presentation/ui/Campo';
import { Icon } from '@/presentation/icons/Icon';
import { ETIQUETA_SIN_SUCURSAL, FILTRO_SIN_SUCURSAL, repartoPorSucursal } from '@core/domain/operations/branches';
import { exigirPermiso, fechaCorta, hora } from '../_datos';
import { contextoDeSucursal } from '../_sucursal';
import { PanelPlegable } from '@/presentation/patterns/PanelPlegable';

export const metadata: Metadata = { title: 'Control de asistencia', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface AsistenciaPageProps extends TenantPageParams {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parametro(valor: string | string[] | undefined, largo = 60): string {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return typeof bruto === 'string' ? bruto.slice(0, largo).trim() : '';
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
/** Franja que se dibuja: antes de las 5 y después de las 23 casi ningún gimnasio abre. */
const HORAS = Array.from({ length: 19 }, (_, i) => i + 5);

export default async function AsistenciaPage({ params, searchParams }: AsistenciaPageProps) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableAttendance']);
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verAsistencia);
  const puedeRegistrar = tienePermiso(perfil, PERMISO.registrarAsistencia);
  const puedeVerReportes = features.enableReports && tienePermiso(perfil, PERMISO.verReportes);
  const gestionSocios = features.enableMemberManagement === true && tienePermiso(perfil, PERMISO.verSocios);

  const multisede = features.enableMultiBranch === true;
  const sede = await contextoDeSucursal(perfil);

  const consulta = await searchParams;
  const busqueda = parametro(consulta.q);
  const { desde, hasta } = normalizarRango(parametro(consulta.desde, 10), parametro(consulta.hasta, 10));
  // Solo valores conocidos: una sede de este gimnasio o el histórico sin sede.
  const sucursalCruda = multisede ? parametro(consulta.sucursal, 40) : '';
  const sucursalFiltro =
    sucursalCruda === FILTRO_SIN_SUCURSAL || sede.sucursales.some((s) => s.id === sucursalCruda) ? sucursalCruda : '';
  const hayFiltro = Boolean(busqueda || desde || hasta || sucursalFiltro);

  const pagina = paginaDeLaUrl(consulta.pagina);
  // V4: la bitácora pagina en la base y las estadísticas salen de conteos que ya
  // agregó la base (`v_attendance_patterns`). Antes: 80 filas de historial sin
  // saber cuántas había, y las últimas 500 entradas enteras para contar aquí
  // —con más de 500 en el mes, la «hora pico de 30 días» era de unos pocos días—.
  const [kpis, serie, historial, patrones] = await Promise.all([
    repo.indicadores(slug),
    repo.asistenciaDiaria(30),
    repo.historialPaginado({ busqueda, desde, hasta, ...(sucursalFiltro ? { sucursal: sucursalFiltro } : {}) }, pagina, FILAS_POR_PAGINA),
    repo.patronesDeAsistencia(),
  ]);
  const registros = historial.filas;

  const hoy = kpis?.hoy ?? (await repo.hoyDelGimnasio(slug));
  const resumen = resumirPatrones(patrones, HORAS);
  const estadisticas = calcularEstadisticas(serie.map((p) => ({ dia: p.dia, visitas: p.visitas })), []);
  const { calor, porHora, porMetodo } = resumen;

  const puntosPorDia: PuntoDeSerie[] = [];
  const mapaDias = new Map(serie.map((p) => [p.dia, p.visitas]));
  for (let i = 29; i >= 0; i -= 1) {
    const fecha = new Date(`${hoy}T12:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() - i);
    const clave = fecha.toISOString().slice(0, 10);
    const visitas = mapaDias.get(clave) ?? 0;
    puntosPorDia.push({ etiqueta: clave.slice(8, 10), valor: visitas, detalle: `${fechaCorta(clave)}: ${visitas} entradas` });
  }
  const puntosPorHora: PuntoDeSerie[] = HORAS.map((h) => ({
    etiqueta: String(h).padStart(2, '0'),
    valor: porHora.get(h) ?? 0,
    detalle: `${String(h).padStart(2, '0')}:00 a ${String(h).padStart(2, '0')}:59: ${porHora.get(h) ?? 0} entradas`,
  }));

  const reparto = multisede ? repartoPorSucursal(patrones) : [];
  // Tokens de marca; el histórico sin sede va siempre en gris, aparte.
  const COLORES_DE_SEDE = ['var(--t-action)', 'var(--t-structural)', 'var(--t-accent)', 'var(--t-structural-deep)'];
  const sociosUnicos = kpis?.sociosActivosMes ?? 0;
  const mejorDiaIndice = resumen.diaPico;
  const base = tenantHref(slug, 'panel/asistencia');

  return (
    <FichaDeSocioProvider slug={slug} rutaDeFicha={gestionSocios ? tenantHref(slug, 'panel/socios') : undefined}>
      <div className="flex flex-col gap-6">
        {puedeRegistrar ? (
          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-checkin">
            <h2 id="titulo-checkin" className="flex items-center gap-2 t-h3">
              <Icon name="camera" size={19} className="text-action" />
              Registrar entrada
            </h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">
              Usa la cámara para leer el QR del socio, o escanéalo con un lector / teclea el código. Se registra solo.
              {multisede && ' El mismo QR vale en todas las sedes: la entrada queda en tu sucursal actual.'}
            </p>
            <div className="mt-6">
              <CheckInPanel slug={slug} sucursal={sede.actual} mostrarSucursal={multisede} />
            </div>
          </section>
        ) : (
          <section className="surface-card">
            <EmptyState icono="lock" titulo="Puedes consultar la asistencia, pero no registrarla" descripcion="Registrar entradas le corresponde a recepción y a gerencia." />
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href={`${base}?desde=${hoy}&hasta=${hoy}#historial`} etiqueta="Entradas hoy" valor={`${kpis?.asistenciasHoy ?? 0}`} icono="calendar" tono="accion" comparacion={`${kpis?.asistenciasSemana ?? 0} en los últimos 7 días`} accion="Ver las de hoy" />
          <StatCard
            href={puedeVerReportes ? `${tenantHref(slug, 'panel/reportes/asistencia-por-socio')}?preset=30d` : '#estadisticas'}
            etiqueta="Socios distintos"
            valor={`${sociosUnicos}`}
            icono="group"
            comparacion={`vinieron en 30 días · ${estadisticas.promedioDiario.toFixed(1)} entradas al día`}
            accion="Constancia por socio"
          />
          <StatCard
            href="#estadisticas"
            etiqueta="Hora pico"
            valor={resumen.horaPico === null ? '—' : `${String(resumen.horaPico).padStart(2, '0')}:00`}
            icono="clock"
            comparacion={`día más movido: ${mejorDiaIndice === null ? '—' : (DIAS_LARGOS[mejorDiaIndice] ?? '—')}`}
            accion="Ver mapa de calor"
          />
          <StatCard
            href={estadisticas.mejorDia ? `${base}?desde=${estadisticas.mejorDia.dia}&hasta=${estadisticas.mejorDia.dia}#historial` : '#historial'}
            etiqueta="Mejor día"
            valor={estadisticas.mejorDia ? `${estadisticas.mejorDia.visitas}` : '—'}
            icono="star"
            comparacion={estadisticas.mejorDia ? `entradas el ${fechaCorta(estadisticas.mejorDia.dia)}` : 'sin datos'}
            accion="Ver ese día"
          />
        </div>

        <PanelPlegable nivel={2} titulo="Estadísticas de los últimos 30 días" resumen={`${resumen.total} entradas · por día, por hora y por método${multisede && reparto.length > 0 ? ', y por sucursal' : ''}`} id="estadisticas">
          <div className="flex flex-col gap-6">
            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-dias">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="titulo-dias" className="t-h3">Entradas por día</h3>
                  <p className="mt-1.5 text-[0.86rem] text-muted">Últimos 30 días. La barra de la derecha es hoy.</p>
                </div>
                {puedeVerReportes && (
                  <LinkButton href={`${tenantHref(slug, 'panel/reportes/asistencia')}?preset=30d`} variant="ghost" size="sm" icon="chart" iconPosition="start">
                    Reporte completo
                  </LinkButton>
                )}
              </div>
              <BarChart titulo="Entradas por día en los últimos 30 días" puntos={puntosPorDia} unidad="entradas" alto={190} className="mt-6" />
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-calor">
                <h3 id="titulo-calor" className="t-h3">¿Cuándo hay más gente?</h3>
                <p className="mt-1.5 text-[0.86rem] text-muted">Entradas por día de la semana y hora, en los últimos 30 días. Cuanto más intenso, más gente.</p>
                <HeatMap titulo="Entradas por día de la semana y hora" filas={DIAS} columnas={HORAS.map((h) => String(h).padStart(2, '0'))} valores={calor} className="mt-6" />
              </section>

              <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-metodos">
                <h3 id="titulo-metodos" className="t-h3">Cómo registran la entrada</h3>
                <p className="mt-1.5 text-[0.86rem] text-muted">Cuántos ya usan el QR y cuántos siguen pasando a mano.</p>
                <DonutChart
                  titulo="Entradas por método de registro"
                  className="mt-6"
                  centroValor={`${resumen.total}`}
                  centroEtiqueta="entradas"
                  segmentos={[
                    { etiqueta: NOMBRE_DE_METODO.qr, valor: porMetodo.get('qr') ?? 0, color: 'var(--t-action)' },
                    { etiqueta: NOMBRE_DE_METODO.manual, valor: porMetodo.get('manual') ?? 0, color: 'var(--t-structural)' },
                    { etiqueta: NOMBRE_DE_METODO.kiosk, valor: porMetodo.get('kiosk') ?? 0, color: 'color-mix(in srgb, var(--t-muted) 60%, transparent)' },
                  ]}
                />
              </section>
            </div>

            {multisede && reparto.length > 0 && (
              <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-sedes">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 id="titulo-sedes" className="t-h3">Entradas por sucursal</h3>
                    <p className="mt-1.5 text-[0.86rem] text-muted">Últimos 30 días. El mismo socio puede entrenar en varias sedes con su única membresía.</p>
                  </div>
                  {puedeVerReportes && (
                    <LinkButton href={`${tenantHref(slug, 'panel/reportes/asistencia-por-sucursal')}?preset=30d`} variant="ghost" size="sm" icon="chart" iconPosition="start">
                      Comparar sedes
                    </LinkButton>
                  )}
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center">
                  <DonutChart
                    titulo="Entradas por sucursal en los últimos 30 días"
                    centroValor={`${resumen.total}`}
                    centroEtiqueta="entradas"
                    segmentos={reparto.map((r, i) => ({
                      etiqueta: r.nombre,
                      valor: r.visitas,
                      color: r.branchId === null ? 'color-mix(in srgb, var(--t-muted) 60%, transparent)' : (COLORES_DE_SEDE[i % COLORES_DE_SEDE.length] ?? 'var(--t-action)'),
                    }))}
                  />
                  <ul className="flex flex-col gap-2">
                    {reparto.map((r) => (
                      <li key={r.branchId ?? 'sin'}>
                        <a
                          href={`${base}?sucursal=${r.branchId ?? FILTRO_SIN_SUCURSAL}#historial`}
                          className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--t-radius-md)] bg-raised px-4 text-[0.9rem] transition-colors hover:text-action"
                        >
                          <span className="flex items-center gap-2">
                            <Icon name="pin" size={15} className={r.branchId ? 'text-action' : 'text-muted'} />
                            {r.nombre}
                          </span>
                          <span className="tabular-nums text-muted">{r.visitas}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-horas">
              <h3 id="titulo-horas" className="t-h3">Entradas por hora</h3>
              <BarChart titulo="Entradas por hora del día" puntos={puntosPorHora} unidad="entradas" alto={170} saltoDeEtiqueta={2} className="mt-6" />
            </section>
          </div>
        </PanelPlegable>

        <PanelPlegable nivel={2} id="historial" titulo="Historial" resumen={`${historial.total} ${hayFiltro ? 'resultados con los filtros' : 'entradas registradas'} · busca por socio, sede o fechas`} abiertoAlInicio={hayFiltro || pagina > 1}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mt-1.5 text-[0.86rem] text-muted">Toca un socio para ver su ficha completa.</p>
            </div>
            <Badge tone="neutral">{historial.total} {hayFiltro ? 'resultados' : 'entradas'}</Badge>
          </div>

          <FormularioDeFiltro
            ruta={base}
            className={
              multisede
                ? 'mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] lg:items-end'
                : 'mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end'
            }
          >
            <div>
              <label htmlFor="q" className="mb-1.5 block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Socio o código</label>
              <input id="q" name="q" type="search" defaultValue={busqueda} maxLength={60} placeholder="Buscar por nombre o código" className={CLASE_DE_CONTROL} />
            </div>
            {multisede && (
              <div>
                <label htmlFor="sucursal" className="mb-1.5 block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Sucursal</label>
                <select id="sucursal" name="sucursal" defaultValue={sucursalFiltro} className={CLASE_DE_CONTROL}>
                  <option value="">Todas</option>
                  {sede.sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.isActive ? '' : ' (inactiva)'}
                    </option>
                  ))}
                  <option value={FILTRO_SIN_SUCURSAL}>{ETIQUETA_SIN_SUCURSAL}</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="desde" className="mb-1.5 block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Desde</label>
              <input id="desde" name="desde" type="date" defaultValue={desde ?? ''} className={CLASE_DE_CONTROL} />
            </div>
            <div>
              <label htmlFor="hasta" className="mb-1.5 block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Hasta</label>
              <input id="hasta" name="hasta" type="date" defaultValue={hasta ?? ''} className={CLASE_DE_CONTROL} />
            </div>
            <div className="flex gap-2">
              <BotonDeFiltrar texto="Buscar" icono="search" />
              {hayFiltro && <LinkButton href={`${base}#historial`} variant="ghost" size="md">Limpiar</LinkButton>}
            </div>
          </FormularioDeFiltro>

          <DataTable
            titulo="Entradas registradas"
            className="mt-6"
            columnas={[
              { clave: 'socio', titulo: 'Socio', celda: (fila) => <BotonFicha customerId={fila.customerId}>{fila.customerName}</BotonFicha> },
              { clave: 'codigo', titulo: 'Código', secundaria: true, celda: (fila) => fila.customerCode ?? '—' },
              { clave: 'fecha', titulo: 'Fecha', celda: (fila) => fechaCorta(fila.attendanceDate) },
              { clave: 'hora', titulo: 'Hora', celda: (fila) => hora(fila.checkedInAt) },
              ...(multisede
                ? [{ clave: 'sucursal', titulo: 'Sucursal', celda: (fila: (typeof registros)[number]) => fila.branchName ?? ETIQUETA_SIN_SUCURSAL }]
                : []),
              { clave: 'metodo', titulo: 'Método', secundaria: true, celda: (fila) => NOMBRE_DE_METODO[fila.method] },
            ]}
            filas={registros}
            claveDeFila={(fila) => fila.id}
            vacio={
              <EmptyState
                icono="calendar"
                titulo={hayFiltro ? 'Ninguna entrada coincide con la búsqueda' : 'Todavía no hay entradas'}
                descripcion={hayFiltro ? 'Prueba con otro nombre, otro código o un rango de fechas más amplio.' : 'Registra la primera desde el mostrador.'}
              />
            }
          />

          <Paginacion
            className="mt-5"
            ruta={base}
            parametros={consulta}
            pagina={pagina}
            porPagina={historial.porPagina}
            total={historial.total}
            filasEnPagina={registros.length}
            ancla="historial"
          />
        </PanelPlegable>
      </div>
    </FichaDeSocioProvider>
  );
}
