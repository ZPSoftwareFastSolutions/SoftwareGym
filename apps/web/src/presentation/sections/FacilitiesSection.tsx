/**
 * CAPA: Presentation / Sections
 * Instalaciones: alterna imagen y texto en filas para dar ritmo de lectura.
 *
 * V4.1 · REPARTO POR SEDE. La misma sección sirve a un gimnasio de una sede y a
 * uno de cuatro. Si las áreas declaran a qué sede pertenecen (`branchCode`) y la
 * base devuelve esas sedes, se presentan en pestañas; si no, en una sola lista,
 * exactamente como antes. La decisión sale de los DATOS: la sección no sabe qué
 * gimnasio la está usando ni cuántas sedes tiene.
 */

import type { FacilityItem } from '@core/domain/catalog/catalog';
import {
  agruparInstalacionesPorSede,
  describirGrupo,
  necesitaPestanasDeSede,
  type SedeDeInstalaciones,
} from '@core/domain/catalog/facilities';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Badge } from '../ui/Badge';
import { Pestanas } from '../ui/Pestanas';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

type DisposicionDeInstalaciones = 'rows' | 'grid';

interface FacilitiesSectionProps {
  readonly facilities: readonly FacilityItem[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
  readonly layout?: DisposicionDeInstalaciones;
  /**
   * Sedes activas del gimnasio (de la base). Sin ellas —o sin áreas atribuidas—
   * la sección se comporta como siempre, en una sola lista.
   */
  readonly sucursales?: readonly SedeDeInstalaciones[];
}

/** La retícula: tarjetas iguales, para cuando la sección acompaña a otras. */
function Reticula({ facilities }: { readonly facilities: readonly FacilityItem[] }) {
  return (
    <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {facilities.map((facility, index) => (
        <li key={facility.id}>
          <Reveal delay={Math.min(index, 5) * 70}>
            <article className="surface-card h-full overflow-hidden">
              <ArtFrame seed={index * 29 + 13} icon={facility.icon} ratio="16 / 10" />
              <div className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="t-h3">{facility.name}</h3>
                  {/* Sin superficie declarada no se pinta una etiqueta vacía:
                      el gimnasio puede no haber medido todavía sus áreas. */}
                  {facility.area !== '' && <Badge tone="neutral">{facility.area}</Badge>}
                </div>
                <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
                  {facility.description}
                </p>
              </div>
            </article>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/** Las filas: imagen y texto alternados, con los datos de cada área. */
function Filas({ facilities }: { readonly facilities: readonly FacilityItem[] }) {
  return (
    <div className="mt-16 flex flex-col gap-16 lg:gap-24">
      {facilities.map((facility, index) => {
        const reversed = index % 2 === 1;

        return (
          <Reveal key={facility.id}>
            <article
              className={cn(
                'grid items-center gap-8 lg:grid-cols-2 lg:gap-14',
                reversed && 'lg:[&>*:first-child]:order-2',
              )}
            >
              <ArtFrame
                seed={index * 37 + 5}
                icon={facility.icon}
                ratio="4 / 3"
                className="w-full"
              />

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 place-items-center rounded-[var(--t-radius-md)] bg-structural/25 text-action"
                  >
                    <Icon name={facility.icon} size={21} />
                  </span>
                  {facility.area !== '' && <Badge tone="neutral">{facility.area}</Badge>}
                </div>

                <h3 className="t-h2 mt-5">{facility.name}</h3>
                <p className="t-lead mt-4">{facility.description}</p>

                {/* Las fichas de datos solo aparecen si el gimnasio las
                    entregó: una retícula de tres huecos vacíos se lee como un
                    error de la página, no como información que falta. */}
                {facility.stats.length > 0 && (
                  <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-line">
                    {facility.stats.map((stat) => (
                      <div key={stat.label} className="bg-surface px-4 py-5 text-center">
                        <dt className="text-[0.7rem] uppercase tracking-[0.12em] text-muted">
                          {stat.label}
                        </dt>
                        <dd className="mt-2 text-lg font-bold text-ink">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}

function Contenido({
  facilities,
  layout,
}: {
  readonly facilities: readonly FacilityItem[];
  readonly layout: DisposicionDeInstalaciones;
}) {
  return layout === 'grid' ? <Reticula facilities={facilities} /> : <Filas facilities={facilities} />;
}

export function FacilitiesSection({
  facilities,
  eyebrow = 'Instalaciones',
  title = 'El espacio también entrena',
  lead,
  layout = 'rows',
  sucursales = [],
}: FacilitiesSectionProps) {
  if (facilities.length === 0) return null;

  const grupos = agruparInstalacionesPorSede(facilities, sucursales);
  const porSede = necesitaPestanasDeSede(grupos);

  return (
    // `aria-label` y no `aria-labelledby`: `SectionHeading` no emite un id al
    // que apuntar, y una referencia rota deja la sección sin nombre accesible.
    <section className="section" aria-label={title}>
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        {porSede ? (
          <Pestanas
            className="mt-12"
            etiquetaDelGrupo="Sucursales"
            pestanas={grupos.map((grupo) => ({
              id: grupo.code,
              etiqueta: grupo.name,
              detalle: describirGrupo(grupo),
              contenido: <Contenido facilities={grupo.facilities} layout={layout} />,
            }))}
          />
        ) : (
          <Contenido facilities={facilities} layout={layout} />
        )}
      </div>
    </section>
  );
}
