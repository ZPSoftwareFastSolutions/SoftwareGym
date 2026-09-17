'use client';

import type { GalleryItem } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { ArtFrame } from '@/presentation/ui/ArtFrame';
import { Reveal } from '@/presentation/ui/Reveal';

interface GallerySectionProps {
  readonly items: readonly GalleryItem[];
  readonly eyebrow?: string;
  readonly title?: string;
}

export function GallerySection({ items, eyebrow, title }: GallerySectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="relative w-full py-20">
      <div className="shell relative z-20 mx-auto w-full max-w-7xl">
        <Reveal>
          <div className="mb-16 md:text-center max-w-3xl md:mx-auto">
            {eyebrow && <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">{eyebrow}</h2>}
            {title && <h3 className="text-4xl md:text-6xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>{title}</h3>}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map((item, index) => {
            // Hacemos que algunas tarjetas sean más grandes o anchas para darle un look dinámico (masonry feel)
            const isFeatured = index === 0 || index === 3;
            const spanClass = isFeatured ? 'md:col-span-2 lg:col-span-2 aspect-[21/9]' : 'col-span-1 aspect-square md:aspect-[4/3]';
            
            return (
              <Reveal key={item.id} delay={index * 100} className={cn('h-full w-full', spanClass)}>
                <figure className="group relative w-full h-full overflow-hidden rounded-3xl bg-black/40 border border-white/10 hover:border-action/40 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-60 group-hover:opacity-80 transition-opacity" />
                  
                  <ArtFrame 
                    seed={index * 17 + 5} 
                    icon="camera" 
                    ratio="16 / 9" 
                    className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700" 
                  />
                  
                  <figcaption className="absolute bottom-6 left-6 right-6 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <h4 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--t-font-display)' }}>{item.caption}</h4>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
