/**
 * CAPA: Domain / Tenant — el correo que confirma una cuenta recién creada.
 *
 * §17 del encargo de GOLD: que el correo tenga diseño profesional, identidad
 * del gimnasio, un botón claro y que se vea bien en el teléfono.
 *
 * EL PROBLEMA QUE RESUELVE ESTE ARCHIVO. Quien envía ese correo es Supabase
 * Auth, no esta aplicación: la plantilla vive en la configuración del proyecto
 * de Supabase y es UNA sola para los tres gimnasios. Poner ahí el dorado de
 * GOLD dejaría a Mítico con el correo de otra marca, que es exactamente el fork
 * que el encargo prohíbe.
 *
 * LA SALIDA. Supabase interpola las plantillas con `text/template` de Go y
 * expone los metadatos del registro en `.Data`. Nuestro alta ya manda ahí
 * `tenant_slug` y `full_name` (los usa el disparador `handle_new_auth_user`),
 * así que la plantilla puede ELEGIR la marca en tiempo de envío. Este módulo
 * genera esa plantilla a partir del registro de gimnasios: un gimnasio nuevo no
 * se edita a mano en el panel de Supabase, se vuelve a generar el archivo.
 *
 * POR QUÉ HTML DE TABLAS Y ESTILOS EN LÍNEA. Es lo único que se ve igual en
 * Gmail, Outlook y el correo de un teléfono: no hay hojas de estilo externas,
 * ni flexbox fiable, ni variables CSS. Las mismas reglas del sistema de diseño
 * —el color de acción, el texto atenuado— se escriben aquí como literales
 * porque el destino no es un navegador con nuestros tokens.
 *
 * SEGURIDAD. Todo lo que viene del usuario se escapa: el nombre se imprime con
 * el escapado por defecto de Go (`{{ .Data.full_name }}` escapa en
 * `html/template`) y, además, este generador nunca mete datos de una persona en
 * la plantilla: solo marca del gimnasio, que es contenido nuestro.
 */

import type { TenantConfig } from './tenant-config';

/** Lo que el correo necesita saber de un gimnasio. Nada más que su marca. */
export interface MarcaDeCorreo {
  readonly slug: string;
  readonly nombre: string;
  /** Color de acción: el botón y los detalles. */
  readonly accion: string;
  /** Color del texto sobre el botón. */
  readonly sobreAccion: string;
  readonly fondo: string;
  readonly tarjeta: string;
  readonly texto: string;
  readonly textoSuave: string;
  readonly borde: string;
  /** Las dos partes del logotipo: «Gold's» + «Gym Premium». */
  readonly marcaPrincipal: string;
  readonly marcaSecundaria: string;
  /** Correo de contacto del gimnasio. Vacío = no se ofrece ninguno. */
  readonly correoDeContacto: string;
}

