/**
 * CAPA: Presentation / App — panel del socio.
 *
 * Lo que un socio necesita de sí mismo: qué le avisan, qué plan tiene y cuánto
 * le queda, su QR para entrar, su racha, sus datos y cómo pagar la mensualidad.
 * Cada tarjeta lleva a algo: un número que no se puede tocar es un número que
 * el socio tiene que ir a buscar a otra parte.
 *
 * Todo sale de vistas con RLS. Aunque esta página tuviera un fallo, la base
 * solo devuelve su ficha, sus pagos y sus comprobantes.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { construirNotificaciones } from '@core/domain/operations/notifications';
import { AVISO_DE_CUENTA_PARA_COMPROBANTE } from '@core/domain/operations/receipts';
import {
  datosPresencialesPendientes,
  listaDeCampos,
  qrHabilitado,
  situacionDelSocio,
  type SituacionDelSocio,
} from '@core/domain/operations/alta-del-socio';
import { NOMBRE_DE_METODO } from '@core/domain/operations/attendance';
import { calcularRacha, diaDelHorario, diasCerradosDelHorario } from '@core/domain/operations/streak';
import { ETIQUETA_SIN_SUCURSAL } from '@core/domain/operations/branches';
import { edad, NOMBRE_DE_ESTADO_DE_MEMBRESIA, NOMBRE_DE_METODO_DE_PAGO } from '@core/domain/operations/members';
import { NOMBRE_DE_ESTADO_DE_COMPROBANTE } from '@core/domain/operations/receipts';
import { clasesDelPlan, horaDeFin, sumarDias } from '@core/domain/operations/classes';
import { estaInscrito, estadoDeClaseDelSocio } from '@core/domain/operations/agenda-del-socio';
import { tituloDeRutina } from '@core/domain/operations/training';
import {
  AJUSTES_RECOMENDADOS,
  cancelacionSeriaTardia,
  describirAjustes,
  NOMBRE_DE_ESTADO_DE_RESERVA,
  resultadoDeReservar,
  textoDePosicion,
  ventanaDeReserva,
  type Reserva,
} from '@core/domain/operations/reservations';
import { horaEnZona } from '@/lib/formato';
import { classesRepository, membersRepository, receiptsRepository, reservationsRepository, trainingRepository } from '@infra/config/composition-root';
import { MiAgendaDeClases, type FilaDeAgendaDelSocio } from '@/presentation/patterns/MiAgendaDeClases';
import { BotonDeReserva, type EstadoDeReservaDeSesion } from '@/presentation/patterns/ReservaForms';
import { matrizQr } from '@infra/operations/qr';
import { NotificationsPanel } from '@/presentation/patterns/NotificationsPanel';
import { RachaCalendario } from '@/presentation/patterns/RachaCalendario';
import { FotoDePerfilForm } from '@/presentation/patterns/FotoDePerfilForm';
import { SubirComprobanteForm } from '@/presentation/patterns/ComprobanteForms';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { QrCode } from '@/presentation/ui/QrCode';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPerfil, fechaCorta, hora, importe } from '../_datos';

export const metadata: Metadata = { title: 'Mi panel', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface SocioPageProps {
  readonly params: Promise<{ tenant: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <dt className="text-[0.84rem] text-muted">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-end text-[0.9rem] text-ink">{valor || '—'}</dd>
    </div>
  );
}

/** V4.2 · Cómo se lee cada punto del alta en la tarjeta de socio. */
const NOMBRE_DE_SITUACION: Readonly<Record<SituacionDelSocio, string>> = {
  'sin-ficha': 'Sin ficha',
  'pago-en-revision': 'Pago en revisión',
  'sin-membresia': 'Sin membresía activa',
  pendiente: 'Socio pendiente',
  completo: 'Socio activo',
};

const TONO_DE_SITUACION: Readonly<Record<SituacionDelSocio, 'action' | 'neutral' | 'structural' | 'highlight'>> = {
  'sin-ficha': 'neutral',
  'pago-en-revision': 'structural',
  'sin-membresia': 'neutral',
  pendiente: 'highlight',
  completo: 'action',
};

