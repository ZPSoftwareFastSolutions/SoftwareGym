'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Mapa de Google que se carga SOLO cuando la persona lo pide.
 *
 * POR QUÉ. Un iframe de Google Maps se conecta a Google en cuanto se pinta la
 * página y puede dejar cookies de terceros. Es el único servicio externo del
 * sitio: con el mapa bajo demanda, nadie envía datos a un tercero por el solo
 * hecho de visitar la página, y el sitio no necesita banner de cookies (ver
 * `/legal/cookies`). Pulsar «Ver mapa» es la decisión, y el aviso junto al
 * botón dice a qué se accede.
 *
 * Mientras no se carga, un enlace abre la ubicación en Google Maps en otra
 * pestaña: nadie queda sin forma de llegar.
 */

import { useState } from 'react';
import { Icon } from '../icons/Icon';

interface MapaBajoDemandaProps {
  readonly src: string;
  readonly titulo: string;
  /** Enlace para abrir la ubicación fuera del sitio, sin cargar el mapa aquí. */
  readonly enlace?: string | null;
}

export function MapaBajoDemanda({ src, titulo, enlace }: MapaBajoDemandaProps) {
  const [cargado, setCargado] = useState(false);

  if (cargado) {
    return (
      <iframe
        title={titulo}
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen={false}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black/50 p-6 text-center">
      <Icon name="pin" size={28} className="text-action" />
      <p className="max-w-xs text-sm text-white/80">
        El mapa lo sirve Google. Al cargarlo, Google puede recibir tus datos de navegación y usar
        cookies.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setCargado(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-action px-4 font-bold text-on-action transition-colors hover:bg-action-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          Ver mapa
        </button>
        {enlace && (
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-white transition-colors hover:border-action hover:text-action"
          >
            Abrir en Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
