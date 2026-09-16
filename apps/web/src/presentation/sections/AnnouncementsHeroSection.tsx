/**
 * CAPA: Presentation / Sections
 *
 * Portada con los anuncios como pieza principal (V4.2, estilo de portada
 * `anuncios`).
 *
 * PARA QUIÉN. Un gimnasio que comunica por panfletos —clases nuevas, eventos,
 * promociones— necesita que lo que pasa esta semana sea lo primero que se ve, no
 * algo que aparece después de una portada a pantalla completa. El encargo de
 * GOLD lo pedía así (V4.1 §6 y §17): identidad, y enseguida los anuncios.
 *
 * QUÉ NO ES. No es la portada de GOLD: no sabe qué gimnasio la usa. La elige
 * cualquier cliente declarando `home.estilo = 'anuncios'`, y toma todo —títulos,
 * lema, cifras, sedes, colores, tipografía y acabado— de su configuración.
 *
 * COMPACTA A PROPÓSITO. La portada clásica ocupa el 92 % del alto de la
 * pantalla; ésta ocupa lo que su contenido, para que en un portátil el primer
 * anuncio se vea sin desplazarse.
 *
 * SIN ANUNCIOS PUBLICADOS no queda un hueco: la columna muestra las cifras del
 * gimnasio (`hero.stats`), las mismas que la portada clásica. Nada se inventa
 * para rellenar.
 *
 * Es el LCP: el titular se pinta en el servidor sin animación de entrada.
 */

import type { AnuncioPublico } from '@core/domain/operations/announcements';
import type { HeroContent } from '@core/domain/tenant/tenant-config';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { AnunciosCarrusel } from '../patterns/AnunciosCarrusel';
import { LinkButton } from '../ui/Button';

interface AnnouncementsHeroSectionProps {
  readonly hero: HeroContent;
  readonly slug: string;
  readonly anuncios: readonly AnuncioPublico[];
  /** Sedes activas. Con una sola o ninguna no se nombran. */
  readonly sedes?: readonly string[];
}

function Cifras({ stats, compactas }: { readonly stats: HeroContent['stats']; readonly compactas: boolean }) {
  return (
    <dl
      className={
        compactas
          ? 'mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-7 sm:grid-cols-4'
          : 'grid grid-cols-2 gap-px overflow-hidden rounded-[var(--t-radius-lg)] border border-line bg-line'
      }
    >
      {stats.map((stat) => (
        <div key={stat.label} className={compactas ? '' : 'bg-surface px-6 py-10 text-center'}>
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span
              className={
                compactas
                  ? 't-accent block text-[2.6rem] font-bold leading-none'
                  : 't-accent block text-5xl font-bold leading-none lg:text-6xl'
              }
              style={{ fontFamily: 'var(--t-font-display)' }}
            >
              {stat.value}
            </span>
            <span className="mt-2 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
              {stat.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AnnouncementsHeroSection({ hero, slug, anuncios, sedes = [] }: AnnouncementsHeroSectionProps) {
  const conAnuncios = anuncios.length > 0;

  return (
    <section className="relative overflow-hidden pt-[var(--header-height)]" aria-labelledby="hero-title">
      <div aria-hidden="true" className="bg-aura" />
      <div aria-hidden="true" className="bg-grid" />

      <div className="shell relative grid gap-12 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14 lg:py-16">
        <div>
          <p className="t-eyebrow t-eyebrow--flanked">{hero.eyebrow}</p>

          {/* El acento va en su propia línea: en una marca de titulares altos y
              condensados, «ENTRENA / EN GOLD» se lee como un cartel. */}
          <h1 id="hero-title" className="t-display mt-6">
            {hero.title}
            <span className="t-accent block">{hero.titleAccent}</span>
          </h1>

          {hero.motto && <p className="t-script mt-4 text-[clamp(1.5rem,1.2rem+1.1vw,2rem)]">{hero.motto}</p>}

          <p className="t-lead mt-5 max-w-xl">{hero.subtitle}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <LinkButton href={tenantHref(slug, hero.primaryCta.segment)} size="lg" icon="arrowRight" glow>
              {hero.primaryCta.label}
            </LinkButton>
            <LinkButton href={tenantHref(slug, hero.secondaryCta.segment)} variant="secondary" size="lg">
              {hero.secondaryCta.label}
            </LinkButton>
          </div>

          {sedes.length > 1 && (
            <div className="mt-9 border-t border-line pt-6">
              {hero.branchesLabel && (
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">{hero.branchesLabel}</p>
              )}
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Sedes">
                {sedes.map((sede) => (
                  <li key={sede}>
                    <a
                      href={tenantHref(slug, 'sucursales')}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--t-radius-md)] border border-line bg-card px-3 text-[0.8rem] text-ink transition-colors hover:border-action hover:text-action"
                    >
                      <Icon name="pin" size={14} className="text-action" />
                      {sede}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Con anuncios, las cifras bajan a una fila bajo la identidad: la
              columna de al lado ya es la pieza principal. */}
          {conAnuncios && <Cifras stats={hero.stats} compactas />}
        </div>

        <div>
          {conAnuncios ? (
            <section aria-label="Anuncios del gimnasio">
              <div className="-mb-11 flex h-11 items-center gap-2.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-highlight" />
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-action">
                  {hero.announcementsLabel ?? 'Novedades'}
                </span>
              </div>
              <AnunciosCarrusel anuncios={anuncios} presentacion="destacado" />
            </section>
          ) : (
            <Cifras stats={hero.stats} compactas={false} />
          )}
        </div>
      </div>
    </section>
  );
}
