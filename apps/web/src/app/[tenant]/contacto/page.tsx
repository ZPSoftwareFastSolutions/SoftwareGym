import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { publicBranchesRepository } from '@infra/config/composition-root';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { ContactSection } from '@/presentation/sections/ContactSection';
import { ScheduleSection } from '@/presentation/sections/ScheduleSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Contacto');
}

/** Las sedes vienen de la base: se regenera cada cinco minutos (ISR), sin salir del CDN. */
export const revalidate = 300;

export default async function ContactPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { contact, social, features, hours, name, slug, navigation } = tenant;
  const sucursales = features.enableMultiBranch ? await (await publicBranchesRepository()).sucursalesPublicas(slug) : [];
  // Con sedes, cada una lleva su mapa; el mapa único del contacto sobraría.
  const conSucursales = sucursales.length > 0;

  const breadcrumb = navigation.find((n) => n.segment === 'contacto')?.label ?? 'Contacto';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Contacto"
        title="Estamos a un mensaje de distancia"
        lead="Resuelve tus dudas antes de venir, o pasa directamente por recepción: no hace falta reservar."
        breadcrumb={breadcrumb}
      />

      <ContactSection
        contact={contact}
        social={social}
        name={name}
        showForm={features.contactForm}
        showMap={features.showLocationMap && !conSucursales}
      />

      {conSucursales && (
        <BranchesSection
          sucursales={sucursales}
          tenantName={name}
          slug={slug}
          contact={contact}
          contenido={tenant.content.branches}
          presentacion="mapas"
          conMapa={features.showLocationMap}
          eyebrow="Cómo llegar"
        />
      )}

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
