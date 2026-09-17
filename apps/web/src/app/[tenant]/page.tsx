import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { HeroSection } from '@/presentation/sections/HeroSection';
import { ServicesSection } from '@/presentation/sections/ServicesSection';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { TrainingPlansSection } from '@/presentation/sections/TrainingPlansSection';
import { MarqueeStrip } from '@/presentation/sections/MarqueeStrip';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { ClassesSection } from '@/presentation/sections/ClassesSection';
import { ProductsSection } from '@/presentation/sections/ProductsSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';

export default async function TenantHomePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, features, slug, contact } = tenant;
  const sedes = features.showBranches ? ordenarSedes(content.branches?.sedes ?? []) : [];

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <HeroSection hero={content.hero} slug={slug} sedes={sedes.map((s) => s.name)} />
      
      <MarqueeStrip
        items={[
          ...content.services.map((s) => s.name),
          ...(sedes.length > 1 ? sedes.map((s) => `Sede ${s.name}`) : []),
        ]}
      />

      <div className="h-10 lg:h-20" />

      <ServicesSection services={content.services.slice(0, 3)} />
      
      <div className="h-10 lg:h-20" />

      <BranchesSection sedes={sedes} slug={slug} />

      <div className="h-10 lg:h-20" />

      {features.showPlans && (
        <>
          <PlansSection groups={content.planGroups.slice(0, 1)} note={content.plansNote} slug={slug} />
          {content.trainingPlans && content.trainingPlans.length > 0 && (
            <div className="-mt-10">
              <TrainingPlansSection plans={content.trainingPlans} slug={slug} />
            </div>
          )}
        </>
      )}
      
      <div className="h-10 lg:h-20" />

      {features.showClasses && (
        <ClassesSection clases={content.classes.slice(0, 3)} sedes={sedes} slug={slug} />
      )}

      {features.showProducts && (
        <ProductsSection categories={content.products.slice(0, 3)} contact={contact} slug={slug} />
      )}

      {features.showTestimonials && (
        <TestimonialsSection testimonials={content.testimonials} />
      )}

      {features.showFaq && (
        <FaqSection items={content.faq.slice(0, 4)} />
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} />
      
    </div>
  );
}
