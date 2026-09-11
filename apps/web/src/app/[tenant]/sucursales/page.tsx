/**
 * CAPA: Presentation / App — Sucursales del gimnasio (V3.0).
 *
 * Todas las sedes con su mapa, horario, contacto y texto de vitrina. Es la
 * página a la que llevan los chips del inicio y las tarjetas de la portada
 * (`#sede-CODE`).
 *
 * Capacidad `enableMultiBranch`: apagada, la ruta responde 404 aunque alguien
 * escriba la URL. Las sedes vienen de la base con el cliente anónimo, así que
 * la página sigue siendo estática y se regenera cada cinco minutos (ISR).
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { publicBranchesRepository } from '@infra/config/composition-root';
import { PageHero } from '@/presentation/layouts/PageHero';
import { Icon } from '@/presentation/icons/Icon';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { LinkButton } from '@/presentation/ui/Button';

export const revalidate = 300;

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Sucursales', 'Nuestras sedes, con dirección, horario y cómo llegar. Una sola membresía para entrenar en todas.');
}

export default async function SucursalesPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'enableMultiBranch');
  const { content, contact, features, name, slug, navigation } = tenant;
  const sucursales = await (await publicBranchesRepository()).sucursalesPublicas(slug);

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

      {sucursales.length > 1 && (
        <nav aria-label="Ir a una sede" className="shell -mt-4 lg:-mt-8">
          <ul className="flex flex-wrap gap-2.5">
            {sucursales.map((sucursal) => (
              <li key={sucursal.id}>
                <a
                  href={`#sede-${sucursal.code}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-raised px-4 text-[0.9rem] font-semibold text-ink transition-colors hover:border-action hover:text-action"
                >
                  <Icon name="pin" size={15} className="text-action" />
                  {sucursal.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {sucursales.length > 0 ? (
        <BranchesSection
          sucursales={sucursales}
          tenantName={name}
          slug={slug}
          contact={contact}
          contenido={content.branches}
          presentacion="detalle"
          conMapa={features.showLocationMap}
          conEncabezado={false}
        />
      ) : (
        // Sin sedes publicadas (o sin respuesta de la base en el último
        // regenerado) se ofrece el contacto, no una página vacía.
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
