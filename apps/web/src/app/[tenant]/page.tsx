/**
 * CAPA: Presentation / App — Inicio del gimnasio.
 *
 * La página compone secciones y NO decide nada por su cuenta: cada bloque se
 * muestra si la feature flag correspondiente lo permite y con los datos que
 * trae la configuración. Es idéntica para todos los gimnasios.
 */

import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { cobroDeTenant } from '@/lib/cobro';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { HeroSection } from '@/presentation/sections/HeroSection';
import { MarqueeStrip } from '@/presentation/sections/MarqueeStrip';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { ProductsSection } from '@/presentation/sections/ProductsSection';
import { ServicesSection } from '@/presentation/sections/ServicesSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';

export default async function TenantHomePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const cobro = cobroDeTenant(tenant);
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
          cobro={cobro}
          // El inicio muestra solo la familia principal: la comparativa
          // completa vive en /planes. Una portada con todo el tarifario
          // obliga a decidir antes de haber terminado de leer quiénes somos.
          groups={content.planGroups.slice(0, 1)}
          note={content.plansNote}
          slug={slug}
          lead="Elige el paquete que se adapta a ti. Sin permanencia mínima."
        />
      )}

      {features.showProducts && (
        <ProductsSection categories={content.products} contact={contact} />
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
