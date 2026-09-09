import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ContactSection } from '@/presentation/sections/ContactSection';
import { ScheduleSection } from '@/presentation/sections/ScheduleSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Contacto');
}

export default async function ContactPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { contact, social, features, hours, name, slug, navigation } = tenant;

  const breadcrumb = navigation.find((n) => n.segment === 'contacto')?.label ?? 'Contacto';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Contacto"
        title="Estamos a un mensaje de distancia"
        lead="Resolvé tus dudas antes de venir, o pasá directamente por recepción: no hace falta reservar."
        breadcrumb={breadcrumb}
      />

      <ContactSection
        contact={contact}
        social={social}
        name={name}
        showForm={features.contactForm}
        showMap={features.showLocationMap}
      />

      {features.showSchedule && (
        <ScheduleSection
          hours={hours}
          eyebrow="Cuándo venir"
          title="Horario de atención"
          lead="Si vas a pasar por primera vez, te recomendamos evitar la franja de mayor concurrencia."
        />
      )}
    </>
  );
}
