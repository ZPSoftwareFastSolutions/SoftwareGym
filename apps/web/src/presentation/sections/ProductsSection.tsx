/**
 * CAPA: Presentation / Sections
 *
 * Catálogo de mostrador: indumentaria, suplementos y accesorios.
 *
 * En V1 esto es exhibición, no comercio: no hay carrito, ni stock, ni pasarela.
 * Cada artículo deriva a WhatsApp con el nombre precargado, que es exactamente
 * como el gimnasio vende hoy. Simular un checkout que no cobra sería peor que
 * no tenerlo.
 */

import type { ContactInfo } from '@core/domain/tenant/tenant-config';
import type { ProductCategory } from '@core/domain/catalog/catalog';
import { whatsappHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface ProductsSectionProps {
  readonly categories: readonly ProductCategory[];
  readonly contact: ContactInfo;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

/** Consulta por un artículo concreto, con el nombre ya escrito en el mensaje. */
function productEnquiryHref(contact: ContactInfo, productName: string): string {
  const digits = contact.whatsapp.replace(/\D/g, '');
  const message = `Hola 👋 Quiero consultar por: ${productName}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function ProductsSection({
  categories,
  contact,
  eyebrow = 'Productos',
  title = 'Calidad que podés confiar',
  lead,
}: ProductsSectionProps) {
  const withItems = categories.filter((c) => c.items.length > 0);
  if (withItems.length === 0) return null;

  return (
    <section className="section relative overflow-hidden" aria-labelledby="productos-title">
      <div className="shell relative">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align="center" />

        <div className="mt-16 flex flex-col gap-16 lg:mt-20">
          {withItems.map((category) => (
            <div key={category.id}>
              <Reveal>
                <header className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--t-radius-md)] bg-action/12 text-action"
                  >
                    <Icon name={category.icon} size={21} />
                  </span>
                  <div>
                    <h3 className="t-h3">{category.name}</h3>
                    <p className="mt-1.5 text-[0.9rem] text-muted">{category.description}</p>
                  </div>
                </header>
              </Reveal>

              <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {category.items.map((item, index) => (
                  <li key={item.id}>
                    <Reveal delay={Math.min(index, 5) * 70} className="h-full">
                      <article className="surface-card relative flex h-full flex-col gap-4 p-6">
                        {item.badge && (
                          <div className="absolute -top-3 start-6">
                            <Badge>{item.badge}</Badge>
                          </div>
                        )}

                        <div className="flex-1">
                          <h4 className="text-[1.02rem] font-semibold leading-snug text-ink">
                            {item.name}
                          </h4>
                          {item.note && (
                            <p className="mt-1.5 text-[0.85rem] text-muted">{item.note}</p>
                          )}
                        </div>

                        <p className="flex items-baseline gap-1.5">
                          <span className="text-[0.85rem] font-semibold text-muted">
                            {item.currency}
                          </span>
                          <span
                            className="text-3xl font-bold leading-none text-ink"
                            style={{ fontFamily: 'var(--t-font-display)' }}
                          >
                            {item.price.toLocaleString('es-BO')}
                          </span>
                        </p>

                        <LinkButton
                          href={productEnquiryHref(contact, item.name)}
                          variant="secondary"
                          size="sm"
                          fullWidth
                          external
                        >
                          Consultar
                        </LinkButton>
                      </article>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Reveal delay={150}>
          <div className="mt-16 flex flex-col items-center gap-5 text-center">
            <p className="max-w-xl text-[0.92rem] text-muted">
              ¿Tenés preguntas? Escribinos por WhatsApp y te ayudamos a elegir los mejores
              productos para tus objetivos.
            </p>
            <LinkButton href={whatsappHref(contact)} variant="primary" size="lg" external glow>
              Solicitar más información
            </LinkButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
