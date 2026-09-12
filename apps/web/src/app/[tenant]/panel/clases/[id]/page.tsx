/**
 * CAPA: Presentation / App — una clase (V3.3).
 *
 * Qué planes la incluyen, en qué horarios se repite y qué sesiones vienen. Es
 * donde gerencia decide la parte comercial de una clase —quién puede tomarla—
 * y la operativa —cuándo, dónde y con quién—.
 *
 * Retirar un horario cancela sus sesiones futuras vacías; las que ya tienen
 * asistentes se quedan.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta } from '@/lib/formato';
import {
  claseSinAcceso,
  horaDeFin,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_MODO_DE_ACCESO,
  NOMBRE_DE_NIVEL_DE_CLASE,
  NOMBRE_DE_TIPO_DE_CLASE,
  sumarDias,
  type HorarioDeClase,
} from '@core/domain/operations/classes';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { branchesRepository, classesRepository, membersRepository, trainersRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { FilaDeSesion } from '@/presentation/patterns/AgendaDeClases';
import { ClaseForm, GenerarSesionesForm, HorarioForm, PlanesDeClaseForm, SesionForm } from '@/presentation/patterns/ClaseForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../../_datos';
import { activarClase, archivarClase, desactivarHorario } from '../actions';

export const metadata: Metadata = { title: 'Clase', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface ClasePageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

export default async function ClasePage({ params }: ClasePageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableClasses']);
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verClases);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarClases);

  const clasesRepo = await classesRepository();
  const clase = await clasesRepo.clase(id);
  // Inexistente o de otro gimnasio (RLS no la devuelve): la misma respuesta.
  if (!clase) notFound();

  const hoy = await repo.hoyDelGimnasio(slug);
  const [horarios, proximas, pasadas, sedes, instructores, planes, estadisticas] = await Promise.all([
    clasesRepo.horarios(id),
    clasesRepo.sesiones({ desde: hoy, hasta: sumarDias(hoy, 20), classId: id }),
    clasesRepo.sesiones({ desde: sumarDias(hoy, -14), hasta: sumarDias(hoy, -1), classId: id }),
    (await branchesRepository()).listar(),
    puedeGestionar && features.enableTrainers && tienePermiso(perfil, PERMISO.verEntrenadores) ? (await trainersRepository()).listar() : Promise.resolve([]),
    puedeGestionar ? (await membersRepository()).planesVendibles() : Promise.resolve([]),
    puedeGestionar ? clasesRepo.estadisticas() : Promise.resolve([]),
  ]);

  const opcionesDeSede = sedes.filter((s) => s.isActive).map((s) => ({ id: s.id, nombre: s.name }));
  const opcionesDeInstructor = instructores.filter((i) => i.isActive).map((i) => ({ id: i.id, nombre: i.fullName }));
  const opcionesDePlan = planes.map((p) => ({ id: p.id, nombre: p.name }));
  const activos = horarios.filter((h) => h.isActive);
  const stats = estadisticas.find((e) => e.classId === id) ?? null;
  const sinAcceso = claseSinAcceso(clase);
  const campos = { tenantSlug: slug, classId: clase.id };
  const hrefDeSesion = (sesionId: string) => `${tenantHref(slug, 'panel/clases/sesion')}/${sesionId}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
          <Icon name={clase.category === 'combate' || clase.category === 'artes_marciales' ? 'boxing' : clase.category === 'ciclismo' ? 'cycling' : clase.category === 'mente_cuerpo' ? 'yoga' : 'group'} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-h3">{clase.name}</h2>
            {clase.kind === 'evento' && <Badge tone="action">Evento</Badge>}
            {!clase.isActive && <Badge tone="structural">Archivada</Badge>}
            {clase.isPublic && <Badge tone="neutral">Publicada en el sitio</Badge>}
          </div>
          <p className="mt-1 text-[0.86rem] text-muted">
            {NOMBRE_DE_CATEGORIA[clase.category]} · {NOMBRE_DE_NIVEL_DE_CLASE[clase.level]} · {clase.durationMinutes} min · {clase.capacity} personas
            {clase.trainerName ? ` · ${clase.trainerName}` : ''}
          </p>
        </div>
        <LinkButton href={tenantHref(slug, 'panel/clases')} variant="ghost" size="sm" icon="calendar" iconPosition="start">
          Todas las clases
        </LinkButton>
      </section>

      {clase.description && (
        <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-line px-4 py-3 text-[0.9rem] text-ink">
          <Icon name="quote" size={17} className="mt-0.5 shrink-0 text-action" />
          {clase.description}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="#planes" etiqueta="Quién puede entrar" valor={clase.accessMode === 'planes' ? `${clase.planIds.length}` : clase.accessMode === 'membresia' ? 'Todos' : 'Libre'} icono="shield" tono={sinAcceso ? 'alerta' : 'accion'} comparacion={clase.accessMode === 'planes' ? (sinAcceso ? 'ningún plan: nadie puede entrar' : 'planes la incluyen') : NOMBRE_DE_MODO_DE_ACCESO[clase.accessMode]} accion="Ver planes" />
        <StatCard href="#horarios" etiqueta="Horarios semanales" valor={`${activos.length}`} icono="clock" comparacion={activos.length > 0 ? activos.map((h) => `${NOMBRE_DE_DIA_ISO[h.weekday].slice(0, 3)} ${h.startTime}`).slice(0, 4).join(' · ') : 'sin horario'} accion="Ver horarios" />
        <StatCard href="#proximas" etiqueta="Próximas 3 semanas" valor={`${proximas.filter((s) => s.estado !== 'cancelada').length}`} icono="calendar" comparacion={`${proximas.filter((s) => s.estado === 'cancelada').length} canceladas`} accion="Ver sesiones" />
        <StatCard href="#proximas" etiqueta="Ocupación 30 días" valor={stats?.ocupacion30d !== null && stats?.ocupacion30d !== undefined ? `${stats.ocupacion30d} %` : '—'} icono="chart" comparacion={stats ? `${stats.asistencias30d} asistencias · ${stats.socios30d} socios` : 'se calcula con las sesiones terminadas'} accion="Ver sesiones" />
      </div>

      <section id="planes" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-planes">
        <h2 id="titulo-planes" className="t-h3">Planes que la incluyen</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">
          {clase.accessMode === 'planes'
            ? 'Solo los socios con uno de estos planes vigente el día de la sesión pueden registrarse. La base lo comprueba al registrar.'
            : `Modo actual: ${NOMBRE_DE_MODO_DE_ACCESO[clase.accessMode].toLowerCase()}. Cámbialo en «Datos de la clase» para restringirla por plan.`}
        </p>
        {puedeGestionar ? (
          <div className="mt-5">
            {opcionesDePlan.length === 0 ? <EmptyState icono="layers" titulo="El gimnasio no tiene planes activos" /> : <PlanesDeClaseForm slug={slug} clase={clase} planes={opcionesDePlan} />}
          </div>
        ) : (
          <p className="mt-4 text-[0.9rem] text-ink">{clase.planNames.length > 0 ? clase.planNames.join(' · ') : 'Ningún plan marcado.'}</p>
        )}
      </section>

      <section id="horarios" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-horarios">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-horarios" className="t-h3">Horario semanal</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">De aquí salen las sesiones al generarlas. Cambiar un horario no toca las sesiones ya creadas.</p>
          </div>
          {puedeGestionar && clase.isActive && (
            <div className="flex flex-wrap gap-2">
              <Modal
                titulo={`Horario de «${clase.name}»`}
                descripcion="Marca varios días para crear el mismo horario en cada uno."
                anchoMaximo="lg"
                montarSoloAbierto
                disparador={
                  <Button variant="primary" size="sm" icon="plus" iconPosition="start">
                    Agregar horario
                  </Button>
                }
              >
                <HorarioForm slug={slug} clase={clase} sedes={opcionesDeSede} instructores={opcionesDeInstructor} />
              </Modal>
              {activos.length > 0 && (
                <Modal
                  titulo={`Generar sesiones de «${clase.name}»`}
                  anchoMaximo="md"
                  montarSoloAbierto
                  disparador={
                    <Button variant="secondary" size="sm" icon="refresh" iconPosition="start">
                      Generar sesiones
                    </Button>
                  }
                >
                  <GenerarSesionesForm slug={slug} hoy={hoy} horarios={horarios} classId={clase.id} />
                </Modal>
              )}
            </div>
          )}
        </div>

        <DataTable<HorarioDeClase>
          titulo={`Horarios de ${clase.name}`}
          className="mt-5"
          columnas={[
            { clave: 'dia', titulo: 'Día', celda: (h) => <span className="font-medium text-ink">{NOMBRE_DE_DIA_ISO[h.weekday]}</span> },
            { clave: 'hora', titulo: 'Hora', celda: (h) => `${h.startTime} – ${horaDeFin(h.startTime, h.durationMinutes)}` },
            { clave: 'sede', titulo: 'Sede', celda: (h) => h.branchName },
            { clave: 'instructor', titulo: 'Instructor', secundaria: true, celda: (h) => h.trainerName ?? '—' },
            { clave: 'cupo', titulo: 'Cupo', numerica: true, celda: (h) => `${h.capacity}` },
            {
              clave: 'vigencia',
              titulo: 'Vigencia',
              secundaria: true,
              celda: (h) => (h.isActive ? (h.endsOn ? `hasta ${fechaCorta(h.endsOn)}` : 'sin fin') : <Badge tone="neutral">Retirado</Badge>),
            },
            {
              clave: 'accion',
              titulo: '',
              celda: (h) =>
                puedeGestionar && h.isActive ? (
                  <AccionConEstado
                    accion={desactivarHorario}
                    campos={{ tenantSlug: slug, scheduleId: h.id }}
                    etiqueta="Retirar"
                    icono="close"
                    variante="peligro"
                    confirmar={`¿Retirar el horario del ${NOMBRE_DE_DIA_ISO[h.weekday].toLowerCase()} a las ${h.startTime}? Se cancelan sus sesiones futuras que todavía no tienen asistentes.`}
                  />
                ) : null,
            },
          ]}
          filas={horarios}
          claveDeFila={(h) => h.id}
          vacio={
            <EmptyState
              icono="clock"
              titulo={clase.kind === 'evento' ? 'Un evento no necesita horario semanal' : 'Sin horario todavía'}
              descripcion={clase.kind === 'evento' ? 'Programa su fecha con «Programar sesión».' : 'Agrega los días y la hora; después genera las sesiones.'}
            />
          }
        />
      </section>

      <section id="proximas" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-proximas">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="titulo-proximas" className="t-h3">Próximas sesiones</h2>
          {puedeGestionar && clase.isActive && (
            <Modal
              titulo={`Programar «${clase.name}»`}
              descripcion="Una fecha suelta, fuera del horario semanal."
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="secondary" size="sm" icon="calendar" iconPosition="start">
                  Programar sesión
                </Button>
              }
            >
              <SesionForm slug={slug} hoy={hoy} clases={[clase]} sedes={opcionesDeSede} instructores={opcionesDeInstructor} classIdInicial={clase.id} />
            </Modal>
          )}
        </div>
        {proximas.length === 0 ? (
          <EmptyState className="mt-5" icono="calendar" titulo="No hay sesiones en las próximas tres semanas" descripcion={activos.length > 0 ? 'Genera las sesiones de sus horarios.' : undefined} />
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {proximas.map((s) => (
              <li key={s.id}>
                <FilaDeSesion sesion={s} href={hrefDeSesion(s.id)} mostrarFecha destacada={s.estado === 'en_curso'} />
              </li>
            ))}
          </ul>
        )}

        {pasadas.length > 0 && (
          <details className="mt-6 border-t border-line pt-5">
            <summary className="cursor-pointer text-[0.9rem] font-semibold text-ink">Últimas dos semanas ({pasadas.length})</summary>
            <ul className="mt-4 flex flex-col gap-2">
              {[...pasadas].reverse().map((s) => (
                <li key={s.id}>
                  <FilaDeSesion sesion={s} href={hrefDeSesion(s.id)} mostrarFecha />
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {puedeGestionar && (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-datos-clase">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="titulo-datos-clase" className="t-h3">Datos de la clase</h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">{NOMBRE_DE_TIPO_DE_CLASE[clase.kind]}. Cambiar la capacidad aquí vale para las sesiones que se generen después.</p>
            </div>
            {clase.isActive ? (
              <AccionConEstado
                accion={archivarClase}
                campos={campos}
                etiqueta="Archivar clase"
                icono="archive"
                variante="peligro"
                confirmar={`¿Archivar «${clase.name}»? No se generarán más sesiones; lo registrado se conserva.`}
              />
            ) : (
              <AccionConEstado accion={activarClase} campos={campos} etiqueta="Activar clase" icono="refresh" variante="primario" />
            )}
          </div>
          <div className="mt-6">
            <ClaseForm slug={slug} clase={clase} instructores={opcionesDeInstructor} />
          </div>
        </section>
      )}
    </div>
  );
}
