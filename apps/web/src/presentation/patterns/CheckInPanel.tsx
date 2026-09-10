'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Mostrador de check-in.
 *
 * Está pensado para usarse de pie y con prisa: un solo campo, foco automático
 * y respuesta grande y de un color que se entiende de reojo. Un lector de QR
 * de los baratos escribe el código y pulsa Enter, así que el formulario se
 * envía con Enter sin tocar nada más.
 *
 * Tras un registro correcto el campo se vacía y recupera el foco solo: en una
 * cola de diez personas, tener que hacer clic entre socio y socio es lo que
 * hace que el mostrador acabe apuntando en un cuaderno.
 */

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { registrarCheckIn, type EstadoDeCheckIn } from '@/app/[tenant]/panel/actions';

interface CheckInPanelProps {
  readonly slug: string;
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
        'inline-flex h-14 shrink-0 items-center justify-center gap-2.5 px-7',
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

export function CheckInPanel({ slug }: CheckInPanelProps) {
  const [estado, accion] = useActionState(registrarCheckIn, ESTADO_INICIAL);
  const campo = useRef<HTMLInputElement>(null);
  const resultado = estado.resultado;

  useEffect(() => {
    if (!resultado) return;

    const elemento = campo.current;
    if (elemento) {
      // React 19 resetea por su cuenta un formulario con `action` al terminar
      // —comprobado— y eso está bien cuando el socio quedó registrado: el
      // siguiente de la cola empieza con el campo limpio.
      //
      // Pero con un código mal tecleado ese reseteo obliga a escribirlo entero
      // otra vez para corregir una letra. Ahí se devuelve lo que se intentó y
      // el cursor queda al final, listo para arreglarlo.
      const seEquivocaron = resultado.tipo === 'desconocido' || resultado.tipo === 'error';
      elemento.value = seEquivocaron ? (estado.intentado ?? '') : '';
    }

    // El foco vuelve SIEMPRE al campo: en una cola de diez personas, tener que
    // hacer clic entre socio y socio es lo que acaba con el mostrador
    // apuntando en un cuaderno.
    campo.current?.focus();
  }, [resultado, estado.intentado]);

  return (
    <div className="flex flex-col gap-5">
      <form action={accion} className="flex flex-col gap-3 sm:flex-row">
        <input type="hidden" name="tenantSlug" value={slug} />
        <div className="flex-1">
          <label htmlFor="codigo-check-in" className="sr-only">
            Código del socio
          </label>
          <input
            ref={campo}
            id="codigo-check-in"
            name="codigo"
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            // El lector físico escribe muy rápido: sin `autoCapitalize` y
            // `autoCorrect` apagados, un teclado táctil puede alterar el código.
            autoCapitalize="characters"
            autoCorrect="off"
            inputMode="text"
            placeholder="Escanea el QR o teclea el código"
            className={cn(
              'h-14 w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-5',
              'font-mono text-[1rem] tracking-[0.08em] text-ink placeholder:text-muted/70',
              'transition-colors focus:border-action focus:outline-none',
              'focus-visible:ring-2 focus-visible:ring-action/40',
            )}
          />
        </div>
        <BotonRegistrar />
      </form>

      {/* `aria-live` para que el lector de pantalla anuncie el resultado sin
          que haya que ir a buscarlo: quien atiende el mostrador no está
          mirando esta zona, está mirando a la persona que tiene delante. */}
      <div aria-live="polite" aria-atomic="true">
        {resultado && <Resultado resultado={resultado} />}
      </div>
    </div>
  );
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
              Entrada registrada
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
              Ya tenía su entrada de hoy. No se registra dos veces el mismo día.
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
            <span className="text-[0.88rem] text-muted">
              Entrada registrada, pero su membresía está vencida. Ofrécele la renovación.
            </span>
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
