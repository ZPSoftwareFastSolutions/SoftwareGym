'use client';

import type { ClaseDeVitrina, SedeDeVitrina } from '@core/domain/catalog/catalog';
import { tenantHref } from '@/lib/tenant-links';
import { LinkButton } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { Reveal } from '@/presentation/ui/Reveal';
import { cn } from '@/lib/cn';

interface ClassesProps {
  readonly clases: readonly ClaseDeVitrina[];
  readonly sedes?: readonly SedeDeVitrina[];
  readonly slug: string;
  readonly hideTitle?: boolean;
}

export function ClassesSectionV2({ clases, sedes, slug, hideTitle }: ClassesProps) {
  if (clases.length === 0) return null;

  return (
    <section className="relative w-full py-16 md:py-24">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        {!hideTitle && (
          <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16">
            <Reveal className="max-w-2xl">
              <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">Disciplinas</h2>
              <h3 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
                Domina nuevas habilidades
              </h3>
              <p className="mt-4 text-white/70 text-lg">
                Baile, combate y ritmo, incluidos en tu membresía. Desbloquea tu potencial.
              </p>
            </Reveal>
            
            <Reveal delay={100} className="hidden md:block">
              <LinkButton href={tenantHref(slug, 'v2/clases')} variant="outline" icon="arrowRight" className="text-white border-white/20 hover:bg-white hover:text-black">
                Ver horario completo
              </LinkButton>
            </Reveal>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clases.map((clase, i) => {
            let emoji = '⚡';
            let bgClass = 'from-action/20 to-black';
            if (clase.name.toLowerCase().includes('baile')) {
              emoji = '🕺';
              bgClass = 'from-purple-500/20 to-black';
            } else if (clase.name.toLowerCase().includes('fight')) {
              emoji = '🥊';
              bgClass = 'from-red-500/20 to-black';
            } else if (clase.name.toLowerCase().includes('heels')) {
              emoji = '👠';
              bgClass = 'from-pink-500/20 to-black';
            } else if (clase.name.toLowerCase().includes('árabe')) {
              emoji = '🧞‍♀️';
              bgClass = 'from-amber-500/20 to-black';
            }

            return (
              <Reveal key={clase.name} delay={i * 100}>
                <article className="group relative h-full flex flex-col justify-end p-8 overflow-hidden rounded-3xl min-h-[360px] bg-black/60 border border-white/10 transition-all hover:border-action/50">
                  {/* Gradiente decorativo temático */}
                  <div className={cn('absolute inset-0 bg-gradient-to-t z-10', bgClass)} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />
                  
                  {/* Gran emoji de fondo */}
                  <div className="absolute top-4 right-4 text-7xl opacity-20 transform group-hover:scale-125 transition-transform duration-700 pointer-events-none z-10">
                    {emoji}
                  </div>
                  
                  <div className="relative z-20 transform transition-transform duration-500 group-hover:-translate-y-2">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl group-hover:bg-action group-hover:text-black transition-colors duration-500">
                      {emoji}
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--t-font-display)' }}>{clase.name}</h4>
                    <p className="text-white/60 text-sm line-clamp-3 mb-4">{clase.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-white/80 text-xs">
                        <Icon name="clock" size={12} className="text-action" />
                        60 min
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-white/80 text-xs">
                        <Icon name="fire" size={12} className="text-action" />
                        {clase.level === 'todos' ? 'Todos los niveles' : 'Avanzado'}
                      </span>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
        
        <div className="mt-10 md:hidden flex justify-center">
          <LinkButton href={tenantHref(slug, 'v2/clases')} variant="outline" className="text-white border-white/20 hover:bg-white hover:text-black">
            Ver horario completo
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
