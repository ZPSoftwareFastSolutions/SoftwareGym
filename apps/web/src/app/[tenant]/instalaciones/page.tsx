import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FacilitiesSection } from '@/presentation/sections/FacilitiesSection';
import { GallerySection } from '@/presentation/sections/GallerySection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Instalaciones');
}

export default async function FacilitiesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showFacilities');
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'instalaciones')?.label ?? 'Instalaciones';

  const totalArea = content.facilities
    .map((f) => Number.parseInt(f.area.replace(/\D/g, ''), 10) || 0)
    .reduce((sum, n) => sum + n, 0);

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Instalaciones"
        title="Cada metro tiene una función"
        lead={`${totalArea.toLocaleString('es-BO')} m² distribuidos en áreas con propósito propio: nada de espacios que sirven para todo y no funcionan para nada.`}
        breadcrumb={breadcrumb}
      />

      <FacilitiesSection
        facilities={content.facilities}
        eyebrow="Recorrido"
        title="Conoce cada área"
        layout="rows"
      />

      {features.showGallery && (
        <GallerySection
          items={content.gallery.slice(0, 4)}
          eyebrow="Galería"
          title="Así se ve por dentro"
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
