/**
 * CAPA: Presentation / Sections
 * Portada del sitio. Es el elemento LCP: no lleva animación de entrada que
 * retrase su pintado ni imágenes que compitan por ancho de banda.
 */

import type { HeroContent } from '@core/domain/tenant/tenant-config';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';

interface HeroSectionProps {
  readonly hero: HeroContent;
  readonly slug: string;
}

export function HeroSection({ hero, slug }: HeroSectionProps) {
  return (
    <section
      className="relative flex min-h-[92svh] items-center overflow-hidden pt-[var(--header-height)]"
      aria-labelledby="hero-title"
    >
      <div aria-hidden="true" className="bg-aura" />
      <div aria-hidden="true" className="bg-grid" />
      <div aria-hidden="true" className="bg-noise" />

      <div className="shell relative py-20 lg:py-24">
        <div className="max-w-4xl">
          <p className="t-eyebrow">{hero.eyebrow}</p>

          <h1 id="hero-title" className="t-display mt-7">
            {hero.title}{' '}
            <span className="t-accent">{hero.titleAccent}</span>
          </h1>

          <p className="t-lead mt-7 max-w-2xl">{hero.subtitle}</p>

          <div className="mt-10 flex flex-col gap-3.5 sm:flex-row sm:items-center">
            <LinkButton
              href={tenantHref(slug, hero.primaryCta.segment)}
              size="lg"
              icon="arrowRight"
              glow
            >
              {hero.primaryCta.label}
            </LinkButton>
            <LinkButton
              href={tenantHref(slug, hero.secondaryCta.segment)}
              variant="secondary"
              size="lg"
            >
              {hero.secondaryCta.label}
            </LinkButton>
          </div>
        </div>

        <Reveal delay={220}>
          <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--t-radius-lg)] border border-line bg-line lg:mt-20 lg:grid-cols-4">
            {hero.stats.map((stat) => (
              <div key={stat.label} className="bg-surface px-5 py-7 text-center sm:px-7">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span
                    className="block text-4xl font-bold leading-none text-action lg:text-5xl"
                    style={{ fontFamily: 'var(--t-font-display)' }}
                  >
                    {stat.value}
                  </span>
                  <span className="mt-2.5 block text-[0.76rem] uppercase tracking-[0.14em] text-muted">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <span
        aria-hidden="true"
        className="absolute bottom-7 start-1/2 hidden -translate-x-1/2 text-muted lg:block"
      >
        <Icon name="arrowDown" size={20} />
      </span>
    </section>
  );
}
