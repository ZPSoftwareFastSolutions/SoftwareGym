/**
 * CAPA: Presentation / App — espacio de trabajo del entrenador (V3.1).
 *
 * Lo que un entrenador con cuenta ve al entrar: su perfil y SUS socios
 * asignados (código, nombre, plan y vigencia). Nada de pagos, documento,
 * teléfono ni el resto de socios: la lista sale de una función de la base que
 * solo devuelve esas columnas y solo de sus asignaciones vigentes.
 *
 * Rutinas y seguimiento llegan en V3.2; aquí no se adelantan.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta, horaEnZona, hoyEnZona } from '@/lib/formato';
import {
  ausenciasPendientes,
  describirAusencia,
  diasEntre,
  NOMBRE_DE_ESTADO_DEL_ASIGNADO,
  NOMBRE_DE_TIPO_DE_ASIGNACION,
  turnosDelGimnasio,
} from '@core/domain/operations/trainers';
import { PERMISO } from '@core/domain/operations/workspace';
import { branchesRepository, trainersRepository, trainingRepository } from '@infra/config/composition-root';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = { title: 'Mis socios', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EspacioDelEntrenadorPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableTrainers']);
  const { slug } = tenant;
  const { perfil } = await exigirPermiso(slug, PERMISO.trabajarComoEntrenador);

  const repo = await trainersRepository();
  const [yo, socios, sedes] = await Promise.all([repo.porCuenta(perfil.appUserId), repo.misSocios(), (await branchesRepository()).listar()]);

  if (!yo || !yo.isActive) {
    return (
      <section className="surface-card">
        <EmptyState
          icono="lock"
          titulo={yo ? 'Tu perfil de entrenador está inactivo' : 'Tu cuenta no está vinculada a un perfil de entrenador'}
          descripcion="Habla con gerencia del gimnasio."
        />
      </section>
    );
  }

  // Las rutinas de SUS socios: RLS le deja ver las del gimnasio, así que se
  // acota a su gente, que es lo que viene a mirar aquí.
  const rutinas = tenant.features.enableRoutines
    ? (await (await trainingRepository()).asignaciones({ vigentes: true })).filter((r) => socios.some((s) => s.customerId === r.customerId))
    : [];

  const zona = tenant.hours.timezone;
  const hoy = hoyEnZona(zona);
  const ausencias = ausenciasPendientes(await repo.ausencias(yo.id), hoy, horaEnZona(zona));
  const turnos = turnosDelGimnasio(tenant.hours.staffShifts);
  const nombreDeSede = new Map(sedes.map((s) => [s.id, s.name]));
  const principales = socios.filter((s) => s.kind === 'principal').length;
  const porVencer = socios.filter((s) => s.membershipStatus === 'vigente' && s.membershipEnd && diasEntre(hoy, s.membershipEnd) <= 7).length;
  const sinVigencia = socios.filter((s) => s.membershipStatus !== 'vigente').length;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
          <Icon name="trainer" size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="t-h3">{yo.fullName}</h2>
          <p className="mt-1 text-[0.86rem] text-muted">
            {[yo.specialties.join(' · '), yo.branchIds.map((b) => nombreDeSede.get(b) ?? 'Sede').join(', ')].filter(Boolean).join(' — ') || tenant.name}
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="#socios" etiqueta="Socios a tu cargo" valor={`${socios.length}`} icono="group" tono="accion" comparacion={`${principales} como principal`} accion="Ver lista" />
        <StatCard href="#socios" etiqueta="Por vencer" valor={`${porVencer}`} icono="clock" tono={porVencer > 0 ? 'alerta' : 'neutro'} comparacion="membresía en 7 días o menos" accion="Ver quiénes" />
        <StatCard href="#socios" etiqueta="Sin membresía vigente" valor={`${sinVigencia}`} icono="alert" tono={sinVigencia > 0 ? 'alerta' : 'neutro'} comparacion="avísales en recepción" subirEsMalo accion="Ver quiénes" />
        <StatCard
          href="#ausencias"
          etiqueta="Tus ausencias"
          valor={`${ausencias.length}`}
          icono="calendar"
          comparacion={ausencias[0] ? `la próxima: ${fechaCorta(ausencias[0].startDate)}` : 'ninguna programada'}
          accion="Ver fechas"
        />
      </div>

      <section id="socios" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-mis-socios">
        <h2 id="titulo-mis-socios" className="t-h3">Tus socios</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">Los asigna gerencia según el plan de cada socio.</p>
        <DataTable
          titulo="Socios asignados a tu cargo"
          className="mt-5"
          columnas={[
            {
              clave: 'socio',
              titulo: 'Socio',
              celda: (s) => (
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{s.fullName}</span>
                  <span className="text-[0.76rem] text-muted">{s.customerCode ?? ''}</span>
                </span>
              ),
            },
            {
              clave: 'tipo',
              titulo: 'Tipo',
              celda: (s) => (
                <span className="flex flex-col">
                  <span>{NOMBRE_DE_TIPO_DE_ASIGNACION[s.kind]}</span>
                  {s.focus && <span className="text-[0.76rem] text-muted">{s.focus}</span>}
                </span>
              ),
            },
            { clave: 'plan', titulo: 'Plan', secundaria: true, celda: (s) => s.planName ?? '—' },
            {
              clave: 'estado',
              titulo: 'Membresía',
              celda: (s) => (
                <Badge tone={s.membershipStatus === 'vigente' ? 'neutral' : 'structural'}>
                  {NOMBRE_DE_ESTADO_DEL_ASIGNADO[s.membershipStatus]}
                  {s.membershipEnd ? ` · ${fechaCorta(s.membershipEnd)}` : ''}
                </Badge>
              ),
            },
            { clave: 'desde', titulo: 'Desde', secundaria: true, celda: (s) => fechaCorta(s.startsOn) },
          ]}
          filas={socios}
          claveDeFila={(s) => s.assignmentId}
          vacio={<EmptyState icono="group" titulo="Todavía no tienes socios asignados" descripcion="Cuando gerencia te asigne socios, aparecerán aquí." />}
        />
      </section>

      {tenant.features.enableRoutines && (
        <section id="rutinas" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-rutinas-de-mis-socios">
          <h2 id="titulo-rutinas-de-mis-socios" className="t-h3">Rutinas de tus socios</h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            Entra a una para ajustarla o marcar lo que hizo el socio. Cada rutina es una copia suya: lo que cambies no toca la plantilla.
          </p>
          <DataTable
            titulo="Rutinas vigentes de tus socios"
            className="mt-5"
            columnas={[
              {
                clave: 'socio',
                titulo: 'Socio',
                celda: (r) => (
                  <span className="flex flex-col">
                    <span className="font-medium text-ink">{r.customerName}</span>
                    <span className="text-[0.76rem] text-muted">{r.customerCode ?? ''}</span>
                  </span>
                ),
              },
              {
                clave: 'rutina',
                titulo: 'Rutina',
                celda: (r) => (
                  <span className="flex flex-col">
                    <span>
                      {r.dayLabel ? `${r.dayLabel} · ` : ''}
                      {r.name}
                    </span>
                    <span className="text-[0.76rem] text-muted">{r.ejercicios} ejercicios</span>
                  </span>
                ),
              },
              {
                clave: 'semana',
                titulo: 'Esta semana',
                celda: (r) => (
                  <span className="flex flex-col">
                    <span>{r.completados7d} registros</span>
                    <span className="text-[0.76rem] text-muted">
                      {r.ultimoRegistro ? `último: ${fechaCorta(r.ultimoRegistro)}` : 'sin registros'}
                    </span>
                  </span>
                ),
              },
              {
                clave: 'accion',
                titulo: '',
                celda: (r) => (
                  <LinkButton href={`${tenantHref(slug, 'panel/rutinas/asignada')}/${r.id}`} variant="secondary" size="sm" icon="edit" iconPosition="start">
                    Ver y marcar
                  </LinkButton>
                ),
              },
            ]}
            filas={rutinas}
            claveDeFila={(r) => r.id}
            vacio={<EmptyState icono="layers" titulo="Tus socios todavía no tienen rutina" descripcion="Arma una rutina y asígnasela desde «Rutinas»." />}
          />
        </section>
      )}

      <section id="ausencias" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-mis-ausencias">
        <h2 id="titulo-mis-ausencias" className="t-h3">Tus ausencias registradas</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">Las registra gerencia. Si falta alguna o hay un error, avísale.</p>
        <DataTable
          titulo="Tus ausencias pendientes"
          className="mt-5"
          columnas={[
            { clave: 'fecha', titulo: 'Cuándo', celda: (a) => (a.startDate === a.endDate ? fechaCorta(a.startDate) : `${fechaCorta(a.startDate)} → ${fechaCorta(a.endDate)}`) },
            { clave: 'detalle', titulo: 'Detalle', celda: (a) => describirAusencia(a, turnos) },
            { clave: 'motivo', titulo: 'Motivo', secundaria: true, celda: (a) => a.reason ?? '—' },
          ]}
          filas={ausencias}
          claveDeFila={(a) => a.id}
          vacio={<EmptyState icono="calendar" titulo="Sin ausencias programadas" />}
        />
      </section>
    </div>
  );
}
