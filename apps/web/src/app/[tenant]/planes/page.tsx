import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { TrainingPlansSection } from '@/presentation/sections/TrainingPlansSection';
import { ProductsSection } from '@/presentation/sections/ProductsSection';
import { Reveal } from '@/presentation/ui/Reveal';
import { PageHero } from '@/presentation/layouts/PageHero';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'planes', 'Planes y membresías');
}

export default async function PlanesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showPlans');
  const { content, slug, contact, features, navigation } = tenant;
  const breadcrumb = navigation.find((n) => n.segment === 'planes')?.label ?? 'Planes';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      <PageHero
        slug={slug}
        eyebrow="Planes"
        title="Invierte en tu versión mítica"
        lead="Selecciona el paquete que mejor se adapte a tus objetivos."
        breadcrumb={breadcrumb}
      />
      <PlansSection groups={content.planGroups} note={content.plansNote} slug={slug} hideTitle={true} />
      
      {content.trainingPlans && content.trainingPlans.length > 0 && (
        <TrainingPlansSection plans={content.trainingPlans} slug={slug} />
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
          <ProductsSection categories={content.products} contact={contact} slug={tenant.slug} />
        </div>
      )}
    </div>
  );
}
