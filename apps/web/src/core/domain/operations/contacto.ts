/**
 * CAPA: Domain / Operations
 *
 * Formulario de contacto de la vitrina (V4.2).
 *
 * No hay bandeja de consultas en la plataforma: la consulta se ENVÍA por
 * WhatsApp al número del gimnasio, ya redactada. Lo que vive aquí es lo que
 * decide si la consulta es válida y cómo se redacta, para que la acción de
 * servidor y la pantalla digan lo mismo y el texto no dependa del navegador.
 */

export const INTERESES_DE_CONTACTO = [
  'Información de planes',
  'Clases grupales',
  'Semana de prueba',
  'Entrenamiento personalizado',
  'Otra consulta',
] as const;

export type InteresDeContacto = (typeof INTERESES_DE_CONTACTO)[number];

export interface DatosDeContacto {
  readonly nombre: string;
  readonly telefono: string;
  readonly email: string;
  readonly interes: string;
  readonly mensaje: string;
}

export const LARGO_MAXIMO_DE_MENSAJE = 600;

const PATRON_NOMBRE = /^[\p{L}\p{M}][\p{L}\p{M}'\-. ]*$/u;
const PATRON_EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)*\.[a-z]{2,}$/i;

/** Solo los dígitos de un teléfono, conservando el prefijo internacional si lo había. */
export function digitosDeTelefono(telefono: string): string {
  return telefono.replace(/\D/g, '');
}

export function validarContacto(datos: DatosDeContacto): Readonly<Record<string, string>> {
  const errores: Record<string, string> = {};

  const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
  if (nombre.length < 3) errores.nombre = 'Escribe tu nombre y apellido.';
  else if (nombre.length > 80) errores.nombre = 'El nombre es demasiado largo.';
  else if (/\d/.test(nombre)) errores.nombre = 'El nombre no puede llevar números.';
  else if (!PATRON_NOMBRE.test(nombre)) errores.nombre = 'El nombre solo admite letras, espacios y guiones.';

  const digitos = digitosDeTelefono(datos.telefono);
  if (digitos.length === 0) errores.telefono = 'Escribe un teléfono para que podamos responderte.';
  else if (digitos.length < 7 || digitos.length > 15) errores.telefono = 'Ese teléfono no parece completo. Incluye el código si es de otro país.';

  const email = datos.email.trim();
  if (email !== '' && (email.length > 254 || !PATRON_EMAIL.test(email))) errores.email = 'Ese correo no tiene un formato válido.';

  if (!(INTERESES_DE_CONTACTO as readonly string[]).includes(datos.interes)) errores.interes = 'Elige qué te interesa.';

  if (datos.mensaje.trim().length > LARGO_MAXIMO_DE_MENSAJE) {
    errores.mensaje = `El mensaje puede tener hasta ${LARGO_MAXIMO_DE_MENSAJE} caracteres.`;
  }

  return errores;
}

/**
 * El texto que llega al WhatsApp del gimnasio. Ordenado para quien lo lee en
 * el mostrador: quién es, qué quiere y cómo responderle.
 */
export function redactarConsulta(datos: DatosDeContacto, gimnasio: string): string {
  const lineas = [
    `Hola ${gimnasio}, les escribo desde la web.`,
    '',
    `Nombre: ${datos.nombre.trim().replace(/\s+/g, ' ')}`,
    `Teléfono: ${datos.telefono.trim()}`,
  ];
  if (datos.email.trim()) lineas.push(`Correo: ${datos.email.trim()}`);
  lineas.push(`Me interesa: ${datos.interes}`);
  const mensaje = datos.mensaje.trim();
  if (mensaje) lineas.push('', mensaje);
  return lineas.join('\n');
}

/** Enlace de WhatsApp al número del gimnasio con la consulta ya escrita. */
export function enlaceDeWhatsApp(numeroDelGimnasio: string, texto: string): string | null {
  const digitos = digitosDeTelefono(numeroDelGimnasio);
  if (digitos.length < 7) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}
