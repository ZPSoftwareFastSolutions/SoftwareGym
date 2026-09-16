import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';
import { TrainingPlansSection } from '@/presentation/sections/TrainingPlansSection';

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
        lead="Lo que ves es lo que pagas. Sin matrícula oculta, sin cargos por cancelar y sin cláusulas que aparecen solo al firmar."
        breadcrumb={breadcrumb}
      />

      <PlansSection
        groups={content.planGroups}
        note={content.plansNote}
        slug={slug}
        eyebrow="Paquetes"
        title="Elige tu paquete"
      />

      {/* Categoría distinta de los paquetes: sección aparte, nunca en la misma
          retícula. Comparar el precio de un programa con el de una mensualidad
          lleva a una conclusión equivocada. */}
      {features.showTrainingPlans && (
        <TrainingPlansSection plans={content.trainingPlans} slug={slug} />
      )}

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
