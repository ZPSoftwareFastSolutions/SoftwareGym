/**
 * CAPA: Infrastructure / Maps
 *
 * Ubicación de una sede a partir de su enlace de Google Maps (V4.2).
 *
 * Gerencia pega el enlace de «Compartir» (`https://maps.app.goo.gl/…`). Ese
 * enlace no se puede incrustar ni trae coordenadas: hay que seguir sus
 * redirecciones. Se hace UNA vez, al guardar la sede, y se guarda lo que se
 * encontró; la vitrina sigue siendo estática y no pide nada a Google al pintar.
 *   · Si la dirección final trae coordenadas (`@lat,lng`, `!3d…!4d…`), esas.
 *   · Si lleva a la ficha de un lugar (`/maps/place/<nombre>/…`), el enlace
 *     estable de ese lugar: su nombre ubica el mapa embebido.
 *
 * Es una petición que el servidor hace a una dirección escrita por una
 * persona, así que va acotada: solo `https`, solo hosts de Google en CADA salto
 * (`esHostDeGoogleMaps`), sin seguir redirecciones automáticamente, cinco
 * saltos, cinco segundos y sin leer cuerpos. Si algo falla, devuelve lo que
 * haya (nada, en el peor caso) y la sede se guarda igual, con su dirección.
 */

import {
  coordenadasDeEnlaceDeMaps,
  enlaceDelLugarDeMaps,
  esEnlaceCortoDeMaps,
  esHostDeGoogleMaps,
  type Coordenadas,
} from '@core/domain/operations/branches';

const SALTOS_MAXIMOS = 5;

export interface UbicacionDeEnlace {
  readonly coordenadas: Coordenadas | null;
  /** Enlace del lugar al que lleva el enlace corto, o `null` si no se llegó a uno. */
  readonly enlaceDelLugar: string | null;
}

function urlPermitida(texto: string, base?: string): URL | null {
  try {
    const url = new URL(texto, base);
    if (url.protocol !== 'https:' || !esHostDeGoogleMaps(url.hostname) || url.username || url.password || url.port) return null;
    // La pantalla de consentimiento de Google guarda el destino real en `continue`.
    if (url.hostname.startsWith('consent.')) {
      const destino = url.searchParams.get('continue');
      return destino ? urlPermitida(destino) : null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function ubicacionDeEnlaceDeGoogleMaps(enlace: string): Promise<UbicacionDeEnlace> {
  const directas = coordenadasDeEnlaceDeMaps(enlace);
  if (directas || !esEnlaceCortoDeMaps(enlace)) {
    return { coordenadas: directas, enlaceDelLugar: null };
  }

  let actual = urlPermitida(enlace);
  let enlaceDelLugar: string | null = null;
  const limite = AbortSignal.timeout(5_000);
  try {
    for (let salto = 0; actual && salto < SALTOS_MAXIMOS; salto += 1) {
      const respuesta = await fetch(actual, {
        method: 'HEAD',
        redirect: 'manual',
        signal: limite,
        cache: 'no-store',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; GymPlatform/1.0)' },
      });
      const destino = respuesta.headers.get('location');
      if (respuesta.status < 300 || respuesta.status >= 400 || !destino) break;

      const siguiente = urlPermitida(destino, actual.href);
      if (!siguiente) break;
      const coordenadas = coordenadasDeEnlaceDeMaps(siguiente.href);
      enlaceDelLugar = enlaceDelLugarDeMaps(siguiente.href) ?? enlaceDelLugar;
      if (coordenadas) return { coordenadas, enlaceDelLugar };
      if (enlaceDelLugar) break;
      actual = siguiente;
    }
  } catch {
    // Sin red o sin respuesta a tiempo: se guarda lo que se tenga.
  }
  return { coordenadas: null, enlaceDelLugar };
}
