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
import { NOMBRE_DE_METODO } from '@core/domain/operations/attendance';
import { calcularRacha, diasCerradosDelHorario } from '@core/domain/operations/streak';
import { ETIQUETA_SIN_SUCURSAL, repartoPorSucursal } from '@core/domain/operations/branches';
import { edad, NOMBRE_DE_ESTADO_DE_MEMBRESIA, NOMBRE_DE_METODO_DE_PAGO } from '@core/domain/operations/members';
import { NOMBRE_DE_ESTADO_DE_COMPROBANTE } from '@core/domain/operations/receipts';
import { clasesDelPlan, sumarDias } from '@core/domain/operations/classes';
import { classesRepository, membersRepository, receiptsRepository, trainingRepository } from '@infra/config/composition-root';
import { FilaDeSesion } from '@/presentation/patterns/AgendaDeClases';
import { matrizQr } from '@infra/operations/qr';
import { NotificationsPanel } from '@/presentation/patterns/NotificationsPanel';
import { RachaCalendario } from '@/presentation/patterns/RachaCalendario';
import { SubirComprobanteForm } from '@/presentation/patterns/ComprobanteForms';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { QrCode } from '@/presentation/ui/QrCode';
import { StatCard } from '@/presentation/ui/StatCard';
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

  const [avisos, ficha, dias, historial, planes, pagos, comprobantes] = await Promise.all([
    repo.avisos(),
    customerId ? socios.ficha(customerId) : Promise.resolve(null),
    customerId ? socios.diasDeAsistencia(customerId, 365) : Promise.resolve([] as readonly string[]),
    // RLS ya reduce la bitácora a las entradas del propio socio. Con varias
    // sedes se trae el mes entero para contar dónde entrenó; si no, bastan 8.
    repo.historialDeAsistencia(multisede ? { desde: `${hoy.slice(0, 7)}-01`, limite: 62 } : { limite: 8 }),
    conPagos ? socios.planesVendibles() : Promise.resolve([]),
    customerId ? socios.pagos(customerId) : Promise.resolve([]),
    conPagos && customerId ? (await receiptsRepository()).listar({ customerId, limite: 10 }) : Promise.resolve([]),
  ]);

  // V3.2: sus rutinas vigentes. RLS solo devuelve las del propio socio.
  const rutinas =
    features.enableRoutines === true && customerId
      ? await (await trainingRepository()).asignaciones({ customerId, vigentes: true })
      : [];

  // V3.3: las clases que incluye su plan y las que tomó. El calendario lo ve
  // cualquier cuenta del gimnasio; la asistencia, RLS la reduce a la propia.
  const conClases = features.enableClasses === true && Boolean(customerId);
  const clasesRepo = conClases ? await classesRepository() : null;
  const [clasesDelGimnasio, sesionesDeLaSemana, clasesTomadas] = clasesRepo
    ? await Promise.all([
        clasesRepo.clases(),
        clasesRepo.sesiones({ desde: hoy, hasta: sumarDias(hoy, 6), soloProgramadas: true }),
        clasesRepo.clasesAsistidas(customerId ?? '', 6),
      ])
    : [[], [], []];
  // Orientativo: la base vuelve a mirar la membresía que cubre el DÍA de cada sesión al registrar.
  const planVigente =
    ficha?.planId && (ficha.membershipStatus === 'active' || ficha.membershipStatus === 'expiring_soon') ? ficha.planId : null;
  const misClases = clasesDelPlan(clasesDelGimnasio, planVigente);
  const otrasClases = clasesDelGimnasio.filter((c) => c.isActive && !misClases.some((m) => m.id === c.id));
  const misSesiones = sesionesDeLaSemana.filter((s) => misClases.some((c) => c.id === s.classId) && s.estado !== 'realizada').slice(0, 8);

  const membresia =
    ficha?.membershipStatus && ficha.endDate && ficha.daysRemaining !== null
      ? { endDate: ficha.endDate, effectiveStatus: ficha.membershipStatus, daysRemaining: ficha.daysRemaining }
      : null;

  const notificaciones = features.enableNotifications ? construirNotificaciones(membresia, avisos, !customerId) : [];
  const racha = calcularRacha(dias, hoy, diasCerradosDelHorario(tenant.hours.week), 12);
  const esteMes = dias.filter((dia) => dia.slice(0, 7) === hoy.slice(0, 7)).length;
  // La racha y el conteo salen de las FECHAS, sin mirar la sede: ir a una sede un
  // día y a otra al siguiente son dos días seguidos.
  const sedesDelMes = multisede ? repartoPorSucursal(historial.filter((r) => r.attendanceDate.slice(0, 7) === hoy.slice(0, 7))) : [];
  const ultimasEntradas = historial.slice(0, 8);
  const token = features.enableQrAttendance ? ficha?.checkinToken ?? null : null;
  const matriz = token ? matrizQr(token) : null;
  const planAPagar = planes.find((plan) => plan.code === codigoAPagar) ?? planes.find((plan) => plan.id === ficha?.planId);
  const pendientes = comprobantes.filter((c) => c.status === 'pendiente').length;
  const años = edad(ficha?.birthDate ?? null, hoy);

  if (!perfil.tenantSlug) {
    return (
      <section className="surface-card">
        <EmptyState icono="shield" titulo="Tu cuenta todavía no está asociada a un gimnasio" descripcion={`Acércate a recepción de ${name} para completarla.`} />
      </section>
    );
  }

  const formularioDePago =
    conPagos && customerId ? (
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

      {!customerId ? (
        <section className="surface-card">
          <EmptyState
            icono="idcard"
            titulo="Falta vincular tu ficha de socio"
            descripcion="Tu cuenta está creada. Cuando recepción te registre con este mismo correo, aquí verás tu plan, tu QR y tu racha."
          />
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              href="#mi-membresia"
              etiqueta={ficha?.planName ?? 'Membresía'}
              valor={ficha?.daysRemaining !== null && ficha?.daysRemaining !== undefined ? String(Math.max(ficha.daysRemaining, 0)) : '—'}
              icono="shield"
              tono={ficha?.membershipStatus === 'active' ? 'accion' : ficha?.membershipStatus ? 'alerta' : 'neutro'}
              comparacion={ficha?.endDate ? `días restantes · vence ${fechaCorta(ficha.endDate)}` : 'sin membresía registrada'}
              accion="Ver mi plan"
            />
            <StatCard
              href="#mis-entradas"
              etiqueta="Este mes"
              valor={String(esteMes)}
              icono="calendar"
              comparacion={
                sedesDelMes.length > 1 || (sedesDelMes.length === 1 && sedesDelMes[0]?.branchId !== null)
                  ? sedesDelMes.map((s) => `${s.branchId ? s.nombre : 'sin sede'}: ${s.visitas}`).join(' · ')
                  : esteMes === 1
                    ? 'visita registrada'
                    : 'visitas registradas'
              }
              accion="Ver mis entradas"
            />
            <Modal
              titulo="Tu racha"
              descripcion="Los días que el gimnasio cierra no la cortan."
              anchoMaximo="md"
              disparador={
                <StatCard boton etiqueta="Racha" valor={`${racha.actual}`} icono="fire" tono={racha.actual >= 3 ? 'accion' : 'neutro'} comparacion={`mejor racha: ${racha.mejor} días`} accion="Ver calendario" />
              }
            >
              <RachaCalendario racha={racha} />
            </Modal>
            {token && matriz ? (
              <Modal
                titulo="Tu QR de entrada"
                descripcion="Enséñalo en recepción."
                anchoMaximo="md"
                disparador={<StatCard boton etiqueta="QR de entrada" valor="Mostrar" icono="qr" tono="accion" comparacion="ábrelo grande en el mostrador" accion="Abrir QR" />}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full max-w-[26rem] rounded-[var(--t-radius-md)] bg-white p-4">
                    <QrCode matriz={matriz} descripcion="Tu QR personal de entrada al gimnasio" className="max-w-none" />
                  </div>
                  <p className="font-mono text-[0.9rem] tracking-[0.14em] text-muted">{token.match(/.{1,6}/g)?.join(' ')}</p>
                </div>
              </Modal>
            ) : (
              <StatCard href="#mis-entradas" etiqueta="Últimos 12 meses" valor={String(dias.length)} icono="dumbbell" comparacion="entradas registradas" />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
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
                {formularioDePago && (
                  <Modal
                    titulo="Pagar mi mensualidad"
                    descripcion="Paga con el QR del gimnasio y sube la captura del comprobante."
                    anchoMaximo="lg"
                    montarSoloAbierto
                    disparador={
                      <Button variant="primary" size="md" icon="upload" iconPosition="start" glow>
                        {ficha?.membershipId ? 'Renovar / subir comprobante' : 'Pagar mi plan'}
                      </Button>
                    }
                  >
                    {/* El QR del plan elegido lo enseña el propio formulario. */}
                    <SubirComprobanteForm slug={slug} modo="socio" planes={planes} planSugerido={planAPagar?.id} />
                  </Modal>
                )}
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

            <section className="surface-card flex flex-col items-center gap-3 p-6 text-center sm:p-7" aria-labelledby="titulo-qr">
              <h2 id="titulo-qr" className="t-h3">Tu QR de entrada</h2>
              {matriz && token ? (
                <>
                  <p className="text-[0.84rem] text-muted">Enséñalo en recepción para registrar tu entrada.</p>
                  <div className="rounded-[var(--t-radius-md)] bg-white p-3">
                    <QrCode matriz={matriz} descripcion="Código QR personal para registrar tu entrada al gimnasio" className="max-w-[13rem]" />
                  </div>
                  <p className="break-all font-mono text-[0.72rem] tracking-[0.12em] text-muted">{token.match(/.{1,6}/g)?.join(' ')}</p>
                  {/* Mismo QR, a pantalla casi completa: en el mostrador, con el
                      brillo bajo o el teléfono lejos, un QR pequeño no se lee. */}
                  <Modal
                    titulo="Tu QR de entrada"
                    descripcion="Súbele el brillo a la pantalla si el lector no lo capta."
                    anchoMaximo="md"
                    disparador={
                      <Button variant="primary" size="md" icon="qr" iconPosition="start" fullWidth>
                        Mostrar QR
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
                  <p className="flex items-start gap-2 text-start text-[0.76rem] text-muted">
                    <Icon name="lock" size={14} className="mt-0.5 shrink-0 text-action" />
                    <span>Solo sirve para marcar tu asistencia. No lleva tus datos ni da acceso a tu cuenta.</span>
                  </p>
                </>
              ) : (
                <EmptyState icono="lock" titulo="Todavía no tienes QR" descripcion="Pídelo en recepción y quedará disponible aquí." />
              )}
            </section>
          </div>

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
                        <span className="font-semibold text-ink">
                          {rutina.dayLabel ? `${rutina.dayLabel} · ` : ''}
                          {rutina.name}
                        </span>
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
              <h2 id="titulo-mis-clases" className="t-h3">Tus clases</h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">
                {misClases.length > 0
                  ? `Tu plan incluye ${misClases.map((c) => c.name).join(', ')}. Llega unos minutos antes: el cupo es limitado y el instructor o recepción registra tu asistencia.`
                  : 'Tu plan actual no incluye clases grupales.'}
              </p>

              {misSesiones.length > 0 ? (
                <ul className="mt-5 flex flex-col gap-2">
                  {misSesiones.map((s) => (
                    <li key={s.id}>
                      <FilaDeSesion sesion={s} mostrarFecha mostrarSede={multisede} destacada={s.estado === 'en_curso'} />
                    </li>
                  ))}
                </ul>
              ) : (
                misClases.length > 0 && <EmptyState className="mt-5" icono="calendar" titulo="No hay sesiones de tus clases en los próximos 7 días" />
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
