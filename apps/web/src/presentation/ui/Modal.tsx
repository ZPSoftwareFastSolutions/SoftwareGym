'use client';

/**
 * CAPA: Presentation / UI (molécula)
 *
 * Ventana modal sobre el `<dialog>` nativo.
 *
 * POR QUÉ `<dialog>` Y NO UN `div` CON `role="dialog"`. Con `showModal()` el
 * navegador da gratis y bien hecho lo que cuesta semanas reimplementar: la
 * trampa de foco, el cierre con Escape, el fondo inerte para lector de
 * pantalla y el ::backdrop. La regla del proyecto es HTML semántico antes que
 * ARIA (§2.7), y aquí el elemento semántico ya existe.
 *
 * El contenido llega como prop, así que puede venir renderizado desde el
 * servidor: el QR de un socio se dibuja en el servidor y esta ventana solo lo
 * enseña. Lo único que vive en el cliente es abrir y cerrar.
 *
 * El bloqueo del desplazamiento del fondo NO está aquí: es una regla de CSS
 * (`html:has(dialog[open])`). Estuvo en JavaScript y se rompía cuando el
 * evento `close` no llegaba, dejando la página congelada tras cerrar.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

interface ModalProps {
  /** Texto accesible del disparador y título de la ventana. */
  readonly titulo: string;
  readonly descripcion?: string;
  /** El botón que la abre. Se le añade el manejador por composición. */
  readonly disparador: ReactNode;
  readonly children: ReactNode;
  readonly anchoMaximo?: 'sm' | 'md' | 'lg';
  /**
   * Monta el contenido solo mientras la ventana está abierta.
   *
   * Sirve para que un contenido caro —un formulario con su lógica— no entre
   * en el paquete de todas las páginas por el simple hecho de existir un
   * botón que lo abre. Con `next/dynamic` dentro, el trozo de JavaScript se
   * descarga en el primer clic y no antes.
   *
   * No es lo que se quiere por defecto: desmontar y volver a montar pierde lo
   * que el usuario hubiera escrito si cierra sin querer.
   */
  readonly montarSoloAbierto?: boolean;
  readonly className?: string;
}

const ANCHOS = {
  sm: 'max-w-[26rem]',
  md: 'max-w-[34rem]',
  lg: 'max-w-[46rem]',
} as const;

export function Modal({
  titulo,
  descripcion,
  disparador,
  children,
  anchoMaximo = 'md',
  montarSoloAbierto = false,
  className,
}: ModalProps) {
  const referencia = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(false);

  const abrir = useCallback(() => {
    const dialogo = referencia.current;
    if (!dialogo || dialogo.open) return;
    // `showModal` y no `show`: la diferencia entre las dos es exactamente la
    // trampa de foco y el fondo inerte.
    dialogo.showModal();
    setAbierto(true);
  }, []);

  const cerrar = useCallback(() => {
    referencia.current?.close();
    // El estado se actualiza AQUI y no esperando al evento `close`.
    //
    // Ese evento no se dispara en todos los entornos —comprobado con un
    // <dialog> sintetico en el navegador embebido de las pruebas, donde no
    // llega nunca—, asi que confiarle nada que el usuario pueda notar es
    // construir sobre algo que a veces no ocurre.
    //
    // El bloqueo del desplazamiento del fondo, que era lo unico que rompia de
    // verdad cuando el evento faltaba, ya no depende de React: lo hace la
    // regla `html:has(dialog[open])` de `globals.css`, que se evalua sola.
    setAbierto(false);
  }, []);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    // Escape lo cierra el navegador sin pasar por `cerrar()`. Donde el evento
    // si llega, esto mantiene el estado al dia; donde no llega, lo unico que
    // queda desincronizado es si el contenido perezoso sigue montado, que no
    // se ve ni molesta.
    const alCerrar = () => setAbierto(false);
    dialogo.addEventListener('close', alCerrar);
    return () => dialogo.removeEventListener('close', alCerrar);
  }, []);

  /**
   * Clic fuera del contenido cierra.
   *
   * El evento del `::backdrop` llega con el `<dialog>` como destino, porque el
   * fondo no es un nodo del DOM. Comparar contra el propio diálogo es la forma
   * de distinguir «pulsó fuera» de «pulsó dentro».
   */
  const alPulsarFondo = (evento: React.MouseEvent<HTMLDialogElement>) => {
    if (evento.target === referencia.current) cerrar();
  };

  /**
   * Apertura desde el disparador.
   *
   * Cuando el disparador es un ENLACE real —y en el acceso de socios lo es, a
   * propósito, para que la página siga existiendo sin JavaScript— hay que
   * frenar la navegación. Pero solo la normal: con Ctrl, Cmd, Shift o el botón
   * central, el usuario está pidiendo «ábrelo en otra pestaña», y romper eso
   * es de las cosas que más molestan de una interfaz.
   *
   * VA EN FASE DE CAPTURA, y esto costó una prueba fallida. El `<Link>` de
   * Next lleva su propio manejador en el ancla, que es el destino del evento:
   * en la fase de burbujeo ese manejador ya se ejecutó y la navegación ya está
   * lanzada, así que un `preventDefault()` aquí llega tarde. **Observado: al
   * pulsar «Acceso socios» la página navegaba a /acceso en vez de abrir la
   * ventana.** La captura va del ancestro al destino, de modo que se puede
   * detener antes de que el enlace se entere.
   */
  const alPulsarDisparador = (evento: React.MouseEvent<HTMLSpanElement>) => {
    if (evento.defaultPrevented) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if (evento.button !== 0) return;
    evento.preventDefault();
    evento.stopPropagation();
    abrir();
  };

  return (
    <>
      {/* El disparador se envuelve en vez de recibir props: así el consumidor
          puede pasar cualquier botón del sistema sin que este componente
          tenga que conocer su API. */}
      <span onClickCapture={alPulsarDisparador} className="contents">
        {disparador}
      </span>

      <dialog
        ref={referencia}
        onClick={alPulsarFondo}
        aria-label={titulo}
        className={cn(
          // `m-auto` no es decorativo: el navegador centra un <dialog> modal
          // con `margin: auto`, y el reset de Tailwind pone `margin: 0` en
          // todo. Sin esto la ventana aparece pegada al borde izquierdo.
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
            onClick={cerrar}
            aria-label="Cerrar"
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-[var(--t-radius-sm)]',
              'border border-line text-muted transition-colors',
              'hover:border-action hover:text-action',
            )}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {montarSoloAbierto && !abierto ? null : children}
        </div>
      </dialog>
    </>
  );
}
