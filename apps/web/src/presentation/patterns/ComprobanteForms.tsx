'use client';

/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Formularios de comprobantes: adjuntar (personal o socio), revisar, y la
 * descarga de varios en un ZIP.
 */

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { importe } from '@/lib/formato';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import {
  revisarComprobante,
  subirComprobante,
  subirMiComprobante,
} from '@/app/[tenant]/panel/comprobantes/actions';
import type { PlanVendible } from '@core/domain/operations/members';
import { importeDeTexto, NOMBRE_DE_METODO_DE_PAGO, METODOS_DE_PAGO } from '@core/domain/operations/members';
import { evaluarImporte } from '@core/domain/operations/cobro-qr';
import type { DatosPublicosDeCobro } from './ContenidoDePagoQr';
import { nombreEnZip, type Comprobante } from '@core/domain/operations/receipts';
import { aCsv } from '@core/domain/operations/reports';
import { crearZip } from '@/lib/zip';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon } from '../icons/Icon';
import { SelectorDeImagen } from './SelectorDeImagen';

function Enviar({ texto, icono = 'upload' }: { readonly texto: string; readonly icono?: 'upload' | 'check' }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-6 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : icono} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Subiendo…' : texto}
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

interface SubirComprobanteFormProps {
  readonly slug: string;
  /** `socio`: el propio socio desde su panel. `personal`: recepción o gerencia. */
  readonly modo: 'socio' | 'personal';
  readonly planes: readonly PlanVendible[];
  /** Socio ya elegido (desde su ficha). Si falta en modo personal, se elige de `socios`. */
  readonly customerId?: string;
  readonly socios?: readonly { readonly id: string; readonly etiqueta: string }[];
  readonly planSugerido?: string;
}

