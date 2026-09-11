/**
 * CAPA: Presentation / App — comprobantes de pago.
 *
 * La bandeja de recepción y gerencia: qué pagos por QR esperan revisión, qué
 * altas nuevas no tienen todavía comprobante, y la descarga en un ZIP de los
 * comprobantes filtrados para mandárselos al dueño de la cuenta del QR.
 *
 * Los filtros son los MISMOS que el reporte de comprobantes: se reutiliza su
 * definición del catálogo y su formulario. Una sola forma de filtrar
 * comprobantes en todo el producto.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { cn } from '@/lib/cn';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { reportePorClave } from '@core/domain/operations/reports';
import { describirRango } from '@core/domain/operations/periodo';
import {
  esEstadoDeComprobante,
  esOrigenDeComprobante,
  NOMBRE_DE_ESTADO_DE_COMPROBANTE,
  NOMBRE_DE_ORIGEN,
} from '@core/domain/operations/receipts';
import { membersRepository, receiptsRepository } from '@infra/config/composition-root';
import { BotonFicha, FichaDeSocioProvider } from '@/presentation/patterns/FichaDeSocio';
import {
  DescargarComprobantesZip,
  RevisarComprobante,
  SubirComprobanteForm,
} from '@/presentation/patterns/ComprobanteForms';
import { ReportFilters } from '@/presentation/patterns/ReportFilters';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { Modal } from '@/presentation/ui/Modal';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso, fechaCorta, hora, importe } from '../_datos';
import { leerFiltros, type ParametrosDeUrl } from '../reportes/_filtros';

export const metadata: Metadata = { title: 'Comprobantes', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface ComprobantesPageProps extends TenantPageParams {
  readonly searchParams: Promise<ParametrosDeUrl>;
}

export default async function ComprobantesPage({ params, searchParams }: ComprobantesPageProps) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enablePayments']);
  const { slug, features } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verPagos);
  const puedeCobrar = tienePermiso(perfil, PERMISO.cobrar);

  const definicion = reportePorClave('comprobantes');
  if (!definicion) throw new Error('Falta la definición del reporte de comprobantes en el catálogo.');

  const hoy = await repo.hoyDelGimnasio(slug);
  const { filtro, rango, preset } = leerFiltros(definicion, await searchParams, hoy);
  const base = tenantHref(slug, 'panel/comprobantes');

  const recibos = await receiptsRepository();
  const socios = await membersRepository();
  const [lista, pendientesTodos, hoyAprobados, planes, sinMembresia] = await Promise.all([
    recibos.listar({
      desde: filtro.desde,
      hasta: filtro.hasta,
      estado: esEstadoDeComprobante(filtro.estado) ? filtro.estado : undefined,
      origen: esOrigenDeComprobante(filtro.origen) ? filtro.origen : undefined,
      planId: filtro.planId,
      q: filtro.q,
    }),
    recibos.listar({ estado: 'pendiente', limite: 500 }),
    recibos.listar({ estado: 'aprobado', desde: hoy, hasta: hoy, limite: 500 }),
    socios.planesVendibles(),
    features.enableMemberManagement ? socios.listar({ estado: 'sin-membresia' }, hoy) : Promise.resolve([]),
  ]);

  const opcionesDeSocio = puedeCobrar
    ? (await socios.listar({}, hoy)).map((s) => ({ id: s.id, etiqueta: `${s.fullName}${s.code ? ` · ${s.code}` : ''}` }))
    : [];

  const totalPeriodo = lista.filter((c) => c.status === 'aprobado').reduce((suma, c) => suma + c.amount, 0);
  const nombreZip = `${slug}-comprobantes_${(rango.desde && rango.hasta ? `${rango.desde}_a_${rango.hasta}` : hoy).replace(/[^0-9a-z_-]/gi, '')}.zip`;

  return (
    <FichaDeSocioProvider slug={slug} rutaDeFicha={features.enableMemberManagement ? tenantHref(slug, 'panel/socios') : undefined}>
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            href={`${base}?estado=pendiente&preset=todo`}
            etiqueta="Por revisar"
            valor={String(pendientesTodos.length)}
            icono="receipt"
            tono={pendientesTodos.length > 0 ? 'alerta' : 'neutro'}
            comparacion={pendientesTodos.length > 0 ? `${importe(pendientesTodos.reduce((s, c) => s + c.amount, 0))} esperando` : 'Nada pendiente'}
            accion="Revisar ahora"
          />
          <StatCard
            href={`${base}?estado=aprobado&preset=hoy`}
            etiqueta="Aprobados hoy"
            valor={String(hoyAprobados.length)}
            icono="check"
            tono="accion"
            comparacion={importe(hoyAprobados.reduce((s, c) => s + c.amount, 0))}
            accion="Ver los de hoy"
          />
          <StatCard
            href={`${base}?estado=aprobado&preset=mes`}
            etiqueta="Aprobado en el periodo"
            valor={importe(totalPeriodo)}
            icono="wallet"
            comparacion={describirRango(rango)}
            accion="Ver del mes"
          />
          {puedeCobrar ? (
            <Modal
              titulo="Adjuntar comprobante"
              descripcion="Para un socio que pagó por QR en el mostrador o por WhatsApp."
              anchoMaximo="lg"
              montarSoloAbierto
              disparador={
                <StatCard boton etiqueta="Nuevo comprobante" valor="+" icono="upload" tono="accion" comparacion="Adjunta la captura y el plan propuesto" accion="Adjuntar" />
              }
            >
              <SubirComprobanteForm slug={slug} modo="personal" planes={planes} socios={opcionesDeSocio} />
            </Modal>
          ) : (
            <StatCard href={`${base}?estado=rechazado&preset=30d`} etiqueta="Rechazados" valor="→" icono="close" comparacion="últimos 30 días" />
          )}
        </div>

        {puedeCobrar && sinMembresia.length > 0 && (
          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-altas">
            <h2 id="titulo-altas" className="flex items-center gap-2 t-h3">
              <Icon name="user" size={18} className="text-action" />
              Altas esperando comprobante
            </h2>
            <p className="mt-1.5 text-[0.86rem] text-muted">
              Socios registrados que todavía no tienen membresía. Adjunta su comprobante y el plan propuesto se activa al aprobarlo.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sinMembresia.slice(0, 12).map((socio) => (
                <li key={socio.id} className="relative flex items-center justify-between gap-3 rounded-[var(--t-radius-md)] border border-line p-4">
                  <div className="min-w-0">
                    <BotonFicha customerId={socio.id}>{socio.fullName}</BotonFicha>
                    <p className="text-[0.78rem] text-muted">
                      {socio.code} · alta {fechaCorta(socio.createdAt.slice(0, 10))}
                      {socio.pendingReceipts > 0 ? ` · ${socio.pendingReceipts} pendiente` : ''}
                    </p>
                  </div>
                  <div className="relative z-10">
                    <Modal
                      titulo="Adjuntar comprobante"
                      descripcion={socio.fullName}
                      anchoMaximo="lg"
                      montarSoloAbierto
                      disparador={
                        <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-[var(--t-radius-sm)] bg-action px-3 text-[0.8rem] font-semibold text-on-action hover:bg-action-strong">
                          <Icon name="upload" size={14} />
                          Adjuntar
                        </button>
                      }
                    >
                      <SubirComprobanteForm slug={slug} modo="personal" planes={planes} customerId={socio.id} />
                    </Modal>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-bandeja">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="titulo-bandeja" className="t-h3">Bandeja de comprobantes</h2>
              <p className="mt-1.5 text-[0.86rem] text-muted">
                {lista.length} comprobantes · {describirRango(rango)}. Descarga los filtrados en un ZIP con su resumen para el dueño del QR.
              </p>
            </div>
            <DescargarComprobantesZip slug={slug} comprobantes={lista} nombreArchivo={nombreZip} />
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <ReportFilters definicion={definicion} filtro={filtro} rango={rango} preset={preset} planes={planes} rutaBase={base} />
          </div>

          {lista.length === 0 ? (
            <EmptyState icono="receipt" titulo="Ningún comprobante con estos filtros" descripcion="Prueba con otro periodo o quita el filtro de estado." className="mt-4" />
          ) : (
            <ul className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {lista.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    'relative flex flex-col gap-4 rounded-[var(--t-radius-lg)] border p-4',
                    c.status === 'pendiente' ? 'border-structural/40 bg-structural/5' : 'border-line',
                  )}
                >
                  <div className="flex gap-4">
                    <a
                      href={`/${slug}/panel/comprobantes/${c.id}/imagen`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-10 block shrink-0 overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-white"
                      aria-label={`Abrir la imagen del comprobante de ${c.customerName}`}
                    >
                      <img src={`/${slug}/panel/comprobantes/${c.id}/imagen`} alt="" loading="lazy" className="h-32 w-24 object-cover transition-transform duration-200 hover:scale-105" />
                    </a>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={c.status === 'aprobado' ? 'action' : c.status === 'pendiente' ? 'structural' : 'neutral'}>
                          {NOMBRE_DE_ESTADO_DE_COMPROBANTE[c.status]}
                        </Badge>
                        <span className="text-[0.74rem] text-muted">{NOMBRE_DE_ORIGEN[c.source]}</span>
                      </div>
                      <p className="mt-2 text-[1.35rem] font-bold leading-none text-ink">{importe(c.amount, c.currency)}</p>
                      <p className="mt-2 text-[0.9rem]">
                        <BotonFicha customerId={c.customerId}>{c.customerName}</BotonFicha>
                      </p>
                      <p className="text-[0.78rem] text-muted">
                        {c.customerCode} · {fechaCorta(c.receiptDate)} {hora(c.createdLocal)}
                      </p>
                      <p className="mt-1 text-[0.8rem] text-ink">
                        <span className="text-muted">Plan propuesto: </span>
                        {c.planName ?? 'sin plan'}
                        {c.expectedAmount !== null && <span className="text-muted"> · precio {importe(c.expectedAmount, c.currency)}</span>}
                      </p>
                      {c.verifiedAmount !== null && c.verifiedAmount !== c.amount && (
                        <p className="text-[0.78rem] text-muted">Verificado en el banco: {importe(c.verifiedAmount, c.currency)}</p>
                      )}
                      {c.note && <p className="mt-1 text-[0.78rem] text-muted">«{c.note}»</p>}
                      {c.reviewNote && (
                        <p className={cn('mt-1 text-[0.78rem]', c.status === 'rechazado' ? 'text-structural' : 'text-muted')}>
                          Revisión: {c.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                  {c.status === 'pendiente' && puedeCobrar && (
                    <div className="relative z-10">
                      <RevisarComprobante slug={slug} receiptId={c.id} declarado={c.amount} esperado={c.expectedAmount} moneda={c.currency} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </FichaDeSocioProvider>
  );
}
