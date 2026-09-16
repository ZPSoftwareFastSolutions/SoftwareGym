'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * El socio pone su foto de perfil (V4.2).
 *
 * PARA QUÉ SIRVE, que no es decorar el panel: es lo que recepción ve al escanear
 * su QR. El código es un token opaco —identifica una ficha, no una cara—, así
 * que sin foto nada impide usar el QR de otra persona. Se le dice así en la
 * propia pantalla: quien entiende para qué es, la sube.
 *
 * SE REDUCE EN EL NAVEGADOR, como los comprobantes y los ejercicios. Un móvil
 * hace fotos de varios megas y por la Server Action no caben (Vercel corta en
 * 4,5 MB); además guardar el original sería pagar almacenamiento por píxeles
 * que nadie va a mirar. Sale un cuadrado de 400 px en WebP, de unos pocos KB.
 * El servidor vuelve a comprobar los bytes y el bucket corta en 512 KB: reducir
 * aquí es por peso y comodidad, nunca la única defensa.
 */

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { guardarMiFotoDePerfil, quitarMiFotoDePerfil } from '@/app/[tenant]/panel/actions';
import { inicialesDe, LADO_DE_AVATAR } from '@core/domain/operations/avatars';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

interface FotoDePerfilFormProps {
  readonly slug: string;
  readonly nombre: string;
  /** URL firmada de la foto actual, o `null` si todavía no tiene. */
  readonly fotoUrl: string | null;
}

/** Recorta al cuadrado central y reduce. Devuelve WebP, o `null` si el navegador no puede. */
async function reducirACuadrado(archivo: File): Promise<Blob | null> {
  try {
    const mapa = await createImageBitmap(archivo);
    const lado = Math.min(mapa.width, mapa.height);
    const lienzo = document.createElement('canvas');
    lienzo.width = LADO_DE_AVATAR;
    lienzo.height = LADO_DE_AVATAR;

    const pincel = lienzo.getContext('2d');
    if (!pincel) return null;

    // Recorte centrado: una foto de cuerpo entero en vertical debe quedar en la
    // cara, no en los pies.
    pincel.drawImage(
      mapa,
      (mapa.width - lado) / 2,
      (mapa.height - lado) / 2,
      lado,
      lado,
      0,
      0,
      LADO_DE_AVATAR,
      LADO_DE_AVATAR,
    );
    mapa.close();

    return await new Promise((resolver) => lienzo.toBlob((b) => resolver(b), 'image/webp', 0.85));
  } catch {
    // Si algo falla se sube el original: el servidor y el bucket lo validan y,
    // si no cabe, el mensaje lo explica. Mejor eso que bloquear la subida.
    return null;
  }
}

function Enviar({ hayArchivo }: { readonly hayArchivo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !hayArchivo}
      aria-busy={pending}
      className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 text-[0.88rem] font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : 'check'} size={16} className={cn(pending && 'animate-spin')} />
      {pending ? 'Subiendo…' : 'Guardar foto'}
    </button>
  );
}

export function FotoDePerfilForm({ slug, nombre, fotoUrl }: FotoDePerfilFormProps) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarMiFotoDePerfil, {});
  const [quitarEstado, quitar] = useActionState<EstadoDeFormulario, FormData>(quitarMiFotoDePerfil, {});
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [hayArchivo, setHayArchivo] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  // La vista previa es un object URL: hay que soltarlo o se queda en memoria.
  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const alElegir = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) {
      setHayArchivo(false);
      return;
    }

    const reducida = await reducirACuadrado(archivo);
    if (reducida && entrada.current) {
      // Se reemplaza el archivo del formulario por el reducido: lo que viaja es
      // el cuadrado pequeño, no la foto de 6 MB del teléfono.
      const datos = new DataTransfer();
      datos.items.add(new File([reducida], 'foto.webp', { type: 'image/webp' }));
      entrada.current.files = datos.files;
    }

    setVistaPrevia((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(reducida ?? archivo);
    });
    setHayArchivo(true);
  };

  const mostrada = vistaPrevia ?? fotoUrl;
  const mensaje = estado.exito ?? estado.mensaje ?? quitarEstado.exito ?? quitarEstado.mensaje ?? '';

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {mostrada ? (
        <img
          src={mostrada}
          alt={`Tu foto de perfil, ${nombre}`}
          className="aspect-square w-28 shrink-0 rounded-[var(--t-radius-lg)] border border-line object-cover"
        />
      ) : (
        <div className="grid aspect-square w-28 shrink-0 place-items-center rounded-[var(--t-radius-lg)] border border-line bg-raised">
          <span className="text-[1.8rem] font-bold text-muted">{inicialesDe(nombre)}</span>
        </div>
      )}

      <div className="flex-1">
        <p className="text-[0.88rem] leading-relaxed text-muted">
          Tu foto aparece en el mostrador cuando pasas el QR, para que recepción confirme que eres
          tú. Tu código no lleva tu nombre ni tu cara: la foto es lo que evita que alguien entre con
          tu código.
        </p>

        <form action={accion} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="tenantSlug" value={slug} />
          <input
            ref={entrada}
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={alElegir}
            className="max-w-full rounded-[var(--t-radius-md)] border border-line bg-raised px-3 py-2.5 text-[0.85rem] text-ink file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-ink"
          />
          <Enviar hayArchivo={hayArchivo} />
        </form>

        {fotoUrl && !vistaPrevia && (
          <form action={quitar} className="mt-3">
            <input type="hidden" name="tenantSlug" value={slug} />
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-1.5 text-[0.82rem] text-muted transition-colors hover:text-structural"
            >
              <Icon name="close" size={14} />
              Quitar mi foto
            </button>
          </form>
        )}

        <p
          aria-live="polite"
          className={cn('mt-3 text-[0.82rem]', estado.exito || quitarEstado.exito ? 'text-action' : 'text-structural')}
        >
          {mensaje}
        </p>
      </div>
    </div>
  );
}
