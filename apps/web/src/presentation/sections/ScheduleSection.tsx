/**
 * CAPA: Presentation / Sections
 *
 * Horario de atención.
 *
 * En pantalla es una tabla real (`<table>`): un horario ES datos tabulares, y
 * un lector de pantalla necesita la relación fila/columna para anunciarlo. Un
 * conjunto de `div` con aspecto de tabla lo vuelve ininteligible.
 *
 * POR SEDE CUANDO HAY VARIAS. Dos sucursales del mismo gimnasio no cierran a la
 * misma hora —una abre los domingos y la otra no—, así que publicar un único
 * horario obligaría a elegir cuál de las dos se cuenta mal. Con varias sedes la
 * sección se presenta en pestañas, una por sucursal, cada una con SU semana.
 * Con una sola, la tabla de siempre y ninguna pestaña que sobre.
 */

import type { SedeDeVitrina } from '@core/domain/catalog/branches';
import type { BusinessHours, DaySchedule } from '@core/domain/catalog/schedule';
import { diasAbiertos } from '@core/domain/catalog/schedule';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Pestanas } from '../ui/Pestanas';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface ScheduleSectionProps {
  readonly hours: BusinessHours;
  /** Sedes con horario propio. Con más de una, la sección usa pestañas. */
  readonly sedes?: readonly SedeDeVitrina[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

function TablaDeHorario({
  week,
  timezone,
  descripcion,
}: {
  readonly week: readonly DaySchedule[];
  readonly timezone: string;
  readonly descripcion: string;
}) {
  return (
    // El contenedor scrollea, no la página: nunca hay scroll horizontal
    // en el body por culpa de una tabla ancha.
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse overflow-hidden rounded-[var(--t-radius-lg)] border border-line">
        <caption className="sr-only">
          {descripcion} Zona horaria: {timezone}.
        </caption>
        <thead>
          <tr className="bg-structural-deep text-white">
            <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
              Día
            </th>
            <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
              Apertura
            </th>
            <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
              Cierre
            </th>
            <th scope="col" className="px-6 py-4 text-start text-[0.76rem] uppercase tracking-[0.16em]">
              Nota
            </th>
          </tr>
        </thead>
        <tbody>
          {week.map((day) => (
            <tr
              key={day.day}
              className={cn(
                'border-t border-line transition-colors',
                day.closed ? 'bg-raised/60 text-muted' : 'bg-surface hover:bg-raised',
              )}
            >
              <th scope="row" className="px-6 py-4 text-start text-[0.95rem] font-semibold text-ink">
                {day.day}
              </th>
              {day.closed ? (
                <td colSpan={2} className="px-6 py-4 text-[0.92rem]">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <Icon name="close" size={14} />
                    Cerrado
                  </span>
                </td>
              ) : (
                <>
                  <td className="px-6 py-4 font-mono text-[0.95rem] text-action">{day.open}</td>
                  <td className="px-6 py-4 font-mono text-[0.95rem] text-ink/85">{day.close}</td>
                </>
              )}
              <td className="px-6 py-4 text-[0.85rem] text-muted">{day.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScheduleSection({
  hours,
  sedes = [],
  eyebrow = 'Horarios',
  title = 'Cuándo puedes venir',
  lead,
}: ScheduleSectionProps) {
  const porSede = sedes.length > 1;

  return (
    <section className="section" aria-labelledby="horarios-title">
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        <Reveal delay={80}>
          <div className="mt-12">
            {porSede ? (
              <Pestanas
                etiquetaDelGrupo="Sucursales"
                pestanas={sedes.map((sede) => ({
                  id: sede.code,
                  etiqueta: sede.name,
                  detalle: `Abierto ${diasAbiertos(sede.week)} días`,
                  contenido: (
                    <div className="mt-8 flex flex-col gap-5">
                      <p className="flex items-start gap-3 text-[0.9rem] text-muted">
                        <Icon name="pin" size={17} className="mt-0.5 shrink-0 text-action" />
                        {sede.address}
                      </p>
                      <TablaDeHorario
                        week={sede.week}
                        timezone={hours.timezone}
                        descripcion={`Horario de atención de la sede ${sede.name}.`}
                      />
                      {sede.scheduleNote && (
                        <p className="flex items-start gap-3 text-[0.88rem] text-muted">
                          <Icon name="calendar" size={17} className="mt-0.5 shrink-0 text-action" />
                          {sede.scheduleNote}
                        </p>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <TablaDeHorario
                week={sedes[0]?.week ?? hours.week}
                timezone={hours.timezone}
                descripcion="Horario de atención semanal."
              />
            )}
          </div>
        </Reveal>

        {hours.holidayNote && (
          <Reveal delay={140}>
            <p className="mt-6 flex items-start gap-3 text-[0.88rem] text-muted">
              <Icon name="calendar" size={17} className="mt-0.5 shrink-0 text-action" />
              {hours.holidayNote}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
