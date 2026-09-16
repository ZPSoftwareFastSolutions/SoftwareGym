'use client';

/**
 * CAPA: Presentation / UI (molécula)
 *
 * Pestañas. Genéricas: reciben qué pestañas hay y el contenido de cada una.
 *
 * POR QUÉ UN COMPONENTE Y NO ANCLAS. Con anclas (`#sede-PRADO`) la página
 * crecería tanto como la suma de todas las pestañas, que es justo lo que se
 * quiere evitar cuando un gimnasio tiene cuatro sedes con seis áreas cada una.
 *
 * ACCESIBILIDAD. Es el patrón `tablist` del estándar: flechas para moverse,
 * Inicio y Fin para los extremos, `aria-selected` y `aria-controls`. Solo la
 * pestaña activa recibe `tabIndex 0`, de modo que el tabulador entra al grupo
 * una vez y sale al contenido, en lugar de recorrer una por una.
 *
 * SIN DESPLAZAMIENTO HORIZONTAL (regla de V4): la fila de pestañas envuelve.
 * Con muchas sedes se verán en dos líneas, nunca en una barra que se corta.
 *
 * El contenido de cada panel se renderiza en el SERVIDOR y llega como `children`
 * ya montado: este componente solo decide cuál se enseña.
 */

import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PestanaDeContenido {
  readonly id: string;
  readonly etiqueta: string;
  /** Segunda línea opcional: «6 áreas», una dirección corta. */
  readonly detalle?: string;
  readonly contenido: ReactNode;
}

interface PestanasProps {
  readonly pestanas: readonly PestanaDeContenido[];
  /** Nombre del grupo para lectores de pantalla: «Sucursales». */
  readonly etiquetaDelGrupo: string;
  readonly className?: string;
}

export function Pestanas({ pestanas, etiquetaDelGrupo, className }: PestanasProps) {
  const [activa, setActiva] = useState(0);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  // Con una sola pestaña, la pestaña sobra: se enseña el contenido y ya.
  if (pestanas.length <= 1) return <>{pestanas[0]?.contenido ?? null}</>;

  const mover = (destino: number) => {
    const indice = (destino + pestanas.length) % pestanas.length;
    setActiva(indice);
    botones.current[indice]?.focus();
  };

  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const teclas: Record<string, () => void> = {
      ArrowRight: () => mover(activa + 1),
      ArrowLeft: () => mover(activa - 1),
      Home: () => mover(0),
      End: () => mover(pestanas.length - 1),
    };
    const accion = teclas[evento.key];
    if (!accion) return;
    evento.preventDefault();
    accion();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={etiquetaDelGrupo}
        onKeyDown={alPulsarTecla}
        className="flex flex-wrap gap-2"
      >
        {pestanas.map((pestana, indice) => {
          const seleccionada = indice === activa;
          return (
            <button
              key={pestana.id}
              ref={(nodo) => {
                botones.current[indice] = nodo;
              }}
              type="button"
              role="tab"
              id={`pestana-${pestana.id}`}
              aria-selected={seleccionada}
              aria-controls={`panel-${pestana.id}`}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => setActiva(indice)}
              className={cn(
                'min-h-11 rounded-[var(--t-radius-md)] border px-4 py-2 text-start transition-colors',
                seleccionada
                  ? 'border-action bg-action text-on-action'
                  : 'border-line text-muted hover:border-action hover:text-action',
              )}
            >
              <span className="block text-[0.9rem] font-semibold">{pestana.etiqueta}</span>
              {pestana.detalle && (
                <span className={cn('block text-[0.74rem]', seleccionada ? 'opacity-80' : 'text-muted')}>
                  {pestana.detalle}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {pestanas.map((pestana, indice) => (
        <div
          key={pestana.id}
          role="tabpanel"
          id={`panel-${pestana.id}`}
          aria-labelledby={`pestana-${pestana.id}`}
          // `hidden` en vez de desmontar: el contenido ya viene del servidor, y
          // así cambiar de pestaña no vuelve a pedir nada ni parpadea.
          hidden={indice !== activa}
          tabIndex={0}
        >
          {pestana.contenido}
        </div>
      ))}
    </div>
  );
}
