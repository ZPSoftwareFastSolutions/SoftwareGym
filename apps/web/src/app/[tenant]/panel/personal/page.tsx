/**
 * CAPA: Presentation / App — personal y roles (V4).
 *
 * Quién trabaja en el gimnasio y con qué rol, y el lugar donde se dan y se
 * quitan roles. La lee quien tiene `users.read` (Administración y Gerencia).
 *
 * LA JERARQUÍA LA DECIDE LA BASE. Aquí se calcula con el espejo del dominio
 * (`puedeOtorgarRol`, `puedeAdministrarCuenta`) qué botones mostrar, para no
 * ofrecer a un gerente «Administración» ni un «Suspender» sobre su jefe; pero
 * la escritura pasa por `otorgar_rol`/`retirar_rol`/`cambiar_estado_de_cuenta`,
 * que repiten permiso, gimnasio y nivel. Un botón fabricado a mano recibe el
 * mismo «no».
 *
 * Cómo entra alguien nuevo al personal: se registra en el sitio del gimnasio
 * (nace como socio), y aquí se le da el rol. El de entrenador se da al vincular
 * su perfil en «Entrenadores», porque sin perfil su espacio estaría vacío.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { cn } from '@/lib/cn';
import {
  esCodigoDeRol,
  NOMBRE_DE_ROL,
  PERMISO,
  puedeAdministrarCuenta,
  puedeOtorgarRol,
  ROLES_OTORGABLES,
  type RolDeGimnasio,
} from '@core/domain/operations/workspace';
import {
  esFiltroDeCuentas,
  NOMBRE_DE_ESTADO_DE_CUENTA,
  type CuentaDelGimnasio,
  type FiltroDeCuentas,
} from '@core/domain/operations/staff';
import { FILAS_POR_PAGINA, paginaDeLaUrl } from '@core/domain/shared/paginacion';
import { staffRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { BotonDeFiltrar, FormularioDeFiltro } from '@/presentation/patterns/FiltroConCarga';
import { Paginacion } from '@/presentation/patterns/Paginacion';
import { OtorgarRolForm } from '@/presentation/patterns/PersonalForms';
import { Badge } from '@/presentation/ui/Badge';
import { CLASE_DE_CONTROL } from '@/presentation/ui/Campo';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso, fechaCorta } from '../_datos';
import { cambiarEstadoDeCuenta, retirarRol } from './actions';

export const metadata: Metadata = { title: 'Personal y roles', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface PersonalPageProps {
  readonly params: Promise<{ tenant: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VISTAS: readonly { readonly clave: FiltroDeCuentas; readonly etiqueta: string }[] = [
  { clave: 'personal', etiqueta: 'Personal' },
  { clave: 'todas', etiqueta: 'Todas las cuentas' },
  { clave: 'suspendidas', etiqueta: 'Suspendidas' },
];

function nombreDeRol(codigo: string): string {
  return esCodigoDeRol(codigo) ? NOMBRE_DE_ROL[codigo] : codigo;
}

export default async function PersonalPage({ params, searchParams }: PersonalPageProps) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug, features } = tenant;
  const { perfil, espacio } = await exigirPermiso(slug, PERMISO.verUsuarios);
  // La plataforma también tiene `users.read`, pero no pertenece a ningún
  // gimnasio: su lugar para designar administradores es su propio panel, no la
  // lista de personal de uno (que además le mostraría cuentas de todos).
  if (espacio === 'plataforma' || !perfil.tenantId) redirect(tenantHref(slug, 'panel/plataforma'));

  const consulta = await searchParams;
  const vistaCruda = Array.isArray(consulta.vista) ? consulta.vista[0] : consulta.vista;
  const vista: FiltroDeCuentas = esFiltroDeCuentas(vistaCruda) ? vistaCruda : 'personal';
  const qCrudo = Array.isArray(consulta.q) ? consulta.q[0] : consulta.q;
  const q = (qCrudo ?? '').trim().slice(0, 60);
  const pagina = paginaDeLaUrl(consulta.pagina);

  const repo = await staffRepository();
  const [resumen, cuentas] = await Promise.all([repo.resumen(), repo.cuentas({ vista, q }, pagina, FILAS_POR_PAGINA)]);

  const base = tenantHref(slug, 'panel/personal');
  const rolesQuePuedoDar = ROLES_OTORGABLES.filter((rol) => puedeOtorgarRol(perfil, rol));
  const gestiona = rolesQuePuedoDar.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Personal y roles</h2>
          <p className="mt-1.5 max-w-[70ch] text-[0.88rem] leading-relaxed text-muted">
            Quién trabaja en {tenant.name} y qué puede hacer. Para sumar a alguien, la persona se registra en el sitio del gimnasio y aquí le das su rol; el de entrenador se da al vincular su perfil en «Entrenadores».
          </p>
        </div>
        <Badge tone="neutral">
          {gestiona ? `Puedes dar: ${rolesQuePuedoDar.map(nombreDeRol).join(', ')}` : 'Solo lectura'}
        </Badge>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href={`${base}?vista=personal`} etiqueta="Administración" valor={`${resumen.administradores}`} icono="key" tono="accion" comparacion={`${resumen.gerentes} en gerencia`} accion="Ver personal" />
        <StatCard href={`${base}?vista=personal`} etiqueta="Recepción" valor={`${resumen.recepcion}`} icono="idcard" comparacion={`${resumen.entrenadores} entrenadores con cuenta`} accion="Ver personal" />
        <StatCard href={`${base}?vista=todas`} etiqueta="Cuentas" valor={`${resumen.cuentas}`} icono="group" comparacion="socios y personal con acceso" accion="Ver todas" />
        <StatCard
          href={`${base}?vista=suspendidas`}
          etiqueta="Suspendidas"
          valor={`${resumen.suspendidas}`}
          icono="lock"
          tono={resumen.suspendidas > 0 ? 'alerta' : 'neutro'}
          comparacion="no pueden entrar al panel"
          accion="Revisar"
        />
      </div>

      <section id="cuentas" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-cuentas">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="titulo-cuentas" className="t-h3">Cuentas</h2>
          <nav aria-label="Vista de cuentas" className="flex flex-wrap gap-2">
            {VISTAS.map((opcion) => (
              <Link
                key={opcion.clave}
                href={`${base}?vista=${opcion.clave}`}
                aria-current={vista === opcion.clave ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center rounded-full border px-4 text-[0.86rem] font-medium transition-colors',
                  vista === opcion.clave ? 'border-action bg-action text-on-action' : 'border-line text-muted hover:border-action hover:text-ink',
                )}
              >
                {opcion.etiqueta}
              </Link>
            ))}
          </nav>
        </div>

        <FormularioDeFiltro ruta={base} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <input type="hidden" name="vista" value={vista} />
          <div className="relative">
            <label htmlFor="personal-q" className="sr-only">Buscar cuenta</label>
            <Icon name="search" size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="personal-q" name="q" type="search" defaultValue={q} maxLength={60} placeholder="Nombre o correo" className={cn(CLASE_DE_CONTROL, 'ps-10')} />
          </div>
          <BotonDeFiltrar texto="Buscar" icono="search" />
        </FormularioDeFiltro>

        <DataTable<CuentaDelGimnasio>
          titulo="Cuentas del gimnasio"
          tituloOculto
          className="mt-5"
          columnas={[
            {
              clave: 'cuenta',
              titulo: 'Cuenta',
              celda: (c) => (
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium text-ink">
                    {c.fullName}
                    {c.id === perfil.appUserId && <span className="ms-2 text-[0.74rem] font-normal text-muted">(tú)</span>}
                  </span>
                  <span className="break-all text-[0.76rem] text-muted">{c.email}</span>
                </span>
              ),
            },
            {
              clave: 'roles',
              titulo: 'Roles',
              celda: (c) => (
                <span className="flex flex-wrap gap-1.5">
                  {c.roles.length === 0 ? <span className="text-muted">Sin rol</span> : c.roles.map((rol) => (
                    <Badge key={rol} tone={rol === 'admin' || rol === 'manager' ? 'action' : 'neutral'}>{nombreDeRol(rol)}</Badge>
                  ))}
                </span>
              ),
            },
            {
              clave: 'estado',
              titulo: 'Estado',
              celda: (c) => <Badge tone={c.status === 'active' ? 'neutral' : 'structural'}>{NOMBRE_DE_ESTADO_DE_CUENTA[c.status]}</Badge>,
            },
            { clave: 'alta', titulo: 'Alta', secundaria: true, celda: (c) => fechaCorta(c.createdAt.slice(0, 10)) },
            {
              clave: 'acciones',
              titulo: 'Acciones',
              celda: (c) => {
                if (!puedeAdministrarCuenta(perfil, c)) {
                  return <span className="text-[0.8rem] text-muted">{c.id === perfil.appUserId ? 'Tu cuenta' : 'Sin cambios disponibles'}</span>;
                }
                const quitables = c.roles.filter((rol): rol is RolDeGimnasio => ROLES_OTORGABLES.some((o) => o === rol) && rolesQuePuedoDar.some((o) => o === rol));
                const opciones = rolesQuePuedoDar.filter((rol) => !c.roles.includes(rol)).map((rol) => ({ codigo: rol, nombre: nombreDeRol(rol) }));
                const campos = { tenantSlug: slug, cuentaId: c.id };
                return (
                  <div className="flex min-w-[14rem] flex-col gap-2">
                    {c.status === 'active' && <OtorgarRolForm slug={slug} cuentaId={c.id} opciones={opciones} />}
                    <div className="flex flex-wrap gap-2">
                      {quitables.map((rol) => (
                        <AccionConEstado
                          key={rol}
                          accion={retirarRol}
                          campos={{ ...campos, rol }}
                          etiqueta={`Quitar ${nombreDeRol(rol)}`}
                          icono="close"
                          variante="peligro"
                          confirmar={`¿Quitar el rol de ${nombreDeRol(rol)} a ${c.fullName}?`}
                        />
                      ))}
                      <AccionConEstado
                        accion={cambiarEstadoDeCuenta}
                        campos={{ ...campos, activa: c.status === 'active' ? 'no' : 'si' }}
                        etiqueta={c.status === 'active' ? 'Suspender' : 'Reactivar'}
                        icono={c.status === 'active' ? 'lock' : 'check'}
                        variante={c.status === 'active' ? 'peligro' : 'secundario'}
                        confirmar={c.status === 'active' ? `¿Suspender la cuenta de ${c.fullName}? No podrá entrar al panel hasta que la reactives.` : undefined}
                      />
                    </div>
                  </div>
                );
              },
            },
          ]}
          filas={cuentas.filas}
          claveDeFila={(c) => c.id}
          vacio={
            <EmptyState
              icono="group"
              titulo={q ? 'Ninguna cuenta coincide con la búsqueda' : vista === 'suspendidas' ? 'No hay cuentas suspendidas' : 'Todavía no hay personal con cuenta'}
              descripcion={q ? 'Prueba con otro nombre o correo.' : vista === 'personal' ? 'Busca en «Todas las cuentas» a quien ya se registró en el sitio y dale su rol.' : undefined}
            />
          }
        />

        <Paginacion
          className="mt-5"
          ruta={base}
          parametros={consulta}
          pagina={pagina}
          porPagina={cuentas.porPagina}
          total={cuentas.total}
          filasEnPagina={cuentas.filas.length}
          ancla="cuentas"
        />
      </section>

      {features.enableTrainers && (
        <p className="flex items-start gap-2 text-[0.84rem] text-muted">
          <Icon name="trainer" size={16} className="mt-0.5 shrink-0 text-action" />
          Los entrenadores con cuenta se gestionan desde{' '}
          <Link href={tenantHref(slug, 'panel/entrenadores')} className="text-action underline underline-offset-4">
            Entrenadores
          </Link>
          : vincular su perfil les da el rol, desvincularlo se lo quita.
        </p>
      )}
    </div>
  );
}
