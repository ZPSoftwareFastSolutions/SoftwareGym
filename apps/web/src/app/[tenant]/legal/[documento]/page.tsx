/**
 * CAPA: Presentation / App — Avisos legales.
 *
 * `/[tenant]/legal/privacidad`, `terminos`, `cookies` y `reembolsos`. El texto
 * lo arma `core/domain/legal` a partir de la configuración del gimnasio: esta
 * página solo lo presenta. Se prerenderiza en el build, como el resto del sitio.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DOCUMENTOS_LEGALES,
  TITULO_DE_DOCUMENTO,
  documentoLegal,
  esDocumentoLegal,
} from '@core/domain/legal/documentos-legales';
import { loadTenantPage, tenantPageMetadata } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PageHero } from '@/presentation/layouts/PageHero';

interface LegalPageProps {
  readonly params: Promise<{ tenant: string; documento: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCUMENTOS_LEGALES.map((documento) => ({ documento }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { documento } = await params;
  if (!esDocumentoLegal(documento)) return {};
  return tenantPageMetadata(params, `legal/${documento}`, TITULO_DE_DOCUMENTO[documento]);
}

/** «2026-09-25» → «25 de septiembre de 2026», sin depender de la zona del servidor. */
function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { documento } = await params;
  if (!esDocumentoLegal(documento)) notFound();

  const tenant = await loadTenantPage(params);
  const doc = documentoLegal(documento, tenant);

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-transparent pb-16">
      <PageHero slug={tenant.slug} eyebrow="Legal" title={doc.titulo} lead={doc.resumen} breadcrumb={doc.titulo} />

      <div className="shell mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_15rem]">
        <article className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-md sm:p-10">
          <p className="text-sm text-white/70">
            Última actualización: <time dateTime={doc.actualizado}>{fechaLegible(doc.actualizado)}</time>
          </p>
          {doc.secciones.map((seccion) => (
            <section key={seccion.titulo} className="mt-8">
              <h2 className="text-xl font-bold text-white">{seccion.titulo}</h2>
              {seccion.parrafos.map((parrafo) => (
                <p key={parrafo} className="mt-3 leading-relaxed text-white/85">
                  {parrafo}
                </p>
              ))}
            </section>
          ))}
        </article>

        <nav aria-label="Documentos legales" className="lg:pt-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Documentos</p>
          <ul className="mt-4 flex flex-col gap-1">
            {DOCUMENTOS_LEGALES.map((id) => (
              <li key={id}>
                <Link
                  href={tenantHref(tenant.slug, `legal/${id}`)}
                  aria-current={id === documento ? 'page' : undefined}
                  className={
                    id === documento
                      ? 'inline-flex min-h-11 items-center font-semibold text-action'
                      : 'inline-flex min-h-11 items-center text-white/80 hover:text-action'
                  }
                >
                  {TITULO_DE_DOCUMENTO[id]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
