'use client';

import type { HeroContent } from '@core/domain/tenant/tenant-config';
import { tenantHref } from '@/lib/tenant-links';
import { LinkButton } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { ArtFrame } from '@/presentation/ui/ArtFrame';
import { Reveal } from '@/presentation/ui/Reveal';

interface HeroProps {
  readonly hero: HeroContent;
  readonly slug: string;
  readonly sedes?: readonly string[];
}

export function HeroSection({ hero, slug, sedes }: HeroProps) {
  return (
    <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl pt-20 pb-32">
        <div className="flex flex-col items-center text-center space-y-8">
          
          <Reveal delay={0}>
            <div className="inline-flex items-center gap-2 rounded-full border border-action/40 bg-action/10 px-5 py-2 text-sm font-medium text-action backdrop-blur-md shadow-[0_0_15px_rgba(57,255,20,0.2)]">
              <Icon name="sparkle" size={16} />
              <span>{sedes && sedes.length > 0 ? sedes.join(' • ') : 'El olimpo del fitness'}</span>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-2xl max-w-5xl leading-[1.1]" style={{ fontFamily: 'var(--t-font-display)' }}>
              {hero.title}{' '}
              <br className="hidden md:block" />
              <span className="relative inline-block mt-4 md:mt-0">
                <span className="absolute inset-0 bg-action blur-[40px] opacity-60 animate-pulse mix-blend-screen"></span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-action via-white to-action bg-[length:200%_auto] animate-[gradient-x_4s_linear_infinite]">
                  {hero.titleAccent}
                </span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="max-w-2xl text-lg md:text-xl text-white/80 font-medium leading-relaxed drop-shadow-md">
              {hero.subtitle}
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
              <LinkButton
                href={tenantHref(slug, `${hero.primaryCta.segment}`)}
                size="lg"
                className="bg-action text-black hover:bg-action/90 hover:scale-105 hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] h-14 px-8 text-lg font-bold border-none transition-all duration-300"
              >
                {hero.primaryCta.label}
              </LinkButton>
              {hero.secondaryCta && (
                <LinkButton
                  href={tenantHref(slug, `${hero.secondaryCta.segment}`)}
                  variant="outline"
                  size="lg"
                  className="bg-white/5 text-white border border-white/20 hover:bg-white/10 hover:border-white/40 hover:scale-105 h-14 px-8 text-lg transition-all duration-300"
                >
                  {hero.secondaryCta.label}
                </LinkButton>
              )}</div>
          </Reveal>
        </div>
      </div>
      
      {/* Elementos decorativos mitológicos / de energía */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0c0e0f] to-transparent z-10 pointer-events-none" />
    </section>
  );
}
