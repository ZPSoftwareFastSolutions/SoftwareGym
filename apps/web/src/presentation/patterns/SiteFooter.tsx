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
  const { slug, name, legalName, contact, social, branding } = tenant;
  const year = new Date().getFullYear();

  return (
    <footer data-print="hide" className="relative border-t border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="shell relative py-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr] items-start">
          <div className="flex flex-col gap-4">
            <Logo logo={branding.logo} href={tenantHref(slug)} name={name} />
            <p className="text-white/60 text-sm max-w-sm leading-relaxed">{tenant.tagline}.</p>
            <div className="mt-2">
              <SocialLinks social={social} name={name} />
            </div>
          </div>

          <nav aria-labelledby="footer-nav">
            <h2 id="footer-nav" className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
              Navegación
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {navigation.map((item) => (
                <li key={item.segment || 'home'}>
                  <Link
                    href={tenantHref(slug, item.segment)}
                    className="text-sm text-white/70 transition-colors hover:text-action"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <address className="not-italic" aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
              Contacto
            </h2>
            <ul className="flex flex-col gap-3 text-sm text-white/70">
              <li>
                <a
                  href={telHref(contact.phone)}
                  className="inline-flex min-h-9 items-start gap-2.5 transition-colors hover:text-white"
                >
                  <Icon name="phone" size={17} className="mt-0.5 shrink-0 text-action" />
                  {contact.phone}
                </a>
              </li>
              {/* Un gimnasio que todavía no publica correo no muestra la línea:
                  un `mailto:` vacío abre el cliente de correo sin destinatario. */}
              {contact.email !== '' && (
                <li>
                  <a
                    href={mailtoHref(contact.email)}
                    className="inline-flex min-h-9 items-start gap-2.5 break-all transition-colors hover:text-white"
                  >
                    <Icon name="mail" size={17} className="mt-0.5 shrink-0 text-action" />
                    {contact.email}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <Icon name="pin" size={17} className="mt-0.5 shrink-0 text-action" />
                <span>
                  {contact.addressLine}
                  <br />
                  {/* Sin ciudad declarada no se escribe la coma suelta. */}
                  {[contact.city, contact.country].filter((parte) => parte !== '').join(', ')}
                </span>
              </li>
            </ul>
          </address>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/40">
            © {year} {legalName}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/40">
            Plataforma desarrollada por{' '}
            <span className="font-semibold text-white/80">ZP Software Fast Solutions</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
