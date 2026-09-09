/**
 * CAPA: Presentation / App — Acceso de socios.
 *
 * El formulario es funcional desde V2: autentica contra Supabase Auth con la
 * sesión en cookies `HttpOnly`, gestionada por las acciones de servidor de
 * `actions.ts`. Esta página solo compone; no toma ninguna decisión de acceso.
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref, whatsappHref } from '@/lib/tenant-links';
import { AccessForm } from '@/presentation/patterns/AccessForm';
import { Icon } from '@/presentation/icons/Icon';
import { PageHero } from '@/presentation/layouts/PageHero';
import { LinkButton } from '@/presentation/ui/Button';
import { Reveal } from '@/presentation/ui/Reveal';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Acceso socios');
}

const UPCOMING = [
  { icon: 'calendar' as const, title: 'Tu rutina al día', text: 'Consulta la rutina vigente y el historial de cargas.' },
  { icon: 'clock' as const, title: 'Estado de membresía', text: 'Fecha de vencimiento, pagos y comprobantes.' },
  { icon: 'group' as const, title: 'Reserva de clases', text: 'Cupos en tiempo real y lista de espera.' },
  { icon: 'heart' as const, title: 'Progreso medido', text: 'Composición corporal y evolución por período.' },
];

interface AccessPageProps extends TenantPageParams {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MemberAccessPage({ params, searchParams }: AccessPageProps) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { name, slug, contact } = tenant;

  // Lo deja la ruta de retorno del enlace de confirmación (`/auth/confirmar`).
  const { confirmado } = await searchParams;
  const confirmacion =
    confirmado === '1' ? ('ok' as const) : confirmado === '0' ? ('fallo' as const) : undefined;

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Portal del socio"
        title="Acceso socios"
        lead={`Entra al portal de ${name} para ver tu membresía, tus pagos y tu asistencia.`}
        breadcrumb="Acceso"
      />

      <section className="section pt-0" aria-labelledby="acceso-title">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <Reveal>
              <div>
                <h2 id="acceso-title" className="sr-only">
                  Acceso de socios
                </h2>

                <AccessForm slug={slug} gymName={name} confirmacion={confirmacion} />

                <div className="mt-8 flex flex-col gap-3 border-t border-line pt-7">
                  <p className="text-[0.88rem] text-muted">
                    ¿Necesitas algo ahora? Escríbenos y lo resolvemos hoy.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <LinkButton
                      href={whatsappHref(contact)}
                      external
                      icon="whatsapp"
                      iconPosition="start"
                      size="md"
                    >
                      WhatsApp
                    </LinkButton>
                    <LinkButton href={tenantHref(slug, 'contacto')} variant="secondary" size="md">
                      Ver contacto
                    </LinkButton>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={110}>
              <div>
                <h2 className="t-h2">Qué vas a poder hacer</h2>
                <p className="t-lead mt-4">
                  El portal llega con el módulo de gestión. Estas son las capacidades previstas
                  para la primera entrega.
                </p>

                <ul className="mt-9 grid gap-4 sm:grid-cols-2">
                  {UPCOMING.map((item) => (
                    <li key={item.title} className="surface-card flex flex-col gap-3 p-6">
                      <span
                        aria-hidden="true"
                        className="grid h-11 w-11 place-items-center rounded-[var(--t-radius-md)] bg-structural/25 text-action"
                      >
                        <Icon name={item.icon} size={20} />
                      </span>
                      <h3 className="text-[1.02rem] font-bold text-ink">{item.title}</h3>
                      <p className="text-[0.88rem] leading-relaxed text-muted">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
