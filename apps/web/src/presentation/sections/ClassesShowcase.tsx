/**
 * CAPA: Presentation / Sections
 *
 * Clases en la vitrina (V4.2): catálogo y horario semanal.
 *
 * POR QUÉ SE REHIZO. Cada tarjeta listaba todas sus franjas y el «horario de la
 * semana» eran siete columnas con todas las clases: con los sesenta horarios de
 * un gimnasio grande, una página que no terminaba y en la que no se encontraba
 * «qué hay hoy por la tarde». Ahora:
 *   · la tarjeta RESUME la clase (qué es, cuánto dura, qué días y a qué horas,
 *     dónde, qué paquete la incluye) con la misma gramática visual de la portada;
 *   · el horario va por DÍA en pestañas, abierto en hoy, y dentro del día por
 *     tramo (mañana, tarde, noche). Nada se esconde: cada día está a un toque.
 *
 * Es del producto: la usan `/clases` y `/horarios` de cualquier gimnasio.
 */

import Link from 'next/link';
import {
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_MODO_DE_ACCESO,
  NOMBRE_DE_NIVEL_DE_CLASE,
  type ClasePublica,
  type DiaIso,
} from '@core/domain/operations/classes';
import {
  diasDeLaClase,
  franjasPorDia,
  horasDeLaClase,
  INICIAL_DE_DIA,
  NOMBRE_DE_TRAMO,
  tramosDelDia,
} from '@core/domain/operations/horario-de-clases';
import { cn } from '@/lib/cn';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { Badge } from '../ui/Badge';
import { Pestanas } from '../ui/Pestanas';

const DIAS: readonly DiaIso[] = [1, 2, 3, 4, 5, 6, 7];

function Acceso({ clase, slug }: { readonly clase: ClasePublica; readonly slug: string }) {
  if (clase.accessMode !== 'planes') {
    return (
      <p className="text-[0.82rem] text-muted">
        {clase.accessMode === 'membresia' ? 'Incluida en todos los paquetes.' : NOMBRE_DE_MODO_DE_ACCESO.abierta}
      </p>
    );
  }
  if (clase.planes.length === 0) return <p className="text-[0.82rem] text-muted">Consulta en recepción qué paquete la incluye.</p>;
  return (
    <div>
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted">Incluida en</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {clase.planes.map((p) => (
          <li key={p.id}>
            <Link
              href={tenantHref(slug, 'planes')}
              className="inline-flex min-h-8 items-center rounded-[var(--t-radius-sm)] border border-line bg-raised px-2.5 text-[0.74rem] font-semibold text-ink transition-colors hover:border-action hover:text-action"
            >
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaDeClase({
  clase,
  slug,
  nombreDeSede,
  multisede,
}: {
  readonly clase: ClasePublica;
  readonly slug: string;
  readonly nombreDeSede: ReadonlyMap<string, string>;
  readonly multisede: boolean;
}) {
  const dias = diasDeLaClase(clase);
  const horas = horasDeLaClase(clase);
  const sedes = multisede ? [...new Set(clase.horarios.map((h) => nombreDeSede.get(h.branchId)).filter((n): n is string => Boolean(n)))] : [];

  return (
    <article id={`clase-${clase.id}`} className="surface-card flex h-full scroll-mt-28 flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-line px-6 pb-5 pt-6">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-action">{NOMBRE_DE_CATEGORIA[clase.category]}</p>
          <h3 className="t-h3 mt-1.5 leading-tight">{clase.name}</h3>
        </div>
        {clase.kind === 'evento' && <Badge tone="highlight">Evento</Badge>}
      </header>

      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        {clase.description && <p className="line-clamp-3 text-[0.9rem] leading-relaxed text-muted">{clase.description}</p>}

        <ul className="flex flex-wrap gap-1.5" aria-label="Datos de la clase">
          <li className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--t-radius-sm)] bg-raised px-2.5 text-[0.76rem] text-ink">
            <Icon name="clock" size={14} className="text-action" /> {clase.durationMinutes} min
          </li>
          <li className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--t-radius-sm)] bg-raised px-2.5 text-[0.76rem] text-ink">
            <Icon name="star" size={14} className="text-action" /> {NOMBRE_DE_NIVEL_DE_CLASE[clase.level]}
          </li>
        </ul>

        {dias.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <ol className="grid grid-cols-7 gap-1" aria-label={`Días: ${dias.map((d) => NOMBRE_DE_DIA_ISO[d]).join(', ')}`}>
              {DIAS.map((dia) => {
                const activo = dias.includes(dia);
                return (
                  <li
                    key={dia}
                    aria-hidden="true"
                    className={cn(
                      'grid h-8 place-items-center rounded-[var(--t-radius-sm)] text-[0.74rem] font-bold',
                      activo ? 'bg-action text-on-action' : 'border border-line text-muted/60',
                    )}
                  >
                    {INICIAL_DE_DIA[dia]}
                  </li>
                );
              })}
            </ol>
            <p className="text-[0.86rem] text-ink">
              <span className="text-muted">{horas.length === 1 ? 'A las ' : 'Horas: '}</span>
              <span className="font-semibold tabular-nums">{horas.slice(0, 5).join(' · ')}</span>
              {horas.length > 5 && <span className="text-muted"> y {horas.length - 5} más</span>}
            </p>
            {sedes.length > 0 && (
              <p className="flex items-start gap-1.5 text-[0.8rem] text-muted">
                <Icon name="pin" size={14} className="mt-0.5 shrink-0 text-action" />
                {sedes.join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[0.84rem] text-muted">Sin horario fijo: consulta las fechas en recepción.</p>
        )}

        <div className="mt-auto border-t border-line pt-4">
          <Acceso clase={clase} slug={slug} />
        </div>
      </div>
    </article>
  );
}

