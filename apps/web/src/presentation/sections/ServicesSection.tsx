'use client';

import type { ServiceItem } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { Icon } from '@/presentation/icons/Icon';
import { Reveal } from '@/presentation/ui/Reveal';

interface ServicesProps {
  readonly services: readonly ServiceItem[];
}

export function ServicesSection({ services }: ServicesProps) {
  if (services.length === 0) return null;

  return (
    <section className="relative w-full py-16">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        <div className="mb-16 md:text-center max-w-3xl md:mx-auto">
          <Reveal>
            <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">El Arsenal Mítico</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
              Forja tu mejor versión
            </h3>
          </Reveal>
        </div>

        {/* BENTO BOX GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
          {services.map((service, index) => {
            // Reglas dinámicas del Bento Box para evitar huecos:
            // El primero siempre es destacado (2x2) si hay más de 1 item.
            // Los siguientes rellenan el espacio.
            const isFeatured = index === 0 && services.length > 1;
            
            return (
              <Reveal 
                key={service.id} 
                delay={index * 100}
                className={cn(
                  'h-full',
                  isFeatured 
                    ? 'md:col-span-2 md:row-span-2' 
                    : 'col-span-1'
                )}
              >
                <article
                  className={cn(
                    'group relative h-full flex flex-col justify-between overflow-hidden rounded-[32px]',
                    'bg-white/5 backdrop-blur-xl border border-white/10',
                    'transition-all duration-500 hover:border-action/50 hover:bg-white/10 hover:shadow-[0_0_40px_rgb(var(--t-action-rgb)/0.1)]',
                    isFeatured ? 'p-10' : 'p-8'
                  )}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-125 group-hover:text-action transition-all duration-700 pointer-events-none">
                    <Icon name={service.icon} size={isFeatured ? 160 : 80} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className={cn(
                      'flex items-center justify-center rounded-2xl bg-action/20 text-action mb-6',
                      isFeatured ? 'w-20 h-20' : 'w-14 h-14'
                    )}>
                      <Icon name={service.icon} size={isFeatured ? 36 : 24} />
                    </div>
                    <h4 className={cn('font-bold text-white mb-3', isFeatured ? 'text-4xl' : 'text-2xl')} style={{ fontFamily: 'var(--t-font-display)' }}>
                      {service.name}
                    </h4>
                    <p className="text-white/70 leading-relaxed text-sm">
                      {service.summary}
                    </p>
                  </div>

                  <div className="relative z-10 mt-8">
                    <ul className="flex flex-wrap gap-2">
                      {service.highlights.slice(0, isFeatured ? 4 : 2).map((h) => (
                        <li key={h} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-white/90 text-xs border border-white/10">
                          <Icon name="check" size={12} className="text-action" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
