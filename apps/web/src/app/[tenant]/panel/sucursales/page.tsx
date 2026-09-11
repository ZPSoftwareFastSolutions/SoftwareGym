/**
 * CAPA: Presentation / App — administración de sucursales (V3.0).
 *
 * Qué sedes tiene el gimnasio, cómo va cada una y quién trabaja dónde.
 *
 * Capacidad `enableMultiBranch` (apagada → 404) y permiso `branches.manage`.
 * Ninguna de las dos protege los datos: lo hace RLS. Una sede nunca se borra
 * desde aquí; se desactiva, y su historial queda.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { ETIQUETA_SIN_SUCURSAL } from '@core/domain/operations/branches';
import type { PuntoDeSerie } from '@core/domain/operations/dashboard';
import { NOMBRE_DE_ROL, PERMISO, tienePermiso, type CodigoDeRol } from '@core/domain/operations/workspace';
import { branchesRepository } from '@infra/config/composition-root';
import { SucursalForm } from '@/presentation/patterns/SucursalForm';
import { TarjetaDeSucursal } from '@/presentation/patterns/TarjetaDeSucursal';
import { BarChart } from '@/presentation/ui/BarChart';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { exigirPermiso } from '../_datos';
import { contextoDeSucursal } from '../_sucursal';

export const metadata: Metadata = { title: 'Sucursales', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function nombreDeRol(codigo: string): string {
  return codigo in NOMBRE_DE_ROL ? NOMBRE_DE_ROL[codigo as CodigoDeRol] : codigo;
}

export default async function SucursalesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableMultiBranch']);
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.gestionarSucursales);

  const sucursales = await branchesRepository();
  const [indicadores, kpis, personal, serie, sede] = await Promise.all([
    sucursales.indicadores(),
    repo.indicadores(slug),
    tienePermiso(perfil, PERMISO.verUsuarios) ? sucursales.personal() : Promise.resolve([]),
    sucursales.serieDiaria(30),
    contextoDeSucursal(perfil),
  ]);

  const hoy = kpis?.hoy ?? indicadores[0]?.hoy ?? '';
  const activas = indicadores.filter((s) => s.isActive);
  const total30d = indicadores.reduce((suma, s) => suma + s.asistencias30d, 0);
  const sinSede30d = serie.filter((p) => p.branchId === null).reduce((suma, p) => suma + p.visitas, 0);
  const entradasHoy = indicadores.reduce((suma, s) => suma + s.asistenciasHoy, 0);
  const nombreDeSede = new Map(indicadores.map((s) => [s.id, s.name]));

  const comparativa: PuntoDeSerie[] = indicadores
    .filter((s) => s.isActive || s.asistencias30d > 0)
    .map((s) => ({ etiqueta: s.name.slice(0, 14), valor: s.asistencias30d, detalle: `${s.name}: ${s.asistencias30d} entradas en 30 días` }));

  const base = tenantHref(slug, 'panel/sucursales');

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Sucursales</h2>
          <p className="mt-1.5 max-w-[62ch] text-[0.88rem] leading-relaxed text-muted">
            Las sedes de {tenant.name}. El socio y su membresía son del gimnasio y valen en todas; cada entrada queda registrada en la sede donde ocurrió.
          </p>
        </div>
        <Modal
          titulo="Nueva sucursal"
          descripcion="Se publica en la web en cuanto la guardes activa."
          anchoMaximo="lg"
          montarSoloAbierto
          disparador={
            <Button variant="primary" size="md" icon="plus" iconPosition="start">
              Nueva sucursal
            </Button>
          }
        >
          <SucursalForm slug={slug} />
        </Modal>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="#sedes" etiqueta="Sedes activas" valor={`${activas.length}`} icono="pin" tono="accion" comparacion={`de ${indicadores.length} registradas`} accion="Ver sedes" />
        {features.enableAttendance ? (
          <StatCard href={`${tenantHref(slug, 'panel/asistencia')}?desde=${hoy}&hasta=${hoy}#historial`} etiqueta="Entradas hoy" valor={`${entradasHoy}`} icono="calendar" comparacion="sumando todas las sedes" accion="Ver entradas" />
        ) : (
          <StatCard href="#sedes" etiqueta="Entradas hoy" valor={`${entradasHoy}`} icono="calendar" comparacion="sumando todas las sedes" />
        )}
        <StatCard
          href={features.enableReports ? `${tenantHref(slug, 'panel/reportes/asistencia-por-sucursal')}?preset=30d` : '#comparativa'}
          etiqueta="Entradas 30 días"
          valor={`${total30d}`}
          icono="chart"
          comparacion={kpis ? `${kpis.sociosActivosMes} socios distintos en el gimnasio` : 'en todas las sedes'}
          accion="Comparar sedes"
        />
        <StatCard
          href="#personal"
          etiqueta="Personal asignado"
          valor={`${personal.filter((p) => p.sucursales.length > 0 || p.alcanceGlobal).length}`}
          icono="group"
          comparacion={`${personal.filter((p) => !p.alcanceGlobal && p.sucursales.length === 0).length} sin sede`}
          subirEsMalo
          accion="Ver asignaciones"
        />
      </div>

      <section id="sedes" className="scroll-mt-28" aria-labelledby="titulo-sedes">
        <h2 id="titulo-sedes" className="sr-only">Sedes</h2>
        {indicadores.length === 0 ? (
          <div className="surface-card">
            <EmptyState icono="pin" titulo="Todavía no hay sucursales" descripcion="Crea la primera sede: será la principal y todas las entradas se registrarán en ella." />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {indicadores.map((s) => (
              <TarjetaDeSucursal key={s.id} sucursal={s} total30d={total30d + sinSede30d} href={`${base}/${s.id}`} accion="Administrar sede" actual={sede.actual?.id === s.id} />
            ))}
          </div>
        )}
      </section>

      {comparativa.length > 1 && (
        <section id="comparativa" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-comparativa">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="titulo-comparativa" className="t-h3">Comparativa de 30 días</h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">
                Entradas por sede.
                {sinSede30d > 0 && ` Además hay ${sinSede30d} entradas anteriores a las sucursales («${ETIQUETA_SIN_SUCURSAL.toLowerCase()}»).`}
              </p>
            </div>
            {features.enableReports && (
              <LinkButton href={`${tenantHref(slug, 'panel/reportes/asistencia-por-sucursal')}?preset=30d`} variant="ghost" size="sm" icon="chart" iconPosition="start">
                Reporte completo
              </LinkButton>
            )}
          </div>
          <BarChart titulo="Entradas por sucursal en los últimos 30 días" puntos={comparativa} unidad="entradas" alto={170} saltoDeEtiqueta={1} className="mt-6" />
        </section>
      )}

      <section id="personal" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-personal">
        <h2 id="titulo-personal" className="t-h3">Quién trabaja dónde</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">
          Una cuenta con alcance global opera en todas las sedes. El resto solo registra en las sedes asignadas; se asignan desde cada sucursal.
        </p>
        <DataTable
          titulo="Personal del gimnasio y sus sucursales"
          className="mt-5"
          columnas={[
            { clave: 'nombre', titulo: 'Persona', celda: (p) => <span className="font-medium text-ink">{p.fullName}</span> },
            { clave: 'rol', titulo: 'Rol', secundaria: true, celda: (p) => p.roles.filter((r) => r !== 'customer').map(nombreDeRol).join(', ') },
            {
              clave: 'sedes',
              titulo: 'Sucursales',
              celda: (p) =>
                p.alcanceGlobal ? (
                  <Badge tone="action">Todas</Badge>
                ) : p.sucursales.length > 0 ? (
                  p.sucursales.map((id) => nombreDeSede.get(id) ?? 'Sede').join(', ')
                ) : (
                  <Badge tone="structural">Sin sede</Badge>
                ),
            },
          ]}
          filas={personal}
          claveDeFila={(p) => p.appUserId}
          vacio={<EmptyState icono="group" titulo="No hay cuentas del personal que mostrar" />}
        />
      </section>
    </div>
  );
}
