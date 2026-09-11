'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Contenido de la ventana «Pagar con QR». Pide los datos vigentes del PLAN al
 * montarse —la ventana lo monta al abrirse— y enseña el QR que corresponde:
 * el propio del plan o el general, según lo que configuró gerencia.
 *
 * El precio que se enseña es el de la base cuando responde (es contra el que
 * se aprueba el comprobante), y se pide pagar exactamente eso: un pago menor no
 * activa el plan y no hay «completar después».
 */

import { useEffect, useState } from 'react';
import type { PaymentQrInfo } from '@core/domain/tenant/tenant-config';
import { fechaLarga, importe } from '@/lib/formato';
import { LinkButton } from '../ui/Button';
import { Icon } from '../icons/Icon';

/** Forma de la respuesta de `/[tenant]/pago/datos`. */
export interface DatosPublicosDeCobro {
  readonly disponible: boolean;
  readonly vencido: boolean;
  readonly titular: string | null;
  readonly banco: string | null;
  readonly nota: string | null;
  readonly vence: string | null;
  readonly imagen: string | null;
  readonly origen: 'plan' | 'general' | null;
  readonly montoExacto: number | null;
  readonly plan: { readonly codigo: string | null; readonly nombre: string; readonly precio: number; readonly moneda: string } | null;
}

interface ContenidoDePagoQrProps {
  readonly slug: string;
  readonly codigoDePlan: string;
  /** Precio de la página pública; se reemplaza por el de la base si responde. */
  readonly precio: string;
  /** Datos de la configuración, por si la base no responde. */
  readonly respaldo: PaymentQrInfo;
  readonly whatsappHref: string;
  readonly gimnasio: string;
}

const PASOS = [
  { icono: 'qr', texto: 'Escanea el QR con la app de tu banco y paga el importe.' },
  { icono: 'upload', texto: 'Sube la captura del comprobante desde tu panel de socio.' },
  { icono: 'check', texto: 'Recepción lo verifica y tu plan se activa.' },
] as const;

export function ContenidoDePagoQr({ slug, codigoDePlan, precio, respaldo, whatsappHref, gimnasio }: ContenidoDePagoQrProps) {
  const [datos, setDatos] = useState<DatosPublicosDeCobro | null>(null);
  const [fallo, setFallo] = useState(false);
  const [imagenRota, setImagenRota] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetch(`/${slug}/pago/datos?plan=${encodeURIComponent(codigoDePlan)}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject(new Error(String(respuesta.status)))))
      .then((cuerpo: DatosPublicosDeCobro) => {
        if (vigente) setDatos(cuerpo);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });
    return () => {
      vigente = false;
    };
  }, [slug, codigoDePlan]);

  const titular = datos?.titular ?? respaldo.holder ?? null;
  const banco = datos?.banco ?? respaldo.bank ?? null;
  const nota = datos?.nota ?? respaldo.note ?? null;
  const conQr = Boolean(datos?.disponible && datos.imagen) && !imagenRota;
  const precioVigente = datos?.plan ? importe(datos.plan.precio, datos.plan.moneda) : precio;

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[2.1rem] font-bold leading-none text-action">{precioVigente}</p>
        {conQr && datos && (
          <p className="max-w-[36ch] text-[0.8rem] leading-relaxed text-muted">
            {datos.montoExacto !== null
              ? 'Este QR ya trae el importe: solo confirma el pago en tu app.'
              : `Escribe exactamente ${precioVigente} en tu app. Un pago menor no activa el plan.`}
          </p>
        )}
      </div>

      {/* El hueco tiene la medida final del QR: al cargar, la ventana no salta. */}
      <div className="grid h-[15.5rem] w-[15.5rem] place-items-center overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-white p-3">
        {!datos && !fallo && <span className="h-full w-full animate-pulse rounded bg-neutral-200" aria-label="Cargando el QR" />}
        {conQr && datos?.imagen && (
          <img
            src={datos.imagen}
            alt={`Código QR para pagar en ${gimnasio}`}
            width={240}
            height={240}
            className="h-full w-full object-contain"
            onError={() => setImagenRota(true)}
          />
        )}
        {(fallo || (datos && !conQr)) && (
          <span className="flex flex-col items-center gap-2 px-5 text-[0.8rem] leading-relaxed text-neutral-600">
            <Icon name={datos?.vencido ? 'alert' : 'qr'} size={28} />
            {datos?.vencido
              ? 'El QR de cobro está vencido. Paga en recepción mientras el gimnasio lo renueva.'
              : `${gimnasio} todavía no publicó su QR de cobro. Puedes pagar en recepción.`}
          </span>
        )}
      </div>

      {(titular || banco) && (
        <p className="text-[0.88rem] text-ink">
          {titular && (
            <>
              <span className="text-muted">A nombre de </span>
              <strong className="font-semibold">{titular}</strong>
            </>
          )}
          {banco && <span className="text-muted"> · {banco}</span>}
        </p>
      )}
      {datos?.vence && !datos.vencido && <p className="-mt-3 text-[0.78rem] text-muted">QR válido hasta el {fechaLarga(datos.vence)}</p>}
      {nota && <p className="max-w-[40ch] text-[0.85rem] leading-relaxed text-muted">{nota}</p>}

      <ol className="flex w-full flex-col gap-2 text-start">
        {PASOS.map((paso, indice) => (
          <li key={paso.icono} className="flex items-start gap-3 rounded-[var(--t-radius-md)] bg-raised px-3.5 py-2.5 text-[0.84rem] text-ink">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-action text-[0.72rem] font-bold text-on-action">{indice + 1}</span>
            {paso.texto}
          </li>
        ))}
      </ol>

      <div className="flex w-full flex-col gap-2.5">
        <LinkButton href={`/${slug}/panel/socio?pagar=${encodeURIComponent(codigoDePlan)}`} variant="primary" size="md" icon="upload" iconPosition="start" fullWidth>
          Ya pagué: subir comprobante
        </LinkButton>
        <LinkButton href={whatsappHref} external variant="secondary" size="md" icon="whatsapp" iconPosition="start" fullWidth>
          Consultar por WhatsApp
        </LinkButton>
      </div>
    </div>
  );
}
