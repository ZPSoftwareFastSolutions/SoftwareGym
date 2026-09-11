'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Mostrador de check-in: por CÁMARA o por TECLADO.
 *
 * Pensado para usarse de pie y con prisa: un campo con foco automático,
 * respuesta grande y de un color que se entiende de reojo. Un lector de QR
 * físico escribe el código y pulsa Enter, así que también funciona sin tocar
 * nada más. Y quien no tiene lector usa la cámara del propio dispositivo: al
 * leer el QR se registra solo.
 *
 * El lector de cámara se descarga al pulsar el botón (`next/dynamic`): el
 * decodificador pesa, y quien solo teclea no tiene por qué cargarlo.
 */

import dynamic from 'next/dynamic';
import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { registrarCheckIn, type EstadoDeCheckIn } from '@/app/[tenant]/panel/actions';

const QrScanner = dynamic(() => import('./QrScanner').then((modulo) => modulo.QrScanner), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] w-full animate-pulse rounded-[var(--t-radius-md)] bg-raised" />,
});

interface CheckInPanelProps {
  readonly slug: string;
  /**
   * Sede donde se registra (V3.0). Viaja en el formulario para que la entrada
   * quede en la sede que el mostrador TENÍA EN PANTALLA, aunque en otra
   * pestaña se haya cambiado la sede de trabajo. El servidor la vuelve a
   * validar y la base también.
   */
  readonly sucursal: { readonly id: string; readonly name: string } | null;
  /** Muestra el nombre de la sede. Un gimnasio de sede única no lo necesita. */
  readonly mostrarSucursal?: boolean;
  /** Abre directamente con la cámara, para el tótem o el acceso rápido. */
  readonly empezarConCamara?: boolean;
}

const ESTADO_INICIAL: EstadoDeCheckIn = {};

function BotonRegistrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'inline-flex h-14 shrink-0 items-center justify-center gap-2.5 px-6',
        'rounded-[var(--t-radius-md)] bg-action font-semibold text-on-action',
        'transition-colors hover:bg-action-strong',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      <Icon name={pending ? 'clock' : 'check'} size={18} />
      {pending ? 'Registrando…' : 'Registrar'}
    </button>
  );
}

