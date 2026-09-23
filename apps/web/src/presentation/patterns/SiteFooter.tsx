/**
 * CAPA: Presentation / Patterns (organismo)
 * Pie de página: marca, navegación, contacto, horario resumido y legales.
 *
 * V7 · CUATRO COLUMNAS SEPARADAS. Antes la navegación era una sola lista larga
 * y, por debajo de `lg`, todo el pie caía en una única columna interminable.
 * Ahora: marca y lema · navegación repartida en DOS listas verticales ·
 * contacto (con el horario resumido), y una fila inferior con los legales
 * separada por un borde sutil. En el móvil las dos listas siguen lado a lado;
 * en tableta, marca y contacto comparten fila y la navegación va debajo.
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

  // La navegación se reparte en dos listas verticales; «Acceso socios» cierra
  // la segunda. La primera se lleva la mitad redondeada hacia arriba.
  const enlaces = [
    ...navigation.map((item) => ({ clave: item.segment || 'home', href: tenantHref(slug, item.segment), etiqueta: item.label })),
    ...(features.memberLogin ? [{ clave: 'acceso', href: tenantHref(slug, 'acceso'), etiqueta: 'Acceso socios' }] : []),
  ];
  const mitad = Math.ceil(enlaces.length / 2);
  const columnas = [enlaces.slice(0, mitad), enlaces.slice(mitad)].filter((columna) => columna.length > 0);

  const openDays = hours.week.filter((d) => !d.closed);
  const firstOpen = openDays[0];
  const lastOpen = openDays[openDays.length - 1];

  return (
    // `data-print="hide"`: al imprimir o guardar un reporte como PDF, el pie
    // entero del sitio —enlaces, redes, horario— se colaba al final del
    // documento. Un reporte impreso es un documento, no una página web.
    <footer data-print="hide" className="relative overflow-hidden border-t border-line bg-raised">
      <div aria-hidden="true" className="bg-grid opacity-40" />

      <div className="shell relative py-14 lg:py-20">
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          {/* Columna 1 · marca y lema */}
          <div className="flex flex-col gap-5">
            <Logo logo={branding.logo} href={tenantHref(slug)} name={name} />
            <p className="t-body max-w-xs text-[0.92rem]">{tenant.tagline}.</p>
            <SocialLinks social={social} name={name} />
          </div>

          {/* Columnas 2 y 3 · navegación en dos listas verticales */}
          <nav aria-label="Navegación del sitio" className="grid grid-cols-2 gap-8 sm:order-3 sm:col-span-2 lg:order-none lg:col-span-2">
            {columnas.map((columna, indice) => (
              <div key={indice}>
                <h2 className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">{indice === 0 ? 'Navegación' : 'Más'}</h2>
                <ul className="flex flex-col gap-2">
                  {columna.map((enlace) => (
                    <li key={enlace.clave}>
                      <Link href={enlace.href} className="inline-flex min-h-9 items-center text-[0.92rem] text-muted transition-colors hover:text-action">
                        {enlace.etiqueta}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Columna 4 · contacto y horario */}
          <div className="flex flex-col gap-4 sm:order-2 lg:order-none">
            <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">Contacto</h2>
            <ul className="flex flex-col gap-3 text-[0.92rem]">
              <li>
                <a href={telHref(contact.phone)} className="inline-flex min-h-9 items-start gap-2.5 text-muted transition-colors hover:text-action">
                  <Icon name="phone" size={17} className="mt-0.5 shrink-0 text-action" />
                  {contact.phone}
                </a>
              </li>
              {/* Un gimnasio que todavía no publica correo no muestra la línea:
                  un `mailto:` vacío abre el cliente de correo sin destinatario. */}
              {contact.email !== '' && (
                <li>
                  <a href={mailtoHref(contact.email)} className="inline-flex min-h-9 items-start gap-2.5 break-all text-muted transition-colors hover:text-action">
                    <Icon name="mail" size={17} className="mt-0.5 shrink-0 text-action" />
                    {contact.email}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5 text-muted">
                <Icon name="pin" size={17} className="mt-0.5 shrink-0 text-action" />
                <span>
                  {contact.addressLine}
                  <br />
                  {/* Sin ciudad declarada no se escribe la coma suelta. */}
                  {[contact.city, contact.country].filter((parte) => parte !== '').join(', ')}
                </span>
              </li>
              {firstOpen && (
                <li className="flex items-start gap-2.5 text-muted">
                  <Icon name="clock" size={17} className="mt-0.5 shrink-0 text-action" />
                  <span>
                    {firstOpen.day} a {lastOpen?.day}
                    <br />
                    <span className="text-ink">
                      {firstOpen.open} – {firstOpen.close}
                    </span>
                    <br />
                    <Link href={tenantHref(slug, 'horarios')} className="inline-flex min-h-9 items-center gap-1.5 text-action transition-opacity hover:opacity-80">
                      Ver horario completo
                      <Icon name="arrowRight" size={15} />
                    </Link>
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Fila inferior · legales, separada por un borde sutil */}
        <div className="mt-12 flex flex-col gap-3 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8rem] text-muted">
            © {year} {legalName}. Todos los derechos reservados.
          </p>
          <p className="text-[0.8rem] text-muted">
            Plataforma desarrollada por <span className="font-semibold text-ink">ZP Software Fast Solutions</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
