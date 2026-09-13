'use client';

/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Formularios de reservas (V3.4): el botón de reservar de una sesión, cancelar,
 * las reglas del gimnasio, reservar para un socio desde el mostrador y marcar
 * que vino quien reservó.
 *
 * El botón es lo que el socio aprieta desde el celular. Dice ANTES qué va a
 * pasar —«Reservar», «Entrar en lista de espera», «Se abre el jueves a las
 * 07:00», «cancelar ahora cuenta como falta»—, con lo que calcula el servidor;
 * la base vuelve a decidirlo al enviar.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { buscarSociosParaSesion, registrarAsistenciaAClase, type EstadoDeBusqueda } from '@/app/[tenant]/panel/clases/actions';
import { cancelarReserva, guardarAjustesDeReserva, reservarClase } from '@/app/[tenant]/panel/clases/reservas-actions';
import { NOMBRE_DE_MOTIVO_DE_ACCESO } from '@core/domain/operations/classes';
import { textoDePosicion, type AjustesDeReserva, type ResultadoDeReservar } from '@core/domain/operations/reservations';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon, type AnyIconKey } from '../icons/Icon';

const CASILLA = 'h-5 w-5 accent-[var(--t-action)]';

function Enviar({
  texto,
  icono = 'check',
  variante = 'primario',
}: {
  readonly texto: string;
  readonly icono?: AnyIconKey;
  readonly variante?: 'primario' | 'secundario' | 'peligro';
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-[var(--t-radius-md)] px-4 text-[0.86rem] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
        variante === 'primario' && 'bg-action text-on-action hover:bg-action-strong',
        variante === 'secundario' && 'border border-line text-ink hover:border-action hover:text-action',
        variante === 'peligro' && 'border border-structural/50 text-structural hover:bg-structural/10',
      )}
    >
      <Icon name={pending ? 'refresh' : icono} size={16} className={cn(pending && 'animate-spin')} />
      {pending ? 'Un momento…' : texto}
    </button>
  );
}

function Resultado({ estado }: { readonly estado: EstadoDeFormulario }) {
  if (!estado.exito && !estado.mensaje) return null;
  return (
    <p role="status" className={cn('text-[0.8rem]', estado.exito ? 'text-action' : 'text-structural')}>
      {estado.exito ?? estado.mensaje}
    </p>
  );
}

// ------------------------------------------------------------------ cancelar

export function CancelarReserva({
  slug,
  reservationId,
  tardia,
  etiqueta = 'Cancelar reserva',
}: {
  readonly slug: string;
  readonly reservationId: string;
  /** Cancelar ahora cuenta como falta (lo calcula el servidor con la hora del gimnasio). */
  readonly tardia: boolean;
  readonly etiqueta?: string;
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(cancelarReserva, {});
  if (estado.exito) return <Resultado estado={estado} />;
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        const pregunta = tardia
          ? 'Falta poco para que empiece: cancelar ahora cuenta como cancelación tardía. ¿Cancelar igual?'
          : '¿Cancelar la reserva? El lugar queda libre para otra persona.';
        if (!window.confirm(pregunta)) e.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="reservationId" value={reservationId} />
      <Enviar texto={etiqueta} icono="close" variante="peligro" />
      {tardia && <span className="text-[0.74rem] text-structural">Cuenta como cancelación tardía</span>}
      <Resultado estado={estado} />
    </form>
  );
}

// ------------------------------------------------------------------ botón de reserva de una sesión

export interface EstadoDeReservaDeSesion {
  readonly sessionId: string;
  readonly miReservaId: string | null;
  readonly miReservaEstado: string | null;
  readonly miPosicion: number | null;
  /** `abierta`, `no_abierta` o `cerrada`, calculado con la hora del gimnasio. */
  readonly ventana: 'abierta' | 'no_abierta' | 'cerrada';
  /** Texto de la apertura («jue 17 · 07:00»). */
  readonly abreTexto: string;
  readonly prevision: ResultadoDeReservar;
  readonly cancelacionTardia: boolean;
  readonly bloqueadoHasta: string | null;
  readonly limiteAlcanzado: boolean;
}

