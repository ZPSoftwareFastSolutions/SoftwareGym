'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Botón de impresión.
 *
 * Existe como componente propio y mínimo para que el reporte —que es un
 * Server Component— no tenga que declararse cliente entero por una llamada a
 * `window.print()`. Es la regla del proyecto: `'use client'` lo más abajo
 * posible del árbol (§2.5).
 *
 * La impresión es la exportación a PDF: el diálogo del navegador ofrece
 * «Guardar como PDF» en todas las plataformas, con las hojas de estilo de
 * impresión ya preparadas en `globals.css`. Un generador de PDF en el
 * servidor añadiría cientos de kilobytes y una fuente más de fallos para
 * producir un archivo peor maquetado.
 */

import { Button } from '../ui/Button';

export function PrintButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon="layers"
      iconPosition="start"
      onClick={() => window.print()}
    >
      Imprimir o guardar PDF
    </Button>
  );
}
