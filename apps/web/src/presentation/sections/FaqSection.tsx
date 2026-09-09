/**
 * CAPA: Presentation / Sections
 * Preguntas frecuentes. Se apaga por feature flag (`showFaq`).
 */

import type { FaqItem } from '@core/domain/catalog/catalog';
import { Accordion } from '../patterns/Accordion';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface FaqSectionProps {
  readonly items: readonly FaqItem[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

export function FaqSection({
  items,
  eyebrow = 'Preguntas frecuentes',
  title = 'Lo que más nos preguntan',
  lead,
}: FaqSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="section" aria-labelledby="faq-title">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            lead={lead}
            className="lg:sticky lg:top-28 lg:self-start"
          />

          <Reveal delay={80}>
            <Accordion items={items} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
