/**
 * CAPA: Presentation / Sections
 *
 * Anuncios del gimnasio en la vitrina (V4.1).
 *
 * Sección de servidor: el encabezado y el texto se renderizan en el servidor
 * (se indexan y se leen sin JavaScript) y solo el carrusel —que necesita
 * desplazamiento y una ventana de detalle— baja al navegador.
 *
 * Idéntica para cualquier gimnasio. Sin anuncios publicados no se dibuja nada:
 * un carrusel vacío es peor que no tenerlo, y así un gimnasio puede encender la
 * capacidad antes de publicar su primer panfleto sin que se le note.
 */

import type { AnuncioPublico } from '@core/domain/operations/announcements';
import { AnunciosCarrusel } from '../patterns/AnunciosCarrusel';
import { SectionHeading } from '../ui/SectionHeading';

interface AnnouncementsSectionProps {
  readonly anuncios: readonly AnuncioPublico[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

export function AnnouncementsSection({
  anuncios,
  eyebrow = 'Novedades',
  title = 'Lo que está pasando',
  lead = 'Clases nuevas, eventos y promociones. Toca cualquiera para ver todos los detalles.',
}: AnnouncementsSectionProps) {
  if (anuncios.length === 0) return null;

  // `aria-label` y no `aria-labelledby`: `SectionHeading` no emite un id al que
  // apuntar, y una referencia rota deja la sección sin nombre accesible.
  return (
    <section className="section" aria-label={title}>
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />
        <div className="mt-12">
          <AnunciosCarrusel anuncios={anuncios} />
        </div>
      </div>
    </section>
  );
}
