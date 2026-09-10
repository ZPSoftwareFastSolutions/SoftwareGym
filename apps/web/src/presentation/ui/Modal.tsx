'use client';

/**
 * CAPA: Presentation / UI (molécula)
 *
 * Ventanas modales sobre el `<dialog>` nativo. Dos formas:
 *
 * - `Modal`: trae su propio disparador. Para «este botón abre esta ventana».
 * - `Dialogo`: controlada desde fuera (`abierto` / `alCerrar`). Para una sola
 *   ventana compartida por muchos disparadores —la ficha de socio que abre
 *   cualquier fila de una tabla de sesenta—, en vez de sesenta `<dialog>`.
 *
 * POR QUÉ `<dialog>`. Con `showModal()` el navegador da gratis la trampa de
 * foco, el fondo inerte para lector de pantalla y el ::backdrop (§2.7).
 *
 * LO QUE COSTÓ APRENDER, y por eso está así:
 * - El evento `close` no se dispara en todos los entornos (comprobado). Nada
 *   de lo que el usuario nota depende de él: el cierre por la X, por el fondo
 *   y por Escape avisan directamente.
 * - El bloqueo del desplazamiento del fondo es CSS (`html:has(dialog[open])`),
 *   no JavaScript: en JavaScript se quedaba puesto cuando `close` no llegaba.
 * - `m-auto`: el reset de Tailwind quita el `margin: auto` que centra el
 *   diálogo, y sin él aparece pegado a la izquierda.
 * - El disparador se intercepta en fase de CAPTURA: un `<Link>` de Next navega
 *   en el destino del evento, antes de que un manejador en burbujeo llegue.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

export type AnchoDeDialogo = 'sm' | 'md' | 'lg' | 'xl';

const ANCHOS: Record<AnchoDeDialogo, string> = {
  sm: 'max-w-[26rem]',
  md: 'max-w-[34rem]',
  lg: 'max-w-[46rem]',
  xl: 'max-w-[62rem]',
};

interface DialogoProps {
  readonly abierto: boolean;
  readonly alCerrar: () => void;
  readonly titulo: string;
  readonly descripcion?: string;
  readonly children: ReactNode;
  readonly anchoMaximo?: AnchoDeDialogo;
  /**
   * Monta el contenido solo mientras está abierta. Para contenido caro —un
   * formulario, la cámara— que no debe existir mientras nadie lo mira. No es
   * el comportamiento por defecto: desmontar pierde lo escrito si se cierra
   * sin querer.
   */
  readonly montarSoloAbierto?: boolean;
  readonly className?: string;
}

export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  children,
  anchoMaximo = 'md',
  montarSoloAbierto = false,
  className,
}: DialogoProps) {
  const referencia = useRef<HTMLDialogElement>(null);
  // El manejador vive en una referencia para que el efecto que escucha `close`
  // no tenga que volver a suscribirse cada vez que el padre re-renderiza.
  const cerrarRef = useRef(alCerrar);
  cerrarRef.current = alCerrar;

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    // `showModal` y no `show`: la diferencia es la trampa de foco y el fondo inerte.
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    const alCerrarNativo = () => cerrarRef.current();
    dialogo.addEventListener('close', alCerrarNativo);
    return () => dialogo.removeEventListener('close', alCerrarNativo);
  }, []);

  return (
    <dialog
      ref={referencia}
      aria-label={titulo}
      onClick={(evento) => {
        // El ::backdrop no es un nodo del DOM: el clic llega con el <dialog>
        // como destino. Así se distingue «pulsó fuera» de «pulsó dentro».
        if (evento.target === referencia.current) cerrarRef.current();
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          // Se frena el cierre nativo y se cierra por estado: una sola vía de
          // cierre, la misma en todos los entornos.
          evento.preventDefault();
          cerrarRef.current();
        }
      }}
      className={cn(
        'm-auto w-[calc(100vw-2rem)] rounded-[var(--t-radius-lg)] border border-line bg-surface p-0',
        'text-ink shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] backdrop:bg-black/65',
        'backdrop:backdrop-blur-sm open:animate-[modal-entra_220ms_ease-out]',
        ANCHOS[anchoMaximo],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <h2 className="t-h3 leading-tight">{titulo}</h2>
          {descripcion && <p className="mt-1.5 text-[0.85rem] text-muted">{descripcion}</p>}
        </div>
        <button
          type="button"
          onClick={() => cerrarRef.current()}
          aria-label="Cerrar"
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-[var(--t-radius-sm)]',
            'border border-line text-muted transition-colors',
            'hover:border-action hover:text-action',
          )}
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="max-h-[78vh] overflow-y-auto px-6 py-6">{montarSoloAbierto && !abierto ? null : children}</div>
    </dialog>
  );
}

interface ModalProps extends Omit<DialogoProps, 'abierto' | 'alCerrar'> {
  /** El botón que la abre. Se le añade el manejador por composición. */
  readonly disparador: ReactNode;
}

export function Modal({ disparador, ...resto }: ModalProps) {
  const [abierto, setAbierto] = useState(false);

  /**
   * Cuando el disparador es un ENLACE real —el acceso de socios lo es, para
   * que la página exista sin JavaScript— se frena solo la navegación normal:
   * con Ctrl, Cmd, Shift o el botón central el usuario pide otra pestaña.
   */
  const alPulsarDisparador = (evento: React.MouseEvent<HTMLSpanElement>) => {
    if (evento.defaultPrevented) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if (evento.button !== 0) return;
    evento.preventDefault();
    evento.stopPropagation();
    setAbierto(true);
  };

  return (
    <>
      <span onClickCapture={alPulsarDisparador} className="contents">
        {disparador}
      </span>
      <Dialogo {...resto} abierto={abierto} alCerrar={() => setAbierto(false)} />
    </>
  );
}
