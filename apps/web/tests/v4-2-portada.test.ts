/**
 * Pruebas de V4.2 · Composición de la portada y horario resumido.
 *
 * Lo que se fija aquí es la promesa de la capacidad: un gimnasio que no declara
 * nada conserva EXACTAMENTE la portada de antes, uno que declara la suya obtiene
 * su orden, y ninguna combinación mal escrita llega a producción (el validador
 * la para en el build).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPOSICION_CLASICA,
  composicionDe,
  erroresDeComposicion,
  seccionesVisibles,
} from '../src/core/domain/tenant/home-layout.ts';
import { resumirHorario } from '../src/core/domain/tenant/horario.ts';

const TODO_ENCENDIDO = {
  enableAnnouncements: true,
  showPlans: true,
  showSchedule: true,
  showFacilities: true,
  showGallery: true,
  showProducts: true,
  showTestimonials: true,
  showFaq: true,
} as const;

describe('V4.2 · composición de la portada', () => {
  it('sin declarar nada, la portada es la de siempre, en el mismo orden', () => {
    // Este orden es el que tenía la página escrito a mano antes de la capacidad.
    // Si cambia, Mítico y Aurora cambian sin haberlo pedido.
    assert.deepEqual(composicionDe(undefined), COMPOSICION_CLASICA);
    assert.deepEqual(COMPOSICION_CLASICA.secciones, [
      'anuncios', 'marquesina', 'servicios', 'sucursales', 'planes', 'productos', 'testimonios', 'preguntas', 'cierre',
    ]);
    assert.equal(COMPOSICION_CLASICA.estilo, 'clasica');
    assert.equal(COMPOSICION_CLASICA.planes, 'tarjetas');
  });

  it('lo no declarado se toma de la clásica', () => {
    const c = composicionDe({ planes: 'tarifario' });
    assert.equal(c.planes, 'tarifario');
    assert.equal(c.estilo, 'clasica');
    assert.deepEqual(c.secciones, COMPOSICION_CLASICA.secciones);
  });

  it('el orden declarado se respeta', () => {
    const orden = ['planes', 'horarios', 'instalaciones', 'por-dentro', 'sucursales', 'cierre'] as const;
    assert.deepEqual(seccionesVisibles(composicionDe({ estilo: 'anuncios', secciones: orden }), TODO_ENCENDIDO), orden);
  });

  it('estar en la lista NO enciende una sección: manda lo contratado', () => {
    const visibles = seccionesVisibles(
      composicionDe({ secciones: ['planes', 'por-dentro', 'preguntas', 'cierre'] }),
      { ...TODO_ENCENDIDO, showGallery: false, showFaq: false },
    );
    assert.deepEqual(visibles, ['planes', 'cierre']);
  });

  it('una flag ausente cuenta como apagada (fallar cerrado)', () => {
    assert.deepEqual(seccionesVisibles(composicionDe({ secciones: ['horarios', 'cierre'] }), {}), ['cierre']);
  });

  it('una composición válida no da errores; no declararla tampoco', () => {
    assert.deepEqual(erroresDeComposicion(undefined), []);
    assert.deepEqual(
      erroresDeComposicion({ estilo: 'anuncios', planes: 'tarifario', secciones: ['planes', 'horarios', 'cierre'] }),
      [],
    );
  });

  it('una sección repetida o desconocida rompe el build', () => {
    assert.equal(erroresDeComposicion({ secciones: ['planes', 'planes'] }).length, 1);
    // @ts-expect-error — la prueba es justamente escribir algo que no existe
    assert.equal(erroresDeComposicion({ secciones: ['galeria-de-gold'] }).length, 1);
  });

  it('con la portada de anuncios, listar «anuncios» otra vez es un error', () => {
    // Pintaría los mismos panfletos dos veces en la misma página.
    assert.equal(erroresDeComposicion({ estilo: 'anuncios', secciones: ['anuncios', 'cierre'] }).length, 1);
    assert.equal(erroresDeComposicion({ estilo: 'clasica', secciones: ['anuncios', 'cierre'] }).length, 0);
  });
});

describe('V4.2 · horario resumido para la portada', () => {
  const dia = (day: string, open = '07:00', close = '22:00', closed = false) => ({ day, open, close, closed });

  it('el horario de GOLD se dice como en su folleto: tres líneas', () => {
    const tramos = resumirHorario([
      dia('Lunes'), dia('Martes'), dia('Miércoles'), dia('Jueves'), dia('Viernes'),
      dia('Sábado', '08:00', '21:00'),
      dia('Domingo', '07:00', '13:00'),
    ]);
    assert.deepEqual(tramos, [
      { dias: 'Lunes a Viernes', horas: '07:00 – 22:00', cerrado: false },
      { dias: 'Sábado', horas: '08:00 – 21:00', cerrado: false },
      { dias: 'Domingo', horas: '07:00 – 13:00', cerrado: false },
    ]);
  });

  it('solo se agrupan días CONSECUTIVOS con las mismas horas', () => {
    // Lunes y miércoles iguales con un martes distinto en medio no son un tramo.
    const tramos = resumirHorario([dia('Lunes'), dia('Martes', '09:00', '20:00'), dia('Miércoles')]);
    assert.equal(tramos.length, 3);
  });

  it('dos días se unen con «y», y un día cerrado dice «Cerrado»', () => {
    const tramos = resumirHorario([dia('Sábado'), dia('Domingo'), dia('Lunes', '', '', true)]);
    assert.deepEqual(tramos.map((t) => [t.dias, t.horas]), [
      ['Sábado y Domingo', '07:00 – 22:00'],
      ['Lunes', 'Cerrado'],
    ]);
  });

  it('sin días no hay tramos', () => {
    assert.deepEqual(resumirHorario([]), []);
  });
});
