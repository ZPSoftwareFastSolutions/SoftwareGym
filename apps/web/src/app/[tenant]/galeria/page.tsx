import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FacilitiesSection } from '@/presentation/sections/FacilitiesSection';
import { GallerySection } from '@/presentation/sections/GallerySection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Galería');
}

export default async function GalleryPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showGallery');
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'galeria')?.label ?? 'Galería';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Galería"
        title="Mirá antes de venir"
        lead="Las imágenes definitivas se sustituyen por la sesión fotográfica del gimnasio; la composición y el recorrido ya son los definitivos."
        breadcrumb={breadcrumb}
      />

      <GallerySection items={content.gallery} eyebrow="Espacios" title="Recorrido visual" />

      {features.showFacilities && (
        <FacilitiesSection
          facilities={content.facilities}
          eyebrow="Instalaciones"
          title="Qué vas a encontrar"
          layout="grid"
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
