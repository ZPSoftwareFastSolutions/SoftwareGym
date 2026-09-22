'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Tarjeta de QR del socio para imprimir y recortar (V5).
 *
 * EL PDF SE DIBUJA, NO SE FOTOGRAFÍA. Antes se rasterizaba la vista previa con
 * html2canvas y esa imagen se estiraba hasta cubrir la hoja. De ahí venían los
 * tres defectos: la vista previa tenía SIEMPRE proporción A4, así que en Carta
 * u Oficio todo salía estirado —el QR achatado no escanea bien—; el texto, al
 * ser un mapa de bits reescalado, salía con las letras partidas; y el token de
 * 24 caracteres se desbordaba del marco porque nadie medía si cabía.
 *
 * Ahora se dibuja con las primitivas del PDF: el texto es texto (nítido a
 * cualquier zoom y se puede copiar), el QR son rectángulos calculados desde su
 * matriz (cuadrado exacto), y la geometría sale de `impresion-de-qr.ts`, en
 * milímetros de la hoja REAL. La vista previa lee esos mismos números, así que
 * lo que se ve en pantalla es lo que sale por la impresora.
 *
 * La matriz llega ya calculada desde el servidor: `qrcode-generator` no entra
 * al paquete del navegador (§2.8).
 */

import { useState } from 'react';
import {
  celdaDeLaHoja,
  COLUMNAS,
  distribucionDeTarjeta,
  FILAS,
  HOJAS,
  cuerpoQueCabe,
  lineasDelToken,
  nombreDelArchivo,
  PUNTO_EN_MM,
  tramosDeFila,
  type TamanoDeHoja,
} from '@core/domain/operations/impresion-de-qr';
import { dibujarTarjetaQr } from './qr-pdf';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';

interface ImprimirQrSocioProps {
  readonly gymName: string;
  /** Matriz del QR calculada en el servidor. */
  readonly matriz: readonly (readonly boolean[])[];
  readonly ficha: {
    readonly fullName: string;
    readonly code: string | null;
    readonly checkinToken: string | null;
  };
}

/** Lo que el PDF escribe en negro; el resto del papel se deja blanco. */
const NEGRO: readonly [number, number, number] = [17, 17, 17];
const GRIS: readonly [number, number, number] = [110, 110, 110];

