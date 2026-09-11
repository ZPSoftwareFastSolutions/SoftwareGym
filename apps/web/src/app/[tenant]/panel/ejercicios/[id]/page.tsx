/**
 * CAPA: Presentation / App — un ejercicio (V3.1).
 *
 * Sus medios (imágenes, GIF, clips y vídeos enlazados), sus instrucciones y
 * sus datos. Los archivos se sirven con URL firmada de una hora; el clip no se
 * descarga hasta que alguien pulsa reproducir (`preload="none"`).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import {
  evaluarCuota,
  formatoDeBytes,
  LIMITES_DE_MEDIOS,
  NOMBRE_DE_TIPO_DE_MEDIO,
  nombreDeGrupoMuscular,
  urlDeInsercion,
  urlDeVideoExterno,
  type MedioDeEjercicio,
} from '@core/domain/operations/exercises';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { exercisesRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { EjercicioForm, EnlaceDeVideoForm, SubirMedioForm } from '@/presentation/patterns/EjercicioForms';
import { UsoDeMedios } from '@/presentation/patterns/UsoDeMedios';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../../_datos';
import { activarEjercicio, desactivarEjercicio, eliminarMedio } from '../actions';

export const metadata: Metadata = { title: 'Ejercicio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface EjercicioPageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

function Medio({ medio, urls, titulo }: { readonly medio: MedioDeEjercicio; readonly urls: ReadonlyMap<string, string>; readonly titulo: string }) {
  if (medio.kind === 'enlace' && medio.provider && medio.externalId) {
    return (
      <iframe
        src={urlDeInsercion(medio.provider, medio.externalId)}
        title={`Vídeo de ${titulo}`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full rounded-[var(--t-radius-sm)] border-0 bg-black"
      />
    );
  }
  const src = medio.storagePath ? urls.get(medio.storagePath) : undefined;
  if (!src) {
    return (
      <div className="grid aspect-video place-items-center rounded-[var(--t-radius-sm)] bg-line/40 text-[0.82rem] text-muted">
        No se pudo cargar el archivo
      </div>
    );
  }
  if (medio.kind === 'video') {
    const poster = medio.posterPath ? urls.get(medio.posterPath) : undefined;
    return (
      <video src={src} poster={poster} controls preload="none" playsInline muted loop className="aspect-video w-full rounded-[var(--t-radius-sm)] bg-black object-contain">
        Tu navegador no reproduce este clip.
      </video>
    );
  }
  return <img src={src} alt={`${NOMBRE_DE_TIPO_DE_MEDIO[medio.kind]} de ${titulo}`} loading="lazy" decoding="async" className="aspect-video w-full rounded-[var(--t-radius-sm)] bg-line/40 object-contain" />;
}

export default async function EjercicioPage({ params }: EjercicioPageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableExercises']);
  const { slug } = tenant;
  const { perfil } = await exigirPermiso(slug, PERMISO.verEjercicios);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarEjercicios);

  const repo = await exercisesRepository();
  const ejercicio = await repo.porId(id);
  // Inexistente o de otro gimnasio (RLS no lo devuelve): la misma respuesta.
  if (!ejercicio) notFound();

  const [medios, uso] = await Promise.all([repo.medios(id), repo.uso()]);
  const urls = await repo.urlsFirmadas(
    medios.flatMap((m) => [m.storagePath, m.posterPath]).filter((p): p is string => p !== null),
    3600,
  );
  const cuota = uso ? evaluarCuota(uso) : null;
  const caben = medios.length < LIMITES_DE_MEDIOS.porEjercicio;
  const campos = { tenantSlug: slug, exerciseId: ejercicio.id };

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
          <Icon name="dumbbell" size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-h3">{ejercicio.name}</h2>
            <Badge tone="neutral">{nombreDeGrupoMuscular(ejercicio.muscleGroup)}</Badge>
            {!ejercicio.isActive && <Badge tone="structural">Inactivo</Badge>}
          </div>
          <p className="mt-1 text-[0.86rem] text-muted">{[ejercicio.equipment, ejercicio.description].filter(Boolean).join(' · ') || 'Sin equipo ni descripción'}</p>
        </div>
        <LinkButton href={tenantHref(slug, 'panel/ejercicios')} variant="ghost" size="sm" icon="layers" iconPosition="start">
          Todo el catálogo
        </LinkButton>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-medios">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-medios" className="t-h3">Medios</h2>
            <span className="text-[0.8rem] text-muted">
              {medios.length} de {LIMITES_DE_MEDIOS.porEjercicio}
            </span>
          </div>
          {medios.length === 0 ? (
            <EmptyState className="mt-4" icono="image" titulo="Sin medios" descripcion={puedeGestionar ? 'Agrega una imagen, un GIF, un clip corto o enlaza un vídeo.' : undefined} />
          ) : (
            <ul className="mt-5 grid gap-5 md:grid-cols-2">
              {medios.map((m) => (
                <li key={m.id} className="flex flex-col gap-2">
                  <Medio medio={m} urls={urls} titulo={ejercicio.name} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[0.8rem] text-muted">
                    <span>
                      {NOMBRE_DE_TIPO_DE_MEDIO[m.kind]}
                      {m.kind === 'enlace' && m.provider && m.externalId ? (
                        <>
                          {' · '}
                          <a href={urlDeVideoExterno(m.provider, m.externalId)} target="_blank" rel="noopener noreferrer" className="text-action underline-offset-4 hover:underline">
                            abrir en {m.provider === 'youtube' ? 'YouTube' : 'Vimeo'}
                          </a>
                        </>
                      ) : (
                        ` · ${formatoDeBytes(m.sizeBytes + m.posterSizeBytes)}${m.durationSeconds ? ` · ${Math.round(m.durationSeconds)} s` : ''}`
                      )}
                    </span>
                    {puedeGestionar && (
                      <AccionConEstado
                        accion={eliminarMedio}
                        campos={{ ...campos, medioId: m.id }}
                        etiqueta="Quitar"
                        icono="close"
                        variante="peligro"
                        confirmar="¿Quitar este medio? El archivo se borra y libera espacio."
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card flex flex-col gap-5 p-6 sm:p-7" aria-labelledby="titulo-instrucciones">
          <h2 id="titulo-instrucciones" className="t-h3">Cómo se hace</h2>
          {ejercicio.instructions ? (
            <p className="whitespace-pre-line text-[0.92rem] leading-relaxed text-ink">{ejercicio.instructions}</p>
          ) : (
            <p className="text-[0.88rem] text-muted">Sin instrucciones todavía.</p>
          )}
          {puedeGestionar && (
            <div className="mt-auto border-t border-line pt-5">
              {ejercicio.isActive ? (
                <AccionConEstado accion={desactivarEjercicio} campos={campos} etiqueta="Desactivar ejercicio" icono="archive" variante="peligro" confirmar={`¿Desactivar «${ejercicio.name}»? Sale del catálogo activo; nada se borra.`} className="w-fit" />
              ) : (
                <AccionConEstado accion={activarEjercicio} campos={campos} etiqueta="Activar ejercicio" icono="refresh" variante="primario" className="w-fit" />
              )}
            </div>
          )}
        </section>
      </div>

      {puedeGestionar && (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-agregar">
          <h2 id="titulo-agregar" className="t-h3">Agregar medio</h2>
          {uso && <UsoDeMedios uso={uso} className="mt-4" />}
          {caben ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SubirMedioForm slug={slug} exerciseId={ejercicio.id} restanteBytes={cuota?.restanteBytes ?? 0} />
              <EnlaceDeVideoForm slug={slug} exerciseId={ejercicio.id} />
            </div>
          ) : (
            <p className="mt-4 text-[0.88rem] text-muted">Este ejercicio ya tiene {LIMITES_DE_MEDIOS.porEjercicio} medios. Quita alguno para agregar otro.</p>
          )}
        </section>
      )}

      {puedeGestionar && (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-datos-ejercicio">
          <h2 id="titulo-datos-ejercicio" className="t-h3">Datos del ejercicio</h2>
          <div className="mt-6">
            <EjercicioForm slug={slug} ejercicio={ejercicio} />
          </div>
        </section>
      )}
    </div>
  );
}
