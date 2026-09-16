/**
 * CAPA: Presentation / App — Inicio del gimnasio.
 *
 * La página compone secciones y NO decide nada por su cuenta: cada bloque se
 * muestra si la feature flag correspondiente lo permite y con los datos que
 * trae la configuración. Es idéntica para todos los gimnasios.
 *
 * ES ESTÁTICA DE VERDAD. No hay `revalidate` ni consulta a nada: todo lo que
 * pinta —sedes, paquetes, clases— vive en el archivo del gimnasio y se resuelve
 * en el build. La página se sirve desde el CDN como un archivo.
 */

import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { ClassesSection } from '@/presentation/sections/ClassesSection';
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
  const { content, features, slug, contact } = tenant;

  const sedes = features.showBranches ? ordenarSedes(content.branches?.sedes ?? []) : [];

  return (
    <>
      <HeroSection hero={content.hero} slug={slug} sedes={sedes.map((s) => s.name)} />

      <MarqueeStrip
        items={[
          ...content.services.map((s) => s.name),
          // Con varias sedes, la franja también las nombra: se lee sin buscar.
          ...(sedes.length > 1 ? sedes.map((s) => `Sede ${s.name}`) : []),
        ]}
      />

      <ServicesSection
        services={content.services}
        slug={slug}
        limit={3}
        showCta={content.services.length > 3}
        lead="Un mismo lugar para entrenar fuerza, mejorar tu condición física y recuperarte bien."
      />

      {/* Justo después de «qué ofrecemos», antes de los precios: con varias
          sedes, «dónde» decide tanto como «cuánto». */}
      <BranchesSection
        sedes={sedes}
        tenantName={tenant.name}
        slug={slug}
        contact={contact}
        contenido={content.branches}
        presentacion="portada"
      />

      {features.showPlans && (
        <PlansSection
          // El inicio muestra solo la familia principal: la comparativa
          // completa vive en /planes. Una portada con todo el tarifario
          // obliga a decidir antes de haber terminado de leer quiénes somos.
          groups={content.planGroups.slice(0, 1)}
          note={content.plansNote}
          slug={slug}
          lead="Elige el paquete que se adapta a ti. Sin permanencia mínima."
        />
      )}

      {features.showClasses && (
        <ClassesSection
          clases={content.classes}
          sedes={sedes}
          limit={3}
          lead="Baile, combate y ritmo, incluidos en los paquetes que los traen. El horario completo está en la página de clases."
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
