/**
 * CAPA: Presentation / UI (átomo)
 *
 * Dibuja una matriz de QR ya calculada. No la genera: recibe la matriz del
 * servidor y la pinta. Así el codificador nunca entra en el paquete del
 * navegador (ver `infrastructure/operations/qr.ts`).
 */

import { cn } from '@/lib/cn';
import type { MatrizQr } from '@infra/operations/qr';
import { caminoDeMatriz } from '@infra/operations/qr';

interface QrCodeProps {
  readonly matriz: MatrizQr;
  /** Qué representa el código, para quien no lo ve. */
  readonly descripcion: string;
  readonly className?: string;
}

/**
 * Margen obligatorio alrededor del código.
 *
 * La norma pide 4 módulos de zona tranquila. No es decorativo: sin ese borde
 * en blanco muchos lectores no encuentran los patrones de esquina, y el QR
 * que se ve perfecto en pantalla no escanea nunca.
 */
const ZONA_TRANQUILA = 4;

export function QrCode({ matriz, descripcion, className }: QrCodeProps) {
  const lado = matriz.length;
  if (lado === 0) return null;

  const total = lado + ZONA_TRANQUILA * 2;

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={descripcion}
      // `shapeRendering="crispEdges"` evita el antialias entre módulos: con
      // suavizado, los bordes quedan grises y el contraste que necesita el
      // lector se pierde.
      shapeRendering="crispEdges"
      className={cn('h-auto w-full max-w-[15rem]', className)}
    >
      {/* Fondo claro SIEMPRE, también en tema oscuro: un QR en negativo no lo
          lee la mayoría de los teléfonos. Es la única excepción del proyecto
          a pintar con tokens, y existe porque aquí el color es funcional. */}
      <rect width={total} height={total} fill="#ffffff" />
      <path d={caminoDeMatriz(matriz)} transform={`translate(${ZONA_TRANQUILA} ${ZONA_TRANQUILA})`} fill="#000000" />
    </svg>
  );
}
