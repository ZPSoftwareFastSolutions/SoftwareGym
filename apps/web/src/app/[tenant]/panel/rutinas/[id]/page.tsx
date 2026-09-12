/**
 * CAPA: Presentation / App — una rutina (V3.2).
 *
 * Los ejercicios de la plantilla, con sus series y descansos, y a quién se le
 * asignó. Editar aquí NO toca las copias ya asignadas: cada socio tiene la
 * suya desde el momento en que se le asignó.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta } from '@/lib/formato';
import { nombreDeGrupoMuscular } from '@core/domain/operations/exercises';
import { describirSerie, NOMBRE_DE_NIVEL, NOMBRE_DE_OBJETIVO, type EjercicioDeRutina } from '@core/domain/operations/training';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { exercisesRepository, membersRepository, trainersRepository, trainingRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import {
  AsignarRutinaForm,
  EjercicioDeRutinaForm,
  RutinaForm,
  type OpcionDeSocioParaRutina,
} from '@/presentation/patterns/RutinaForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../../_datos';
import { activarRutina, desactivarRutina, finalizarRutinaAsignada, quitarEjercicioDeRutina } from '../actions';

export const metadata: Metadata = { title: 'Rutina', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface RutinaPageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

export default async function RutinaPage({ params }: RutinaPageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableRoutines']);
  const { slug } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verRutinas);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarRutinas);
  const puedeAsignar = tienePermiso(perfil, PERMISO.asignarRutinas);

  const entrenamiento = await trainingRepository();
  const rutina = await entrenamiento.rutina(id);
  // Inexistente o de otro gimnasio (RLS no la devuelve): la misma respuesta.
  if (!rutina) notFound();

  const [ejercicios, asignaciones, programas, catalogo, hoy] = await Promise.all([
    entrenamiento.ejerciciosDeRutina(id),
    entrenamiento.asignaciones({ limite: 100 }),
    entrenamiento.programas(),
    tenant.features.enableExercises && tienePermiso(perfil, PERMISO.verEjercicios)
      ? (await exercisesRepository()).listar({ estado: 'activos' })
      : Promise.resolve([]),
    repo.hoyDelGimnasio(slug),
  ]);

  const deEstaRutina = asignaciones.filter((a) => a.routineId === id);
  const vigentes = deEstaRutina.filter((a) => !a.endedOn);

  let socios: readonly OpcionDeSocioParaRutina[] = [];
  if (puedeAsignar) {
    if (tienePermiso(perfil, PERMISO.verSocios)) {
      const fichas = await (await membersRepository()).listar({}, hoy);
      socios = fichas.filter((f) => !f.archivedAt).map((f) => ({ id: f.id, etiqueta: `${f.code ?? '—'} · ${f.fullName}` }));
    } else {
      const mios = await (await trainersRepository()).misSocios();
      socios = mios.map((s) => ({ id: s.customerId, etiqueta: `${s.customerCode ?? '—'} · ${s.fullName}` }));
    }
  }

  const opcionesDeCatalogo = catalogo.map((e) => ({ id: e.id, nombre: e.name, grupo: nombreDeGrupoMuscular(e.muscleGroup) }));
  const campos = { tenantSlug: slug, routineId: rutina.id };
  const minutos = ejercicios.reduce((suma, e) => suma + e.sets * ((e.restSeconds ?? 60) + 40), 0) / 60;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
          <Icon name="layers" size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-h3">
              {rutina.dayLabel ? `${rutina.dayLabel} · ` : ''}
              {rutina.name}
            </h2>
            {!rutina.isActive && <Badge tone="structural">Archivada</Badge>}
            {rutina.grupos.map((g) => (
              <Badge key={g} tone="neutral">
                {nombreDeGrupoMuscular(g)}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-[0.86rem] text-muted">
            {rutina.programName ? `${rutina.programName} · ` : 'Rutina suelta · '}
            {rutina.ejercicios} ejercicios
            {rutina.estimatedMinutes ? ` · ${rutina.estimatedMinutes} min` : ejercicios.length > 0 ? ` · ~${Math.round(minutos)} min estimados` : ''}
          </p>
        </div>
        <LinkButton href={tenantHref(slug, 'panel/rutinas')} variant="ghost" size="sm" icon="layers" iconPosition="start">
          Todas las rutinas
        </LinkButton>
      </section>

      {rutina.notes && (
        <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-line px-4 py-3 text-[0.9rem] text-ink">
          <Icon name="quote" size={17} className="mt-0.5 shrink-0 text-action" />
          {rutina.notes}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="#ejercicios" etiqueta="Ejercicios" valor={`${ejercicios.length}`} icono="dumbbell" tono="accion" comparacion={`${ejercicios.reduce((s, e) => s + e.sets, 0)} series en total`} accion="Ver ejercicios" />
        <StatCard href="#asignada" etiqueta="Socios haciéndola" valor={`${vigentes.length}`} icono="group" comparacion={`${deEstaRutina.length - vigentes.length} finalizadas`} accion="Ver a quiénes" />
        <StatCard href="#asignada" etiqueta="Registros esta semana" valor={`${vigentes.reduce((s, a) => s + a.completados7d, 0)}`} icono="fire" comparacion="de quienes la tienen asignada" accion="Ver actividad" />
        <StatCard
          href="#ejercicios"
          etiqueta="Grupos que cubre"
          valor={`${rutina.grupos.length}`}
          icono="chart"
          comparacion={rutina.grupos.map(nombreDeGrupoMuscular).join(', ') || 'sin ejercicios'}
          accion="Ver detalle"
        />
      </div>

      <section id="ejercicios" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-ejercicios">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="titulo-ejercicios" className="t-h3">Ejercicios de la rutina</h2>
          {puedeGestionar && opcionesDeCatalogo.length > 0 && (
            <Modal
              titulo="Agregar ejercicio"
              descripcion="Del catálogo del gimnasio."
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="primary" size="sm" icon="plus" iconPosition="start">
                  Agregar ejercicio
                </Button>
              }
            >
              <EjercicioDeRutinaForm slug={slug} routineId={rutina.id} destino="plantilla" catalogo={opcionesDeCatalogo} siguientePosicion={ejercicios.length + 1} />
            </Modal>
          )}
        </div>

        <DataTable<EjercicioDeRutina>
          titulo={`Ejercicios de ${rutina.name}`}
          className="mt-5"
          columnas={[
            { clave: 'orden', titulo: '#', numerica: true, celda: (e) => `${e.position}` },
            {
              clave: 'ejercicio',
              titulo: 'Ejercicio',
              celda: (e) => (
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{e.exerciseName}</span>
                  <span className="text-[0.76rem] text-muted">{nombreDeGrupoMuscular(e.muscleGroup)}</span>
                </span>
              ),
            },
            { clave: 'serie', titulo: 'Serie', celda: (e) => describirSerie(e) },
            { clave: 'nota', titulo: 'Nota', secundaria: true, celda: (e) => e.notes ?? '—' },
            {
              clave: 'acciones',
              titulo: 'Acciones',
              celda: (e) =>
                puedeGestionar ? (
                  <span className="flex flex-wrap items-start gap-2">
                    <Modal
                      titulo={`Ajustar «${e.exerciseName}»`}
                      anchoMaximo="lg"
                      montarSoloAbierto
                      disparador={
                        <Button variant="secondary" size="sm" icon="edit" iconPosition="start">
                          Ajustar
                        </Button>
                      }
                    >
                      <EjercicioDeRutinaForm slug={slug} routineId={rutina.id} itemId={e.id} destino="plantilla" catalogo={opcionesDeCatalogo} ejercicio={e} />
                    </Modal>
                    <AccionConEstado
                      accion={quitarEjercicioDeRutina}
                      campos={{ tenantSlug: slug, itemId: e.id }}
                      etiqueta="Quitar"
                      icono="close"
                      variante="peligro"
                      confirmar={`¿Quitar «${e.exerciseName}» de la rutina? Las copias ya asignadas no se tocan.`}
                    />
                  </span>
                ) : null,
            },
          ]}
          filas={ejercicios}
          claveDeFila={(e) => e.id}
          vacio={
            <EmptyState
              icono="dumbbell"
              titulo="La rutina todavía no tiene ejercicios"
              descripcion={
                opcionesDeCatalogo.length === 0
                  ? 'Primero carga ejercicios en el catálogo del gimnasio.'
                  : 'Agrega ejercicios con sus series y repeticiones. Sin ejercicios no se puede asignar.'
              }
            />
          }
        />
      </section>

      <section id="asignada" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-asignada">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-asignada" className="t-h3">Quién la está haciendo</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">Cada socio tiene su copia: los cambios de arriba no le cambian la suya.</p>
          </div>
          {puedeAsignar && socios.length > 0 && ejercicios.length > 0 && (
            <Modal
              titulo={`Asignar «${rutina.name}»`}
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="primary" size="sm" icon="plus" iconPosition="start">
                  Asignar a un socio
                </Button>
              }
            >
              <AsignarRutinaForm slug={slug} socios={socios} rutinas={[rutina]} routineId={rutina.id} />
            </Modal>
          )}
        </div>

        <DataTable
          titulo={`Socios con ${rutina.name}`}
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
            { clave: 'desde', titulo: 'Desde', celda: (a) => fechaCorta(a.startsOn) },
            {
              clave: 'estado',
              titulo: 'Estado',
              celda: (a) =>
                a.endedOn ? <Badge tone="neutral">Finalizada {fechaCorta(a.endedOn)}</Badge> : <Badge tone="action">Vigente</Badge>,
            },
            { clave: 'semana', titulo: 'Última semana', numerica: true, celda: (a) => `${a.completados7d}` },
            {
              clave: 'accion',
              titulo: '',
              celda: (a) =>
                puedeAsignar && !a.endedOn ? (
                  <AccionConEstado
                    accion={finalizarRutinaAsignada}
                    campos={{ tenantSlug: slug, asignacionId: a.id }}
                    etiqueta="Finalizar"
                    icono="close"
                    variante="peligro"
                    confirmar={`¿Finalizar la rutina de ${a.customerName}?`}
                  />
                ) : null,
            },
          ]}
          filas={deEstaRutina}
          claveDeFila={(a) => a.id}
          vacio={<EmptyState icono="group" titulo="Nadie la tiene asignada todavía" />}
        />
      </section>

      {puedeGestionar && (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-datos-rutina">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="titulo-datos-rutina" className="t-h3">Datos de la rutina</h2>
            {rutina.isActive ? (
              <AccionConEstado
                accion={desactivarRutina}
                campos={campos}
                etiqueta="Archivar rutina"
                icono="archive"
                variante="peligro"
                confirmar={`¿Archivar «${rutina.name}»? No se podrá asignar; lo ya asignado sigue igual.`}
              />
            ) : (
              <AccionConEstado accion={activarRutina} campos={campos} etiqueta="Activar rutina" icono="refresh" variante="primario" />
            )}
          </div>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            {rutina.programName
              ? `Pertenece al programa ${rutina.programName}${
                  programas.find((p) => p.id === rutina.programId)
                    ? ` (${NOMBRE_DE_OBJETIVO[programas.find((p) => p.id === rutina.programId)!.goal]} · ${
                        NOMBRE_DE_NIVEL[programas.find((p) => p.id === rutina.programId)!.level]
                      })`
                    : ''
                }.`
              : 'No pertenece a ningún programa.'}
          </p>
          <div className="mt-6">
            <RutinaForm slug={slug} rutina={rutina} programas={programas.filter((p) => p.isActive)} />
          </div>
        </section>
      )}
    </div>
  );
}
