/**
 * CAPA: Presentation / Patterns (organismo)
 * Pie de página: marca, navegación, contacto, horario resumido y legales.
 */

import Link from 'next/link';
import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import type { NavItem } from '@core/domain/tenant/tenant-config';
import { mailtoHref, telHref, tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { Logo } from '../ui/Logo';
import { SocialLinks } from './SocialLinks';

interface SiteFooterProps {
  readonly tenant: TenantConfig;
  readonly navigation: readonly NavItem[];
}

export function SiteFooter({ tenant, navigation }: SiteFooterProps) {
  const { slug, name, legalName, contact, social, hours, branding, features } = tenant;
  const year = new Date().getFullYear();

  const openDays = hours.week.filter((d) => !d.closed);
  const firstOpen = openDays[0];
  const lastOpen = openDays[openDays.length - 1];

  return (
    <footer className="relative overflow-hidden border-t border-line bg-raised">
      <div aria-hidden="true" className="bg-grid opacity-40" />

      <div className="shell relative py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col gap-5">
            <Logo logo={branding.logo} href={tenantHref(slug)} name={name} />
            <p className="t-body max-w-xs text-[0.92rem]">{tenant.tagline}.</p>
            <SocialLinks social={social} name={name} />
          </div>

          <nav aria-labelledby="footer-nav">
            <h2
              id="footer-nav"
              className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted"
            >
              Navegación
            </h2>
            <ul className="flex flex-col gap-2.5">
              {navigation.map((item) => (
                <li key={item.segment || 'home'}>
                  <Link
                    href={tenantHref(slug, item.segment)}
                    className="inline-flex min-h-9 items-center text-[0.92rem] text-muted transition-colors hover:text-action"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {features.memberLogin && (
                <li>
                  <Link
                    href={tenantHref(slug, 'acceso')}
                    className="inline-flex min-h-9 items-center text-[0.92rem] text-muted transition-colors hover:text-action"
                  >
                    Acceso socios
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">
              Horario
            </h2>
            <ul className="flex flex-col gap-2.5 text-[0.92rem] text-muted">
              {firstOpen && (
                <li className="flex items-start gap-2.5">
                  <Icon name="clock" size={17} className="mt-0.5 shrink-0 text-action" />
                  <span>
                    {firstOpen.day} a {lastOpen?.day}
                    <br />
                    <span className="text-ink">
                      {firstOpen.open} – {firstOpen.close}
                    </span>
                  </span>
                </li>
              )}
              <li>
                <Link
                  href={tenantHref(slug, 'horarios')}
                  className="inline-flex min-h-9 items-center gap-1.5 text-action transition-opacity hover:opacity-80"
                >
                  Ver horario completo
                  <Icon name="arrowRight" size={15} />
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">
              Contacto
            </h2>
            <ul className="flex flex-col gap-3 text-[0.92rem]">
              <li>
                <a
                  href={telHref(contact.phone)}
                  className="inline-flex min-h-9 items-start gap-2.5 text-muted transition-colors hover:text-action"
                >
                  <Icon name="phone" size={17} className="mt-0.5 shrink-0 text-action" />
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={mailtoHref(contact.email)}
                  className="inline-flex min-h-9 items-start gap-2.5 break-all text-muted transition-colors hover:text-action"
                >
                  <Icon name="mail" size={17} className="mt-0.5 shrink-0 text-action" />
                  {contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-muted">
                <Icon name="pin" size={17} className="mt-0.5 shrink-0 text-action" />
                <span>
                  {contact.addressLine}
                  <br />
                  {contact.city}, {contact.country}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8rem] text-muted">
            © {year} {legalName}. Todos los derechos reservados.
          </p>
          <p className="text-[0.8rem] text-muted">
            Plataforma desarrollada por{' '}
            <span className="font-semibold text-ink">ZP Software Fast Solutions</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
