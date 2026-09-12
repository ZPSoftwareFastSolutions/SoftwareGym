/**
 * CAPA: Presentation / App — métricas de entrenamiento (V3.2).
 *
 * El cuadro que pidió gerencia: qué ejercicio hace más gente, qué hace cada
 * persona, qué día se entrena qué músculo y qué conclusiones salen de eso.
 *
 * Todo se calcula sobre los ejercicios MARCADOS COMO HECHOS (el socio o su
 * entrenador), agregados por vistas de la base; aquí solo se ordenan y se
 * leen. Capacidad `enableRoutines` + permiso `training.read`: recepción no
 * entra, y RLS no le devolvería una fila aunque entrara.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta } from '@/lib/formato';
import { nombreDeGrupoMuscular } from '@core/domain/operations/exercises';
import type { PuntoDeSerie } from '@core/domain/operations/dashboard';
import {
  conclusionesDeEntrenamiento,
  DIA_CORTO,
  DIAS_DE_SEMANA,
  etiquetasPorDia,
  NOMBRE_DE_DIA,
  rankingDeGrupos,
  vecesPorDia,
  type Conclusion,
  type EstadisticaDeEjercicio,
} from '@core/domain/operations/training';
import { PERMISO } from '@core/domain/operations/workspace';
import { trainingRepository } from '@infra/config/composition-root';
import { BarChart } from '@/presentation/ui/BarChart';
import { Badge } from '@/presentation/ui/Badge';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { HeatMap } from '@/presentation/ui/HeatMap';
import { LinkButton } from '@/presentation/ui/Button';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon, type AnyIconKey } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = { title: 'Entrenamiento', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const ICONO_DE_TONO: Readonly<Record<Conclusion['tono'], AnyIconKey>> = {
  bueno: 'check',
  neutro: 'chart',
  atencion: 'alert',
};

/** Lo que hace una persona: su ejercicio y su grupo más repetidos. */
interface ResumenDeSocio {
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly customerName: string;
  readonly registros30d: number;
  readonly ejercicios: number;
  readonly favorito: string;
  readonly grupo: string;
  readonly ultimaVez: string | null;
  readonly pesoMaximo: number | null;
}

