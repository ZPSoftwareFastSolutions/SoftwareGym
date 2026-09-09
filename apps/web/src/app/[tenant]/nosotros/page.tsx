import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { AboutSection } from '@/presentation/sections/AboutSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { TeamSection } from '@/presentation/sections/TeamSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Nosotros');
}

export default async function AboutPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, features, slug, contact, navigation } = tenant;

  // El rótulo de la migaja sale de la propia navegación configurada: Mítico
  // dice "Nosotros" y Aurora dice "El estudio" sin tocar esta página.
  const breadcrumb = navigation.find((n) => n.segment === 'nosotros')?.label ?? 'Nosotros';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow={content.about.eyebrow}
        title={content.about.title}
        lead={content.about.lead}
        breadcrumb={breadcrumb}
      />

      <AboutSection about={content.about} />

      {features.showTeam && (
        <TeamSection
          team={content.team}
          lead="Cada profesional del equipo tiene certificación vigente y revisa sus programas de forma periódica."
        />
      )}

      {features.showTestimonials && (
        <TestimonialsSection
          testimonials={content.testimonials}
          title="Historias de quienes se quedaron"
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