export default async function PanelDeSocioPage({ params, searchParams }: SocioPageProps) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug, name, features } = tenant;
  const { perfil, repo } = await exigirPerfil(slug);

  const consulta = await searchParams;
  const pagarCrudo = Array.isArray(consulta.pagar) ? consulta.pagar[0] : consulta.pagar;
  const codigoAPagar = typeof pagarCrudo === 'string' ? pagarCrudo.slice(0, 40) : '';

  const customerId = perfil.customerId;
  const socios = await membersRepository();
  const conPagos = features.enablePayments === true;

  const multisede = features.enableMultiBranch === true;
  const hoy = await repo.hoyDelGimnasio(slug);

  const [avisos, ficha, dias, historial, planes, pagos, comprobantes, miFoto] = await Promise.all([
    repo.avisos(),
    customerId ? socios.ficha(customerId) : Promise.resolve(null),
    customerId ? socios.diasDeAsistencia(customerId, 365) : Promise.resolve([] as readonly string[]),
    // RLS ya reduce la bitácora a las entradas del propio socio. Con varias
    // sedes se trae el mes entero para contar dónde entrenó; si no, bastan 8.
    repo.historialDeAsistencia(multisede ? { desde: `${hoy.slice(0, 7)}-01`, limite: 62 } : { limite: 8 }),
    conPagos ? socios.planesVendibles() : Promise.resolve([]),
    customerId ? socios.pagos(customerId) : Promise.resolve([]),
    conPagos && customerId ? (await receiptsRepository()).listar({ customerId, limite: 10 }) : Promise.resolve([]),
    // V4.2 · Su foto de perfil. URL firmada de cinco minutos: el bucket es
    // privado porque una cara es dato personal.
    customerId ? repo.miFoto() : Promise.resolve({ url: null }),
  ]);

  // V3.2: sus rutinas vigentes. RLS solo devuelve las del propio socio.
  const rutinas =
    features.enableRoutines === true && customerId
      ? await (await trainingRepository()).asignaciones({ customerId, vigentes: true })
      : [];

  // V3.3: las clases que incluye su plan y las que tomó. El calendario lo ve
  // cualquier cuenta del gimnasio; la asistencia, RLS la reduce a la propia.
  const conClases = features.enableClasses === true && Boolean(customerId);
  // V3.4: con reservas, el socio ve tantos días como abre la reserva (tope 14).
  const conReservas = conClases && features.enableReservations === true;
  const reservas = conReservas ? await reservationsRepository() : null;
  const [estadoDeReservas, avisosDeReservas] = reservas ? await Promise.all([reservas.miEstado(), reservas.avisos()]) : [null, []];
  const ajustes = estadoDeReservas?.ajustes ?? AJUSTES_RECOMENDADOS;
  const diasVisibles = conReservas ? Math.min(Math.max(ajustes.openDaysBefore, 7), 14) : 7;
  const clasesRepo = conClases ? await classesRepository() : null;
  const [clasesDelGimnasio, sesionesDeLaSemana, clasesTomadas, misReservas] = clasesRepo
    ? await Promise.all([
        clasesRepo.clases(),
        clasesRepo.sesiones({ desde: hoy, hasta: sumarDias(hoy, diasVisibles - 1), soloProgramadas: true }),
        clasesRepo.clasesAsistidas(customerId ?? '', 6),
        reservas && customerId ? reservas.reservasDelSocio(customerId, sumarDias(hoy, -21), 60) : Promise.resolve([] as readonly Reserva[]),
      ])
    : [[], [], [], [] as readonly Reserva[]];
  // Orientativo: la base vuelve a mirar la membresía que cubre el DÍA de cada sesión al registrar.
  const planVigente =
    ficha?.planId && (ficha.membershipStatus === 'active' || ficha.membershipStatus === 'expiring_soon') ? ficha.planId : null;
  const misClases = clasesDelPlan(clasesDelGimnasio, planVigente);
  const otrasClases = clasesDelGimnasio.filter((c) => c.isActive && !misClases.some((m) => m.id === c.id));
  const misSesiones = sesionesDeLaSemana
    .filter((s) => (misClases.some((c) => c.id === s.classId) || s.miReservaId) && s.estado !== 'realizada')
    .slice(0, 12);
  const ahora = `${hoy}T${horaEnZona(tenant.hours.timezone)}`;
  const estadoDeReservaDe = (s: (typeof misSesiones)[number]): EstadoDeReservaDeSesion => {
    const ventana = ventanaDeReserva(s, ajustes, ahora);
    return {
      sessionId: s.id,
      miReservaId: s.miReservaId,
      miReservaEstado: s.miReservaEstado,
      miPosicion: s.miPosicion,
      ventana: ventana.estado,
      abreTexto: `${fechaCorta(ventana.abre.slice(0, 10))} · ${ventana.abre.slice(11, 16)}`,
      prevision: resultadoDeReservar(s, ajustes),
      cancelacionTardia: s.miReservaEstado === 'reservada' && cancelacionSeriaTardia(s, 'reservada', ajustes, ahora),
      bloqueadoHasta: estadoDeReservas?.bloqueadoHasta ?? null,
      limiteAlcanzado: (estadoDeReservas?.activas ?? 0) >= ajustes.maxActive,
    };
  };
  // §15 · la situación de cada sesión se decide UNA vez, en el dominio, y la
  // pantalla solo la pinta. Antes había que mirar tres datos a la vez (estado
  // de la sesión, reserva propia y ocupación) en cada sitio que la mostraba.
  const filasDeAgenda: FilaDeAgendaDelSocio[] = misSesiones.map((s) => {
    const ocupacion = { estado: s.estado, miReservaEstado: s.miReservaEstado, ocupados: s.ocupados, capacity: s.capacity };
    const estado = estadoDeClaseDelSocio(ocupacion, {
      incluidaEnSuPlan: misClases.some((c) => c.id === s.classId),
      conReservas,
      ventana: ventanaDeReserva(s, ajustes, ahora).estado,
    });
    return {
      id: s.id,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      horaFin: horaDeFin(s.startTime, s.durationMinutes),
      nombre: s.title ?? s.className,
      sucursal: multisede ? s.branchName : null,
      instructor: s.trainerName,
      esEvento: s.kind === 'evento',
      motivoDeCancelacion: s.cancelReason,
      estado,
      ocupacion,
      ...(conReservas && s.estado !== 'cancelada' ? { accion: <BotonDeReserva slug={slug} e={estadoDeReservaDe(s)} /> } : {}),
    };
  });
  const inscripciones = filasDeAgenda.filter((f) => estaInscrito(f.estado));

  const proximasReservas = misReservas.filter((r) => (r.status === 'reservada' || r.status === 'en_espera') && r.estadoEfectivo !== 'no_asistio' && !r.sessionCancelled);
  const historialDeReservas = misReservas.filter((r) => !proximasReservas.includes(r)).reverse().slice(0, 8);

  const membresia =
    ficha?.membershipStatus && ficha.endDate && ficha.daysRemaining !== null
      ? { endDate: ficha.endDate, effectiveStatus: ficha.membershipStatus, daysRemaining: ficha.daysRemaining }
      : null;

  // V4.2 · Avisos de la revisión de sus comprobantes, junto a los de reservas y
  // en orden de llegada.
  const avisosDeComprobantes = features.enableNotifications && conPagos && customerId ? await (await receiptsRepository()).avisos() : [];
  const personales = [...avisosDeComprobantes, ...avisosDeReservas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // V4.2 · Con alta en línea, la cuenta sin ficha no «espera a recepción»: puede
  // pagar y subir su comprobante. El aviso de «falta vincular tu ficha» sobra.
  const altaEnLinea = conPagos && tenant.members?.onlineSignup === true;
  const notificaciones = features.enableNotifications ? construirNotificaciones(membresia, avisos, !customerId && !altaEnLinea, personales) : [];
  const racha = calcularRacha(dias, hoy, diasCerradosDelHorario(tenant.hours.week), 12);
  const horarioDeHoy = diaDelHorario(tenant.hours.week, hoy);
  const esteMes = dias.filter((dia) => dia.slice(0, 7) === hoy.slice(0, 7)).length;
  const ultimasEntradas = historial.slice(0, 8);
  const token = features.enableQrAttendance ? ficha?.checkinToken ?? null : null;
  const matriz = token ? matrizQr(token) : null;
  const planAPagar = planes.find((plan) => plan.code === codigoAPagar) ?? planes.find((plan) => plan.id === ficha?.planId);
  const pendientes = comprobantes.filter((c) => c.status === 'pendiente').length;
  const años = edad(ficha?.birthDate ?? null, hoy);

  // V4.2 · En qué punto del alta está. «Socio pendiente» es una LECTURA:
  // membresía aprobada + datos presenciales que el gimnasio exige y faltan.
  // El QR sigue la misma regla que la base usa para dejar entrar.
  const fichaSinPagoAprobado = customerId ? await (await receiptsRepository()).miFichaSinPagoAprobado() : false;
  const datosPendientes = ficha ? datosPresencialesPendientes(ficha, tenant.members?.inPersonFields ?? []) : [];
  const situacion = situacionDelSocio({
    tieneFicha: Boolean(customerId),
    fichaSinPagoAprobado,
    comprobantesPendientes: pendientes,
    tieneMembresia: Boolean(ficha?.membershipId),
    datosPendientes,
  });
  const conQr = Boolean(token && matriz) && qrHabilitado({ tieneFicha: Boolean(customerId), fichaSinPagoAprobado });
  const proximaClase = inscripciones[0] ?? null;

  if (!perfil.tenantSlug) {
    return (
      <section className="surface-card">
        <EmptyState icono="shield" titulo="Tu cuenta todavía no está asociada a un gimnasio" descripcion={`Acércate a recepción de ${name} para completarla.`} />
      </section>
    );
  }

  const formularioDePago =
    conPagos && (customerId || altaEnLinea) ? (
      <SubirComprobanteForm slug={slug} modo="socio" planes={planes} planSugerido={planAPagar?.id} />
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <NotificationsPanel slug={slug} notificaciones={notificaciones} />

      {codigoAPagar && formularioDePago && (
        <section className="surface-card border-action/40 p-6 sm:p-7" aria-labelledby="titulo-pago-directo">
          <h2 id="titulo-pago-directo" className="flex items-center gap-2 t-h3">
            <Icon name="upload" size={18} className="text-action" />
            Sube tu comprobante{planAPagar ? ` · ${planAPagar.name}` : ''}
          </h2>
          <p className="mt-1.5 text-[0.88rem] text-muted">
            Adjunta la captura del pago que hiciste con el QR. Recepción la verifica y tu plan se activa.
          </p>
          <div className="mt-6">{formularioDePago}</div>
        </section>
      )}

      {/* V4.2 · Llegó desde «Pagar con QR» con una cuenta que aún no es de socio
          (la ventana lo avisa, pero el enlace se puede abrir a mano). */}
      {codigoAPagar && conPagos && !customerId && !altaEnLinea && (
        <section className="surface-card border-action/40 p-6 sm:p-7" aria-labelledby="titulo-pago-sin-ficha">
          <h2 id="titulo-pago-sin-ficha" className="flex items-center gap-2 t-h3">
            <Icon name="idcard" size={18} className="text-action" />
            {AVISO_DE_CUENTA_PARA_COMPROBANTE['sin-ficha'].titulo}
          </h2>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">{AVISO_DE_CUENTA_PARA_COMPROBANTE['sin-ficha'].cuerpo}</p>
        </section>
      )}

      {!customerId ? (
        altaEnLinea ? (
          // V4.2 · Alta en línea: la cadena entera, a la vista, en el orden en
          // que ocurre. Nada se habilita al subir la captura: se habilita al
          // aprobarla.
          !codigoAPagar && (
            <section className="surface-card p-6 sm:p-8" aria-labelledby="titulo-alta-en-linea">
              <p className="text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-action">Hazte socio en línea</p>
              <h2 id="titulo-alta-en-linea" className="mt-2 t-h2">Elige tu plan y súbenos tu comprobante</h2>
              <ol className="mt-6 grid gap-3 md:grid-cols-4">
                {[
                  ['1', 'Elige tu plan', 'y págalo con el QR del gimnasio.'],
                  ['2', 'Sube la captura', 'del comprobante aquí mismo.'],
                  ['3', 'Recepción lo aprueba', 'y se activan tu membresía y tu QR.'],
                  ['4', 'En tu primera visita', 'recepción completa tu ficha con tus datos.'],
                ].map(([n, titulo, texto]) => (
                  <li key={n} className="flex gap-3 rounded-[var(--t-radius-md)] bg-raised p-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-action text-[0.8rem] font-bold text-on-action">{n}</span>
                    <span className="text-[0.88rem] leading-snug text-ink">
                      <strong className="block font-semibold">{titulo}</strong>
                      <span className="text-muted">{texto}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {formularioDePago && <div className="mt-7 border-t border-line pt-7">{formularioDePago}</div>}
            </section>
          )
        ) : (
          <section className="surface-card">
            <EmptyState
              icono="idcard"
              titulo="Falta vincular tu ficha de socio"
              descripcion="Tu cuenta está creada. Cuando recepción te registre con este mismo correo, aquí verás tu plan, tu QR y tu racha."
            />
          </section>
        )
      ) : (
        <>
          {/*
            V4.2 · PRIMERA VISTA: LA TARJETA DE SOCIO.
            Lo que se busca en el mostrador y al llegar, en este orden: el QR de
            entrada, quién es (foto y nombre), el estado de su membresía y sus
            días, su racha, su próxima clase y las acciones. En un teléfono el QR
            va arriba y a tamaño de lectura; en escritorio, a la izquierda.
          */}
          <section className="surface-card overflow-hidden" aria-labelledby="titulo-tarjeta-de-socio">
            <h2 id="titulo-tarjeta-de-socio" className="sr-only">Tu tarjeta de socio</h2>
            <div className="grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-3 border-b border-line bg-raised/50 p-6 text-center sm:p-7 md:border-b-0 md:border-e">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted">Tu QR de entrada</p>
                {conQr && matriz && token ? (
                  <>
                    <div className="w-full max-w-[17rem] rounded-[var(--t-radius-md)] bg-white p-3">
                      <QrCode matriz={matriz} descripcion="Código QR personal para registrar tu entrada al gimnasio" className="max-w-none" />
                    </div>
                    <p className="break-all font-mono text-[0.74rem] tracking-[0.12em] text-muted">{token.match(/.{1,6}/g)?.join(' ')}</p>
                    {/* Mismo QR a pantalla casi completa: en el mostrador, con el
                        brillo bajo o el teléfono lejos, uno pequeño no se lee. */}
                    <Modal
                      titulo="Tu QR de entrada"
                      descripcion="Súbele el brillo a la pantalla si el lector no lo capta."
                      anchoMaximo="md"
                      disparador={
                        <Button variant="primary" size="md" icon="qr" iconPosition="start" fullWidth>
                          Mostrar en grande
                        </Button>
                      }
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-full max-w-[26rem] rounded-[var(--t-radius-md)] bg-white p-4">
                          <QrCode matriz={matriz} descripcion="Tu QR personal de entrada al gimnasio" className="max-w-none" />
                        </div>
                        <p className="font-mono text-[0.9rem] tracking-[0.14em] text-muted">{token.match(/.{1,6}/g)?.join(' ')}</p>
                      </div>
                    </Modal>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
                    <span className="grid h-16 w-16 place-items-center rounded-full border border-line text-muted">
                      <Icon name="lock" size={24} />
                    </span>
                    <p className="font-semibold text-ink">
                      {situacion === 'pago-en-revision' ? 'Se activa al aprobar tu pago' : 'Todavía no tienes QR'}
                    </p>
                    <p className="max-w-[22ch] text-[0.84rem] text-muted">
                      {situacion === 'pago-en-revision'
                        ? 'Recepción está revisando tu comprobante. Te avisamos aquí apenas lo apruebe.'
                        : fichaSinPagoAprobado
                          ? 'Paga tu plan y sube el comprobante: al aprobarlo se activa.'
                          : 'Pídelo en recepción y quedará disponible aquí.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-5 p-6 sm:p-7">
                <div className="flex items-center gap-4">
                  {miFoto.url ? (
                    <img src={miFoto.url} alt="" className="h-16 w-16 shrink-0 rounded-[var(--t-radius-lg)] border border-line object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--t-radius-lg)] border border-line bg-raised text-[1.3rem] font-bold text-muted">
                      {(perfil.fullName.trim()[0] ?? '?').toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[1.15rem] font-semibold text-ink">{ficha?.fullName ?? perfil.fullName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone={TONO_DE_SITUACION[situacion]}>{NOMBRE_DE_SITUACION[situacion]}</Badge>
                      {ficha?.code && <span className="font-mono text-[0.78rem] text-muted">{ficha.code}</span>}
                    </div>
                  </div>
                </div>

                {situacion === 'pendiente' && (
                  <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 px-4 py-3 text-[0.86rem] leading-relaxed text-ink">
                    <Icon name="idcard" size={17} className="mt-0.5 shrink-0 text-action" />
                    <span>
                      Tu membresía y tu QR ya funcionan. En tu próxima visita, recepción completará tu ficha con tu{' '}
                      {listaDeCampos(datosPendientes)}: lleva tu documento.
                    </span>
                  </p>
                )}

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-[var(--t-radius-md)] bg-raised px-4 py-3">
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">{ficha?.planName ?? 'Membresía'}</dt>
                    <dd className="mt-1">
                      <span className="text-[1.9rem] font-bold leading-none text-ink">
                        {ficha?.daysRemaining !== null && ficha?.daysRemaining !== undefined ? Math.max(ficha.daysRemaining, 0) : '—'}
                      </span>
                      <span className="mt-1 block text-[0.76rem] text-muted">
                        {ficha?.endDate ? `días · vence ${fechaCorta(ficha.endDate)}` : 'sin membresía activa'}
                      </span>
                    </dd>
                  </div>
                  <div className="rounded-[var(--t-radius-md)] bg-raised px-4 py-3">
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">Racha</dt>
                    <dd className="mt-1">
                      <span className="text-[1.9rem] font-bold leading-none text-ink">{racha.actual}</span>
                      <span className="mt-1 block text-[0.76rem] text-muted">
                        {racha.actual === 1 ? 'día' : 'días'} · mejor {racha.mejor} · {esteMes} este mes
                      </span>
                    </dd>
                  </div>
                  <div className="col-span-2 rounded-[var(--t-radius-md)] bg-raised px-4 py-3 sm:col-span-1">
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">Próxima clase</dt>
                    <dd className="mt-1">
                      {proximaClase ? (
                        <>
                          <span className="block truncate text-[1.05rem] font-semibold text-ink">{proximaClase.nombre}</span>
                          <span className="mt-1 block text-[0.76rem] text-muted">
                            {fechaCorta(proximaClase.sessionDate)} · {proximaClase.startTime}
                            {inscripciones.length > 1 ? ` · +${inscripciones.length - 1} más` : ''}
                          </span>
                        </>
                      ) : (
                        <span className="mt-1 block text-[0.84rem] text-muted">{conClases ? 'No estás inscrito en ninguna' : 'Sin clases en tu plan'}</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  {formularioDePago && (
                    <Modal
                      titulo="Pagar mi mensualidad"
                      descripcion="Paga con el QR del gimnasio y sube la captura del comprobante."
                      anchoMaximo="lg"
                      montarSoloAbierto
                      disparador={
                        <Button variant="primary" size="md" icon="upload" iconPosition="start" fullWidth>
                          {ficha?.membershipId ? 'Renovar / subir comprobante' : 'Pagar mi plan'}
                        </Button>
                      }
                    >
                      <SubirComprobanteForm slug={slug} modo="socio" planes={planes} planSugerido={planAPagar?.id} />
                    </Modal>
                  )}
                  {conClases && (
                    <LinkButton href="#mis-clases" variant="secondary" size="md" icon="calendar" iconPosition="start">
                      {conReservas ? 'Reservar clase' : 'Mis clases'}
                    </LinkButton>
                  )}
                  <Modal
                    titulo="Tu racha"
                    descripcion="Los días que el gimnasio cierra no la cortan."
                    anchoMaximo="md"
                    disparador={
                      <Button variant="ghost" size="md" icon="fire" iconPosition="start">
                        Ver mi constancia
                      </Button>
                    }
                  >
                    <RachaCalendario racha={racha} />
                  </Modal>
                  {/* La foto se habilita con el pago aprobado, igual que el QR:
                      es lo que recepción compara al escanear. */}
                  {conQr && (
                    <Modal
                      titulo="Tu foto de perfil"
                      descripcion="Recepción la ve al escanear tu QR."
                      anchoMaximo="md"
                      disparador={
                        <Button variant="ghost" size="md" icon="user" iconPosition="start">
                          {miFoto.url ? 'Cambiar foto' : 'Subir foto'}
                        </Button>
                      }
                    >
                      <FotoDePerfilForm slug={slug} nombre={perfil.fullName} fotoUrl={miFoto.url} />
                    </Modal>
                  )}
                </div>
              </div>
            </div>
          </section>

            <section id="mi-membresia" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-membresia">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-muted">Tu membresía</p>
                  <h2 id="titulo-membresia" className="mt-1 t-h3">{ficha?.planName ?? 'Sin plan activo'}</h2>
                </div>
                {ficha?.membershipStatus && (
                  <Badge tone={ficha.membershipStatus === 'active' ? 'action' : ficha.membershipStatus === 'expiring_soon' ? 'structural' : 'neutral'}>
                    {NOMBRE_DE_ESTADO_DE_MEMBRESIA[ficha.membershipStatus]}
                  </Badge>
                )}
              </div>

              {ficha?.startDate && ficha.endDate && (
                <>
                  <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
                    <div>
                      <Dato etiqueta="Inicio" valor={fechaCorta(ficha.startDate)} />
                      <Dato etiqueta="Vence" valor={fechaCorta(ficha.endDate)} />
                    </div>
                    <div>
                      <Dato etiqueta="Precio" valor={ficha.membershipPrice !== null ? importe(ficha.membershipPrice) : null} />
                      <Dato etiqueta="Días restantes" valor={String(Math.max(ficha.daysRemaining ?? 0, 0))} />
                    </div>
                  </dl>
                  {(() => {
                    const total = Math.max(1, Math.round((Date.parse(`${ficha.endDate}T12:00:00Z`) - Date.parse(`${ficha.startDate}T12:00:00Z`)) / 86_400_000));
                    const progreso = Math.max(0, Math.min(100, Math.round(((ficha.daysRemaining ?? 0) / total) * 100)));
                    return (
                      <div
                        className="mt-5 h-2.5 overflow-hidden rounded-full bg-raised"
                        role="progressbar"
                        aria-valuenow={progreso}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Vigencia restante de tu membresía"
                      >
                        <div className="h-full rounded-full bg-action transition-[width] duration-500" style={{ width: `${progreso}%` }} />
                      </div>
                    );
                  })()}
                </>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href={tenantHref(slug, 'planes')} variant="secondary" size="md">
                  Ver paquetes
                </LinkButton>
              </div>

              {conPagos && comprobantes.length > 0 && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    <Icon name="receipt" size={15} className="text-action" />
                    Mis comprobantes {pendientes > 0 ? `· ${pendientes} en revisión` : ''}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {comprobantes.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--t-radius-md)] bg-raised px-4 py-2.5 text-[0.86rem]">
                        <a href={`/${slug}/panel/comprobantes/${c.id}/imagen`} target="_blank" rel="noopener noreferrer" className="text-ink underline-offset-4 hover:text-action hover:underline">
                          {fechaCorta(c.receiptDate)} · {importe(c.amount, c.currency)} · {c.planName ?? 'sin plan'}
                        </a>
                        <span className={c.status === 'aprobado' ? 'text-action' : c.status === 'rechazado' ? 'text-structural' : 'text-muted'}>
                          {NOMBRE_DE_ESTADO_DE_COMPROBANTE[c.status]}
                          {c.status === 'rechazado' && c.reviewNote ? ` · ${c.reviewNote}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

          {/* §6 · «Horarios» está en la lista de lo que el socio necesita a
              diario, justo después de su membresía y su QR. Se enseña la semana
              entera con HOY destacado: saber a qué hora cierran hoy es la
              pregunta real; el resto de la semana es para planificar. */}
          {tenant.hours.week.length > 0 && (
            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-horario-socio">
              <h2 id="titulo-horario-socio" className="flex items-center gap-2 t-h3">
                <Icon name="clock" size={18} className="text-action" />
                Horario del gimnasio
              </h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">
                {horarioDeHoy === null
                  ? 'Consulta en recepción el horario de hoy.'
                  : horarioDeHoy.closed
                    ? `Hoy (${horarioDeHoy.day.toLowerCase()}) el gimnasio no abre. Los días cerrados no cortan tu racha.`
                    : `Hoy (${horarioDeHoy.day.toLowerCase()}) abrimos de ${horarioDeHoy.open} a ${horarioDeHoy.close}.`}
              </p>
              <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
                {tenant.hours.week.map((dia) => {
                  const esHoy = horarioDeHoy !== null && dia.day === horarioDeHoy.day;
                  return (
                    <li
                      key={dia.day}
                      className={
                        esHoy
                          ? 'flex flex-wrap items-center justify-between gap-2 rounded-[var(--t-radius-md)] border border-action/50 bg-action/8 px-3 py-2 text-[0.86rem] text-ink'
                          : 'flex flex-wrap items-center justify-between gap-2 rounded-[var(--t-radius-md)] px-3 py-2 text-[0.86rem] text-muted'
                      }
                    >
                      <span className={esHoy ? 'font-semibold text-ink' : ''}>{dia.day}</span>
                      <span>{dia.closed ? 'Cerrado' : `${dia.open} – ${dia.close}`}</span>
                    </li>
                  );
                })}
              </ul>
              {tenant.hours.holidayNote && <p className="mt-4 text-[0.8rem] text-muted">{tenant.hours.holidayNote}</p>}
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-constancia">
              <h2 id="titulo-constancia" className="mb-5 flex items-center gap-2 t-h3">
                <Icon name="fire" size={18} className="text-action" />
                Tu constancia
              </h2>
              <RachaCalendario racha={racha} />
            </section>

            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-datos">
              <h2 id="titulo-datos" className="flex items-center gap-2 t-h3">
                <Icon name="idcard" size={18} className="text-action" />
                Información personal
              </h2>
              <dl className="mt-4">
                <Dato etiqueta="Nombre" valor={ficha?.fullName ?? perfil.fullName} />
                <Dato etiqueta="Código de socio" valor={ficha?.code} />
                <Dato etiqueta="Documento" valor={ficha?.documentId} />
                <Dato etiqueta="Teléfono" valor={ficha?.phone} />
                <Dato etiqueta="Correo de la ficha" valor={ficha?.email} />
                <Dato etiqueta="Nacimiento" valor={ficha?.birthDate ? `${fechaCorta(ficha.birthDate)} ${ficha.birthDate.slice(0, 4)}${años !== null ? ` · ${años} años` : ''}` : null} />
                <Dato etiqueta="Socio desde" valor={ficha ? `${fechaCorta(ficha.createdAt.slice(0, 10))} ${ficha.createdAt.slice(0, 4)}` : null} />
                <Dato etiqueta="Cuenta de acceso" valor={perfil.email} />
                <Dato etiqueta="Gimnasio" valor={perfil.tenantName ?? name} />
              </dl>
              <p className="mt-4 text-[0.78rem] text-muted">¿Algún dato está mal? Pide en recepción que lo corrijan: tu ficha la gestiona el gimnasio.</p>
            </section>
          </div>

          {rutinas.length > 0 && (
            <section id="mi-rutina" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-mi-rutina">
              <h2 id="titulo-mi-rutina" className="t-h3">Tu rutina</h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">
                La armó tu entrenador. Marca cada ejercicio al terminarlo: así queda tu progreso y él ve cómo vas.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {rutinas.map((rutina) => (
                  <li key={rutina.id}>
                    <Link
                      href={`${tenantHref(slug, 'panel/rutinas/asignada')}/${rutina.id}`}
                      className="flex h-full flex-col gap-1.5 rounded-[var(--t-radius-md)] border border-line p-4 transition-colors hover:border-action"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">{tituloDeRutina(rutina)}</span>
                        <Icon name="arrowRight" size={16} className="text-action" />
                      </span>
                      <span className="text-[0.82rem] text-muted">
                        {rutina.ejercicios} ejercicios{rutina.programName ? ` · ${rutina.programName}` : ''}
                      </span>
                      <span className="text-[0.78rem] text-muted">
                        {rutina.completados7d} marcados esta semana
                        {rutina.ultimoRegistro ? ` · último: ${fechaCorta(rutina.ultimoRegistro)}` : ' · todavía sin registros'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {conClases && clasesDelGimnasio.some((c) => c.isActive) && (
            <section id="mis-clases" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-mis-clases">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 id="titulo-mis-clases" className="t-h3">Tus clases</h2>
                {conReservas && (
                  <Modal
                    titulo="Cómo funcionan las reservas"
                    anchoMaximo="md"
                    disparador={
                      <Button variant="ghost" size="sm" icon="eye" iconPosition="start">
                        Reglas de reserva
                      </Button>
                    }
                  >
                    <ul className="flex list-disc flex-col gap-2 ps-5 text-[0.9rem] leading-relaxed text-ink">
                      {describirAjustes(ajustes).map((linea) => (
                        <li key={linea}>{linea}</li>
                      ))}
                    </ul>
                  </Modal>
                )}
              </div>
              <p className="mt-1.5 text-[0.86rem] text-muted">
                {misClases.length > 0
                  ? conReservas
                    ? `Tu plan incluye ${misClases.map((c) => c.name).join(', ')}. Reserva tu lugar: el cupo es limitado y quien reservó tiene prioridad.`
                    : `Tu plan incluye ${misClases.map((c) => c.name).join(', ')}. Llega unos minutos antes: el cupo es limitado y el instructor o recepción registra tu asistencia.`
                  : 'Tu plan actual no incluye clases grupales.'}
              </p>

              {estadoDeReservas?.bloqueadoHasta && (
                <p className="mt-4 flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 px-4 py-3 text-[0.88rem] text-ink">
                  <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-structural" />
                  No puedes reservar hasta el {fechaCorta(estadoDeReservas.bloqueadoHasta)} por faltas recientes. Si hubo un motivo, habla con recepción.
                </p>
              )}

              {inscripciones.length > 0 && (
                <p className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--t-radius-md)] border border-action/40 bg-action/8 px-4 py-3 text-[0.88rem] text-ink">
                  <Icon name="check" size={16} className="text-action" />
                  <span>
                    Estás anotado en <strong>{inscripciones.length}</strong>{' '}
                    {inscripciones.length === 1 ? 'clase' : 'clases'}:{' '}
                    {inscripciones.map((f) => `${f.nombre} (${f.startTime})`).join(' · ')}
                  </span>
                </p>
              )}

              {filasDeAgenda.length > 0 ? (
                <MiAgendaDeClases className="mt-5" filas={filasDeAgenda} hoy={hoy} mostrarSede={multisede} />
              ) : (
                misClases.length > 0 && <EmptyState className="mt-5" icono="calendar" titulo={`No hay sesiones de tus clases en los próximos ${diasVisibles} días`} />
              )}

              {conReservas && (proximasReservas.length > 0 || historialDeReservas.length > 0) && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    Tus reservas · {estadoDeReservas?.activas ?? proximasReservas.length} de {ajustes.maxActive} activas
                  </p>
                  <ul className="flex flex-col gap-2">
                    {[...proximasReservas, ...historialDeReservas].map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--t-radius-md)] bg-raised px-4 py-2.5 text-[0.86rem]">
                        <span className="text-ink">
                          {r.className} · {fechaCorta(r.sessionDate)} {r.startTime}
                          {multisede ? ` · ${r.branchName}` : ''}
                        </span>
                        <span
                          className={
                            r.estadoEfectivo === 'no_asistio' || r.lateCancel
                              ? 'text-structural'
                              : r.estadoEfectivo === 'asistio' || r.estadoEfectivo === 'reservada'
                                ? 'text-action'
                                : 'text-muted'
                          }
                        >
                          {r.estadoEfectivo === 'en_espera'
                            ? textoDePosicion(r.posicion)
                            : r.cancelledByGym
                              ? 'Cancelada por el gimnasio'
                              : r.lateCancel
                                ? 'Cancelación tardía'
                                : NOMBRE_DE_ESTADO_DE_RESERVA[r.estadoEfectivo]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {otrasClases.length > 0 && (
                <p className="mt-5 flex flex-wrap items-center gap-2 text-[0.84rem] text-muted">
                  <Icon name="sparkle" size={15} className="text-action" />
                  {misClases.length > 0 ? 'Con otro paquete también tienes' : 'Con otro paquete puedes tomar'}: {otrasClases.map((c) => c.name).join(', ')}.
                  {features.showPlans && (
                    <Link href={tenantHref(slug, 'planes')} className="font-semibold text-action underline-offset-4 hover:underline">
                      Ver paquetes
                    </Link>
                  )}
                </p>
              )}

              {clasesTomadas.length > 0 && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted">Tus últimas clases</p>
                  <ul className="flex flex-wrap gap-2">
                    {clasesTomadas.map((c) => (
                      <li key={c.id} className="rounded-[var(--t-radius-md)] bg-raised px-3 py-2 text-[0.84rem] text-ink">
                        {c.className} · {fechaCorta(c.sessionDate)} {c.startTime}
                        {multisede ? ` · ${c.branchName}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section id="mis-entradas" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-historial">
              <h2 id="titulo-historial" className="t-h3">Tus últimas entradas</h2>
              {multisede && (
                <p className="mt-1.5 text-[0.84rem] text-muted">Tu membresía vale en todas las sedes de {perfil.tenantName ?? name}.</p>
              )}
              <DataTable
                titulo="Historial de tus entradas al gimnasio"
                className="mt-5"
                columnas={[
                  { clave: 'fecha', titulo: 'Fecha', celda: (fila) => fechaCorta(fila.attendanceDate) },
                  { clave: 'hora', titulo: 'Hora', celda: (fila) => hora(fila.checkedInAt) },
                  multisede
                    ? { clave: 'sucursal', titulo: 'Sucursal', celda: (fila) => fila.branchName ?? ETIQUETA_SIN_SUCURSAL }
                    : { clave: 'metodo', titulo: 'Método', celda: (fila) => NOMBRE_DE_METODO[fila.method] },
                ]}
                filas={ultimasEntradas}
                claveDeFila={(fila) => fila.id}
                vacio={<EmptyState icono="calendar" titulo="Aún no hay entradas registradas" descripcion="En cuanto registres tu primera entrada con el QR, aparecerá aquí." />}
              />
            </section>

            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-pagos">
              <h2 id="titulo-pagos" className="t-h3">Tus pagos</h2>
              <DataTable
                titulo="Tus pagos registrados"
                className="mt-5"
                columnas={[
                  { clave: 'fecha', titulo: 'Fecha', celda: (p) => fechaCorta(p.paidDate) },
                  { clave: 'plan', titulo: 'Plan', celda: (p) => p.planName ?? '—' },
                  { clave: 'metodo', titulo: 'Método', secundaria: true, celda: (p) => NOMBRE_DE_METODO_DE_PAGO[p.method] },
                  { clave: 'importe', titulo: 'Importe', numerica: true, celda: (p) => importe(p.amount, p.currency) },
                ]}
                filas={pagos.slice(0, 8)}
                claveDeFila={(p) => p.id}
                vacio={<EmptyState icono="wallet" titulo="Sin pagos registrados" />}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