export function BotonDeReserva({ slug, e }: { readonly slug: string; readonly e: EstadoDeReservaDeSesion }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(reservarClase, {});

  if (e.miReservaEstado === 'asistio') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--t-radius-sm)] bg-action/15 px-3 py-1.5 text-[0.82rem] font-semibold text-action">
        <Icon name="check" size={15} /> Asististe
      </span>
    );
  }

  if (e.miReservaId && (e.miReservaEstado === 'reservada' || e.miReservaEstado === 'en_espera')) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[var(--t-radius-sm)] px-3 py-1.5 text-[0.82rem] font-semibold',
            e.miReservaEstado === 'reservada' ? 'bg-action/15 text-action' : 'bg-structural/15 text-structural',
          )}
        >
          <Icon name={e.miReservaEstado === 'reservada' ? 'check' : 'clock'} size={15} />
          {e.miReservaEstado === 'reservada' ? 'Tienes tu lugar' : textoDePosicion(e.miPosicion)}
        </span>
        {e.ventana !== 'cerrada' || e.miReservaEstado === 'en_espera' ? (
          <CancelarReserva
            slug={slug}
            reservationId={e.miReservaId}
            tardia={e.cancelacionTardia}
            etiqueta={e.miReservaEstado === 'en_espera' ? 'Salir de la espera' : 'Cancelar'}
          />
        ) : null}
      </div>
    );
  }

  if (estado.exito) return <Resultado estado={estado} />;

  if (e.bloqueadoHasta) {
    return <span className="max-w-[14rem] text-end text-[0.78rem] text-structural">Reservas bloqueadas hasta el {e.bloqueadoHasta.split('-').reverse().join('/')}</span>;
  }
  if (e.ventana === 'no_abierta') return <span className="text-end text-[0.78rem] text-muted">Reserva desde {e.abreTexto}</span>;
  if (e.ventana === 'cerrada') return <span className="text-end text-[0.78rem] text-muted">Reservas cerradas</span>;
  if (e.prevision === 'llena') return <span className="text-end text-[0.78rem] text-structural">Llena</span>;
  if (e.limiteAlcanzado) return <span className="max-w-[14rem] text-end text-[0.78rem] text-muted">Llegaste al máximo de reservas activas</span>;

  return (
    <form action={accion} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="sessionId" value={e.sessionId} />
      <Enviar texto={e.prevision === 'en_espera' ? 'Entrar en lista de espera' : 'Reservar'} icono={e.prevision === 'en_espera' ? 'clock' : 'plus'} variante={e.prevision === 'en_espera' ? 'secundario' : 'primario'} />
      <Resultado estado={estado} />
    </form>
  );
}

// ------------------------------------------------------------------ reglas del gimnasio

export function AjustesDeReservaForm({ slug, ajustes }: { readonly slug: string; readonly ajustes: AjustesDeReserva }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarAjustesDeReserva, {});
  const errores = estado.errores ?? {};
  const v = estado.valores ?? {
    openDaysBefore: String(ajustes.openDaysBefore),
    closeMinutesBefore: String(ajustes.closeMinutesBefore),
    cancelMinutesBefore: String(ajustes.cancelMinutesBefore),
    maxActive: String(ajustes.maxActive),
    waitlistMax: String(ajustes.waitlistMax),
    noShowLimit: String(ajustes.noShowLimit),
    noShowWindowDays: String(ajustes.noShowWindowDays),
    blockDays: String(ajustes.blockDays),
  };

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-[0.84rem] font-semibold text-ink">Cuándo se reserva</legend>
        <Campo id="aj-apertura" etiqueta="Se abre (días antes)" error={errores.openDaysBefore} obligatorio>
          <input name="openDaysBefore" inputMode="numeric" defaultValue={v.openDaysBefore} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="aj-cierre" etiqueta="Se cierra (min antes)" error={errores.closeMinutesBefore} ayuda="0 = al empezar.">
          <input name="closeMinutesBefore" inputMode="numeric" defaultValue={v.closeMinutesBefore} maxLength={4} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="aj-maximo" etiqueta="Reservas activas por socio" error={errores.maxActive} obligatorio>
          <input name="maxActive" inputMode="numeric" defaultValue={v.maxActive} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-[0.84rem] font-semibold text-ink">Cancelaciones y faltas</legend>
        <Campo id="aj-cancelacion" etiqueta="Cancelación libre hasta (min antes)" error={errores.cancelMinutesBefore} ayuda="Después cuenta como cancelación tardía.">
          <input name="cancelMinutesBefore" inputMode="numeric" defaultValue={v.cancelMinutesBefore} maxLength={4} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="aj-faltas" etiqueta="Faltas que bloquean" error={errores.noShowLimit} obligatorio>
          <input name="noShowLimit" inputMode="numeric" defaultValue={v.noShowLimit} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="aj-ventana" etiqueta="En cuántos días" error={errores.noShowWindowDays} obligatorio>
          <input name="noShowWindowDays" inputMode="numeric" defaultValue={v.noShowWindowDays} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="aj-bloqueo" etiqueta="Días de bloqueo" error={errores.blockDays} ayuda="0 = nunca bloquear.">
          <input name="blockDays" inputMode="numeric" defaultValue={v.blockDays} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
        <label className="flex min-h-11 items-center gap-3 text-[0.9rem] text-ink sm:col-span-2">
          <input type="checkbox" name="lateCancelCounts" defaultChecked={ajustes.lateCancelCounts} className={CASILLA} />
          La cancelación tardía cuenta como falta
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-[0.84rem] font-semibold text-ink">Lista de espera</legend>
        <label className="flex min-h-11 items-center gap-3 text-[0.9rem] text-ink">
          <input type="checkbox" name="waitlistEnabled" defaultChecked={ajustes.waitlistEnabled} className={CASILLA} />
          Usar lista de espera cuando la clase se llena
        </label>
        <Campo id="aj-espera" etiqueta="Máximo en espera por sesión" error={errores.waitlistMax}>
          <input name="waitlistMax" inputMode="numeric" defaultValue={v.waitlistMax} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
      </fieldset>

      {(estado.exito || estado.mensaje) && (
        <p role="status" className={cn('rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.88rem] text-ink', estado.exito ? 'border-action/40 bg-action/10' : 'border-structural/50 bg-structural/10')}>
          {estado.exito ?? estado.mensaje}
        </p>
      )}
      <div className="flex justify-end">
        <Enviar texto="Guardar reglas" />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ mostrador

