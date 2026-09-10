/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Filtros de un reporte.
 *
 * Es un formulario GET, no estado de cliente: el resultado es un enlace que se
 * guarda o se pasa al dueño —«el reporte de pagos QR de ayer»—, funciona sin
 * JavaScript y el filtrado ocurre en la base, donde están los índices.
 *
 * Solo pinta los filtros que el reporte declara en el catálogo. Un selector de
 * «rol» en el reporte de pagos no significaría nada y haría pensar que la
 * tabla está vacía por culpa de ese filtro.
 *
 * LOS PERIODOS SON BOTONES DE ENVÍO con `name="preset"`, no enlaces: así un
 * clic en «Ayer» conserva el plan y el método que ya estaban elegidos. «Aplicar»
 * envía `preset` vacío, y entonces mandan las fechas escritas a mano.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { DefinicionDeReporte, FiltroDeReporte, TipoDeFiltro } from '@core/domain/operations/reports';
import { PRESETS_DE_PERIODO, type PresetDePeriodo, type RangoDeFechas } from '@core/domain/operations/periodo';
import {
  NOMBRE_DE_ESTADO_DE_MEMBRESIA,
  NOMBRE_DE_ESTADO_DE_SOCIO,
  NOMBRE_DE_METODO_DE_PAGO,
  type PlanVendible,
} from '@core/domain/operations/members';
import { NOMBRE_DE_ESTADO_DE_COMPROBANTE, NOMBRE_DE_ORIGEN } from '@core/domain/operations/receipts';
import { NOMBRE_DE_METODO } from '@core/domain/operations/attendance';
import { NOMBRE_DE_ROL } from '@core/domain/operations/workspace';
import { Icon } from '../icons/Icon';

interface ReportFiltersProps {
  readonly definicion: DefinicionDeReporte;
  readonly filtro: FiltroDeReporte;
  readonly rango: RangoDeFechas;
  readonly preset: PresetDePeriodo | null;
  readonly planes: readonly PlanVendible[];
  readonly rutaBase: string;
}

const CONTROL =
  'h-11 w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-3 text-[0.88rem] text-ink ' +
  'focus:border-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action/40';

const ETIQUETA = 'mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted';

function opcionesDe(tipo: TipoDeFiltro): readonly { valor: string; texto: string }[] {
  switch (tipo) {
    case 'estado-membresia':
      return [
        ...Object.entries(NOMBRE_DE_ESTADO_DE_MEMBRESIA).map(([valor, texto]) => ({ valor, texto })),
        { valor: 'sin-membresia', texto: 'Sin membresía' },
      ];
    case 'estado-comprobante':
      return Object.entries(NOMBRE_DE_ESTADO_DE_COMPROBANTE).map(([valor, texto]) => ({ valor, texto }));
    case 'estado-socio':
      return Object.entries(NOMBRE_DE_ESTADO_DE_SOCIO).map(([valor, texto]) => ({ valor, texto }));
    case 'metodo-pago':
      return Object.entries(NOMBRE_DE_METODO_DE_PAGO).map(([valor, texto]) => ({ valor, texto }));
    case 'metodo-asistencia':
      return Object.entries(NOMBRE_DE_METODO).map(([valor, texto]) => ({ valor, texto }));
    case 'origen':
      return Object.entries(NOMBRE_DE_ORIGEN).map(([valor, texto]) => ({ valor, texto }));
    case 'rol':
      // El rol de plataforma no pertenece a ningún gimnasio: ofrecerlo aquí
      // produciría siempre una tabla vacía.
      return Object.entries(NOMBRE_DE_ROL)
        .filter(([valor]) => valor !== 'super_admin')
        .map(([valor, texto]) => ({ valor, texto }));
    default:
      return [];
  }
}

