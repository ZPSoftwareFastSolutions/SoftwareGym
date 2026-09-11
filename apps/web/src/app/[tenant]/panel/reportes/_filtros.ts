/**
 * Lectura de los filtros de un reporte desde la URL.
 *
 * Existe como módulo propio por una razón concreta: la PÁGINA del reporte y su
 * DESCARGA CSV tienen que leer los filtros exactamente igual. Si cada una los
 * interpretara a su manera, el CSV descargado no coincidiría con la tabla que
 * se estaba mirando, y ese es el tipo de error que nadie detecta hasta que
 * cuadra mal una caja.
 */

import {
  esPresetDePeriodo,
  normalizarRango,
  rangoDePreset,
  type PresetDePeriodo,
  type RangoDeFechas,
} from '@core/domain/operations/periodo';
import type { DefinicionDeReporte, FiltroDeReporte } from '@core/domain/operations/reports';

export type ParametrosDeUrl = Readonly<Record<string, string | string[] | undefined>>;

function uno(valor: string | string[] | undefined, largo = 60): string {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return typeof bruto === 'string' ? bruto.trim().slice(0, largo) : '';
}

export interface FiltrosLeidos {
  readonly filtro: FiltroDeReporte;
  readonly rango: RangoDeFechas;
  /** Preset activo, o `null` si el rango es personalizado o no hay periodo. */
  readonly preset: PresetDePeriodo | null;
  /** Parámetros normalizados, para reconstruir la URL del CSV y de los enlaces. */
  readonly consulta: string;
}

export function leerFiltros(
  definicion: DefinicionDeReporte,
  parametros: ParametrosDeUrl,
  hoy: string,
): FiltrosLeidos {
  const admiteperiodo = definicion.filtros.includes('periodo');

  let preset: PresetDePeriodo | null = null;
  let rango: RangoDeFechas = {};

  if (admiteperiodo) {
    const presetCrudo = uno(parametros.preset, 20);
    const personalizado = normalizarRango(uno(parametros.desde, 10), uno(parametros.hasta, 10));

    if (esPresetDePeriodo(presetCrudo)) {
      preset = presetCrudo;
      rango = rangoDePreset(presetCrudo, hoy);
    } else if (personalizado.desde || personalizado.hasta) {
      rango = personalizado;
    } else if (presetCrudo !== 'todo' && definicion.periodoPorDefecto) {
      // Sin nada elegido se abre con el periodo por defecto del reporte: un
      // reporte de pagos «desde siempre» es lento y rara vez lo que se busca.
      // `preset=todo` es la forma explícita de pedir todo el histórico.
      preset = definicion.periodoPorDefecto;
      rango = rangoDePreset(definicion.periodoPorDefecto, hoy);
    }
  }

  const filtro: FiltroDeReporte = {
    ...rango,
    ...(uno(parametros.estado, 20) ? { estado: uno(parametros.estado, 20) } : {}),
    ...(uno(parametros.plan, 40) ? { planId: uno(parametros.plan, 40) } : {}),
    ...(uno(parametros.metodo, 20) ? { metodo: uno(parametros.metodo, 20) } : {}),
    ...(uno(parametros.origen, 20) ? { origen: uno(parametros.origen, 20) } : {}),
    ...(uno(parametros.rol, 20) ? { rol: uno(parametros.rol, 20) } : {}),
    ...(uno(parametros.q) ? { q: uno(parametros.q) } : {}),
    ...(uno(parametros.sucursal, 20) ? { sucursal: uno(parametros.sucursal, 20) } : {}),
  };

  const busqueda = new URLSearchParams();
  if (preset) busqueda.set('preset', preset);
  else if (admiteperiodo && !rango.desde && !rango.hasta && uno(parametros.preset, 20) === 'todo') {
    busqueda.set('preset', 'todo');
  } else {
    if (rango.desde) busqueda.set('desde', rango.desde);
    if (rango.hasta) busqueda.set('hasta', rango.hasta);
  }
  if (filtro.estado) busqueda.set('estado', filtro.estado);
  if (filtro.planId) busqueda.set('plan', filtro.planId);
  if (filtro.metodo) busqueda.set('metodo', filtro.metodo);
  if (filtro.origen) busqueda.set('origen', filtro.origen);
  if (filtro.rol) busqueda.set('rol', filtro.rol);
  if (filtro.q) busqueda.set('q', filtro.q);
  if (filtro.sucursal) busqueda.set('sucursal', filtro.sucursal);

  return { filtro, rango, preset, consulta: busqueda.toString() };
}
