'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Navegación del panel.
 *
 * Recibe las entradas YA FILTRADAS por permisos desde el servidor: decidir
 * aquí qué mostrar pondría la regla de negocio en un componente de cliente,
 * donde cualquiera puede leerla y donde se duplicaría con la guarda real de
 * cada ruta.
 *
 * Es cliente solo para marcar la pestaña activa con `usePathname`. Ocultar una
 * entrada no cierra nada: cada ruta comprueba su permiso por su cuenta y, por
 * debajo, RLS no entrega filas a quien no le corresponde.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Icon, type AnyIconKey } from '../icons/Icon';

export interface EntradaDePanel {
  readonly href: string;
  readonly etiqueta: string;
  readonly icono: AnyIconKey;
}

interface DashboardNavProps {
  readonly entradas: readonly EntradaDePanel[];
}

export function DashboardNav({ entradas }: DashboardNavProps) {
  const ruta = usePathname();

  if (entradas.length <= 1) return null;

  return (
    <nav
      aria-label="Secciones del panel"
      data-print="hide"
      // Se desplaza en horizontal DENTRO de su caja: con cinco pestañas en un
      // móvil de 375 px, dejarlas envolver rompe la línea y desplazar el
      // cuerpo de la página es peor todavía.
      className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max min-w-full gap-1.5 border-b border-line">
        {entradas.map((entrada) => {
          const activa = ruta === entrada.href || ruta.startsWith(`${entrada.href}/`);
          return (
            <li key={entrada.href}>
              <Link
                href={entrada.href}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  'relative inline-flex h-12 items-center gap-2 whitespace-nowrap px-4',
                  'text-[0.88rem] font-medium transition-colors',
                  activa ? 'text-action' : 'text-muted hover:text-ink',
                )}
              >
                <Icon name={entrada.icono} size={16} />
                {entrada.etiqueta}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full bg-action',
                    'transition-transform duration-300',
                    activa ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
