import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { ServicesSection } from '@/presentation/sections/ServicesSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Servicios');
}

export default async function ServicesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'servicios')?.label ?? 'Servicios';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Servicios"
        title="Entrená con método, no por intuición"
        lead="Cada servicio tiene su propio espacio, su equipamiento y sus profesionales. Nada está improvisado."
        breadcrumb={breadcrumb}
      />

      <ServicesSection
        services={content.services}
        slug={slug}
        detailed
        eyebrow="Qué ofrecemos"
        title="Servicios disponibles"
      />

      {features.showPlans && (
        <PlansSection
          plans={content.plans}
          note={content.plansNote}
          slug={slug}
          eyebrow="Membresías"
          title="¿Qué servicios incluye cada plan?"
        />
      )}

      {features.showFaq && <FaqSection items={content.faq} />}

      <ClosingCtaSection
        cta={content.closingCta}
        contact={contact}
        slug={slug}
        showWhatsapp={features.whatsappFloatingButton}
      />
    </>
  );
}