export function CheckInPanel({ slug, sucursal, mostrarSucursal = false, empezarConCamara = false }: CheckInPanelProps) {
  const [estado, accion] = useActionState(registrarCheckIn, ESTADO_INICIAL);
  const [camara, setCamara] = useState(empezarConCamara);
  const campo = useRef<HTMLInputElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const resultado = estado.resultado;

  useEffect(() => {
    if (!resultado) return;
    const elemento = campo.current;
    if (elemento) {
      // React 19 resetea el formulario al terminar la acción. Con un registro
      // correcto eso está bien; con un código mal tecleado obligaría a
      // escribirlo entero otra vez para corregir una letra.
      const seEquivocaron = resultado.tipo === 'desconocido' || resultado.tipo === 'error';
      elemento.value = seEquivocaron ? (estado.intentado ?? '') : '';
    }
    if (!camara) campo.current?.focus();
  }, [resultado, estado.intentado, camara]);

  // Estable a propósito: el lector reinicia la cámara si cambia la función que
  // recibe, y un re-render del panel no debe apagar y encender la cámara.
  const alDetectar = useCallback((codigo: string) => {
    if (campo.current) campo.current.value = codigo;
    setCamara(false);
    formulario.current?.requestSubmit();
  }, []);

  const alCancelar = useCallback(() => {
    setCamara(false);
    setTimeout(() => campo.current?.focus(), 0);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {mostrarSucursal && sucursal && (
        <p className="flex items-center gap-2 self-start rounded-full border border-action/40 bg-action/10 px-3.5 py-1.5 text-[0.82rem] text-ink">
          <Icon name="pin" size={15} className="text-action" />
          Registrando en <strong className="font-semibold">{sucursal.name}</strong>
        </p>
      )}

      {!sucursal && (
        <p className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-structural/50 bg-structural/10 px-4 py-3 text-[0.88rem] text-ink">
          <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-structural" />
          Tu cuenta no tiene ninguna sucursal donde registrar entradas. Pide a gerencia que te asigne una sede.
        </p>
      )}

      {camara && <QrScanner alDetectar={alDetectar} alCancelar={alCancelar} />}

      <form ref={formulario} action={accion} className={cn('flex flex-col gap-3 sm:flex-row', camara && 'sr-only')}>
        <input type="hidden" name="tenantSlug" value={slug} />
        <input type="hidden" name="sucursal" value={sucursal?.id ?? ''} />
        <div className="flex-1">
          <label htmlFor="codigo-check-in" className="sr-only">
            Código del socio
          </label>
          <input
            ref={campo}
            id="codigo-check-in"
            name="codigo"
            type="text"
            autoFocus={!empezarConCamara}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder="Escanea con el lector o teclea el código"
            className={cn(
              'h-14 w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-5',
              'font-mono text-[1rem] tracking-[0.08em] text-ink placeholder:text-muted/70',
              'transition-colors focus:border-action focus:outline-none',
              'focus-visible:ring-2 focus-visible:ring-action/40',
            )}
          />
        </div>
        <button
          type="button"
          onClick={() => setCamara(true)}
          className={cn(
            'inline-flex h-14 shrink-0 items-center justify-center gap-2.5 px-5',
            'rounded-[var(--t-radius-md)] border border-line font-semibold text-ink',
            'transition-colors hover:border-action hover:text-action',
          )}
        >
          <Icon name="camera" size={18} />
          Cámara
        </button>
        <BotonRegistrar />
      </form>

      {/* `aria-live`: quien atiende el mostrador está mirando a la persona que
          tiene delante, no esta zona. El lector de pantalla lo anuncia solo. */}
      <div aria-live="polite" aria-atomic="true">
        {resultado && <Resultado resultado={resultado} />}
      </div>

      {resultado && !camara && (
        <button
          type="button"
          onClick={() => setCamara(true)}
          className="inline-flex h-11 items-center justify-center gap-2 self-center rounded-[var(--t-radius-md)] px-4 text-[0.86rem] font-medium text-action transition-colors hover:bg-action/10"
        >
          <Icon name="qr" size={16} />
          Escanear al siguiente
        </button>
      )}
    </div>
  );
}

/** Hora en el reloj de quien mira el mostrador, que está físicamente en el gimnasio. */
function horaLocal(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

function Resultado({ resultado }: { readonly resultado: NonNullable<EstadoDeCheckIn['resultado']> }) {
  const base = 'flex items-start gap-3.5 rounded-[var(--t-radius-md)] border px-5 py-4';

  switch (resultado.tipo) {
    case 'registrado':
      return (
        <p className={cn(base, 'border-action/45 bg-action/10')}>
          <Icon name="check" size={20} className="mt-0.5 shrink-0 text-action" />
          <span>
            <strong className="block text-[1.05rem] text-ink">{resultado.socio}</strong>
            <span className="text-[0.88rem] text-muted">
              Entrada registrada en {resultado.sucursal}
              {typeof resultado.diasRestantes === 'number' &&
                ` · le quedan ${resultado.diasRestantes} ${resultado.diasRestantes === 1 ? 'día' : 'días'} de membresía`}
            </span>
          </span>
        </p>
      );
    case 'repetido':
      return (
        <p className={cn(base, 'border-line bg-raised')}>
          <Icon name="clock" size={20} className="mt-0.5 shrink-0 text-muted" />
          <span>
            <strong className="block text-[1.05rem] text-ink">{resultado.socio}</strong>
            <span className="text-[0.88rem] text-muted">
              Ya tenía su entrada de hoy{resultado.sucursal ? ` en ${resultado.sucursal}` : ''}, a las {horaLocal(resultado.hora)}. No se registra dos veces el mismo día.
            </span>
          </span>
        </p>
      );
    case 'sin-membresia':
      return (
        <p className={cn(base, 'border-structural/50 bg-structural/10')}>
          <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-structural" />
          <span>
            <strong className="block text-[1.05rem] text-ink">{resultado.socio}</strong>
            <span className="text-[0.88rem] text-muted">Entrada registrada en {resultado.sucursal}, pero su membresía está vencida. Ofrécele la renovación.</span>
          </span>
        </p>
      );
    case 'desconocido':
      return (
        <p className={cn(base, 'border-line bg-raised')}>
          <Icon name="close" size={20} className="mt-0.5 shrink-0 text-muted" />
          <span className="text-[0.9rem] text-muted">
            Ese código no corresponde a ningún socio de este gimnasio. Revísalo o búscalo por nombre.
          </span>
        </p>
      );
    case 'error':
      return (
        <p className={cn(base, 'border-structural/50 bg-structural/10')}>
          <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-structural" />
          <span className="text-[0.9rem] text-ink">{resultado.mensaje}</span>
        </p>
      );
  }
}
