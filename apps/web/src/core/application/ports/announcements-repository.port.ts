/**
 * CAPA: Application / Ports
 *
 * Puertos de anuncios (V4.1).
 *
 * Dos, por el mismo motivo que en sucursales y clases: la vitrina se sirve SIN
 * sesión (si leyera cookies saldría del CDN) y el panel CON la sesión de quien
 * pregunta. Un solo puerto invitaría a usar el cliente con cookies en una
 * página estática.
 */

import type { Anuncio, AnuncioPublico, DatosDeAnuncio } from '../../domain/operations/announcements';
import type { ResultadoDeOperacion } from './resultado';

export interface AnnouncementsRepositoryPort {
  /** Todos los del gimnasio de la sesión, publicados o no, ya ordenados. */
  listar(): Promise<readonly Anuncio[]>;

  porId(id: string): Promise<Anuncio | null>;

  /** URL pública de la imagen de un anuncio. `null` si no tiene. */
  urlDeImagen(imagePath: string | null): string | null;

  /** `tenantId` sale del perfil de la sesión, nunca del formulario. RLS lo vuelve a exigir. */
  crear(tenantId: string, datos: DatosDeAnuncio): Promise<ResultadoDeOperacion<{ readonly id: string }>>;

  actualizar(id: string, datos: DatosDeAnuncio): Promise<ResultadoDeOperacion<null>>;

  /** Retirar o volver a publicar. No se borra: el anuncio tuvo tráfico y quedó en la bitácora. */
  cambiarEstado(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>>;

  /** Sube el arte al bucket y devuelve su ruta. La carpeta es la del gimnasio. */
  subirImagen(
    tenantId: string,
    bytes: Uint8Array,
    tipo: 'image/jpeg' | 'image/png' | 'image/webp',
  ): Promise<ResultadoDeOperacion<{ readonly imagePath: string }>>;
}

export interface PublicAnnouncementsPort {
  /**
   * Anuncios publicados y vigentes de un gimnasio, para la vitrina. Vacío si no
   * hay o si la base no responde: un anuncio nunca justifica un 500 en el inicio.
   */
  anunciosPublicos(tenantSlug: string): Promise<readonly AnuncioPublico[]>;
}
