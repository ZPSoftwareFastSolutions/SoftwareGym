/**
 * CAPA: Presentation / Patterns (molécula)
 *
 * Botón flotante de WhatsApp con el mensaje del gimnasio precargado.
 *
 * Se renderiza solo si `features.whatsappFloatingButton` está encendida: es
 * una capacidad del producto, no un adorno fijo del maquetado.
 *
 * El anillo pulsante se detiene con `prefers-reduced-motion` (regla global) y
 * es `aria-hidden`: no aporta información, solo atrae la mirada.
 */

import type { ContactInfo } from '@core/domain/tenant/tenant-config';
import { whatsappHref } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';

interface WhatsAppFabProps {
  readonly contact: ContactInfo;
  readonly name: string;
}

export function WhatsAppFab({ contact, name }: WhatsAppFabProps) {
  return (
    <a
      href={whatsappHref(contact)}
      target="_blank"
      rel="noopener noreferrer"
      data-print="hide"
      aria-label={`Escribir a ${name} por WhatsApp`}
      className={[
        'group fixed bottom-5 end-5 z-40',
        'grid h-14 w-14 place-items-center rounded-full',
        'bg-action text-on-action shadow-[0_10px_36px_-10px_var(--t-action)]',
        'transition-transform duration-200 hover:scale-105 active:scale-95',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-action"
        style={{ animation: 'pulse-ring 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
      />
      <Icon name="whatsapp" size={26} className="relative" />

      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute end-full me-3 whitespace-nowrap',
          'rounded-[var(--t-radius-sm)] border border-line bg-card px-3 py-2',
          'text-[0.78rem] font-semibold text-ink opacity-0 shadow-lg',
          'transition-opacity duration-200 group-hover:opacity-100',
          // En táctil no existe `hover`: el tooltip no debe ser la única vía
          // de entender el botón, por eso el `aria-label` ya lo explica.
          'hidden md:block',
        ].join(' ')}
      >
        Escríbenos por WhatsApp
      </span>
    </a>
  );
}
