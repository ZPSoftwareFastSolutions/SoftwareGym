import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { ServicesSection } from '@/presentation/sections/ServicesSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Servicios');
}

export default async function ServiciosPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content } = tenant;

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pt-24 pb-10">
      <ServicesSection services={content.services} />
    </div>
  );
}
