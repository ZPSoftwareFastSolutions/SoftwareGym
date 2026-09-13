/**
 * CAPA: Presentation / App — Clases del gimnasio en la vitrina (V3.3).
 *
 * Las clases que gerencia publica, con su horario semanal por sede y los planes
 * que las incluyen. Sirve para vender: quien mira «Baile fitness» ve qué paquete
 * lo trae y va directo a pagarlo.
 *
 * Capacidad `enableClasses`: apagada, 404. Los datos vienen de la base con el
 * cliente anónimo (RLS: solo clases activas y marcadas como públicas), así que
 * la página sigue siendo estática y se regenera cada cinco minutos (ISR). No
 * enseña ocupación ni instructor: eso es operación, no vitrina.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import {
  DIAS_ISO,
  horaDeFin,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_MODO_DE_ACCESO,
  NOMBRE_DE_NIVEL_DE_CLASE,
  type ClasePublica,
} from '@core/domain/operations/classes';
import { publicBranchesRepository, publicClassesRepository } from '@infra/config/composition-root';
import { PageHero } from '@/presentation/layouts/PageHero';
import { Icon } from '@/presentation/icons/Icon';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';

export const revalidate = 300;

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Clases', 'Clases grupales con horario semanal por sede y los paquetes que las incluyen.');
}

function Acceso({ clase, slug }: { readonly clase: ClasePublica; readonly slug: string }) {
  if (clase.accessMode !== 'planes') {
    return <p className="text-[0.84rem] text-muted">{clase.accessMode === 'membresia' ? 'Incluida en todos los paquetes.' : NOMBRE_DE_MODO_DE_ACCESO.abierta}</p>;
  }
  if (clase.planes.length === 0) return <p className="text-[0.84rem] text-muted">Consulta en recepción qué paquete la incluye.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted">Incluida en</p>
      <ul className="flex flex-wrap gap-2">
        {clase.planes.map((p) => (
          <li key={p.id}>
            <Link
              href={tenantHref(slug, 'planes')}
              className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[0.82rem] text-ink transition-colors hover:border-action hover:text-action"
            >
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ClasesPublicasPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'enableClasses');
  const { content, contact, features, name, slug, navigation } = tenant;
  const [clases, sedes] = await Promise.all([
    (await publicClassesRepository()).clasesPublicas(slug),
    (await publicBranchesRepository()).sucursalesPublicas(slug),
  ]);

  const nombreDeSede = new Map(sedes.map((s) => [s.id, s.name]));
  const multisede = features.enableMultiBranch && sedes.length > 1;
  const breadcrumb = navigation.find((n) => n.segment === 'clases')?.label ?? 'Clases';

  // Horario de la semana: todas las franjas de todas las clases, por día.
  const semana = DIAS_ISO.map((dia) => ({
    dia,
    franjas: clases
      .flatMap((c) => c.horarios.filter((h) => h.weekday === dia).map((h) => ({ ...h, clase: c.name, id: `${c.id}-${h.weekday}-${h.startTime}-${h.branchId}` })))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })).filter((d) => d.franjas.length > 0);

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Clases grupales"
        title="Entrena en grupo"
        lead={`Las clases de ${name}, con su horario de cada semana${multisede ? ' y la sede donde se dan' : ''}. Mira qué paquete incluye la que te gusta.`}
        breadcrumb={breadcrumb}
      />

      {clases.length === 0 ? (
        <section className="section">
          <div className="shell">
            <div className="surface-card flex flex-col items-center gap-4 p-10 text-center">
              <Icon name="group" size={32} className="text-action" />
              <p className="t-h3">Estamos armando el calendario de clases</p>
              <p className="max-w-md text-muted">Escríbenos y te contamos qué clases hay esta semana.</p>
              <LinkButton href={tenantHref(slug, 'contacto')} variant="primary" size="md" icon="arrowRight">
                Contacto
              </LinkButton>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="section pt-0" aria-labelledby="titulo-catalogo-publico">
            <div className="shell">
              <h2 id="titulo-catalogo-publico" className="sr-only">
                Nuestras clases
              </h2>
              <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {clases.map((clase) => (
                  <li key={clase.id} id={`clase-${clase.id}`} className="surface-card flex scroll-mt-28 flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-action">{NOMBRE_DE_CATEGORIA[clase.category]}</p>
                        <h3 className="t-h3 mt-1">{clase.name}</h3>
                      </div>
                      {clase.kind === 'evento' && <Badge tone="action">Evento</Badge>}
                    </div>
                    {clase.description && <p className="leading-relaxed text-muted">{clase.description}</p>}
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.84rem] text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="clock" size={15} className="text-action" /> {clase.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="star" size={15} className="text-action" /> {NOMBRE_DE_NIVEL_DE_CLASE[clase.level]}
                      </span>
                    </p>
                    {clase.horarios.length > 0 && (
                      <ul className="flex flex-col gap-1.5 border-t border-line pt-3 text-[0.86rem]">
                        {clase.horarios.map((h) => (
                          <li key={`${h.weekday}-${h.startTime}-${h.branchId}`} className="flex flex-wrap justify-between gap-2">
                            <span className="text-ink">
                              {NOMBRE_DE_DIA_ISO[h.weekday]} · {h.startTime} – {horaDeFin(h.startTime, h.durationMinutes)}
                            </span>
                            {multisede && <span className="text-muted">{nombreDeSede.get(h.branchId) ?? ''}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto">
                      <Acceso clase={clase} slug={slug} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {semana.length > 0 && (
            <section className="section pt-0" aria-labelledby="titulo-horario-semanal">
              <div className="shell">
                <h2 id="titulo-horario-semanal" className="t-h2">
                  Horario de la semana
                </h2>
                <p className="mt-3 max-w-2xl text-muted">
                  Se repite cada semana. Si una clase se suspende un día, lo avisamos en recepción y en redes.
                  {features.enableReservations && features.memberLogin ? ' Si ya eres socio, reserva tu lugar desde tu panel: el cupo es limitado y quien reservó tiene prioridad.' : ''}
                </p>
                <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {semana.map(({ dia, franjas }) => (
                    <li key={dia} className="surface-card flex flex-col gap-3 p-5">
                      <p className="font-semibold text-ink">{NOMBRE_DE_DIA_ISO[dia]}</p>
                      <ul className="flex flex-col gap-2">
                        {franjas.map((f) => (
                          <li key={f.id} className="flex flex-col rounded-[var(--t-radius-sm)] bg-raised px-3 py-2">
                            <span className="text-[0.9rem] font-semibold text-ink">
                              {f.startTime} · {f.clase}
                            </span>
                            <span className="text-[0.78rem] text-muted">
                              hasta las {horaDeFin(f.startTime, f.durationMinutes)}
                              {multisede ? ` · ${nombreDeSede.get(f.branchId) ?? ''}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap gap-3">
                  <LinkButton href={tenantHref(slug, 'planes')} variant="primary" size="md" icon="arrowRight">
                    Ver paquetes
                  </LinkButton>
                  {features.enableReservations && features.memberLogin && (
                    <LinkButton href={tenantHref(slug, 'panel/socio')} variant="secondary" size="md" icon="calendar">
                      Reservar mi lugar
                    </LinkButton>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} showWhatsapp={features.whatsappFloatingButton} />
    </>
  );
}
