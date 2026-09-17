import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSectionV2 } from '@/presentation/sections/v2/ClosingCtaSectionV2';
import { FacilitiesSectionV2 } from '@/presentation/sections/v2/FacilitiesSectionV2';
import { GallerySectionV2 } from '@/presentation/sections/v2/GallerySectionV2';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Galería');
}

export default async function V2GalleryPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showGallery');
  const { content, features, slug, contact, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'galeria')?.label ?? 'Galería';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <PageHero
        slug={`${slug}/v2`}
        eyebrow="Galería"
        title="Mira antes de venir"
        lead="Las imágenes definitivas se sustituyen por la sesión fotográfica del gimnasio; la composición y el recorrido ya son los definitivos."
        breadcrumb={breadcrumb}
      />

      <div className="bg-black/60 backdrop-blur-md py-10">
        <GallerySectionV2 items={content.gallery} eyebrow="Espacios" title="Recorrido visual" />
      </div>

      {features.showFacilities && (
        <div className="bg-black/40 backdrop-blur-md py-10">
          <FacilitiesSectionV2
            facilities={content.facilities}
            eyebrow="Instalaciones"
            title="Qué vas a encontrar"
          />
        </div>
      )}

      <ClosingCtaSectionV2 cta={content.closingCta} contact={contact} slug={slug} />
    </div>
  );
}
