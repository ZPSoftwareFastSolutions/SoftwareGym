/**
 * CAPA: Presentation / App — Sucursales del gimnasio.
 *
 * Todas las sedes con su mapa, horario, contacto y texto de vitrina. Es la
 * página a la que llevan los chips del inicio y las tarjetas de la portada
 * (`#sede-CODE`).
 *
 * Capacidad `showBranches`: apagada, la ruta responde 404 aunque alguien
 * escriba la URL. Las sedes salen del archivo del gimnasio: la página es
 * estática y no consulta nada.
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { PageHero } from '@/presentation/layouts/PageHero';
import { Icon } from '@/presentation/icons/Icon';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { LinkButton } from '@/presentation/ui/Button';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Sucursales', 'Nuestras sedes, con dirección, horario y cómo llegar. Una sola membresía para entrenar en todas.');
}

export default async function SucursalesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'showBranches');
  const { content, contact, features, name, slug, navigation } = tenant;
  const sedes = ordenarSedes(content.branches?.sedes ?? []);

  const breadcrumb = navigation.find((n) => n.segment === 'sucursales')?.label ?? 'Sucursales';
  const titulo = content.branches
    ? [content.branches.title, content.branches.titleAccent].filter(Boolean).join(' ')
    : 'Nuestras sucursales';

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow={content.branches?.eyebrow ?? 'Sucursales'}
        title={titulo}
        lead={content.branches?.lead ?? `Todas las sedes de ${name}, con dirección, horario y cómo llegar.`}
        breadcrumb={breadcrumb}
      />

      {sedes.length > 1 && (
        <nav aria-label="Ir a una sede" className="shell -mt-4 lg:-mt-8">
          <ul className="flex flex-wrap gap-2.5">
            {sedes.map((sede) => (
              <li key={sede.code}>
                <a
                  href={`#sede-${sede.code}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-raised px-4 text-[0.9rem] font-semibold text-ink transition-colors hover:border-action hover:text-action"
                >
                  <Icon name="pin" size={15} className="text-action" />
                  {sede.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {sedes.length > 0 ? (
        <BranchesSection
          sedes={sedes}
          tenantName={name}
          slug={slug}
          contact={contact}
          contenido={content.branches}
          presentacion="detalle"
          conMapa={features.showLocationMap}
          conEncabezado={false}
        />
      ) : (
        // El validador del build no deja encender `showBranches` sin sedes, así
        // que esto no debería verse nunca. Se conserva porque una página en
        // blanco sería la peor forma de enterarse de que ocurrió.
        <section className="section">
          <div className="shell">
            <div className="surface-card flex flex-col items-center gap-4 p-10 text-center">
              <Icon name="pin" size={32} className="text-action" />
              <p className="t-h3">Estamos actualizando nuestras sedes</p>
              <p className="max-w-md text-muted">Escríbenos y te decimos dónde entrenar hoy.</p>
              <LinkButton href={tenantHref(slug, 'contacto')} variant="primary" size="md" icon="arrowRight">
                Contacto
              </LinkButton>
            </div>
          </div>
        </section>
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} showWhatsapp={features.whatsappFloatingButton} />
    </>
  );
}
