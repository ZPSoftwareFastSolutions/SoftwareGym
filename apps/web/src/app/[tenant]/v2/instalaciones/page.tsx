import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSectionV2 } from '@/presentation/sections/v2/ClosingCtaSectionV2';
import { FacilitiesSectionV2 } from '@/presentation/sections/v2/FacilitiesSectionV2';
import { GallerySectionV2 } from '@/presentation/sections/v2/GallerySectionV2';
import { ordenarSedes } from '@core/domain/catalog/branches';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Instalaciones');
}

export default async function V2FacilitiesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showFacilities');
  const { content, features, slug, contact, navigation } = tenant;

  const sedes = features.showBranches ? ordenarSedes(content.branches?.sedes ?? []) : [];
  const breadcrumb = navigation.find((n) => n.segment === 'instalaciones')?.label ?? 'Instalaciones';

  const totalArea = content.facilities
    .map((f) => Number.parseInt(f.area.replace(/\D/g, ''), 10) || 0)
    .reduce((sum, n) => sum + n, 0);

  const lead =
    totalArea > 0
      ? `${totalArea.toLocaleString('es-BO')} m² distribuidos en áreas con propósito propio: nada de espacios que sirven para todo y no funcionan para nada.`
      : 'Cada área tiene un propósito propio: nada de espacios que sirven para todo y no funcionan para nada.';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <PageHero
        slug={`${slug}/v2`}
        eyebrow="Instalaciones"
        title="Cada metro tiene una función"
        lead={lead}
        breadcrumb={breadcrumb}
      />

      <div className="bg-black/60 backdrop-blur-md py-10">
        <FacilitiesSectionV2
          facilities={content.facilities}
          sucursales={sedes}
          eyebrow="Recorrido"
          title="Conoce cada área"
        />
      </div>

      {features.showGallery && (
        <div className="bg-black/40 backdrop-blur-md py-10">
          <GallerySectionV2
            items={content.gallery.slice(0, 4)}
            eyebrow="Galería rápida"
            title="Un vistazo por dentro"
          />
        </div>
      )}

      <ClosingCtaSectionV2 cta={content.closingCta} contact={contact} slug={slug} />
    </div>
  );
}
