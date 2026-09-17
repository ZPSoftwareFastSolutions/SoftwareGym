'use client';

import { tenantHref } from '@/lib/tenant-links';
import type { ContactInfo } from '@core/domain/tenant/tenant-config';
import { LinkButton } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { Reveal } from '@/presentation/ui/Reveal';

interface ClosingCtaProps {
  readonly cta: {
    readonly title: string;
    readonly subtitle: string;
    readonly label: string;
  };
  readonly contact: ContactInfo;
  readonly slug: string;
}

export function ClosingCtaSection({ cta, contact, slug }: ClosingCtaProps) {
  return (
    <section className="relative w-full py-32 mb-20">
      <div className="shell relative z-20 mx-auto w-full max-w-5xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-[3rem] bg-black/80 border border-white/10 p-12 md:p-20 text-center backdrop-blur-xl">
            {/* Elementos gráficos internos */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full bg-action/10 blur-[120px] pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-none" style={{ fontFamily: 'var(--t-font-display)' }}>
                {cta.title}
              </h2>
              <p className="text-xl md:text-2xl font-bold text-white/60 max-w-2xl mx-auto mb-12">
                {cta.subtitle}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <LinkButton
                  href={tenantHref(slug, 'contacto')}
                  size="lg"
                  className="bg-action text-black hover:bg-action/90 hover:scale-105 hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] h-16 px-10 text-lg font-bold border-none transition-all duration-300"
                >
                  {cta.label || 'VAMOS CON TODO'}
                </LinkButton>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
