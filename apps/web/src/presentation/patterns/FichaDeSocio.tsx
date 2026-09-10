'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Ficha completa de un socio en una ventana, abierta desde cualquier fila.
 *
 * UNA SOLA VENTANA para toda la página. Una tabla de sesenta entradas con un
 * `<dialog>` por fila serían sesenta diálogos en el DOM y sesenta consultas
 * listas para dispararse. Aquí las filas piden «abre la ficha de X» a un
 * proveedor, y el proveedor carga los datos al abrir.
 *
 * Los datos llegan de `obtenerFichaCompleta`, que pasa por RLS: si quien mira
 * no puede ver ese socio, la ventana dice que no existe, no enseña un error.
 */

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fechaCorta, importe } from '@/lib/formato';
import {
  edad,
  NOMBRE_DE_ESTADO_DE_MEMBRESIA,
  NOMBRE_DE_METODO_DE_PAGO,
} from '@core/domain/operations/members';
import { NOMBRE_DE_ESTADO_DE_COMPROBANTE } from '@core/domain/operations/receipts';
import { obtenerFichaCompleta, type FichaCompleta } from '@/app/[tenant]/panel/socios/actions';
import { Dialogo } from '../ui/Modal';
import { Icon, type AnyIconKey } from '../icons/Icon';
import { RachaCalendario } from './RachaCalendario';

type Abrir = (customerId: string) => void;
const ContextoDeFicha = createContext<Abrir | null>(null);

interface FichaDeSocioProviderProps {
  readonly slug: string;
  /** Ruta de la ficha completa, si el gimnasio tiene gestión de socios. */
  readonly rutaDeFicha?: string;
  readonly children: ReactNode;
}

export function FichaDeSocioProvider({ slug, rutaDeFicha, children }: FichaDeSocioProviderProps) {
  const [id, setId] = useState<string | null>(null);
  const [datos, setDatos] = useState<FichaCompleta | null>(null);
  const [error, setError] = useState(false);
  const [cargando, iniciar] = useTransition();
  const pedido = useRef<string | null>(null);

  const abrir = useCallback((customerId: string) => {
    setId(customerId);
    setDatos(null);
    setError(false);
  }, []);

  useEffect(() => {
    if (!id) return;
    pedido.current = id;
    iniciar(async () => {
      try {
        const respuesta = await obtenerFichaCompleta(slug, id);
        // Si mientras cargaba se abrió OTRA ficha, esta respuesta llega tarde y
        // se descarta: sin esto, la ventana de Ana podría rellenarse con Juan.
        if (pedido.current !== id) return;
        if (respuesta) setDatos(respuesta);
        else setError(true);
      } catch {
        if (pedido.current === id) setError(true);
      }
    });
  }, [id, slug]);

  return (
    <ContextoDeFicha.Provider value={abrir}>
      {children}
      <Dialogo
        abierto={id !== null}
        alCerrar={() => {
          pedido.current = null;
          setId(null);
        }}
        titulo={datos ? datos.ficha.fullName : 'Ficha del socio'}
        descripcion={datos ? [datos.ficha.code, datos.ficha.planName].filter(Boolean).join(' · ') : undefined}
        anchoMaximo="xl"
      >
        {cargando && !datos && <EsqueletoDeFicha />}
        {error && (
          <p className="py-10 text-center text-[0.9rem] text-muted">
            No se encontró esta ficha, o tu cuenta no puede verla.
          </p>
        )}
        {datos && <ContenidoDeFicha datos={datos} slug={slug} rutaDeFicha={rutaDeFicha} />}
      </Dialogo>
    </ContextoDeFicha.Provider>
  );
}

interface BotonFichaProps {
  readonly customerId: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Nombre de socio pulsable. Un `<button>` de verdad —Tab, Enter, Espacio— y
 * con un pseudo-elemento que cubre la fila entera: se puede pulsar en
 * cualquier parte de la fila sin que la fila deje de ser una fila de tabla.
 */
export function BotonFicha({ customerId, children, className }: BotonFichaProps) {
  const abrir = useContext(ContextoDeFicha);
  if (!abrir) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => abrir(customerId)}
      className={cn(
        'text-start font-medium text-ink underline-offset-4 hover:text-action hover:underline',
        'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-action',
        className,
      )}
    >
      {children}
    </button>
  );
}

function EsqueletoDeFicha() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-2" aria-label="Cargando la ficha">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="h-40 rounded-[var(--t-radius-md)] bg-raised" />
      ))}
    </div>
  );
}

function Dato({ etiqueta, children }: { readonly etiqueta: string; readonly children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 py-2 last:border-0">
      <dt className="text-[0.82rem] text-muted">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-end text-[0.86rem] text-ink">{children || '—'}</dd>
    </div>
  );
}

