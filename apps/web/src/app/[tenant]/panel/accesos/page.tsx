/**
 * CAPA: Presentation / App — historial de ingresos (V4.2).
 *
 * POR QUÉ ES UNA PÁGINA APARTE DE «ASISTENCIA». Son dos preguntas distintas y
 * mezclarlas en una tabla haría que los números se contradijeran a la vista:
 *
 *   Asistencia  «quién vino qué día»   una fila por socio y día
 *   Ingresos    «quién cruzó qué puerta y a qué hora»  varias por día
 *
 * Un socio con tres pases en un día aparece UNA vez en asistencia y TRES aquí.
 * Las dos cifras son correctas.
 *
 * Capacidad `enableAttendance` + permiso `attendance.read`, los mismos que la
 * bitácora: quien puede leer la asistencia puede leer los ingresos.
 *
 * La base filtra, ordena, cuenta y corta (`range` + `count`): la página nunca
 * recibe más de 25 filas, tenga el gimnasio mil o cien mil.
 */

import type { Metadata } from 'next';
import { loadTenantPage, tenantPageMetadata, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import {
  esTipoDeAcceso,
  NOMBRE_DE_METODO,
  NOMBRE_DE_TIPO_DE_ACCESO,
  type FiltroDePases,
  type TipoDeAcceso,
} from '@core/domain/operations/attendance';
import { ETIQUETA_SIN_SUCURSAL } from '@core/domain/operations/branches';
import { PERMISO } from '@core/domain/operations/workspace';
import { describirTramo, FILAS_POR_PAGINA, paginaDeLaUrl } from '@core/domain/shared/paginacion';
import { branchesRepository } from '@infra/config/composition-root';
import { FormularioDeFiltro, BotonDeFiltrar } from '@/presentation/patterns/FiltroConCarga';
import { Paginacion } from '@/presentation/patterns/Paginacion';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { StatCard } from '@/presentation/ui/StatCard';
import { CLASE_DE_CONTROL } from '@/presentation/ui/Campo';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso, fechaCorta, hora } from '../_datos';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: TenantPageParams): Promise<Metadata> {
  return tenantPageMetadata(params, 'Ingresos');
}

interface AccesosPageProps extends TenantPageParams {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Primer valor de un parámetro de la URL. Todo lo que llega de ahí es texto de quien la escribe. */
function uno(valor: string | readonly string[] | undefined, largo = 60): string {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return typeof bruto === 'string' ? bruto.slice(0, largo) : '';
}

export default async function AccesosPage({ params, searchParams }: AccesosPageProps) {
  const tenant = await loadTenantPage(params, 'enableAttendance');
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verAsistencia);

  const consulta = await searchParams;
  const pagina = paginaDeLaUrl(consulta.pagina);
  const busqueda = uno(consulta.q);
  const desde = uno(consulta.desde, 10);
  const hasta = uno(consulta.hasta, 10);
  const sucursal = uno(consulta.sucursal, 40);
  const tipoCrudo = uno(consulta.tipo, 20);
  const tipo: TipoDeAcceso = esTipoDeAcceso(tipoCrudo) ? tipoCrudo : 'todos';

  const multisede = features.enableMultiBranch === true;
  const sedes = multisede ? await (await branchesRepository()).listar() : [];

  const filtro: FiltroDePases = {
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
    ...(busqueda ? { busqueda } : {}),
    ...(sucursal ? { sucursal } : {}),
    ...(tipo !== 'todos' ? { tipo } : {}),
  };

  const página = await repo.historialDePases(filtro, pagina, FILAS_POR_PAGINA);
  const cruzados = página.filas.filter((p) => p.cruzado).length;

  const ruta = tenantHref(slug, 'panel/accesos');

