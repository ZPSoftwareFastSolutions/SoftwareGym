import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { ClassesSection } from '@/presentation/sections/ClassesSection';
import { PageHero } from '@/presentation/layouts/PageHero';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'clases', 'Clases', 'Clases dirigidas con su horario semanal por sede.');
}

export default async function ClasesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showClasses');
  const { content, navigation } = tenant;
  const sedes = ordenarSedes(content.branches?.sedes ?? []);
  const breadcrumb = navigation.find((n) => n.segment === 'clases')?.label ?? 'Clases';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      <PageHero
        slug={tenant.slug}
        eyebrow="Disciplinas"
        title="Domina nuevas habilidades"
        lead="Baile, combate y ritmo. Consulta qué paquetes incluyen cada disciplina."
        breadcrumb={breadcrumb}
      />
      <ClassesSection clases={content.classes} sedes={sedes} slug={tenant.slug} hideTitle={true} />
    </div>
  );
}
