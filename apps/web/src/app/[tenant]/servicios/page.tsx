import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ServicesSection } from '@/presentation/sections/ServicesSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'servicios', 'Servicios');
}

export default async function ServiciosPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, navigation } = tenant;
  const breadcrumb = navigation.find((n) => n.segment === 'servicios')?.label ?? 'Servicios';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      {/* Sin este encabezado la página no tenía h1: los buscadores y los
          lectores de pantalla no sabían de qué trataba. */}
      <PageHero
        slug={tenant.slug}
        eyebrow="Servicios"
        title="Todo lo que ofrecemos"
        lead="Entrenamiento personalizado, clases dirigidas, nutrición y suplementación."
        breadcrumb={breadcrumb}
      />
      <ServicesSection services={content.services} />
    </div>
  );
}
