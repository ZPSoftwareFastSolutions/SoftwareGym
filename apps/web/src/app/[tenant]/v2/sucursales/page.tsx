import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { PageHero } from '@/presentation/layouts/PageHero';

export default async function V2SucursalesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, slug, name, contact, navigation, features } = tenant;
  const sedes = ordenarSedes(content.branches?.sedes ?? []);
  const breadcrumb = navigation.find((n) => n.segment === 'sucursales')?.label ?? 'Sucursales';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      <PageHero
        slug={`${slug}/v2`}
        eyebrow="Sucursales"
        title="Donde tú estés"
        lead="Varias sucursales con una sola membresía."
        breadcrumb={breadcrumb}
      />
      <BranchesSection
        sedes={sedes}
        tenantName={name}
        slug={`${slug}/v2`}
        contact={contact}
        contenido={content.branches}
        presentacion="detalle"
        conMapa={features.showLocationMap}
      />
    </div>
  );
}
