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
import { tenantHref } from '@/lib/tenant-links';
import {
  PERMISO,
  SEGMENTO_DE_ESPACIO,
  espacioDeTrabajo,
  rolPrincipal,
  tienePermiso,
} from '@core/domain/operations/workspace';
import { DashboardNav, type EntradaDePanel } from '@/presentation/patterns/DashboardNav';
import { Badge } from '@/presentation/ui/Badge';
import { Button } from '@/presentation/ui/Button';
import { receiptsRepository } from '@infra/config/composition-root';
import { cerrarSesion } from '../acceso/actions';
import { perfilActual } from './_datos';

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
  const entradas: EntradaDePanel[] = [
    {
      href: tenantHref(slug, SEGMENTO_DE_ESPACIO[espacio]),
      etiqueta: espacio === 'socio' ? 'Mi panel' : 'Resumen',
      icono: 'layers',
    },
  ];

  // Dos condiciones, y las dos hacen falta: la capacidad tiene que estar
  // CONTRATADA por el gimnasio y la persona tiene que tener PERMISO. Una flag
  // apagada no es «esta persona no puede», es «este gimnasio no lo compró», y
  // por eso la ruta responde 404 y no un aviso de permisos.
  const { features } = tenant;
  const esPersonal = espacio === 'gimnasio';

  if (esPersonal && features.enableMemberManagement && tienePermiso(perfil, PERMISO.verSocios)) {
    entradas.push({ href: tenantHref(slug, 'panel/socios'), etiqueta: 'Socios', icono: 'group' });
  }

  if (features.enableAttendance && tienePermiso(perfil, PERMISO.verAsistencia)) {
    entradas.push({ href: tenantHref(slug, 'panel/asistencia'), etiqueta: 'Asistencia', icono: 'calendar' });
  }

  if (esPersonal && features.enablePayments && tienePermiso(perfil, PERMISO.verPagos)) {
    // El contador sale de una consulta de solo cabeceras (`count`, sin filas):
    // la pestaña avisa de que hay trabajo sin traerse los comprobantes.
    const pendientes = await (await receiptsRepository()).contarPendientes();
    entradas.push({
      href: tenantHref(slug, 'panel/comprobantes'),
      etiqueta: 'Comprobantes',
      icono: 'receipt',
      insignia: pendientes,
    });
  }

  if (features.enableReports && tienePermiso(perfil, PERMISO.verReportes)) {
    entradas.push({ href: tenantHref(slug, 'panel/reportes'), etiqueta: 'Reportes', icono: 'chart' });
  }

  if (esPersonal && features.enablePayments && tienePermiso(perfil, PERMISO.configurar)) {
    entradas.push({ href: tenantHref(slug, 'panel/cobros'), etiqueta: 'Cobro QR', icono: 'qr' });
  }

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
          <form action={cerrarSesion} data-print="hide">
            <input type="hidden" name="tenantSlug" value={slug} />
            <Button type="submit" variant="secondary" size="sm" icon="lock" iconPosition="start">
              Cerrar sesión
            </Button>
          </form>
        </header>

        <DashboardNav entradas={entradas} />

        {children}
      </div>
    </div>
  );
}