function Selector({
  id,
  nombre,
  etiqueta,
  valor,
  opciones,
  todos,
}: {
  readonly id: string;
  readonly nombre: string;
  readonly etiqueta: string;
  readonly valor: string | undefined;
  readonly opciones: readonly { valor: string; texto: string }[];
  readonly todos: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </label>
      <select id={id} name={nombre} defaultValue={valor ?? ''} className={CONTROL}>
        <option value="">{todos}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ReportFilters({ definicion, filtro, rango, preset, planes, rutaBase }: ReportFiltersProps) {
  const admite = (tipo: TipoDeFiltro) => definicion.filtros.includes(tipo);
  const estadoTipo = (['estado-membresia', 'estado-comprobante', 'estado-socio'] as const).find(admite);
  const metodoTipo = (['metodo-pago', 'metodo-asistencia'] as const).find(admite);

  const controles: ReactNode[] = [];

  if (admite('busqueda')) {
    controles.push(
      <div key="q" className="sm:col-span-2">
        <label htmlFor="filtro-q" className={ETIQUETA}>
          Buscar
        </label>
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="filtro-q"
            name="q"
            type="search"
            maxLength={60}
            defaultValue={filtro.q ?? ''}
            placeholder={definicion.clave === 'usuarios' ? 'Nombre o correo' : 'Socio o código'}
            className={cn(CONTROL, 'ps-9')}
          />
        </div>
      </div>,
    );
  }

  if (estadoTipo) {
    controles.push(
      <Selector key="estado" id="filtro-estado" nombre="estado" etiqueta="Estado" valor={filtro.estado} opciones={opcionesDe(estadoTipo)} todos="Todos" />,
    );
  }

  if (admite('plan')) {
    controles.push(
      <Selector
        key="plan"
        id="filtro-plan"
        nombre="plan"
        etiqueta="Plan"
        valor={filtro.planId}
        opciones={planes.map((plan) => ({ valor: plan.id, texto: plan.name }))}
        todos="Todos los planes"
      />,
    );
  }

  if (metodoTipo) {
    controles.push(
      <Selector key="metodo" id="filtro-metodo" nombre="metodo" etiqueta="Método" valor={filtro.metodo} opciones={opcionesDe(metodoTipo)} todos="Todos" />,
    );
  }

  if (admite('origen')) {
    controles.push(
      <Selector key="origen" id="filtro-origen" nombre="origen" etiqueta="Origen" valor={filtro.origen} opciones={opcionesDe('origen')} todos="Todos" />,
    );
  }

  if (admite('rol')) {
    controles.push(
      <Selector key="rol" id="filtro-rol" nombre="rol" etiqueta="Rol" valor={filtro.rol} opciones={opcionesDe('rol')} todos="Todos los roles" />,
    );
  }

  return (
    <form method="get" action={rutaBase} data-print="hide" className="flex flex-col gap-5">
      {admite('periodo') && (
        <fieldset className="flex flex-col gap-3">
          <legend className={ETIQUETA}>Periodo</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS_DE_PERIODO.map((opcion) => {
              const activo = preset === opcion.clave;
              return (
                <button
                  key={opcion.clave}
                  type="submit"
                  name="preset"
                  value={opcion.clave}
                  aria-pressed={activo}
                  className={cn(
                    'inline-flex h-10 items-center rounded-full border px-4 text-[0.82rem] font-medium transition-colors',
                    activo
                      ? 'border-action bg-action text-on-action'
                      : 'border-line bg-raised text-muted hover:border-action hover:text-ink',
                  )}
                >
                  {opcion.etiqueta}
                </button>
              );
            })}
            <button
              type="submit"
              name="preset"
              value="todo"
              aria-pressed={!preset && !rango.desde && !rango.hasta}
              className={cn(
                'inline-flex h-10 items-center rounded-full border px-4 text-[0.82rem] font-medium transition-colors',
                !preset && !rango.desde && !rango.hasta
                  ? 'border-action bg-action text-on-action'
                  : 'border-line bg-raised text-muted hover:border-action hover:text-ink',
              )}
            >
              Todo
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
            <div>
              <label htmlFor="filtro-desde" className={ETIQUETA}>
                Desde
              </label>
              <input id="filtro-desde" name="desde" type="date" defaultValue={rango.desde ?? ''} className={CONTROL} />
            </div>
            <div>
              <label htmlFor="filtro-hasta" className={ETIQUETA}>
                Hasta
              </label>
              <input id="filtro-hasta" name="hasta" type="date" defaultValue={rango.hasta ?? ''} className={CONTROL} />
            </div>
          </div>
        </fieldset>
      )}

      {controles.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{controles}</div>}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="submit"
          name="preset"
          value=""
          className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 text-[0.88rem] font-semibold text-on-action transition-colors hover:bg-action-strong"
        >
          <Icon name="filter" size={16} />
          Aplicar filtros
        </button>
        <a
          href={rutaBase}
          className="inline-flex h-11 items-center rounded-[var(--t-radius-md)] px-4 text-[0.88rem] text-muted transition-colors hover:text-action"
        >
          Limpiar
        </a>
      </div>
    </form>
  );
}
