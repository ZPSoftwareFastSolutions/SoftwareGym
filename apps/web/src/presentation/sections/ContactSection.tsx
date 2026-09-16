/**
 * CAPA: Presentation / Sections
 *
 * Datos de contacto y formulario.
 *
 * El formulario vive aparte (`FormularioDeContacto`) porque necesita estado y
 * esta sección no: así el bloque de teléfonos, correo, mapa y redes se sigue
 * renderizando entero en el servidor, sin mandar JavaScript al navegador.
 */

import type { ContactInfo, SocialLinks as SocialLinksModel } from '@core/domain/tenant/tenant-config';
import { mailtoHref, telHref, whatsappHref } from '@/lib/tenant-links';
import { FormularioDeContacto } from '../patterns/FormularioDeContacto';
import { Icon } from '../icons/Icon';
import { SocialLinks } from '../patterns/SocialLinks';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface ContactSectionProps {
  readonly contact: ContactInfo;
  readonly social: SocialLinksModel;
  readonly name: string;
  readonly showForm: boolean;
  readonly showMap: boolean;
}

export function ContactSection({ contact, social, name, showForm, showMap }: ContactSectionProps) {
  // El gimnasio que no publica correo no enseña una fila «Correo» vacía con un
  // `mailto:` que no lleva a ninguna parte: la fila no se dibuja.
  const details = [
    { icon: 'phone' as const, label: 'Teléfono', value: contact.phone, href: telHref(contact.phone) },
    { icon: 'whatsapp' as const, label: 'WhatsApp', value: contact.phone, href: whatsappHref(contact) },
    ...(contact.email.trim()
      ? [{ icon: 'mail' as const, label: 'Correo', value: contact.email, href: mailtoHref(contact.email) }]
      : []),
  ];

  return (
    <section className="section" aria-labelledby="contacto-title">
      <div className="shell">
        <SectionHeading
          eyebrow="Contacto"
          title="Hablemos"
          lead="Escríbenos, llámanos o pasa directamente. Estamos para responder cualquier duda antes de que te decidas."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <Reveal>
            <div className="flex flex-col gap-6">
              <ul className="flex flex-col gap-3">
                {details.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      {...(item.icon === 'whatsapp'
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="surface-card group flex min-h-16 items-center gap-4 p-5 transition-colors hover:border-action/40"
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--t-radius-md)] bg-action/12 text-action transition-colors group-hover:bg-action group-hover:text-on-action"
                      >
                        <Icon name={item.icon} size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.72rem] uppercase tracking-[0.14em] text-muted">
                          {item.label}
                        </span>
                        <span className="block truncate text-[0.98rem] font-semibold text-ink">
                          {item.value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="surface-card p-6">
                <h3 className="flex items-center gap-2.5 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-muted">
                  <Icon name="pin" size={16} className="text-action" />
                  Dónde estamos
                </h3>
                <p className="mt-3 text-[1.02rem] font-semibold text-ink">{contact.addressLine}</p>
                <p className="text-[0.92rem] text-muted">
                  {contact.city}, {contact.country}
                </p>

                {showMap && (
                  <div className="mt-5 overflow-hidden rounded-[var(--t-radius-md)] border border-line">
                    {contact.mapEmbedUrl ? (
                      // Google no ofrece variante oscura del mapa embebido, y un
                      // rectángulo blanco sobre fondo carbón parte la página en
                      // dos. Se atenúa por CSS: `map-embed` invierte y rota el
                      // tono solo cuando el tenant es de tema oscuro, así que un
                      // cliente de tema claro lo sigue viendo tal cual.
                      <iframe
                        src={contact.mapEmbedUrl}
                        title={`Ubicación de ${name}`}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="map-embed h-56 w-full border-0"
                      />
                    ) : (
                      // Sin URL configurada se muestra un marcador de posición
                      // honesto en lugar de un iframe vacío o roto.
                      <div
                        className="relative grid h-56 place-items-center bg-raised"
                        role="img"
                        aria-label={`Mapa de ${name} pendiente de configuración`}
                      >
                        <div aria-hidden="true" className="bg-grid opacity-70" />
                        <div className="relative flex flex-col items-center gap-2 text-muted">
                          <Icon name="pin" size={30} className="text-action" />
                          <span className="text-[0.8rem]">Mapa pendiente de configuración</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted">
                  Síguenos
                </h3>
                <SocialLinks social={social} name={name} />
              </div>
            </div>
          </Reveal>

          {showForm && (
            <Reveal delay={100}>
              <FormularioDeContacto contact={contact} name={name} />
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