function Bloque({ titulo, icono, children }: { readonly titulo: string; readonly icono: AnyIconKey; readonly children: ReactNode }) {
  return (
    <section className="rounded-[var(--t-radius-md)] border border-line bg-raised/40 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted">
        <Icon name={icono} size={15} className="text-action" />
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function ContenidoDeFicha({ datos, slug, rutaDeFicha }: { readonly datos: FichaCompleta; readonly slug: string; readonly rutaDeFicha?: string }) {
  const { ficha, membresias, pagos, comprobantes, racha, hoy } = datos;
  const años = edad(ficha.birthDate, hoy);
  const estado = ficha.membershipStatus ? NOMBRE_DE_ESTADO_DE_MEMBRESIA[ficha.membershipStatus] : 'Sin membresía';
  const telefono = ficha.phone?.replace(/[^\d+]/g, '');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.12em]',
            ficha.membershipStatus === 'active' && 'bg-action text-on-action',
            ficha.membershipStatus === 'expiring_soon' && 'bg-structural text-white',
            (!ficha.membershipStatus || ficha.membershipStatus === 'expired') && 'border border-line text-muted',
          )}
        >
          {estado}
        </span>
        {ficha.archivedAt && <span className="rounded-full border border-structural/50 px-3 py-1 text-[0.72rem] text-structural">Archivado</span>}
        {ficha.pendingReceipts > 0 && (
          <span className="rounded-full border border-line px-3 py-1 text-[0.72rem] text-muted">
            {ficha.pendingReceipts} comprobante{ficha.pendingReceipts === 1 ? '' : 's'} pendiente{ficha.pendingReceipts === 1 ? '' : 's'}
          </span>
        )}
        <div className="ms-auto flex flex-wrap gap-2">
          {telefono && (
            <a
              href={`https://wa.me/${telefono.replace('+', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[var(--t-radius-md)] border border-line px-3 text-[0.82rem] text-ink transition-colors hover:border-action hover:text-action"
            >
              <Icon name="whatsapp" size={15} />
              WhatsApp
            </a>
          )}
          {rutaDeFicha && (
            <Link
              href={`${rutaDeFicha}/${ficha.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-3 text-[0.82rem] font-semibold text-on-action transition-colors hover:bg-action-strong"
            >
              <Icon name="idcard" size={15} />
              Ficha completa
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Bloque titulo="Datos personales" icono="idcard">
          <dl>
            <Dato etiqueta="Código">{ficha.code}</Dato>
            <Dato etiqueta="Documento">{ficha.documentId}</Dato>
            <Dato etiqueta="Teléfono">{ficha.phone}</Dato>
            <Dato etiqueta="Correo">{ficha.email}</Dato>
            <Dato etiqueta="Nacimiento">{ficha.birthDate ? `${fechaCorta(ficha.birthDate)} ${ficha.birthDate.slice(0, 4)}${años !== null ? ` · ${años} años` : ''}` : ''}</Dato>
            <Dato etiqueta="Socio desde">{fechaCorta(ficha.createdAt.slice(0, 10))} {ficha.createdAt.slice(0, 4)}</Dato>
            <Dato etiqueta="Cuenta web">
              {ficha.hasAccount === null ? 'No visible' : ficha.hasAccount ? ficha.accountEmail ?? 'Vinculada' : 'Sin cuenta'}
            </Dato>
          </dl>
          {ficha.notes && <p className="mt-3 rounded-[var(--t-radius-sm)] bg-raised px-3 py-2 text-[0.82rem] text-muted">{ficha.notes}</p>}
        </Bloque>

        <Bloque titulo="Membresía" icono="shield">
          {ficha.membershipId ? (
            <dl>
              <Dato etiqueta="Plan">{ficha.planName}</Dato>
              <Dato etiqueta="Inicio">{fechaCorta(ficha.startDate)}</Dato>
              <Dato etiqueta="Vence">{fechaCorta(ficha.endDate)}</Dato>
              <Dato etiqueta="Días restantes">{ficha.daysRemaining !== null ? String(Math.max(ficha.daysRemaining, 0)) : ''}</Dato>
              <Dato etiqueta="Precio">{ficha.membershipPrice !== null ? importe(ficha.membershipPrice) : ''}</Dato>
              <Dato etiqueta="Total pagado">{importe(ficha.totalPaid)}</Dato>
            </dl>
          ) : (
            <p className="text-[0.86rem] text-muted">No tiene membresía registrada.</p>
          )}
        </Bloque>

        <Bloque titulo="Constancia" icono="fire">
          <dl className="mb-4">
            <Dato etiqueta="Visitas totales">{String(ficha.totalVisits)}</Dato>
            <Dato etiqueta="Últimos 30 días">{String(ficha.visits30d)}</Dato>
            <Dato etiqueta="Última visita">{fechaCorta(ficha.lastVisit)}</Dato>
          </dl>
          <RachaCalendario racha={racha} compacto />
        </Bloque>

        <Bloque titulo="Historial" icono="layers">
          <ul className="flex flex-col gap-2 text-[0.84rem]">
            {membresias.slice(0, 4).map((m) => (
              <li key={m.id} className="flex justify-between gap-3">
                <span className="text-ink">{m.planName ?? 'Plan'}</span>
                <span className="text-muted">
                  {fechaCorta(m.startDate)} → {fechaCorta(m.endDate)} · {NOMBRE_DE_ESTADO_DE_MEMBRESIA[m.status]}
                </span>
              </li>
            ))}
            {membresias.length === 0 && <li className="text-muted">Sin membresías.</li>}
          </ul>
          {pagos.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">Últimos pagos</p>
              <ul className="flex flex-col gap-2 text-[0.84rem]">
                {pagos.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="text-muted">{fechaCorta(p.paidDate)} · {NOMBRE_DE_METODO_DE_PAGO[p.method]}</span>
                    <span className="font-semibold text-ink">{importe(p.amount, p.currency)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {comprobantes.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">Comprobantes</p>
              <ul className="flex flex-col gap-2 text-[0.84rem]">
                {comprobantes.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <a
                      href={`/${slug}/panel/comprobantes/${c.id}/imagen`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-action underline-offset-4 hover:underline"
                    >
                      {fechaCorta(c.receiptDate)} · {importe(c.amount, c.currency)}
                    </a>
                    <span className="text-muted">{NOMBRE_DE_ESTADO_DE_COMPROBANTE[c.status]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Bloque>
      </div>
    </div>
  );
}
