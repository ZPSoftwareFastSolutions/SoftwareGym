import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { ScheduleTabs } from '@/presentation/sections/ScheduleTabs';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(
    params,
    'Horarios',
    'Horario de atención de cada sede y agenda semanal de clases dirigidas.',
  );
}

export default async function SchedulePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showSchedule');
  const { content, features, hours, slug, contact, navigation } = tenant;

  const sedes = features.showBranches ? ordenarSedes(content.branches?.sedes ?? []) : [];
  const multisede = sedes.length > 1;
  const breadcrumb = navigation.find((n) => n.segment === 'horarios')?.label ?? 'Horarios';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent">
      <PageHero
        slug={slug}
        eyebrow="Horarios"
        title="Ven cuando te quede bien"
        lead={
          multisede
            ? 'Cada sucursal tiene su propio horario de atención. Consulta el de la sede donde vas a entrenar y planifica tu semana.'
            : 'Consulta el horario de atención de cada día y planifica tu semana.'
        }
        breadcrumb={breadcrumb}
      />

      <ScheduleTabs 
        classes={content.classes} 
        hours={hours.week} 
        sedes={sedes} 
      />

      {features.showFaq && (
        <div className="mt-20">
          <FaqSection items={content.faq.filter((f) => f.tags?.includes('horarios'))} />
        </div>
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} />
    </div>
  );
}
