/**
 * CAPA: Presentation / App — cobro por QR del gimnasio.
 *
 * Gerencia configura aquí cómo se cobra por QR: la modalidad (un QR para todo
 * o uno por plan), el QR general y el de cada plan. Es la pieza que hace que
 * «Pagar con QR» funcione en la página de planes sin tocar código: cada
 * gimnasio pone los suyos, y cuando cambia de cuenta los cambia aquí.
 *
 * Los planes salen de la base con la sesión de gerencia (RLS: los de su
 * gimnasio), no de una lista escrita en el código ni del archivo del tenant.
 * La columna «Se cobra con» usa la MISMA elección que la página pública.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { fechaCorta, importe } from '@/lib/formato';
import {
  estadoDeQr,
  NOMBRE_DE_ESTADO_DE_QR,
  NOMBRE_DE_MODO_DE_QR,
  seleccionarQrDeCobro,
  type QrDeCobro,
} from '@core/domain/operations/cobro-qr';
import type { PlanVendible } from '@core/domain/operations/members';
import { PERMISO } from '@core/domain/operations/workspace';
import { membersRepository, paymentSettingsRepository } from '@infra/config/composition-root';
import { eliminarQrDeCobro } from '../comprobantes/actions';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { AjustesDeCobroForm, QrDeCobroForm } from '@/presentation/patterns/AjustesDeCobroForm';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';
import { DataTable } from '@/presentation/ui/DataTable';
import { Modal } from '@/presentation/ui/Modal';
import { exigirPermiso } from '../_datos';

export const metadata: Metadata = { title: 'Cobro por QR', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function datosDelActual(qr: QrDeCobro | null, hoy: string) {
  return qr
    ? { id: qr.id, amountMode: qr.amountMode, expiresOn: qr.expiresOn, updatedAt: qr.updatedAt, vencido: estadoDeQr(qr, null, hoy) === 'vencido' }
    : null;
}

export default async function CobrosPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, ['memberLogin', 'enablePayments']);
  const { slug } = tenant;
  const { repo } = await exigirPermiso(slug, PERMISO.configurar);

  const ajustesRepo = await paymentSettingsRepository();
  const [hoy, ajustes, { qrs }, planes] = await Promise.all([
    repo.hoyDelGimnasio(slug),
    ajustesRepo.porSlug(slug),
    ajustesRepo.qrsPorSlug(slug),
    (await membersRepository()).planesVendibles(),
  ]);
  const respaldo = tenant.content.paymentQr;
  const modo = ajustes?.qrMode ?? 'global';
  const general = qrs.find((qr) => qr.planId === null) ?? null;
  const idsDePlanes = new Set(planes.map((plan) => plan.id));
  const huerfanos = qrs.filter((qr) => qr.planId !== null && !idsDePlanes.has(qr.planId));

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-4 p-6 sm:p-7">
        <div className="max-w-[62ch]">
          <h2 className="t-h3">Cobro por QR</h2>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">
            Sube los QR que te da tu banco. Aparecen en el botón «Pagar con QR» de cada paquete, y los socios envían su
            comprobante desde su panel para que recepción lo apruebe. Un pago menor que el precio del plan no se puede aprobar.
          </p>
        </div>
        <LinkButton href={tenantHref(slug, 'planes')} variant="secondary" size="sm" icon="eye" iconPosition="start" external>
          Ver página de planes
        </LinkButton>
      </section>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="cobro-datos">
        <h3 id="cobro-datos" className="mb-4 text-[1.05rem] font-semibold">
          Datos y modalidad
        </h3>
        <AjustesDeCobroForm
          slug={slug}
          holder={ajustes?.holder ?? respaldo?.holder ?? null}
          bank={ajustes?.bank ?? respaldo?.bank ?? null}
          note={ajustes?.note ?? respaldo?.note ?? null}
          qrMode={modo}
        />
      </section>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="cobro-general">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="cobro-general" className="text-[1.05rem] font-semibold">
              QR general
            </h3>
            <p className="mt-1 text-[0.84rem] text-muted">
              {modo === 'global'
                ? 'Con la modalidad actual, todos los planes se cobran con este QR.'
                : 'Respaldo de los planes que no tienen su propio QR vigente.'}
            </p>
          </div>
          {general && (
            <AccionConEstado
              accion={eliminarQrDeCobro}
              campos={{ tenantSlug: slug, qrId: general.id }}
              etiqueta="Eliminar QR general"
              icono="close"
              variante="peligro"
              confirmar="¿Eliminar el QR general? Los planes sin QR propio pasarán a pagarse en recepción."
            />
          )}
        </div>
        <QrDeCobroForm slug={slug} plan={null} actual={datosDelActual(general, hoy)} />
      </section>

      <section className="surface-card p-6 sm:p-7" aria-labelledby="cobro-planes">
        <h3 id="cobro-planes" className="text-[1.05rem] font-semibold">
          QR por plan
        </h3>
        <p className="mt-1 max-w-[70ch] text-[0.84rem] leading-relaxed text-muted">
          {modo === 'por_plan'
            ? 'Cada plan se cobra con su QR si lo tiene vigente; si no, con el QR general.'
            : `La modalidad actual es «${NOMBRE_DE_MODO_DE_QR.global}»: los QR de esta lista se guardan, pero no se usan hasta que elijas «${NOMBRE_DE_MODO_DE_QR.por_plan}».`}
        </p>

        <DataTable<PlanVendible>
          titulo="QR de cobro de cada plan activo"
          className="mt-5"
          filas={planes}
          claveDeFila={(plan) => plan.id}
          vacio={<p className="mt-5 text-[0.88rem] text-muted">Este gimnasio no tiene planes activos.</p>}
          columnas={[
            {
              clave: 'plan',
              titulo: 'Plan',
              celda: (plan) => (
                <span className="flex flex-col">
                  <span className="font-semibold">{plan.name}</span>
                  <span className="text-[0.76rem] text-muted">{importe(plan.price, plan.currency)}</span>
                </span>
              ),
            },
            {
              clave: 'propio',
              titulo: 'QR propio',
              celda: (plan) => {
                const propio = qrs.find((qr) => qr.planId === plan.id);
                if (!propio) return <span className="text-muted">Sin QR propio</span>;
                const estado = estadoDeQr(propio, plan, hoy);
                return (
                  <span className="flex flex-col gap-1">
                    <span>
                      {propio.amountMode === 'exacto' ? `Exacto · ${importe(propio.fixedAmount ?? 0, plan.currency)}` : 'Monto libre'}
                      {propio.expiresOn ? ` · vence ${fechaCorta(propio.expiresOn)}` : ''}
                    </span>
                    <Badge tone={estado === 'vigente' ? 'neutral' : 'structural'} className="w-fit">
                      {NOMBRE_DE_ESTADO_DE_QR[estado]}
                    </Badge>
                  </span>
                );
              },
            },
            {
              clave: 'cobro',
              titulo: 'Se cobra con',
              celda: (plan) => {
                const resultado = seleccionarQrDeCobro({ modo, qrs, plan, hoy });
                if (!resultado.disponible) return <Badge tone="structural">Solo en recepción</Badge>;
                return resultado.seleccion.origen === 'plan' ? (
                  <Badge tone="action">QR del plan</Badge>
                ) : (
                  <Badge tone="neutral">QR general</Badge>
                );
              },
            },
            {
              clave: 'acciones',
              titulo: 'Acciones',
              celda: (plan) => {
                const propio = qrs.find((qr) => qr.planId === plan.id) ?? null;
                return (
                  <span className="flex flex-wrap items-start gap-2">
                    <Modal
                      titulo={`QR de «${plan.name}»`}
                      descripcion={`Precio actual: ${importe(plan.price, plan.currency)}.`}
                      anchoMaximo="lg"
                      montarSoloAbierto
                      disparador={
                        <Button variant="secondary" size="sm" icon={propio ? 'edit' : 'plus'} iconPosition="start">
                          {propio ? 'Cambiar' : 'Configurar'}
                        </Button>
                      }
                    >
                      <QrDeCobroForm
                        slug={slug}
                        plan={{ id: plan.id, name: plan.name, price: plan.price, currency: plan.currency }}
                        actual={datosDelActual(propio, hoy)}
                      />
                    </Modal>
                    {propio && (
                      <AccionConEstado
                        accion={eliminarQrDeCobro}
                        campos={{ tenantSlug: slug, qrId: propio.id }}
                        etiqueta="Eliminar"
                        variante="peligro"
                        confirmar={`¿Eliminar el QR de «${plan.name}»? Se cobrará con el QR general.`}
                      />
                    )}
                  </span>
                );
              },
            },
          ]}
        />

        {huerfanos.length > 0 && (
          <div className="mt-6 rounded-[var(--t-radius-md)] border border-line p-4">
            <p className="text-[0.86rem]">
              {huerfanos.length === 1
                ? 'Hay 1 QR de un plan que ya no está activo. No se ofrece a nadie.'
                : `Hay ${huerfanos.length} QR de planes que ya no están activos. No se ofrecen a nadie.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {huerfanos.map((qr) => (
                <AccionConEstado
                  key={qr.id}
                  accion={eliminarQrDeCobro}
                  campos={{ tenantSlug: slug, qrId: qr.id }}
                  etiqueta={`Eliminar QR (actualizado ${fechaCorta(qr.updatedAt)})`}
                  variante="peligro"
                  confirmar="¿Eliminar este QR de un plan inactivo?"
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
