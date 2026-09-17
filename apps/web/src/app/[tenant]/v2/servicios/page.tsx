import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { ServicesSectionV2 } from '@/presentation/sections/v2/ServicesSectionV2';

export default async function V2ServiciosPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content } = tenant;

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pt-24 pb-10">
      <ServicesSectionV2 services={content.services} />
    </div>
  );
}
