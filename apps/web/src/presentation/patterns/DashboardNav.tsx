'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Navegación del panel.
 *
 * Recibe las entradas YA FILTRADAS por permisos desde el servidor: decidir
 * aquí qué mostrar pondría la regla de negocio en un componente de cliente,
 * donde cualquiera puede leerla y donde se duplicaría con la guarda real de
 * cada ruta. Ocultar una entrada no cierra nada: cada ruta comprueba su permiso
 * por su cuenta y, por debajo, RLS no entrega filas a quien no le corresponde.
 *
 * V4 · SIN DESPLAZAMIENTO HORIZONTAL. Antes era una sola fila con
 * `overflow-x-auto`: con las 13 pestañas de gerencia, las últimas quedaban fuera
 * de la vista. Ahora:
 * - Con pocas entradas (`MAXIMO_SIN_AGRUPAR`), todas a la vista, envolviendo línea.
 * - Con más, en escritorio cada grupo («Día a día», «Socios»…) abre su menú; en
 *   pantallas estrechas un botón «Secciones» despliega todo agrupado.
 * Ninguna opción desaparece: solo cambia dónde vive.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import {
  agruparEntradas,
  entradaActiva,
  MAXIMO_SIN_AGRUPAR,
  NOMBRE_DE_GRUPO,
  type GrupoDeNavegacion,
} from '@/lib/navegacion';
import { Icon, type AnyIconKey } from '../icons/Icon';
import { IconoDeEnlace } from '../ui/IconoDeEnlace';

export interface EntradaDePanel {
  readonly href: string;
  readonly etiqueta: string;
  readonly icono: AnyIconKey;
  readonly grupo: GrupoDeNavegacion;
  /** Contador visible junto a la pestaña: comprobantes por revisar, por ejemplo. */
  readonly insignia?: number;
}

interface DashboardNavProps {
  readonly entradas: readonly EntradaDePanel[];
}

function Insignia({ valor }: { readonly valor: number | undefined }) {
  if (typeof valor !== 'number' || valor <= 0) return null;
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-structural px-1.5 text-[0.66rem] font-bold text-white">
      {valor}
      <span className="sr-only"> pendientes</span>
    </span>
  );
}

/** Pestaña de la fila: subrayado animado cuando es la página actual. */
function Pestana({ entrada, activa }: { readonly entrada: EntradaDePanel; readonly activa: boolean }) {
  return (
    <Link
      href={entrada.href}
      aria-current={activa ? 'page' : undefined}
      className={cn(
        'relative inline-flex h-12 items-center gap-2 whitespace-nowrap px-3.5',
        'text-[0.88rem] font-medium transition-colors',
        activa ? 'text-action' : 'text-muted hover:text-ink',
      )}
    >
      <IconoDeEnlace name={entrada.icono} size={16} />
      {entrada.etiqueta}
      <Insignia valor={entrada.insignia} />
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full bg-action transition-transform duration-300',
          activa ? 'scale-x-100' : 'scale-x-0',
        )}
      />
    </Link>
  );
}

/** Fila de un menú desplegable: objetivo táctil de 44 px. */
function OpcionDeMenu({ entrada, activa }: { readonly entrada: EntradaDePanel; readonly activa: boolean }) {
  return (
    <Link
      href={entrada.href}
      aria-current={activa ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-2.5 rounded-[var(--t-radius-sm)] px-3 text-[0.88rem] transition-colors',
        activa ? 'bg-action/10 font-semibold text-action' : 'text-ink hover:bg-raised',
      )}
    >
      <IconoDeEnlace name={entrada.icono} size={16} className={activa ? 'text-action' : 'text-muted'} />
      <span className="flex-1">{entrada.etiqueta}</span>
      <Insignia valor={entrada.insignia} />
    </Link>
  );
}

