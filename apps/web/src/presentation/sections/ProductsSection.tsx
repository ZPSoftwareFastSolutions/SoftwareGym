'use client';

import type { ProductCategory } from '@core/domain/catalog/catalog';
import type { ContactInfo } from '@core/domain/tenant/tenant-config';
import { tenantHref } from '@/lib/tenant-links';
import { LinkButton } from '@/presentation/ui/Button';
import { Reveal } from '@/presentation/ui/Reveal';

interface ProductsProps {
  readonly categories: readonly ProductCategory[];
  readonly contact: ContactInfo;
  readonly slug: string;
}

export function ProductsSection({ categories, contact, slug }: ProductsProps) {
  if (categories.length === 0) return null;

  return (
    <section className="relative w-full py-24 bg-black/20">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        {/* CARRUSEL HORIZONTAL EN MÓVIL */}
        <div className="flex overflow-x-auto pb-8 -mx-6 px-6 snap-x snap-mandatory hide-scrollbar md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
          {categories.map((cat, idx) => (
            <Reveal key={cat.name} delay={idx * 150} className="w-[85vw] min-w-[300px] max-w-[350px] snap-center shrink-0 md:w-auto md:min-w-0 md:max-w-none md:h-full">
              <article className="group relative flex flex-col h-full bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 transition-all duration-500 hover:scale-105 hover:bg-white/10 hover:border-action/30 hover:shadow-[0_0_40px_rgb(var(--t-action-rgb)/0.1)]">
                <h4 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--t-font-display)' }}>
                  {cat.name}
                </h4>
                <p className="text-white/60 text-sm mb-6 flex-1">
                  {cat.description}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {cat.items.map((item) => (
                    <li key={item.name} className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-white/90 font-medium">{item.name}</span>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-bold text-action">{item.price}</span>
                        {item.note && <span className="text-[0.7rem] text-white/70">{item.note}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="mt-16 flex justify-center">
             <LinkButton
                href={tenantHref(slug, 'contacto?interes=productos')}
                variant="outline"
                size="lg"
                className="text-white border-white/20 hover:bg-white hover:text-black"
              >
                Consultar disponibilidad
              </LinkButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
