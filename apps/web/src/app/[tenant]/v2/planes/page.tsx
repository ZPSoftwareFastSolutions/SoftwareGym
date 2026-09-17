import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { PlansSectionV2 } from '@/presentation/sections/v2/PlansSectionV2';
import { TrainingPlansSectionV2 } from '@/presentation/sections/v2/TrainingPlansSectionV2';
import { ProductsSectionV2 } from '@/presentation/sections/v2/ProductsSectionV2';
import { Reveal } from '@/presentation/ui/Reveal';
import { PageHero } from '@/presentation/layouts/PageHero';

export default async function V2PlanesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, slug, contact, features, navigation } = tenant;
  const breadcrumb = navigation.find((n) => n.segment === 'planes')?.label ?? 'Planes';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      <PageHero
        slug={`${slug}/v2`}
        eyebrow="Planes"
        title="Invierte en tu versión mítica"
        lead="Selecciona el paquete que mejor se adapte a tus objetivos."
        breadcrumb={breadcrumb}
      />
      <PlansSectionV2 groups={content.planGroups} note={content.plansNote} slug={slug} hideTitle={true} />
      
      {content.trainingPlans && content.trainingPlans.length > 0 && (
        <TrainingPlansSectionV2 plans={content.trainingPlans} slug={slug} />
      )}

      {features.showProducts && (
        <div className="mt-24">
          <div className="shell text-center mb-10">
            <Reveal>
              <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">Venta Directa</h2>
              <h3 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
                Suplementación y Accesorios
              </h3>
              <p className="mt-4 text-white/70 max-w-2xl mx-auto">
                Todo lo que necesitas para potenciar tu entrenamiento, disponible en recepción.
              </p>
            </Reveal>
          </div>
          <ProductsSectionV2 categories={content.products} contact={contact} slug={tenant.slug} />
        </div>
      )}
    </div>
  );
}
