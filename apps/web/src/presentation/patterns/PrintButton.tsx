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
  const handlePrint = async () => {
    // Tomamos el main principal como contenedor (el page layout).
    const element = document.querySelector('main');
    if (!element) {
      window.print();
      return;
    }
    
    // Ocultar temporalmente elementos de navegación/UI al generar el PDF
    const hideElements = document.querySelectorAll('[data-print="hide"]');
    const originalStyles = Array.from(hideElements).map(el => (el as HTMLElement).style.display);
    hideElements.forEach(el => (el as HTMLElement).style.display = 'none');

    try {
      // Dynamic import para que no pese en el bundle inicial
      const html2pdf = (await import('html2pdf.js')).default;
      const tituloReporte = document.querySelector('h1')?.textContent || 'Reporte';
      const opt = {
        margin:       10,
        filename:     `${tituloReporte.replace(/ /g, '_')}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generando PDF:', err);
      // Fallback nativo
      window.print();
    } finally {
      // Restaurar visibilidad
      hideElements.forEach((el, idx) => (el as HTMLElement).style.display = originalStyles[idx] || '');
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      icon="layers"
      iconPosition="start"
      onClick={handlePrint}
    >
      Guardar PDF
    </Button>
  );
}
