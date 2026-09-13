/**
 * CAPA: Presentation / App — una sesión de clase (V3.3 + reservas V3.4).
 *
 * La pantalla del mostrador y del instructor: quién reservó, quién vino,
 * cuántos lugares quedan y el buscador para registrar o reservar al siguiente.
 * Gerencia además la edita, la cancela y justifica faltas.
 *
 * Que recepción solo registre en sus sedes y el instructor en sus sesiones lo
 * acota la base (`app.puede_tomar_asistencia`): si no puede, las listas llegan
 * vacías y el registro se rechaza con un mensaje, no con datos.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaLarga, hora, horaEnZona } from '@/lib/formato';
import {
  cuposLibres,
  diaIsoDe,
  horaDeFin,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_ESTADO_DE_SESION,
  NOMBRE_DE_MODO_DE_ACCESO,
  sumarDias,
  type AsistenteDeClase,
} from '@core/domain/operations/classes';
import {
  NOMBRE_DE_ESTADO_DE_RESERVA,
  NOMBRE_DE_ORIGEN_DE_RESERVA,
  sesionIniciada,
  textoDePosicion,
  type ReservaDeSesion,
} from '@core/domain/operations/reservations';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { branchesRepository, classesRepository, reservationsRepository, trainersRepository } from '@infra/config/composition-root';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { BarraDeOcupacion } from '@/presentation/patterns/AgendaDeClases';
import { CancelarSesionForm, SesionForm, TomarAsistenciaDeClase } from '@/presentation/patterns/ClaseForms';
import { CancelarReserva, MarcarQueVino, ReservarParaSocio } from '@/presentation/patterns/ReservaForms';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso } from '../../../_datos';
import { quitarAsistenciaDeClase } from '../../actions';
import { cerrarListaDeSesion, justificarInasistencia } from '../../reservas-actions';

export const metadata: Metadata = { title: 'Sesión de clase', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface SesionPageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

export default async function SesionDeClasePage({ params }: SesionPageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableClasses']);
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verClases);
  const puedeGestionar = tienePermiso(perfil, PERMISO.gestionarClases);
  const puedeTomarAsistencia = tienePermiso(perfil, PERMISO.tomarAsistenciaDeClase);
  const conReservas = features.enableReservations === true;

  const clasesRepo = await classesRepository();
  const sesion = await clasesRepo.sesion(id);
  if (!sesion) notFound();

  const hoy = await repo.hoyDelGimnasio(slug);
  const ahora = `${hoy}T${horaEnZona(tenant.hours.timezone)}`;
  const personal = puedeTomarAsistencia || puedeGestionar;
  const [asistentes, reservas, sedes, instructores] = await Promise.all([
    personal ? clasesRepo.asistentes(id) : Promise.resolve([] as readonly AsistenteDeClase[]),
    personal && conReservas ? (await reservationsRepository()).reservasDeSesion(id) : Promise.resolve([] as readonly ReservaDeSesion[]),
    puedeGestionar ? (await branchesRepository()).listar() : Promise.resolve([]),
    puedeGestionar && features.enableTrainers && tienePermiso(perfil, PERMISO.verEntrenadores) ? (await trainersRepository()).listar() : Promise.resolve([]),
  ]);

  const cancelada = sesion.estado === 'cancelada';
  // Ventana en la que la base acepta asistencia: de media hora antes a una semana después.
  const dentroDeVentana = !cancelada && sesion.sessionDate <= hoy && sesion.sessionDate >= sumarDias(hoy, -7);
  const editable = puedeGestionar && !cancelada && sesion.sessionDate >= hoy && sesion.estado === 'programada';
  const iniciada = sesionIniciada(sesion, ahora);
  const libres = cuposLibres(sesion);
  const terminada = sesion.estado === 'realizada';
  const pendientesDeCerrar = reservas.filter((r) => r.status === 'reservada' && !r.asistio).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-action">
          <Icon name="calendar" size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-h3">{sesion.title ?? sesion.className}</h2>
            <Badge tone={sesion.estado === 'en_curso' ? 'action' : cancelada ? 'structural' : 'neutral'}>{NOMBRE_DE_ESTADO_DE_SESION[sesion.estado]}</Badge>
            {sesion.kind === 'evento' && <Badge tone="action">Evento</Badge>}
          </div>
          <p className="mt-1 text-[0.86rem] text-muted">
            {NOMBRE_DE_DIA_ISO[diaIsoDe(sesion.sessionDate)]} {fechaLarga(sesion.sessionDate)} · {sesion.startTime} – {horaDeFin(sesion.startTime, sesion.durationMinutes)} · {sesion.branchName}
          </p>
          <p className="text-[0.82rem] text-muted">
            {sesion.title ? `${sesion.className} · ` : ''}
            {NOMBRE_DE_CATEGORIA[sesion.category]} · {sesion.trainerName ?? 'instructor por confirmar'} · {NOMBRE_DE_MODO_DE_ACCESO[sesion.accessMode]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`${tenantHref(slug, 'panel/clases')}/${sesion.classId}`} variant="ghost" size="sm" icon="layers" iconPosition="start">
            Ver la clase
          </LinkButton>
          <LinkButton href={tenantHref(slug, 'panel/clases')} variant="ghost" size="sm" icon="calendar" iconPosition="start">
            Agenda
          </LinkButton>
        </div>
      </section>

      {cancelada && (
        <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 px-4 py-3 text-[0.9rem] text-ink">
          <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-structural" />
          Sesión cancelada{sesion.cancelReason ? `: ${sesion.cancelReason}` : '.'}
        </p>
      )}
      {sesion.notes && (
        <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-line px-4 py-3 text-[0.9rem] text-ink">
          <Icon name="quote" size={17} className="mt-0.5 shrink-0 text-action" />
          {sesion.notes}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          {conReservas && personal && (
            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-reservas-sesion">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="titulo-reservas-sesion" className="t-h3">Reservas</h2>
                  <p className="mt-1.5 text-[0.86rem] text-muted">
                    {sesion.reservadas} {sesion.reservadas === 1 ? 'lugar reservado' : 'lugares reservados'} sin llegar todavía
                    {sesion.enEspera > 0 ? ` · ${sesion.enEspera} en lista de espera` : ''}
                    {sesion.walkinSpots > 0 ? ` · ${sesion.walkinSpots} lugares guardados para quien llega sin reservar` : ''}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!cancelada && !iniciada && (
                    <Modal
                      titulo="Reservar para un socio"
                      descripcion="Se aplican las mismas reglas: plan, cupo y lista de espera."
                      anchoMaximo="lg"
                      montarSoloAbierto
                      disparador={
                        <Button variant="secondary" size="sm" icon="plus" iconPosition="start">
                          Reservar para un socio
                        </Button>
                      }
                    >
                      <ReservarParaSocio slug={slug} sessionId={sesion.id} />
                    </Modal>
                  )}
                  {terminada && pendientesDeCerrar > 0 && (
                    <AccionConEstado
                      accion={cerrarListaDeSesion}
                      campos={{ tenantSlug: slug, sessionId: sesion.id }}
                      etiqueta={`Cerrar lista (${pendientesDeCerrar} sin llegar)`}
                      icono="check"
                      variante="primario"
                      confirmar="Quienes reservaron y no tienen asistencia quedarán como falta. ¿Cerrar la lista?"
                    />
                  )}
                </div>
              </div>

              <DataTable<ReservaDeSesion>
                titulo={`Reservas de ${sesion.className}`}
                className="mt-5"
                columnas={[
                  {
                    clave: 'socio',
                    titulo: 'Socio',
                    celda: (r) => (
                      <span className="flex flex-col">
                        <span className="font-medium text-ink">{r.fullName}</span>
                        <span className="text-[0.76rem] text-muted">{[r.customerCode, r.planName].filter(Boolean).join(' · ')}</span>
                      </span>
                    ),
                  },
                  {
                    clave: 'estado',
                    titulo: 'Estado',
                    celda: (r) => {
                      const falta = r.status === 'reservada' && !r.asistio && terminada;
                      return (
                        <span className="flex flex-col gap-1">
                          <Badge tone={r.status === 'asistio' || r.asistio ? 'action' : r.status === 'no_asistio' || falta ? 'structural' : 'neutral'}>
                            {falta ? 'No vino' : r.status === 'en_espera' ? textoDePosicion(r.posicion) : NOMBRE_DE_ESTADO_DE_RESERVA[r.status]}
                          </Badge>
                          {r.lateCancel && <span className="text-[0.74rem] text-structural">cancelación tardía</span>}
                        </span>
                      );
                    },
                  },
                  { clave: 'origen', titulo: 'Origen', secundaria: true, celda: (r) => NOMBRE_DE_ORIGEN_DE_RESERVA[r.source] },
                  {
                    clave: 'accion',
                    titulo: '',
                    celda: (r) => {
                      if (r.status === 'reservada' && !r.asistio && dentroDeVentana && puedeTomarAsistencia) {
                        return <MarcarQueVino slug={slug} sessionId={sesion.id} customerId={r.customerId} />;
                      }
                      if ((r.status === 'reservada' || r.status === 'en_espera') && !iniciada && !cancelada) {
                        return <CancelarReserva slug={slug} reservationId={r.reservationId} tardia={false} etiqueta="Cancelar" />;
                      }
                      if (puedeGestionar && (r.status === 'no_asistio' || (r.status === 'reservada' && !r.asistio && terminada))) {
                        return (
                          <AccionConEstado
                            accion={justificarInasistencia}
                            campos={{ tenantSlug: slug, reservationId: r.reservationId }}
                            etiqueta="Justificar"
                            icono="check"
                            confirmar={`¿Justificar la falta de ${r.fullName}? Dejará de contar para el bloqueo.`}
                          />
                        );
                      }
                      return null;
                    },
                  },
                ]}
                filas={reservas.filter((r) => r.status !== 'cancelada' || r.lateCancel)}
                claveDeFila={(r) => r.reservationId}
                vacio={<EmptyState icono="calendar" titulo="Nadie reservó esta sesión" descripcion={!iniciada && !cancelada ? 'Los socios reservan desde su panel; también puedes reservar por ellos.' : undefined} />}
              />
            </section>
          )}

          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-asistentes">
            <h2 id="titulo-asistentes" className="t-h3">Asistentes</h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">Quién estuvo en esta sesión. No cuenta como entrada al gimnasio: esa la marca el QR de recepción.</p>
            <BarraDeOcupacion asistentes={sesion.ocupados} capacidad={sesion.capacity} enEspera={sesion.enEspera} className="mt-5 max-w-md" />

            <DataTable<AsistenteDeClase>
              titulo={`Asistentes de ${sesion.className}`}
              className="mt-5"
              columnas={[
                {
                  clave: 'socio',
                  titulo: 'Socio',
                  celda: (a) => (
                    <span className="flex flex-col">
                      <span className="font-medium text-ink">{a.fullName}</span>
                      <span className="text-[0.76rem] text-muted">{a.customerCode ?? ''}</span>
                    </span>
                  ),
                },
                { clave: 'plan', titulo: 'Plan', secundaria: true, celda: (a) => a.planName ?? 'Acceso libre' },
                {
                  clave: 'hora',
                  titulo: 'Registrado',
                  celda: (a) => (
                    <span className="flex flex-col">
                      <span>{hora(a.checkedInAt)}</span>
                      <span className="text-[0.76rem] text-muted">
                        {a.method === 'qr' ? 'con QR' : 'manual'}
                        {a.markedByName ? ` · ${a.markedByName}` : ''}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'accion',
                  titulo: '',
                  celda: (a) =>
                    puedeTomarAsistencia && dentroDeVentana ? (
                      <AccionConEstado
                        accion={quitarAsistenciaDeClase}
                        campos={{ tenantSlug: slug, attendanceId: a.attendanceId }}
                        etiqueta="Quitar"
                        icono="close"
                        variante="peligro"
                        confirmar={`¿Quitar a ${a.fullName} de esta sesión?`}
                      />
                    ) : null,
                },
              ]}
              filas={asistentes}
              claveDeFila={(a) => a.attendanceId}
              vacio={
                <EmptyState
                  icono="group"
                  titulo={sesion.asistentes > 0 ? 'Tu cuenta no ve los asistentes de esta sesión' : 'Todavía nadie registrado'}
                  descripcion={sesion.asistentes > 0 ? 'Solo los ve quien toma asistencia en esta sede o dicta la clase.' : undefined}
                />
              }
            />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          {puedeTomarAsistencia && (
            <section className="surface-card p-6" aria-labelledby="titulo-registrar">
              <h2 id="titulo-registrar" className="t-h3">Registrar asistencia</h2>
              {dentroDeVentana ? (
                <div className="mt-4">
                  <TomarAsistenciaDeClase slug={slug} sessionId={sesion.id} cuposLibres={libres} />
                  {conReservas && sesion.reservadas > 0 && (
                    <p className="mt-3 text-[0.78rem] text-muted">Quien reservó entra a su lugar aunque la sesión esté completa: márcalo con «Vino» en la lista de reservas.</p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[0.86rem] text-muted">
                  {cancelada
                    ? 'La sesión está cancelada.'
                    : sesion.sessionDate > hoy
                      ? 'Se abre el día de la sesión, desde media hora antes de empezar.'
                      : 'Pasó más de una semana: ya no se registra asistencia.'}
                </p>
              )}
            </section>
          )}

          {editable && (
            <section className="surface-card flex flex-col gap-3 p-6" aria-labelledby="titulo-gestion-sesion">
              <h2 id="titulo-gestion-sesion" className="t-h3">Gestión</h2>
              <Modal
                titulo="Editar sesión"
                descripcion="Solo esta fecha: el horario semanal no cambia."
                anchoMaximo="lg"
                montarSoloAbierto
                disparador={
                  <Button variant="secondary" size="md" icon="edit" iconPosition="start" fullWidth>
                    Editar sesión
                  </Button>
                }
              >
                <SesionForm
                  slug={slug}
                  hoy={hoy}
                  clases={[]}
                  sedes={sedes.filter((s) => s.isActive).map((s) => ({ id: s.id, nombre: s.name }))}
                  instructores={instructores.filter((i) => i.isActive).map((i) => ({ id: i.id, nombre: i.fullName }))}
                  sesion={sesion}
                />
              </Modal>
              <Modal
                titulo="Cancelar sesión"
                descripcion={
                  sesion.asistentes > 0
                    ? 'Tiene asistentes registrados: quítalos antes si fue un error.'
                    : conReservas && sesion.reservadas + sesion.enEspera > 0
                      ? `Se cancelan ${sesion.reservadas + sesion.enEspera} reservas y cada socio recibe un aviso. No cuenta como falta.`
                      : 'Queda en el calendario, tachada, con el motivo.'
                }
                anchoMaximo="md"
                montarSoloAbierto
                disparador={
                  <Button variant="outline" size="md" icon="close" iconPosition="start" fullWidth>
                    Cancelar sesión
                  </Button>
                }
              >
                <CancelarSesionForm slug={slug} sessionId={sesion.id} />
              </Modal>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