interface CatalogoDeClasesProps {
  readonly clases: readonly ClasePublica[];
  readonly slug: string;
  readonly nombreDeSede: ReadonlyMap<string, string>;
  readonly multisede: boolean;
}

export function CatalogoDeClases({ clases, slug, nombreDeSede, multisede }: CatalogoDeClasesProps) {
  const rejilla = (lista: readonly ClasePublica[]) => (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {lista.map((clase) => (
        <li key={clase.id}>
          <TarjetaDeClase clase={clase} slug={slug} nombreDeSede={nombreDeSede} multisede={multisede} />
        </li>
      ))}
    </ul>
  );

  // Con pocas clases, una sola rejilla. Con muchas y de varias categorías, se
  // filtran por categoría: nadie busca «Yoga» leyendo quince tarjetas.
  const categorias = [...new Set(clases.map((c) => c.category))];
  if (clases.length <= 6 || categorias.length < 2) return rejilla(clases);

  return (
    <Pestanas
      etiquetaDelGrupo="Categorías de clases"
      pestanas={[
        { id: 'categoria-todas', etiqueta: 'Todas', detalle: `${clases.length} clases`, contenido: <div className="mt-6">{rejilla(clases)}</div> },
        ...categorias.map((categoria) => {
          const lista = clases.filter((c) => c.category === categoria);
          return {
            id: `categoria-${categoria}`,
            etiqueta: NOMBRE_DE_CATEGORIA[categoria],
            detalle: `${lista.length} ${lista.length === 1 ? 'clase' : 'clases'}`,
            contenido: <div className="mt-6">{rejilla(lista)}</div>,
          };
        }),
      ]}
    />
  );
}

interface HorarioSemanalDeClasesProps {
  readonly clases: readonly ClasePublica[];
  readonly nombreDeSede: ReadonlyMap<string, string>;
  readonly multisede: boolean;
  /** Día ISO de hoy en la zona del gimnasio: la pestaña con la que abre. */
  readonly hoy: DiaIso;
}

export function HorarioSemanalDeClases({ clases, nombreDeSede, multisede, hoy }: HorarioSemanalDeClasesProps) {
  const porDia = franjasPorDia(clases);

  return (
    <Pestanas
      etiquetaDelGrupo="Días de la semana"
      inicial={DIAS.indexOf(hoy)}
      pestanas={DIAS.map((dia) => {
        const franjas = porDia.get(dia) ?? [];
        return {
          id: `dia-${dia}`,
          etiqueta: NOMBRE_DE_DIA_ISO[dia],
          detalle: `${dia === hoy ? 'Hoy · ' : ''}${franjas.length === 0 ? 'sin clases' : `${franjas.length} ${franjas.length === 1 ? 'clase' : 'clases'}`}`,
          contenido:
            franjas.length === 0 ? (
              <p className="mt-6 rounded-[var(--t-radius-md)] border border-line bg-raised px-5 py-6 text-center text-muted">
                {NOMBRE_DE_DIA_ISO[dia]} no hay clases programadas.
              </p>
            ) : (
              <div className="mt-6 flex flex-col gap-7">
                {tramosDelDia(franjas).map(({ tramo, franjas: delTramo }) => (
                  <section key={tramo} aria-label={`${NOMBRE_DE_DIA_ISO[dia]} · ${NOMBRE_DE_TRAMO[tramo]}`}>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">{NOMBRE_DE_TRAMO[tramo]}</p>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {delTramo.map((f) => (
                        <li key={f.id} className="flex items-center gap-4 rounded-[var(--t-radius-md)] border border-line bg-card px-4 py-3.5">
                          <span className="t-accent shrink-0 text-[1.55rem] font-bold leading-none tabular-nums" style={{ fontFamily: 'var(--t-font-display)' }}>
                            {f.inicio}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{f.clase}</span>
                            <span className="block text-[0.78rem] text-muted">
                              hasta las {f.fin}
                              {multisede && nombreDeSede.get(f.branchId) ? ` · ${nombreDeSede.get(f.branchId)}` : ''}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ),
        };
      })}
    />
  );
}