export function SubirComprobanteForm({ slug, modo, planes, customerId, socios = [], planSugerido }: SubirComprobanteFormProps) {
  const [estado, accion] = useActionState(modo === 'socio' ? subirMiComprobante : subirComprobante, {});
  const [planId, setPlanId] = useState(planSugerido ?? '');
  const [monto, setMonto] = useState(() => {
    const plan = planes.find((p) => p.id === planSugerido);
    return plan ? String(plan.price) : '';
  });
  // Tras un envío correcto se vuelve a montar el formulario limpio: la imagen
  // de un comprobante no debe quedar cargada para el siguiente socio.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (estado.exito) setVersion((v) => v + 1);
  }, [estado.exito]);

  const errores = estado.errores ?? {};
  const planElegido = planes.find((p) => p.id === planId) ?? null;
  const montoEscrito = importeDeTexto(monto);
  const faltaImporte = Boolean(planElegido && montoEscrito !== null && evaluarImporte(planElegido.price, montoEscrito) === 'insuficiente');

  return (
    <form key={version} action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      {customerId && <input type="hidden" name="customerId" value={customerId} />}

      {modo === 'socio' && <QrDelPlan slug={slug} codigoDePlan={planElegido?.code ?? null} />}

      {modo === 'personal' && !customerId && (
        <Campo id="comp-socio" etiqueta="Socio" error={errores.customerId} obligatorio>
          <select name="customerId" defaultValue="" className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Elige al socio
            </option>
            {socios.map((socio) => (
              <option key={socio.id} value={socio.id}>
                {socio.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="comp-plan"
          etiqueta={modo === 'socio' ? 'Plan que pagas' : 'Plan propuesto'}
          error={errores.planId}
          ayuda="Al aprobarse, se activa este plan."
        >
          <select
            name="planId"
            value={planId}
            onChange={(evento) => {
              setPlanId(evento.target.value);
              const plan = planes.find((p) => p.id === evento.target.value);
              if (plan) setMonto(String(plan.price));
            }}
            className={CLASE_DE_CONTROL}
          >
            <option value="">Sin plan (otro concepto)</option>
            {planes.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {importe(plan.price, plan.currency)}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          id="comp-monto"
          etiqueta="Importe pagado (Bs)"
          error={errores.monto}
          ayuda={planElegido ? `Precio del plan: ${importe(planElegido.price, planElegido.currency)}.` : undefined}
          obligatorio
        >
          <input
            name="monto"
            inputMode="decimal"
            value={monto}
            onChange={(evento) => setMonto(evento.target.value)}
            placeholder="160"
            aria-invalid={faltaImporte}
            className={CLASE_DE_CONTROL}
          />
        </Campo>
      </div>
      {faltaImporte && planElegido && (
        <p role="alert" className="-mt-2 text-[0.8rem] text-structural">
          El importe es menor que el precio del plan ({importe(planElegido.price, planElegido.currency)}). Un pago incompleto no activa
          el plan: {modo === 'socio' ? 'paga el importe completo antes de enviar el comprobante.' : 'cobra el importe completo.'}
        </p>
      )}

      {modo === 'personal' && (
        <Campo id="comp-metodo" etiqueta="Método" error={errores.metodo}>
          <select name="metodo" defaultValue="qr" className={CLASE_DE_CONTROL}>
            {METODOS_DE_PAGO.map((metodo) => (
              <option key={metodo} value={metodo}>
                {NOMBRE_DE_METODO_DE_PAGO[metodo]}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <SelectorDeImagen id="comp-imagen" nombre="comprobante" obligatorio />
      {errores.comprobante && <p role="alert" className="-mt-2 text-[0.8rem] text-structural">{errores.comprobante}</p>}

      <Campo id="comp-nota" etiqueta="Nota (opcional)" error={errores.nota}>
        <input name="nota" maxLength={500} placeholder={modo === 'socio' ? 'Ej. pagué desde la cuenta de mi hermano' : 'Referencia, número de operación…'} className={CLASE_DE_CONTROL} />
      </Campo>

      {modo === 'personal' && (
        <label className="flex items-start gap-3 rounded-[var(--t-radius-md)] border border-line px-4 py-3 text-[0.86rem] text-ink">
          <input type="checkbox" name="verificado" value="si" className="mt-1 h-4 w-4 accent-[var(--t-action)]" />
          <span>
            <strong className="block">Ya verifiqué el depósito en el banco</strong>
            <span className="text-muted">Se aprueba al momento: registra el cobro y activa el plan.</span>
          </span>
        </label>
      )}

      <Aviso estado={estado} />
      <Enviar texto={modo === 'socio' ? 'Enviar comprobante' : 'Adjuntar comprobante'} />
    </form>
  );
}

/**
 * QR con el que se paga el plan elegido, pedido a `/pago/datos` (la misma
 * elección que la página de planes): si gerencia configuró un QR por plan, al
 * cambiar de plan cambia el QR.
 */
function QrDelPlan({ slug, codigoDePlan }: { readonly slug: string; readonly codigoDePlan: string | null }) {
  const [datos, setDatos] = useState<DatosPublicosDeCobro | null>(null);
  const [imagenRota, setImagenRota] = useState(false);

  useEffect(() => {
    let vigente = true;
    setImagenRota(false);
    const consulta = codigoDePlan ? `?plan=${encodeURIComponent(codigoDePlan)}` : '';
    fetch(`/${slug}/pago/datos${consulta}`)
      .then((respuesta) => (respuesta.ok ? (respuesta.json() as Promise<DatosPublicosDeCobro>) : null))
      .then((cuerpo) => {
        if (vigente) setDatos(cuerpo);
      })
      .catch(() => {
        if (vigente) setDatos(null);
      });
    return () => {
      vigente = false;
    };
  }, [slug, codigoDePlan]);

  const conQr = Boolean(datos?.disponible && datos.imagen) && !imagenRota;

  return (
    <div className="flex items-center gap-4 rounded-[var(--t-radius-md)] border border-line p-4">
      <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded bg-white p-1">
        {conQr && datos?.imagen ? (
          <img src={datos.imagen} alt="QR de cobro del plan elegido" className="h-full w-full object-contain" onError={() => setImagenRota(true)} />
        ) : (
          <Icon name="qr" size={30} className="text-neutral-500" />
        )}
      </div>
      <p className="text-[0.86rem] leading-relaxed text-muted">
        {conQr && datos
          ? datos.montoExacto !== null
            ? '1. Escanea este QR con la app de tu banco: ya trae el importe. 2. Confirma el pago. 3. Sube aquí la captura.'
            : `1. Escanea este QR con la app de tu banco. 2. Paga ${datos.plan ? `exactamente ${importe(datos.plan.precio, datos.plan.moneda)}` : 'el importe de tu plan'}. 3. Sube aquí la captura.`
          : datos?.vencido
            ? 'El QR de cobro está vencido. Paga en recepción mientras el gimnasio lo renueva.'
            : 'No hay un QR disponible para este pago. Puedes pagar en recepción.'}
      </p>
    </div>
  );
}

interface RevisarComprobanteProps {
  readonly slug: string;
  readonly receiptId: string;
  /** Importe que declaró quien subió el comprobante. */
  readonly declarado: number;
  /** Precio del plan fijado por la base al subirlo; `null` si no hay plan. */
  readonly esperado: number | null;
  readonly moneda: string;
}

/**
 * Aprobar o rechazar. Quien revisa escribe lo que VIO en el banco (por defecto,
 * lo declarado). Si llegó menos que el precio del plan, aprobar se desactiva:
 * no existe «aprobar y que complete después». La acción y la base lo repiten,
 * así que un botón habilitado a mano no cambia el resultado.
 */
export function RevisarComprobante({ slug, receiptId, declarado, esperado, moneda }: RevisarComprobanteProps) {
  const [estado, accion] = useActionState(revisarComprobante, {});
  const [rechazando, setRechazando] = useState(false);
  const [verificado, setVerificado] = useState(String(declarado));

  if (estado.exito) return <Aviso estado={estado} />;

  const monto = importeDeTexto(verificado);
  const evaluacion = monto === null ? null : evaluarImporte(esperado, monto);
  const insuficiente = evaluacion === 'insuficiente';

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="receiptId" value={receiptId} />

      {!rechazando && (
        <Campo
          id={`verificado-${receiptId}`}
          etiqueta="Importe que llegó al banco (Bs)"
          error={estado.errores?.montoVerificado}
          ayuda={esperado !== null ? `Precio del plan: ${importe(esperado, moneda)}.` : undefined}
        >
          <input
            name="montoVerificado"
            inputMode="decimal"
            value={verificado}
            onChange={(evento) => setVerificado(evento.target.value)}
            aria-invalid={insuficiente}
            className={CLASE_DE_CONTROL}
          />
        </Campo>
      )}
      {!rechazando && insuficiente && esperado !== null && monto !== null && (
        <p role="alert" className="text-[0.8rem] text-structural">
          Faltan {importe(esperado - monto, moneda)} para el precio del plan. No se puede aprobar: rechaza el comprobante con el motivo.
        </p>
      )}

      {rechazando && (
        <Campo id={`motivo-${receiptId}`} etiqueta="Motivo del rechazo" error={estado.errores?.nota} obligatorio>
          <input name="nota" maxLength={500} autoFocus placeholder="Ej. el importe no coincide con el plan" className={CLASE_DE_CONTROL} />
        </Campo>
      )}

      <div className="flex flex-wrap gap-2">
        {!rechazando ? (
          <>
            <button
              type="submit"
              name="decision"
              value="aprobar"
              disabled={insuficiente || monto === null}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-4 text-[0.86rem] font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
            >
              <Icon name="check" size={16} />
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setRechazando(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--t-radius-md)] border border-structural/50 px-4 text-[0.86rem] font-semibold text-structural transition-colors hover:bg-structural/10"
            >
              <Icon name="close" size={16} />
              Rechazar
            </button>
          </>
        ) : (
          <>
            <button
              type="submit"
              name="decision"
              value="rechazar"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-structural px-4 text-[0.86rem] font-semibold text-white"
            >
              Confirmar rechazo
            </button>
            <button type="button" onClick={() => setRechazando(false)} className="h-11 px-4 text-[0.86rem] text-muted hover:text-ink">
              Cancelar
            </button>
          </>
        )}
      </div>
      {estado.mensaje && <Aviso estado={estado} />}
    </form>
  );
}

interface DescargarZipProps {
  readonly slug: string;
  readonly comprobantes: readonly Comprobante[];
  readonly nombreArchivo: string;
}

/**
 * Descarga los comprobantes filtrados en un solo ZIP, armado en el navegador.
 *
 * Cada imagen viaja sola y el ZIP se junta aquí: las funciones de Vercel cortan
 * respuestas de más de 4,5 MB y un día de comprobantes lo supera. Dentro va
 * además un `resumen.csv` con socio, fecha, importe y estado de cada archivo,
 * que es lo que necesita el dueño de la cuenta para conciliar con su extracto.
 */
export function DescargarComprobantesZip({ slug, comprobantes, nombreArchivo }: DescargarZipProps) {
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [aviso, setAviso] = useState('');
  const total = useMemo(() => comprobantes.reduce((suma, c) => suma + c.amount, 0), [comprobantes]);

  const descargar = async () => {
    setAviso('');
    setProgreso({ hechos: 0, total: comprobantes.length });
    const entradas: { nombre: string; datos: Uint8Array; fecha: Date }[] = [];
    const filas: Record<string, string | number | null>[] = [];
    let fallidos = 0;
    let siguiente = 0;

    const trabajar = async () => {
      while (siguiente < comprobantes.length) {
        const indice = siguiente++;
        const c = comprobantes[indice];
        if (!c) continue;
        const nombre = nombreEnZip(c, indice);
        try {
          const respuesta = await fetch(`/${slug}/panel/comprobantes/${c.id}/imagen`, { credentials: 'same-origin' });
          if (!respuesta.ok) throw new Error(String(respuesta.status));
          entradas.push({ nombre, datos: new Uint8Array(await respuesta.arrayBuffer()), fecha: new Date(c.createdAt) });
          filas.push({ archivo: nombre, fecha: c.receiptDate, hora: c.createdLocal.slice(11, 16), socio: c.customerName, codigo: c.customerCode, plan: c.planName, importe: c.amount, estado: c.status });
        } catch {
          fallidos += 1;
          filas.push({ archivo: '(no se pudo descargar)', fecha: c.receiptDate, hora: c.createdLocal.slice(11, 16), socio: c.customerName, codigo: c.customerCode, plan: c.planName, importe: c.amount, estado: c.status });
        }
        setProgreso({ hechos: entradas.length + fallidos, total: comprobantes.length });
      }
    };

    // Tres descargas a la vez: más rápido que una a una sin saturar la
    // conexión del mostrador.
    await Promise.all([trabajar(), trabajar(), trabajar()]);

    entradas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    const resumen = aCsv(
      [
        { clave: 'archivo', titulo: 'Archivo' },
        { clave: 'fecha', titulo: 'Fecha' },
        { clave: 'hora', titulo: 'Hora' },
        { clave: 'socio', titulo: 'Socio' },
        { clave: 'codigo', titulo: 'Código' },
        { clave: 'plan', titulo: 'Plan' },
        { clave: 'importe', titulo: 'Importe' },
        { clave: 'estado', titulo: 'Estado' },
      ],
      filas.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))),
    );
    const zip = crearZip([...entradas, { nombre: 'resumen.csv', datos: new TextEncoder().encode(resumen), fecha: new Date() }]);

    const url = URL.createObjectURL(new Blob([new Uint8Array(zip).buffer as ArrayBuffer], { type: 'application/zip' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    setProgreso(null);
    setAviso(fallidos > 0 ? `ZIP listo, pero ${fallidos} imagen(es) no se pudieron descargar (anotado en resumen.csv).` : `ZIP listo: ${entradas.length} comprobantes.`);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={descargar}
        disabled={comprobantes.length === 0 || progreso !== null}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon name={progreso ? 'refresh' : 'download'} size={17} className={cn(progreso && 'animate-spin')} />
        {progreso
          ? `Descargando ${progreso.hechos} de ${progreso.total}…`
          : `Descargar ${comprobantes.length} en ZIP · ${importe(total)}`}
      </button>
      <p aria-live="polite" className="text-[0.8rem] text-muted">{aviso}</p>
    </div>
  );
}
