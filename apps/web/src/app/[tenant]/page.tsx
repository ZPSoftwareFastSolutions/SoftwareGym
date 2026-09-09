/**
 * CAPA: Presentation / App — Inicio del gimnasio.
 *
 * La página compone secciones y NO decide nada por su cuenta: cada bloque se
 * muestra si la feature flag correspondiente lo permite y con los datos que
 * trae la configuración. Es idéntica para todos los gimnasios.
 */

import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { HeroSection } from '@/presentation/sections/HeroSection';
import { MarqueeStrip } from '@/presentation/sections/MarqueeStrip';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { ServicesSection } from '@/presentation/sections/ServicesSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';

export default async function TenantHomePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, features, slug, contact } = tenant;

  return (
    <>
      <HeroSection hero={content.hero} slug={slug} />

      <MarqueeStrip items={content.services.map((s) => s.name)} />

      <ServicesSection
        services={content.services}
        slug={slug}
        limit={3}
        showCta={content.services.length > 3}
        lead="Un mismo lugar para entrenar fuerza, mejorar tu condición física y recuperarte bien."
      />

      {features.showPlans && (
        <PlansSection
          plans={content.plans}
          note={content.plansNote}
          slug={slug}
          lead="Sin matrícula, sin permanencia mínima y con la primera semana de cortesía."
        />
      )}

      {features.showTestimonials && <TestimonialsSection testimonials={content.testimonials} />}

      {features.showFaq && <FaqSection items={content.faq.slice(0, 4)} />}

      <ClosingCtaSection
        cta={content.closingCta}
        contact={contact}
        slug={slug}
        showWhatsapp={features.whatsappFloatingButton}
      />
    </>
  );
}
