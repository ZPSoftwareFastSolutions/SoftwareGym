/**
 * CAPA: Presentation / Sections
 * Llamada a la acción de cierre. Aparece al final de todas las páginas.
 */

import type { ContactInfo, TenantContent } from '@core/domain/tenant/tenant-config';
import { tenantHref, whatsappHref } from '@/lib/tenant-links';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';

interface ClosingCtaSectionProps {
  readonly cta: TenantContent['closingCta'];
  readonly contact: ContactInfo;
  readonly slug: string;
  readonly showWhatsapp: boolean;
}

export function ClosingCtaSection({ cta, contact, slug, showWhatsapp }: ClosingCtaSectionProps) {
  return (
    <section className="section relative overflow-hidden" aria-labelledby="cta-title">
      <div aria-hidden="true" className="bg-aura" />
      <div aria-hidden="true" className="bg-noise" />

      <div className="shell relative">
        <Reveal>
          <div
            className="surface-card relative overflow-hidden px-7 py-14 text-center sm:px-12 lg:py-20"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--t-structural-deep) 62%, transparent), color-mix(in srgb, var(--t-card) 88%, transparent))',
            }}
          >
            <div aria-hidden="true" className="bg-grid" />

            <div className="relative mx-auto max-w-2xl">
              <h2 id="cta-title" className="t-h1">
                {cta.title}
              </h2>
              <p className="t-lead mx-auto mt-5">{cta.subtitle}</p>

              <div className="mt-10 flex flex-col justify-center gap-3.5 sm:flex-row">
                <LinkButton
                  href={tenantHref(slug, 'contacto')}
                  size="lg"
                  icon="arrowRight"
                  glow
                >
                  {cta.label}
                </LinkButton>

                {showWhatsapp && (
                  <LinkButton
                    href={whatsappHref(contact)}
                    external
                    variant="secondary"
                    size="lg"
                    icon="whatsapp"
                    iconPosition="start"
                  >
                    Escribir por WhatsApp
                  </LinkButton>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
