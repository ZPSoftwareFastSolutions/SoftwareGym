/**
 * CAPA: Presentation / App — entrenadores del gimnasio (V3.1).
 *
 * El equipo, dónde trabaja cada uno, quién tiene cuenta, quién falta hoy y
 * qué planes incluyen entrenador.
 *
 * Capacidad `enableTrainers` (apagada → 404) y permiso `trainers.read`.
 * Ninguna de las dos protege los datos: lo hace RLS.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { resumenDeReglaDePlan, type Entrenador } from '@core/domain/operations/trainers';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { branchesRepository, trainersRepository } from '@infra/config/composition-root';
import { EntrenadorForm, ReglaDePlanForm } from '@/presentation/patterns/EntrenadorForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = { title: 'Entrenadores', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function estadoDeHoy(e: Entrenador) {
  if (!e.isActive) return <Badge tone="neutral">Inactivo</Badge>;
  if (e.ausenciaHoy) return <Badge tone="structural">Ausencia hoy</Badge>;
  return <Badge tone="action">Disponible</Badge>;
}

export default async function EntrenadoresPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enableTrainers']);
  const { slug } = tenant;
  const { perfil } = await exigirPermiso(slug, PERMISO.verEntrenadores);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarEntrenadores);
  const puedeEditarPlanes = tienePermiso(perfil, PERMISO.gestionarPlanes);

  const entrenadores = await trainersRepository();
  const [lista, sedes, reglas] = await Promise.all([
    entrenadores.listar(),
    (await branchesRepository()).listar(),
    puedeEditarPlanes ? entrenadores.reglasDePlanes() : Promise.resolve([]),
  ]);

  const nombreDeSede = new Map(sedes.map((s) => [s.id, s.name]));
  const activos = lista.filter((e) => e.isActive);
  const conCuenta = activos.filter((e) => e.appUserId).length;
  const ausentesHoy = activos.filter((e) => e.ausenciaHoy).length;
  const asignaciones = activos.reduce((suma, e) => suma + e.principales + e.secundarios, 0);
  const planesConEntrenador = reglas.filter((r) => r.includesTrainer || r.maxSecondaryTrainers > 0).length;
  const base = tenantHref(slug, 'panel/entrenadores');

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Entrenadores</h2>
          <p className="mt-1.5 max-w-[64ch] text-[0.88rem] leading-relaxed text-muted">
            El equipo de {tenant.name}. Un entrenador puede existir sin cuenta; si la tiene, entra y ve solo sus socios asignados. Qué socios pueden tener entrenador lo define su plan.
          </p>
        </div>
        {puedeGestionar && (
          <Modal
            titulo="Nuevo entrenador"
            descripcion="Después podrás asignarle sedes, vincular su cuenta y registrar sus ausencias."
            anchoMaximo="lg"
            montarSoloAbierto
            disparador={
              <Button variant="primary" size="md" icon="plus" iconPosition="start">
                Nuevo entrenador
              </Button>
            }
          >
            <EntrenadorForm slug={slug} />
          </Modal>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="#equipo" etiqueta="Entrenadores activos" valor={`${activos.length}`} icono="trainer" tono="accion" comparacion={`de ${lista.length} registrados`} accion="Ver equipo" />
        <StatCard href="#equipo" etiqueta="Con cuenta" valor={`${conCuenta}`} icono="lock" comparacion={`${activos.length - conCuenta} sin acceso al sistema`} accion="Ver cuentas" />
        <StatCard href="#equipo" etiqueta="Ausentes hoy" valor={`${ausentesHoy}`} icono="calendar" tono={ausentesHoy > 0 ? 'alerta' : 'neutro'} comparacion="con alguna ausencia en el día" accion="Ver quién" />
        {puedeEditarPlanes ? (
          <StatCard href="#planes" etiqueta="Planes con entrenador" valor={`${planesConEntrenador}`} icono="layers" tono={planesConEntrenador === 0 ? 'alerta' : 'neutro'} comparacion={`${asignaciones} asignaciones vigentes`} accion="Configurar planes" />
        ) : (
          <StatCard href="#equipo" etiqueta="Asignaciones vigentes" valor={`${asignaciones}`} icono="group" comparacion="principales y secundarias" accion="Ver equipo" />
        )}
      </div>

      <section id="equipo" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-equipo">
        <h2 id="titulo-equipo" className="t-h3">Equipo</h2>
        <DataTable
          titulo="Entrenadores del gimnasio"
          className="mt-5"
          columnas={[
            {
              clave: 'nombre',
              titulo: 'Entrenador',
              celda: (e) => (
                <span className="flex flex-col">
                  <Link href={`${base}/${e.id}`} className="font-semibold text-ink underline-offset-4 hover:text-action hover:underline">
                    {e.fullName}
                  </Link>
                  {e.specialties.length > 0 && <span className="text-[0.78rem] text-muted">{e.specialties.join(' · ')}</span>}
                </span>
              ),
            },
            {
              clave: 'sedes',
              titulo: 'Sedes',
              secundaria: true,
              celda: (e) => (e.branchIds.length > 0 ? e.branchIds.map((id) => nombreDeSede.get(id) ?? 'Sede').join(', ') : <span className="text-muted">Sin sede</span>),
            },
            {
              clave: 'cuenta',
              titulo: 'Cuenta',
              celda: (e) => (e.appUserId ? <Badge tone="neutral">Con acceso</Badge> : <span className="text-[0.82rem] text-muted">Sin cuenta</span>),
            },
            { clave: 'socios', titulo: 'Socios', numerica: true, celda: (e) => `${e.principales} + ${e.secundarios}` },
            { clave: 'hoy', titulo: 'Hoy', celda: estadoDeHoy },
          ]}
          filas={lista}
          claveDeFila={(e) => e.id}
          vacio={
            <EmptyState
              icono="trainer"
              titulo="Todavía no hay entrenadores"
              descripcion={puedeGestionar ? 'Crea el primer perfil. La cuenta de acceso es opcional y se vincula después.' : 'Gerencia todavía no cargó el equipo.'}
            />
          }
        />
        <p className="mt-3 text-[0.8rem] text-muted">«Socios» = principales + secundarios vigentes.</p>
      </section>

      {puedeEditarPlanes && (
        <section id="planes" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-planes">
          <h2 id="titulo-planes" className="t-h3">Entrenador según el plan</h2>
          <p className="mt-1.5 max-w-[70ch] text-[0.86rem] leading-relaxed text-muted">
            Solo se asigna entrenador a socios con membresía vigente cuyo plan lo incluya. «Principal» permite un entrenador principal; «Secundarios» es cuántos entrenadores especializados más admite. La base lo vuelve a comprobar en cada asignación.
          </p>
          <DataTable
            titulo="Regla de entrenadores de cada plan activo"
            className="mt-5"
            columnas={[
              {
                clave: 'plan',
                titulo: 'Plan',
                celda: (r) => (
                  <span className="flex flex-col">
                    <span className="font-medium text-ink">{r.planName}</span>
                    <span className="text-[0.76rem] text-muted">{resumenDeReglaDePlan(r)}</span>
                  </span>
                ),
              },
              {
                clave: 'regla',
                titulo: 'Incluye',
                celda: (r) => <ReglaDePlanForm slug={slug} planId={r.planId} includesTrainer={r.includesTrainer} maxSecondaryTrainers={r.maxSecondaryTrainers} />,
              },
            ]}
            filas={reglas}
            claveDeFila={(r) => r.planId}
            vacio={<EmptyState icono="layers" titulo="No hay planes activos" />}
          />
        </section>
      )}
    </div>
  );
}
