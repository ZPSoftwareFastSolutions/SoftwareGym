/**
 * CAPA: Presentation / App — Clases dirigidas.
 *
 * Las clases del gimnasio con su horario semanal por sede. Sirve para vender:
 * quien mira «Baile urbano» ve qué días se dicta, en qué sucursal y con qué
 * paquete entra.
 *
 * Capacidad `showClasses`: apagada, la ruta responde 404 aunque alguien escriba
 * la URL. No enseña cupo, instructor ni reserva: eso es operación, y este sitio
 * no opera nada. Todo sale del archivo del gimnasio, así que la página es
 * estática.
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ClassScheduleSection, ClassesSection } from '@/presentation/sections/ClassesSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { PlansSection } from '@/presentation/sections/PlansSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(
    params,
    'Clases',
    'Clases dirigidas con su horario semanal por sede y los paquetes que las incluyen.',
  );
}

export default async function ClasesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showClasses');
  const { content, contact, features, name, slug, navigation } = tenant;

  const sedes = ordenarSedes(content.branches?.sedes ?? []);
  const multisede = features.showBranches && sedes.length > 1;
  const breadcrumb = navigation.find((n) => n.segment === 'clases')?.label ?? 'Clases';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Clases dirigidas"
        title="Entrena en grupo"
        lead={`Las clases de ${name}, con su horario de cada semana${multisede ? ' y la sede donde se dictan' : ''}. Mira qué paquete incluye la que te gusta.`}
        breadcrumb={breadcrumb}
      />

      <ClassesSection
        clases={content.classes}
        sedes={sedes}
        eyebrow="Catálogo"
        title="Qué clases hay"
        lead="Cada clase indica su nivel, sus días y su horario. Las disciplinas de baile entran con los paquetes Dance y Mítico."
      />

      <ClassScheduleSection
        clases={content.classes}
        sedes={sedes}
        lead={multisede ? 'Cada sucursal tiene su propia agenda: elige la pestaña de la sede donde vas a entrenar.' : undefined}
      />

      {features.showPlans && (
        <PlansSection
          groups={content.planGroups}
          note={content.plansNote}
          slug={slug}
          eyebrow="Con qué paquete entro"
          title="Paquetes que incluyen clases"
          lead="Las disciplinas de baile van dentro de la membresía: no se pagan aparte."
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
