/**
 * CAPA: Presentation / Icons (átomo)
 *
 * Set de iconos propio en SVG inline. Se elige frente a una librería de iconos
 * porque el sitio usa unas decenas y una dependencia entera costaría más KB que
 * todo este archivo, sin ganar nada. Cada icono es una lista de caminos de un
 * lienzo de 24×24; añadir uno son dos líneas, no una dependencia.
 *
 * Todos heredan `currentColor`: se tiñen solos con el tema del tenant.
 */

import type { SVGProps } from 'react';
import type { IconKey } from '@core/domain/catalog/catalog';

type PathSet = readonly string[];

const PATHS: Record<IconKey | SocialKey | UiKey, PathSet> = {
  // --- Servicios / instalaciones ---
  dumbbell: ['M4 9v6M8 6v12M16 6v12M20 9v6M8 12h8'],
  heart: ['M12 20s-7-4.5-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.5 12 20 12 20Z'],
  yoga: ['M12 5.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z', 'M6 21l3.5-5.5L12 9l2.5 6.5L18 21M7 11h10'],
  boxing: ['M7 6h7a3 3 0 0 1 3 3v3H7z', 'M7 12v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4', 'M10 6V4h4v2'],
  nutrition: ['M12 21c-3.5 0-6-3-6-7 0-3.5 2.5-6 6-6s6 2.5 6 6c0 4-2.5 7-6 7Z', 'M12 8V3M12 3c2 0 3 1 3 2'],
  trainer: ['M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1'],
  group: [
    'M9 9a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 9 9Z',
    'M17 9.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z',
    'M2.5 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1',
    'M16 14h1a4.5 4.5 0 0 1 4.5 4.5V20',
  ],
  spa: ['M12 21c0-5 3-8 7-9-1 5-3.5 8-7 9Z', 'M12 21c0-5-3-8-7-9 1 5 3.5 8 7 9Z', 'M12 21v-4'],
  cycling: ['M6.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M17.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M6.5 15.5 11 7h4l2.5 8.5M9 7h4'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5V12l3 2'],
  shield: ['M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9Z', 'M9.5 12l1.8 1.8 3.4-3.6'],
  sparkle: ['M12 3l1.9 5.4L19 10.3l-5.1 1.9L12 17.6l-1.9-5.4L5 10.3l5.1-1.9L12 3Z'],

  // --- Redes sociales ---
  instagram: [
    'M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4Z',
    'M12 15.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z',
    'M17.2 7.1h.01',
  ],
  facebook: ['M14.5 8.5V6.9c0-.7.4-1 1-1H17V3h-2.3c-2.4 0-3.7 1.4-3.7 3.7v1.8H9V11h2v10h3.5V11H17l.4-2.5h-2.9Z'],
  tiktok: ['M15 3.5v9.9a3.4 3.4 0 1 1-3-3.4', 'M15 3.5c.4 2.2 2 3.7 4.2 3.9'],
  youtube: ['M21 8.4a2.6 2.6 0 0 0-1.9-1.9C17.4 6 12 6 12 6s-5.4 0-7.1.5A2.6 2.6 0 0 0 3 8.4 27 27 0 0 0 2.6 12c0 1.2.1 2.4.4 3.6a2.6 2.6 0 0 0 1.9 1.9C6.6 18 12 18 12 18s5.4 0 7.1-.5a2.6 2.6 0 0 0 1.9-1.9c.3-1.2.4-2.4.4-3.6s-.1-2.4-.4-3.6Z', 'M10.3 14.6 14.9 12l-4.6-2.6v5.2Z'],
  x: ['M4 4l7.2 9.3L4.4 20h2l5.6-5.9L16.6 20H20l-7.5-9.7L19.4 4h-2l-5.2 5.5L8 4H4Z'],
  linkedin: ['M5.5 8.5V19M5.5 5.2h.01M10 19v-6a2.5 2.5 0 0 1 5 0v6M10 19v-8'],

  // --- Interfaz ---
  arrowRight: ['M4 12h15', 'M13 6l6 6-6 6'],
  arrowDown: ['M12 4v14', 'M6 13l6 6 6-6'],
  check: ['M4.5 12.5 9 17 19.5 6.5'],
  close: ['M6 6l12 12M18 6L6 18'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  mail: ['M3.5 6.5h17v11h-17z', 'M3.5 7l8.5 6 8.5-6'],
  phone: ['M6.5 3.5h3l1.5 4-2 1.4a11.5 11.5 0 0 0 5.1 5.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z'],
  pin: ['M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.6 12 21 12 21Z', 'M12 13a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z'],
  whatsapp: [
    'M3.5 20.5l1.3-4.4A8 8 0 1 1 8 19.3l-4.5 1.2Z',
    'M9 8.6c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5l.6 1.4c.1.3 0 .5-.1.6l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.6 2.3c.3.1.4 0 .6-.1l.5-.6c.2-.2.3-.2.6-.1l1.4.7c.3.1.4.3.4.5v.6c-.1.4-.6.9-1.1 1-1.3.2-3.4-.8-4.8-2.2A8 8 0 0 1 8.8 11c-.2-.9 0-1.9.2-2.4Z',
  ],
  star: ['M12 3.8l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8 2.5-5Z'],
  quote: ['M9 6.5C6.5 7.7 5 10 5 12.8V17h5v-5H7.6c0-2 .6-3.3 2.2-4.1L9 6.5Z', 'M18 6.5c-2.5 1.2-4 3.5-4 6.3V17h5v-5h-2.4c0-2 .6-3.3 2.2-4.1L18 6.5Z'],
  lock: ['M6.5 10.5h11v9h-11z', 'M9 10.5V8a3 3 0 0 1 6 0v2.5'],
  calendar: ['M4.5 6.5h15v13h-15z', 'M4.5 10.5h15M8.5 4v4M15.5 4v4'],
  layers: ['M12 3.5 3.5 8l8.5 4.5L20.5 8 12 3.5Z', 'M3.5 12.5 12 17l8.5-4.5', 'M3.5 16.5 12 21l8.5-4.5'],
  palette: ['M12 21a9 9 0 1 1 9-9c0 2-1.6 2.6-3 2.6h-1.4a2 2 0 0 0-1.2 3.6A1.8 1.8 0 0 1 12 21Z', 'M8 10.5h.01M11 7.5h.01M15.5 8.5h.01'],
  toggle: ['M8 7.5h8a4.5 4.5 0 0 1 0 9H8a4.5 4.5 0 0 1 0-9Z', 'M8 14.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z'],

  // --- Panel de gestión (V2.2) ---
  camera: ['M4 8h3l1.6-2.5h6.8L17 8h3v11H4z', 'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'],
  qr: [
    'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z',
    'M14 14h2.5v2.5H14zM18.5 14H20M14 18.5V20M17.5 17.5H20V20h-2.5z',
    'M6.5 6.5h1v1h-1zM16.5 6.5h1v1h-1zM6.5 16.5h1v1h-1z',
  ],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4.5 16.5v3h15v-3'],
  download: ['M12 4v12', 'M7 11l5 5 5-5', 'M4.5 16.5v3h15v-3'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'M13.5 6.5l4 4'],
  search: ['M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z', 'M15.5 15.5 20 20'],
  user: ['M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M5 20a7 7 0 0 1 14 0'],
  receipt: ['M6 3.5h12V21l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21z', 'M9 8h6M9 11.5h6M9 15h3.5'],
  archive: ['M3.5 5h17v4h-17z', 'M5 9v10.5h14V9', 'M10 13h4'],
  refresh: ['M19.5 12a7.5 7.5 0 1 1-2.2-5.3', 'M19.5 4.5v4h-4'],
  printer: ['M7 9V3.5h10V9', 'M7 17H3.5v-6.5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5V17H17', 'M7 14h10v6.5H7z'],
  fire: ['M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.6-8.3.3 2 1.5 3.1 2.6 3.6-.2-2.8 1-5.3 3.4-7.1.1 3.3 3.4 5.2 3.4 9.3 0 4.8-2.8 8.7-6.5 8.7Z'],
  cake: ['M4 20h16', 'M5.5 20v-7h13v7', 'M5.5 16c1.5 1 3 1 4.3 0 1.4 1 3 1 4.4 0 1.3 1 2.8 1 4.3 0', 'M12 13V9', 'M12 6.5c.8-.6 1-1.5 0-3-1 1.5-.8 2.4 0 3Z'],
  alert: ['M12 3.5 21 19.5H3z', 'M12 10v4.5M12 17h.01'],
  wallet: ['M4 7h14.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5z', 'M4 7l11.5-3.5V7', 'M15.5 13.5h2'],
  idcard: ['M3.5 5.5h17v13h-17z', 'M8.5 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M5.8 16c.4-1.6 1.4-2.3 2.7-2.3s2.3.7 2.7 2.3', 'M14 9.5h4M14 13h3'],
  plus: ['M12 5v14M5 12h14'],
  chart: ['M4 20V4', 'M4 20h16', 'M8 16v-4M12 16V8M16 16v-6'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z', 'M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z'],
  filter: ['M4 5h16l-6.2 7.5V19l-3.6-1.8v-4.7z'],
  image: ['M4 5h16v14H4z', 'M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 17', 'M15.5 9.5h.01'],
};

type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'x' | 'linkedin';

type UiKey =
  | 'arrowRight'
  | 'arrowDown'
  | 'check'
  | 'close'
  | 'menu'
  | 'mail'
  | 'phone'
  | 'pin'
  | 'whatsapp'
  | 'star'
  | 'quote'
  | 'lock'
  | 'calendar'
  | 'layers'
  | 'palette'
  | 'toggle'
  | 'camera'
  | 'qr'
  | 'upload'
  | 'download'
  | 'edit'
  | 'search'
  | 'user'
  | 'receipt'
  | 'archive'
  | 'refresh'
  | 'printer'
  | 'fire'
  | 'cake'
  | 'alert'
  | 'wallet'
  | 'idcard'
  | 'plus'
  | 'chart'
  | 'eye'
  | 'filter'
  | 'image';

export type AnyIconKey = IconKey | SocialKey | UiKey;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  readonly name: AnyIconKey;
  readonly size?: number;
  /** Iconos rellenos (estrellas, comillas) en vez de trazo. */
  readonly filled?: boolean;
}

export function Icon({ name, size = 22, filled = false, ...rest }: IconProps) {
  const paths = PATHS[name] ?? PATHS.sparkle;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function hasIcon(name: string): name is AnyIconKey {
  return name in PATHS;
}
