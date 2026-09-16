/**
 * CAPA: Presentation / App — Anuncios del gimnasio (V4.1).
 *
 * Capacidad `enableAnnouncements` + permiso `content.manage`: sin la capacidad,
 * 404 (el gimnasio no la contrató); sin el permiso, de vuelta a su panel.
 *
 * La pantalla es la LISTA de lo publicado, con el estado de cada anuncio
 * calculado en el dominio («programado», «vencido», «retirado»): quien entra
 * quiere ver de un vistazo qué está saliendo en la vitrina ahora mismo. Crear y
 * editar ocurren en un modal encima.
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import {
  estadoDeAnuncio,
  NOMBRE_DE_ESTADO_DE_ANUNCIO,
  NOMBRE_DE_TIPO_DE_ANUNCIO,
  resumenDeTarjeta,
} from '@core/domain/operations/announcements';
import { PERMISO } from '@core/domain/operations/workspace';
import { announcementsRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { AnuncioForm } from '@/presentation/patterns/AnuncioForm';
import { ArtFrame } from '@/presentation/ui/ArtFrame';
import { Badge } from '@/presentation/ui/Badge';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso, fechaCorta } from '../_datos';
import { retirarAnuncio, republicarAnuncio } from './actions';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Anuncios');
}

export default async function AnunciosPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'enableAnnouncements');
  const { slug } = tenant;
  await exigirPermiso(slug, PERMISO.gestionarContenido);

  const repo = await announcementsRepository();
  const anuncios = await repo.listar();
  const ahora = new Date();
  const publicados = anuncios.filter((a) => estadoDeAnuncio(a, ahora) === 'publicado').length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">Anuncios</h1>
          <p className="t-lead mt-2">
            {publicados === 0
              ? 'Nada publicado ahora mismo: el inicio del sitio no muestra el carrusel.'
              : `${publicados} ${publicados === 1 ? 'anuncio visible' : 'anuncios visibles'} en el inicio del sitio.`}
          </p>
        </div>

        <Modal
          titulo="Nuevo anuncio"
          descripcion="Aparecerá en el carrusel del inicio según su prioridad."
          anchoMaximo="lg"
          montarSoloAbierto
          disparador={
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 font-semibold text-on-action transition-colors hover:bg-action-strong"
            >
              <Icon name="plus" size={17} />
              Nuevo anuncio
            </button>
          }
        >
          <AnuncioForm slug={slug} />
        </Modal>
      </header>

      {anuncios.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay anuncios"
          descripcion="Publica el primero: una clase nueva, un evento o una promoción. Aparecerá en el inicio del sitio, con su detalle completo al tocarlo."
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {anuncios.map((anuncio, indice) => {
            const estado = estadoDeAnuncio(anuncio, ahora);
            const url = repo.urlDeImagen(anuncio.imagePath);

            return (
              <li key={anuncio.id} className="surface-card flex flex-col overflow-hidden">
                <ArtFrame
                  seed={indice * 31 + 7}
                  {...(url ? { src: url } : {})}
                  alt={anuncio.imageAlt ?? ''}
                  icon="sparkle"
                  ratio="16 / 9"
                  className="w-full"
                />

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={estado === 'publicado' ? 'action' : 'neutral'}>
                      {NOMBRE_DE_ESTADO_DE_ANUNCIO[estado]}
                    </Badge>
                    <Badge tone="neutral">{NOMBRE_DE_TIPO_DE_ANUNCIO[anuncio.kind]}</Badge>
                    <span className="text-[0.75rem] text-muted">Prioridad {anuncio.sortOrder}</span>
                  </div>

                  <h2 className="t-h3 mt-3 text-[1.02rem] leading-snug">{anuncio.title}</h2>
                  <p className="mt-2 flex-1 text-[0.86rem] leading-relaxed text-muted">
                    {resumenDeTarjeta(anuncio)}
                  </p>

                  <p className="mt-4 text-[0.76rem] text-muted">
                    Publicado el {fechaCorta(anuncio.publishedAt)}
                    {anuncio.expiresAt && ` · hasta el ${fechaCorta(anuncio.expiresAt)}`}
                  </p>

                  <div className="mt-5 flex flex-wrap items-start gap-3">
                    <Modal
                      titulo="Editar anuncio"
                      descripcion={anuncio.title}
                      anchoMaximo="lg"
                      montarSoloAbierto
                      disparador={
                        <button
                          type="button"
                          className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] border border-line px-4 text-[0.86rem] font-semibold text-ink transition-colors hover:border-action hover:text-action"
                        >
                          <Icon name="edit" size={16} />
                          Editar
                        </button>
                      }
                    >
                      <AnuncioForm slug={slug} anuncio={anuncio} />
                    </Modal>

                    {anuncio.isActive ? (
                      <AccionConEstado
                        accion={retirarAnuncio}
                        campos={{ tenantSlug: slug, anuncioId: anuncio.id }}
                        etiqueta="Retirar"
                        icono="close"
                        variante="peligro"
                        confirmar="¿Retirar este anuncio de la vitrina? Podrás volver a publicarlo cuando quieras."
                      />
                    ) : (
                      <AccionConEstado
                        accion={republicarAnuncio}
                        campos={{ tenantSlug: slug, anuncioId: anuncio.id }}
                        etiqueta="Publicar"
                        icono="check"
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
