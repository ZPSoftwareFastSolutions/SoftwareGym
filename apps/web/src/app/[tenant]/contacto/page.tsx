import { Suspense } from 'react';
import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { ordenarSedes } from '@core/domain/catalog/branches';
import { ClosingCtaSection } from '@/presentation/sections/ClosingCtaSection';
import { FaqSection } from '@/presentation/sections/FaqSection';
import { ContactForm } from '@/presentation/sections/ContactForm';
import { ScheduleTabs } from '@/presentation/sections/ScheduleTabs';
import { PageHero } from '@/presentation/layouts/PageHero';
import { Reveal } from '@/presentation/ui/Reveal';
import { Icon } from '@/presentation/icons/Icon';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Contacto');
}

export default async function ContactoPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params);
  const { content, contact, slug, name, navigation, hours, features } = tenant;
  const sedes = features.showBranches ? ordenarSedes(content.branches?.sedes ?? []) : [];
  const breadcrumb = navigation.find((n) => n.segment === 'contacto')?.label ?? 'Contacto';

  return (
    <div className="relative flex flex-col min-h-screen z-10 bg-transparent pb-10">
      <PageHero
        slug={slug}
        eyebrow="Contacto"
        title="Estamos a un mensaje de distancia"
        lead="Resuelve tus dudas antes de venir, o pasa directamente por recepción: no hace falta reservar."
        breadcrumb={breadcrumb}
      />

      <section className="shell max-w-7xl mx-auto py-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 items-start">
          <Reveal>
            <div className="flex flex-col gap-8">
              <Reveal>
                <div className="flex flex-col gap-4">
                  <a href={`tel:${contact.phone.replace(/\D/g, '')}`} className="surface-card group flex min-h-16 items-center gap-4 p-5 rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 transition-colors hover:border-action/40 backdrop-blur-md">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-muted transition-colors group-hover:bg-action/10 group-hover:text-action">
                      <Icon name="phone" size={20} />
                    </span>
                    <div>
                      <p className="t-eyebrow">Teléfono</p>
                      <p className="mt-1 font-bold text-white">{contact.phone}</p>
                    </div>
                  </a>

                  {contact.whatsapp && (
                    <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="surface-card group flex min-h-16 items-center gap-4 p-5 rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 transition-colors hover:border-action/40 backdrop-blur-md">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-muted transition-colors group-hover:bg-action/10 group-hover:text-action">
                        <Icon name="whatsapp" size={20} />
                      </span>
                      <div>
                        <p className="t-eyebrow">WhatsApp</p>
                        <p className="mt-1 font-bold text-white">{contact.phone}</p>
                      </div>
                    </a>
                  )}

                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="surface-card group flex min-h-16 items-center gap-4 p-5 rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 transition-colors hover:border-action/40 backdrop-blur-md">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-muted transition-colors group-hover:bg-action/10 group-hover:text-action">
                        <Icon name="mail" size={20} />
                      </span>
                      <div>
                        <p className="t-eyebrow">Correo</p>
                        <p className="mt-1 font-bold text-white break-all">{contact.email}</p>
                      </div>
                    </a>
                  )}
                </div>
              </Reveal>

              <Reveal delay={100}>
                <div className="surface-card flex flex-col gap-6 p-6 sm:p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action/10 text-action">
                      <Icon name="pin" size={20} />
                    </span>
                    <div>
                      <p className="t-eyebrow">Dónde estamos</p>
                      <p className="mt-2 text-lg font-bold text-white">{contact.addressLine}</p>
                      <p className="text-muted">{contact.city}, {contact.country}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </Reveal>

          <Reveal delay={100}>
            {/* El formulario lee `?interes=` de la URL con useSearchParams. Sin este
                límite, Next no puede prerenderizar la página y el build se cae. El
                hueco reservado evita que el resto salte al hidratar. */}
            <Suspense fallback={<div className="min-h-[36rem] rounded-3xl border border-white/10 bg-black/40" />}>
              <ContactForm contact={contact} name={name} sedes={sedes} />
            </Suspense>
          </Reveal>
        </div>
      </section>

      {features.showSchedule && (
        <section className="shell max-w-7xl mx-auto py-20 relative border-t border-white/10">
          <Reveal>
            <h3 className="text-3xl font-black text-white mb-6 text-center" style={{ fontFamily: 'var(--t-font-display)' }}>
              Cuándo venir
            </h3>
            <p className="text-center text-white/60 max-w-2xl mx-auto mb-12">
              Si vas a pasar por primera vez, te recomendamos evitar la franja de mayor concurrencia.
            </p>
          </Reveal>
          <ScheduleTabs 
            classes={content.classes} 
            hours={hours.week} 
            sedes={sedes} 
          />
        </section>
      )}

      <ClosingCtaSection cta={content.closingCta} contact={contact} slug={slug} />
      
      <div className="mt-20">
        <FaqSection items={content.faq} />
      </div>
    </div>
  );
}
