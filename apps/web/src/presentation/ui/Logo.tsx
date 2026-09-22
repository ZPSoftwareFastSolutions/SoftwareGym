/**
 * CAPA: Presentation / UI (molécula)
 *
 * Logotipo del gimnasio: isotipo más nombre.
 *
 * CON ISOTIPO, SE USA EL DEL CLIENTE. Cuando `branding.logo.mark` trae la
 * imagen oficial, esa es la marca: no se imita con tipografía algo que el
 * cliente ya entregó dibujado. Sin él, se compone el monograma con la tipografía
 * y el color del tema, de modo que ningún gimnasio se publica sin marca por no
 * haber enviado todavía su archivo.
 *
 * EL NOMBRE SE ESCRIBE EN TEXTO, no se recorta del logotipo. El logo completo es
 * vertical (símbolo encima, nombre debajo) y en una cabecera de 74 px quedaría
 * ilegible. Se reparte en horizontal —isotipo a la izquierda, nombre a la
 * derecha— y el nombre repite los colores del logo: la primera palabra en el
 * verde de la marca y la segunda en blanco. Siendo texto, además, lo leen los
 * buscadores y los lectores de pantalla sin depender de un `alt`.
 *
 * Es el único punto a tocar si cambia la forma de mostrar la marca.
 */

import Image from 'next/image';
import Link from 'next/link';
import type { BrandLogo } from '@core/domain/tenant/branding';
import { cn } from '@/lib/cn';

interface LogoProps {
  readonly logo: BrandLogo;
  readonly href: string;
  readonly name: string;
  readonly compact?: boolean;
}

/** Alto del isotipo en píxeles CSS: la cabecera mide 74 y la marca no debe tocar sus bordes. */
const ALTO_DEL_ISOTIPO = { compacto: 42, normal: 52 } as const;

function Monograma({ monogram, compact }: { readonly monogram: string; readonly compact: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid place-items-center font-bold leading-none',
        'border border-action/45 text-action',
        'rounded-[var(--t-radius-md)]',
        'transition-[box-shadow,border-color] duration-300',
        'group-hover:border-action',
        compact ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-xl',
      )}
      style={{
        fontFamily: 'var(--t-font-display)',
        background:
          'linear-gradient(140deg, color-mix(in srgb, var(--t-action) 14%, transparent), transparent 70%)',
        boxShadow: 'inset 0 0 22px -12px var(--t-action)',
      }}
    >
      {monogram}
    </span>
  );
}

export function Logo({ logo, href, name, compact = false }: LogoProps) {
  const mark = logo.mark;
  const alto = compact ? ALTO_DEL_ISOTIPO.compacto : ALTO_DEL_ISOTIPO.normal;

  return (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center gap-3 rounded-[var(--t-radius-sm)]"
      aria-label={`${name} — ir al inicio`}
    >
      {mark ? (
        <Image
          src={mark.src}
          width={mark.width}
          height={mark.height}
          // El nombre ya está escrito al lado y el enlace lleva su propio
          // `aria-label`: un `alt` repetiría «Mítico Fitness» tres veces seguidas.
          alt=""
          // Está en la primera pantalla de todas las páginas: se pide ya, sin
          // esperar al scroll. No es el elemento más grande (LCP) de la página,
          // así que no se precarga en el <head> por encima del título.
          loading="eager"
          // Sin optimizador: el isotipo ya sale recortado y aligerado de
          // `generar-marca.mjs` (8 KB). Pasarlo por `/_next/image` generaba
          // variantes de hasta 3840 px de una imagen de 252, y cada una cuenta
          // como optimización de imagen en Vercel.
          unoptimized
          className={cn(
            'w-auto shrink-0 select-none',
            'transition-[filter,transform] duration-300',
            // Al pasar por encima, el isotipo se enciende con el verde de la
            // marca: el mismo gesto que el botón principal.
            'group-hover:scale-[1.04] group-hover:drop-shadow-[0_0_14px_rgb(var(--t-action-rgb)/0.55)]',
          )}
          style={{ height: alto }}
        />
      ) : (
        <Monograma monogram={logo.monogram} compact={compact} />
      )}

      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-bold tracking-tight',
            // Con el logo oficial, el nombre repite sus colores: «Mítico» en
            // verde. Sin logo, el texto sigue en el color de tinta de siempre.
            mark ? 'text-action' : 'text-ink',
            compact ? 'text-xl' : 'text-2xl',
          )}
          style={{
            fontFamily: 'var(--t-font-display)',
            textTransform: 'var(--t-heading-transform)' as never,
          }}
        >
          {logo.wordmark}
        </span>
        <span
          className={cn(
            'mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.34em]',
            mark ? 'text-ink' : 'text-muted',
          )}
        >
          {logo.subMark}
        </span>
      </span>
    </Link>
  );
}