/** Escapa lo que va dentro de un atributo o de un nodo de texto del HTML. */
function esc(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Cadena literal para una condición de `text/template`.
 *
 * Un slug con una comilla rompería la plantilla en el servidor de correo, y ese
 * fallo no se ve hasta que alguien se registra. Los slugs del registro se
 * validan antes, pero una plantilla generada no depende de eso.
 */
function literalGo(valor: string): string {
  return `"${valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * El slug del gimnasio tal como lo lee la plantilla de Go, a prueba de ausencias.
 *
 * Se envuelve en `printf "%v"` y no se compara directo. Motivo: en las
 * plantillas de Go, comparar con `eq` un valor ausente contra una cadena es un
 * error de EJECUCIÓN, y un error ahí no rompe una página que se pueda recargar:
 * rompe el único correo que activa la cuenta, y nadie se entera hasta que
 * alguien no puede entrar. Con `printf`, la ausencia es una cadena más y cae en
 * la marca de respaldo.
 */
const SLUG_DEL_REGISTRO = '(printf "%v" .Data.tenant_slug)';

export const ASUNTO_DE_CONFIRMACION = 'Confirma tu correo para activar tu cuenta';

/**
 * El cuerpo del correo para UNA marca.
 *
 * `{{ .ConfirmationURL }}` la pone Supabase y ya lleva dentro nuestro
 * `redirect_to` (`/auth/confirmar?gimnasio=<slug>`), que es lo que hace que el
 * socio acabe con la sesión abierta en SU panel y no en un formulario de login
 * (§18). Por eso el botón no construye ninguna URL a mano.
 */
export function cuerpoDeConfirmacion(marca: MarcaDeCorreo): string {
  const nombre = esc(marca.nombre);
  const contacto = marca.correoDeContacto.trim();

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${marca.fondo};margin:0;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background-color:${marca.tarjeta};border:1px solid ${marca.borde};border-radius:16px;">
        <tr>
          <td style="padding:32px 28px 8px 28px;text-align:center;">
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:0.02em;color:${marca.texto};">${esc(marca.marcaPrincipal)}</div>
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${marca.accion};padding-top:4px;">${esc(marca.marcaSecundaria)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 0 28px;">
            <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:21px;line-height:1.3;font-weight:700;color:${marca.texto};">Hola{{ if .Data.full_name }}, {{ .Data.full_name }}{{ end }}: confirma tu correo</h1>
            <p style="margin:14px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${marca.textoSuave};">
              Tu cuenta de ${nombre} está creada. Falta un paso: confirma que este correo es tuyo y entrarás directo a tu panel, donde tienes tu QR de ingreso, tu membresía y tus clases.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 0 28px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:10px;background-color:${marca.accion};">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:15px 30px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${marca.sobreAccion};text-decoration:none;border-radius:10px;">Confirmar mi correo</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 0 28px;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${marca.textoSuave};">
              Si el botón no funciona, copia y pega esta dirección en tu navegador:
            </p>
            <p style="margin:8px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;word-break:break-all;">
              <a href="{{ .ConfirmationURL }}" style="color:${marca.accion};">{{ .ConfirmationURL }}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 28px 28px;">
            <div style="height:1px;background-color:${marca.borde};line-height:1px;font-size:0;">&nbsp;</div>
            <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${marca.textoSuave};">
              Si no creaste esta cuenta, ignora este mensaje: sin confirmar, no se activa nada.${
                contacto ? ` ¿Dudas? Escríbenos a <a href="mailto:${esc(contacto)}" style="color:${marca.accion};">${esc(contacto)}</a>.` : ''
              }
            </p>
            <p style="margin:10px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${marca.textoSuave};">${nombre}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * La plantilla ÚNICA que se pega en Supabase, con una rama por gimnasio.
 *
 * La primera marca del registro es también la de RESPALDO: si alguien crea una
 * cuenta sin `tenant_slug` en los metadatos —por la API, no por nuestro
 * formulario—, el correo sale con esa marca en vez de salir roto o en blanco.
 */
export function plantillaDeCorreoDeConfirmacion(marcas: readonly MarcaDeCorreo[]): string {
  const respaldo = marcas[0];
  if (respaldo === undefined) throw new Error('No hay ninguna marca para generar el correo de confirmación');

  const ramas = marcas
    .slice(1)
    .map((marca) => `{{ else if eq ${SLUG_DEL_REGISTRO} ${literalGo(marca.slug)} }}\n${cuerpoDeConfirmacion(marca)}`)
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(ASUNTO_DE_CONFIRMACION)}</title>
</head>
<body style="margin:0;padding:0;">
{{ if eq ${SLUG_DEL_REGISTRO} ${literalGo(respaldo.slug)} }}
${cuerpoDeConfirmacion(respaldo)}
${ramas}
{{ else }}
${cuerpoDeConfirmacion(respaldo)}
{{ end }}
</body>
</html>`;
}

/**
 * Versión en texto plano, para los clientes que no pintan HTML.
 *
 * No es un adorno: un correo solo-HTML puntúa peor en los filtros de spam, y
 * un correo de confirmación que cae en spam es una cuenta que no se activa.
 */
export function textoDeConfirmacion(marca: MarcaDeCorreo): string {
  const lineas = [
    `${marca.nombre}`,
    '',
    'Hola{{ if .Data.full_name }}, {{ .Data.full_name }}{{ end }}:',
    '',
    `Tu cuenta de ${marca.nombre} está creada. Confirma que este correo es tuyo para entrar a tu panel:`,
    '',
    '{{ .ConfirmationURL }}',
    '',
    'Si no creaste esta cuenta, ignora este mensaje: sin confirmar, no se activa nada.',
  ];
  if (marca.correoDeContacto.trim()) lineas.push('', `¿Dudas? Escríbenos a ${marca.correoDeContacto.trim()}.`);
  return lineas.join('\n');
}

/**
 * La marca de correo de un gimnasio, sacada de SU configuración.
 *
 * El puente es el mismo archivo que ya define el tema del sitio: así un cambio
 * de paleta llega al correo al regenerar la plantilla, sin tocar dos sitios.
 */
export function marcaDeCorreoDeTenant(tenant: TenantConfig): MarcaDeCorreo {
  const { palette, logo } = tenant.branding;
  return {
    slug: tenant.slug,
    nombre: tenant.name,
    accion: palette.primary,
    // El texto del botón se decide por el MODO del tema, no adivinando el
    // contraste: en una marca oscura el color de acción es claro y el texto
    // encima tiene que ser oscuro, y al revés.
    sobreAccion: tenant.branding.mode === 'dark' ? palette.surface : '#FFFFFF',
    fondo: palette.surface,
    tarjeta: palette.surfaceCard,
    texto: palette.text,
    textoSuave: palette.textMuted,
    borde: palette.border,
    marcaPrincipal: logo.wordmark,
    marcaSecundaria: logo.subMark,
    correoDeContacto: tenant.contact.email,
  };
}
