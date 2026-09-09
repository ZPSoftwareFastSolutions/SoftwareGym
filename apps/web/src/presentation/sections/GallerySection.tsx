/**
 * CAPA: Presentation / Sections
 *
 * Galería en mosaico. El `span` de cada pieza viene de la configuración, de
 * modo que cada gimnasio compone su propio ritmo visual sin tocar el código.
 */

import type { GalleryItem } from '@core/domain/catalog/catalog';
import { cn } from '@/lib/cn';
import { ArtFrame } from '../ui/ArtFrame';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface GallerySectionProps {
  readonly items: readonly GalleryItem[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

export function GallerySection({
  items,
  eyebrow = 'Galería',
  title = 'Un vistazo por dentro',
  lead,
}: GallerySectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="section" aria-labelledby="galeria-title">
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        <ul className="mt-14 grid auto-rows-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <li key={item.id} className={cn(item.span === 2 && 'sm:col-span-2 lg:col-span-2')}>
              <Reveal delay={Math.min(index, 5) * 60}>
                <ArtFrame
                  seed={item.seed}
                  src={item.src}
                  alt={item.title}
                  ratio={item.span === 2 ? '16 / 9' : '4 / 3'}
                  label={item.title}
                  className={cn(
                    'transition-transform duration-500 hover:scale-[1.015]',
                    'h-full',
                  )}
                />
                <p className="mt-2.5 text-[0.82rem] text-muted">{item.caption}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
