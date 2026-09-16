import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FacilitiesSection } from '@/presentation/sections/FacilitiesSection';
import { GallerySection } from '@/presentation/sections/GallerySection';
import { publicBranchesRepository } from '@infra/config/composition-root';

/**
 * V4.1 · Las sedes vienen de la base para poder repartir las áreas por sucursal
 * (gerencia las edita sin desplegar), así que la página se regenera en segundo
 * plano cada cinco minutos, igual que el inicio y `/sucursales`. Sigue siendo
 * estática: se lee con el cliente anónimo, sin cookies.
 */
export const revalidate = 300;

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Instalaciones');
}

export default async function FacilitiesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showFacilities');
  const { content, features, slug, contact, navigation } = tenant;

  // Sin multisede no hay reparto que hacer: no se consulta.
  const sucursales = features.enableMultiBranch
    ? await (await publicBranchesRepository()).sucursalesPublicas(slug)
    : [];

  const breadcrumb = navigation.find((n) => n.segment === 'instalaciones')?.label ?? 'Instalaciones';

  const totalArea = content.facilities
    .map((f) => Number.parseInt(f.area.replace(/\D/g, ''), 10) || 0)
    .reduce((sum, n) => sum + n, 0);

  // Un gimnasio que todavía no midió sus áreas no anuncia «0 m²»: se describe
  // por lo que tiene (cuántas áreas) en vez de por un número que no entregó.
  const lead =
    totalArea > 0
      ? `${totalArea.toLocaleString('es-BO')} m² distribuidos en áreas con propósito propio: nada de espacios que sirven para todo y no funcionan para nada.`
      : 'Cada área tiene un propósito propio: nada de espacios que sirven para todo y no funcionan para nada.';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Instalaciones"
        title="Cada metro tiene una función"
        lead={lead}
        breadcrumb={breadcrumb}
      />

      <FacilitiesSection
        facilities={content.facilities}
        sucursales={sucursales}
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
