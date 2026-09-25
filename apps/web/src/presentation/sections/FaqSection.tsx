'use client';

import { useState } from 'react';
import type { FaqItem } from '@core/domain/catalog/catalog';
import { Reveal } from '@/presentation/ui/Reveal';
import { Icon } from '@/presentation/icons/Icon';
import { cn } from '@/lib/cn';

interface FaqProps {
  readonly items: readonly FaqItem[];
}

function FaqAccordionItem({ item, isOpen, onClick }: { item: FaqItem; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden transition-all hover:bg-white/10 hover:border-action/30">
      <button
        type="button"
        id={`faq-${item.id}`}
        onClick={onClick}
        aria-expanded={isOpen}
        aria-controls={`faq-${item.id}-respuesta`}
        // Sin `focus:outline-none`: quitaba el anillo de foco y quien navega
        // con teclado no veía en qué pregunta estaba.
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action"
      >
        <span className={cn("text-lg font-bold transition-colors", isOpen ? "text-action" : "text-white")}>
          {item.question}
        </span>
        <Icon
          aria-hidden="true"
          name="chevronDown"
          size={20}
          className={cn("text-white/50 transition-transform duration-300", isOpen && "rotate-180 text-action")}
        />
      </button>
      <div
        id={`faq-${item.id}-respuesta`}
        role="region"
        aria-labelledby={`faq-${item.id}`}
        // Cerrada, la respuesta sigue en el DOM para la animación: `inert` la
        // saca del foco y de los lectores de pantalla mientras no se ve.
        inert={!isOpen}
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 text-white/70 leading-relaxed">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqSection({ items }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="relative w-full py-24">
      <div className="shell relative z-20 mx-auto w-full max-w-4xl">
        <div className="mb-16 text-center">
          <Reveal>
            <h2 className="text-sm font-bold tracking-widest text-action uppercase mb-3">Conocimiento</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>
              Respuestas Claras
            </h3>
          </Reveal>
        </div>

        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <Reveal key={item.question} delay={index * 100}>
              <FaqAccordionItem 
                item={item} 
                isOpen={openIndex === index} 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
