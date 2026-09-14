/**
 * CAPA: Presentation / App — carga de cualquier página del panel (V4).
 *
 * Next muestra esto EN EL ACTO al navegar entre secciones, mientras el servidor
 * arma la página: la cabecera y la navegación quedan, y el cuerpo enseña su forma
 * en gris. Antes, un clic en «Socios» dejaba la página anterior quieta hasta que
 * llegaba la nueva, y eso se leía como «se colgó».
 */

import { EsqueletoDePagina } from '@/presentation/ui/Cargando';

export default function CargandoPanel() {
  return <EsqueletoDePagina />;
}
