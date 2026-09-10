'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Acceso de socios en una ventana, sin salir de la página.
 *
 * POR QUÉ. Quien está mirando los paquetes y quiere entrar a su cuenta no
 * tiene por qué perder la página en la que estaba. La ventana abre, entra y
 * lo deja donde estaba —o en su panel, si eso es lo que pidió—.
 *
 * EL ENLACE SIGUE SIENDO UN ENLACE. El disparador apunta a `/[tenant]/acceso`
 * de verdad: sin JavaScript, con el botón central del ratón o desde el menú
 * contextual, funciona como siempre. La ventana es una mejora encima, no un
 * sustituto, y por eso la página de acceso no desaparece.
 *
 * EL FORMULARIO SE DESCARGA AL ABRIR. `next/dynamic` mantiene su JavaScript
 * fuera del paquete común: la cabecera está en las 24 páginas del sitio
 * público, y meter ahí la lógica de autenticación cargaría en cada visitante
 * anónimo un peso que solo usa quien pulsa el botón.
 */

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';

const FormularioDeAcceso = dynamic(
  () => import('./AccessForm').then((modulo) => modulo.AccessForm),
  {
    // El esqueleto conserva la altura del formulario para que la ventana no
    // dé un salto de tamaño cuando termina de cargar.
    loading: () => (
      <div className="min-h-[24rem] animate-pulse rounded-[var(--t-radius-md)] bg-raised" />
    ),
  },
);

interface AccessModalProps {
  readonly slug: string;
  readonly gymName: string;
  readonly disparador: ReactNode;
}

export function AccessModal({ slug, gymName, disparador }: AccessModalProps) {
  return (
    <Modal
      titulo={`Acceso de socios · ${gymName}`}
      descripcion="Entra a tu cuenta o crea una nueva en un minuto."
      anchoMaximo="md"
      montarSoloAbierto
      disparador={disparador}
    >
      <FormularioDeAcceso slug={slug} gymName={gymName} />
    </Modal>
  );
}
