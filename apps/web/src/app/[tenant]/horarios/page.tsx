import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { ScheduleSection } from '@/presentation/sections/ScheduleSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Horarios');
}

export default async function SchedulePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showSchedule');
  const { content, features, hours, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'horarios')?.label ?? 'Horarios';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Horarios"
        title="Ven cuando te quede bien"
        lead="Consulta el horario de atención de cada día y planifica tu semana."
        breadcrumb={breadcrumb}
      />

      <ScheduleSection hours={hours} eyebrow="Semana" title="Horario de atención" />

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
