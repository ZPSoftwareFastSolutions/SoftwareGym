import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { HeroSectionV2 } from '@/presentation/sections/v2/HeroSectionV2';
import { ServicesSectionV2 } from '@/presentation/sections/v2/ServicesSectionV2';
import { PlansSectionV2 } from '@/presentation/sections/v2/PlansSectionV2';
import { TrainingPlansSectionV2 } from '@/presentation/sections/v2/TrainingPlansSectionV2';
import { MarqueeStripV2 } from '@/presentation/sections/v2/MarqueeStripV2';
import { BranchesSectionV2 } from '@/presentation/sections/v2/BranchesSectionV2';
import { ClassesSectionV2 } from '@/presentation/sections/v2/ClassesSectionV2';
import { ProductsSectionV2 } from '@/presentation/sections/v2/ProductsSectionV2';
import { TestimonialsSectionV2 } from '@/presentation/sections/v2/TestimonialsSectionV2';
import { FaqSectionV2 } from '@/presentation/sections/v2/FaqSectionV2';
import { ClosingCtaSectionV2 } from '@/presentation/sections/v2/ClosingCtaSectionV2';

export default async function TenantHomePageV2({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, features, slug, contact } = tenant;
  const sedes = features.showBranches ? ordenarSedes(content.branches?.sedes ?? []) : [];

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <HeroSectionV2 hero={content.hero} slug={slug} sedes={sedes.map((s) => s.name)} />
      
      <MarqueeStripV2
        items={[
          ...content.services.map((s) => s.name),
          ...(sedes.length > 1 ? sedes.map((s) => `Sede ${s.name}`) : []),
        ]}
      />

      <div className="h-10 lg:h-20" />

      <ServicesSectionV2 services={content.services.slice(0, 3)} />
      
      <div className="h-10 lg:h-20" />

      <BranchesSectionV2 sedes={sedes} slug={slug} />

      <div className="h-10 lg:h-20" />

      {features.showPlans && (
        <>
          <PlansSectionV2 groups={content.planGroups.slice(0, 1)} note={content.plansNote} slug={slug} />
          {content.trainingPlans && content.trainingPlans.length > 0 && (
            <div className="-mt-10">
              <TrainingPlansSectionV2 plans={content.trainingPlans} slug={slug} />
            </div>
          )}
        </>
      )}
      
      <div className="h-10 lg:h-20" />

      {features.showClasses && (
        <ClassesSectionV2 clases={content.classes.slice(0, 3)} sedes={sedes} slug={slug} />
      )}

      {features.showProducts && (
        <ProductsSectionV2 categories={content.products.slice(0, 3)} contact={contact} slug={slug} />
      )}

      {features.showTestimonials && (
        <TestimonialsSectionV2 testimonials={content.testimonials} />
      )}

      {features.showFaq && (
        <FaqSectionV2 items={content.faq.slice(0, 4)} />
      )}

      <ClosingCtaSectionV2 cta={content.closingCta} contact={contact} slug={slug} />
      
    </div>
  );
}
