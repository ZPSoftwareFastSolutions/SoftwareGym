import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Planes y membresías');
}

/**
 * Protegida por `showPlans`: si la capacidad está apagada, la ruta devuelve
 * 404. Ocultar el enlace del menú no basta para desactivar una sección.
 */
export default async function PlansPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showPlans');
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'planes')?.label ?? 'Planes';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Planes"
        title="Precios claros, sin letra chica"
        lead="Lo que ves es lo que pagás. Sin matrícula oculta, sin cargos por cancelar y sin cláusulas que aparecen recién al firmar."
        breadcrumb={breadcrumb}
      />

      <PlansSection
        plans={content.plans}
        note={content.plansNote}
        slug={slug}
        eyebrow="Comparativa"
        title="Elegí tu plan"
      />

      {features.showTestimonials && (
        <TestimonialsSection
          testimonials={content.testimonials}
          eyebrow="Antes de decidir"
          title="Qué dicen quienes ya eligieron"
        />
      )}

      {features.showFaq && (
        <FaqSection
          items={content.faq}
          eyebrow="Dudas frecuentes"
          title="Sobre planes y pagos"
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
