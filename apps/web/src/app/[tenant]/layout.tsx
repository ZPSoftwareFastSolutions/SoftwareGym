/**
 * CAPA: Presentation / App (layout de tenant)
 *
 * ESTE ARCHIVO ES LA BISAGRA DEL SOFTWARE ENLATADO.
 *
 * Resuelve el gimnasio a partir de la URL, inyecta su tema y monta el armazón
 * (cabecera, pie, WhatsApp). Todo lo que hay por debajo es idéntico para
 * cualquier cliente: ninguna página sabe qué gimnasio está renderizando.
 *
 * Es un Server Component: la resolución del tenant, el filtrado por feature
 * flags y la generación del tema ocurren en el servidor y no envían un solo
 * byte de JavaScript al navegador.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { browserColorScheme, buildThemeVariables } from '@core/application/theming/build-theme';
import { getTenantBySlug, listTenantSlugs, visibleNavigation } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';
import { SiteFooter } from '@/presentation/patterns/SiteFooter';
import { SiteHeader } from '@/presentation/patterns/SiteHeader';
import { WhatsAppFab } from '@/presentation/patterns/WhatsAppFab';

interface TenantLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ tenant: string }>;
}

/**
 * Prerenderiza en el build una copia estática del sitio por cada gimnasio
 * aprovisionado. Cada cliente obtiene un sitio servido desde CDN, con TTFB de
 * archivo estático, sin necesitar una instancia por tenant.
 */
export async function generateStaticParams() {
  const slugs = await listTenantSlugs(tenantRepository());
  return slugs.map((tenant) => ({ tenant }));
}

export async function generateMetadata({ params }: TenantLayoutProps): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug);

  if (!tenant) return { title: 'Gimnasio no encontrado' };

  const { seo, name, contact } = tenant;

  return {
    title: { default: seo.title, template: seo.titleTemplate },
    description: seo.description,
    keywords: [...seo.keywords],
    applicationName: name,
    openGraph: {
      type: 'website',
      siteName: name,
      title: seo.title,
      description: seo.description,
      locale: seo.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
    alternates: { canonical: `/${tenant.slug}` },
    other: {
      'contact:phone_number': contact.phone,
      'contact:email': contact.email,
    },
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(tenantRepository(), slug);

  // Un slug inexistente responde 404 real, no una página vacía con el armazón.
  if (!tenant) notFound();

  const navigation = visibleNavigation(tenant.navigation, tenant.features);
  const themeCss = buildThemeVariables(tenant.branding);
  const heroCta = tenant.content.hero.primaryCta;

  return (
    <div
      data-tenant={tenant.slug}
      data-theme={tenant.branding.mode}
      className="min-h-svh bg-surface text-ink"
      style={{ colorScheme: browserColorScheme(tenant.branding) }}
    >
      {/*
        Los tokens del tenant se declaran en `:root`, no solo en este subárbol.

        Cada página pertenece a exactamente un gimnasio, así que no hay
        conflicto posible entre temas. Acotarlos al <div> dejaba fuera a <body>,
        que pinta el fondo de la página y el área de sobredesplazamiento: un
        tenant de tema claro aparecía sobre fondo oscuro.

        El selector de atributo se mantiene para poder inspeccionar el tema
        activo desde las herramientas del navegador.

        Todos los valores pasaron por `parseCssColor` y por la validación de
        tipografía en `tenant.validator`: nada llega crudo desde la
        configuración hasta esta etiqueta <style>.
      */}
      <style
        // eslint-disable-next-line react/no-danger -- contenido generado y
        // validado en el servidor; no hay entrada de usuario en esta cadena.
        dangerouslySetInnerHTML={{
          __html: `:root,[data-tenant="${tenant.slug}"]{${themeCss}}`,
        }}
      />

      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <SiteHeader
        slug={tenant.slug}
        name={tenant.name}
        logo={tenant.branding.logo}
        navigation={navigation}
        ctaLabel={heroCta.label}
        ctaSegment={heroCta.segment}
        showLogin={tenant.features.memberLogin}
      />

      <main id="contenido">{children}</main>

      <SiteFooter tenant={tenant} navigation={navigation} />

      {tenant.features.whatsappFloatingButton && (
        <WhatsAppFab contact={tenant.contact} name={tenant.name} />
      )}
    </div>
  );
}
