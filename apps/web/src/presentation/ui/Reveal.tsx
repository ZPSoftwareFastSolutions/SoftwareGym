'use client';

/**
 * CAPA: Presentation / UI (átomo)
 *
 * Animación de entrada al hacer scroll.
 *
 * Es el ÚNICO componente cliente del sistema de animación y pesa ~700 bytes.
 * Se prefiere a una librería de animación completa porque anima solo `opacity`
 * y `transform` —las dos propiedades que el compositor resuelve sin reflow— y
 * no justifica 40 KB de JavaScript en el bundle inicial.
 *
 * El `IntersectionObserver` se desconecta en cuanto el elemento entra: no hay
 * observadores vivos tras el primer scroll de la página.
 */

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  readonly children: ReactNode;
  /** Escalonado de la entrada, en milisegundos. Máximo útil: ~5 elementos. */
  readonly delay?: number;
  readonly as?: ElementType;
  readonly className?: string;
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Sin soporte de IntersectionObserver el contenido se muestra igual:
    // la animación es un realce, nunca un requisito para ver la página.
    if (typeof IntersectionObserver === 'undefined') {
      node.dataset.reveal = 'in';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'in';
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}
