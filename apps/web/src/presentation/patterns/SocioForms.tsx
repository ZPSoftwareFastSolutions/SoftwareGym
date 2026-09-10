'use client';

/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Formularios de gestión de socios: alta, edición de datos, venta y edición de
 * membresía.
 *
 * La validación de aquí es la del dominio (`members.ts`) repetida por la acción
 * de servidor y otra vez por la base. En el navegador solo se usa para no hacer
 * perder el tiempo; lo que decide es lo de abajo.
 */

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { fechaCorta, importe } from '@/lib/formato';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import {
  actualizarMembresia,
  actualizarSocio,
  registrarSocio,
  venderMembresia,
  type EstadoDeAlta,
} from '@/app/[tenant]/panel/socios/actions';
import {
  METODOS_DE_PAGO,
  NOMBRE_DE_METODO_DE_PAGO,
  type FichaDeSocio,
  type MetodoDePago,
  type PlanVendible,
} from '@core/domain/operations/members';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon, type AnyIconKey } from '../icons/Icon';
import { SelectorDeImagen } from './SelectorDeImagen';

const PATRON_NOMBRE_HTML = "[\\p{L}\\p{M}][\\p{L}\\p{M}'\\-. ]*";

const ICONO_DE_METODO: Readonly<Record<MetodoDePago, AnyIconKey>> = {
  cash: 'wallet',
  qr: 'qr',
  transfer: 'refresh',
  card: 'idcard',
  other: 'sparkle',
};

function Enviar({ texto, icono = 'check' }: { readonly texto: string; readonly icono?: AnyIconKey }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : icono} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Guardando…' : texto}
    </button>
  );
}

function Aviso({ estado }: { readonly estado: EstadoDeFormulario }) {
  if (!estado.exito && !estado.mensaje) return null;
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.88rem]',
        estado.exito ? 'border-action/40 bg-action/10 text-ink' : 'border-structural/50 bg-structural/10 text-ink',
      )}
    >
      <Icon name={estado.exito ? 'check' : 'alert'} size={17} className={cn('mt-0.5 shrink-0', estado.exito ? 'text-action' : 'text-structural')} />
      {estado.exito ?? estado.mensaje}
    </p>
  );
}

function CamposPersonales({
  valores,
  errores,
}: {
  readonly valores: Readonly<Record<string, string>>;
  readonly errores: Readonly<Record<string, string>>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo id="socio-nombre" etiqueta="Nombre" error={errores.nombre} obligatorio>
        <input name="nombre" defaultValue={valores.nombre} required minLength={2} maxLength={80} pattern={PATRON_NOMBRE_HTML} title="Solo letras, espacios, apóstrofos y guiones" autoComplete="off" className={CLASE_DE_CONTROL} />
      </Campo>
      <Campo id="socio-apellido" etiqueta="Apellido" error={errores.apellido} obligatorio>
        <input name="apellido" defaultValue={valores.apellido} required minLength={2} maxLength={80} pattern={PATRON_NOMBRE_HTML} title="Solo letras, espacios, apóstrofos y guiones" autoComplete="off" className={CLASE_DE_CONTROL} />
      </Campo>
      <Campo id="socio-documento" etiqueta="Documento (CI)" error={errores.documento} ayuda="Evita registrar dos veces a la misma persona.">
        <input name="documento" defaultValue={valores.documento} maxLength={20} autoComplete="off" className={CLASE_DE_CONTROL} />
      </Campo>
      <Campo id="socio-telefono" etiqueta="Teléfono / WhatsApp" error={errores.telefono}>
        <input name="telefono" type="tel" defaultValue={valores.telefono} maxLength={20} placeholder="70000000" className={CLASE_DE_CONTROL} />
      </Campo>
      <Campo id="socio-correo" etiqueta="Correo" error={errores.correo} ayuda="Si se registra en la web con este correo, verá su QR y su membresía.">
        <input name="correo" type="email" defaultValue={valores.correo} maxLength={254} autoComplete="off" className={CLASE_DE_CONTROL} />
      </Campo>
      <Campo id="socio-nacimiento" etiqueta="Fecha de nacimiento" error={errores.nacimiento}>
        <input name="nacimiento" type="date" defaultValue={valores.nacimiento} className={CLASE_DE_CONTROL} />
      </Campo>
      <Campo id="socio-nota" etiqueta="Nota interna" error={errores.nota} className="sm:col-span-2">
        <input name="nota" defaultValue={valores.nota} maxLength={500} placeholder="Lesiones, objetivos, recomendaciones…" className={CLASE_DE_CONTROL} />
      </Campo>
    </div>
  );
}

