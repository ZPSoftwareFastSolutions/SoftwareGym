/**
 * CAPA: Presentation / App — programas y rutinas (V3.2).
 *
 * Las plantillas del gimnasio y quién las está haciendo. Gerencia ve y edita
 * todo; el entrenador arma rutinas y asigna a SUS socios (lo acota la base, no
 * esta pantalla); recepción solo mira.
 *
 * Capacidad `enableRoutines` (apagada → 404) y permiso `routines.read`.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta } from '@/lib/formato';
import { nombreDeGrupoMuscular } from '@core/domain/operations/exercises';
import {
  NOMBRE_DE_NIVEL,
  NOMBRE_DE_OBJETIVO,
  type Programa,
  type Rutina,
  type RutinaAsignada,
} from '@core/domain/operations/training';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { membersRepository, trainersRepository, trainingRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { AsignarRutinaForm, ProgramaForm, RutinaForm, type OpcionDeSocioParaRutina } from '@/presentation/patterns/RutinaForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';
import { desactivarPrograma, finalizarRutinaAsignada } from './actions';

export const metadata: Metadata = { title: 'Rutinas', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function TarjetaDePrograma({
  programa,
  rutinas,
  slug,
  puedeGestionar,
}: {
  readonly programa: Programa;
  readonly rutinas: readonly Rutina[];
  readonly slug: string;
  readonly puedeGestionar: boolean;
}) {
  const base = tenantHref(slug, 'panel/rutinas');
  return (
    <article className="surface-card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1.05rem] font-semibold">{programa.name}</h3>
            {!programa.isActive && <Badge tone="structural">Archivado</Badge>}
          </div>
          <p className="mt-1 text-[0.8rem] text-muted">
            {NOMBRE_DE_OBJETIVO[programa.goal]} · {NOMBRE_DE_NIVEL[programa.level]}
            {programa.weeks ? ` · ${programa.weeks} semanas` : ''}
          </p>
        </div>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Modal
              titulo={`Editar «${programa.name}»`}
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="ghost" size="sm" icon="edit" iconPosition="start">
                  Editar
                </Button>
              }
            >
              <ProgramaForm slug={slug} programa={programa} />
            </Modal>
            {programa.isActive && (
              <AccionConEstado
                accion={desactivarPrograma}
                campos={{ tenantSlug: slug, programId: programa.id }}
                etiqueta="Archivar"
                icono="archive"
                variante="peligro"
                confirmar={`¿Archivar «${programa.name}»? Sus rutinas y lo ya asignado se conservan.`}
              />
            )}
          </div>
        )}
      </div>

      {programa.description && <p className="text-[0.86rem] leading-relaxed text-muted">{programa.description}</p>}

      {rutinas.length === 0 ? (
        <p className="text-[0.84rem] text-muted">Sin rutinas todavía. Agrega el Día A.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rutinas.map((r) => (
            <li key={r.id}>
              <Link
                href={`${base}/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--t-radius-md)] border border-line px-4 py-3 transition-colors hover:border-action"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium text-ink">
                    {r.dayLabel ? `${r.dayLabel} · ` : ''}
                    {r.name}
                  </span>
                  <span className="text-[0.78rem] text-muted">
                    {r.ejercicios} ejercicios
                    {r.grupos.length > 0 ? ` · ${r.grupos.map(nombreDeGrupoMuscular).join(', ')}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-[0.78rem] text-muted">
                  {r.asignaciones > 0 && <Badge tone="neutral">{r.asignaciones} asignada{r.asignaciones === 1 ? '' : 's'}</Badge>}
                  <Icon name="arrowRight" size={16} className="text-action" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default async function RutinasPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableRoutines']);
  const { slug } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verRutinas);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarRutinas);
  const puedeAsignar = tienePermiso(perfil, PERMISO.asignarRutinas);

  const entrenamiento = await trainingRepository();
  const [programas, rutinas, asignaciones, resumen, hoy] = await Promise.all([
    entrenamiento.programas(),
    entrenamiento.rutinas({}),
    entrenamiento.asignaciones({ vigentes: true }),
    entrenamiento.resumen(),
    repo.hoyDelGimnasio(slug),
  ]);

  // Gerencia asigna a cualquier socio; el entrenador, solo a los suyos (y la
  // base lo vuelve a exigir aunque esta lista trajera de más).
  let socios: readonly OpcionDeSocioParaRutina[] = [];
  if (puedeAsignar) {
    if (tienePermiso(perfil, PERMISO.verSocios)) {
      const fichas = await (await membersRepository()).listar({}, hoy);
      socios = fichas
        .filter((f) => !f.archivedAt)
        .map((f) => ({ id: f.id, etiqueta: `${f.code ?? '—'} · ${f.fullName}` }));
    } else {
      const mios = await (await trainersRepository()).misSocios();
      socios = mios.map((s) => ({ id: s.customerId, etiqueta: `${s.customerCode ?? '—'} · ${s.fullName}` }));
    }
  }

  const activas = rutinas.filter((r) => r.isActive);
  const sueltas = rutinas.filter((r) => !r.programId);
  const sociosConRutina = new Set(asignaciones.map((a) => a.customerId)).size;
  const sinEjercicios = activas.filter((r) => r.ejercicios === 0).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Rutinas</h2>
          <p className="mt-1.5 max-w-[64ch] text-[0.88rem] leading-relaxed text-muted">
            Un programa agrupa rutinas (Día A, Día B…) y cada rutina lista ejercicios con series, repeticiones y descanso. Al asignarla a un socio se copia: ajustarla para él no toca la plantilla.
          </p>
        </div>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Modal
              titulo="Nuevo programa"
              descripcion="Una plantilla por objetivo. Después le agregas las rutinas de cada día."
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="primary" size="md" icon="plus" iconPosition="start">
                  Nuevo programa
                </Button>
              }
            >
              <ProgramaForm slug={slug} />
            </Modal>
            <Modal
              titulo="Nueva rutina"
              descripcion="Puede pertenecer a un programa o ir suelta."
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="secondary" size="md" icon="plus" iconPosition="start">
                  Nueva rutina
                </Button>
              }
            >
              <RutinaForm slug={slug} programas={programas.filter((p) => p.isActive)} />
            </Modal>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="#programas" etiqueta="Programas activos" valor={`${programas.filter((p) => p.isActive).length}`} icono="layers" tono="accion" comparacion={`${activas.length} rutinas`} accion="Ver programas" />
        <StatCard href="#asignadas" etiqueta="Socios con rutina" valor={`${sociosConRutina}`} icono="group" comparacion={`${asignaciones.length} rutinas asignadas`} accion="Ver asignadas" />
        <StatCard
          href="#asignadas"
          etiqueta="Registros esta semana"
          valor={`${resumen?.completados7d ?? asignaciones.reduce((s, a) => s + a.completados7d, 0)}`}
          icono="fire"
          comparacion="ejercicios marcados como hechos"
          accion="Ver actividad"
        />
        <StatCard
          href="#programas"
          etiqueta="Rutinas sin ejercicios"
          valor={`${sinEjercicios}`}
          icono="alert"
          tono={sinEjercicios > 0 ? 'alerta' : 'neutro'}
          comparacion={sinEjercicios > 0 ? 'no se pueden asignar así' : 'todas listas para asignar'}
          subirEsMalo
          accion="Revisar"
        />
      </div>

      <section id="programas" className="scroll-mt-28" aria-labelledby="titulo-programas">
        <h2 id="titulo-programas" className="sr-only">Programas</h2>
        {programas.length === 0 && sueltas.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icono="layers"
              titulo="Todavía no hay programas ni rutinas"
              descripcion={puedeGestionar ? 'Crea un programa («Full Body 3 días») y agrégale una rutina por día.' : 'Gerencia todavía no cargó las plantillas.'}
            />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {programas.map((p) => (
              <TarjetaDePrograma key={p.id} programa={p} rutinas={rutinas.filter((r) => r.programId === p.id)} slug={slug} puedeGestionar={puedeGestionar} />
            ))}
            {sueltas.length > 0 && (
              <article className="surface-card flex flex-col gap-4 p-6">
                <h3 className="text-[1.05rem] font-semibold">Rutinas sueltas</h3>
                <p className="text-[0.84rem] text-muted">No pertenecen a ningún programa.</p>
                <ul className="flex flex-col gap-2">
                  {sueltas.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`${tenantHref(slug, 'panel/rutinas')}/${r.id}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--t-radius-md)] border border-line px-4 py-3 transition-colors hover:border-action"
                      >
                        <span className="flex flex-col">
                          <span className="font-medium text-ink">{r.name}</span>
                          <span className="text-[0.78rem] text-muted">{r.ejercicios} ejercicios</span>
                        </span>
                        <Icon name="arrowRight" size={16} className="text-action" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </div>
        )}
      </section>

      <section id="asignadas" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-asignadas">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-asignadas" className="t-h3">Rutinas asignadas</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">Quién está haciendo qué, y cuánto marcó en la última semana.</p>
          </div>
          {puedeAsignar && socios.length > 0 && (
            <Modal
              titulo="Asignar rutina"
              descripcion="Se copia la rutina al socio; después puedes ajustarla solo para él."
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="primary" size="sm" icon="plus" iconPosition="start">
                  Asignar rutina
                </Button>
              }
            >
              <AsignarRutinaForm slug={slug} socios={socios} rutinas={activas.filter((r) => r.ejercicios > 0)} />
            </Modal>
          )}
        </div>

        <DataTable<RutinaAsignada>
          titulo="Rutinas asignadas vigentes"
          className="mt-5"
          columnas={[
            {
              clave: 'socio',
              titulo: 'Socio',
              celda: (a) => (
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{a.customerName}</span>
                  <span className="text-[0.76rem] text-muted">{a.customerCode ?? ''}</span>
                </span>
              ),
            },
            {
              clave: 'rutina',
              titulo: 'Rutina',
              celda: (a) => (
                <span className="flex flex-col">
                  <span>{a.name}</span>
                  {a.programName && <span className="text-[0.76rem] text-muted">{a.programName}</span>}
                </span>
              ),
            },
            { clave: 'ejercicios', titulo: 'Ejercicios', numerica: true, celda: (a) => `${a.ejercicios}` },
            {
              clave: 'actividad',
              titulo: 'Última semana',
              celda: (a) => (
                <span className="flex flex-col">
                  <span>{a.completados7d} registros</span>
                  <span className="text-[0.76rem] text-muted">{a.ultimoRegistro ? `último: ${fechaCorta(a.ultimoRegistro)}` : 'sin registros'}</span>
                </span>
              ),
            },
            { clave: 'desde', titulo: 'Desde', secundaria: true, celda: (a) => fechaCorta(a.startsOn) },
            {
              clave: 'accion',
              titulo: 'Acción',
              celda: (a) =>
                puedeAsignar ? (
                  <AccionConEstado
                    accion={finalizarRutinaAsignada}
                    campos={{ tenantSlug: slug, asignacionId: a.id }}
                    etiqueta="Finalizar"
                    icono="close"
                    variante="peligro"
                    confirmar={`¿Finalizar la rutina «${a.name}» de ${a.customerName}? El historial de entrenamientos se conserva.`}
                  />
                ) : null,
            },
          ]}
          filas={asignaciones}
          claveDeFila={(a) => a.id}
          vacio={
            <EmptyState
              icono="group"
              titulo="Ninguna rutina asignada todavía"
              descripcion={puedeAsignar ? 'Asigna una rutina a un socio para que la vea en su panel y pueda marcar lo que hace.' : undefined}
            />
          }
        />
      </section>
    </div>
  );
}
