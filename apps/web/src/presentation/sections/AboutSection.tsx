'use client';

import type { AboutContent } from '@core/domain/tenant/tenant-config';
import { Icon, hasIcon } from '@/presentation/icons/Icon';
import { Reveal } from '@/presentation/ui/Reveal';
import { cn } from '@/lib/cn';

interface AboutProps {
  readonly about: AboutContent;
}

export function AboutSection({ about }: AboutProps) {
  return (
    <div className="w-full">
      {/* 1. TRAYECTORIA (HISTORIA) - AHORA ARRIBA COMO PIDIÓ EL USUARIO */}
      {about.milestones.length > 0 && (
        <section className="relative w-full py-20" aria-labelledby="historia-title">
          <div className="shell max-w-5xl mx-auto">
            <Reveal>
              <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3 text-center">Nuestra Trayectoria</h2>
              <h3 id="historia-title" className="text-4xl md:text-5xl font-black text-white text-center mb-16" style={{ fontFamily: 'var(--t-font-display)' }}>
                Forjando Leyendas
              </h3>
            </Reveal>

            <div className="relative border-l-2 border-white/10 ml-4 md:ml-0 md:border-l-0">
              {/* Línea central en desktop */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />
              
              <div className="space-y-12">
                {about.milestones.map((milestone, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <Reveal key={milestone.year} delay={index * 100}>
                      <div className={cn(
                        "relative flex flex-col md:flex-row items-center",
                        isEven ? "md:flex-row-reverse" : ""
                      )}>
                        {/* Punto central */}
                        <div className="absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-action -translate-x-[9px] md:-translate-x-1/2 shadow-[0_0_15px_rgba(57,255,20,0.8)] z-10" />
                        
                        {/* Contenido */}
                        <div className={cn(
                          "w-full md:w-1/2 pl-8 md:pl-0",
                          isEven ? "md:pr-16 text-left md:text-right" : "md:pl-16 text-left"
                        )}>
                          <div className="bg-black/40 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/10 hover:border-action/30 transition-all hover:-translate-y-1 hover:bg-black/60">
                            <span className="inline-block text-3xl font-black text-action mb-2" style={{ fontFamily: 'var(--t-font-display)' }}>
                              {milestone.year}
                            </span>
                            <p className="text-white/70 text-lg leading-relaxed">
                              {milestone.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. VALORES */}
      <section className="relative w-full py-20 bg-white/5" aria-labelledby="valores-title">
        <div className="shell max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3 text-center">Nuestra Filosofía</h2>
            <h3 id="valores-title" className="text-4xl md:text-5xl font-black text-white text-center mb-16" style={{ fontFamily: 'var(--t-font-display)' }}>
              Cómo trabajamos
            </h3>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {about.values.map((value, index) => (
              <Reveal key={value.title} delay={index * 100} className="h-full">
                <article className="group h-full bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] transition-all duration-300 hover:border-action/40 hover:bg-black/60 hover:shadow-[0_0_30px_rgba(57,255,20,0.1)]">
                  <div className="w-14 h-14 bg-action/10 text-action rounded-2xl flex items-center justify-center mb-6 group-hover:bg-action group-hover:text-black transition-colors">
                    <Icon name={hasIcon(value.icon) ? value.icon : 'sparkle'} size={24} />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--t-font-display)' }}>
                    {value.title}
                  </h4>
                  <p className="text-white/60 leading-relaxed">
                    {value.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. RELATO Y MANIFIESTO */}
      <section className="relative w-full py-24" aria-labelledby="manifiesto-title">
        <div className="shell max-w-4xl mx-auto text-center">
          <Reveal>
            <Icon name="quote" size={48} className="text-action/20 mx-auto mb-8" />
            <div className="space-y-6">
              {about.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-xl md:text-2xl font-medium text-white/80 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
