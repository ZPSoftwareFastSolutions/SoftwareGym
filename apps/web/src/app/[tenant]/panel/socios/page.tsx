/**
 * CAPA: Presentation / App — socios.
 *
 * Lista con filtros por estado, plan, cumpleaños e inactividad. Cada filtro
 * rápido es una tarjeta que lleva a esa lista y dice cuántos hay: «3 sin venir
 * hace una semana» es una tarea para recepción, no un dato.
 *
 * Cualquier fila abre la ficha completa en una ventana, sin salir de la lista.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { cn } from '@/lib/cn';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import {
  cumpleEsteMes,
  diasDesde,
  esEstadoDeMembresia,
  NOMBRE_DE_ESTADO_DE_MEMBRESIA,
  type FichaDeSocio,
  type FiltroDeSocios,
} from '@core/domain/operations/members';
import { membersRepository } from '@infra/config/composition-root';
import { BotonFicha, FichaDeSocioProvider } from '@/presentation/patterns/FichaDeSocio';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { Icon, type AnyIconKey } from '@/presentation/icons/Icon';
import { CLASE_DE_CONTROL } from '@/presentation/ui/Campo';
import { exigirPermiso, fechaCorta } from '../_datos';

export const metadata: Metadata = { title: 'Socios', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface SociosPageProps extends TenantPageParams {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function uno(valor: string | string[] | undefined, largo = 60): string {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return typeof bruto === 'string' ? bruto.trim().slice(0, largo) : '';
}

const TONO: Record<string, 'action' | 'neutral' | 'structural'> = {
  active: 'action',
  expiring_soon: 'structural',
  expired: 'neutral',
  suspended: 'neutral',
  cancelled: 'neutral',
};

export default async function SociosPage({ params, searchParams }: SociosPageProps) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableMemberManagement']);
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verSocios);

  const consulta = await searchParams;
  const q = uno(consulta.q);
  const estadoCrudo = uno(consulta.estado, 20);
  const estado = esEstadoDeMembresia(estadoCrudo) || estadoCrudo === 'sin-membresia' ? estadoCrudo : undefined;
  const planId = uno(consulta.plan, 40) || undefined;
  const vista = uno(consulta.vista, 20);
  const puedeArchivar = tienePermiso(perfil, PERMISO.archivarSocios);

  const filtro: FiltroDeSocios = {
    q: q || undefined,
    estado,
    planId,
    soloArchivados: vista === 'archivados' && puedeArchivar,
    cumpleMes: vista === 'cumple',
    inactivosDias: vista === 'inactivos' ? 7 : undefined,
  };

  const socios = await membersRepository();
  const [hoy, todos, planes] = await Promise.all([
    repo.hoyDelGimnasio(slug),
    socios.listar({}, ''),
    socios.planesVendibles(),
  ]);
  // La lista filtrada espera a `hoy`: «sin venir 7 días» y «cumple este mes» se
  // miden en la fecha del gimnasio, nunca en la del servidor.
  const filas = await socios.listar(filtro, hoy);

  const contar = (condicion: (ficha: FichaDeSocio) => boolean) => todos.filter(condicion).length;
  const base = tenantHref(slug, 'panel/socios');

  const accesos: readonly { etiqueta: string; valor: number; href: string; icono: AnyIconKey; activo: boolean }[] = [
    { etiqueta: 'Todos', valor: todos.length, href: base, icono: 'group', activo: !estado && !vista },
    { etiqueta: 'Activos', valor: contar((f) => f.membershipStatus === 'active'), href: `${base}?estado=active`, icono: 'shield', activo: estado === 'active' },
    { etiqueta: 'Por vencer', valor: contar((f) => f.membershipStatus === 'expiring_soon'), href: `${base}?estado=expiring_soon`, icono: 'clock', activo: estado === 'expiring_soon' },
    { etiqueta: 'Vencidos', valor: contar((f) => f.membershipStatus === 'expired'), href: `${base}?estado=expired`, icono: 'alert', activo: estado === 'expired' },
    { etiqueta: 'Sin membresía', valor: contar((f) => f.membershipId === null), href: `${base}?estado=sin-membresia`, icono: 'user', activo: estado === 'sin-membresia' },
    {
      etiqueta: 'Sin venir 7+ días',
      valor: contar((f) => (f.membershipStatus === 'active' || f.membershipStatus === 'expiring_soon') && (diasDesde(f.lastVisit, hoy) ?? 999) >= 7),
      href: `${base}?vista=inactivos`,
      icono: 'fire',
      activo: vista === 'inactivos',
    },
    { etiqueta: 'Cumplen este mes', valor: contar((f) => cumpleEsteMes(f.birthDate, hoy)), href: `${base}?vista=cumple`, icono: 'cake', activo: vista === 'cumple' },
  ];

  return (
    <FichaDeSocioProvider slug={slug} rutaDeFicha={base}>
      <div className="flex flex-col gap-6">
        <section className="surface-card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7">
          <div>
            <h2 className="t-h3">Socios</h2>
            <p className="mt-1.5 text-[0.88rem] text-muted">
              Toca cualquier fila para ver la ficha completa sin salir de la lista.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {features.enableReports && tienePermiso(perfil, PERMISO.verReportes) && (
              <LinkButton href={tenantHref(slug, 'panel/reportes/clientes')} variant="secondary" size="sm" icon="chart" iconPosition="start">
                Reporte de clientes
              </LinkButton>
            )}
            {tienePermiso(perfil, PERMISO.crearSocios) && (
              <LinkButton href={`${base}/nuevo`} variant="primary" size="sm" icon="plus" iconPosition="start" glow>
                Nuevo socio
              </LinkButton>
            )}
          </div>
        </section>

        <nav aria-label="Filtros rápidos" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2.5">
            {[...accesos, ...(puedeArchivar ? [{ etiqueta: 'Archivados', valor: -1, href: `${base}?vista=archivados`, icono: 'archive' as AnyIconKey, activo: vista === 'archivados' }] : [])].map((acceso) => (
              <li key={acceso.etiqueta}>
                <Link
                  href={acceso.href}
                  aria-current={acceso.activo ? 'page' : undefined}
                  className={cn(
                    'flex h-[4.5rem] min-w-[9rem] flex-col justify-center gap-1 rounded-[var(--t-radius-md)] border px-4 transition-colors',
                    acceso.activo ? 'border-action bg-action/10' : 'border-line bg-surface hover:border-action/60',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted">
                    <Icon name={acceso.icono} size={14} className={acceso.activo ? 'text-action' : ''} />
                    {acceso.etiqueta}
                  </span>
                  {acceso.valor >= 0 && <span className="text-[1.35rem] font-bold leading-none text-ink">{acceso.valor}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="surface-card p-6 sm:p-7">
          <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end">
            {estado && <input type="hidden" name="estado" value={estado} />}
            {vista && <input type="hidden" name="vista" value={vista} />}
            <div className="relative">
              <label htmlFor="socios-q" className="sr-only">Buscar socio</label>
              <Icon name="search" size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input id="socios-q" name="q" type="search" defaultValue={q} maxLength={60} placeholder="Nombre, código, documento, teléfono o correo" className={cn(CLASE_DE_CONTROL, 'ps-10')} />
            </div>
            <div>
              <label htmlFor="socios-plan" className="sr-only">Plan</label>
              <select id="socios-plan" name="plan" defaultValue={planId ?? ''} className={CLASE_DE_CONTROL}>
                <option value="">Todos los planes</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 font-semibold text-on-action hover:bg-action-strong">
              <Icon name="filter" size={16} />
              Filtrar
            </button>
          </form>

          <p className="mt-5 text-[0.82rem] text-muted">{filas.length} {filas.length === 1 ? 'socio' : 'socios'}</p>

          <DataTable
            titulo="Socios del gimnasio"
            className="mt-3"
            columnas={[
              {
                clave: 'socio',
                titulo: 'Socio',
                celda: (f) => (
                  <span className="flex flex-col">
                    <BotonFicha customerId={f.id}>{f.fullName}</BotonFicha>
                    <span className="font-mono text-[0.72rem] font-normal tracking-[0.08em] text-muted">{f.code ?? 'sin código'}</span>
                  </span>
                ),
              },
              { clave: 'plan', titulo: 'Plan', celda: (f) => f.planName ?? '—' },
              {
                clave: 'estado',
                titulo: 'Membresía',
                celda: (f) =>
                  f.archivedAt ? (
                    <Badge tone="neutral">Archivado</Badge>
                  ) : f.membershipStatus ? (
                    <Badge tone={TONO[f.membershipStatus] ?? 'neutral'}>{NOMBRE_DE_ESTADO_DE_MEMBRESIA[f.membershipStatus]}</Badge>
                  ) : (
                    <Badge tone="neutral">Sin membresía</Badge>
                  ),
              },
              { clave: 'vence', titulo: 'Vence', celda: (f) => (f.endDate ? `${fechaCorta(f.endDate)}${f.daysRemaining !== null && f.daysRemaining >= 0 ? ` · ${f.daysRemaining} d` : ''}` : '—') },
              {
                clave: 'visita',
                titulo: 'Última visita',
                secundaria: true,
                celda: (f) => {
                  const dias = diasDesde(f.lastVisit, hoy);
                  return f.lastVisit ? `${fechaCorta(f.lastVisit)}${dias !== null ? ` · hace ${dias} d` : ''}` : 'Nunca';
                },
              },
              { clave: 'telefono', titulo: 'Teléfono', secundaria: true, celda: (f) => f.phone ?? '—' },
              {
                clave: 'abrir',
                titulo: 'Ficha',
                celda: (f) => (
                  <Link href={`${base}/${f.id}`} className="relative z-10 inline-flex h-10 items-center gap-1.5 rounded-[var(--t-radius-sm)] px-2 text-[0.82rem] font-semibold text-action hover:bg-action/10">
                    Abrir
                    <Icon name="arrowRight" size={14} />
                  </Link>
                ),
              },
            ]}
            filas={filas}
            claveDeFila={(f) => f.id}
            vacio={
              <EmptyState
                icono="group"
                titulo={q || estado || vista || planId ? 'Ningún socio coincide con el filtro' : 'Todavía no hay socios'}
                descripcion={q || estado || vista || planId ? 'Prueba con otro nombre o quita el filtro.' : 'Registra el primero y tendrá su QR de entrada al momento.'}
                accion={
                  tienePermiso(perfil, PERMISO.crearSocios) ? (
                    <LinkButton href={`${base}/nuevo`} variant="primary" size="sm" icon="plus" iconPosition="start">
                      Nuevo socio
                    </LinkButton>
                  ) : undefined
                }
              />
            }
          />
        </section>
      </div>
    </FichaDeSocioProvider>
  );
}
