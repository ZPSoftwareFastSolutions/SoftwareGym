/**
 * CAPA: Presentation / App — Vitrina de la plataforma.
 *
 * Página raíz. No pertenece a ningún gimnasio: es la demostración del producto
 * enlatado. Enumera los tenants aprovisionados leyéndolos del repositorio, así
 * que dar de alta un cliente nuevo lo hace aparecer aquí sin tocar esta página.
 *
 * En un despliegue por cliente esta ruta se sustituye por una redirección al
 * tenant que corresponda (ver `DEFAULT_TENANT_SLUG`).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { listTenantSummaries } from '@core/application/tenant/get-tenant.usecase';
import { tenantRepository } from '@infra/config/composition-root';
import { Icon } from '@/presentation/icons/Icon';
import { Badge } from '@/presentation/ui/Badge';
import { Reveal } from '@/presentation/ui/Reveal';

export const metadata: Metadata = {
  title: 'GYM PLATFORM — Un producto, muchos gimnasios',
  description:
    'Demostración del sitio público multi-tenant de GYM PLATFORM: la misma base de código sirviendo gimnasios con identidad, contenido y capacidades distintas.',
};

const PILLARS = [
  {
    icon: 'palette' as const,
    title: 'Identidad por configuración',
    text: 'Paleta, tipografía, forma de las esquinas y modo claro/oscuro salen de un archivo de configuración. Cero CSS por cliente.',
  },
  {
    icon: 'toggle' as const,
    title: 'Capacidades por feature flag',
    text: 'Cada gimnasio enciende lo que contrató. Una sección apagada desaparece del menú y su ruta responde 404.',
  },
  {
    icon: 'layers' as const,
    title: 'Aislamiento por diseño',
    text: 'El contenido, los planes y los datos de contacto viven en el ámbito del tenant. Ninguna página conoce a otro cliente.',
  },
  {
    icon: 'shield' as const,
    title: 'Una sola base de código',
    text: 'Lo que se mejora para un gimnasio queda disponible para todos. No hay ramas por cliente ni copias del proyecto.',
  },
];

export default async function PlatformShowcasePage() {
  const tenants = await listTenantSummaries(tenantRepository());

  return (
    <div data-theme="dark">
      <main id="contenido">
        <section className="relative flex min-h-[80svh] items-center overflow-hidden">
          <div aria-hidden="true" className="bg-aura" />
          <div aria-hidden="true" className="bg-grid" />
          <div aria-hidden="true" className="bg-noise" />

          <div className="shell relative py-24">
            <p className="t-eyebrow">ZP Software Fast Solutions</p>

            <h1 className="t-display mt-7 max-w-4xl">
              Un producto. <span className="t-accent">Muchos gimnasios.</span>
            </h1>

            <p className="t-lead mt-7 max-w-2xl">
              GYM PLATFORM es un software enlatado vertical. Los dos sitios de abajo comparten el
              100 % del código y no comparten ni un color, ni una tipografía, ni un texto. Abrilos
              en paralelo: esa diferencia es toda la arquitectura.
            </p>

            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {tenants.map((tenant, index) => (
                <Reveal key={tenant.slug} delay={index * 110}>
                  <Link
                    href={`/${tenant.slug}`}
                    className="surface-card group relative block h-full overflow-hidden p-8 transition-[transform,border-color] duration-300 hover:-translate-y-1.5 hover:border-action/45"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ background: tenant.primaryColor }}
                    />

                    <div className="flex items-start justify-between gap-4">
                      <span
                        aria-hidden="true"
                        className="grid h-14 w-14 place-items-center rounded-[var(--t-radius-md)] text-2xl font-bold"
                        style={{
                          background: `color-mix(in srgb, ${tenant.primaryColor} 16%, transparent)`,
                          color: tenant.primaryColor,
                          border: `1px solid color-mix(in srgb, ${tenant.primaryColor} 42%, transparent)`,
                          fontFamily: 'var(--t-font-display)',
                        }}
                      >
                        {tenant.monogram}
                      </span>

                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={tenant.status === 'active' ? 'action' : 'neutral'}>
                          {tenant.status === 'active' ? 'Activo' : 'En prueba'}
                        </Badge>
                        <span className="text-[0.7rem] uppercase tracking-[0.14em] text-muted">
                          Plan {tenant.plan}
                        </span>
                      </div>
                    </div>

                    <h2 className="t-h2 mt-7">{tenant.name}</h2>
                    <p className="mt-3 text-[0.96rem] text-muted">{tenant.tagline}</p>

                    <span className="mt-8 inline-flex items-center gap-2 text-[0.88rem] font-semibold text-action">
                      Abrir sitio
                      <Icon
                        name="arrowRight"
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-24 -end-24 h-56 w-56 rounded-full opacity-[0.14] blur-3xl transition-opacity duration-500 group-hover:opacity-25"
                      style={{ background: tenant.primaryColor }}
                    />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="section surface-raised" aria-labelledby="pilares-title">
          <div className="shell">
            <h2 id="pilares-title" className="t-h2 max-w-2xl">
              Qué sostiene el producto
            </h2>

            <ul className="mt-12 grid gap-5 sm:grid-cols-2">
              {PILLARS.map((pillar, index) => (
                <li key={pillar.title}>
                  <Reveal delay={Math.min(index, 4) * 80}>
                    <article className="surface-card flex h-full gap-5 p-7">
                      <span
                        aria-hidden="true"
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--t-radius-md)] bg-action/12 text-action"
                      >
                        <Icon name={pillar.icon} size={22} />
                      </span>
                      <div>
                        <h3 className="t-h3">{pillar.title}</h3>
                        <p className="mt-2.5 text-[0.93rem] leading-relaxed text-muted">
                          {pillar.text}
                        </p>
                      </div>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>

            <Reveal delay={200}>
              <p className="mt-12 flex items-start gap-3 rounded-[var(--t-radius-lg)] border border-line bg-surface p-6 text-[0.9rem] text-muted">
                <Icon name="sparkle" size={18} className="mt-0.5 shrink-0 text-action" />
                <span>
                  <strong className="font-semibold text-ink">Prueba de aceptación:</strong> dar de
                  alta un gimnasio son dos pasos —crear su archivo de configuración y registrarlo—.
                  Si hiciera falta tocar un componente, una ruta o una hoja de estilo, el producto
                  habría dejado de ser enlatado.
                </span>
              </p>
            </Reveal>
          </div>
        </section>

        <footer className="border-t border-line py-10">
          <div className="shell flex flex-col gap-2 text-center text-[0.82rem] text-muted">
            <p>
              GYM PLATFORM · V1 — Sitio público multi-tenant · {new Date().getFullYear()}
            </p>
            <p>
              Desarrollado por{' '}
              <span className="font-semibold text-ink">ZP Software Fast Solutions</span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
