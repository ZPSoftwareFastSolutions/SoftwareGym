/**
 * CAPA: Presentation / Sections
 * Testimonios de socios.
 */

import type { Testimonial } from '@core/domain/catalog/catalog';
import { Icon } from '../icons/Icon';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface TestimonialsSectionProps {
  readonly testimonials: readonly Testimonial[];
  readonly eyebrow?: string;
  readonly title?: string;
}

export function TestimonialsSection({
  testimonials,
  eyebrow = 'Testimonios',
  title = 'Lo dicen quienes ya entrenan acá',
}: TestimonialsSectionProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="section surface-raised relative overflow-hidden" aria-labelledby="testimonios-title">
      <div aria-hidden="true" className="bg-grid opacity-50" />

      <div className="shell relative">
        <SectionHeading eyebrow={eyebrow} title={title} align="center" />

        <ul className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <li key={item.id}>
              <Reveal delay={Math.min(index, 4) * 90} className="h-full">
                <figure className="surface-card flex h-full flex-col p-7">
                  <Icon
                    name="quote"
                    size={26}
                    filled
                    className="text-action/45"
                    aria-hidden="true"
                  />

                  <blockquote className="mt-5 flex-1 text-[0.98rem] leading-relaxed text-ink/90">
                    {item.quote}
                  </blockquote>

                  <div
                    className="mt-6 flex items-center gap-1"
                    role="img"
                    aria-label={`${item.rating} de 5 estrellas`}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <Icon
                        key={i}
                        name="star"
                        size={15}
                        filled
                        className={i < item.rating ? 'text-action' : 'text-line'}
                      />
                    ))}
                  </div>

                  <figcaption className="mt-4 border-t border-line pt-4">
                    <span className="block font-semibold text-ink">{item.author}</span>
                    <span className="mt-0.5 block text-[0.8rem] text-muted">{item.context}</span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
