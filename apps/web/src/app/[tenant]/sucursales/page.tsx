import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { PageHero } from '@/presentation/layouts/PageHero';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'sucursales', 'Sucursales', 'Nuestras sedes, con dirección, horario y cómo llegar.');
}

export default async function SucursalesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showBranches');
  const { content, slug, navigation } = tenant;
  const sedes = ordenarSedes(content.branches?.sedes ?? []);
  const breadcrumb = navigation.find((n) => n.segment === 'sucursales')?.label ?? 'Sucursales';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      <PageHero
        slug={slug}
        eyebrow="Sucursales"
        title="Donde tú estés"
        lead={content.branches?.lead ?? 'Nuestras sedes, con dirección, horario y cómo llegar.'}
        breadcrumb={breadcrumb}
      />
      <BranchesSection sedes={sedes} slug={slug} />
    </div>
  );
}