export function DashboardNav({ entradas }: DashboardNavProps) {
  const ruta = usePathname();
  const base = useId();
  const [abierto, setAbierto] = useState<GrupoDeNavegacion | 'movil' | null>(null);
  const contenedor = useRef<HTMLElement>(null);

  // Navegar cierra el menú: sin esto quedaba abierto sobre la página nueva.
  useEffect(() => {
    setAbierto(null);
  }, [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (evento: PointerEvent) => {
      if (evento.target instanceof Node && !contenedor.current?.contains(evento.target)) setAbierto(null);
    };
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(null);
    };
    document.addEventListener('pointerdown', alTocarFuera);
    document.addEventListener('keydown', alPulsar);
    return () => {
      document.removeEventListener('pointerdown', alTocarFuera);
      document.removeEventListener('keydown', alPulsar);
    };
  }, [abierto]);

  if (entradas.length <= 1) return null;

  const activa = entradaActiva(ruta, entradas);

  if (entradas.length <= MAXIMO_SIN_AGRUPAR) {
    return (
      <nav aria-label="Secciones del panel" data-print="hide">
        <ul className="flex flex-wrap gap-x-1 border-b border-line">
          {entradas.map((entrada) => (
            <li key={entrada.href}>
              <Pestana entrada={entrada} activa={activa?.href === entrada.href} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  const grupos = agruparEntradas(entradas);
  const alternar = (grupo: GrupoDeNavegacion | 'movil') => setAbierto((actual) => (actual === grupo ? null : grupo));

  return (
    <nav ref={contenedor} aria-label="Secciones del panel" data-print="hide">
      {/* Escritorio: una pestaña por grupo; el grupo de una sola entrada es enlace directo. */}
      <ul className="hidden flex-wrap items-center gap-x-1 border-b border-line lg:flex">
        {grupos.map((armado, indice) => {
          const [unica] = armado.entradas;
          if (armado.entradas.length === 1 && unica) {
            return (
              <li key={armado.grupo}>
                <Pestana entrada={unica} activa={activa?.href === unica.href} />
              </li>
            );
          }
          const contieneActiva = armado.entradas.some((e) => e.href === activa?.href);
          const idMenu = `${base}-${armado.grupo}`;
          const estaAbierto = abierto === armado.grupo;
          return (
            <li key={armado.grupo} className="relative">
              <button
                type="button"
                aria-expanded={estaAbierto}
                aria-controls={idMenu}
                onClick={() => alternar(armado.grupo)}
                className={cn(
                  'relative inline-flex h-12 items-center gap-2 whitespace-nowrap px-3.5 text-[0.88rem] font-medium transition-colors',
                  contieneActiva || estaAbierto ? 'text-action' : 'text-muted hover:text-ink',
                )}
              >
                {NOMBRE_DE_GRUPO[armado.grupo]}
                {contieneActiva && activa && <span className="text-[0.8rem] font-normal text-muted">· {activa.etiqueta}</span>}
                <Insignia valor={armado.insignia} />
                <Icon name="chevronDown" size={15} className={cn('transition-transform', estaAbierto && 'rotate-180')} />
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full bg-action transition-transform duration-300',
                    contieneActiva ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </button>
              {estaAbierto && (
                <div
                  id={idMenu}
                  // Los últimos grupos abren hacia la izquierda: un menú que se
                  // sale por la derecha volvería a crear desplazamiento horizontal.
                  className={cn(
                    'absolute top-full z-40 mt-1.5 w-64 rounded-[var(--t-radius-md)] border border-line bg-surface p-1.5 shadow-lg',
                    indice >= grupos.length / 2 ? 'end-0' : 'start-0',
                  )}
                >
                  <ul className="flex flex-col gap-0.5">
                    {armado.entradas.map((entrada) => (
                      <li key={entrada.href}>
                        <OpcionDeMenu entrada={entrada} activa={activa?.href === entrada.href} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Pantallas estrechas: la sección actual a la vista y todo lo demás a un toque. */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={abierto === 'movil'}
          aria-controls={`${base}-movil`}
          onClick={() => alternar('movil')}
          className="flex h-12 w-full items-center justify-between gap-3 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 text-[0.9rem]"
        >
          <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
            <Icon name={activa?.icono ?? 'menu'} size={17} className="text-action" />
            <span className="truncate">{activa?.etiqueta ?? 'Secciones'}</span>
          </span>
          <span className="flex items-center gap-2 text-[0.8rem] text-muted">
            <Insignia valor={grupos.reduce((suma, g) => suma + g.insignia, 0)} />
            Secciones
            <Icon name="chevronDown" size={15} className={cn('transition-transform', abierto === 'movil' && 'rotate-180')} />
          </span>
        </button>
        {abierto === 'movil' && (
          <div id={`${base}-movil`} className="mt-2 grid gap-4 rounded-[var(--t-radius-md)] border border-line bg-surface p-3 sm:grid-cols-2">
            {grupos.map((armado) => (
              <div key={armado.grupo}>
                <p className="px-3 pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">{NOMBRE_DE_GRUPO[armado.grupo]}</p>
                <ul className="flex flex-col gap-0.5">
                  {armado.entradas.map((entrada) => (
                    <li key={entrada.href}>
                      <OpcionDeMenu entrada={entrada} activa={activa?.href === entrada.href} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
