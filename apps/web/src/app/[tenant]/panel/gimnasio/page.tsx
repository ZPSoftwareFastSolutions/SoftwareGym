/**
 * CAPA: Presentation / App — dashboard operativo del gimnasio.
 *
 * Lo ven gerencia y recepción. Qué ve cada una lo deciden sus permisos y, por
 * debajo, RLS; no un `if` sobre el nombre del rol.
 *
 * V2.2 · CADA TARJETA HACE ALGO. «2 por vencer» lleva a esos dos socios;
 * «3 comprobantes» lleva a revisarlos; «Registrar entrada» abre la cámara. Un
 * número que no se puede tocar obliga a buscar a mano lo que ya dijo.
 *
 * Esconder una tarjeta es foco, no seguridad: recepción puede leer pagos
 * porque cobra; lo que no puede tocar se lo niega la base.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { variacion, type PuntoDeSerie } from '@core/domain/operations/dashboard';
import { NOMBRE_DE_METODO } from '@core/domain/operations/attendance';
import { cumpleEsteMes, diasDesde } from '@core/domain/operations/members';
import { membersRepository, paymentSettingsRepository, receiptsRepository } from '@infra/config/composition-root';
import { CheckInPanel } from '@/presentation/patterns/CheckInPanel';
import { BotonFicha, FichaDeSocioProvider } from '@/presentation/patterns/FichaDeSocio';
import { BarChart } from '@/presentation/ui/BarChart';
import { DataTable } from '@/presentation/ui/DataTable';
import { DonutChart } from '@/presentation/ui/DonutChart';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { exigirPermiso, fechaCorta, hora, importe } from '../_datos';

export const metadata: Metadata = { title: 'Resumen del gimnasio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default async function DashboardDelGimnasioPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verDashboard);

  const puede = (permiso: string) => tienePermiso(perfil, permiso);
  const puedeVerReportes = features.enableReports && puede(PERMISO.verReportes);
  const puedeRegistrar = features.enableAttendance && puede(PERMISO.registrarAsistencia);
  const gestionSocios = features.enableMemberManagement === true && puede(PERMISO.verSocios);
  const conComprobantes = features.enablePayments === true && puede(PERMISO.verPagos);

  const [kpis, serie, ingresos, vencimientos, ultimos, fichas, pendientes, ajustes] = await Promise.all([
    repo.indicadores(slug),
    repo.asistenciaDiaria(30),
    puedeVerReportes ? repo.ingresosMensuales() : Promise.resolve([]),
    repo.vencimientos(),
    repo.historialDeAsistencia({ limite: 8 }),
    gestionSocios ? (await membersRepository()).listar({}, '') : Promise.resolve([]),
    conComprobantes ? (await receiptsRepository()).contarPendientes() : Promise.resolve(0),
    features.enablePayments && puede(PERMISO.configurar) ? (await paymentSettingsRepository()).porSlug(slug) : Promise.resolve(null),
  ]);

  if (!kpis) {
    return (
      <section className="surface-card">
        <EmptyState icono="shield" titulo="Todavía no hay datos de este gimnasio" descripcion="En cuanto se registren socios, membresías y entradas, el resumen se llena solo." />
      </section>
    );
  }

  const moneda = kpis.currency;
  const hoy = kpis.hoy;
  const socios = tenantHref(slug, 'panel/socios');
  const asistencia = tenantHref(slug, 'panel/asistencia');

  // Enlace de una tarjeta: a la lista filtrada de socios si el gimnasio tiene
  // gestión de socios; si no, al reporte equivalente; si tampoco, a la sección
  // de esta misma página que muestra el dato. Nunca a ningún sitio.
  const aSocios = (consulta: string, reporte: string, ancla: string) =>
    gestionSocios ? `${socios}?${consulta}` : puedeVerReportes ? tenantHref(slug, `panel/reportes/${reporte}`) : ancla;

  const porDia = new Map(serie.map((punto) => [punto.dia, punto.visitas]));
  const puntosDeAsistencia: PuntoDeSerie[] = [];
  for (let indice = 29; indice >= 0; indice -= 1) {
    const fecha = new Date(`${hoy}T12:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() - indice);
    const clave = fecha.toISOString().slice(0, 10);
    const visitas = porDia.get(clave) ?? 0;
    puntosDeAsistencia.push({ etiqueta: clave.slice(8, 10), valor: visitas, detalle: `${fechaCorta(clave)}: ${visitas} entradas` });
  }

  const puntosDeIngreso: PuntoDeSerie[] = ingresos.map((punto) => {
    const mes = MESES[Number(punto.mes.slice(5, 7)) - 1] ?? punto.mes.slice(5, 7);
    return { etiqueta: mes, valor: punto.total, detalle: `${mes} ${punto.mes.slice(0, 4)}: ${importe(punto.total, moneda)} en ${punto.cobros} cobros` };
  });

  const totalMembresias = kpis.membresiasActivas + kpis.membresiasPorVencer + kpis.membresiasVencidas;
  const porVencerPronto = vencimientos.filter((v) => v.effectiveStatus !== 'expired' && v.daysRemaining <= 10);
  const inactivos = fichas.filter((f) => (f.membershipStatus === 'active' || f.membershipStatus === 'expiring_soon') && (diasDesde(f.lastVisit, hoy) ?? 999) >= 7).length;
  const cumpleaneros = fichas.filter((f) => cumpleEsteMes(f.birthDate, hoy));
  const sinMembresia = fichas.filter((f) => f.membershipId === null).length;
  const qrVencido = Boolean(ajustes?.expiresOn && ajustes.expiresOn < hoy);

  return (
    <FichaDeSocioProvider slug={slug} rutaDeFicha={gestionSocios ? socios : undefined}>
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {puedeRegistrar ? (
            <Modal
              titulo="Registrar entrada"
              descripcion="Con la cámara o con el lector. Se registra solo al leer el QR."
              anchoMaximo="md"
              montarSoloAbierto
              disparador={<StatCard boton etiqueta="Mostrador" valor={`${kpis.asistenciasHoy}`} icono="camera" tono="accion" comparacion="entradas hoy · toca para registrar" accion="Registrar entrada" />}
            >
              <CheckInPanel slug={slug} empezarConCamara />
            </Modal>
          ) : (
            <StatCard href={`${asistencia}?desde=${hoy}&hasta=${hoy}`} etiqueta="Entradas hoy" valor={`${kpis.asistenciasHoy}`} icono="calendar" tono="accion" comparacion={`${kpis.asistenciasSemana} en 7 días`} accion="Ver entradas" />
          )}
          <StatCard
            href={aSocios('estado=active', 'clientes?estado=active', '#membresias')}
            etiqueta="Socios activos"
            valor={`${kpis.sociosActivos}`}
            icono="group"
            comparacion={`${kpis.sociosActivosMes} entrenaron este mes`}
            accion="Ver socios"
          />
          <StatCard
            href={aSocios('estado=expiring_soon', 'vencimientos', '#vencimientos')}
            etiqueta="Por vencer"
            valor={`${kpis.membresiasPorVencer}`}
            icono="clock"
            tono={kpis.membresiasPorVencer > 0 ? 'alerta' : 'neutro'}
            comparacion={`${kpis.membresiasVencidas} ya vencidas`}
            subirEsMalo
            accion="A quién llamar"
          />
          {puedeVerReportes ? (
            <StatCard
              href={`${tenantHref(slug, 'panel/reportes/pagos')}?preset=mes`}
              etiqueta="Ingresos del mes"
              valor={importe(kpis.ingresosMes, moneda)}
              icono="wallet"
              variacion={variacion(kpis.ingresosMes, kpis.ingresosMesAnterior)}
              comparacion="frente al mes anterior"
              accion="Ver pagos"
            />
          ) : (
            <StatCard href={aSocios('estado=active', 'membresias', '#membresias')} etiqueta="Membresías activas" valor={`${kpis.membresiasActivas}`} icono="shield" comparacion={`de ${totalMembresias} registradas`} accion="Ver socios" />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {conComprobantes && (
            <StatCard
              href={`${tenantHref(slug, 'panel/comprobantes')}?estado=pendiente&preset=todo`}
              etiqueta="Comprobantes por revisar"
              valor={`${pendientes}`}
              icono="receipt"
              tono={pendientes > 0 ? 'alerta' : 'neutro'}
              comparacion={pendientes > 0 ? 'pagos QR esperando aprobación' : 'todo revisado'}
              accion="Revisar"
            />
          )}
          {gestionSocios && puede(PERMISO.crearSocios) && (
            <StatCard href={`${socios}/nuevo`} etiqueta="Nuevo socio" valor="+" icono="plus" tono="accion" comparacion={`${sinMembresia} sin membresía todavía`} accion="Registrar socio" />
          )}
          {gestionSocios && (
            <StatCard
              href={`${socios}?vista=inactivos`}
              etiqueta="Sin venir 7+ días"
              valor={`${inactivos}`}
              icono="fire"
              tono={inactivos > 0 ? 'alerta' : 'neutro'}
              comparacion="con membresía vigente: vale un mensaje"
              subirEsMalo
              accion="Ver quiénes"
            />
          )}
          {gestionSocios && (
            <StatCard
              href={`${socios}?vista=cumple`}
              etiqueta="Cumplen este mes"
              valor={`${cumpleaneros.length}`}
              icono="cake"
              comparacion={cumpleaneros.slice(0, 2).map((f) => f.firstName).join(', ') || 'nadie este mes'}
              accion="Ver cumpleaños"
            />
          )}
          {ajustes !== null && puede(PERMISO.configurar) && features.enablePayments && (
            <StatCard
              href={tenantHref(slug, 'panel/cobros')}
              etiqueta="QR de cobro"
              valor={!ajustes?.qrPath ? 'Sin QR' : qrVencido ? 'Vencido' : 'Publicado'}
              icono="qr"
              tono={!ajustes?.qrPath || qrVencido ? 'alerta' : 'accion'}
              comparacion={ajustes?.expiresOn ? `vence ${fechaCorta(ajustes.expiresOn)} ${ajustes.expiresOn.slice(0, 4)}` : 'súbelo para cobrar por QR'}
              accion="Configurar"
            />
          )}
          {features.enablePayments && puede(PERMISO.configurar) && ajustes === null && (
            <StatCard href={tenantHref(slug, 'panel/cobros')} etiqueta="QR de cobro" valor="Sin QR" icono="qr" tono="alerta" comparacion="súbelo para activar «Pagar con QR»" accion="Configurar" />
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-asistencia">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="titulo-asistencia" className="t-h3">Entradas de los últimos 30 días</h2>
                <p className="mt-1.5 text-[0.86rem] text-muted">La barra de la derecha es hoy.</p>
              </div>
              {features.enableAttendance && (
                <LinkButton href={asistencia} variant="ghost" size="sm" icon="arrowRight">
                  Estadísticas
                </LinkButton>
              )}
            </div>
            <BarChart titulo="Entradas por día en los últimos 30 días" puntos={puntosDeAsistencia} unidad="entradas" alto={190} className="mt-6" />
          </section>

          <section id="membresias" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-membresias">
            <h2 id="titulo-membresias" className="t-h3">Estado de las membresías</h2>
            <DonutChart
              titulo="Reparto de membresías por estado"
              className="mt-6"
              centroValor={`${totalMembresias}`}
              centroEtiqueta="membresías"
              segmentos={[
                { etiqueta: 'Activas', valor: kpis.membresiasActivas, color: 'var(--t-action)' },
                { etiqueta: 'Por vencer', valor: kpis.membresiasPorVencer, color: 'var(--t-structural)' },
                { etiqueta: 'Vencidas', valor: kpis.membresiasVencidas, color: 'color-mix(in srgb, var(--t-muted) 60%, transparent)' },
              ]}
            />
            {gestionSocios && (
              <div className="mt-5 flex flex-wrap gap-2">
                <LinkButton href={`${socios}?estado=active`} variant="secondary" size="sm">Activas</LinkButton>
                <LinkButton href={`${socios}?estado=expiring_soon`} variant="secondary" size="sm">Por vencer</LinkButton>
                <LinkButton href={`${socios}?estado=expired`} variant="secondary" size="sm">Vencidas</LinkButton>
              </div>
            )}
          </section>
        </div>

        {puedeVerReportes && (
          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-ingresos">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="titulo-ingresos" className="t-h3">Ingresos por mes</h2>
                <p className="mt-1.5 text-[0.86rem] text-muted">Incluye los cobros aprobados desde comprobantes QR.</p>
              </div>
              <LinkButton href={`${tenantHref(slug, 'panel/reportes/ingresos-por-plan')}?preset=mes`} variant="ghost" size="sm" icon="arrowRight">
                Por plan
              </LinkButton>
            </div>
            <BarChart titulo="Ingresos por mes" puntos={puntosDeIngreso} unidad="bolivianos" alto={170} saltoDeEtiqueta={1} className="mt-6" />
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <section id="vencimientos" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-vencimientos">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id="titulo-vencimientos" className="t-h3">A punto de vencer</h2>
              {porVencerPronto.length > 0 && <Badge tone="structural">{porVencerPronto.length} para llamar</Badge>}
            </div>
            <p className="mt-1.5 text-[0.86rem] text-muted">Los próximos diez días. Toca un socio para ver su ficha y su teléfono.</p>
            <DataTable
              titulo="Membresías que vencen en los próximos diez días"
              className="mt-5"
              columnas={[
                { clave: 'socio', titulo: 'Socio', celda: (fila) => <BotonFicha customerId={fila.customerId}>{fila.customerName}</BotonFicha> },
                { clave: 'plan', titulo: 'Plan', secundaria: true, celda: (fila) => fila.planName ?? '—' },
                { clave: 'vence', titulo: 'Vence', celda: (fila) => fechaCorta(fila.endDate) },
                { clave: 'dias', titulo: 'Días', numerica: true, celda: (fila) => fila.daysRemaining },
              ]}
              filas={porVencerPronto.slice(0, 8)}
              claveDeFila={(fila) => fila.membershipId}
              vacio={<EmptyState icono="check" titulo="Nadie vence en los próximos diez días" />}
            />
          </section>

          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-ultimas">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id="titulo-ultimas" className="t-h3">Últimas entradas</h2>
              {features.enableAttendance && (
                <LinkButton href={asistencia} variant="ghost" size="sm" icon="arrowRight">
                  Control de asistencia
                </LinkButton>
              )}
            </div>
            <DataTable
              titulo="Últimas entradas registradas"
              className="mt-5"
              columnas={[
                { clave: 'socio', titulo: 'Socio', celda: (fila) => <BotonFicha customerId={fila.customerId}>{fila.customerName}</BotonFicha> },
                { clave: 'fecha', titulo: 'Fecha', celda: (fila) => fechaCorta(fila.attendanceDate) },
                { clave: 'hora', titulo: 'Hora', celda: (fila) => hora(fila.checkedInAt) },
                { clave: 'metodo', titulo: 'Método', secundaria: true, celda: (fila) => NOMBRE_DE_METODO[fila.method] },
              ]}
              filas={ultimos}
              claveDeFila={(fila) => fila.id}
              vacio={<EmptyState icono="calendar" titulo="Todavía no hay entradas" />}
            />
          </section>
        </div>
      </div>
    </FichaDeSocioProvider>
  );
}
