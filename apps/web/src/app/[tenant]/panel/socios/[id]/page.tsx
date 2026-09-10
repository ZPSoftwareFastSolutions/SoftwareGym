/**
 * CAPA: Presentation / App — ficha completa de un socio.
 *
 * Todo lo del socio en una página: datos, QR, membresía, pagos, comprobantes y
 * constancia. Lo que cada quien puede HACER sale de sus permisos: recepción
 * vende membresías y adjunta comprobantes; gerencia además edita, renueva el
 * QR, corrige membresías, archiva y desvincula cuentas.
 *
 * Esconder un botón aquí no protege nada —la base rechaza la escritura—, pero
 * enseñar a recepción un «Editar» que luego falla sería mentirle.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import {
  edad,
  NOMBRE_DE_ESTADO_DE_MEMBRESIA,
  NOMBRE_DE_METODO_DE_PAGO,
} from '@core/domain/operations/members';
import { NOMBRE_DE_ESTADO_DE_COMPROBANTE, NOMBRE_DE_ORIGEN } from '@core/domain/operations/receipts';
import { calcularRacha, diasCerradosDelHorario } from '@core/domain/operations/streak';
import { membersRepository, receiptsRepository } from '@infra/config/composition-root';
import { matrizQr } from '@infra/operations/qr';
import {
  archivarSocio,
  desvincularCuentaDeSocio,
  restaurarSocio,
  rotarQrDeSocio,
} from '../actions';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { SubirComprobanteForm } from '@/presentation/patterns/ComprobanteForms';
import { RachaCalendario } from '@/presentation/patterns/RachaCalendario';
import { EditarMembresiaForm, EditarSocioForm, VenderMembresiaForm } from '@/presentation/patterns/SocioForms';
import { PrintButton } from '@/presentation/patterns/PrintButton';
import { DataTable } from '@/presentation/ui/DataTable';
import { Modal } from '@/presentation/ui/Modal';
import { QrCode } from '@/presentation/ui/QrCode';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso, fechaCorta, importe } from '../../_datos';

export const metadata: Metadata = { title: 'Ficha del socio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface FichaPageProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <dt className="text-[0.84rem] text-muted">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-end text-[0.9rem] text-ink">{valor || '—'}</dd>
    </div>
  );
}

export default async function FichaDeSocioPage({ params }: FichaPageProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableMemberManagement']);
  const { slug, features, name } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verSocios);

  const socios = await membersRepository();
  const ficha = await socios.ficha(id);
  if (!ficha) notFound();

  const puede = (permiso: string) => tienePermiso(perfil, permiso);
  const verPagos = puede(PERMISO.verPagos);
  const conComprobantes = features.enablePayments === true && verPagos;

  const [hoy, membresias, pagos, dias, comprobantes, planes] = await Promise.all([
    repo.hoyDelGimnasio(slug),
    socios.membresias(id),
    verPagos ? socios.pagos(id) : Promise.resolve([]),
    socios.diasDeAsistencia(id, 365),
    conComprobantes ? (await receiptsRepository()).listar({ customerId: id, limite: 30 }) : Promise.resolve([]),
    socios.planesVendibles(),
  ]);

  const racha = calcularRacha(dias, hoy, diasCerradosDelHorario(tenant.hours.week), 16);
  const matriz = ficha.checkinToken ? matrizQr(ficha.checkinToken) : null;
  const años = edad(ficha.birthDate, hoy);
  const base = tenantHref(slug, 'panel/socios');
  const campos = { tenantSlug: slug, customerId: ficha.id };
  const archivado = Boolean(ficha.archivedAt);

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-action/15 text-[1.5rem] font-bold text-action">
          {ficha.firstName.charAt(0)}
          {ficha.lastName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-h3">{ficha.fullName}</h2>
            {archivado ? (
              <Badge tone="neutral">Archivado</Badge>
            ) : (
              <Badge tone={ficha.membershipStatus === 'active' ? 'action' : ficha.membershipStatus === 'expiring_soon' ? 'structural' : 'neutral'}>
                {ficha.membershipStatus ? NOMBRE_DE_ESTADO_DE_MEMBRESIA[ficha.membershipStatus] : 'Sin membresía'}
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-[0.84rem] tracking-[0.1em] text-muted">
            {ficha.code ?? 'sin código'}
            {ficha.planName ? ` · ${ficha.planName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5" data-print="hide">
          <LinkButton href={base} variant="ghost" size="sm" icon="group" iconPosition="start">
            Todos los socios
          </LinkButton>
          <PrintButton />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="#membresia"
          etiqueta="Membresía"
          valor={ficha.daysRemaining !== null ? String(Math.max(ficha.daysRemaining, 0)) : '—'}
          icono="shield"
          tono={ficha.membershipStatus === 'active' ? 'accion' : ficha.membershipStatus ? 'alerta' : 'neutro'}
          comparacion={ficha.endDate ? `días restantes · vence ${fechaCorta(ficha.endDate)}` : 'sin membresía'}
          accion="Ver membresía"
        />
        <StatCard
          href={features.enableAttendance ? `${tenantHref(slug, 'panel/asistencia')}?q=${encodeURIComponent(ficha.code ?? ficha.fullName)}&preset=30d` : '#constancia'}
          etiqueta="Visitas 30 días"
          valor={String(ficha.visits30d)}
          icono="calendar"
          comparacion={`${ficha.totalVisits} en total · última ${fechaCorta(ficha.lastVisit)}`}
          accion="Ver entradas"
        />
        <StatCard
          href="#constancia"
          etiqueta="Racha"
          valor={String(racha.actual)}
          icono="fire"
          tono={racha.actual >= 3 ? 'accion' : 'neutro'}
          comparacion={`mejor racha: ${racha.mejor} días`}
          accion="Ver calendario"
        />
        <StatCard
          href={verPagos ? '#pagos' : '#membresia'}
          etiqueta="Total pagado"
          valor={importe(ficha.totalPaid)}
          icono="wallet"
          comparacion={ficha.pendingReceipts > 0 ? `${ficha.pendingReceipts} comprobante(s) pendiente(s)` : `${pagos.length} cobros`}
          accion="Ver pagos"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-datos">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="titulo-datos" className="flex items-center gap-2 t-h3">
              <Icon name="idcard" size={18} className="text-action" />
              Información personal
            </h3>
            {puede(PERMISO.editarSocios) && !archivado && (
              <Modal
                titulo="Editar datos del socio"
                anchoMaximo="lg"
                disparador={
                  <Button variant="secondary" size="sm" icon="edit" iconPosition="start">
                    Editar
                  </Button>
                }
              >
                <EditarSocioForm slug={slug} ficha={ficha} />
              </Modal>
            )}
          </div>
          <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
            <div>
              <Dato etiqueta="Nombre" valor={ficha.firstName} />
              <Dato etiqueta="Apellido" valor={ficha.lastName} />
              <Dato etiqueta="Documento" valor={ficha.documentId} />
              <Dato etiqueta="Nacimiento" valor={ficha.birthDate ? `${fechaCorta(ficha.birthDate)} ${ficha.birthDate.slice(0, 4)}${años !== null ? ` · ${años} años` : ''}` : null} />
            </div>
            <div>
              <Dato etiqueta="Teléfono" valor={ficha.phone} />
              <Dato etiqueta="Correo" valor={ficha.email} />
              <Dato etiqueta="Socio desde" valor={`${fechaCorta(ficha.createdAt.slice(0, 10))} ${ficha.createdAt.slice(0, 4)}`} />
              <Dato
                etiqueta="Cuenta web"
                valor={ficha.hasAccount === null ? 'No visible para tu rol' : ficha.hasAccount ? ficha.accountEmail ?? 'Vinculada' : 'Todavía no se registró'}
              />
            </div>
          </dl>
          {ficha.notes && <p className="mt-4 rounded-[var(--t-radius-md)] bg-raised px-4 py-3 text-[0.86rem] text-muted">{ficha.notes}</p>}
        </section>

        <section className="surface-card flex flex-col items-center gap-3 p-6 text-center sm:p-7" aria-labelledby="titulo-qr">
          <h3 id="titulo-qr" className="t-h3">QR de entrada</h3>
          {matriz && ficha.checkinToken ? (
            <>
              <div className="rounded-[var(--t-radius-md)] bg-white p-3">
                <QrCode matriz={matriz} descripcion={`QR de entrada de ${ficha.fullName}`} className="max-w-[12rem]" />
              </div>
              <p className="font-mono text-[0.74rem] tracking-[0.12em] text-muted">{ficha.checkinToken.match(/.{1,6}/g)?.join(' ')}</p>
              <div className="flex flex-wrap justify-center gap-2" data-print="hide">
                <Modal
                  titulo={`QR de ${ficha.fullName}`}
                  descripcion={ficha.code ?? undefined}
                  anchoMaximo="md"
                  disparador={
                    <Button variant="primary" size="sm" icon="qr" iconPosition="start">
                      Mostrar QR grande
                    </Button>
                  }
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full max-w-[26rem] rounded-[var(--t-radius-md)] bg-white p-4">
                      <QrCode matriz={matriz} descripcion={`QR de entrada de ${ficha.fullName}`} className="max-w-none" />
                    </div>
                    <p className="font-mono text-[0.9rem] tracking-[0.14em] text-muted">{ficha.checkinToken.match(/.{1,6}/g)?.join(' ')}</p>
                  </div>
                </Modal>
                {puede(PERMISO.editarSocios) && (
                  <AccionConEstado
                    accion={rotarQrDeSocio}
                    campos={campos}
                    etiqueta="Renovar QR"
                    icono="refresh"
                    confirmar="El QR actual dejará de servir para entrar. ¿Renovarlo?"
                  />
                )}
              </div>
            </>
          ) : (
            <p className="text-[0.86rem] text-muted">Tu rol no ve el QR de los socios.</p>
          )}
        </section>
      </div>

      <section id="membresia" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-membresia">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="titulo-membresia" className="flex items-center gap-2 t-h3">
            <Icon name="shield" size={18} className="text-action" />
            Membresías
          </h3>
          <div className="flex flex-wrap gap-2" data-print="hide">
            {puede(PERMISO.venderMembresias) && !archivado && (
              <Modal
                titulo={ficha.membershipId ? 'Renovar membresía' : 'Vender membresía'}
                descripcion={ficha.fullName}
                anchoMaximo="lg"
                disparador={
                  <Button variant="primary" size="sm" icon="plus" iconPosition="start">
                    {ficha.membershipId ? 'Renovar' : 'Vender membresía'}
                  </Button>
                }
              >
                <VenderMembresiaForm slug={slug} customerId={ficha.id} planes={planes} planActual={ficha.planId} finActual={ficha.endDate} />
              </Modal>
            )}
            {puede(PERMISO.editarMembresias) && ficha.membershipId && ficha.startDate && ficha.endDate && (
              <Modal
                titulo="Corregir membresía actual"
                descripcion="Fechas y estado. Para cambiar de plan, vende una nueva."
                anchoMaximo="lg"
                disparador={
                  <Button variant="secondary" size="sm" icon="edit" iconPosition="start">
                    Corregir
                  </Button>
                }
              >
                <EditarMembresiaForm
                  slug={slug}
                  membershipId={ficha.membershipId}
                  startDate={ficha.startDate}
                  endDate={ficha.endDate}
                  status={ficha.membershipStatus === 'suspended' || ficha.membershipStatus === 'cancelled' ? ficha.membershipStatus : 'active'}
                />
              </Modal>
            )}
          </div>
        </div>
        <DataTable
          titulo="Historial de membresías"
          className="mt-5"
          columnas={[
            { clave: 'plan', titulo: 'Plan', celda: (m) => m.planName ?? '—' },
            { clave: 'inicio', titulo: 'Inicio', celda: (m) => fechaCorta(m.startDate) },
            { clave: 'fin', titulo: 'Fin', celda: (m) => fechaCorta(m.endDate) },
            { clave: 'estado', titulo: 'Estado', celda: (m) => NOMBRE_DE_ESTADO_DE_MEMBRESIA[m.status] },
            { clave: 'precio', titulo: 'Precio', numerica: true, celda: (m) => importe(m.price) },
          ]}
          filas={membresias}
          claveDeFila={(m) => m.id}
          vacio={<p className="mt-5 text-[0.88rem] text-muted">Todavía no tiene membresías.</p>}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="constancia" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-constancia">
          <h3 id="titulo-constancia" className="mb-5 flex items-center gap-2 t-h3">
            <Icon name="fire" size={18} className="text-action" />
            Constancia
          </h3>
          <RachaCalendario racha={racha} />
        </section>

        {verPagos && (
          <section id="pagos" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-pagos">
            <h3 id="titulo-pagos" className="flex items-center gap-2 t-h3">
              <Icon name="wallet" size={18} className="text-action" />
              Pagos
            </h3>
            <DataTable
              titulo="Pagos del socio"
              className="mt-5"
              columnas={[
                { clave: 'fecha', titulo: 'Fecha', celda: (p) => fechaCorta(p.paidDate) },
                { clave: 'plan', titulo: 'Plan', celda: (p) => p.planName ?? '—' },
                { clave: 'metodo', titulo: 'Método', celda: (p) => NOMBRE_DE_METODO_DE_PAGO[p.method] },
                { clave: 'importe', titulo: 'Importe', numerica: true, celda: (p) => importe(p.amount, p.currency) },
              ]}
              filas={pagos}
              claveDeFila={(p) => p.id}
              filaDeTotales={pagos.length > 0 ? { importe: importe(pagos.reduce((s, p) => s + p.amount, 0)) } : undefined}
              vacio={<p className="mt-5 text-[0.88rem] text-muted">Sin pagos registrados.</p>}
            />
          </section>
        )}
      </div>

      {conComprobantes && (
        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-comprobantes">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="titulo-comprobantes" className="flex items-center gap-2 t-h3">
              <Icon name="receipt" size={18} className="text-action" />
              Comprobantes
            </h3>
            {puede(PERMISO.cobrar) && !archivado && (
              <Modal
                titulo="Adjuntar comprobante"
                descripcion={ficha.fullName}
                anchoMaximo="lg"
                montarSoloAbierto
                disparador={
                  <Button variant="primary" size="sm" icon="upload" iconPosition="start">
                    Adjuntar comprobante
                  </Button>
                }
              >
                <SubirComprobanteForm slug={slug} modo="personal" planes={planes} customerId={ficha.id} planSugerido={ficha.planId ?? undefined} />
              </Modal>
            )}
          </div>
          {comprobantes.length === 0 ? (
            <p className="mt-5 text-[0.88rem] text-muted">No hay comprobantes de este socio.</p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {comprobantes.map((c) => (
                <li key={c.id} className="flex gap-3 rounded-[var(--t-radius-md)] border border-line p-3">
                  <a href={`/${slug}/panel/comprobantes/${c.id}/imagen`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img src={`/${slug}/panel/comprobantes/${c.id}/imagen`} alt={`Comprobante del ${c.receiptDate}`} loading="lazy" className="h-20 w-16 rounded-[var(--t-radius-sm)] bg-white object-cover" />
                  </a>
                  <div className="min-w-0 text-[0.84rem]">
                    <p className="font-semibold text-ink">{importe(c.amount, c.currency)}</p>
                    <p className="text-muted">{fechaCorta(c.receiptDate)} · {NOMBRE_DE_ORIGEN[c.source]}</p>
                    <p className="text-muted">{c.planName ?? 'Sin plan'}</p>
                    <p className={c.status === 'aprobado' ? 'text-action' : c.status === 'rechazado' ? 'text-structural' : 'text-ink'}>
                      {NOMBRE_DE_ESTADO_DE_COMPROBANTE[c.status]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(puede(PERMISO.archivarSocios) || puede(PERMISO.gestionarUsuarios)) && (
        <section className="surface-card border-structural/30 p-6 sm:p-7" aria-labelledby="titulo-gestion" data-print="hide">
          <h3 id="titulo-gestion" className="flex items-center gap-2 t-h3">
            <Icon name="lock" size={18} className="text-structural" />
            Zona de gerencia
          </h3>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            Archivar saca al socio de las listas y conserva todo su histórico de pagos y asistencia:
            en {name} los socios no se borran.
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            {puede(PERMISO.archivarSocios) &&
              (archivado ? (
                <AccionConEstado accion={restaurarSocio} campos={campos} etiqueta="Restaurar socio" icono="refresh" variante="primario" />
              ) : (
                <AccionConEstado
                  accion={archivarSocio}
                  campos={campos}
                  etiqueta="Archivar socio"
                  icono="archive"
                  variante="peligro"
                  confirmar={`¿Archivar a ${ficha.fullName}? Saldrá de las listas pero conservará su histórico.`}
                />
              ))}
            {puede(PERMISO.gestionarUsuarios) && ficha.hasAccount && (
              <AccionConEstado
                accion={desvincularCuentaDeSocio}
                campos={campos}
                etiqueta="Desvincular cuenta web"
                icono="user"
                variante="peligro"
                confirmar="La persona dejará de ver esta ficha desde la web. ¿Continuar?"
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
