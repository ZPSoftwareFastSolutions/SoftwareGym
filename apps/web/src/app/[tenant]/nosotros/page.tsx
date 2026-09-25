import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { AboutSection } from '@/presentation/sections/AboutSection';
import { TeamSection } from '@/presentation/sections/TeamSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'nosotros', 'Nosotros');
}

export default async function AboutPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'nosotros')?.label ?? 'Nosotros';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <PageHero
        slug={slug}
        eyebrow={content.about.eyebrow}
        title={content.about.title}
        lead={content.about.lead}
        breadcrumb={breadcrumb}
      />

      <AboutSection about={content.about} />

      {features.showTeam && (
        <div className="bg-black/60 backdrop-blur-md py-10">
          <TeamSection
            team={content.team}
            lead="Cada profesional del equipo tiene certificación vigente y revisa sus programas de forma periódica."
          />
        </div>
      )}

      {features.showTestimonials && (
        <TestimonialsSection testimonials={content.testimonials} />
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} />
    </div>
  );
}
