'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QrCode } from '../ui/QrCode';
import { matrizQr } from '@infra/operations/qr';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { cn } from '@/lib/cn';

interface ImprimirQrSocioProps {
  readonly slug: string;
  readonly gymName: string;
  readonly ficha: {
    readonly id: string;
    readonly fullName: string;
    readonly code: string | null;
    readonly checkinToken: string | null;
  };
}

const TAMAÑOS = {
  carta: { nombre: 'Carta', ancho: '215.9mm', alto: '279.4mm' },
  oficio: { nombre: 'Oficio', ancho: '215.9mm', alto: '330.2mm' },
  a4: { nombre: 'A4', ancho: '210mm', alto: '297mm' },
} as const;

type Tamano = keyof typeof TAMAÑOS;

export function ImprimirQrSocio({ slug, gymName, ficha }: ImprimirQrSocioProps) {
  const [tamano, setTamano] = useState<Tamano>('carta');
  const [posicion, setPosicion] = useState<{ fila: number; col: number }>({ fila: 0, col: 0 });
  const [descargando, setDescargando] = useState(false);

  const matriz = ficha.checkinToken ? matrizQr(ficha.checkinToken) : null;
  const dimension = TAMAÑOS[tamano];

  const filas = 4;
  const columnas = 3;

  const descargarPDF = async () => {
    const elemento = document.getElementById('zona-impresion-pdf');
    if (!elemento) return;
    
    setDescargando(true);
    try {
      const canvas = await html2canvas(elemento, {
        scale: 4, // Alta resolución para impresión
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const formato = tamano === 'carta' ? 'letter' : tamano === 'oficio' ? 'legal' : 'a4';
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: formato
      });
      
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`QR_${ficha.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el PDF. Intenta de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  if (!matriz) return <p>No hay código QR para este socio.</p>;

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Controles */}
        <div className="flex flex-col gap-6 lg:w-80 shrink-0">
          <section className="surface-card p-6 border-action/40">
            <h2 className="t-h3 flex items-center gap-2">
              <Icon name="printer" size={18} className="text-action" />
              Opciones de impresión
            </h2>
            
            <div className="mt-5 flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-[0.85rem] font-semibold text-muted uppercase tracking-[0.1em]">Tamaño de hoja</label>
                <div className="flex flex-col gap-2">
                  {(Object.keys(TAMAÑOS) as Tamano[]).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer text-[0.9rem] text-ink">
                      <input 
                        type="radio" 
                        name="tamano" 
                        value={t} 
                        checked={tamano === t} 
                        onChange={() => setTamano(t)} 
                        className="text-action focus:ring-action"
                      />
                      {TAMAÑOS[t].nombre}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[0.85rem] font-semibold text-muted uppercase tracking-[0.1em]">Posición en la hoja</label>
                <div className="grid grid-cols-3 gap-1 w-full max-w-[200px] aspect-[3/4] p-1 bg-raised border border-line rounded-[var(--t-radius-md)]">
                  {Array.from({ length: filas * columnas }).map((_, i) => {
                    const fila = Math.floor(i / columnas);
                    const col = i % columnas;
                    const isSelected = posicion.fila === fila && posicion.col === col;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPosicion({ fila, col })}
                        aria-label={`Posición fila ${fila + 1}, columna ${col + 1}`}
                        className={cn(
                          "w-full h-full rounded-[var(--t-radius-sm)] border transition-all",
                          isSelected 
                            ? "bg-action/20 border-action shadow-sm" 
                            : "bg-surface border-line/50 hover:border-action/50 hover:bg-raised"
                        )}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-action mx-auto" />}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[0.78rem] text-muted">Selecciona en qué parte de la hoja quieres imprimir el QR (útil para tarjetas adhesivas).</p>
              </div>

              <div className="mt-2 border-t border-line pt-5">
                <Button 
                  variant="primary" 
                  size="lg" 
                  fullWidth 
                  icon={descargando ? 'refresh' : 'download'}
                  iconPosition="start" 
                  onClick={descargarPDF}
                  disabled={descargando}
                >
                  {descargando ? 'Generando PDF...' : 'Descargar PDF para Imprimir'}
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Vista Previa */}
        <div className="flex-1 flex justify-center items-start overflow-hidden bg-raised/30 p-4 rounded-[var(--t-radius-lg)] border border-line">
          <div 
            id="zona-impresion-pdf"
            className="bg-white shadow-sm border border-line relative overflow-hidden"
            style={{
              width: '100%',
              maxWidth: '500px', // Escala visual en pantalla
              aspectRatio: '210/297'
            }}
          >
            {/* Grid para el elemento posicionable */}
            <div 
              className="absolute inset-0 p-[5%] grid"
              style={{
                gridTemplateRows: `repeat(${filas}, 1fr)`,
                gridTemplateColumns: `repeat(${columnas}, 1fr)`
              }}
            >
              <div 
                className="flex flex-col items-center justify-center text-center p-2 border border-dashed border-action/40"
                style={{
                  gridRowStart: posicion.fila + 1,
                  gridColumnStart: posicion.col + 1
                }}
              >
                <p className="text-[0.6rem] font-bold text-black uppercase mb-1 whitespace-nowrap overflow-hidden text-ellipsis w-full">
                  {gymName}
                </p>
                <div className="w-full max-w-[80%] aspect-square">
                  <QrCode matriz={matriz} descripcion="QR del socio" className="w-full h-full" />
                </div>
                <p className="text-[0.6rem] font-bold text-black mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full">
                  {ficha.fullName}
                </p>
                {ficha.code && <p className="text-[0.5rem] text-black/80">{ficha.code}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
