'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Miniatura de la imagen de un comprobante (V4.2).
 *
 * La fila del comprobante y su archivo en Storage son dos cosas distintas, y
 * la segunda puede faltar: un archivo borrado desde el panel de Storage, una
 * subida que no terminó o un registro histórico cargado sin imagen. Antes eso
 * dejaba el icono roto del navegador en la bandeja y en la ficha, que parece
 * un error de la aplicación. Ahora el hueco se dice con palabras y el resto de
 * la tarjeta —importe, socio, estado— se sigue leyendo igual.
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

interface MiniaturaDeComprobanteProps {
  readonly src: string;
  readonly alt: string;
  /** Clases del `img`; el hueco ocupa el mismo sitio. */
  readonly className: string;
}

export function MiniaturaDeComprobante({ src, alt, className }: MiniaturaDeComprobanteProps) {
  const [falla, setFalla] = useState(false);

  if (falla) {
    return (
      <span className={cn(className, 'flex flex-col items-center justify-center gap-1 bg-raised px-1 text-center text-muted')}>
        <Icon name="image" size={18} aria-hidden="true" />
        <span className="text-[0.62rem] leading-tight">Sin imagen</span>
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- Es una ruta propia con sesión, no un archivo optimizable.
  return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setFalla(true)} />;
}
