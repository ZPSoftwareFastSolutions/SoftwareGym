/**
 * CAPA: Presentation / App — Acceso de socios (adelanto de V2).
 *
 * DECISIÓN DELIBERADA: en V1 no existe autenticación. Este formulario está
 * DESHABILITADO y no envía a ningún sitio.
 *
 * Un formulario de acceso que acepta una contraseña y no la valida contra nada
 * es peor que no tenerlo: entrena al socio a escribir su clave en una pantalla
 * que no la protege, y crea la expectativa de una sesión que no existe. Los
 * campos van con `disabled`, sin `action` y con un aviso explícito.
 *
 * Cuando llegue la autenticación real (V2), esta página cambia el formulario
 * por el flujo con JWT y refresh token rotativo en cookie `HttpOnly`.
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref, whatsappHref } from '@/lib/tenant-links';
import { Icon } from '@/presentation/icons/Icon';
import { PageHero } from '@/presentation/layouts/PageHero';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { Reveal } from '@/presentation/ui/Reveal';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Acceso socios');
}

const FIELD = [
  'w-full min-h-12 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/50',
  'disabled:cursor-not-allowed disabled:opacity-55',
].join(' ');

const UPCOMING = [
  { icon: 'calendar' as const, title: 'Tu rutina al día', text: 'Consultá la rutina vigente y el historial de cargas.' },
  { icon: 'clock' as const, title: 'Estado de membresía', text: 'Fecha de vencimiento, pagos y comprobantes.' },
  { icon: 'group' as const, title: 'Reserva de clases', text: 'Cupos en tiempo real y lista de espera.' },
  { icon: 'heart' as const, title: 'Progreso medido', text: 'Composición corporal y evolución por período.' },
];

export default async function MemberAccessPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { name, slug, contact } = tenant;

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Portal del socio"
        title="Acceso socios"
        lead={`El portal de ${name} está en desarrollo. Mientras tanto, cualquier gestión se resuelve en recepción o por WhatsApp.`}
        breadcrumb="Acceso"
      />

      <section className="section pt-0" aria-labelledby="acceso-title">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <Reveal>
              <div className="surface-card p-7 lg:p-9">
                <div className="flex items-center justify-between gap-4">
                  <h2 id="acceso-title" className="t-h3">
                    Iniciar sesión
                  </h2>
                  <Badge tone="neutral">Próximamente</Badge>
                </div>

                <p
                  role="note"
                  className="mt-5 flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-action/30 bg-action/8 p-4 text-[0.85rem] text-ink/85"
                >
                  <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-action" />
                  <span>
                    Vista previa sin funcionalidad. Los campos están deshabilitados y{' '}
                    <strong className="font-semibold">no se envía ni se guarda ningún dato</strong>.
                    No escribas aquí una contraseña real.
                  </span>
                </p>

                {/* Sin `action` y sin `method`: no hay destino posible. */}
                <div className="mt-7 flex flex-col gap-5">
                  <div>
                    <label
                      htmlFor="acceso-email"
                      className="mb-2 block text-[0.82rem] font-semibold text-muted"
                    >
                      Correo o documento
                    </label>
                    <input
                      id="acceso-email"
                      type="text"
                      disabled
                      placeholder="socio@ejemplo.com"
                      className={FIELD}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="acceso-clave"
                      className="mb-2 block text-[0.82rem] font-semibold text-muted"
                    >
                      Contraseña
                    </label>
                    <input
                      id="acceso-clave"
                      type="password"
                      disabled
                      placeholder="••••••••"
                      className={FIELD}
                    />
                  </div>

                  <button
                    type="button"
                    disabled
                    className="min-h-12 w-full cursor-not-allowed rounded-[var(--t-radius-md)] border border-line bg-card font-semibold text-muted opacity-60"
                  >
                    Ingresar (no disponible en esta versión)
                  </button>
                </div>

                <div className="mt-8 flex flex-col gap-3 border-t border-line pt-7">
                  <p className="text-[0.88rem] text-muted">
                    ¿Necesitás algo ahora? Escribinos y lo resolvemos hoy.
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
