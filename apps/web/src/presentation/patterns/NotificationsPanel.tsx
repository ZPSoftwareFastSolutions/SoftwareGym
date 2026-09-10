'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Bandeja de notificaciones del socio, en la cabecera de su panel.
 *
 * Se abre y se cierra en el cliente, pero las notificaciones llegan ya
 * construidas desde el servidor: aquí no se decide qué es urgente ni cuándo
 * vence una membresía. Eso es dominio y vive en
 * `core/domain/operations/notifications.ts`.
 *
 * Las derivadas —vencimiento, ficha sin vincular— no se pueden descartar y no
 * es un olvido: desaparecen cuando desaparece su motivo. Dejar «marcar como
 * leída» sobre un aviso de membresía vencida serviría para esconder justo lo
 * que hay que resolver.
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type AnyIconKey } from '../icons/Icon';
import type { Notificacion } from '@core/domain/operations/notifications';
import { marcarAvisoLeido } from '@/app/[tenant]/panel/actions';

interface NotificationsPanelProps {
  readonly slug: string;
  readonly notificaciones: readonly Notificacion[];
}

const ICONO: Record<Notificacion['tipo'], AnyIconKey> = {
  vencida: 'shield',
  vencimiento: 'clock',
  aviso: 'sparkle',
  bienvenida: 'heart',
};

const ESTILO: Record<Notificacion['urgencia'], string> = {
  alta: 'border-structural/50 bg-structural/10',
  media: 'border-action/40 bg-action/8',
  informativa: 'border-line bg-raised',
};

const COLOR_DE_ICONO: Record<Notificacion['urgencia'], string> = {
  alta: 'text-structural',
  media: 'text-action',
  informativa: 'text-muted',
};

export function NotificationsPanel({ slug, notificaciones }: NotificationsPanelProps) {
  const pendientes = notificaciones.filter((n) => !n.leida);
  // Arranca abierta cuando hay algo urgente. Una notificación de membresía
  // vencida escondida detrás de un clic es una notificación que no existe.
  const [abierta, setAbierta] = useState(pendientes.some((n) => n.urgencia !== 'informativa'));

  if (notificaciones.length === 0) return null;

  return (
    <section
      aria-labelledby="titulo-notificaciones"
      className="surface-card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setAbierta((valor) => !valor)}
        aria-expanded={abierta}
        aria-controls="lista-notificaciones"
        className={cn(
          'flex w-full items-center gap-3.5 px-5 py-4 text-start sm:px-6',
          'transition-colors hover:bg-raised/60',
        )}
      >
        <span
          aria-hidden="true"
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raised text-action"
        >
          <Icon name="mail" size={18} />
          {pendientes.length > 0 && (
            <span className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-action px-1 text-[0.65rem] font-bold text-on-action">
              {pendientes.length}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span id="titulo-notificaciones" className="block text-[0.95rem] font-semibold text-ink">
            Notificaciones
          </span>
          <span className="block text-[0.82rem] text-muted">
            {pendientes.length === 0
              ? 'Todo al día'
              : `${pendientes.length} sin leer de ${notificaciones.length}`}
          </span>
        </span>

        <Icon
          name="arrowDown"
          size={18}
          className={cn(
            'shrink-0 text-muted transition-transform duration-200',
            abierta && 'rotate-180',
          )}
        />
      </button>

      <ul id="lista-notificaciones" hidden={!abierta} className="flex flex-col gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
        {notificaciones.map((notificacion) => (
          <li
            key={notificacion.id}
            className={cn(
              'flex items-start gap-3.5 rounded-[var(--t-radius-md)] border px-4 py-3.5',
              ESTILO[notificacion.urgencia],
              notificacion.leida && 'opacity-55',
            )}
          >
            <Icon
              name={ICONO[notificacion.tipo]}
              size={18}
              className={cn('mt-0.5 shrink-0', COLOR_DE_ICONO[notificacion.urgencia])}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[0.92rem] font-semibold text-ink">{notificacion.titulo}</p>
              <p className="mt-1 text-[0.85rem] leading-relaxed text-muted">{notificacion.cuerpo}</p>
            </div>

            {notificacion.descartable && !notificacion.leida && (
              <form action={marcarAvisoLeido} className="shrink-0">
                <input type="hidden" name="tenantSlug" value={slug} />
                <input type="hidden" name="avisoId" value={notificacion.id.replace(/^aviso:/, '')} />
                <button
                  type="submit"
                  // El área táctil es de 44 px aunque el icono mida 16: es un
                  // botón pequeño en una lista, justo donde más se falla al
                  // pulsar en un móvil.
                  className="grid h-11 w-11 place-items-center rounded-[var(--t-radius-sm)] text-muted transition-colors hover:text-action"
                  aria-label={`Marcar como leído: ${notificacion.titulo}`}
                >
                  <Icon name="check" size={16} />
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