export function ImprimirQrSocio({ gymName, matriz, ficha }: ImprimirQrSocioProps) {
  const [tamano, setTamano] = useState<TamanoDeHoja>('carta');
  const [posicion, setPosicion] = useState<{ readonly fila: number; readonly col: number }>({ fila: 0, col: 0 });
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoja = HOJAS[tamano];
  const token = ficha.checkinToken ?? '';
  const lineasToken = lineasDelToken(token);
  const celda = celdaDeLaHoja(hoja, posicion.fila, posicion.col);
  const tarjeta = distribucionDeTarjeta(celda, lineasToken.length);

  const descargarPdf = async () => {
    setDescargando(true);
    setError(null);
    try {
      // Carga diferida: el generador de PDF solo baja cuando alguien lo pide.
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: hoja.formato });
      dibujarTarjetaQr(pdf, {
        hoja,
        fila: posicion.fila,
        columna: posicion.col,
        gimnasio: gymName,
        nombre: ficha.fullName,
        codigo: ficha.code,
        token,
        matriz,
      });
      pdf.save(nombreDelArchivo(ficha.fullName, ficha.code));
    } catch {
      setError('No se pudo generar el PDF. Vuelve a intentarlo.');
    } finally {
      setDescargando(false);
    }
  };

  if (matriz.length === 0) {
    return <p className="surface-card p-6 text-[0.9rem] text-muted">Este socio todavía no tiene código QR.</p>;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex shrink-0 flex-col gap-6 lg:w-80">
        <section className="surface-card border-action/40 p-6">
          <h2 className="t-h3 flex items-center gap-2">
            <Icon name="printer" size={18} className="text-action" />
            Opciones de impresión
          </h2>

          <div className="mt-5 flex flex-col gap-5">
            <div>
              <span className="mb-2 block text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted">Tamaño de hoja</span>
              <div className="flex flex-col gap-2">
                {(Object.keys(HOJAS) as TamanoDeHoja[]).map((clave) => (
                  <label key={clave} className="flex cursor-pointer items-center gap-2.5 text-[0.9rem] text-ink">
                    <input
                      type="radio"
                      name="tamano"
                      value={clave}
                      checked={tamano === clave}
                      onChange={() => setTamano(clave)}
                      className="h-4 w-4 accent-[var(--t-action)]"
                    />
                    {HOJAS[clave].nombre}
                    <span className="text-[0.78rem] text-muted">
                      {HOJAS[clave].ancho} × {HOJAS[clave].alto} mm
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted">Posición en la hoja</span>
              <div
                className="grid w-full max-w-[200px] gap-1 rounded-[var(--t-radius-md)] border border-line bg-raised p-1"
                style={{ aspectRatio: `${hoja.ancho}/${hoja.alto}`, gridTemplateColumns: `repeat(${COLUMNAS}, 1fr)` }}
              >
                {Array.from({ length: FILAS * COLUMNAS }).map((_, indice) => {
                  const fila = Math.floor(indice / COLUMNAS);
                  const col = indice % COLUMNAS;
                  const elegida = posicion.fila === fila && posicion.col === col;
                  return (
                    <button
                      key={indice}
                      type="button"
                      onClick={() => setPosicion({ fila, col })}
                      aria-label={`Fila ${fila + 1}, columna ${col + 1}`}
                      aria-pressed={elegida}
                      className={cn(
                        'h-full w-full rounded-[var(--t-radius-sm)] border transition-colors',
                        elegida ? 'border-action bg-action/25' : 'border-line/60 bg-surface hover:border-action/50 hover:bg-raised',
                      )}
                    >
                      {elegida && <span className="mx-auto block h-2 w-2 rounded-full bg-action" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[0.78rem] leading-relaxed text-muted">
                Útil para aprovechar una hoja de etiquetas: elige el hueco que todavía no usaste.
              </p>
            </div>

            <div className="border-t border-line pt-5">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={descargando ? 'refresh' : 'download'}
                iconPosition="start"
                onClick={descargarPdf}
                disabled={descargando}
                aria-busy={descargando}
              >
                {descargando ? 'Generando PDF…' : 'Descargar PDF'}
              </Button>
              {error && (
                <p role="alert" className="mt-3 text-[0.84rem] text-action">
                  {error}
                </p>
              )}
              <p className="mt-3 text-[0.78rem] leading-relaxed text-muted">
                Imprime al 100 % (sin «ajustar a la página») para que el QR conserve su tamaño.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-1 items-start justify-center rounded-[var(--t-radius-lg)] border border-line bg-raised/30 p-4">
        {/* LA VISTA PREVIA ES EL MISMO DIBUJO QUE EL PDF, no una maqueta
            parecida: un SVG cuyo sistema de coordenadas SON los milímetros de
            la hoja elegida. Cambiar de Carta a Oficio cambia la proporción de
            verdad, y el texto se coloca con las mismas líneas base. */}
        <svg
          viewBox={`0 0 ${hoja.ancho} ${hoja.alto}`}
          className="h-auto w-full max-w-[520px] bg-white shadow-sm"
          role="img"
          aria-label={`Vista previa de la tarjeta de ${ficha.fullName} en hoja ${hoja.nombre}`}
        >
          <rect x="0" y="0" width={hoja.ancho} height={hoja.alto} fill="#ffffff" />

          {/* Las demás casillas, apenas insinuadas: sitúan la tarjeta en la hoja. */}
          {Array.from({ length: FILAS * COLUMNAS }).map((_, indice) => {
            const fila = Math.floor(indice / COLUMNAS);
            const col = indice % COLUMNAS;
            if (fila === posicion.fila && col === posicion.col) return null;
            const otra = celdaDeLaHoja(hoja, fila, col);
            return (
              <rect
                key={indice}
                x={otra.x + 1.5}
                y={otra.y + 1.5}
                width={otra.ancho - 3}
                height={otra.alto - 3}
                fill="none"
                stroke="#ededed"
                strokeWidth={0.2}
              />
            );
          })}

          <rect
            x={tarjeta.marco.x}
            y={tarjeta.marco.y}
            width={tarjeta.marco.ancho}
            height={tarjeta.marco.alto}
            fill="none"
            stroke="#bebebe"
            strokeWidth={0.2}
            strokeDasharray="1.2 1.2"
          />

          <text
            x={tarjeta.gimnasio.x + tarjeta.gimnasio.ancho / 2}
            y={tarjeta.gimnasio.y + tarjeta.gimnasio.alto - 0.6}
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="700"
            letterSpacing="0.35"
            fontSize={cuerpoQueCabe(gymName.toUpperCase(), tarjeta.gimnasio.ancho, tarjeta.cuerpos.gimnasio, 0.62) * PUNTO_EN_MM}
            fill="#111111"
          >
            {gymName.toUpperCase()}
          </text>

          <g transform={`translate(${tarjeta.qr.x} ${tarjeta.qr.y}) scale(${tarjeta.qr.ancho / matriz.length})`}>
            <rect x="0" y="0" width={matriz.length} height={matriz.length} fill="#ffffff" />
            {matriz.map((fila, y) =>
              tramosDeFila(fila).map((tramo) => (
                <rect key={`${y}-${tramo.desde}`} x={tramo.desde} y={y} width={tramo.largo} height={1} fill="#111111" />
              )),
            )}
          </g>

          <text
            x={tarjeta.nombre.x + tarjeta.nombre.ancho / 2}
            y={tarjeta.nombre.y + tarjeta.nombre.alto - 0.6}
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="700"
            fontSize={cuerpoQueCabe(ficha.fullName, tarjeta.nombre.ancho, tarjeta.cuerpos.nombre, 0.52) * PUNTO_EN_MM}
            fill="#111111"
          >
            {ficha.fullName}
          </text>

          {ficha.code && (
            <text
              x={tarjeta.codigo.x + tarjeta.codigo.ancho / 2}
              y={tarjeta.codigo.y + tarjeta.codigo.alto - 0.6}
              textAnchor="middle"
              fontFamily="Helvetica, Arial, sans-serif"
              letterSpacing="0.2"
              fontSize={cuerpoQueCabe(ficha.code, tarjeta.codigo.ancho, tarjeta.cuerpos.codigo, 0.55) * PUNTO_EN_MM}
              fill="#111111"
            >
              {ficha.code}
            </text>
          )}

          {lineasToken.map((linea, indice) => {
            const recuadro = tarjeta.token[indice];
            if (!recuadro) return null;
            return (
              <text
                key={linea}
                x={recuadro.x + recuadro.ancho / 2}
                y={recuadro.y + recuadro.alto - 0.6}
                textAnchor="middle"
                fontFamily="Courier, monospace"
                fontSize={cuerpoQueCabe(linea, recuadro.ancho, tarjeta.cuerpos.token, 0.6) * PUNTO_EN_MM}
                fill="#6e6e6e"
              >
                {linea}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
