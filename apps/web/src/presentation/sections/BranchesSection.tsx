/**
 * CAPA: Presentation / Sections
 *
 * «Nuestras sucursales» (V3.0).
 *
 * Idéntica para cualquier gimnasio: recibe las sedes que devuelve la base y
 * pinta una tarjeta por cada una. Mítico con dos sedes, otro gimnasio con
 * cinco: el componente no sabe cuál es cuál, y ninguna sede está escrita aquí.
 *
 * Lo que la sede no tiene cargado cae al dato general del gimnasio (teléfono,
 * WhatsApp) o se dice con honestidad («consulta el horario»), en vez de
 * esconder la tarjeta o inventar un valor.
 */

import type { Sucursal } from '@core/domain/operations/branches';
import { lineasDeHorario, urlDeMapaEmbebido, urlDeUbicacion } from '@core/domain/operations/branches';
import type { ContactInfo } from '@core/domain/tenant/tenant-config';
import { telHref, whatsappHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface BranchesSectionProps {
  readonly sucursales: readonly Sucursal[];
  readonly tenantName: string;
  readonly contact: ContactInfo;
  /**
   * Mapa embebido por sede. En el inicio va una imagen (varios iframes de
   * Google pesan demasiado para la portada); en contacto, el mapa.
   */
  readonly conMapa?: boolean;
  readonly eyebrow?: string;
  readonly className?: string;
}

/** Semilla estable por sede para la composición gráfica. */
function semilla(codigo: string): number {
  let valor = 7;
  for (const caracter of codigo) valor = (valor * 31 + caracter.charCodeAt(0)) % 997;
  return valor;
}

function titulo(cantidad: number): string {
  if (cantidad === 1) return 'Dónde entrenar';
  const numeros = ['', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis'];
  return `${numeros[cantidad] ?? cantidad} sedes, una sola membresía`;
}

export function BranchesSection({
  sucursales,
  tenantName,
  contact,
  conMapa = false,
  eyebrow = 'Nuestras sucursales',
  className,
}: BranchesSectionProps) {
  if (sucursales.length === 0) return null;
  const varias = sucursales.length > 1;

  return (
    <section className={className ?? 'section'} aria-labelledby="sucursales-title" id="sucursales">
      <div className="shell">
        <SectionHeading
          eyebrow={eyebrow}
          title={<span id="sucursales-title">{titulo(sucursales.length)}</span>}
          lead={
            varias
              ? `Entrena en la sede que te quede más cerca: tu membresía de ${tenantName} vale en todas.`
              : `Te esperamos en ${tenantName}.`
          }
        />

        <ul className={varias ? 'mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3' : 'mt-14 grid max-w-2xl gap-6'}>
          {sucursales.map((sucursal, indice) => {
            const mapa = conMapa ? urlDeMapaEmbebido(sucursal, contact.city) : null;
            const ubicacion = urlDeUbicacion(sucursal, contact.city);
            const horario = lineasDeHorario(sucursal.openingHours);
            const telefono = sucursal.phone ?? contact.phone;

            return (
              <li key={sucursal.id}>
                <Reveal delay={Math.min(indice, 4) * 80} className="h-full">
                  <article className="surface-card flex h-full flex-col overflow-hidden" aria-labelledby={`sucursal-${sucursal.code}`}>
                    {mapa ? (
                      <div className="overflow-hidden border-b border-line">
                        <iframe
                          src={mapa}
                          title={`Mapa de ${tenantName} ${sucursal.name}`}
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="map-embed h-56 w-full border-0"
                        />
                      </div>
                    ) : (
                      <ArtFrame
                        seed={semilla(sucursal.code)}
                        icon="pin"
                        ratio="16 / 9"
                        className="rounded-none border-0 border-b"
                      />
                    )}

                    <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted">{tenantName}</span>
                          {varias && sucursal.isPrimary && <Badge tone="action">Sede principal</Badge>}
                        </div>
                        <h3 id={`sucursal-${sucursal.code}`} className="mt-1.5 t-h3">
                          {sucursal.name}
                        </h3>
                      </div>

                      <dl className="flex flex-col gap-3.5 text-[0.92rem]">
                        <div className="flex items-start gap-3">
                          <dt className="sr-only">Dirección</dt>
                          <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-action" />
                          <dd className="text-ink">{sucursal.address ?? `${contact.city}, ${contact.country}`}</dd>
                        </div>
                        <div className="flex items-start gap-3">
                          <dt className="sr-only">Horario</dt>
                          <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-action" />
                          <dd className="text-muted">
                            {horario.length > 0
                              ? horario.map((linea) => (
                                  <span key={linea} className="block text-ink">
                                    {linea}
                                  </span>
                                ))
                              : 'Consúltanos el horario de esta sede por WhatsApp.'}
                          </dd>
                        </div>
                        <div className="flex items-start gap-3">
                          <dt className="sr-only">Teléfono</dt>
                          <Icon name="phone" size={18} className="mt-0.5 shrink-0 text-action" />
                          <dd>
                            <a href={telHref(telefono)} className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:text-action hover:underline">
                              {telefono}
                            </a>
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto flex flex-wrap gap-2.5">
                        {ubicacion && (
                          <LinkButton href={ubicacion} external variant="primary" size="md" icon="pin" iconPosition="start">
                            Ver ubicación
                          </LinkButton>
                        )}
                        <LinkButton href={whatsappHref(contact)} external variant="secondary" size="md" icon="whatsapp" iconPosition="start">
                          Escribir
                        </LinkButton>
                      </div>
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
