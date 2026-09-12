/**
 * CAPA: Presentation / App — clases grupales (V3.3).
 *
 * La agenda de clases del gimnasio: qué hay hoy y esta semana, el catálogo de
 * clases con los planes que las incluyen y, para gerencia, cómo se llenan.
 *
 * Gerencia arma clases, horarios y sesiones; recepción y el instructor entran a
 * una sesión a tomar asistencia (la base acota a sus sedes y a sus sesiones).
 * Capacidad `enableClasses` (apagada → 404) y permiso `classes.read`.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import {
  agendaPorDia,
  claseSinAcceso,
  conclusionesDeClases,
  DIA_ISO_CORTO,
  DIAS_ISO,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_MODO_DE_ACCESO,
  proximosSieteDias,
  sumarDias,
  type Clase,
  type ConclusionDeClases,
  type EstadisticaDeClase,
} from '@core/domain/operations/classes';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { branchesRepository, classesRepository, trainersRepository } from '@infra/config/composition-root';
import { AgendaSemanal, FilaDeSesion } from '@/presentation/patterns/AgendaDeClases';
import { ClaseForm, GenerarSesionesForm, SesionForm } from '@/presentation/patterns/ClaseForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { HeatMap } from '@/presentation/ui/HeatMap';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon, type AnyIconKey } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = { title: 'Clases', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ICONO_DE_TONO: Readonly<Record<ConclusionDeClases['tono'], AnyIconKey>> = {
  bueno: 'check',
  neutro: 'chart',
  atencion: 'alert',
};

interface ClasesPageProps {
  readonly params: Promise<{ tenant: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.slice(0, 40) ?? '';
}

function TarjetaDeClase({ clase, href }: { readonly clase: Clase; readonly href: string }) {
  const sinAcceso = claseSinAcceso(clase);
  return (
    <Link href={href} className="surface-card group flex h-full flex-col gap-3 p-5 transition-colors hover:border-action">
      <span className="flex flex-wrap items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[1.02rem] font-semibold text-ink">{clase.name}</span>
          <span className="block text-[0.78rem] text-muted">
            {NOMBRE_DE_CATEGORIA[clase.category]} · {clase.durationMinutes} min · {clase.capacity} personas
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {clase.kind === 'evento' && <Badge tone="action">Evento</Badge>}
          {!clase.isActive && <Badge tone="structural">Archivada</Badge>}
          {clase.isPublic && clase.isActive && <Badge tone="neutral">En el sitio</Badge>}
        </span>
      </span>
      <span className={sinAcceso ? 'text-[0.8rem] text-structural' : 'text-[0.8rem] text-muted'}>
        {clase.accessMode === 'planes'
          ? sinAcceso
            ? 'Ningún plan la incluye: nadie puede entrar'
            : `Incluida en: ${clase.planNames.join(', ')}`
          : NOMBRE_DE_MODO_DE_ACCESO[clase.accessMode]}
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 text-[0.78rem] text-muted">
        <span>
          {clase.horarios} horario{clase.horarios === 1 ? '' : 's'} · {clase.proximas7d} sesiones en 7 días
          {clase.trainerName ? ` · ${clase.trainerName}` : ''}
        </span>
        <Icon name="arrowRight" size={16} className="text-action transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default async function ClasesPage({ params, searchParams }: ClasesPageProps) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableClasses']);
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verClases);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarClases);
  const puedeTomarAsistencia = tienePermiso(perfil, PERMISO.tomarAsistenciaDeClase);

  const consulta = await searchParams;
  const sedeCruda = primero(consulta.sede);
  const soloMias = primero(consulta.mias) === '1';

  const clasesRepo = await classesRepository();
  const hoy = await repo.hoyDelGimnasio(slug);
  const semana = proximosSieteDias(hoy);

  // El instructor ve por defecto todo el calendario; con «mías», las que dicta.
  const yo =
    features.enableTrainers && tienePermiso(perfil, PERMISO.trabajarComoEntrenador)
      ? await (await trainersRepository()).porCuenta(perfil.appUserId)
      : null;

  const [clases, horarios, sesiones, sedes, instructores, resumen, estadisticas, franjas] = await Promise.all([
    clasesRepo.clases(),
    clasesRepo.horarios(),
    clasesRepo.sesiones({
      desde: hoy,
      hasta: sumarDias(hoy, 6),
      branchId: PATRON_UUID.test(sedeCruda) ? sedeCruda : undefined,
      trainerId: soloMias && yo ? yo.id : undefined,
    }),
    (await branchesRepository()).listar(),
    puedeGestionar && features.enableTrainers && tienePermiso(perfil, PERMISO.verEntrenadores)
      ? (await trainersRepository()).listar()
      : Promise.resolve([]),
    puedeGestionar ? clasesRepo.resumen() : Promise.resolve(null),
    puedeGestionar ? clasesRepo.estadisticas() : Promise.resolve([] as readonly EstadisticaDeClase[]),
    puedeGestionar ? clasesRepo.franjas() : Promise.resolve([]),
  ]);

  const sedesActivas = sedes.filter((s) => s.isActive);
  const opcionesDeSede = sedesActivas.map((s) => ({ id: s.id, nombre: s.name }));
  const opcionesDeInstructor = instructores.filter((i) => i.isActive).map((i) => ({ id: i.id, nombre: i.fullName }));
  const activas = clases.filter((c) => c.isActive);
  const deHoy = sesiones.filter((s) => s.sessionDate === hoy);
  const agenda = agendaPorDia(sesiones, semana);
  const programadasSemana = sesiones.filter((s) => s.estado !== 'cancelada');
  const cuposSemana = programadasSemana.reduce((suma, s) => suma + Math.max(0, s.capacity - s.asistentes), 0);
  const sinAcceso = activas.filter(claseSinAcceso).length;
  const hrefDeSesion = (id: string) => `${tenantHref(slug, 'panel/clases/sesion')}/${id}`;
  const base = tenantHref(slug, 'panel/clases');

  const conclusiones = resumen ? conclusionesDeClases({ resumen, estadisticas, franjas, clases }) : [];
  // Mapa día × hora solo con las horas que tienen clases: 24 columnas vacías no se leen.
  const horas = [...new Set(franjas.map((f) => f.hora))].sort((a, b) => a - b);
  const valoresDelMapa = DIAS_ISO.map((dia) =>
    horas.map((hora) => {
      const franja = franjas.find((f) => f.dia === dia && f.hora === hora);
      return franja && franja.sesiones > 0 ? Math.round(franja.asistencias / franja.sesiones) : 0;
    }),
  );

  const enlaceDeFiltro = (sede: string | null, mias: boolean) => {
    const partes = [sede ? `sede=${sede}` : null, mias ? 'mias=1' : null].filter(Boolean);
    return partes.length > 0 ? `${base}?${partes.join('&')}` : base;
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Clases</h2>
          <p className="mt-1.5 max-w-[66ch] text-[0.88rem] leading-relaxed text-muted">
            Cada clase se repite por su horario semanal y cada sesión tiene su sede, su instructor y su cupo. Quién puede entrar lo decide el plan del socio: la asistencia de alguien cuyo plan no incluye la clase no se registra.
          </p>
        </div>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Modal
              titulo="Nueva clase"
              descripcion="Box, Karate, Baile fitness… o un evento puntual."
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <Button variant="primary" size="md" icon="plus" iconPosition="start">
                  Nueva clase
                </Button>
              }
            >
              <ClaseForm slug={slug} instructores={opcionesDeInstructor} />
            </Modal>
            {activas.length > 0 && (
              <Modal
                titulo="Programar una sesión"
                descripcion="Una fecha suelta: un evento, una clase extra o una recuperación."
                anchoMaximo="lg"
                montarSoloAbierto
                disparador={
                  <Button variant="secondary" size="md" icon="calendar" iconPosition="start">
                    Sesión o evento
                  </Button>
                }
              >
                <SesionForm slug={slug} hoy={hoy} clases={activas} sedes={opcionesDeSede} instructores={opcionesDeInstructor} />
              </Modal>
            )}
            {horarios.some((h) => h.isActive) && (
              <Modal
                titulo="Generar sesiones"
                descripcion="Crea en el calendario las sesiones de todos los horarios activos."
                anchoMaximo="md"
                montarSoloAbierto
                disparador={
                  <Button variant="secondary" size="md" icon="refresh" iconPosition="start">
                    Generar sesiones
                  </Button>
                }
              >
                <GenerarSesionesForm slug={slug} hoy={hoy} horarios={horarios} />
              </Modal>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="#hoy" etiqueta="Sesiones hoy" valor={`${deHoy.filter((s) => s.estado !== 'cancelada').length}`} icono="calendar" tono="accion" comparacion={`${deHoy.filter((s) => s.estado === 'en_curso').length} en curso ahora`} accion="Ver agenda de hoy" />
        <StatCard href="#semana" etiqueta="Próximos 7 días" valor={`${programadasSemana.length}`} icono="clock" comparacion={`${cuposSemana} cupos libres en total`} accion="Ver la semana" />
        {resumen ? (
          <StatCard href="#rendimiento" etiqueta="Asistencias 30 días" valor={`${resumen.asistencias30d}`} icono="group" comparacion={`${resumen.socios30d} socios distintos`} accion="Ver rendimiento" />
        ) : (
          <StatCard href="#catalogo" etiqueta="Clases activas" valor={`${activas.length}`} icono="group" comparacion={`${horarios.filter((h) => h.isActive).length} horarios semanales`} accion="Ver catálogo" />
        )}
        <StatCard
          href="#catalogo"
          etiqueta="Clases sin plan"
          valor={`${sinAcceso}`}
          icono="alert"
          tono={sinAcceso > 0 ? 'alerta' : 'neutro'}
          comparacion={sinAcceso > 0 ? 'nadie puede entrar a ellas' : 'todas tienen quién las tome'}
          subirEsMalo
          accion="Revisar"
        />
      </div>

      {(sedesActivas.length > 1 || yo) && (
        <nav aria-label="Filtrar la agenda" className="flex flex-wrap gap-2">
          <Link href={enlaceDeFiltro(null, soloMias)} className={!PATRON_UUID.test(sedeCruda) ? 'inline-flex min-h-11 items-center rounded-full border border-action px-4 text-[0.86rem] font-semibold text-action' : 'inline-flex min-h-11 items-center rounded-full border border-line px-4 text-[0.86rem] text-ink hover:border-action'}>
            Todas las sedes
          </Link>
          {sedesActivas.length > 1 &&
            sedesActivas.map((s) => (
              <Link key={s.id} href={enlaceDeFiltro(s.id, soloMias)} className={sedeCruda === s.id ? 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-action px-4 text-[0.86rem] font-semibold text-action' : 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[0.86rem] text-ink hover:border-action'}>
                <Icon name="pin" size={14} />
                {s.name}
              </Link>
            ))}
          {yo && (
            <Link href={enlaceDeFiltro(PATRON_UUID.test(sedeCruda) ? sedeCruda : null, !soloMias)} className={soloMias ? 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-action px-4 text-[0.86rem] font-semibold text-action' : 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[0.86rem] text-ink hover:border-action'}>
              <Icon name="trainer" size={14} />
              Solo las que dicto
            </Link>
          )}
        </nav>
      )}

      <section id="hoy" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-hoy">
        <h2 id="titulo-hoy" className="t-h3">Hoy</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">
          {puedeTomarAsistencia ? 'Entra a una sesión para registrar quién vino. Se puede desde media hora antes de empezar.' : 'Las sesiones del día.'}
        </p>
        {deHoy.length === 0 ? (
          <EmptyState className="mt-5" icono="calendar" titulo="Hoy no hay clases programadas" />
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {deHoy.map((s) => (
              <li key={s.id}>
                <FilaDeSesion sesion={s} href={hrefDeSesion(s.id)} destacada={s.estado === 'en_curso'} mostrarSede={sedesActivas.length > 1} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="semana" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-semana">
        <h2 id="titulo-semana" className="t-h3">Esta semana</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">Las canceladas quedan tachadas con su motivo en la sesión.</p>
        <div className="mt-5">
          <AgendaSemanal dias={agenda} hoy={hoy} hrefDeSesion={(s) => hrefDeSesion(s.id)} />
        </div>
      </section>

      <section id="catalogo" className="scroll-mt-28" aria-labelledby="titulo-catalogo">
        <h2 id="titulo-catalogo" className="t-h3 mb-4">Catálogo de clases</h2>
        {clases.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icono="group"
              titulo="Todavía no hay clases"
              descripcion={puedeGestionar ? 'Crea la primera clase, márcale los planes que la incluyen y agrégale un horario.' : 'Gerencia todavía no cargó las clases.'}
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clases.map((c) => (
              <TarjetaDeClase key={c.id} clase={c} href={`${base}/${c.id}`} />
            ))}
          </div>
        )}
      </section>

      {resumen && (
        <>
          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-conclusiones-clases">
            <h2 id="titulo-conclusiones-clases" className="t-h3">Conclusiones</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">Lecturas automáticas de la ocupación de los últimos 30 días.</p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {conclusiones.map((c) => (
                <li
                  key={c.clave}
                  className={
                    c.tono === 'atencion'
                      ? 'flex gap-3 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 p-4'
                      : c.tono === 'bueno'
                        ? 'flex gap-3 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 p-4'
                        : 'flex gap-3 rounded-[var(--t-radius-md)] border border-line p-4'
                  }
                >
                  <Icon name={ICONO_DE_TONO[c.tono]} size={18} className={c.tono === 'atencion' ? 'mt-0.5 shrink-0 text-structural' : 'mt-0.5 shrink-0 text-action'} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold text-ink">{c.titulo}</span>
                    <span className="text-[0.86rem] leading-relaxed text-muted">{c.detalle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section id="rendimiento" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-rendimiento">
            <h2 id="titulo-rendimiento" className="t-h3">Rendimiento por clase</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">Sesiones ya terminadas de los últimos 30 días.</p>
            <DataTable<EstadisticaDeClase>
              titulo="Ocupación por clase en 30 días"
              className="mt-5"
              columnas={[
                {
                  clave: 'clase',
                  titulo: 'Clase',
                  celda: (e) => (
                    <Link href={`${base}/${e.classId}`} className="flex flex-col hover:text-action">
                      <span className="font-medium text-ink">{e.name}</span>
                      <span className="text-[0.76rem] text-muted">{NOMBRE_DE_CATEGORIA[e.category]}</span>
                    </Link>
                  ),
                },
                { clave: 'sesiones', titulo: 'Sesiones', numerica: true, celda: (e) => `${e.sesiones30d}` },
                { clave: 'asistencias', titulo: 'Asistencias', numerica: true, celda: (e) => `${e.asistencias30d}` },
                { clave: 'socios', titulo: 'Socios', numerica: true, secundaria: true, celda: (e) => `${e.socios30d}` },
                {
                  clave: 'ocupacion',
                  titulo: 'Ocupación',
                  numerica: true,
                  celda: (e) => (e.ocupacion30d === null ? '—' : <Badge tone={e.ocupacion30d >= 80 ? 'action' : e.ocupacion30d < 30 ? 'structural' : 'neutral'}>{e.ocupacion30d} %</Badge>),
                },
                { clave: 'canceladas', titulo: 'Canceladas', numerica: true, secundaria: true, celda: (e) => `${e.canceladas30d}` },
              ]}
              filas={estadisticas}
              claveDeFila={(e) => e.classId}
              filaDeTotales={{
                clase: `${estadisticas.length} clases`,
                sesiones: `${estadisticas.reduce((s, e) => s + e.sesiones30d, 0)}`,
                asistencias: `${estadisticas.reduce((s, e) => s + e.asistencias30d, 0)}`,
              }}
              vacio={<EmptyState icono="chart" titulo="Sin sesiones terminadas todavía" />}
            />
          </section>

          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-franjas">
            <h2 id="titulo-franjas" className="t-h3">Cuándo se llenan</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">Asistentes promedio por sesión, por día y hora de inicio (90 días).</p>
            {horas.length === 0 ? (
              <EmptyState className="mt-5" icono="chart" titulo="Todavía no hay sesiones terminadas" />
            ) : (
              <HeatMap
                titulo="Asistentes promedio por sesión según día y hora"
                filas={DIAS_ISO.map((d) => DIA_ISO_CORTO[d])}
                columnas={horas.map((h) => `${String(h).padStart(2, '0')}:00`)}
                valores={valoresDelMapa}
                unidad="asistentes por sesión"
                className="mt-6"
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
