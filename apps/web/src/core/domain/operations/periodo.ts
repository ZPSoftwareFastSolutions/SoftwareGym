/**
 * CAPA: Domain / Operations
 *
 * Periodos de fechas para filtros: «hoy», «ayer», «este mes»…
 *
 * Todos se calculan a partir del HOY DEL GIMNASIO que se recibe, nunca de
 * `new Date()`. En La Paz, a las 21:00, el servidor de Vercel ya está en el
 * día siguiente: «comprobantes de hoy» devolvería los de mañana.
 */

export type PresetDePeriodo = 'hoy' | 'ayer' | '7d' | '30d' | 'mes' | 'mes-anterior' | 'anio';

export const PRESETS_DE_PERIODO: readonly { readonly clave: PresetDePeriodo; readonly etiqueta: string }[] = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: 'ayer', etiqueta: 'Ayer' },
  { clave: '7d', etiqueta: 'Últimos 7 días' },
  { clave: '30d', etiqueta: 'Últimos 30 días' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'mes-anterior', etiqueta: 'Mes anterior' },
  { clave: 'anio', etiqueta: 'Este año' },
];

export interface RangoDeFechas {
  readonly desde?: string;
  readonly hasta?: string;
}

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Devuelve la fecha si tiene forma y existe en el calendario; si no, `undefined`. */
export function fechaIsoValida(valor: unknown): string | undefined {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return undefined;
  const fecha = new Date(`${valor}T12:00:00Z`);
  // `2026-02-31` pasa el patrón y `Date` lo convierte en 3 de marzo sin
  // avisar. Se compara la vuelta para rechazarlo.
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
    ? valor
    : undefined;
}

function desplazar(iso: string, dias: number): string {
  const fecha = new Date(`${iso}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function esPresetDePeriodo(valor: unknown): valor is PresetDePeriodo {
  return PRESETS_DE_PERIODO.some((preset) => preset.clave === valor);
}

export function rangoDePreset(preset: PresetDePeriodo, hoy: string): Required<RangoDeFechas> {
  const [anio, mes] = hoy.split('-');
  switch (preset) {
    case 'hoy':
      return { desde: hoy, hasta: hoy };
    case 'ayer': {
      const ayer = desplazar(hoy, -1);
      return { desde: ayer, hasta: ayer };
    }
    case '7d':
      return { desde: desplazar(hoy, -6), hasta: hoy };
    case '30d':
      return { desde: desplazar(hoy, -29), hasta: hoy };
    case 'mes':
      return { desde: `${anio}-${mes}-01`, hasta: hoy };
    case 'mes-anterior': {
      const primeroDeEste = `${anio}-${mes}-01`;
      const ultimoDelAnterior = desplazar(primeroDeEste, -1);
      return { desde: `${ultimoDelAnterior.slice(0, 7)}-01`, hasta: ultimoDelAnterior };
    }
    case 'anio':
      return { desde: `${anio}-01-01`, hasta: hoy };
  }
}

/**
 * Normaliza un rango escrito a mano.
 *
 * Si vienen al revés se intercambian en vez de devolver cero resultados: quien
 * escribe «desde 30, hasta 1» quiere ese mes, no una tabla vacía que parece un
 * error del sistema.
 */
export function normalizarRango(desde?: string, hasta?: string): RangoDeFechas {
  const d = fechaIsoValida(desde);
  const h = fechaIsoValida(hasta);
  if (d && h && d > h) return { desde: h, hasta: d };
  return { ...(d ? { desde: d } : {}), ...(h ? { hasta: h } : {}) };
}

/** Texto legible de un rango, para cabeceras de reporte y nombres de archivo. */
export function describirRango(rango: RangoDeFechas): string {
  if (rango.desde && rango.hasta) {
    return rango.desde === rango.hasta ? rango.desde : `${rango.desde} a ${rango.hasta}`;
  }
  if (rango.desde) return `desde ${rango.desde}`;
  if (rango.hasta) return `hasta ${rango.hasta}`;
  return 'todo el periodo';
}
