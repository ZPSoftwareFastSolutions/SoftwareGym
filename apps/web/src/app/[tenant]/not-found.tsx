'use client';

/**
 * CAPA: Presentation / App — 404 global.
 *
 * Sirve tanto para un slug de gimnasio inexistente como para una sección
 * apagada por feature flag. El mensaje es deliberadamente genérico.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/presentation/icons/Icon';

export default function NotFound() {
  const pathname = usePathname();
  // Asumimos que la URL es /tenant-slug/algo
  const tenant = pathname?.split('/')[1];
  const href = tenant ? `/${tenant}/panel` : '/';

  return (
    <main className="relative grid flex-1 place-items-center py-20 px-6">
      <div aria-hidden="true" className="bg-aura" />
      <div aria-hidden="true" className="bg-grid" />

        <div className="relative max-w-lg text-center">
          <p
            className="text-[7rem] font-bold leading-none text-action"
            style={{ fontFamily: 'var(--t-font-display)', textShadow: 'var(--t-glow)' }}
          >
            404
          </p>

          <h1 className="t-h2 mt-4">Esta página no existe</h1>

          <p className="t-lead mt-5">
            El enlace puede estar mal escrito, o la sección no está disponible en este sitio.
          </p>

          <Link
            href={href}
            className="mt-9 inline-flex min-h-12 items-center gap-2.5 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong"
          >
            <Icon name="arrowRight" size={17} className="rotate-180" />
            Volver al gimnasio
          </Link>
        </div>
      </main>
  );
}
