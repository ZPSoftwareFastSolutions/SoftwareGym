/**
 * CAPA: Presentation / Sections
 *
 * Clases dirigidas: el catálogo y la agenda semanal.
 *
 * DOS SECCIONES EN UN ARCHIVO porque son dos vistas del MISMO dato y siempre
 * cambian juntas: si el gimnasio suma una clase, la tarjeta y la agenda tienen
 * que contarlo igual. Separarlas en dos archivos solo garantiza que un día una
 * se actualice y la otra no.
 *
 * EL REPARTO POR SEDE ES DATO, no código. Cada franja dice en qué sucursal se
 * dicta; con más de una sede, ambas vistas se presentan en pestañas. Con una
 * sola, la lista de siempre y ninguna pestaña que sobre. La sección no sabe qué
 * gimnasio la está usando ni cuántas sucursales tiene.
 *
 * Aquí no se reserva nada: no hay cupo, ni instructor, ni sesión. Es el horario
 * que el gimnasio reparte en papel, puesto en una página.
 */

import type { CategoriaDeClase, ClaseDeVitrina } from '@core/domain/catalog/classes';
import {
  clasesDeSede,
  diasLegibles,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_NIVEL_DE_CLASE,
  rangoLegible,
  semanaDeSede,
  totalDeFranjas,
} from '@core/domain/catalog/classes';
import type { SedeDeVitrina } from '@core/domain/catalog/branches';
import type { IconKey } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Badge } from '../ui/Badge';
import { Pestanas } from '../ui/Pestanas';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

/** Cada familia de clase tiene su icono. Es decoración, nunca información. */
const ICONO_DE_CATEGORIA: Readonly<Record<CategoriaDeClase, IconKey>> = {
  baile: 'group',
  combate: 'boxing',
  fit: 'heart',
  mente_cuerpo: 'yoga',
  fuerza: 'dumbbell',
  otro: 'sparkle',
};

interface ClassesSectionProps {
  readonly clases: readonly ClaseDeVitrina[];
  /** Sedes donde se dictan. Con más de una, el catálogo se reparte en pestañas. */
  readonly sedes?: readonly SedeDeVitrina[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
  /** Recorta el catálogo en la portada: lo completo vive en `/clases`. */
  readonly limit?: number;
}

function TarjetaDeClase({ clase, indice }: { readonly clase: ClaseDeVitrina; readonly indice: number }) {
  const dias = diasLegibles(clase.horarios);

  return (
    <article className="surface-card flex h-full flex-col overflow-hidden transition-colors hover:border-action/40">
      <ArtFrame seed={clase.seed} icon={ICONO_DE_CATEGORIA[clase.category]} ratio="16 / 10" />

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-action">
            {NOMBRE_DE_CATEGORIA[clase.category]}
          </p>
          <h3 className="t-h3 mt-1.5">{clase.name}</h3>
        </div>

        {clase.description && <p className="text-[0.92rem] leading-relaxed text-muted">{clase.description}</p>}

        <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.84rem] text-ink">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="star" size={15} className="text-action" />
            {NOMBRE_DE_NIVEL_DE_CLASE[clase.level]}
          </span>
          {dias && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={15} className="text-action" />
              {dias}
            </span>
          )}
        </p>