export default async function EntrenamientoPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableRoutines']);
  const { slug, features } = tenant;
  await exigirPermiso(slug, PERMISO.verMetricasDeEntrenamiento);

  const repo = await trainingRepository();
  const [resumen, ejercicios, porDia, porSocio, asignaciones] = await Promise.all([
    repo.resumen(),
    repo.estadisticasDeEjercicios(),
    repo.porDiaDeSemana(),
    repo.estadisticasPorSocio(400),
    repo.asignaciones({ vigentes: true }),
  ]);

  if (!resumen) {
    return (
      <section className="surface-card">
        <EmptyState icono="chart" titulo="No se pudieron leer las métricas" descripcion="Vuelve a intentarlo en un momento." />
      </section>
    );
  }

  // Socios con rutina que no registran nada hace una semana: se mira por socio,
  // no por rutina (tener tres rutinas no son tres avisos).
  const ultimoPorSocio = new Map<string, string | null>();
  for (const a of asignaciones) {
    const previo = ultimoPorSocio.get(a.customerId);
    if (previo === undefined || (a.ultimoRegistro && (!previo || a.ultimoRegistro > previo))) {
      ultimoPorSocio.set(a.customerId, a.ultimoRegistro);
    }
  }
  const haceUnaSemana = new Date(`${resumen.hoy}T12:00:00Z`);
  haceUnaSemana.setUTCDate(haceUnaSemana.getUTCDate() - 7);
  const limite = haceUnaSemana.toISOString().slice(0, 10);
  const sinRegistroReciente = [...ultimoPorSocio.values()].filter((fecha) => !fecha || fecha < limite).length;

  const conclusiones = conclusionesDeEntrenamiento({ resumen, ejercicios, porDia, sinRegistroReciente });
  const etiquetas = etiquetasPorDia(porDia);
  const grupos = rankingDeGrupos(porDia);
  const porDiaTotal = vecesPorDia(porDia);

  const serieSemanal: PuntoDeSerie[] = porDiaTotal.map((d) => ({
    etiqueta: DIA_CORTO[d.dia],
    valor: d.veces,
    detalle: `${NOMBRE_DE_DIA[d.dia]}: ${d.veces} ejercicios registrados`,
  }));

  // Mapa de calor día × grupo: los ocho grupos más trabajados, que es lo que
  // entra legible en una pantalla de mostrador.
  const gruposDelMapa = grupos.slice(0, 8);
  const valoresDelMapa = gruposDelMapa.map((g) =>
    DIAS_DE_SEMANA.map((dia) => porDia.filter((c) => c.dia === dia && c.grupo === g.grupo).reduce((s, c) => s + c.veces, 0)),
  );

  const socios = new Map<string, ResumenDeSocio>();
  for (const fila of porSocio) {
    if (fila.veces30d === 0) continue;
    // Las filas vienen ordenadas por veces: la PRIMERA de cada socio es su
    // ejercicio más repetido, y las siguientes solo suman al total.
    const actual = socios.get(fila.customerId);
    socios.set(fila.customerId, {
      customerId: fila.customerId,
      customerCode: fila.customerCode,
      customerName: fila.customerName,
      registros30d: (actual?.registros30d ?? 0) + fila.veces30d,
      ejercicios: (actual?.ejercicios ?? 0) + 1,
      favorito: actual ? actual.favorito : fila.exerciseName,
      grupo: actual ? actual.grupo : nombreDeGrupoMuscular(fila.muscleGroup),
      ultimaVez: !actual?.ultimaVez || (fila.ultimaVez && fila.ultimaVez > actual.ultimaVez) ? fila.ultimaVez : actual.ultimaVez,
      pesoMaximo: Math.max(actual?.pesoMaximo ?? 0, fila.pesoMaximo ?? 0) || null,
    });
  }
  const resumenPorSocio = [...socios.values()].sort((a, b) => b.registros30d - a.registros30d);
  const hechos = ejercicios.filter((e) => e.veces30d > 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Entrenamiento</h2>
          <p className="mt-1.5 max-w-[66ch] text-[0.88rem] leading-relaxed text-muted">
            Qué se entrena en {tenant.name}, quién lo hace y qué día. Sale de los ejercicios que el socio o su entrenador marcan como hechos en las rutinas asignadas; los últimos 30 días salvo donde diga otra cosa.
          </p>
        </div>
        <LinkButton href={tenantHref(slug, 'panel/rutinas')} variant="secondary" size="sm" icon="layers" iconPosition="start">
          Ver rutinas
        </LinkButton>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="#ejercicios"
          etiqueta="Ejercicios registrados"
          valor={`${resumen.completados30d}`}
          icono="fire"
          tono="accion"
          comparacion={`${resumen.completados7d} en la última semana`}
          accion="Ver por ejercicio"
        />
        <StatCard
          href="#socios"
          etiqueta="Socios entrenando"
          valor={`${resumen.sociosEntrenando30d}`}
          icono="group"
          comparacion={`de ${resumen.sociosConRutina} con rutina · ${resumen.sociosActivos} activos`}
          accion="Ver por socio"
        />
        <StatCard
          href="#semana"
          etiqueta="Días con actividad"
          valor={`${resumen.diasConRegistro30d}`}
          icono="calendar"
          comparacion="de los últimos 30"
          accion="Ver la semana"
        />
        <StatCard
          href={tenantHref(slug, 'panel/rutinas')}
          etiqueta="Sin registrar hace 7 días"
          valor={`${sinRegistroReciente}`}
          icono="alert"
          tono={sinRegistroReciente > 0 ? 'alerta' : 'neutro'}
          comparacion="socios con rutina asignada"
          subirEsMalo
          accion="Revisar rutinas"
        />
      </div>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-conclusiones">
        <h2 id="titulo-conclusiones" className="t-h3">Conclusiones</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">Lecturas automáticas de los mismos números de abajo.</p>
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
              <Icon
                name={ICONO_DE_TONO[c.tono]}
                size={18}
                className={c.tono === 'atencion' ? 'mt-0.5 shrink-0 text-structural' : 'mt-0.5 shrink-0 text-action'}
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold text-ink">{c.titulo}</span>
                <span className="text-[0.86rem] leading-relaxed text-muted">{c.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section id="semana" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-semana">
          <h2 id="titulo-semana" className="t-h3">La semana del gimnasio</h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">Ejercicios registrados por día de la semana (90 días).</p>
          <BarChart titulo="Ejercicios registrados por día de la semana" puntos={serieSemanal} unidad="ejercicios" alto={170} className="mt-6" />
          <ul className="mt-6 flex flex-col gap-2">
            {etiquetas
              .filter((d) => d.veces > 0)
              .map((d) => (
                <li key={d.dia} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-[0.88rem] last:border-0">
                  <span className="font-medium text-ink">{NOMBRE_DE_DIA[d.dia]}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={d.confianza === 'baja' ? 'neutral' : 'action'}>{d.etiqueta}</Badge>
                    <span className="text-[0.78rem] text-muted">
                      {d.veces} registros{d.grupo ? ` · ${d.porcentaje} %` : ''}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>

        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-mapa">
          <h2 id="titulo-mapa" className="t-h3">Qué músculo, qué día</h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">Cuanto más intenso el color, más veces se entrenó ese grupo ese día.</p>
          {gruposDelMapa.length === 0 ? (
            <EmptyState className="mt-6" icono="chart" titulo="Todavía no hay registros" />
          ) : (
            <HeatMap
              titulo="Ejercicios registrados por grupo muscular y día de la semana"
              filas={gruposDelMapa.map((g) => nombreDeGrupoMuscular(g.grupo))}
              columnas={DIAS_DE_SEMANA.map((d) => DIA_CORTO[d])}
              valores={valoresDelMapa}
              unidad="registros"
              className="mt-6"
            />
          )}
        </section>
      </div>

      <section id="ejercicios" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-ejercicios-metricas">
        <h2 id="titulo-ejercicios-metricas" className="t-h3">Cuánta gente hace cada ejercicio</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">
          Todo el catálogo, incluidos los que nadie hizo: eso también dice algo.
          {features.enableExercises && ' Los que no están en ninguna rutina no van a aparecer nunca.'}
        </p>
        <DataTable<EstadisticaDeEjercicio>
          titulo="Ejercicios por veces registradas en 30 días"
          className="mt-5"
          columnas={[
            {
              clave: 'ejercicio',
              titulo: 'Ejercicio',
              celda: (e) => (
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{e.name}</span>
                  <span className="text-[0.76rem] text-muted">{nombreDeGrupoMuscular(e.muscleGroup)}</span>
                </span>
              ),
            },
            { clave: 'veces', titulo: 'Veces (30 d)', numerica: true, celda: (e) => `${e.veces30d}` },
            { clave: 'socios', titulo: 'Socios', numerica: true, celda: (e) => `${e.socios30d}` },
            { clave: 'rutinas', titulo: 'En rutinas', numerica: true, secundaria: true, celda: (e) => `${e.enRutinasVigentes}` },
            { clave: 'peso', titulo: 'Peso medio', numerica: true, secundaria: true, celda: (e) => (e.pesoPromedio30d ? `${e.pesoPromedio30d} kg` : '—') },
            {
              clave: 'ultima',
              titulo: 'Última vez',
              celda: (e) => (e.ultimaVez ? fechaCorta(e.ultimaVez) : <Badge tone="structural">Nunca</Badge>),
            },
          ]}
          filas={ejercicios}
          claveDeFila={(e) => e.exerciseId}
          filaDeTotales={{
            ejercicio: `${hechos.length} de ${ejercicios.length} ejercicios con actividad`,
            veces: `${ejercicios.reduce((s, e) => s + e.veces30d, 0)}`,
          }}
          vacio={<EmptyState icono="dumbbell" titulo="El catálogo está vacío" descripcion="Carga ejercicios para poder armar rutinas." />}
        />
      </section>

      <section id="socios" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-socios-metricas">
        <h2 id="titulo-socios-metricas" className="t-h3">Qué hace cada socio</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">Su ejercicio más repetido en 30 días y cuánto registró.</p>
        <DataTable<ResumenDeSocio>
          titulo="Actividad por socio en 30 días"
          className="mt-5"
          columnas={[
            {
              clave: 'socio',
              titulo: 'Socio',
              celda: (s) => (
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{s.customerName}</span>
                  <span className="text-[0.76rem] text-muted">{s.customerCode ?? ''}</span>
                </span>
              ),
            },
            { clave: 'registros', titulo: 'Registros', numerica: true, celda: (s) => `${s.registros30d}` },
            { clave: 'distintos', titulo: 'Ejercicios distintos', numerica: true, secundaria: true, celda: (s) => `${s.ejercicios}` },
            {
              clave: 'favorito',
              titulo: 'El que más hace',
              celda: (s) => (
                <span className="flex flex-col">
                  <span>{s.favorito}</span>
                  <span className="text-[0.76rem] text-muted">{s.grupo}</span>
                </span>
              ),
            },
            { clave: 'peso', titulo: 'Peso máximo', numerica: true, secundaria: true, celda: (s) => (s.pesoMaximo ? `${s.pesoMaximo} kg` : '—') },
            { clave: 'ultima', titulo: 'Última vez', celda: (s) => (s.ultimaVez ? fechaCorta(s.ultimaVez) : '—') },
          ]}
          filas={resumenPorSocio}
          claveDeFila={(s) => s.customerId}
          vacio={
            <EmptyState
              icono="group"
              titulo="Nadie registró entrenamientos todavía"
              descripcion="Asigna rutinas y pide que marquen los ejercicios: de ahí sale todo este cuadro."
            />
          }
        />
      </section>
    </div>
  );
}
