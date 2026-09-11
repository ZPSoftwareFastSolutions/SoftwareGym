/**
 * CAPA: Presentation / App — un entrenador (V3.1).
 *
 * Sus socios (según el plan de cada uno), sus ausencias, su cuenta, sus sedes
 * y sus datos. Desactivar no borra: el entrenador pierde el acceso a sus
 * socios y sus asignaciones siguen a la vista para reasignarlas.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta, horaEnZona, hoyEnZona } from '@/lib/formato';
import {
  ausenciasPendientes,
  describirAusencia,
  disponibilidadEn,
  NOMBRE_DE_ESTADO_DEL_ASIGNADO,
  NOMBRE_DE_TIPO_DE_ASIGNACION,
  NOMBRE_DE_TIPO_DE_AUSENCIA,
  resumenDeReglaDePlan,
  turnosDelGimnasio,
} from '@core/domain/operations/trainers';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { branchesRepository, membersRepository, trainersRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import {
  AsignarSocioForm,
  AusenciaForm,
  EntrenadorForm,
  SucursalesDeEntrenadorForm,
  VincularCuentaForm,
  type OpcionDeSocio,
} from '@/presentation/patterns/EntrenadorForms';
import { BotonFicha, FichaDeSocioProvider } from '@/presentation/patterns/FichaDeSocio';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../../_datos';
import {
  activarEntrenador,
  desactivarEntrenador,
  desvincularCuentaDeEntrenador,
  eliminarAusencia,
  finalizarAsignacion,
} from '../actions';

export const metadata: Metadata = { title: 'Entrenador', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface EntrenadorPageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

export default async function EntrenadorPage({ params }: EntrenadorPageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableTrainers']);
  const { slug, features } = tenant;
  const { perfil } = await exigirPermiso(slug, PERMISO.verEntrenadores);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarEntrenadores);

  const repo = await trainersRepository();
  const entrenador = await repo.porId(id);
  // Inexistente o de otro gimnasio (RLS no lo devuelve): la misma respuesta.
  if (!entrenador) notFound();

  const zona = tenant.hours.timezone;
  const hoy = hoyEnZona(zona);
  const ahora = horaEnZona(zona);
  const turnos = turnosDelGimnasio(tenant.hours.staffShifts);
  const puedeAsignar = puedeGestionar && entrenador.isActive && tienePermiso(perfil, PERMISO.verSocios);

  const [asignaciones, ausencias, sedes, socios, reglas] = await Promise.all([
    repo.asignaciones({ trainerId: id }),
    repo.ausencias(id),
    (await branchesRepository()).listar(),
    puedeAsignar ? (await membersRepository()).listar({}, hoy) : Promise.resolve([]),
    puedeAsignar ? repo.reglasDePlanes() : Promise.resolve([]),
  ]);

  const vigentes = asignaciones.filter((a) => !a.endedOn);
  const historicas = asignaciones.filter((a) => a.endedOn);
  const pendientes = ausenciasPendientes(ausencias, hoy, ahora);
  const disponibilidad = disponibilidadEn(ausencias, hoy, ahora);
  const nombreDeSede = new Map(sedes.map((s) => [s.id, s.name]));

  const reglaPorPlan = new Map(reglas.map((r) => [r.planId, r]));
  const yaAsignados = new Set(vigentes.map((a) => a.customerId));
  const opciones: OpcionDeSocio[] = socios
    .filter((s) => !s.archivedAt && !yaAsignados.has(s.id))
    .map((s) => {
      const vigente = (s.membershipStatus === 'active' || s.membershipStatus === 'expiring_soon') && s.planId;
      const regla = vigente && s.planId ? reglaPorPlan.get(s.planId) : undefined;
      return {
        id: s.id,
        etiqueta: `${s.code ?? '—'} · ${s.fullName}${s.planName ? ` · ${s.planName}` : ''}`,
        regla: regla ? resumenDeReglaDePlan(regla) : null,
      };
    });

  const campos = { tenantSlug: slug, trainerId: entrenador.id };

  return (
    <FichaDeSocioProvider slug={slug} rutaDeFicha={features.enableMemberManagement ? tenantHref(slug, 'panel/socios') : undefined}>
      <div className="flex flex-col gap-6">
        <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
          <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
            <Icon name="trainer" size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="t-h3">{entrenador.fullName}</h2>
              <Badge tone={entrenador.isActive ? 'neutral' : 'structural'}>{entrenador.isActive ? 'Activo' : 'Inactivo'}</Badge>
              {entrenador.appUserId && <Badge tone="neutral">Con cuenta</Badge>}
            </div>
            <p className="mt-1 text-[0.86rem] text-muted">
              {entrenador.specialties.length > 0 ? entrenador.specialties.join(' · ') : 'Sin especialidades cargadas'}
            </p>
          </div>
          <LinkButton href={tenantHref(slug, 'panel/entrenadores')} variant="ghost" size="sm" icon="group" iconPosition="start">
            Todo el equipo
          </LinkButton>
        </section>

        {!entrenador.isActive && (
          <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 px-4 py-3 text-[0.9rem] text-ink">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-structural" />
            Este entrenador está inactivo: no recibe socios nuevos y su cuenta no ve a nadie. Sus asignaciones vigentes siguen abajo para reasignarlas.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href="#socios" etiqueta="Socios principales" valor={`${entrenador.principales}`} icono="user" tono="accion" comparacion={`${entrenador.secundarios} como secundario`} accion="Ver socios" />
          <StatCard
            href="#ausencias"
            etiqueta="Ahora"
            valor={disponibilidad.estado === 'ausente' ? 'Ausente' : 'Disponible'}
            icono="clock"
            tono={disponibilidad.estado === 'disponible' ? 'neutro' : 'alerta'}
            comparacion={
              disponibilidad.estado === 'disponible'
                ? 'sin ausencias hoy'
                : `${NOMBRE_DE_TIPO_DE_AUSENCIA[disponibilidad.ausencia.kind]} · ${describirAusencia(disponibilidad.ausencia, turnos)}`
            }
            accion="Ver ausencias"
          />
          <StatCard href="#ausencias" etiqueta="Ausencias pendientes" valor={`${pendientes.length}`} icono="calendar" comparacion={pendientes[0] ? `la próxima: ${fechaCorta(pendientes[0].startDate)}` : 'ninguna programada'} accion="Registrar ausencia" />
          <StatCard href="#sedes" etiqueta="Sedes" valor={`${entrenador.branchIds.length}`} icono="pin" comparacion={entrenador.branchIds.map((b) => nombreDeSede.get(b) ?? 'Sede').join(', ') || 'sin sede asignada'} accion="Cambiar sedes" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section id="socios" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-socios">
            <h2 id="titulo-socios" className="t-h3">Socios asignados</h2>
            <DataTable
              titulo={`Socios asignados a ${entrenador.fullName}`}
              className="mt-5"
              columnas={[
                {
                  clave: 'socio',
                  titulo: 'Socio',
                  celda: (a) => (
                    <span className="flex flex-col">
                      <BotonFicha customerId={a.customerId}>{a.customerName}</BotonFicha>
                      <span className="text-[0.76rem] text-muted">{a.customerCode ?? ''}</span>
                    </span>
                  ),
                },
                {
                  clave: 'tipo',
                  titulo: 'Tipo',
                  celda: (a) => (
                    <span className="flex flex-col">
                      <span>{NOMBRE_DE_TIPO_DE_ASIGNACION[a.kind]}</span>
                      {a.focus && <span className="text-[0.76rem] text-muted">{a.focus}</span>}
                    </span>
                  ),
                },
                {
                  clave: 'plan',
                  titulo: 'Membresía',
                  secundaria: true,
                  celda: (a) => (
                    <span className="flex flex-col">
                      <span>{a.planName ?? '—'}</span>
                      <Badge tone={a.membershipStatus === 'vigente' ? 'neutral' : 'structural'} className="mt-1 w-fit">
                        {NOMBRE_DE_ESTADO_DEL_ASIGNADO[a.membershipStatus]}
                        {a.membershipEnd ? ` · ${fechaCorta(a.membershipEnd)}` : ''}
                      </Badge>
                    </span>
                  ),
                },
                { clave: 'desde', titulo: 'Desde', secundaria: true, celda: (a) => fechaCorta(a.startsOn) },
                {
                  clave: 'accion',
                  titulo: 'Acción',
                  celda: (a) =>
                    puedeGestionar ? (
                      <AccionConEstado
                        accion={finalizarAsignacion}
                        campos={{ ...campos, asignacionId: a.id }}
                        etiqueta="Finalizar"
                        icono="close"
                        variante="peligro"
                        confirmar={`¿Finalizar la asignación de ${a.customerName}? Queda en el historial.`}
                      />
                    ) : null,
                },
              ]}
              filas={vigentes}
              claveDeFila={(a) => a.id}
              vacio={<EmptyState icono="group" titulo="Sin socios asignados" descripcion="Asigna socios cuyo plan incluya entrenador." />}
            />
            {historicas.length > 0 && (
              <details className="mt-5 text-[0.86rem]">
                <summary className="cursor-pointer text-muted hover:text-ink">Historial ({historicas.length} asignaciones finalizadas)</summary>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {historicas.map((a) => (
                    <li key={a.id} className="text-muted">
                      {a.customerName} · {NOMBRE_DE_TIPO_DE_ASIGNACION[a.kind].toLowerCase()} · {fechaCorta(a.startsOn)} → {fechaCorta(a.endedOn)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {puedeAsignar ? (
            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-asignar">
              <h2 id="titulo-asignar" className="t-h3">Asignar socio</h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">Solo socios con membresía vigente cuyo plan incluya entrenador.</p>
              <div className="mt-5">
                <AsignarSocioForm slug={slug} trainerId={entrenador.id} socios={opciones} />
              </div>
            </section>
          ) : (
            <section className="surface-card p-6 sm:p-7">
              <EmptyState icono="lock" titulo={entrenador.isActive ? 'Solo gerencia asigna socios' : 'Activa al entrenador para asignarle socios'} />
            </section>
          )}
        </div>

        <section id="ausencias" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-ausencias">
          <h2 id="titulo-ausencias" className="t-h3">No disponibilidad</h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">Horas, turnos, días o periodos en los que no atiende. En la hora del gimnasio. No es una agenda.</p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <DataTable
              titulo={`Ausencias pendientes de ${entrenador.fullName}`}
              columnas={[
                {
                  clave: 'fecha',
                  titulo: 'Cuándo',
                  celda: (a) => (a.startDate === a.endDate ? fechaCorta(a.startDate) : `${fechaCorta(a.startDate)} → ${fechaCorta(a.endDate)}`),
                },
                { clave: 'detalle', titulo: 'Detalle', celda: (a) => describirAusencia(a, turnos) },
                { clave: 'motivo', titulo: 'Motivo', secundaria: true, celda: (a) => a.reason ?? '—' },
                {
                  clave: 'accion',
                  titulo: '',
                  celda: (a) =>
                    puedeGestionar ? (
                      <AccionConEstado accion={eliminarAusencia} campos={{ ...campos, ausenciaId: a.id }} etiqueta="Quitar" icono="close" variante="peligro" confirmar="¿Quitar esta ausencia?" />
                    ) : null,
                },
              ]}
              filas={pendientes}
              claveDeFila={(a) => a.id}
              vacio={<EmptyState icono="calendar" titulo="Sin ausencias programadas" />}
            />
            {puedeGestionar && <AusenciaForm slug={slug} trainerId={entrenador.id} turnos={turnos} hoy={hoy} />}
          </div>
        </section>

        {puedeGestionar && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-cuenta">
              <h2 id="titulo-cuenta" className="t-h3">Cuenta de acceso</h2>
              {entrenador.appUserId ? (
                <div className="mt-4 flex flex-col gap-4">
                  <p className="text-[0.9rem] text-ink">
                    Vinculada a <strong className="font-semibold">{entrenador.accountEmail ?? 'una cuenta'}</strong>. Al entrar ve su perfil y sus socios asignados; nada más.
                  </p>
                  <AccionConEstado
                    accion={desvincularCuentaDeEntrenador}
                    campos={campos}
                    etiqueta="Desvincular cuenta"
                    icono="lock"
                    variante="peligro"
                    confirmar="¿Desvincular la cuenta? Deja de ver a sus socios en cuanto recargue. El perfil se conserva."
                    className="w-fit"
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <VincularCuentaForm slug={slug} trainerId={entrenador.id} correoSugerido={entrenador.email} />
                </div>
              )}
            </section>

            <section id="sedes" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-sedes">
              <h2 id="titulo-sedes" className="t-h3">Sedes donde trabaja</h2>
              <div className="mt-4">
                <SucursalesDeEntrenadorForm
                  slug={slug}
                  trainerId={entrenador.id}
                  sucursales={sedes.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive }))}
                  seleccionadas={entrenador.branchIds}
                />
              </div>
              <div className="mt-6 border-t border-line pt-5">
                {entrenador.isActive ? (
                  <AccionConEstado
                    accion={desactivarEntrenador}
                    campos={campos}
                    etiqueta="Desactivar entrenador"
                    icono="archive"
                    variante="peligro"
                    confirmar={`¿Desactivar a ${entrenador.fullName}? Pierde el acceso a sus socios y no recibe asignaciones nuevas.`}
                    className="w-fit"
                  />
                ) : (
                  <AccionConEstado accion={activarEntrenador} campos={campos} etiqueta="Activar entrenador" icono="refresh" variante="primario" className="w-fit" />
                )}
              </div>
            </section>
          </div>
        )}

        {puedeGestionar && (
          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-datos">
            <h2 id="titulo-datos" className="t-h3">Datos del entrenador</h2>
            <div className="mt-6">
              <EntrenadorForm slug={slug} entrenador={entrenador} />
            </div>
          </section>
        )}
      </div>
    </FichaDeSocioProvider>
  );
}
