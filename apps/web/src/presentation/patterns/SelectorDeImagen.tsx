'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Selector de imagen de comprobante, con vista previa y reducción en el
 * navegador.
 *
 * POR QUÉ REDUCIR AQUÍ. La foto de un teléfono pesa entre 3 y 12 MB. Subirla
 * tal cual tarda en la conexión móvil del mostrador y choca con el límite de
 * las funciones de Vercel (4,5 MB), que corta ANTES de que la aplicación pueda
 * explicar nada. Reducida a 1600 px de lado mayor, un comprobante sigue siendo
 * perfectamente legible y pesa unos cientos de KB.
 *
 * El archivo reducido sustituye al original DENTRO del mismo `<input>` (con
 * `DataTransfer`), así el formulario sigue siendo un formulario normal que
 * envía una acción de servidor: sin subidas en paralelo que sincronizar.
 *
 * Esto es comodidad, no seguridad. El servidor vuelve a comprobar el tamaño y
 * los bytes mágicos: este código se lo puede saltar cualquiera.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

interface SelectorDeImagenProps {
  readonly nombre: string;
  readonly id: string;
  readonly obligatorio?: boolean;
  readonly etiqueta?: string;
}

const LADO_MAXIMO = 1600;
/** Por debajo de esto una imagen se deja tal cual: reducirla no ganaría nada y un PNG nítido perdería nitidez. */
const SIN_REDUCIR_HASTA = 900 * 1024;

async function reducir(archivo: File): Promise<File> {
  if (archivo.size <= SIN_REDUCIR_HASTA) return archivo;

  const mapa = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
  const ancho = Math.round(mapa.width * escala);
  const alto = Math.round(mapa.height * escala);

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext('2d');
  if (!contexto) return archivo;
  // Fondo blanco: un PNG con transparencia convertido a JPEG sale con el
  // fondo negro, y un comprobante en negro sobre negro no se lee.
  contexto.fillStyle = '#ffffff';
  contexto.fillRect(0, 0, ancho, alto);
  contexto.drawImage(mapa, 0, 0, ancho, alto);
  mapa.close();

  const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', 0.85));
  if (!blob || blob.size >= archivo.size) return archivo;
  return new File([blob], 'comprobante.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}

export function SelectorDeImagen({ nombre, id, obligatorio = false, etiqueta = 'Imagen del comprobante' }: SelectorDeImagenProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [estado, setEstado] = useState<'vacio' | 'procesando' | 'listo' | 'error'>('vacio');
  const [detalle, setDetalle] = useState('');

  // La URL de vista previa ocupa memoria mientras exista: se libera al
  // cambiar de imagen y al desmontar.
  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);

  const alCambiar = async () => {
    const campo = entrada.current;
    const original = campo?.files?.[0];
    if (!campo || !original) {
      setEstado('vacio');
      setVista(null);
      return;
    }
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(original.type)) {
      setEstado('error');
      setDetalle('Elige una foto o captura (JPG, PNG o WebP).');
      campo.value = '';
      return;
    }

    setEstado('procesando');
    try {
      const final = await reducir(original);
      if (final !== original && typeof DataTransfer !== 'undefined') {
        const transferencia = new DataTransfer();
        transferencia.items.add(final);
        campo.files = transferencia.files;
      }
      if (final.size > 4 * 1024 * 1024) {
        setEstado('error');
        setDetalle('La imagen sigue pesando más de 4 MB. Prueba con una captura de pantalla.');
        return;
      }
      setVista(URL.createObjectURL(final));
      setDetalle(`${Math.round(final.size / 1024)} KB`);
      setEstado('listo');
    } catch {
      // HEIC u otro formato que este navegador no sabe decodificar: se envía
      // el original y el servidor decidirá. Mejor intentar que bloquear.
      setVista(null);
      setDetalle('No se pudo previsualizar; se enviará tal cual.');
      setEstado('listo');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {etiqueta}
        {obligatorio && <span className="text-structural" aria-hidden="true"> *</span>}
      </label>

      <label
        htmlFor={id}
        className={cn(
          'relative flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden',
          'rounded-[var(--t-radius-md)] border-2 border-dashed px-4 py-5 text-center transition-colors',
          estado === 'error' ? 'border-structural/60' : 'border-line hover:border-action',
        )}
      >
        {vista ? (
          // Vista previa local (blob:), permitida por la CSP en `img-src`.
          <img src={vista} alt="Vista previa del comprobante" className="max-h-56 w-auto rounded-[var(--t-radius-sm)] object-contain" />
        ) : (
          <>
            <Icon name={estado === 'procesando' ? 'refresh' : 'image'} size={26} className="text-muted" />
            <span className="text-[0.88rem] font-medium text-ink">
              {estado === 'procesando' ? 'Preparando la imagen…' : 'Toca para elegir o tomar una foto'}
            </span>
            <span className="text-[0.76rem] text-muted">JPG, PNG o WebP · se reduce sola antes de subir</span>
          </>
        )}
        <input
          ref={entrada}
          id={id}
          name={nombre}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required={obligatorio}
          onChange={alCambiar}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      {detalle && (
        <p role={estado === 'error' ? 'alert' : undefined} className={cn('text-[0.76rem]', estado === 'error' ? 'text-structural' : 'text-muted')}>
          {detalle}
        </p>
      )}
    </div>
  );
}
