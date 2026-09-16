import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { PageHero } from '@/presentation/layouts/PageHero';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { ContactSection } from '@/presentation/sections/ContactSection';
import { ScheduleSection } from '@/presentation/sections/ScheduleSection';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Contacto');
}

export default async function ContactPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { contact, social, features, hours, name, slug, navigation } = tenant;
  const sedes = features.showBranches ? ordenarSedes(tenant.content.branches?.sedes ?? []) : [];
  // Con sedes, cada una lleva su mapa; el mapa único del contacto sobraría.
  const conSucursales = sedes.length > 0;

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
          sedes={sedes}
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
          sedes={sedes}
          eyebrow="Cuándo venir"
          title="Horario de atención"
          lead="Si vas a pasar por primera vez, te recomendamos evitar la franja de mayor concurrencia."
        />
      )}
    </>
  );
}
