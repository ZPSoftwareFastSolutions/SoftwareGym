'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Cabecera del sitio público: navegación, estado activo, menú móvil y acceso
 * de socios.
 *
 * Es cliente porque necesita el scroll y el estado del menú. Recibe la
 * navegación YA FILTRADA por feature flags desde el layout (servidor): la
 * decisión de qué mostrar es del dominio, no de la cabecera.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { BrandLogo } from '@core/domain/tenant/branding';
import type { NavItem } from '@core/domain/tenant/tenant-config';
import { cn } from '@/lib/cn';
import { tenantHref } from '@/lib/tenant-links';
import { COOKIE_PISTA_SESION } from '@infra/auth/session-hint';
import { Icon } from '../icons/Icon';
import { LinkButton } from '../ui/Button';
import { Logo } from '../ui/Logo';

/**
 * ¿Hay sesión abierta? Se lee del navegador, no del servidor.
 *
 * Leerlo en el layout obligaría a renderizar bajo demanda las 24 páginas del
 * sitio público, que hoy se sirven prerenderizadas. La pista la escribe el
 * middleware y no contiene token —ver `infrastructure/auth/session-hint.ts`—.
 *
 * Arranca en `false` a propósito: el visitante anónimo es el caso mayoritario
 * y así ve el enlace correcto desde el primer pintado. Quien tiene sesión ve
 * cambiar el botón al hidratar, que es un parpadeo aceptable a cambio de no
 * sacar el sitio entero del prerenderizado.
 */
function useSesionAbierta(): boolean {
  const [abierta, setAbierta] = useState(false);
  const ruta = usePathname();

  // Se vuelve a leer en cada cambio de ruta. La cabecera vive en el layout y
  // no se desmonta al navegar, así que con `[]` como dependencia se quedaba
  // con el valor del primer montaje: tras cerrar sesión seguía ofreciendo
  // «Mi panel» hasta recargar la página entera.
  useEffect(() => {
    const tiene = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${COOKIE_PISTA_SESION}=1`));
    setAbierta(tiene);
  }, [ruta]);

  return abierta;
}

interface SiteHeaderProps {
  readonly slug: string;
  readonly name: string;
  readonly logo: BrandLogo;
  readonly navigation: readonly NavItem[];
  readonly ctaLabel: string;
  readonly ctaSegment: string;
  readonly showLogin: boolean;
}

export function SiteHeader({
  slug,
  name,
  logo,
  navigation,
  ctaLabel,
  ctaSegment,
  showLogin,
}: SiteHeaderProps) {
  const sesionAbierta = useSesionAbierta();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar el menú al navegar. Sin esto, el panel queda abierto sobre la
  // página nueva y el usuario cree que el enlace no funcionó.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape cierra el panel y se bloquea el scroll del fondo mientras está
  // abierto: un panel a pantalla completa sobre contenido que se desplaza es
  // desorientador en móvil.
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isActive = (segment: string): boolean => {
    const href = tenantHref(slug, segment);
    return segment === '' ? pathname === href : pathname.startsWith(href);
  };

  return (
    <header
      data-print="hide"
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || menuOpen
          ? 'border-b border-line bg-[color-mix(in_srgb,var(--t-surface)_88%,transparent)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
      style={{ height: 'var(--header-height)' }}
    >
      <div className="shell flex h-full items-center justify-between gap-6">
        <Logo logo={logo} href={tenantHref(slug)} name={name} compact />

        <nav aria-label="Navegación principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => {
              const active = isActive(item.segment);
              return (
                <li key={item.segment || 'home'}>
                  <Link
                    href={tenantHref(slug, item.segment)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex h-11 items-center whitespace-nowrap px-3.5 text-[0.86rem] font-medium',
                      'rounded-[var(--t-radius-sm)] transition-colors duration-200',
                      active ? 'text-action' : 'text-muted hover:text-ink',
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-3.5 bottom-1.5 h-px origin-left bg-action transition-transform duration-300',
                        active ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5">
          {/*
            La visibilidad se controla desde un contenedor, no con `hidden` en
            el `className` del botón: `hidden` y el `inline-flex` propio del
            botón son ambos utilidades de `display`, y gana la que Tailwind
            emita más tarde en la hoja. Componer evita ese conflicto sin
            arrastrar `tailwind-merge` al bundle.
          */}
          {/*
            Con sesión abierta el enlace deja de ofrecer «Acceso socios» y pasa
            a llevar al panel: invitar a acceder a quien ya accedió confunde, y
            además deja al socio sin ruta visible hacia lo suyo.
          */}
          {showLogin && (
            <span className="hidden md:contents">
              <LinkButton
                href={tenantHref(slug, sesionAbierta ? 'panel' : 'acceso')}
                variant="ghost"
                size="sm"
                icon={sesionAbierta ? 'trainer' : 'lock'}
                iconPosition="start"
              >
                {sesionAbierta ? 'Mi panel' : 'Acceso socios'}
              </LinkButton>
            </span>
          )}

          <span className="hidden sm:contents">
            <LinkButton href={tenantHref(slug, ctaSegment)} variant="primary" size="sm">
              {ctaLabel}
            </LinkButton>
          </span>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className={cn(
              'grid h-11 w-11 place-items-center lg:hidden',
              'rounded-[var(--t-radius-sm)] border border-line text-ink',
              'transition-colors hover:border-action hover:text-action',
            )}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {/* Panel móvil. Se mantiene montado y se oculta con `hidden` para
          conservar el estado y evitar el coste de remontar en cada apertura. */}
      <div
        id="menu-movil"
        hidden={!menuOpen}
        className={cn(
          'lg:hidden',
          'fixed inset-x-0 border-b border-line bg-surface',
          'max-h-[calc(100dvh-var(--header-height))] overflow-y-auto',
        )}
        style={{ top: 'var(--header-height)' }}
      >
        <nav aria-label="Navegación móvil" className="shell py-6">
          <ul className="flex flex-col">
            {navigation.map((item, index) => (
              <li key={item.segment || 'home'}>
                <Link
                  href={tenantHref(slug, item.segment)}
                  aria-current={isActive(item.segment) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 items-center justify-between border-b border-line',
                    'text-lg font-semibold transition-colors',
                    isActive(item.segment) ? 'text-action' : 'text-ink hover:text-action',
                  )}
                >
                  <span className="flex items-baseline gap-3">
                    <span className="text-[0.68rem] font-mono text-muted">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {item.label}
                  </span>
                  <Icon name="arrowRight" size={18} />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3">
            <LinkButton href={tenantHref(slug, ctaSegment)} size="lg" fullWidth glow>
              {ctaLabel}
            </LinkButton>
            {showLogin && (
              <LinkButton
                href={tenantHref(slug, sesionAbierta ? 'panel' : 'acceso')}
                variant="secondary"
                size="lg"
                icon={sesionAbierta ? 'trainer' : 'lock'}
                iconPosition="start"
                fullWidth
              >
                {sesionAbierta ? 'Mi panel' : 'Acceso socios'}
              </LinkButton>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
