'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Pantalla Monitor de Ingresos (Tiempo Real)
 *
 * Muestra el resultado de los check-ins capturados por otros dispositivos
 * (ej: celular del recepcionista) en la misma sucursal.
 * Reacciona al instante mediante WebSockets (Supabase Broadcast).
 */

import { useEffect, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { IdentidadDeIngresoContenido } from './IdentidadDeIngreso';
import { RachaCalendario } from './RachaCalendario';
import type { ResultadoDeCheckIn } from '@core/domain/operations/attendance';
import type { ResumenDeRacha } from '@core/domain/operations/streak';
import { obtenerRachaSocio } from '@/app/[tenant]/panel/actions';
import { Icon } from '../icons/Icon';

export function PantallaMonitor({ slug }: { slug: string }) {
  const [ingreso, setIngreso] = useState<{ resultado: ResultadoDeCheckIn; racha: ResumenDeRacha | null; intento: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const clave = `gym-monitor-${slug}`;
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === clave && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          const resultado = data.payload as ResultadoDeCheckIn;
          
          // Si el resultado trae un socio identificado, obtenemos su racha completa
          if ('socio' in resultado && resultado.socio) {
            startTransition(async () => {
              const racha = await obtenerRachaSocio(slug, resultado.socio);
              setIngreso((prev) => ({
                resultado,
                racha,
                intento: (prev?.intento ?? 0) + 1,
              }));
            });
          } else {
            setIngreso((prev) => ({
              resultado,
              racha: null,
              intento: (prev?.intento ?? 0) + 1,
            }));
          }
        } catch (err) {
          console.error("Error interpretando evento del monitor:", err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [slug]);

  // Limpiar la pantalla después de 15 segundos
  useEffect(() => {
    if (!ingreso) return;
    const timer = setTimeout(() => {
      setIngreso(null);
    }, 15000); // 15 segundos en pantalla
    return () => clearTimeout(timer);
  }, [ingreso]);

  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center overflow-hidden bg-surface">
      {/* Fondo inactivo: Logo de la empresa gigante */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center transition-all duration-700',
          ingreso ? 'scale-110 opacity-0 blur-md' : 'scale-100 opacity-100 blur-0',
        )}
      >
        <Icon name="idcard" size={180} className="text-line opacity-50" />
        <p className="mt-8 text-2xl font-semibold tracking-widest text-muted/50 uppercase">
          Recepción Activa
        </p>
      </div>

      {/* Tarjeta de Identidad Activa */}
      {ingreso && (
        <div 
          key={ingreso.intento} // Fuerza re-montaje para animaciones iniciales
          className="z-10 w-full max-w-6xl animate-in fade-in zoom-in duration-500 flex flex-col md:flex-row gap-6 p-6"
        >
          {/* Lado izquierdo: Identidad principal (Foto, Nombre, Estado) */}
          <div className="flex-1 overflow-hidden rounded-[2rem] bg-surface-card shadow-2xl ring-1 ring-line/50 p-6">
            <div className="scale-110 origin-top">
              <IdentidadDeIngresoContenido
                resultado={ingreso.resultado}
                sucursal={ingreso.resultado.tipo === 'registrado' ? ingreso.resultado.sucursal : 'Sede General'}
              />
            </div>
          </div>

          {/* Lado derecho: Racha y Constancia (si existe) */}
          {ingreso.racha && (
            <div className="flex-1 overflow-hidden rounded-[2rem] bg-surface-card shadow-2xl ring-1 ring-line/50 p-8 flex flex-col justify-center">
              <h3 className="flex items-center gap-2 t-h3 mb-6">
                <span className="text-action">🔥</span> Constancia
              </h3>
              <div className="scale-[1.15] origin-top-left">
                <RachaCalendario racha={ingreso.racha} compacto={false} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
