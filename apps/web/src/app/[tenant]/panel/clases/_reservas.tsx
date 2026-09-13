/**
 * CAPA: Presentation / App — reservas en el panel de clases (V3.4), para gerencia.
 *
 * Componente de servidor con sus propios datos: las reglas del gimnasio, cómo
 * se cumplen las reservas (quién viene, quién falta, dónde hay lista de espera)
 * y las faltas recientes para justificar. Vive junto a la ruta porque solo lo
 * usa `/panel/clases`; la página lo monta solo con `enableReservations` y
 * `classes.manage`, y RLS no le devolvería nada a otra cuenta.
 */

import { fechaCorta } from '@/lib/formato';
import {
  conclusionesDeReservas,
  describirAjustes,
  tasaDeAsistencia,
  type ConclusionDeReservas,
  type EstadisticaDeReservas,
  type Inasistencia,
} from '@core/domain/operations/reservations';
import { reservationsRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { AjustesDeReservaForm } from '@/presentation/patterns/ReservaForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Icon, type AnyIconKey } from '@/presentation/icons/Icon';
import { justificarInasistencia } from './reservas-actions';

const ICONO_DE_TONO: Readonly<Record<ConclusionDeReservas['tono'], AnyIconKey>> = {
  bueno: 'check',
  neutro: 'chart',
  atencion: 'alert',
};

export async function SeccionDeReservas({ slug }: { readonly slug: string }) {
  const repo = await reservationsRepository();
  const [ajustes, resumen, estadisticas, inasistencias] = await Promise.all([
    repo.ajustes(),
    repo.resumen(),
    repo.estadisticas(),
    repo.inasistencias(60),
  ]);

  const asistieron = estadisticas.reduce((s, e) => s + e.asistieron30d, 0);
  const faltas = estadisticas.reduce((s, e) => s + e.inasistencias30d, 0);
  const tasa = tasaDeAsistencia(asistieron, faltas);
  const conclusiones = conclusionesDeReservas(estadisticas, resumen);
  const conActividad = estadisticas.filter((e) => e.reservas30d > 0);

  return (
    <>
      <section id="reservas" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-reservas">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-reservas" className="t-h3">Reservas</h2>
            <p className="mt-1.5 max-w-[66ch] text-[0.86rem] text-muted">{describirAjustes(ajustes).slice(0, 3).join(' ')}</p>
          </div>
          <Modal
            titulo="Reglas de reserva"
            descripcion="Valen para todas las clases del gimnasio desde la próxima reserva."
            anchoMaximo="lg"
            montarSoloAbierto
            disparador={
              <Button variant="secondary" size="sm" icon="toggle" iconPosition="start">
                Reglas de reserva
              </Button>
            }
          >
            <AjustesDeReservaForm slug={slug} ajustes={ajustes} />
          </Modal>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href="#reservas-por-clase" etiqueta="Reservas por venir" valor={`${resumen?.reservasFuturas ?? 0}`} icono="calendar" tono="accion" comparacion="lugares reservados en sesiones futuras" accion="Ver por clase" />
          <StatCard href="#reservas-por-clase" etiqueta="En lista de espera" valor={`${resumen?.enEsperaAhora ?? 0}`} icono="clock" comparacion="esperando que se libere un lugar" accion="Ver por clase" />
          <StatCard
            href="#faltas"
            etiqueta="Asistencia con reserva"
            valor={tasa === null ? '—' : `${tasa} %`}
            icono="check"
            tono={tasa !== null && tasa < 70 ? 'alerta' : 'neutro'}
            comparacion={`${asistieron} vinieron · ${faltas} faltaron (30 días)`}
            accion="Ver faltas"
          />
          <StatCard
            href="#faltas"
            etiqueta="Socios bloqueados"
            valor={`${resumen?.sociosBloqueados ?? 0}`}
            icono="lock"
            tono={(resumen?.sociosBloqueados ?? 0) > 0 ? 'alerta' : 'neutro'}
            comparacion="por faltas o cancelaciones tardías"
            subirEsMalo
            accion="Revisar"
          />
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {conclusiones.map((c) => (
            <li
              key={c.clave}
              className={
                c.tono === 'atencion'
                  ? 'flex gap-3 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 p-4'
                  : c.tono === 'bueno'
                    ? 'flex gap-3 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 p-4'
                    : 'flex gap-3 rounded-[var(--t-radius-md)] border border-line p-4'
              }
            >
              <Icon name={ICONO_DE_TONO[c.tono]} size={18} className={c.tono === 'atencion' ? 'mt-0.5 shrink-0 text-structural' : 'mt-0.5 shrink-0 text-action'} />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold text-ink">{c.titulo}</span>
                <span className="text-[0.86rem] leading-relaxed text-muted">{c.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section id="reservas-por-clase" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-reservas-por-clase">
        <h2 id="titulo-reservas-por-clase" className="t-h3">Reservas por clase</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">Sesiones de los últimos 30 días.</p>
        <DataTable<EstadisticaDeReservas>
          titulo="Cumplimiento de reservas por clase en 30 días"
          className="mt-5"
          columnas={[
            { clave: 'clase', titulo: 'Clase', celda: (e) => <span className="font-medium text-ink">{e.name}</span> },
            { clave: 'reservas', titulo: 'Reservas', numerica: true, celda: (e) => `${e.reservas30d}` },
            { clave: 'vinieron', titulo: 'Vinieron', numerica: true, celda: (e) => `${e.asistieron30d}` },
            { clave: 'faltas', titulo: 'Faltas', numerica: true, celda: (e) => `${e.inasistencias30d}` },
            {
              clave: 'tasa',
              titulo: 'Asistencia',
              numerica: true,
              celda: (e) => {
                const t = tasaDeAsistencia(e.asistieron30d, e.inasistencias30d);
                return t === null ? '—' : <Badge tone={t >= 70 ? 'action' : 'structural'}>{t} %</Badge>;
              },
            },
            { clave: 'tardias', titulo: 'Tardías', numerica: true, secundaria: true, celda: (e) => `${e.tardias30d}` },
            { clave: 'espera', titulo: 'Con espera', numerica: true, secundaria: true, celda: (e) => `${e.sesionesConEspera30d}` },
          ]}
          filas={conActividad}
          claveDeFila={(e) => e.classId}
          filaDeTotales={{
            clase: `${conActividad.length} clases con reservas`,
            reservas: `${conActividad.reduce((s, e) => s + e.reservas30d, 0)}`,
            vinieron: `${asistieron}`,
            faltas: `${faltas}`,
          }}
          vacio={<EmptyState icono="calendar" titulo="Todavía no hay reservas en los últimos 30 días" />}
        />
      </section>

      <section id="faltas" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-faltas">
        <h2 id="titulo-faltas" className="t-h3">Faltas recientes</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">
          Reservas sin asistencia y cancelaciones tardías de 30 días. Justificar una falta la saca del conteo y le avisa al socio.
        </p>
        <DataTable<Inasistencia>
          titulo="Faltas y cancelaciones tardías de 30 días"
          className="mt-5"
          columnas={[
            {
              clave: 'socio',
              titulo: 'Socio',
              celda: (f) => (
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{f.customerName}</span>
                  <span className="text-[0.76rem] text-muted">{f.customerCode ?? ''}</span>
                </span>
              ),
            },
            {
              clave: 'clase',
              titulo: 'Clase',
              celda: (f) => (
                <span className="flex flex-col">
                  <span>{f.className}</span>
                  <span className="text-[0.76rem] text-muted">
                    {fechaCorta(f.sessionDate)} {f.startTime} · {f.branchName}
                  </span>
                </span>
              ),
            },
            {
              clave: 'tipo',
              titulo: 'Tipo',
              celda: (f) =>
                f.status === 'justificada' ? (
                  <Badge tone="neutral">Justificada</Badge>
                ) : f.lateCancel ? (
                  <Badge tone="structural">Cancelación tardía</Badge>
                ) : (
                  <Badge tone="structural">No vino</Badge>
                ),
            },
            {
              clave: 'bloqueo',
              titulo: 'Bloqueo',
              secundaria: true,
              celda: (f) => (f.bloqueadoHasta ? <span className="text-structural">hasta {fechaCorta(f.bloqueadoHasta)}</span> : '—'),
            },
            {
              clave: 'accion',
              titulo: '',
              celda: (f) =>
                f.status === 'no_asistio' ? (
                  <AccionConEstado
                    accion={justificarInasistencia}
                    campos={{ tenantSlug: slug, reservationId: f.reservationId }}
                    etiqueta="Justificar"
                    icono="check"
                    confirmar={`¿Justificar la falta de ${f.customerName} a ${f.className}?`}
                  />
                ) : null,
            },
          ]}
          filas={inasistencias}
          claveDeFila={(f) => f.reservationId}
          vacio={<EmptyState icono="check" titulo="Sin faltas en los últimos 30 días" />}
        />
      </section>
    </>
  );
}
