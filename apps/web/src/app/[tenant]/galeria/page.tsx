import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FacilitiesSection } from '@/presentation/sections/FacilitiesSection';
import { GallerySection } from '@/presentation/sections/GallerySection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'galeria', 'Galería');
}

export default async function GalleryPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showGallery');
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'galeria')?.label ?? 'Galería';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <PageHero
        slug={slug}
        eyebrow="Galería"
        title="Mira antes de venir"
        lead="Un recorrido por los espacios del gimnasio. Pronto con las fotografías de nuestras sedes."
        breadcrumb={breadcrumb}
      />

      <div className="bg-black/60 backdrop-blur-md py-10">
        <GallerySection items={content.gallery} eyebrow="Espacios" title="Recorrido visual" />
      </div>

      {features.showFacilities && (
        <div className="bg-black/40 backdrop-blur-md py-10">
          <FacilitiesSection
            facilities={content.facilities}
            eyebrow="Instalaciones"
            title="Qué vas a encontrar"
          />
        </div>
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} />
    </div>
  );
}
