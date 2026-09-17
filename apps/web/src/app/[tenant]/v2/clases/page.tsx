import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { ClassesSectionV2 } from '@/presentation/sections/v2/ClassesSectionV2';
import { PageHero } from '@/presentation/layouts/PageHero';

export default async function V2ClasesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, navigation } = tenant;
  const sedes = ordenarSedes(content.branches?.sedes ?? []);
  const breadcrumb = navigation.find((n) => n.segment === 'clases')?.label ?? 'Clases';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      <PageHero
        slug={`${tenant.slug}/v2`}
        eyebrow="Disciplinas"
        title="Domina nuevas habilidades"
        lead="Baile, combate y ritmo, incluidos en tu membresía."
        breadcrumb={breadcrumb}
      />
      <ClassesSectionV2 clases={content.classes} sedes={sedes} slug={tenant.slug} hideTitle={true} />
    </div>
  );
}
