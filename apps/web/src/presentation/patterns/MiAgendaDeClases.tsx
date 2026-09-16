/**
 * CAPA: Presentation / Patterns — la agenda de clases del socio (V4.2).
 *
 * §15 y §16 del encargo: que el socio sepa a qué está inscrito sin recorrer
 * páginas, y que la lectura vaya DÍA → CLASE → HORARIO → SUCURSAL →
 * DISPONIBILIDAD → RESERVAR.
 *
 * POR QUÉ NO SE REUSÓ `FilaDeSesion`. Aquella fila está pensada para el
 * MOSTRADOR: enseña instructor, categoría y una barra de ocupación, que es lo
 * que necesita quien gestiona la agenda. El socio necesita otra cosa —¿estoy
 * dentro?, ¿queda lugar?, ¿qué hago?— y meter las dos lecturas en un componente
 * lo habría llenado de banderas. Las dos siguen existiendo, cada una en su
 * pantalla.
 *
 * El día se escribe una vez como encabezado y no se repite en cada fila: con
 * doce sesiones en siete días, repetirlo es la mitad del texto de la lista.
 *
 * Qué situación tiene cada sesión lo decide el dominio
 * (`operations/agenda-del-socio.ts`); aquí solo se elige el color.
 */

import type { ReactNode } from 'react';
import {
  agruparPorDia,
  describirDisponibilidad,
  estaInscrito,
  NOMBRE_DE_ESTADO_DE_CLASE,
  TONO_DE_ESTADO_DE_CLASE,
  type EstadoDeClaseDelSocio,
  type SesionParaElSocio,
} from '@core/domain/operations/agenda-del-socio';
import { NOMBRE_DE_DIA_ISO, diaIsoDe } from '@core/domain/operations/classes';
import { fechaLarga } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

const CLASE_DE_TONO: Readonly<Record<'bueno' | 'neutro' | 'atencion', string>> = {
  bueno: 'bg-action/15 text-action',
  atencion: 'bg-structural/15 text-structural',
  neutro: 'bg-raised text-muted',
};

export interface FilaDeAgendaDelSocio {
  readonly id: string;
  /** `YYYY-MM-DD` local del gimnasio. Se usa para agrupar y para el encabezado. */
  readonly sessionDate: string;
  readonly startTime: string;
  readonly horaFin: string;
  readonly nombre: string;
  readonly sucursal: string | null;
  readonly instructor: string | null;
  readonly esEvento: boolean;
  readonly motivoDeCancelacion: string | null;
  readonly estado: EstadoDeClaseDelSocio;
  readonly ocupacion: SesionParaElSocio;
  /** El control de reserva, si el gimnasio las tiene y la sesión lo admite. */
  readonly accion?: ReactNode;
}

interface MiAgendaDeClasesProps {
  readonly filas: readonly FilaDeAgendaDelSocio[];
  /** Fecha de hoy en el gimnasio, para rotular «Hoy» y «Mañana». */
  readonly hoy: string;
  readonly mostrarSede?: boolean;
  readonly className?: string;
}

/** «Hoy», «Mañana» o el día con su nombre. Un socio no lee fechas ISO. */
function rotuloDeDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  const manana = new Date(`${hoy}T12:00:00Z`);
  manana.setUTCDate(manana.getUTCDate() + 1);
  if (fecha === manana.toISOString().slice(0, 10)) return 'Mañana';
  return `${NOMBRE_DE_DIA_ISO[diaIsoDe(fecha)]} ${fechaLarga(fecha)}`;
}

export function MiAgendaDeClases({ filas, hoy, mostrarSede = true, className }: MiAgendaDeClasesProps) {
  const dias = agruparPorDia(filas);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {dias.map((dia) => (
        <div key={dia.fecha}>
          <h3 className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted">
            {rotuloDeDia(dia.fecha, hoy)}
            {dia.fecha === hoy && <span className="ms-2 inline-block size-1.5 rounded-full bg-action align-middle" />}
          </h3>

          <ul className="mt-2.5 flex flex-col gap-2">
            {dia.sesiones.map((fila) => {
              const inscrito = estaInscrito(fila.estado);
              const cancelada = fila.estado === 'cancelado';
              return (
                <li
                  key={fila.id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--t-radius-md)] border px-4 py-3',
                    inscrito ? 'border-action/50 bg-action/5' : 'border-line',
                  )}
                >
                  <span className="flex w-16 shrink-0 flex-col">
                    <span className={cn('text-[1.05rem] font-bold leading-tight', cancelada ? 'text-muted line-through' : 'text-ink')}>
                      {fila.startTime}
                    </span>
                    <span className="text-[0.72rem] text-muted">{fila.horaFin}</span>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn('font-semibold', cancelada ? 'text-muted line-through' : 'text-ink')}>{fila.nombre}</span>
                      {fila.esEvento && <span className="rounded-[var(--t-radius-sm)] bg-action/15 px-2 py-0.5 text-[0.74rem] font-semibold text-action">Evento</span>}
                      <span className={cn('rounded-[var(--t-radius-sm)] px-2 py-0.5 text-[0.74rem] font-semibold', CLASE_DE_TONO[TONO_DE_ESTADO_DE_CLASE[fila.estado]])}>
                        {NOMBRE_DE_ESTADO_DE_CLASE[fila.estado]}
                      </span>
                    </span>
                    <span className="text-[0.78rem] text-muted">
                      {[
                        mostrarSede ? fila.sucursal : null,
                        fila.instructor ?? 'instructor por confirmar',
                        cancelada ? null : describirDisponibilidad(fila.ocupacion),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {cancelada && fila.motivoDeCancelacion && (
                      <span className="flex items-center gap-1.5 text-[0.78rem] text-structural">
                        <Icon name="alert" size={14} />
                        {fila.motivoDeCancelacion}
                      </span>
                    )}
                  </span>

                  {fila.accion && <span className="ms-auto shrink-0">{fila.accion}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
