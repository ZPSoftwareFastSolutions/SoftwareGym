'use client';

import type { SedeDeVitrina } from '@core/domain/catalog/branches';
import { urlDeMapaEmbebido, urlDeUbicacion } from '@core/domain/catalog/branches';
import { MapaBajoDemanda } from '@/presentation/patterns/MapaBajoDemanda';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '@/presentation/icons/Icon';
import { LinkButton } from '@/presentation/ui/Button';
import { Reveal } from '@/presentation/ui/Reveal';
import { cn } from '@/lib/cn';

interface BranchesProps {
  readonly sedes: readonly SedeDeVitrina[];
  readonly slug: string;
}

export function BranchesSection({ sedes, slug }: BranchesProps) {
  if (sedes.length === 0) return null;

  return (
    <section className="relative w-full py-24">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">Territorios</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
              Elige tu campo de batalla
            </h3>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {sedes.map((sede, index) => (
            <Reveal key={sede.name} delay={index * 150} className="h-full">
              <article className="group relative h-full flex flex-col p-8 md:p-12 overflow-hidden rounded-[32px] bg-black/40 backdrop-blur-xl border border-white/10 transition-all duration-500 hover:border-action/40 hover:bg-black/60 hover:shadow-[0_0_50px_rgb(var(--t-action-rgb)/0.1)]">
                {/* Aura de fondo */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-action/20 blur-[100px] rounded-full group-hover:bg-action/40 transition-colors duration-700 pointer-events-none" />
                
                <header className="relative z-10 flex items-start justify-between mb-8">
                  <div>
                    <h4 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'var(--t-font-display)' }}>
                      {sede.name}
                    </h4>
                    <p className="text-white/60 flex items-center gap-2">
                      <Icon name="pin" size={16} className="text-action" />
                      {sede.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-action/10 border border-action/20 rounded-full text-action text-xs font-bold tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-action animate-pulse shadow-[0_0_10px_var(--color-action)]" />
                    Activa
                  </div>
                </header>
                
                <div className="relative z-10 flex-1">
                  <h5 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-4">Equipamiento Principal</h5>
                  <ul className="flex flex-wrap gap-3 mb-8">
                    {sede.highlights.map((f) => (
                      <li key={f} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm flex items-center gap-2">
                        <Icon name="sparkle" size={14} className="text-action/50" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* MAPA Y CONTACTO */}
                  <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-8">
                    <div className="space-y-4">
                      <h5 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-4">Contacto</h5>
                      
                      <div className="flex flex-col">
                        <p className="text-white flex items-center gap-3 text-lg font-bold">
                          <Icon name="phone" size={18} className="text-action" />
                          {sede.phone}
                        </p>
                        <span className="text-white/70 text-xs pl-[30px] mt-1">Línea directa Sede {sede.name.split('·')[0]?.trim() ?? sede.name}</span>
                      </div>

                      {sede.scheduleNote && (
                        <p className="text-white/80 flex items-center gap-3 mt-4">
                          <Icon name="clock" size={18} className="text-action" />
                          <span className="text-sm">{sede.scheduleNote}</span>
                        </p>
                      )}
                      
                      <div className="pt-4">
                        <LinkButton 
                          href={tenantHref(slug, 'horarios')} 
                          variant="outline" 
                          size="sm" 
                          className="border-white/20 text-white hover:bg-white hover:text-black w-full justify-center"
                        >
                          Ver horarios completos
                        </LinkButton>
                      </div>
                    </div>

                    <div className="w-full h-56 md:h-64 rounded-2xl overflow-hidden border border-white/10 opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                      <MapaBajoDemanda
                        titulo={`Mapa de ${sede.name}`}
                        src={urlDeMapaEmbebido(sede) ?? ''}
                        enlace={urlDeUbicacion(sede)}
                      />
                    </div>
                  </div>
                </div>
                
                <footer className="relative z-10 mt-auto pt-8 border-t border-white/10">
                  <LinkButton
                    href={tenantHref(slug, 'instalaciones')}
                    variant="ghost"
                    icon="arrowRight"
                    className="w-full justify-between px-0 text-white hover:text-action"
                  >
                    Ver instalaciones completas
                  </LinkButton>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
