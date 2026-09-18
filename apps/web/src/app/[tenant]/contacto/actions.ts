'use server';

/**
 * Acción del formulario de contacto (V4.2).
 *
 * La consulta no se guarda: se valida AQUÍ y se devuelve el enlace de WhatsApp
 * ya redactado. Validar en el servidor no es redundancia: el número al que se
 * escribe sale del registro del gimnasio de la ruta, nunca del formulario, y el
 * texto que llega al mostrador queda limpio aunque alguien se salte la
 * validación del navegador.
 */

import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { enlaceDeWhatsApp, redactarConsulta, validarContacto, type DatosDeContacto } from '@core/domain/operations/contacto';
import { tenantRepository } from '@infra/config/composition-root';

export interface EstadoDeContacto {
  readonly errores?: Readonly<Record<string, string>>;
  readonly mensaje?: string;
  /** Enlace de WhatsApp listo para abrir. Solo con la consulta validada. */
  readonly enlace?: string;
  /** Cambia en cada envío correcto, para que la pantalla sepa que es uno nuevo. */
  readonly envio?: number;
}

function campo(form: FormData, nombre: string, maximo: number): string {
  const valor = form.get(nombre);
  return typeof valor === 'string' ? valor.slice(0, maximo) : '';
}

export async function prepararConsultaPorWhatsApp(_previo: EstadoDeContacto, form: FormData): Promise<EstadoDeContacto> {
  const crudo = form.get('tenantSlug');
  const tenant = typeof crudo === 'string' ? await getTenantBySlug(tenantRepository(), crudo.trim().toLowerCase()) : null;
  if (!tenant || tenant.features.contactForm !== true) return { mensaje: 'Este formulario no está disponible.' };

  // Campo trampa: invisible para una persona, lo rellenan los robots que
  // completan todo. Se responde como un éxito sin enlace para no darles pistas.
  if (campo(form, 'sitioWeb', 200).trim() !== '') return { mensaje: 'No pudimos preparar tu mensaje. Vuelve a intentarlo.' };

  const datos: DatosDeContacto = {
    nombre: campo(form, 'nombre', 120),
    telefono: campo(form, 'telefono', 40),
    email: campo(form, 'email', 260),
    interes: campo(form, 'interes', 60),
    mensaje: campo(form, 'mensaje', 1200),
  };

  const errores = validarContacto(datos);
  if (Object.keys(errores).length > 0) return { errores, mensaje: 'Revisa los campos marcados.' };

  const enlace = enlaceDeWhatsApp(tenant.contact.whatsapp, redactarConsulta(datos, tenant.name));
  if (!enlace) return { mensaje: `${tenant.name} todavía no configuró su WhatsApp. Llámanos o escríbenos al correo.` };

  return { enlace, envio: Date.now() };
}
