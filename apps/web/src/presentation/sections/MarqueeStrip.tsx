'use client';

import { Icon } from '@/presentation/icons/Icon';

interface MarqueeStripProps {
  readonly items: readonly string[];
}

export function MarqueeStrip({ items }: MarqueeStripProps) {
  if (items.length === 0) return null;

  const Row = ({ hidden }: { hidden?: boolean }) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-12 px-6"
      style={{ minWidth: '50%' }}
    >
      {items.map((item, i) => (
        <li key={item + i} className="flex items-center gap-12 whitespace-nowrap">
          <span
            className="text-2xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-action via-white to-action bg-[length:200%_auto] animate-[gradient-x_3s_linear_infinite]"
            style={{ fontFamily: 'var(--t-font-display)' }}
          >
            {item}
          </span>
          <Icon name="sparkle" size={24} className="text-action drop-shadow-[0_0_10px_var(--color-action)] animate-pulse" />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      data-print="hide"
      className="relative overflow-hidden py-10 my-10 perspective-[1000px] border-y border-white/5 bg-black/40 backdrop-blur-md shadow-[0_0_50px_rgba(57,255,20,0.05)]"
      style={{
        maskImage: 'linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)',
      }}
    >
      {/* Overlay de luz holográfica */}
      <div className="absolute inset-0 bg-gradient-to-b from-action/5 via-transparent to-action/5 pointer-events-none mix-blend-screen" />
      
      {/* Contenedor del Marquee con perspectiva 3D */}
      <div className="flex w-max animate-marquee transform rotate-x-12 -rotate-y-2 scale-110 transition-transform duration-1000 hover:rotate-x-0 hover:rotate-y-0 hover:scale-100">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
