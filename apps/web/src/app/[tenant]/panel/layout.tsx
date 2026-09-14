/**
 * CAPA: Presentation / App — armazón del panel.
 *
 * Monta la cabecera del panel y su navegación. Todo lo de debajo es privado.
 *
 * NO es la guarda de seguridad. Aquí solo se decide qué pestañas se pintan;
 * cada página vuelve a exigir su permiso y, por debajo, RLS decide qué filas
 * existen. Un layout como única guarda deja de proteger en cuanto una ruta se
 * monta fuera de él, y eso no avisa.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { loadTenantPage } from '@/lib/page-guards';
import { espacioDeTrabajo, rolPrincipal } from '@core/domain/operations/workspace';
import { DashboardNav } from '@/presentation/patterns/DashboardNav';
import { Badge } from '@/presentation/ui/Badge';
import { Button } from '@/presentation/ui/Button';
import { receiptsRepository } from '@infra/config/composition-root';
import { SelectorDeSucursal } from '@/presentation/patterns/SelectorDeSucursal';
import { Icon } from '@/presentation/icons/Icon';
import { cerrarSesion } from '../acceso/actions';
import { perfilActual } from './_datos';
import { entradasDelPanel } from './_navegacion';
import { contextoDeSucursal } from './_sucursal';

export const metadata: Metadata = {
  title: 'Panel',
  // Nada de lo que hay bajo esta ruta se indexa jamás.
  robots: { index: false, follow: false },
};

/** Depende de la cookie de sesión: no puede prerenderizarse. */
export const dynamic = 'force-dynamic';

interface PanelLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ tenant: string }>;
}

export default async function PanelLayout({ children, params }: PanelLayoutProps) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug, name } = tenant;

  const { perfil } = await perfilActual();

  // Sin perfil no se pinta armazón: la página de dentro redirige al acceso.
  // Dibujar aquí la navegación de un usuario que no existe solo produciría un
  // parpadeo de menús antes del redirección.
  if (!perfil) return <>{children}</>;

  const espacio = espacioDeTrabajo(perfil);
  const { features } = tenant;
  const esPersonal = espacio === 'gimnasio' || espacio === 'administracion';

  // Sede de trabajo: solo para el personal de un gimnasio multisucursal. El
  // socio no opera en ninguna sede, y un gimnasio de sede única no tiene nada
  // que elegir. Se pide a la vez que las entradas: son independientes.
  const [entradas, sede] = await Promise.all([
    entradasDelPanel(tenant, perfil, { contarPendientes: async () => (await receiptsRepository()).contarPendientes() }),
    esPersonal && features.enableMultiBranch ? contextoDeSucursal(perfil) : Promise.resolve(null),
  ]);

  return (
    <div className="section pb-16 pt-[calc(var(--header-height)+2rem)]">
      <div className="shell flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="neutral">{rolPrincipal(perfil)}</Badge>
              <span className="text-[0.8rem] text-muted">{perfil.tenantName ?? name}</span>
            </div>
            <h1 className="t-h2 mt-2.5 leading-tight">
              Hola, {perfil.fullName.split(' ')[0] ?? perfil.fullName}
            </h1>
          </div>

          {/* El cierre de sesión es un POST, no un enlace: una acción que
              cambia estado no puede dispararse con una precarga del
              navegador ni con la etiqueta de imagen de una página ajena. */}
          <div className="flex flex-wrap items-center gap-3">
            {sede && sede.operables.length > 1 && sede.actual && (
              <SelectorDeSucursal
                slug={slug}
                sucursales={sede.operables.map((s) => ({ id: s.id, name: s.name }))}
                actualId={sede.actual.id}
              />
            )}
            {sede && sede.operables.length === 1 && sede.actual && (
              <p className="flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] border border-line px-3.5 text-[0.86rem] text-muted">
                <Icon name="pin" size={15} className="text-action" />
                Sucursal <strong className="font-semibold text-ink">{sede.actual.name}</strong>
              </p>
            )}
            {sede && !sede.actual && (
              <p className="flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 px-3.5 text-[0.84rem] text-ink">
                <Icon name="alert" size={15} className="text-structural" />
                Sin sucursal asignada
              </p>
            )}
            <form action={cerrarSesion} data-print="hide">
              <input type="hidden" name="tenantSlug" value={slug} />
              <Button type="submit" variant="secondary" size="sm" icon="lock" iconPosition="start">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </header>

        <DashboardNav entradas={entradas} />

        {children}
      </div>
    </div>
  );
}