        {clase.horarios.length > 0 && (
          <ul className="mt-auto flex flex-col gap-1.5 border-t border-line pt-4 text-[0.88rem]">
            {clase.horarios.map((franja) => (
              <li
                key={`${franja.weekday}-${franja.startTime}-${franja.branchCode}`}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <span className="text-ink">{NOMBRE_DE_DIA_ISO[franja.weekday]}</span>
                <span className="font-mono text-muted">{rangoLegible(franja)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* La salvedad se dice, no se esconde: es la diferencia entre «aquí no
            hay esta clase» y «aquí la hay, pero el horario no está cerrado». */}
        {clase.note && (
          <p
            className={cn(
              'flex items-start gap-2.5 text-[0.86rem] text-muted',
              clase.horarios.length > 0 ? 'mt-1' : 'mt-auto border-t border-line pt-4',
            )}
          >
            <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-action" />
            {clase.note}
          </p>
        )}
      </div>
    </article>
  );
}

function Reticula({ clases }: { readonly clases: readonly ClaseDeVitrina[] }) {
  if (clases.length === 0) return null;
  return (
    <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {clases.map((clase, indice) => (
        <li key={clase.id}>
          <Reveal delay={Math.min(indice, 5) * 70} className="h-full">
            <TarjetaDeClase clase={clase} indice={indice} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export function ClassesSection({
  clases,
  sedes = [],
  eyebrow = 'Clases dirigidas',
  title = 'Entrena en grupo',
  lead,
  limit,
}: ClassesSectionProps) {
  if (clases.length === 0) return null;

  const porSede = sedes.length > 1;
  const recortar = (lista: readonly ClaseDeVitrina[]) => (limit ? lista.slice(0, limit) : lista);

  return (
    <section className="section" aria-label={title}>
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        {porSede ? (
          <Pestanas
            className="mt-12"
            etiquetaDelGrupo="Sucursales"
            pestanas={sedes.map((sede) => {
              const propias = clasesDeSede(clases, sede.code);
              const franjas = totalDeFranjas(clases, sede.code);
              return {
                id: sede.code,
                etiqueta: sede.name,
                detalle: franjas === 1 ? '1 clase semanal' : `${franjas} clases semanales`,
                contenido: <Reticula clases={recortar(propias)} />,
              };
            })}
          />
        ) : (
          <Reticula clases={recortar(clases)} />
        )}
      </div>
    </section>
  );
}

interface ClassScheduleSectionProps {
  readonly clases: readonly ClaseDeVitrina[];
  readonly sedes: readonly SedeDeVitrina[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

function Agenda({ clases, code }: { readonly clases: readonly ClaseDeVitrina[]; readonly code: string }) {
  const semana = semanaDeSede(clases, code);

  if (semana.length === 0) {
    return (
      <p className="mt-8 flex items-start gap-3 text-[0.9rem] text-muted">
        <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-action" />
        Consulta en recepción las clases de esta sede.
      </p>
    );
  }

  return (
    <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {semana.map(({ dia, franjas }) => (
        <li key={dia} className="surface-card flex flex-col gap-3 p-5">
          <p className="font-semibold text-ink">{NOMBRE_DE_DIA_ISO[dia]}</p>
          <ul className="flex flex-col gap-2">
            {franjas.map((franja) => (
              <li
                key={`${franja.claseId}-${franja.startTime}`}
                className="flex flex-col rounded-[var(--t-radius-sm)] bg-raised px-3 py-2"
              >
                <span className="text-[0.9rem] font-semibold text-ink">{franja.clase}</span>
                <span className="font-mono text-[0.8rem] text-muted">{rangoLegible(franja)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** La semana completa, sede por sede. Es el cartel de recepción, en la página. */
export function ClassScheduleSection({
  clases,
  sedes,
  eyebrow = 'Semana',
  title = 'Horario de clases',
  lead,
}: ClassScheduleSectionProps) {
  if (clases.length === 0 || sedes.length === 0) return null;

  const porSede = sedes.length > 1;

  return (
    <section className="section pt-0" aria-label={title}>
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        {porSede ? (
          <Pestanas
            className="mt-12"
            etiquetaDelGrupo="Sucursales"
            pestanas={sedes.map((sede) => ({
              id: sede.code,
              etiqueta: sede.name,
              detalle: `${semanaDeSede(clases, sede.code).length} días con clase`,
              contenido: <Agenda clases={clases} code={sede.code} />,
            }))}
          />
        ) : (
          <div className="mt-4">
            <Agenda clases={clases} code={sedes[0]!.code} />
          </div>
        )}

        <p className="mt-8 flex items-start gap-3 text-[0.88rem] text-muted">
          <Icon name="calendar" size={17} className="mt-0.5 shrink-0 text-action" />
          El horario se repite cada semana. Si una clase se suspende un día, lo avisamos en recepción y en
          nuestras redes.
        </p>
      </div>
    </section>
  );
}
