'use client';

import { useState } from 'react';
import type { ClaseGym } from '@core/domain/catalog/catalog';
import type { DayHours } from '@core/domain/schedule';
import type { Sede } from '@core/domain/catalog/branches';
import { cn } from '@/lib/cn';
import { Reveal } from '@/presentation/ui/Reveal';
import { Icon } from '@/presentation/icons/Icon';

interface ScheduleTabsProps {
  readonly classes: readonly ClaseGym[];
  readonly hours: readonly DayHours[];
  readonly sedes: readonly Sede[];
}

export function ScheduleTabsV2({ classes, hours, sedes }: ScheduleTabsProps) {
  const [activeTab, setActiveTab] = useState<'atencion' | 'clases'>('atencion');
  const [activeSede, setActiveSede] = useState<string>(sedes[0]?.code || '');

  const filteredClasses = classes.map(c => ({
    ...c,
    horarios: c.horarios.filter(h => h.branchCode === activeSede)
  })).filter(c => c.horarios.length > 0);

  const currentSedeHours = hours; // In this domain, hours is general or per sede. Assuming general for now.

  return (
    <div className="w-full max-w-5xl mx-auto py-12">
      {/* TABS HEADER */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
        <button
          onClick={() => setActiveTab('atencion')}
          className={cn(
            'px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 border',
            activeTab === 'atencion' 
              ? 'bg-action text-black border-action shadow-[0_0_20px_rgba(57,255,20,0.3)]' 
              : 'bg-black/40 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
          )}
        >
          <div className="flex items-center gap-2">
            <Icon name="clock" size={24} />
            Horario de Atención
          </div>
        </button>
        <button
          onClick={() => setActiveTab('clases')}
          className={cn(
            'px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 border',
            activeTab === 'clases' 
              ? 'bg-action text-black border-action shadow-[0_0_20px_rgba(57,255,20,0.3)]' 
              : 'bg-black/40 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
          )}
        >
          <div className="flex items-center gap-2">
            <Icon name="group" size={24} />
            Horario de Clases
          </div>
        </button>
      </div>

      {/* SUCURSAL SELECTOR (if multiple) */}
      {sedes.length > 1 && (
        <div className="flex justify-center gap-2 mb-8">
          {sedes.map(sede => (
            <button
              key={sede.code}
              onClick={() => setActiveSede(sede.code)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                activeSede === sede.code
                  ? 'bg-white/20 text-white'
                  : 'bg-transparent text-white/40 hover:bg-white/10 hover:text-white/80'
              )}
            >
              {sede.name}
            </button>
          ))}
        </div>
      )}

      {/* CONTENT: ATENCIÓN */}
      {activeTab === 'atencion' && (
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {hours.map((day, idx) => (
              <div 
                key={day.day} 
                className={cn(
                  'flex flex-col items-center p-6 rounded-3xl border border-white/10 backdrop-blur-md transition-transform hover:scale-105',
                  day.closed ? 'bg-red-500/10 border-red-500/20' : 'bg-black/60 hover:border-action/40'
                )}
              >
                <h4 className="text-xl font-black text-white mb-4 uppercase tracking-widest">{day.day.substring(0, 3)}</h4>
                {day.closed ? (
                  <span className="text-red-400 font-bold text-sm">CERRADO</span>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-action font-mono text-lg">
                    <span>{day.open}</span>
                    <div className="w-px h-4 bg-white/20" />
                    <span>{day.close}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* CONTENT: CLASES */}
      {activeTab === 'clases' && (
        <Reveal>
          <div className="space-y-4">
            {filteredClasses.length === 0 ? (
              <div className="text-center py-12 text-white/40">No hay clases programadas para esta sede.</div>
            ) : (
              filteredClasses.map((clase, idx) => {
                let bgClass = 'bg-black/60 border-white/10';
                if (clase.name.toLowerCase().includes('baile')) bgClass = 'bg-purple-900/40 border-purple-500/30';
                else if (clase.name.toLowerCase().includes('fight')) bgClass = 'bg-red-900/40 border-red-500/30';
                else if (clase.name.toLowerCase().includes('heels')) bgClass = 'bg-pink-900/40 border-pink-500/30';

                return (
                  <div key={clase.id} className={cn('flex flex-col md:flex-row items-center justify-between p-6 rounded-3xl border backdrop-blur-md gap-6 transition-all hover:scale-[1.02]', bgClass)}>
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--t-font-display)' }}>{clase.name}</h4>
                      <p className="text-white/60 text-sm">{clase.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                      {clase.horarios.map((h, i) => {
                        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                        return (
                          <div key={i} className="flex flex-col items-center bg-black/40 px-4 py-2 rounded-xl min-w-[100px] border border-white/5">
                            <span className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">{days[h.weekday]}</span>
                            <span className="text-action font-mono">{h.startTime}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Reveal>
      )}
    </div>
  );
}
