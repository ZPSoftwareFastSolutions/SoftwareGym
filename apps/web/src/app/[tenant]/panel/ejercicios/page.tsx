/**
 * CAPA: Presentation / App — catálogo de ejercicios (V3.1).
 *
 * El catálogo propio del gimnasio, con búsqueda, filtro por grupo muscular y
 * el uso de su cuota de medios.
 *
 * Capacidad `enableExercises` (apagada → 404) y permiso `exercises.read`.
 * Las miniaturas son imágenes comprimidas o pósteres de clips, con URL firmada
 * de una hora: la lista nunca descarga un vídeo.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { esGrupoMuscular, GRUPOS_MUSCULARES, nombreDeGrupoMuscular } from '@core/domain/operations/exercises';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { exercisesRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { EjercicioForm } from '@/presentation/patterns/EjercicioForms';
import { UsoDeMedios } from '@/presentation/patterns/UsoDeMedios';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { CLASE_DE_CONTROL } from '@/presentation/ui/Campo';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';
import { liberarArchivosSinUso } from './actions';

export const metadata: Metadata = { title: 'Ejercicios', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface EjerciciosPageProps extends TenantPageParams {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function uno(valor: string | string[] | undefined): string {
  return typeof valor === 'string' ? valor : '';
}

export default async function EjerciciosPage({ params, searchParams }: EjerciciosPageProps) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableExercises']);
  const { slug } = tenant;
  const { perfil } = await exigirPermiso(slug, PERMISO.verEjercicios);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarEjercicios);

  const busqueda = await searchParams;
  const q = uno(busqueda.q).slice(0, 60);
  const grupoCrudo = uno(busqueda.grupo);
  const grupo = esGrupoMuscular(grupoCrudo) ? grupoCrudo : undefined;
  const estadoCrudo = uno(busqueda.estado);
  const estado = estadoCrudo === 'inactivos' || estadoCrudo === 'todos' ? estadoCrudo : 'activos';

  const repo = await exercisesRepository();
  const [lista, todos, uso] = await Promise.all([
    repo.listar({ q, grupo, estado }),
    repo.listar({ estado: 'todos' }),
    repo.uso(),
  ]);
  const miniaturas = await repo.urlsFirmadas(lista.map((e) => e.miniatura).filter((m): m is string => m !== null), 3600);

  const activos = todos.filter((e) => e.isActive);
  const conMedios = activos.filter((e) => e.medios > 0).length;
  const grupos = new Set(activos.map((e) => e.muscleGroup)).size;
  const base = tenantHref(slug, 'panel/ejercicios');
  const filtrando = Boolean(q || grupo || estado !== 'activos');

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Ejercicios</h2>
          <p className="mt-1.5 max-w-[64ch] text-[0.88rem] leading-relaxed text-muted">
            El catálogo propio de {tenant.name}: cómo se ejecuta cada ejercicio, con imagen, GIF o clip. Es la base de las rutinas que llegarán después.
          </p>
        </div>
        {puedeGestionar && (
          <Modal
            titulo="Nuevo ejercicio"
            descripcion="Después podrás agregarle imágenes, un GIF, un clip o un vídeo enlazado."
            anchoMaximo="lg"
            montarSoloAbierto
            disparador={
              <Button variant="primary" size="md" icon="plus" iconPosition="start">
                Nuevo ejercicio
              </Button>
            }
          >
            <EjercicioForm slug={slug} />
          </Modal>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href={base} etiqueta="Ejercicios activos" valor={`${activos.length}`} icono="dumbbell" tono="accion" comparacion={`${todos.length - activos.length} inactivos`} accion="Ver catálogo" />
        <StatCard href="#catalogo" etiqueta="Con medios" valor={`${conMedios}`} icono="image" comparacion={`${activos.length - conMedios} solo con texto`} accion="Ver catálogo" />
        <StatCard href="#catalogo" etiqueta="Grupos musculares" valor={`${grupos}`} icono="layers" comparacion={`de ${GRUPOS_MUSCULARES.length} del catálogo`} accion="Filtrar" />
        <StatCard
          href="#almacenamiento"
          etiqueta="Almacenamiento"
          valor={uso ? `${Math.min(100, Math.round((uso.usadoBytes / Math.max(1, uso.cuotaBytes)) * 100))} %` : '—'}
          icono="archive"
          tono={uso && uso.usadoBytes >= uso.cuotaBytes * 0.8 ? 'alerta' : 'neutro'}
          comparacion="de la cuota de medios"
          accion="Ver detalle"
        />
      </div>

      <section id="catalogo" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-catalogo">
        <h2 id="titulo-catalogo" className="t-h3">Catálogo</h2>
        <form method="get" className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_11rem_auto]">
          <label className="sr-only" htmlFor="filtro-q">Buscar</label>
          <input id="filtro-q" name="q" type="search" defaultValue={q} placeholder="Buscar por nombre o equipo" className={CLASE_DE_CONTROL} />
          <label className="sr-only" htmlFor="filtro-grupo">Grupo muscular</label>
          <select id="filtro-grupo" name="grupo" defaultValue={grupo ?? ''} className={CLASE_DE_CONTROL}>
            <option value="">Todos los grupos</option>
            {GRUPOS_MUSCULARES.map((g) => (
              <option key={g.code} value={g.code}>
                {g.nombre}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" name="estado" defaultValue={estado} className={CLASE_DE_CONTROL}>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" size="md" icon="filter" iconPosition="start">
              Filtrar
            </Button>
            {filtrando && (
              <LinkButton href={base} variant="ghost" size="md">
                Limpiar
              </LinkButton>
            )}
          </div>
        </form>

        {lista.length === 0 ? (
          <EmptyState
            className="mt-6"
            icono="dumbbell"
            titulo={filtrando ? 'Ningún ejercicio coincide' : 'Todavía no hay ejercicios'}
            descripcion={filtrando ? 'Prueba con otro nombre o grupo.' : puedeGestionar ? 'Crea el primero con «Nuevo ejercicio».' : undefined}
          />
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((e) => {
              const miniatura = e.miniatura ? miniaturas.get(e.miniatura) : undefined;
              return (
                <li key={e.id}>
                  <Link href={`${base}/${e.id}`} className="group flex h-full flex-col overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-raised transition-colors hover:border-action focus-visible:border-action">
                    <div className="relative grid aspect-[16/10] place-items-center overflow-hidden bg-line/40">
                      {miniatura ? (
                        <img src={miniatura} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <Icon name="dumbbell" size={34} className="text-muted" />
                      )}
                      {e.tieneVideo && (
                        <span className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.72rem] font-semibold text-white">
                          <Icon name="camera" size={12} /> Clip
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink group-hover:text-action">{e.name}</span>
                        {!e.isActive && <Badge tone="structural">Inactivo</Badge>}
                      </div>
                      <span className="text-[0.8rem] text-muted">
                        {nombreDeGrupoMuscular(e.muscleGroup)}
                        {e.equipment ? ` · ${e.equipment}` : ''}
                      </span>
                      <span className="mt-auto pt-2 text-[0.76rem] text-muted">
                        {e.medios === 0 ? 'Sin medios' : `${e.medios} medio${e.medios === 1 ? '' : 's'}`}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {uso && (
        <section id="almacenamiento" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-almacenamiento">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[64ch]">
              <h2 id="titulo-almacenamiento" className="t-h3">Espacio para medios</h2>
              <p className="mt-1.5 text-[0.86rem] leading-relaxed text-muted">
                Cada gimnasio tiene una cuota. Las imágenes se comprimen solas al subirlas; los clips son cortos y llevan miniatura; los vídeos largos conviene enlazarlos desde YouTube o Vimeo, que no ocupan espacio.
              </p>
            </div>
            {puedeGestionar && (
              <AccionConEstado
                accion={liberarArchivosSinUso}
                campos={{ tenantSlug: slug }}
                etiqueta="Liberar archivos sin uso"
                icono="refresh"
                confirmar="¿Borrar los archivos que quedaron de subidas interrumpidas? Los medios de los ejercicios no se tocan."
              />
            )}
          </div>
          <UsoDeMedios uso={uso} className="mt-5" />
        </section>
      )}
    </div>
  );
}
