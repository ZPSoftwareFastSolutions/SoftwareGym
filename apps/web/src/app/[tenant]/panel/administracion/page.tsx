/**
 * CAPA: Presentation / App — resumen de Administración del gimnasio (V4).
 *
 * El espacio de quien administra el gimnasio (`roles.manage` + `dashboard.read`).
 * Misma estructura que el dashboard de gerencia —tarjetas que llevan a algo,
 * secciones con su propósito—, pero a la altura de quien responde por todo el
 * gimnasio: el estado del negocio en una fila, el personal y sus roles, TODOS
 * los módulos contratados a un clic y los últimos cambios administrativos.
 *
 * Corto a propósito. La operación del día (mostrador, series, vencimientos)
 * sigue en `panel/gimnasio` y cada módulo tiene su página: repetirlos aquí haría
 * la página larga y lenta sin darle a nadie un dato nuevo.
 *
 * Todo lo que se ve pasa por RLS con la sesión: un administrador ve SU gimnasio
 * y ningún otro, aunque escriba a mano el id de otro en una consulta.
 *
 * V6 · LIMPIO AL ENTRAR, con el mismo criterio que el tablero del gimnasio
 * (`panelesAbiertosAlCargar`): lo que se ve al cargar son los botones y las
 * tarjetas; la curva de ingresos, los módulos y el registro de cambios esperan
 * cerrados en su `PanelPlegable`, cada uno con una línea que dice qué hay dentro.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { NOMBRE_DE_GRUPO, agruparEntradas } from '@/lib/navegacion';
import { PERMISO, espacioDeTrabajo, tienePermiso } from '@core/domain/operations/workspace';
import { accionesRapidas, enfoqueDeTablero } from '@core/domain/operations/tablero';
import { variacion, type PuntoDeSerie } from '@core/domain/operations/dashboard';
import { CONTEO_DE_SOCIOS_VACIO } from '@core/domain/operations/members';
import { describirEvento } from '@core/domain/operations/staff';
import { membersRepository, receiptsRepository, staffRepository } from '@infra/config/composition-root';
import { AccionesRapidas } from '@/presentation/patterns/AccionesRapidas';
import { PanelPlegable } from '@/presentation/patterns/PanelPlegable';
import { BarChart } from '@/presentation/ui/BarChart';
import { Badge } from '@/presentation/ui/Badge';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { LinkButton } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { momentoEnZona } from '@/lib/formato';
import { contextoDeSucursal } from '../_sucursal';
import { exigirPermiso, importe } from '../_datos';
import { entradasDelPanel } from '../_navegacion';

export const metadata: Metadata = { title: 'Administración', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default async function AdministracionPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.gestionarRoles);

  const puede = (permiso: string) => tienePermiso(perfil, permiso);
  const conSocios = features.enableMemberManagement === true && puede(PERMISO.verSocios);
  const conComprobantes = features.enablePayments === true && puede(PERMISO.verPagos);
  const personal = await staffRepository();

  const sede = await contextoDeSucursal(perfil);
  const puedeVerReportes = features.enableReports === true && puede(PERMISO.verReportes);

  const [kpis, conteo, resumen, actividad, pendientes, modulos, ingresos] = await Promise.all([
    repo.indicadores(slug),
    conSocios ? (await membersRepository()).conteos() : Promise.resolve(CONTEO_DE_SOCIOS_VACIO),
    personal.resumen(),
    puede(PERMISO.verAuditoria) ? personal.actividad(8) : Promise.resolve([]),
    conComprobantes ? (await receiptsRepository()).contarPendientes() : Promise.resolve(0),
    entradasDelPanel(tenant, perfil),
    puedeVerReportes ? repo.ingresosMensuales() : Promise.resolve([]),
  ]);

  // §11 y §13 · lo que Administración usa a diario, arriba del todo, y el
  // dinero antes que la configuración. Qué botones hay lo decide el dominio
  // con las capacidades contratadas y los permisos reales de la cuenta.
  const acciones = accionesRapidas({
    enfoque: enfoqueDeTablero(espacioDeTrabajo(perfil), perfil.permissions),
    capacidades: features,
    permisos: perfil.permissions,
    puedeOperarEnSede: features.enableAttendance === true && puede(PERMISO.registrarAsistencia) && sede.actual !== null,
  });

  const puntosDeIngreso: PuntoDeSerie[] = ingresos.map((punto) => {
    const mes = MESES[Number(punto.mes.slice(5, 7)) - 1] ?? punto.mes.slice(5, 7);
    return {
      etiqueta: mes,
      valor: punto.total,
      detalle: `${mes} ${punto.mes.slice(0, 4)}: ${importe(punto.total, kpis?.currency ?? 'BOB')} en ${punto.cobros} cobros`,
    };
  });

  const grupos = agruparEntradas(modulos.filter((m) => m.grupo !== 'inicio'));
  const totalDeModulos = grupos.reduce((suma, armado) => suma + armado.entradas.length, 0);
  const ultimoCambio = actividad[0];
  const socios = tenantHref(slug, 'panel/socios');
  const personalHref = tenantHref(slug, 'panel/personal');

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7" aria-labelledby="titulo-administracion">
        <div className="min-w-0">
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-muted">Administración del gimnasio</p>
          <h2 id="titulo-administracion" className="mt-1 flex items-center gap-2 t-h2 leading-tight">
            <Icon name="key" size={24} className="text-action" />
            {tenant.name}
          </h2>
          <p className="mt-1.5 max-w-[68ch] text-[0.88rem] text-muted">
            Control de todo lo contratado por este gimnasio: operación, cobros, personal y configuración. Ningún dato de otro gimnasio aparece aquí.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={tenantHref(slug, 'panel/gimnasio')} variant="primary" size="md" icon="layers" iconPosition="start">
            Operación del día
          </LinkButton>
          <LinkButton href={personalHref} variant="secondary" size="md" icon="key" iconPosition="start">
            Personal y roles
          </LinkButton>
        </div>
      </section>

      <AccionesRapidas
        slug={slug}
        acciones={acciones}
        sucursalDelMostrador={sede.actual}
        mostrarSucursal={features.enableMultiBranch === true}
        {...(conComprobantes ? { comprobantesPendientes: pendientes } : {})}
      />

      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            href={conSocios ? `${socios}?estado=active` : tenantHref(slug, 'panel/gimnasio')}
            etiqueta="Socios activos"
            valor={`${kpis.sociosActivos}`}
            icono="group"
            tono="accion"
            comparacion={`${kpis.membresiasPorVencer} por vencer · ${kpis.membresiasVencidas} vencidas`}
            accion="Ver socios"
          />
          {features.enableReports && puede(PERMISO.verReportes) ? (
            <StatCard
              href={`${tenantHref(slug, 'panel/reportes/pagos')}?preset=mes`}
              etiqueta="Ingresos del mes"
              valor={importe(kpis.ingresosMes, kpis.currency)}
              icono="wallet"
              variacion={variacion(kpis.ingresosMes, kpis.ingresosMesAnterior)}
              comparacion="frente al mes anterior"
              accion="Ver pagos"
            />
          ) : (
            <StatCard href={tenantHref(slug, 'panel/gimnasio')} etiqueta="Membresías activas" valor={`${kpis.membresiasActivas}`} icono="shield" accion="Ver resumen" />
          )}
          <StatCard
            href={features.enableAttendance ? tenantHref(slug, 'panel/asistencia') : tenantHref(slug, 'panel/gimnasio')}
            etiqueta="Entradas hoy"
            valor={`${kpis.asistenciasHoy}`}
            icono="calendar"
            comparacion={`${kpis.asistenciasSemana} en 7 días`}
            accion="Ver asistencia"
          />
          {conComprobantes ? (
            <StatCard
              href={`${tenantHref(slug, 'panel/comprobantes')}?estado=pendiente&preset=todo`}
              etiqueta="Comprobantes por revisar"
              valor={`${pendientes}`}
              icono="receipt"
              tono={pendientes > 0 ? 'alerta' : 'neutro'}
              comparacion={pendientes > 0 ? 'pagos QR esperando aprobación' : 'todo revisado'}
              accion="Revisar"
            />
          ) : (
            <StatCard href={`${socios}?vista=inactivos`} etiqueta="Sin venir 7+ días" valor={`${conteo.sinVenir7d}`} icono="fire" accion="Ver quiénes" />
          )}
        </div>
      ) : (
        <section className="surface-card">
          <EmptyState icono="shield" titulo="Todavía no hay datos de este gimnasio" descripcion="En cuanto se registren socios, membresías y entradas, el resumen se llena solo." />
        </section>
      )}

      {puedeVerReportes && (
        <PanelPlegable nivel={2} titulo="Ingresos por mes" resumen="La curva mes a mes; el detalle con filtros está en los reportes">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="max-w-[68ch] text-[0.86rem] text-muted">
              Cobros aprobados, incluidos los que entraron por comprobante de QR. El detalle, con sus filtros y su
              tabla paginada, está en los reportes: aquí va la forma de la curva, no el listado.
            </p>
            <LinkButton href={`${tenantHref(slug, 'panel/reportes/pagos')}?preset=mes`} variant="ghost" size="sm" icon="arrowRight">
              Ver pagos
            </LinkButton>
          </div>
          <BarChart titulo="Ingresos por mes" puntos={puntosDeIngreso} unidad="bolivianos" alto={170} saltoDeEtiqueta={1} className="mt-2" />
        </PanelPlegable>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href={`${personalHref}?vista=personal`} etiqueta="Administración" valor={`${resumen.administradores}`} icono="key" tono="accion" comparacion={`${resumen.gerentes} en gerencia`} accion="Personal y roles" />
        <StatCard href={`${personalHref}?vista=personal`} etiqueta="Recepción" valor={`${resumen.recepcion}`} icono="idcard" comparacion={`${resumen.entrenadores} entrenadores con cuenta`} accion="Ver personal" />
        <StatCard
          href={`${personalHref}?vista=suspendidas`}
          etiqueta="Cuentas suspendidas"
          valor={`${resumen.suspendidas}`}
          icono="lock"
          tono={resumen.suspendidas > 0 ? 'alerta' : 'neutro'}
          comparacion={`de ${resumen.cuentas} cuentas`}
          accion="Revisar"
        />
        {conSocios ? (
          <StatCard href={`${socios}?estado=sin-membresia`} etiqueta="Socios sin membresía" valor={`${conteo.sinMembresia}`} icono="user" comparacion={`${conteo.archivados} archivados`} accion="Ver socios" />
        ) : (
          <StatCard href={personalHref} etiqueta="Cuentas" valor={`${resumen.cuentas}`} icono="group" accion="Ver cuentas" />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelPlegable
          ladoALado
          nivel={2}
          titulo="Módulos del gimnasio"
          resumen={`${totalDeModulos} módulos contratados por ${tenant.name}, agrupados como en la navegación`}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {grupos.map((armado) => (
              <div key={armado.grupo}>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">{NOMBRE_DE_GRUPO[armado.grupo]}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {armado.entradas.map((modulo) => (
                    <li key={modulo.href}>
                      <Link
                        href={modulo.href}
                        className="flex min-h-11 items-center gap-2.5 rounded-[var(--t-radius-md)] border border-line px-3 text-[0.88rem] text-ink transition-colors hover:border-action"
                      >
                        <Icon name={modulo.icono} size={16} className="text-action" />
                        <span className="flex-1">{modulo.etiqueta}</span>
                        {typeof modulo.insignia === 'number' && modulo.insignia > 0 && <Badge tone="structural">{modulo.insignia}</Badge>}
                        <Icon name="arrowRight" size={14} className="text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PanelPlegable>

        <PanelPlegable
          ladoALado
          nivel={2}
          titulo="Cambios administrativos"
          resumen={ultimoCambio ? `El último: ${describirEvento(ultimoCambio)}` : 'Sin cambios registrados todavía'}
        >
          <p className="text-[0.86rem] text-muted">Roles, cuentas y sedes: quién cambió qué, y cuándo.</p>
          {actividad.length === 0 ? (
            <EmptyState icono="shield" titulo="Sin cambios registrados todavía" />
          ) : (
            <ol className="flex flex-col gap-3">
              {actividad.map((evento) => (
                <li key={evento.id} className="flex flex-col gap-0.5 border-b border-line pb-3 text-[0.86rem] last:border-0">
                  <span className="text-ink">{describirEvento(evento)}</span>
                  <span className="text-[0.76rem] text-muted">
                    {evento.actorName ?? 'Sistema'} · {momentoEnZona(evento.occurredAt, tenant.hours.timezone)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </PanelPlegable>
      </div>
    </div>
  );
}