function ReservarCandidato({ slug, sessionId, customerId, nombre, detalle, habilitado, motivo, yaRegistrado }: {
  readonly slug: string;
  readonly sessionId: string;
  readonly customerId: string;
  readonly nombre: string;
  readonly detalle: string;
  readonly habilitado: boolean;
  readonly motivo: string;
  readonly yaRegistrado: boolean;
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(reservarClase, {});
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--t-radius-md)] border border-line px-4 py-3">
      <span className="flex min-w-0 flex-col">
        <span className="font-medium text-ink">{nombre}</span>
        <span className="text-[0.78rem] text-muted">{detalle}</span>
      </span>
      {yaRegistrado ? (
        <span className="text-[0.8rem] text-muted">Ya asistió</span>
      ) : !habilitado ? (
        <span className="text-[0.8rem] text-structural">{motivo}</span>
      ) : estado.exito ? (
        <span className="text-[0.8rem] font-semibold text-action">{estado.exito}</span>
      ) : (
        <form action={accion} className="flex flex-col items-end gap-1">
          <input type="hidden" name="tenantSlug" value={slug} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="customerId" value={customerId} />
          <Enviar texto="Reservar" icono="plus" />
          {estado.mensaje && <span className="max-w-[16rem] text-end text-[0.76rem] text-structural">{estado.mensaje}</span>}
        </form>
      )}
    </li>
  );
}

/** Reservar para un socio desde el mostrador (una llamada, alguien que pregunta por un lugar). */
export function ReservarParaSocio({ slug, sessionId }: { readonly slug: string; readonly sessionId: string }) {
  const [estado, buscar] = useActionState<EstadoDeBusqueda, FormData>(buscarSociosParaSesion, {});
  return (
    <div className="flex flex-col gap-4">
      <form action={buscar} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tenantSlug" value={slug} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <Campo id="reservar-buscar" etiqueta="Buscar socio" ayuda="Nombre o código. Vacío: los que su plan admite." className="min-w-0 flex-1">
          <input type="search" name="buscar" maxLength={60} autoComplete="off" className={CLASE_DE_CONTROL} />
        </Campo>
        <Enviar texto="Buscar" icono="search" variante="secundario" />
      </form>
      {estado.mensaje && <p className="text-[0.84rem] text-structural">{estado.mensaje}</p>}
      {estado.candidatos && estado.candidatos.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Socios para reservar">
          {estado.candidatos.map((c) => (
            <ReservarCandidato
              key={`${c.customerId}-${estado.buscado ?? ''}`}
              slug={slug}
              sessionId={sessionId}
              customerId={c.customerId}
              nombre={c.fullName}
              detalle={[c.customerCode, c.planName ?? 'sin plan vigente'].filter(Boolean).join(' · ')}
              habilitado={c.habilitado}
              motivo={NOMBRE_DE_MOTIVO_DE_ACCESO[c.motivo]}
              yaRegistrado={c.yaRegistrado}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** «Vino»: registra la asistencia de quien reservó; su reserva pasa a «asistió». */
export function MarcarQueVino({ slug, sessionId, customerId }: { readonly slug: string; readonly sessionId: string; readonly customerId: string }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(registrarAsistenciaAClase, {});
  if (estado.exito) return <span className="text-[0.8rem] font-semibold text-action">Registrado</span>;
  return (
    <form action={accion} className="flex flex-col items-start gap-1">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="metodo" value="manual" />
      <Enviar texto="Vino" icono="check" />
      {estado.mensaje && <span className="max-w-[14rem] text-[0.76rem] text-structural">{estado.mensaje}</span>}
    </form>
  );
}
