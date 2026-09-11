/**
 * CAPA: Presentation / App — panel de la plataforma.
 *
 * Lo ve quien administra GYM PLATFORM, no un gimnasio.
 *
 * AQUÍ NO HAY SOCIOS NI PAGOS, Y NO ES UN OLVIDO. Administrar la plataforma
 * no es leer los datos personales de los clientes de un gimnasio (§39, §112).
 * Ni siquiera hace falta acordarse al escribir la página: el rol
 * `super_admin` no tiene `customers.read` ni `payments.read`, así que las
 * vistas de operación —que corren con derechos de invocador— le devuelven
 * cero filas. La regla vive en la base, no en este archivo, y por eso no se
 * puede desactivar por descuido.
 *
 * Lo que sí ve: qué gimnasios existen, en qué estado están y cuántas cuentas
 * tiene cada uno. Eso es administrar la plataforma.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO } from '@core/domain/operations/workspace';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = {
  title: 'Panel de la plataforma',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ESTADO: Record<string, { texto: string; tono: 'action' | 'neutral' | 'structural' }> = {
  active: { texto: 'Activo', tono: 'action' },
  trial: { texto: 'Prueba', tono: 'structural' },
  suspended: { texto: 'Suspendido', tono: 'neutral' },
};

export default async function PanelDePlataformaPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug } = tenant;

  const { repo } = await exigirPermiso(slug, PERMISO.administrarGimnasios);
  const gimnasios = await repo.gimnasios();

  const activos = gimnasios.filter((gimnasio) => gimnasio.status === 'active').length;
  const cuentas = gimnasios.reduce((suma, gimnasio) => suma + gimnasio.cuentas, 0);
  const cuentasActivas = gimnasios.reduce((suma, gimnasio) => suma + gimnasio.cuentasActivas, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          etiqueta="Gimnasios"
          valor={`${gimnasios.length}`}
          icono="layers"
          tono="accion"
          comparacion={`${activos} en estado activo`}
        />
        <StatCard
          etiqueta="Cuentas"
          valor={`${cuentas}`}
          icono="group"
          comparacion="en toda la instalación"
        />
        <StatCard
          etiqueta="Cuentas activas"
          valor={`${cuentasActivas}`}
          icono="shield"
          comparacion="de las que pueden entrar hoy"
        />
      </div>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-gimnasios">
        <h2 id="titulo-gimnasios" className="t-h3">
          Gimnasios aprovisionados
        </h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">
          Cada uno es una instancia del mismo producto, configurada, no bifurcada.
        </p>

        <DataTable
          titulo="Gimnasios de la plataforma"
          className="mt-5"
          columnas={[
            {
              clave: 'nombre',
              titulo: 'Gimnasio',
              celda: (fila) => (
                <span className="flex flex-wrap items-center gap-2">
                  {fila.name}
                  {fila.isDemo && <Badge tone="neutral">Demo</Badge>}
                </span>
              ),
            },
            {
              clave: 'slug',
              titulo: 'Ruta',
              secundaria: true,
              celda: (fila) => <code className="font-mono text-[0.78rem]">/{fila.slug}</code>,
            },
            {
              clave: 'estado',
              titulo: 'Estado',
              celda: (fila) => {
                const estado = ESTADO[fila.status] ?? { texto: fila.status, tono: 'neutral' as const };
                return <Badge tone={estado.tono}>{estado.texto}</Badge>;
              },
            },
            {
              clave: 'cuentas',
              titulo: 'Cuentas',
              numerica: true,
              celda: (fila) => `${fila.cuentasActivas} / ${fila.cuentas}`,
            },
            {
              // Configuración, no datos personales: el super admin sí la ve.
              clave: 'sucursales',
              titulo: 'Sucursales',
              numerica: true,
              celda: (fila) => fila.sucursales,
            },
            {
              clave: 'zona',
              titulo: 'Zona horaria',
              secundaria: true,
              celda: (fila) => fila.timezone,
            },
          ]}
          filas={gimnasios}
          claveDeFila={(fila) => fila.tenantId}
          vacio={
            <EmptyState
              icono="layers"
              titulo="No hay gimnasios aprovisionados"
              descripcion="Dar de alta uno son dos pasos: crear su archivo de configuración y registrarlo."
            />
          }
        />
      </section>

      <section className="surface-card flex items-start gap-4 p-6 sm:p-7" aria-labelledby="titulo-alcance">
        <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-action" />
        <div>
          <h2 id="titulo-alcance" className="text-[0.98rem] font-semibold text-ink">
            Este panel no muestra socios ni pagos
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-[0.87rem] leading-relaxed text-muted">
            Administrar la plataforma no incluye leer los datos personales de los socios de un
            gimnasio cliente. No es una pantalla que falte: la cuenta de administración no tiene
            permiso para leer esas tablas, y las consultas le devuelven cero filas aunque se
            escriban a mano. Para lo operativo de un gimnasio está su propia gerencia.
          </p>
          <p className="mt-3 text-[0.82rem] text-muted">
            Estás viendo esta página bajo la marca de{' '}
            <a href={tenantHref(slug)} className="text-action underline underline-offset-4">
              /{slug}
            </a>
            , que es solo el sitio por el que entraste.
          </p>
        </div>
      </section>
    </div>
  );
}
