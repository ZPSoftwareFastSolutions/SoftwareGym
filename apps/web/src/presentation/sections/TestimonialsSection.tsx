'use client';

import type { Testimonial } from '@core/domain/catalog/catalog';
import { Icon } from '@/presentation/icons/Icon';
import { Reveal } from '@/presentation/ui/Reveal';

interface TestimonialsProps {
  readonly testimonials: readonly Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="relative w-full py-24 overflow-hidden">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">El Olimpo</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
              Leyendas Reales
            </h3>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <Reveal key={t.author} delay={idx * 150} className="h-full">
              <article className="relative h-full p-8 rounded-[32px] bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col transition-all hover:bg-white/10 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                <Icon name="quote" size={32} className="text-action/30 mb-6" />
                
                <p className="text-white/80 text-lg leading-relaxed mb-8 flex-1 italic">
                  "{t.quote}"
                </p>
                
                <footer className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-white text-lg">{t.author}</div>
                    <div className="text-action text-sm font-medium uppercase tracking-wider">{t.context}</div>
                  </div>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
