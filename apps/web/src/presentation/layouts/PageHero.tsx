/**
 * CAPA: Presentation / Layouts
 *
 * Cabecera de las páginas interiores. Unifica el arranque de /nosotros,
 * /servicios, /planes, etc.: mismo espaciado, misma migaja, mismo `h1`.
 *
 * La migaja de pan usa `<nav aria-label>` + `aria-current="page"`: es un
 * landmark de navegación real, no una fila de texto con separadores.
 */

import Link from 'next/link';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';

interface PageHeroProps {
  readonly slug: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly lead?: string;
  readonly breadcrumb: string;
}

export function PageHero({ slug, eyebrow, title, lead, breadcrumb }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-[calc(var(--header-height)+3.5rem)] pb-14 lg:pb-20">
      <div aria-hidden="true" className="bg-aura opacity-70" />
      <div aria-hidden="true" className="bg-grid" />

      <div className="shell relative">
        <nav aria-label="Ruta de navegación" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
            <li>
              <Link
                href={tenantHref(slug)}
                className="inline-flex min-h-8 items-center transition-colors hover:text-action"
              >
                Inicio
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted/50">
              <Icon name="arrowRight" size={13} />
            </li>
            <li aria-current="page" className="font-semibold text-action">
              {breadcrumb}
            </li>
          </ol>
        </nav>

        <p className="t-eyebrow">{eyebrow}</p>
        <h1 className="t-h1 mt-5 max-w-4xl">{title}</h1>
        {lead && <p className="t-lead mt-6 max-w-2xl">{lead}</p>}
      </div>
    </section>
  );
}
