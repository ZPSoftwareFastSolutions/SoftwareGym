/**
 * CAPA: Presentation / App — la rutina de un socio (V3.2).
 *
 * La misma pantalla la abren tres personas distintas y cada una ve lo que le
 * toca, porque quien filtra es RLS: el SOCIO (su rutina, para marcar lo que
 * hace), su ENTRENADOR (para ajustarla y marcar por él) y GERENCIA. Si alguien
 * pide el id de la rutina de otro, la consulta vuelve vacía y esto responde 404.
 *
 * Marcar es lo que alimenta las métricas de `/panel/entrenamiento`.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta } from '@/lib/formato';
import { nombreDeGrupoMuscular } from '@core/domain/operations/exercises';
import { describirSerie, type EjercicioAsignado } from '@core/domain/operations/training';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { exercisesRepository, trainingRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { EjercicioDeRutinaForm, MarcarEjercicio } from '@/presentation/patterns/RutinaForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPerfil } from '../../../_datos';
import { finalizarRutinaAsignada, quitarEjercicioAsignado } from '../../actions';

export const metadata: Metadata = { title: 'Rutina del socio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface RutinaAsignadaPageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

export default async function RutinaAsignadaPage({ params }: RutinaAsignadaPageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableRoutines']);
  const { slug } = tenant;
  const { perfil, repo } = await exigirPerfil(slug);

  const entrenamiento = await trainingRepository();
  const asignacion = await entrenamiento.asignacion(id);
  if (!asignacion) notFound();

  const hoy = await repo.hoyDelGimnasio(slug);
  const esMia = perfil.customerId === asignacion.customerId;
  const puedeAjustar = tienePermiso(perfil, PERMISO.asignarRutinas);
  const puedeMarcar = esMia || tienePermiso(perfil, PERMISO.registrarEntrenamiento);

  const [ejercicios, catalogo] = await Promise.all([
    entrenamiento.ejerciciosAsignados(id, hoy),
    puedeAjustar && tenant.features.enableExercises && tienePermiso(perfil, PERMISO.verEjercicios)
      ? (await exercisesRepository()).listar({ estado: 'activos' })
      : Promise.resolve([]),
  ]);

  const hechosHoy = ejercicios.filter((e) => e.completadoHoy).length;
  const registros30d = ejercicios.reduce((suma, e) => suma + e.vecesUltimos30, 0);
  const ultima = ejercicios.reduce<string | null>((mayor, e) => (e.ultimaVez && (!mayor || e.ultimaVez > mayor) ? e.ultimaVez : mayor), null);
  const opcionesDeCatalogo = catalogo.map((e) => ({ id: e.id, nombre: e.name, grupo: nombreDeGrupoMuscular(e.muscleGroup) }));
  const volver = esMia ? tenantHref(slug, 'panel/socio') : tenantHref(slug, 'panel/rutinas');

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
          <Icon name="dumbbell" size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-h3">
              {asignacion.dayLabel ? `${asignacion.dayLabel} · ` : ''}
              {asignacion.name}
            </h2>
            {asignacion.endedOn ? <Badge tone="structural">Finalizada</Badge> : <Badge tone="action">Vigente</Badge>}
          </div>
          <p className="mt-1 text-[0.86rem] text-muted">
            {esMia ? 'Tu rutina' : asignacion.customerName}
            {asignacion.programName ? ` · ${asignacion.programName}` : ''} · desde {fechaCorta(asignacion.startsOn)}
            {asignacion.trainerName ? ` · ${asignacion.trainerName}` : ''}
          </p>
        </div>
        <LinkButton href={volver} variant="ghost" size="sm" icon="arrowRight" iconPosition="start">
          Volver
        </LinkButton>
      </section>

      {asignacion.notes && (
        <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 px-4 py-3 text-[0.9rem] text-ink">
          <Icon name="quote" size={17} className="mt-0.5 shrink-0 text-action" />
          {asignacion.notes}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard etiqueta="Ejercicios de hoy" valor={`${hechosHoy} de ${ejercicios.length}`} icono="check" tono={hechosHoy > 0 ? 'accion' : 'neutro'} comparacion="marcados hoy" />
        <StatCard etiqueta="Registros (30 días)" valor={`${registros30d}`} icono="fire" comparacion="ejercicios marcados" />
        <StatCard etiqueta="Última vez" valor={ultima ? fechaCorta(ultima) : '—'} icono="calendar" comparacion={ultima ? 'último registro' : 'sin registros todavía'} />
        <StatCard etiqueta="Esta semana" valor={`${asignacion.completados7d}`} icono="chart" comparacion="ejercicios en 7 días" />
      </div>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-ejercicios-asignados">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-ejercicios-asignados" className="t-h3">Ejercicios</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">
              {puedeMarcar
                ? 'Marca cada ejercicio al terminarlo. Una marca por ejercicio y día.'
                : 'Solo el socio y su entrenador pueden marcar los ejercicios.'}
            </p>
          </div>
          {puedeAjustar && !asignacion.endedOn && (
            <AccionConEstado
              accion={finalizarRutinaAsignada}
              campos={{ tenantSlug: slug, asignacionId: asignacion.id }}
              etiqueta="Finalizar rutina"
              icono="close"
              variante="peligro"
              confirmar={`¿Finalizar esta rutina de ${asignacion.customerName}? El historial se conserva.`}
            />
          )}
        </div>

        {ejercicios.length === 0 ? (
          <EmptyState className="mt-6" icono="dumbbell" titulo="Esta rutina no tiene ejercicios" />
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {ejercicios.map((e: EjercicioAsignado) => (
              <li
                key={e.id}
                className={
                  e.completadoHoy
                    ? 'flex flex-wrap items-start justify-between gap-4 rounded-[var(--t-radius-md)] border border-action/40 bg-action/5 p-4'
                    : 'flex flex-wrap items-start justify-between gap-4 rounded-[var(--t-radius-md)] border border-line p-4'
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[0.78rem] font-semibold text-muted">{e.position}.</span>
                    <span className="font-semibold text-ink">{e.exerciseName}</span>
                    <Badge tone="neutral">{nombreDeGrupoMuscular(e.muscleGroup)}</Badge>
                  </div>
                  <p className="mt-1 text-[0.88rem] text-ink">{describirSerie(e)}</p>
                  {e.notes && <p className="mt-1 text-[0.82rem] text-muted">{e.notes}</p>}
                  <p className="mt-1 text-[0.78rem] text-muted">
                    {e.vecesUltimos30} veces en 30 días{e.ultimaVez ? ` · última: ${fechaCorta(e.ultimaVez)}` : ' · sin registros'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {puedeMarcar && !asignacion.endedOn && (
                    <MarcarEjercicio slug={slug} itemId={e.id} completadoHoy={e.completadoHoy} seriesSugeridas={e.sets} pesoSugerido={e.weightKg} />
                  )}
                  {puedeAjustar && (
                    <div className="flex flex-wrap gap-2">
                      <Modal
                        titulo={`Ajustar «${e.exerciseName}» para ${asignacion.customerName}`}
                        descripcion="Solo cambia la copia de este socio; la plantilla queda igual."
                        anchoMaximo="lg"
                        montarSoloAbierto
                        disparador={
                          <Button variant="ghost" size="sm" icon="edit" iconPosition="start">
                            Ajustar
                          </Button>
                        }
                      >
                        <EjercicioDeRutinaForm slug={slug} itemId={e.id} destino="socio" catalogo={opcionesDeCatalogo} ejercicio={e} />
                      </Modal>
                      <AccionConEstado
                        accion={quitarEjercicioAsignado}
                        campos={{ tenantSlug: slug, itemId: e.id }}
                        etiqueta="Quitar"
                        icono="close"
                        variante="peligro"
                        confirmar={`¿Quitar «${e.exerciseName}» de la rutina de ${asignacion.customerName}?`}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