  // Los enlaces de paginación conservan los filtros: cambiar de página no debe
  // borrar lo que la persona acaba de buscar.
  const parametros = { q: busqueda, desde, hasta, sucursal, tipo: tipo === 'todos' ? '' : tipo };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="t-h1">Ingresos</h1>
        <p className="t-lead mt-2">
          Cada paso por recepción, con su hora y su sede. Distinto de «Asistencia», que cuenta un día
          por socio aunque entre varias veces.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard etiqueta="Ingresos encontrados" valor={String(página.total)} icono="dumbbell" comparacion="con los filtros actuales" />
        <StatCard etiqueta="En esta página" valor={String(página.filas.length)} icono="calendar" comparacion={describirTramo(página.pagina, página.porPagina, página.total, página.filas.length)} />
        {multisede && (
          <StatCard
            etiqueta="En otra sucursal"
            valor={String(cruzados)}
            icono="pin"
            tono={cruzados > 0 ? 'accion' : 'neutro'}
            comparacion="de los que se ven en esta página"
          />
        )}
      </div>

      <section className="surface-card p-6" aria-labelledby="titulo-filtros-accesos">
        <h2 id="titulo-filtros-accesos" className="sr-only">
          Filtros
        </h2>
        <FormularioDeFiltro ruta={ruta} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Socio</span>
            <input name="q" defaultValue={busqueda} placeholder="Nombre o código" className={CLASE_DE_CONTROL} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Desde</span>
            <input name="desde" type="date" defaultValue={desde} className={CLASE_DE_CONTROL} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Hasta</span>
            <input name="hasta" type="date" defaultValue={hasta} className={CLASE_DE_CONTROL} />
          </label>

          {multisede && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Sucursal</span>
              <select name="sucursal" defaultValue={sucursal} className={CLASE_DE_CONTROL}>
                <option value="">Todas</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Tipo</span>
            <select name="tipo" defaultValue={tipo} className={CLASE_DE_CONTROL}>
              {(Object.keys(NOMBRE_DE_TIPO_DE_ACCESO) as TipoDeAcceso[]).map((clave) => (
                <option key={clave} value={clave}>
                  {NOMBRE_DE_TIPO_DE_ACCESO[clave]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <BotonDeFiltrar />
          </div>
        </FormularioDeFiltro>
      </section>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-historial-accesos">
        <h2 id="titulo-historial-accesos" className="t-h3">
          Historial
        </h2>

        <div className="mt-5">
          <DataTable
            titulo="Historial de ingresos"
            tituloOculto
            filas={página.filas}
            claveDeFila={(pase) => pase.id}
            columnas={[
              { clave: 'socio', titulo: 'Socio', celda: (pase) => pase.customerName },
              { clave: 'codigo', titulo: 'Código', secundaria: true, celda: (pase) => pase.customerCode ?? '—' },
              { clave: 'fecha', titulo: 'Fecha', celda: (pase) => fechaCorta(pase.passDate) },
              { clave: 'hora', titulo: 'Hora', celda: (pase) => hora(pase.passedAt) },
              {
                clave: 'sucursal',
                titulo: 'Sucursal',
                celda: (pase) => (
                  <span className="inline-flex items-center gap-1.5">
                    {pase.branchName ?? ETIQUETA_SIN_SUCURSAL}
                    {/* El alfiler marca los ingresos en una sede distinta a la
                        de origen del socio: es lo que el cliente quería poder
                        distinguir de un vistazo. */}
                    {pase.cruzado && <Icon name="pin" size={13} className="text-action" />}
                  </span>
                ),
              },
              { clave: 'numero', titulo: 'Acceso del día', numerica: true, celda: (pase) => String(pase.passNumber) },
              { clave: 'metodo', titulo: 'Método', secundaria: true, celda: (pase) => NOMBRE_DE_METODO[pase.method] },
            ]}
            vacio={
              <EmptyState
                icono="calendar"
                titulo="No hay ingresos con esos filtros"
                descripcion="Prueba a ampliar el rango de fechas o a quitar el filtro de sucursal."
              />
            }
          />
        </div>

        <Paginacion
          className="mt-6"
          ruta={ruta}
          parametros={parametros}
          pagina={página.pagina}
          porPagina={página.porPagina}
          total={página.total}
          filasEnPagina={página.filas.length}
          ancla="titulo-historial-accesos"
        />
      </section>
    </div>
  );
}