function SelectorDeMetodo({
  nombre,
  valor,
  alCambiar,
}: {
  readonly nombre: string;
  readonly valor: MetodoDePago;
  readonly alCambiar: (metodo: MetodoDePago) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Cómo paga</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {METODOS_DE_PAGO.map((metodo) => (
          <label
            key={metodo}
            className={cn(
              'flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[var(--t-radius-md)] border text-[0.86rem] font-medium transition-colors',
              valor === metodo ? 'border-action bg-action/10 text-ink' : 'border-line text-muted hover:border-action/60',
            )}
          >
            <input type="radio" name={nombre} value={metodo} checked={valor === metodo} onChange={() => alCambiar(metodo)} className="sr-only" />
            <Icon name={ICONO_DE_METODO[metodo]} size={17} />
            {NOMBRE_DE_METODO_DE_PAGO[metodo]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface AltaDeSocioFormProps {
  readonly slug: string;
  readonly planes: readonly PlanVendible[];
  readonly hoy: string;
  readonly rutaDeFichas: string;
  /** El gimnasio tiene contratado el cobro por QR con comprobante. */
  readonly admiteComprobante: boolean;
}

export function AltaDeSocioForm({ slug, planes, hoy, rutaDeFichas, admiteComprobante }: AltaDeSocioFormProps) {
  const [estado, accion] = useActionState<EstadoDeAlta, FormData>(registrarSocio, {});
  const [version, setVersion] = useState(0);
  const valores = estado.valores ?? {};
  const [planId, setPlanId] = useState(valores.planId ?? planes[0]?.id ?? '');
  const [metodo, setMetodo] = useState<MetodoDePago>((valores.metodo as MetodoDePago) || 'cash');
  const [monto, setMonto] = useState(valores.monto ?? String(planes[0]?.price ?? ''));
  const errores = estado.errores ?? {};
  const plan = planes.find((p) => p.id === planId);

  useEffect(() => {
    if (estado.valores?.planId !== undefined) setPlanId(estado.valores.planId);
  }, [estado.valores]);

  if (estado.registrado) {
    const r = estado.registrado;
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-action/15 text-action">
          <Icon name="check" size={32} />
        </span>
        <div>
          <p className="t-h3">{r.nombre}</p>
          <p className="mt-1 font-mono text-[0.9rem] tracking-[0.12em] text-muted">{r.code}</p>
        </div>
        <ul className="flex w-full max-w-md flex-col gap-2 text-start text-[0.88rem]">
          <li className="flex items-center gap-2.5 rounded-[var(--t-radius-md)] bg-raised px-4 py-3">
            <Icon name="qr" size={17} className="text-action" />
            QR de entrada generado{r.token ? '' : ' (se verá en la ficha)'}
          </li>
          <li className="flex items-center gap-2.5 rounded-[var(--t-radius-md)] bg-raised px-4 py-3">
            <Icon name="shield" size={17} className={r.membresiaActiva ? 'text-action' : 'text-structural'} />
            {r.membresiaActiva ? 'Membresía activa' : 'Membresía pendiente: se activa al aprobar el comprobante'}
          </li>
          {r.comprobante !== 'ninguno' && (
            <li className="flex items-center gap-2.5 rounded-[var(--t-radius-md)] bg-raised px-4 py-3">
              <Icon name="receipt" size={17} className={r.comprobante === 'error' ? 'text-structural' : 'text-action'} />
              {r.comprobante === 'aprobado' && 'Comprobante aprobado y cobro registrado'}
              {r.comprobante === 'pendiente' && 'Comprobante adjuntado, pendiente de revisión'}
              {r.comprobante === 'error' && 'No se pudo guardar el comprobante: adjúntalo desde la ficha'}
            </li>
          )}
          <li className="flex items-center gap-2.5 rounded-[var(--t-radius-md)] bg-raised px-4 py-3">
            <Icon name="user" size={17} className="text-muted" />
            {r.cuentaVinculada
              ? 'Ya tenía cuenta web con ese correo: quedó vinculada'
              : 'Cuando se registre en la web con su correo, su cuenta se vincula sola'}
          </li>
        </ul>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`${rutaDeFichas}/${r.customerId}`}
            className="inline-flex h-12 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong"
          >
            <Icon name="idcard" size={17} />
            Ver ficha y QR
          </Link>
          <a
            href={`${rutaDeFichas}/nuevo`}
            onClick={(evento) => {
              evento.preventDefault();
              setVersion((v) => v + 1);
              window.location.assign(`${rutaDeFichas}/nuevo`);
            }}
            className="inline-flex h-12 items-center gap-2 rounded-[var(--t-radius-md)] border border-line px-6 font-semibold text-ink transition-colors hover:border-action hover:text-action"
          >
            <Icon name="plus" size={17} />
            Registrar otro
          </a>
        </div>
      </div>
    );
  }

  const pagaConQr = Boolean(planId) && metodo === 'qr';

  return (
    <form key={version} action={accion} className="flex flex-col gap-7" noValidate={false}>
      <input type="hidden" name="tenantSlug" value={slug} />

      <section className="flex flex-col gap-4" aria-labelledby="alta-datos">
        <h3 id="alta-datos" className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">
          <Icon name="idcard" size={15} className="text-action" />
          Datos personales
        </h3>
        <CamposPersonales valores={valores} errores={errores} />
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-6" aria-labelledby="alta-plan">
        <h3 id="alta-plan" className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">
          <Icon name="layers" size={15} className="text-action" />
          Plan y pago
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="alta-plan-id" etiqueta="Plan" error={errores.planId} className="sm:col-span-2">
            <select
              name="planId"
              value={planId}
              onChange={(evento) => {
                setPlanId(evento.target.value);
                const elegido = planes.find((p) => p.id === evento.target.value);
                setMonto(elegido ? String(elegido.price) : '');
              }}
              className={CLASE_DE_CONTROL}
            >
              <option value="">Sin plan por ahora (solo la ficha)</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.durationDays} días · {importe(p.price, p.currency)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="alta-inicio" etiqueta="Empieza" error={errores.inicio}>
            <input name="inicio" type="date" defaultValue={valores.inicio || hoy} disabled={!planId || pagaConQr} className={CLASE_DE_CONTROL} />
          </Campo>
        </div>

        {planId && (
          <>
            <SelectorDeMetodo nombre="metodo" valor={metodo} alCambiar={setMetodo} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="alta-monto" etiqueta="Importe cobrado (Bs)" error={errores.monto} ayuda={plan ? `Precio de lista: ${importe(plan.price, plan.currency)}` : undefined}>
                <input name="monto" inputMode="decimal" value={monto} onChange={(evento) => setMonto(evento.target.value)} className={CLASE_DE_CONTROL} />
              </Campo>
              {plan && (
                <p className="self-end rounded-[var(--t-radius-md)] bg-raised px-4 py-3 text-[0.84rem] text-muted sm:col-span-2">
                  {pagaConQr
                    ? 'Con QR, la membresía se activa al aprobar el comprobante: así nadie entrena con un pago que no se verificó.'
                    : `Membresía de ${plan.durationDays} días, activa desde la fecha de inicio.`}
                </p>
              )}
            </div>
          </>
        )}

        {pagaConQr && admiteComprobante && (
          <div className="flex flex-col gap-4 rounded-[var(--t-radius-md)] border border-line p-4">
            <SelectorDeImagen id="alta-comprobante" nombre="comprobante" etiqueta="Comprobante del pago por QR" />
            {errores.comprobante && <p role="alert" className="-mt-2 text-[0.8rem] text-structural">{errores.comprobante}</p>}
            <label className="flex items-start gap-3 text-[0.86rem]">
              <input type="checkbox" name="verificado" value="si" className="mt-1 h-4 w-4 accent-[var(--t-action)]" />
              <span>
                <strong className="block text-ink">Ya verifiqué el depósito en el banco</strong>
                <span className="text-muted">Se aprueba al momento y la membresía queda activa.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-[0.86rem]">
              <input type="checkbox" name="comprobanteDespues" value="si" className="mt-1 h-4 w-4 accent-[var(--t-action)]" />
              <span className="text-muted">No tengo el comprobante ahora: lo adjunto después desde Comprobantes.</span>
            </label>
          </div>
        )}
      </section>

      <Aviso estado={estado} />
      <div className="flex flex-wrap items-center gap-3">
        <Enviar texto="Registrar socio" icono="plus" />
        <Link href={rutaDeFichas} className="h-12 px-4 py-3 text-[0.9rem] text-muted hover:text-ink">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export function EditarSocioForm({ slug, ficha }: { readonly slug: string; readonly ficha: FichaDeSocio }) {
  const [estado, accion] = useActionState(actualizarSocio, {});
  const valores = estado.valores ?? {
    nombre: ficha.firstName,
    apellido: ficha.lastName,
    documento: ficha.documentId ?? '',
    telefono: ficha.phone ?? '',
    correo: ficha.email ?? '',
    nacimiento: ficha.birthDate ?? '',
    nota: ficha.notes ?? '',
  };
  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="customerId" value={ficha.id} />
      <CamposPersonales valores={valores} errores={estado.errores ?? {}} />
      <Aviso estado={estado} />
      <div>
        <Enviar texto="Guardar cambios" icono="edit" />
      </div>
    </form>
  );
}

interface VenderMembresiaFormProps {
  readonly slug: string;
  readonly customerId: string;
  readonly planes: readonly PlanVendible[];
  readonly planActual?: string | null;
  readonly finActual?: string | null;
}

export function VenderMembresiaForm({ slug, customerId, planes, planActual, finActual }: VenderMembresiaFormProps) {
  const [estado, accion] = useActionState(venderMembresia, {});
  const inicial = planes.find((p) => p.id === planActual) ?? planes[0];
  const [planId, setPlanId] = useState(inicial?.id ?? '');
  const [metodo, setMetodo] = useState<MetodoDePago>('cash');
  const [monto, setMonto] = useState(String(inicial?.price ?? ''));
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="venta-plan" etiqueta="Plan" error={errores.planId} obligatorio>
          <select
            name="planId"
            value={planId}
            onChange={(evento) => {
              setPlanId(evento.target.value);
              const elegido = planes.find((p) => p.id === evento.target.value);
              if (elegido) setMonto(String(elegido.price));
            }}
            className={CLASE_DE_CONTROL}
          >
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {importe(p.price, p.currency)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          id="venta-inicio"
          etiqueta="Empieza"
          error={errores.inicio}
          ayuda={finActual ? `Vacío: al día siguiente de que venza la actual (${fechaCorta(finActual)}).` : 'Vacío: hoy.'}
        >
          <input name="inicio" type="date" className={CLASE_DE_CONTROL} />
        </Campo>
      </div>
      <SelectorDeMetodo nombre="metodo" valor={metodo} alCambiar={setMetodo} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="venta-monto" etiqueta="Importe cobrado (Bs)" error={errores.monto}>
          <input name="monto" inputMode="decimal" value={monto} onChange={(evento) => setMonto(evento.target.value)} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="venta-nota" etiqueta="Nota">
          <input name="nota" maxLength={500} placeholder="Descuento, promoción…" className={CLASE_DE_CONTROL} />
        </Campo>
      </div>
      <Aviso estado={estado} />
      <div>
        <Enviar texto="Registrar venta" icono="wallet" />
      </div>
    </form>
  );
}

interface EditarMembresiaFormProps {
  readonly slug: string;
  readonly membershipId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: string;
}

export function EditarMembresiaForm({ slug, membershipId, startDate, endDate, status }: EditarMembresiaFormProps) {
  const [estado, accion] = useActionState(actualizarMembresia, {});
  const errores = estado.errores ?? {};
  const estadoInicial = status === 'suspended' || status === 'cancelled' ? status : 'active';
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id={`mem-inicio-${membershipId}`} etiqueta="Inicio" error={errores.inicio}>
          <input name="inicio" type="date" defaultValue={startDate} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id={`mem-fin-${membershipId}`} etiqueta="Fin" error={errores.fin}>
          <input name="fin" type="date" defaultValue={endDate} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id={`mem-estado-${membershipId}`} etiqueta="Estado" error={errores.estado}>
          <select name="estado" defaultValue={estadoInicial} className={CLASE_DE_CONTROL}>
            <option value="active">Activa</option>
            <option value="suspended">Suspendida</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </Campo>
      </div>
      <Aviso estado={estado} />
      <div>
        <Enviar texto="Guardar membresía" icono="edit" />
      </div>
    </form>
  );
}
