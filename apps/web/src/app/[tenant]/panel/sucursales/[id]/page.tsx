/**
 * CAPA: Presentation / App — una sucursal (V3.0).
 *
 * Actividad de la sede, sus datos públicos, su estado y quién opera en ella.
 *
 * Desactivar no borra: la sede deja de aceptar entradas —lo impide la base— y
 * todo su historial sigue en reportes, fichas y paneles de socio.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { lineasDeHorario, urlDeUbicacion } from '@core/domain/operations/branches';
import { NOMBRE_DE_METODO } from '@core/domain/operations/attendance';
import type { PuntoDeSerie } from '@core/domain/operations/dashboard';
import { porcentaje } from '@core/domain/operations/reports';
import { NOMBRE_DE_ROL, PERMISO, tienePermiso, type CodigoDeRol } from '@core/domain/operations/workspace';
import { branchesRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { BotonFicha, FichaDeSocioProvider } from '@/presentation/patterns/FichaDeSocio';
import { SucursalForm } from '@/presentation/patterns/SucursalForm';
import { BarChart } from '@/presentation/ui/BarChart';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso, fechaCorta, hora } from '../../_datos';
import {
  activarSucursal,
  asignarPersonal,
  desactivarSucursal,
  hacerSucursalPrincipal,
  retirarPersonal,
} from '../actions';

export const metadata: Metadata = { title: 'Sucursal', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface SucursalPageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

export default async function SucursalPage({ params }: SucursalPageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableMultiBranch']);
  const { slug, features, contact } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.gestionarSucursales);

  const sucursales = await branchesRepository();
  const sucursal = await sucursales.porId(id);
  // Inexistente o de otro gimnasio (RLS no la devuelve): la misma respuesta.
  if (!sucursal) notFound();

  const [indicadores, serie, ultimas, personal] = await Promise.all([
    sucursales.indicadores(),
    sucursales.serieDiaria(30),
    features.enableAttendance ? repo.historialDeAsistencia({ sucursal: id, limite: 10 }) : Promise.resolve([]),
    tienePermiso(perfil, PERMISO.verUsuarios) ? sucursales.personal() : Promise.resolve([]),
  ]);

  const datos = indicadores.find((s) => s.id === id);
  const hoy = datos?.hoy ?? '';
  const total30d = indicadores.reduce((suma, s) => suma + s.asistencias30d, 0);
  const porDia = new Map(serie.filter((p) => p.branchId === id).map((p) => [p.dia, p.visitas]));
  const puntos: PuntoDeSerie[] = [];
  if (hoy) {
    for (let i = 29; i >= 0; i -= 1) {
      const fecha = new Date(`${hoy}T12:00:00Z`);
      fecha.setUTCDate(fecha.getUTCDate() - i);
      const clave = fecha.toISOString().slice(0, 10);
      const visitas = porDia.get(clave) ?? 0;
      puntos.push({ etiqueta: clave.slice(8, 10), valor: visitas, detalle: `${fechaCorta(clave)}: ${visitas} entradas` });
    }
  }

  const campos = { tenantSlug: slug, branchId: sucursal.id };
  const ubicacion = urlDeUbicacion(sucursal, contact.city);
  const horario = lineasDeHorario(sucursal.openingHours);
  const asistencia = tenantHref(slug, 'panel/asistencia');
  const conAsignacion = personal.filter((p) => !p.alcanceGlobal);
  const globales = personal.filter((p) => p.alcanceGlobal);

  return (
    <FichaDeSocioProvider slug={slug} rutaDeFicha={features.enableMemberManagement ? tenantHref(slug, 'panel/socios') : undefined}>
      <div className="flex flex-col gap-6">
        <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
          <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
            <Icon name="pin" size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="t-h3">{sucursal.name}</h2>
              {sucursal.isPrimary && <Badge tone="action">Principal</Badge>}
              <Badge tone={sucursal.isActive ? 'neutral' : 'structural'}>{sucursal.isActive ? 'Activa' : 'Inactiva'}</Badge>
            </div>
            <p className="mt-1 font-mono text-[0.84rem] tracking-[0.1em] text-muted">
              {sucursal.code}
              {sucursal.address ? ` · ${sucursal.address}` : ''}
            </p>
          </div>
          <LinkButton href={tenantHref(slug, 'panel/sucursales')} variant="ghost" size="sm" icon="layers" iconPosition="start">
            Todas las sucursales
          </LinkButton>
        </section>

        {!sucursal.isActive && (
          <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 px-4 py-3 text-[0.9rem] text-ink">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-structural" />
            Esta sede está desactivada: no acepta entradas nuevas ni aparece en la web. Su historial se conserva.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href={`${asistencia}?sucursal=${sucursal.id}&desde=${hoy}&hasta=${hoy}#historial`} etiqueta="Entradas hoy" valor={`${datos?.asistenciasHoy ?? 0}`} icono="calendar" tono="accion" comparacion={`${datos?.asistenciasSemana ?? 0} en 7 días`} accion="Ver las de hoy" />
          <StatCard href={`${asistencia}?sucursal=${sucursal.id}#historial`} etiqueta="Socios 30 días" valor={`${datos?.socios30d ?? 0}`} icono="group" comparacion="distintos que entrenaron aquí" accion="Ver historial" />
          <StatCard
            href={features.enableReports ? `${tenantHref(slug, 'panel/reportes/asistencia-por-sucursal')}?preset=30d` : '#actividad'}
            etiqueta="Peso en el gimnasio"
            valor={`${porcentaje(datos?.asistencias30d ?? 0, total30d).toLocaleString('es-BO')} %`}
            icono="chart"
            comparacion={`${datos?.asistencias30d ?? 0} de ${total30d} entradas en 30 días`}
            accion="Comparar sedes"
          />
          <StatCard href="#personal" etiqueta="Personal asignado" valor={`${datos?.usuariosAsignados ?? 0}`} icono="user" comparacion={globales.length > 0 ? `+ ${globales.length} con alcance global` : 'con acceso a esta sede'} accion="Asignar personal" />
        </div>

        <section id="actividad" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-actividad">
          <h2 id="titulo-actividad" className="t-h3">Entradas de los últimos 30 días</h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">Solo las registradas en {sucursal.name}. La barra de la derecha es hoy.</p>
          <BarChart titulo={`Entradas por día en ${sucursal.name}`} puntos={puntos} unidad="entradas" alto={170} className="mt-6" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-ultimas">
            <h2 id="titulo-ultimas" className="t-h3">Últimas entradas en esta sede</h2>
            <DataTable
              titulo={`Últimas entradas en ${sucursal.name}`}
              className="mt-5"
              columnas={[
                { clave: 'socio', titulo: 'Socio', celda: (fila) => <BotonFicha customerId={fila.customerId}>{fila.customerName}</BotonFicha> },
                { clave: 'fecha', titulo: 'Fecha', celda: (fila) => fechaCorta(fila.attendanceDate) },
                { clave: 'hora', titulo: 'Hora', celda: (fila) => hora(fila.checkedInAt) },
                { clave: 'metodo', titulo: 'Método', secundaria: true, celda: (fila) => NOMBRE_DE_METODO[fila.method] },
              ]}
              filas={ultimas}
              claveDeFila={(fila) => fila.id}
              vacio={<EmptyState icono="calendar" titulo="Todavía no hay entradas en esta sede" descripcion="Aparecerán en cuanto recepción registre entradas con esta sede de trabajo." />}
            />
          </section>

          <section className="surface-card flex flex-col gap-5 p-6 sm:p-7" aria-labelledby="titulo-estado">
            <h2 id="titulo-estado" className="t-h3">Estado</h2>
            <dl className="flex flex-col gap-2 text-[0.88rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Dirección</dt>
                <dd className="text-end text-ink">{sucursal.address ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Horario</dt>
                <dd className="text-end text-ink">{horario.length > 0 ? horario.map((l) => <span key={l} className="block">{l}</span>) : 'Sin horario propio'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Mapa</dt>
                <dd className="text-end">
                  {ubicacion ? (
                    <a href={ubicacion} target="_blank" rel="noopener noreferrer" className="text-action underline-offset-4 hover:underline">
                      Ver ubicación
                    </a>
                  ) : (
                    'Sin ubicación'
                  )}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2.5 border-t border-line pt-5">
              {sucursal.isActive && !sucursal.isPrimary && (
                <AccionConEstado accion={hacerSucursalPrincipal} campos={campos} etiqueta="Hacer principal" icono="star" />
              )}
              {sucursal.isActive ? (
                !sucursal.isPrimary && (
                  <AccionConEstado
                    accion={desactivarSucursal}
                    campos={campos}
                    etiqueta="Desactivar"
                    icono="archive"
                    variante="peligro"
                    confirmar={`¿Desactivar ${sucursal.name}? Dejará de aceptar entradas y saldrá de la web. Su historial se conserva.`}
                  />
                )
              ) : (
                <AccionConEstado accion={activarSucursal} campos={campos} etiqueta="Activar" icono="refresh" variante="primario" />
              )}
            </div>
            {sucursal.isPrimary && (
              <p className="text-[0.8rem] text-muted">
                Es la sede por defecto del gimnasio. Para desactivarla, primero haz principal a otra sede.
              </p>
            )}
          </section>
        </div>

        <section id="personal" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-personal">
          <h2 id="titulo-personal" className="t-h3">Personal de esta sede</h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            Quien está asignado puede registrar entradas aquí. {globales.length > 0 && `${globales.map((p) => p.fullName).join(', ')} opera${globales.length === 1 ? '' : 'n'} en todas las sedes por su rol.`}
          </p>
          <DataTable
            titulo={`Asignaciones de personal en ${sucursal.name}`}
            className="mt-5"
            columnas={[
              { clave: 'nombre', titulo: 'Persona', celda: (p) => <span className="font-medium text-ink">{p.fullName}</span> },
              {
                clave: 'rol',
                titulo: 'Rol',
                secundaria: true,
                celda: (p) =>
                  p.roles
                    .filter((r) => r !== 'customer')
                    .map((r) => (r in NOMBRE_DE_ROL ? NOMBRE_DE_ROL[r as CodigoDeRol] : r))
                    .join(', '),
              },
              {
                clave: 'estado',
                titulo: 'Acceso',
                celda: (p) => (p.sucursales.includes(sucursal.id) ? <Badge tone="action">Asignada</Badge> : <Badge tone="neutral">Sin acceso</Badge>),
              },
              {
                clave: 'accion',
                titulo: 'Acción',
                celda: (p) =>
                  p.sucursales.includes(sucursal.id) ? (
                    <AccionConEstado accion={retirarPersonal} campos={{ ...campos, appUserId: p.appUserId }} etiqueta="Retirar" icono="close" variante="peligro" confirmar={`¿Retirar a ${p.fullName} de ${sucursal.name}?`} />
                  ) : (
                    <AccionConEstado accion={asignarPersonal} campos={{ ...campos, appUserId: p.appUserId }} etiqueta="Asignar" icono="plus" />
                  ),
              },
            ]}
            filas={conAsignacion}
            claveDeFila={(p) => p.appUserId}
            vacio={<EmptyState icono="group" titulo="No hay personal que asignar" descripcion="Toda cuenta del personal que no tenga alcance global aparece aquí." />}
          />
        </section>

        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-editar">
          <h2 id="titulo-editar" className="t-h3">Datos de la sede</h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">Lo que se publica en la web: dirección, horario y ubicación.</p>
          <div className="mt-6">
            <SucursalForm slug={slug} sucursal={sucursal} />
          </div>
        </section>
      </div>
    </FichaDeSocioProvider>
  );
}
