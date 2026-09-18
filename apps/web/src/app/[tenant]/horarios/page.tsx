/**
 * CAPA: Presentation / App — Horarios del gimnasio.
 *
 * V4.2 · Dos preguntas en una página: «¿a qué hora abren?» y «¿qué clase hay
 * hoy?». La atención se dice en tramos (como un folleto) con la tabla completa
 * debajo; las clases, por día en pestañas abiertas en hoy. Antes la página solo
 * tenía la tabla de atención y las clases vivían en una lista de siete columnas.
 *
 * Con clases contratadas lee las publicadas de la base con el cliente anónimo:
 * la página sigue siendo estática y se regenera cada cinco minutos (ISR).
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { hoyEnZona } from '@/lib/formato';
import { diaIsoDe } from '@core/domain/operations/classes';
import { publicBranchesRepository, publicClassesRepository } from '@infra/config/composition-root';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { HorarioSemanalDeClases } from '@/presentation/sections/ClassesShowcase';
import { HoursSummarySection } from '@/presentation/sections/HoursSummarySection';
import { ScheduleSection } from '@/presentation/sections/ScheduleSection';
import { LinkButton } from '@/presentation/ui/Button';
import { SectionHeading } from '@/presentation/ui/SectionHeading';

export const revalidate = 300;

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Horarios');
}

export default async function SchedulePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showSchedule');
  const { content, features, hours, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'horarios')?.label ?? 'Horarios';
  const hoyIso = hoyEnZona(hours.timezone);

  const [clases, sedes] = features.enableClasses
    ? await Promise.all([
        (await publicClassesRepository()).clasesPublicas(slug),
        (await publicBranchesRepository()).sucursalesPublicas(slug),
      ])
    : [[], []];
  const conClases = clases.some((c) => c.horarios.length > 0);
  const nombreDeSede = new Map(sedes.map((s) => [s.id, s.name]));
  const multisede = features.enableMultiBranch && sedes.length > 1;

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Horarios"
        title="Ven cuando te quede bien"
        lead={
          conClases
            ? 'A qué hora abrimos cada día y qué clases hay: elige el día y planifica tu semana.'
            : 'Consulta el horario de atención de cada día y planifica tu semana.'
        }
        breadcrumb={breadcrumb}
      />

      <HoursSummarySection hours={hours} slug={slug} conClases={false} conEnlaceAlHorario={false} eyebrow="Atención" title="Cuándo abrimos" />

      {conClases && (
        <section className="section pt-0" aria-labelledby="titulo-clases-por-dia">
          <div className="shell">
            <SectionHeading eyebrow="Clases" title="Qué clase hay cada día" />
            <div className="mt-10">
              <HorarioSemanalDeClases clases={clases} nombreDeSede={nombreDeSede} multisede={multisede} hoy={diaIsoDe(hoyIso)} />
            </div>
            <div className="mt-10">
              <LinkButton href={tenantHref(slug, 'clases')} variant="secondary" size="md" icon="arrowRight">
                Ver todas las clases
              </LinkButton>
            </div>
          </div>
        </section>
      )}

      <ScheduleSection hours={hours} hoy={hoyIso} eyebrow="Detalle" title="Horario de atención día por día" />

      {features.showFaq && (
        <FaqSection items={content.faq} eyebrow="Antes de venir" title="Preguntas sobre horarios y acceso" />
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} showWhatsapp={features.whatsappFloatingButton} />
    </>
  );
}
