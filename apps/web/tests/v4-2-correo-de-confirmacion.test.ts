/**
 * Pruebas de V4.2 · El correo que confirma una cuenta (§17).
 *
 * Lo que se fija aquí es que la plantilla que se pega en Supabase siga siendo
 * DE LA PLATAFORMA y no de un gimnasio: una rama por marca, un respaldo cuando
 * no se sabe de quién es la cuenta, y nada escrito a mano que se pueda quedar
 * atrás cuando entre el cuarto cliente.
 *
 * Lo que NO se puede probar aquí: que Supabase interpole bien. Eso se comprueba
 * registrando una cuenta de prueba en cada gimnasio, y está en el runbook
 * `docs/runbooks/correo-de-confirmacion.md`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASUNTO_DE_CONFIRMACION,
  cuerpoDeConfirmacion,
  plantillaDeCorreoDeConfirmacion,
  textoDeConfirmacion,
  type MarcaDeCorreo,
} from '../src/core/domain/tenant/correo-de-confirmacion.ts';

const GOLD: MarcaDeCorreo = {
  slug: 'golds-gym-premium',
  nombre: "Gold's Gym Premium",
  accion: '#F2B824',
  sobreAccion: '#0B0B0C',
  fondo: '#0B0B0C',
  tarjeta: '#1A1A1E',
  texto: '#FFFFFF',
  textoSuave: '#A8A49B',
  borde: '#2B2B30',
  marcaPrincipal: "Gold's",
  marcaSecundaria: 'Gym Premium',
  correoDeContacto: '',
};

const MITICO: MarcaDeCorreo = {
  ...GOLD,
  slug: 'mitico',
  nombre: 'Mítico Fitness',
  accion: '#39FF14',
  marcaPrincipal: 'Mítico',
  marcaSecundaria: 'Fitness',
  correoDeContacto: 'hola@miticofitness.com',
};

describe('V4.2 · cuerpo del correo', () => {
  it('el botón usa el enlace que arma Supabase, nunca una URL propia', () => {
    const html = cuerpoDeConfirmacion(GOLD);
    assert.ok(html.includes('href="{{ .ConfirmationURL }}"'));
    // Armar la URL a mano se saltaría el `redirect_to` que deja la sesión
    // abierta en el panel del gimnasio (§18).
    assert.ok(!html.includes('http://'));
    assert.ok(!/href="https:\/\//.test(html));
  });

  it('lleva la identidad del gimnasio, no la de otro', () => {
    const html = cuerpoDeConfirmacion(GOLD);
    assert.ok(html.includes('#F2B824'));
    assert.ok(html.includes("Gold&#39;s") || html.includes("Gold's"));
    assert.ok(!html.includes('#39FF14'));
  });

  it('ofrece el correo de contacto solo si el gimnasio lo dio', () => {
    // GOLD todavía no entregó el suyo (§12, bloque GOLD): la línea se omite en
    // vez de enseñar un «mailto:» vacío.
    assert.ok(!cuerpoDeConfirmacion(GOLD).includes('mailto:'));
    assert.ok(cuerpoDeConfirmacion(MITICO).includes('mailto:hola@miticofitness.com'));
  });

  it('saluda por el nombre solo si el registro lo trajo', () => {
    assert.ok(cuerpoDeConfirmacion(GOLD).includes('{{ if .Data.full_name }}, {{ .Data.full_name }}{{ end }}'));
  });

  it('no hay hojas de estilo externas ni clases: todo va en línea', () => {
    const html = cuerpoDeConfirmacion(GOLD);
    assert.ok(!html.includes('<link'));
    assert.ok(!html.includes('class='));
  });
});

describe('V4.2 · plantilla única para todos los gimnasios', () => {
  it('abre una rama por gimnasio, en el orden del registro', () => {
    const plantilla = plantillaDeCorreoDeConfirmacion([MITICO, GOLD]);
    assert.ok(plantilla.includes('{{ if eq (printf "%v" .Data.tenant_slug) "mitico" }}'));
    assert.ok(plantilla.includes('{{ else if eq (printf "%v" .Data.tenant_slug) "golds-gym-premium" }}'));
    assert.ok(plantilla.trimEnd().endsWith('</html>'));
  });

  it('compara con printf: un metadato ausente no puede romper el envío', () => {
    // Con `eq .Data.tenant_slug "mitico"` y el metadato ausente, Go falla en
    // ejecución y el correo no sale. Nadie se entera hasta que alguien no entra.
    const plantilla = plantillaDeCorreoDeConfirmacion([MITICO, GOLD]);
    assert.ok(!plantilla.includes('eq .Data.tenant_slug'));
  });

  it('una cuenta sin gimnasio conocido cae en la primera marca, no en blanco', () => {
    const plantilla = plantillaDeCorreoDeConfirmacion([MITICO, GOLD]);
    const respaldo = plantilla.slice(plantilla.lastIndexOf('{{ else }}'));
    assert.ok(respaldo.includes('#39FF14'));
    assert.ok(respaldo.includes('{{ .ConfirmationURL }}'));
  });

  it('cada rama abre y cierra: tantos `end` como condiciones', () => {
    const plantilla = plantillaDeCorreoDeConfirmacion([MITICO, GOLD]);
    const condiciones = (plantilla.match(/\{\{ if /g) ?? []).length;
    const cierres = (plantilla.match(/\{\{ end \}\}/g) ?? []).length;
    assert.equal(cierres, condiciones);
  });

  it('un slug con comillas no rompe la plantilla en el servidor de correo', () => {
    const raro: MarcaDeCorreo = { ...GOLD, slug: 'gim"nasio' };
    assert.ok(plantillaDeCorreoDeConfirmacion([MITICO, raro]).includes('"gim\\"nasio"'));
  });

  it('sin gimnasios no se genera una plantilla vacía: falla', () => {
    assert.throws(() => plantillaDeCorreoDeConfirmacion([]));
  });
});

describe('V4.2 · versión en texto plano', () => {
  it('lleva el enlace y el asunto tiene sentido sin abrir el correo', () => {
    const texto = textoDeConfirmacion(GOLD);
    assert.ok(texto.includes('{{ .ConfirmationURL }}'));
    assert.ok(texto.includes("Gold's Gym Premium"));
    assert.ok(!texto.includes('<'));
    assert.equal(ASUNTO_DE_CONFIRMACION, 'Confirma tu correo para activar tu cuenta');
  });
});
