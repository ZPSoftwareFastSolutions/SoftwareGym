/**
 * CAPA: Presentation / App — Inicio del gimnasio.
 *
 * La página compone secciones y NO decide nada por su cuenta: cada bloque se
 * muestra si la capacidad correspondiente lo permite y con los datos que trae la
 * configuración.
 *
 * V4.2 · EL ORDEN ES DATO DEL GIMNASIO. Hasta aquí el orden de las secciones
 * estaba escrito en esta página, igual para todos, y por eso un gimnasio nuevo
 * solo podía distinguirse por su paleta. Ahora lo declara su configuración
 * (`home`): estilo de portada, secciones y presentación de los planes. Quien no
 * declara nada recibe la composición clásica, que es exactamente la de antes.
 * No hay ningún condicional por cliente: la página recorre una lista.
 */

import type { ReactNode } from 'react';
import { composicionDe, seccionesVisibles, type SeccionDePortada } from '@core/domain/tenant/home-layout';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { cobroDeTenant } from '@/lib/cobro';
import { publicAnnouncementsRepository, publicBranchesRepository } from '@infra/config/composition-root';
import { AnnouncementsHeroSection } from '@/presentation/sections/AnnouncementsHeroSection';
import { AnnouncementsSection } from '@/presentation/sections/AnnouncementsSection';
import { BranchesSection } from '@/presentation/sections/BranchesSection';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FacilitiesSection } from '@/presentation/sections/FacilitiesSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { GallerySection } from '@/presentation/sections/GallerySection';
import { HeroSection } from '@/presentation/sections/HeroSection';
import { HoursSummarySection } from '@/presentation/sections/HoursSummarySection';
import { MarqueeStrip } from '@/presentation/sections/MarqueeStrip';
import { PlansSection } from '@/presentation/sections/PlansSection';
import { ProductsSection } from '@/presentation/sections/ProductsSection';
import { ServicesSection } from '@/presentation/sections/ServicesSection';
import { TestimonialsSection } from '@/presentation/sections/TestimonialsSection';

/**
 * V3.0 · Las sedes vienen de la base (gerencia las edita sin desplegar), así
 * que la portada se regenera en segundo plano cada cinco minutos (ISR). Sigue
 * siendo estática: el cliente anónimo no lee cookies.
 */
export const revalidate = 300;

export default async function TenantHomePage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const cobro = cobroDeTenant(tenant);
  const { content, features, slug, contact } = tenant;
  const composicion = composicionDe(tenant.home);

  const sucursales = features.enableMultiBranch ? await (await publicBranchesRepository()).sucursalesPublicas(slug) : [];
  const anuncios = features.enableAnnouncements
    ? await (await publicAnnouncementsRepository()).anunciosPublicos(slug)
    : [];

  // Un bloque por sección. Solo se construye el que la lista pide: el resto no
  // existe en el árbol, ni siquiera oculto.
  const bloque: Readonly<Record<SeccionDePortada, () => ReactNode>> = {
    // V4.1 · Lo primero bajo la portada clásica, cuando el gimnasio comunica
    // por anuncios. La sección no se dibuja sin anuncios publicados.
    anuncios: () => <AnnouncementsSection anuncios={anuncios} />,

    marquesina: () => (
      <MarqueeStrip
        items={[
          ...content.services.map((s) => s.name),
          // Con varias sedes, la franja también las nombra: se lee sin buscar.
          ...(sucursales.length > 1 ? sucursales.map((s) => `Sede ${s.name}`) : []),
        ]}
      />
    ),

    servicios: () => (
      <ServicesSection
        services={content.services}
        slug={slug}
        limit={3}
        showCta={content.services.length > 3}
        lead="Un mismo lugar para entrenar fuerza, mejorar tu condición física y recuperarte bien."
      />
    ),

    // Con varias sedes, «dónde» decide tanto como «cuánto».
    sucursales: () => (
      <BranchesSection
        sucursales={sucursales}
        tenantName={tenant.name}
        slug={slug}
        contact={contact}
        contenido={content.branches}
        presentacion="portada"
      />
    ),

    planes: () =>
      composicion.planes === 'tarifario' ? (
        // Un tarifario se lee comparando precios de arriba abajo: van todas las
        // familias, también los planes largos.
        <PlansSection
          cobro={cobro}
          groups={content.planGroups}
          note={content.plansNote}
          slug={slug}
          estilo="tarifario"
          title="Planes y tarifas"
          lead="Precios en bolivianos. Elige el tuyo y págalo con QR o en recepción."
        />
      ) : (
        <PlansSection
          cobro={cobro}
          // La portada clásica muestra solo la familia principal: la
          // comparativa completa vive en /planes.
          groups={content.planGroups.slice(0, 1)}
          note={content.plansNote}
          slug={slug}
          lead="Elige el paquete que se adapta a ti. Sin permanencia mínima."
        />
      ),

    horarios: () => (
      <HoursSummarySection hours={tenant.hours} slug={slug} conClases={features.enableClasses === true} />
    ),

    // Con sedes, en pestañas; sin ellas, una sola lista (lo decide la sección).
    instalaciones: () => (
      <FacilitiesSection
        facilities={content.facilities}
        sucursales={sucursales}
        eyebrow="Instalaciones"
        title="Cada sucursal, sus espacios"
        layout="grid"
      />
    ),

    'por-dentro': () => <GallerySection items={content.gallery} eyebrow="Galería" title="Así se ve por dentro" />,

    productos: () => <ProductsSection categories={content.products} contact={contact} />,

    testimonios: () => <TestimonialsSection testimonials={content.testimonials} />,

    preguntas: () => <FaqSection items={content.faq.slice(0, 4)} />,

    cierre: () => (
      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} showWhatsapp={features.whatsappFloatingButton} />
    ),
  };

  return (
    <>
      {composicion.estilo === 'anuncios' ? (
        <AnnouncementsHeroSection
          hero={content.hero}
          slug={slug}
          anuncios={features.enableAnnouncements ? anuncios : []}
          sedes={sucursales.map((s) => s.name)}
        />
      ) : (
        <HeroSection hero={content.hero} slug={slug} sedes={sucursales.map((s) => s.name)} />
      )}

      {seccionesVisibles(composicion, features).map((seccion) => (
        <SeccionDeLaPortada key={seccion}>{bloque[seccion]()}</SeccionDeLaPortada>
      ))}
    </>
  );
}

/** Envoltorio sin marcado: solo da la `key` a cada bloque de la lista. */
function SeccionDeLaPortada({ children }: { readonly children: ReactNode }) {
  return <>{children}</>;
}
