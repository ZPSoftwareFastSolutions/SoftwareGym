'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Lector de QR con la cámara del dispositivo.
 *
 * DOS MOTORES, EN ESTE ORDEN:
 * 1. `BarcodeDetector`, nativo del navegador —Chrome en Android, macOS y
 *    ChromeOS—. Rápido y sin descargar nada.
 * 2. `jsQR` como respaldo —Windows, Firefox, Safari de escritorio—. Se importa
 *    dinámicamente al abrir la cámara: no pesa en ninguna otra pantalla.
 *
 * DOS DECISIONES QUE SALEN DE MEDIR, NO DE SUPONER. Se generó el QR del socio
 * con el mismo codificador del servidor y se leyó con jsQR añadiendo ruido:
 * con píxeles sueltos alterados la lectura de UN fotograma falla bastantes
 * veces, y subir la corrección de errores de M a Q no lo mejoraba —el cuello
 * de botella es el muestreo del decodificador—. Lo que sí sirve:
 * - leer VARIOS fotogramas por segundo, porque un fallo aislado se reintenta
 *   solo al instante;
 * - reducir el fotograma antes de decodificar: reescalar promedia píxeles
 *   vecinos y se come justo ese ruido suelto.
 *
 * Solo acepta el formato del identificador de check-in. Cualquier otro QR que
 * pase por delante —el de una botella, el del Wi-Fi— se ignora sin avisar y el
 * lector sigue buscando.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';

interface QrScannerProps {
  readonly alDetectar: (codigo: string) => void;
  readonly alCancelar?: () => void;
}

type Estado = 'iniciando' | 'buscando' | 'detectado' | 'error';

const PATRON_TOKEN = /^[0-9A-F]{24}$/;
const ANCHO_DE_ANALISIS = 640;
const INTERVALO_MS = 120;

interface DetectorNativo {
  detect(fuente: CanvasImageSource): Promise<readonly { rawValue: string }[]>;
}
type ConstructorDeDetector = new (opciones: { formats: string[] }) => DetectorNativo;

function mensajeDeError(error: unknown): string {
  const nombre = error instanceof DOMException ? error.name : '';
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
    return 'El navegador no dio permiso para usar la cámara. Actívalo en el candado de la barra de direcciones.';
  }
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
    return 'No se encontró ninguna cámara en este dispositivo.';
  }
  if (nombre === 'NotReadableError') {
    return 'La cámara está ocupada por otra aplicación. Ciérrala y vuelve a intentarlo.';
  }
  return 'No se pudo abrir la cámara. Puedes teclear el código a mano.';
}

export function QrScanner({ alDetectar, alCancelar }: QrScannerProps) {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const detectado = useRef(false);
  const [estado, setEstado] = useState<Estado>('iniciando');
  const [error, setError] = useState('');
  const [trasera, setTrasera] = useState(true);

  const detener = useCallback(() => {
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
  }, []);

  useEffect(() => {
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    detectado.current = false;

    const iniciar = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('La cámara solo funciona en conexiones seguras (https).');
        setEstado('error');
        return;
      }

      try {
        const medios = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: trasera ? 'environment' : 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelado) {
          medios.getTracks().forEach((pista) => pista.stop());
          return;
        }
        flujo.current = medios;
        const elemento = video.current;
        if (!elemento) return;
        elemento.srcObject = medios;
        await elemento.play();
        setEstado('buscando');
      } catch (causa) {
        if (!cancelado) {
          setError(mensajeDeError(causa));
          setEstado('error');
        }
        return;
      }

      const Nativo = (window as unknown as { BarcodeDetector?: ConstructorDeDetector }).BarcodeDetector;
      let detector: DetectorNativo | null = null;
      if (Nativo) {
        try {
          detector = new Nativo({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }
      const jsQR = detector ? null : (await import('jsqr')).default;

      const analizar = async () => {
        if (cancelado || detectado.current) return;
        const elemento = video.current;
        const destino = lienzo.current;
        let valor: string | null = null;

        if (elemento && elemento.readyState >= 2 && elemento.videoWidth > 0) {
          try {
            if (detector) {
              const resultados = await detector.detect(elemento);
              valor = resultados[0]?.rawValue ?? null;
            } else if (jsQR && destino) {
              const escala = Math.min(1, ANCHO_DE_ANALISIS / elemento.videoWidth);
              const ancho = Math.round(elemento.videoWidth * escala);
              const alto = Math.round(elemento.videoHeight * escala);
              destino.width = ancho;
              destino.height = alto;
              const contexto = destino.getContext('2d', { willReadFrequently: true });
              if (contexto) {
                contexto.drawImage(elemento, 0, 0, ancho, alto);
                const imagen = contexto.getImageData(0, 0, ancho, alto);
                valor = jsQR(imagen.data, ancho, alto, { inversionAttempts: 'dontInvert' })?.data ?? null;
              }
            }
          } catch {
            valor = null;
          }
        }

        const codigo = valor?.trim().toUpperCase() ?? '';
        if (PATRON_TOKEN.test(codigo)) {
          detectado.current = true;
          setEstado('detectado');
          // Vibración corta en móviles: quien escanea está mirando a la
          // persona, no a la pantalla. En escritorio no existe y no pasa nada.
          navigator.vibrate?.(60);
          detener();
          alDetectar(codigo);
          return;
        }
        temporizador = setTimeout(analizar, INTERVALO_MS);
      };

      void analizar();
    };

    void iniciar();

    return () => {
      cancelado = true;
      if (temporizador) clearTimeout(temporizador);
      detener();
    };
  }, [trasera, alDetectar, detener]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--t-radius-md)] bg-black">
        <video
          ref={video}
          muted
          playsInline
          // Sin `playsInline` Safari en iPhone abre el vídeo a pantalla completa
          // y el lector deja de verse dentro de la ventana.
          className={cn('h-full w-full object-cover', !trasera && '-scale-x-100')}
          aria-label="Vista de la cámara para leer el QR del socio"
        />
        <canvas ref={lienzo} className="hidden" aria-hidden="true" />

        {estado !== 'error' && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className={cn(
                'h-[62%] aspect-square rounded-[var(--t-radius-lg)] border-[3px] transition-colors duration-200',
                estado === 'detectado' ? 'border-action shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]' : 'border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]',
              )}
            />
          </div>
        )}

        {estado === 'iniciando' && (
          <p className="absolute inset-x-0 bottom-4 text-center text-[0.86rem] text-white">Abriendo la cámara…</p>
        )}

        {estado === 'error' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="flex max-w-[34ch] flex-col items-center gap-3 text-[0.9rem] text-white">
              <Icon name="alert" size={26} />
              {error}
            </p>
          </div>
        )}
      </div>

      <p aria-live="polite" className="text-center text-[0.84rem] text-muted">
        {estado === 'buscando' && 'Apunta al QR del socio. Se registra solo al leerlo.'}
        {estado === 'detectado' && 'QR leído. Registrando…'}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {estado !== 'error' && (
          <button
            type="button"
            onClick={() => setTrasera((valor) => !valor)}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] border border-line px-4 text-[0.86rem] text-ink transition-colors hover:border-action hover:text-action"
          >
            <Icon name="refresh" size={16} />
            Cambiar cámara
          </button>
        )}
        {alCancelar && (
          <button
            type="button"
            onClick={() => {
              detener();
              alCancelar();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] px-4 text-[0.86rem] text-muted transition-colors hover:text-action"
          >
            Teclear el código
          </button>
        )}
      </div>
    </div>
  );
}
