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
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { hoyEnZona } from '@/lib/formato';
import { diaIsoDe } from '@core/domain/operations/classes';
import { publicBranchesRepository, publicClassesRepository } from '@infra/config/composition-root';
import { PageHero } from '@/presentation/layouts/PageHero';
import { Icon } from '@/presentation/icons/Icon';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { CatalogoDeClases, HorarioSemanalDeClases } from '@/presentation/sections/ClassesShowcase';
import { LinkButton } from '@/presentation/ui/Button';
import { SectionHeading } from '@/presentation/ui/SectionHeading';
import { BotonReservaVitrina } from '@/presentation/sections/BotonReservaVitrina';

export const revalidate = 300;

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Clases', 'Clases grupales con horario semanal por sede y los paquetes que las incluyen.');
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

  const conHorarios = clases.some((c) => c.horarios.length > 0);
  // «Hoy» del gimnasio al regenerar la página (ISR de cinco minutos).
  const hoy = diaIsoDe(hoyEnZona(tenant.hours.timezone));

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Clases grupales"
        title="Entrena en grupo"
        lead={`Las clases de ${name}, con su horario de cada semana${multisede ? ' y la sede donde se dan' : ''}. Mira qué paquete incluye la que te gusta.`}
        breadcrumb={breadcrumb}
      >
        {features.enableReservations && features.memberLogin && (
          <BotonReservaVitrina slug={slug} />
        )}
      </PageHero>

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
              <CatalogoDeClases clases={clases} slug={slug} nombreDeSede={nombreDeSede} multisede={multisede} />
            </div>
          </section>

          {conHorarios && (
            <section id="horario-semanal" className="section scroll-mt-24 pt-0" aria-labelledby="titulo-horario-semanal">
              <div className="shell">
                <SectionHeading
                  eyebrow="Semana"
                  title="Horario de clases"
                  lead={`Elige el día. Se repite cada semana; si una clase se suspende, lo avisamos en recepción y en redes.${
                    features.enableReservations && features.memberLogin ? ' Si ya eres socio, reserva tu lugar desde tu panel: el cupo es limitado.' : ''
                  }`}
                />
                <div className="mt-10">
                  <HorarioSemanalDeClases clases={clases} nombreDeSede={nombreDeSede} multisede={multisede} hoy={hoy} />
                </div>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
