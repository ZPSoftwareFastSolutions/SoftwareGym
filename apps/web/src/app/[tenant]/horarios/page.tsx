/**
 * CAPA: Presentation / App — Horarios.
 *
 * Dos cosas distintas que la gente confunde y aquí van separadas: a qué hora
 * SE PUEDE ENTRAR al gimnasio (horario de atención, propio de cada sede) y a
 * qué hora EMPIEZA CADA CLASE (agenda semanal, también por sede). Mezclarlas en
 * una sola tabla es lo que obliga a preguntar en recepción.
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClassScheduleSection } from '@/presentation/sections/ClassesSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { ScheduleSection } from '@/presentation/sections/ScheduleSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(
    params,
    'Horarios',
    'Horario de atención de cada sede y agenda semanal de clases dirigidas.',
  );
}

export default async function SchedulePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showSchedule');
  const { content, features, hours, slug, contact, navigation } = tenant;

  const sedes = features.showBranches ? ordenarSedes(content.branches?.sedes ?? []) : [];
  const multisede = sedes.length > 1;
  const breadcrumb = navigation.find((n) => n.segment === 'horarios')?.label ?? 'Horarios';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Horarios"
        title="Ven cuando te quede bien"
        lead={
          multisede
            ? 'Cada sucursal tiene su propio horario de atención. Consulta el de la sede donde vas a entrenar y planifica tu semana.'
            : 'Consulta el horario de atención de cada día y planifica tu semana.'
        }
        breadcrumb={breadcrumb}
      />

      <ScheduleSection
        hours={hours}
        sedes={sedes}
        eyebrow="Atención"
        title="Horario de atención"
        lead={multisede ? 'A qué hora abre y cierra cada sede.' : undefined}
      />

      {features.showClasses && (
        <ClassScheduleSection
          clases={content.classes}
          sedes={sedes}
          eyebrow="Clases"
          title="Agenda semanal de clases"
          lead="A qué hora empieza cada disciplina. Se repite todas las semanas."
        />
      )}

      {features.showFaq && (
        <FaqSection
          items={content.faq}
          eyebrow="Antes de venir"
          title="Preguntas sobre horarios y acceso"
        />
      )}

      <ClosingCtaSection
        cta={content.closingCta}
        contact={contact}
        slug={slug}
        showWhatsapp={features.whatsappFloatingButton}
      />
    </>
  );
}
