import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { AboutSectionV2 } from '@/presentation/sections/v2/AboutSectionV2';
import { TeamSection } from '@/presentation/sections/TeamSection';
import { TestimonialsSectionV2 } from '@/presentation/sections/v2/TestimonialsSectionV2';
import { ClosingCtaSectionV2 } from '@/presentation/sections/v2/ClosingCtaSectionV2';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Nosotros');
}

export default async function V2AboutPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'nosotros')?.label ?? 'Nosotros';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <PageHero
        slug={`${slug}/v2`}
        eyebrow={content.about.eyebrow}
        title={content.about.title}
        lead={content.about.lead}
        breadcrumb={breadcrumb}
      />

      <AboutSectionV2 about={content.about} />

      {features.showTeam && (
        <div className="bg-black/60 backdrop-blur-md py-10">
          <TeamSection
            team={content.team}
            lead="Cada profesional del equipo tiene certificación vigente y revisa sus programas de forma periódica."
          />
        </div>
      )}

      {features.showTestimonials && (
        <TestimonialsSectionV2 testimonials={content.testimonials} />
      )}

      <ClosingCtaSectionV2 cta={content.closingCta} contact={contact} slug={slug} />
    </div>
  );
}
