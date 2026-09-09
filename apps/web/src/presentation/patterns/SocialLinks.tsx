/**
 * CAPA: Presentation / Patterns (molécula)
 *
 * Enlaces a redes sociales.
 *
 * En V1 la configuración los trae VACÍOS a propósito: el cliente los completa
 * antes de publicar. Un `href=""` navegaría a la página actual, así que un
 * enlace sin URL se degrada a un elemento inerte, con `aria-disabled` y un
 * `title` que explica el motivo. Es preferible a ocultarlos: el cliente ve en
 * la demo dónde van a aparecer sus redes.
 */

import type { SocialLinks as SocialLinksModel } from '@core/domain/tenant/tenant-config';
import { cn } from '@/lib/cn';
import { isLiveLink } from '@/lib/tenant-links';
import { Icon } from '../icons/Icon';

const NETWORKS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'x', label: 'X' },
  { key: 'linkedin', label: 'LinkedIn' },
] as const;

interface SocialLinksProps {
  readonly social: SocialLinksModel;
  readonly name: string;
  readonly className?: string;
}

const ITEM_CLASSES = cn(
  // 44 px de área táctil: mínimo recomendado para objetivos interactivos.
  'grid h-11 w-11 place-items-center',
  'rounded-[var(--t-radius-sm)] border border-line',
  'transition-[color,border-color,transform] duration-200',
);

export function SocialLinks({ social, name, className }: SocialLinksProps) {
  const available = NETWORKS.filter(({ key }) => key in social);
  if (available.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap items-center gap-2.5', className)}>
      {available.map(({ key, label }) => {
        const url = social[key];

        if (!isLiveLink(url)) {
          return (
            <li key={key}>
              <span
                aria-disabled="true"
                title={`${label} de ${name}: pendiente de configuración`}
                className={cn(ITEM_CLASSES, 'cursor-not-allowed text-muted/45')}
              >
                <Icon name={key} size={18} />
                <span className="sr-only">{label} (pendiente de configuración)</span>
              </span>
            </li>
          );
        }

        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} de ${name}`}
              className={cn(
                ITEM_CLASSES,
                'text-muted hover:-translate-y-0.5 hover:border-action hover:text-action',
              )}
            >
              <Icon name={key} size={18} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
