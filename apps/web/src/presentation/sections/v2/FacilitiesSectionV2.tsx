'use client';

import { useState } from 'react';
import type { FacilityItem } from '@core/domain/catalog/catalog';
import { agruparInstalacionesPorSede, necesitaPestanasDeSede, type SedeDeInstalaciones } from '@core/domain/catalog/facilities';
import { cn } from '@/lib/cn';
import { Icon } from '@/presentation/icons/Icon';
import { Reveal } from '@/presentation/ui/Reveal';
import { ArtFrame } from '@/presentation/ui/ArtFrame';

interface FacilitiesSectionV2Props {
  readonly facilities: readonly FacilityItem[];
  readonly sucursales?: readonly SedeDeInstalaciones[];
  readonly eyebrow?: string;
  readonly title?: string;
}

export function FacilitiesSectionV2({ facilities, sucursales = [], eyebrow, title }: FacilitiesSectionV2Props) {
  const gruposCrudos = agruparInstalacionesPorSede(facilities, sucursales);
  const usarPestanas = necesitaPestanasDeSede(gruposCrudos);
  const grupos = usarPestanas 
    ? gruposCrudos.map(g => ({ key: g.code, label: g.name, items: g.facilities }))
    : [{ key: 'general', label: '', items: facilities }];
  
  const [activeTab, setActiveTab] = useState(grupos[0]?.key || '');

  const itemsAMostrar = grupos.find(g => g.key === activeTab)?.items || [];

  return (
    <section className="relative w-full py-20">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        <Reveal>
          <div className="mb-16 md:text-center max-w-3xl md:mx-auto">
            {eyebrow && <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">{eyebrow}</h2>}
            {title && <h3 className="text-4xl md:text-6xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>{title}</h3>}
          </div>
        </Reveal>

        {usarPestanas && (
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {grupos.map((grupo) => (
              <button
                key={grupo.key}
                onClick={() => setActiveTab(grupo.key)}
                className={cn(
                  'px-8 py-3 rounded-full font-bold text-sm tracking-widest uppercase transition-all duration-300 border',
                  activeTab === grupo.key 
                    ? 'bg-action text-black border-action shadow-[0_0_20px_rgba(57,255,20,0.3)]' 
                    : 'bg-black/40 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                )}
              >
                Sede {((grupo.label || '').split('·')[0] || '').trim()}
              </button>
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-col gap-16 lg:gap-32">
          {itemsAMostrar.map((facility, index) => {
            const reversed = index % 2 === 1;

            return (
              <Reveal key={facility.id} delay={100}>
                <article
                  className={cn(
                    'grid items-center gap-8 lg:grid-cols-2 lg:gap-16',
                    reversed && 'lg:[&>*:first-child]:order-2'
                  )}
                >
                  <div className="relative w-full aspect-[4/3] lg:aspect-[5/4] rounded-[2rem] overflow-hidden border border-white/10 group hover:border-action/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-60" />
                    <ArtFrame 
                      seed={index * 29 + 13} 
                      icon={facility.icon} 
                      ratio="4 / 3" 
                      className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-action border border-white/10">
                        <Icon name={facility.icon} size={20} />
                      </span>
                      {facility.area && (
                        <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-white uppercase tracking-widest">
                          {facility.area}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-3xl lg:text-5xl font-bold text-white mb-4 uppercase" style={{ fontFamily: 'var(--t-font-display)' }}>
                      {facility.name}
                    </h4>
                    <p className="text-white/60 text-lg leading-relaxed mb-8">
                      {facility.description}
                    </p>

                    {facility.stats && facility.stats.length > 0 && (
                      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                        {facility.stats.map((stat) => (
                          <div key={stat.label} className="bg-black/60 backdrop-blur-md px-4 py-6 text-center hover:bg-white/5 transition-colors">
                            <dt className="text-[0.65rem] uppercase tracking-[0.15em] text-white/50 font-bold mb-2 h-8 flex items-center justify-center">
                              {stat.label}
                            </dt>
                            <dd className="text-xl lg:text-2xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
                              {stat.value}
                            </dd>
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
      </div>
    </section>
  );
}
