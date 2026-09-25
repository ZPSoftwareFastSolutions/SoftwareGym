/**
 * CAPA: Domain / Legal
 *
 * Documentos legales del sitio: privacidad, términos, cookies y reembolsos.
 *
 * SE GENERAN DESDE LA CONFIGURACIÓN, NO SE ESCRIBEN POR GIMNASIO. El texto es
 * del producto y los datos (nombre, teléfonos, ciudad, fecha) salen de
 * `TenantConfig`. Así ningún archivo de `src` nombra a un cliente y un gimnasio
 * nuevo tiene sus avisos el día que se da de alta.
 *
 * SOLO DICEN LO QUE EL SITIO HACE. Cada afirmación corresponde a algo
 * comprobable en el código: el sitio no guarda formularios, no usa analíticas,
 * no pone cookies propias y carga el mapa de Google solo si la persona lo pide.
 * Si eso cambia (analítica, cobro en línea, registro de socios), estos textos
 * dejan de ser ciertos y hay que revisarlos ANTES de publicar el cambio.
 *
 * LO QUE EL GIMNASIO NO HA ENTREGADO NO SE INVENTA. Sin razón social ni NIT se
 * usa el nombre comercial; la política de reembolsos no fija plazos ni
 * porcentajes que el gimnasio no haya dado: remite a las condiciones que se
 * informan al contratar y a los derechos de la Ley N.º 453.
 *
 * NO ES ASESORAMIENTO JURÍDICO. Es una base honesta y verificable; un abogado
 * boliviano debe revisarla antes de la publicación oficial.
 *
 * Sin I/O y sin React: se prueba sola.
 */

import type { TenantConfig } from '../tenant/tenant-config';

export const DOCUMENTOS_LEGALES = ['privacidad', 'terminos', 'cookies', 'reembolsos'] as const;
export type DocumentoLegalId = (typeof DOCUMENTOS_LEGALES)[number];

export const TITULO_DE_DOCUMENTO: Readonly<Record<DocumentoLegalId, string>> = {
  privacidad: 'Política de privacidad',
  terminos: 'Términos y condiciones',
  cookies: 'Política de cookies',
  reembolsos: 'Política de pagos y reembolsos',
};

export interface SeccionLegal {
  readonly titulo: string;
  readonly parrafos: readonly string[];
}

export interface DocumentoLegal {
  readonly id: DocumentoLegalId;
  readonly titulo: string;
  readonly resumen: string;
  readonly actualizado: string;
  readonly secciones: readonly SeccionLegal[];
}

export function esDocumentoLegal(valor: string): valor is DocumentoLegalId {
  return (DOCUMENTOS_LEGALES as readonly string[]).includes(valor);
}

/** Datos del titular que se repiten en todos los documentos. */
function titular(t: TenantConfig): SeccionLegal {
  const sedes = t.content.branches?.sedes ?? [];
  const lineas = [
    `Responsable: ${t.legalName}${t.legal.taxId ? `, NIT ${t.legal.taxId}` : ''}.`,
    `Ubicación: ${t.contact.addressLine}, ${t.contact.city}, ${t.contact.country}.`,
    ...(sedes.length > 0
      ? sedes.map((s) => `Sede ${s.name}: ${s.address}. Teléfono ${s.phone}.`)
      : [`Teléfono: ${t.contact.phone}.`]),
  ];
  if (t.contact.email) lineas.push(`Correo: ${t.contact.email}.`);
  return { titulo: 'Quién es el responsable', parrafos: lineas };
}

/** Normativa boliviana que se cita. Solo normas vigentes y verificables. */
const NORMATIVA = {
  privacidad:
    'La Constitución Política del Estado reconoce el derecho a la privacidad, intimidad, honra, propia imagen y dignidad (artículo 21) y la Acción de Protección de Privacidad para conocer, rectificar o eliminar datos personales (artículo 130).',
  consumidor:
    'La Ley N.º 453, Ley General de los Derechos de las Usuarias y los Usuarios y de las Consumidoras y los Consumidores, reconoce el derecho a información veraz, a un trato equitativo y a reclamar.',
} as const;

function privacidad(t: TenantConfig): readonly SeccionLegal[] {
  return [
    titular(t),
    {
      titulo: 'Qué datos recoge este sitio',
      parrafos: [
        'Este sitio es informativo. No tiene registro de usuarios, no pide contraseñas y no cobra en línea.',
        `El formulario de contacto pide tu nombre, tu interés, la sucursal y, si quieres, un mensaje. Nada de eso se envía a un servidor de ${t.name} ni se guarda en este sitio: al pulsar «Enviar» se abre WhatsApp con el mensaje ya redactado, y eres tú quien decide mandarlo.`,
        'Si escribes o llamas por WhatsApp o por teléfono, el gimnasio recibe tu número y lo que le cuentes, como en cualquier conversación.',
      ],
    },
    {
      titulo: 'Para qué se usan',
      parrafos: [
        'Solo para responder tu consulta: informarte sobre paquetes, horarios, clases y sucursales. No se usan para publicidad ni se venden ni se ceden a terceros.',
      ],
    },
    {
      titulo: 'Servicios de terceros',
      parrafos: [
        'WhatsApp (Meta Platforms): los mensajes que envías por WhatsApp se rigen también por las condiciones y la política de privacidad de WhatsApp.',
        'Google Maps (Google): el mapa de cada sucursal no se carga hasta que pulsas «Ver mapa». A partir de ese momento Google puede recibir tus datos de navegación según su propia política.',
        'Este sitio no usa herramientas de analítica, píxeles de seguimiento ni publicidad.',
      ],
    },
    {
      titulo: 'Cuánto tiempo se conservan',
      parrafos: [
        'El sitio no conserva nada. Las conversaciones de WhatsApp se conservan en la cuenta del gimnasio mientras sean necesarias para atenderte; puedes pedir que se eliminen.',
      ],
    },
    {
      titulo: 'Tus derechos',
      parrafos: [
        NORMATIVA.privacidad,
        `Puedes pedir en cualquier momento saber qué datos tuyos tiene ${t.name}, corregirlos o que se eliminen, escribiendo por WhatsApp o en recepción.`,
      ],
    },
    {
      titulo: 'Menores de edad',
      parrafos: [
        'Si eres menor de 18 años, consulta con tu madre, padre o tutor antes de escribir o contratar un paquete.',
      ],
    },
  ];
}

function terminos(t: TenantConfig): readonly SeccionLegal[] {
  return [
    titular(t),
    {
      titulo: 'Qué es este sitio',
      parrafos: [
        `Es la página informativa de ${t.name}. Muestra paquetes, precios, horarios, clases y sucursales. No permite contratar ni pagar en línea: la contratación y el pago se hacen en recepción.`,
      ],
    },
    {
      titulo: 'Precios e información',
      parrafos: [
        'Los precios se expresan en bolivianos (Bs) y corresponden al tarifario vigente del gimnasio. Pueden cambiar; el precio que vale es el que confirma recepción al momento de contratar.',
        'Los horarios de atención y de clases pueden variar por feriados o por causas de fuerza mayor. Los cambios se avisan en recepción y en las redes del gimnasio.',
        'Si encuentras una diferencia entre esta página y lo que te informan en recepción, avísanos para corregirla.',
      ],
    },
    {
      titulo: 'Uso de las instalaciones',
      parrafos: [
        'El uso de las instalaciones, las clases y los paquetes se rige por el reglamento interno del gimnasio y por las condiciones que se informan al contratar.',
        'Antes de empezar un programa de ejercicio, consulta a un médico si tienes alguna condición de salud.',
      ],
    },
    {
      titulo: 'Marcas y contenidos',
      parrafos: [
        `El nombre y el logotipo de ${t.name} son de su titular.`,
        'Algunos programas de entrenamiento llevan nombres de personajes de ficción como referencia temática. Esos nombres pertenecen a sus respectivos titulares; su uso no implica ninguna relación, patrocinio ni respaldo por parte de ellos.',
        'Las ilustraciones de la galería son composiciones gráficas de la marca, no fotografías de las instalaciones.',
      ],
    },
    {
      titulo: 'Enlaces a otros sitios',
      parrafos: [
        'Los enlaces a WhatsApp, Google Maps y redes sociales llevan a servicios de terceros, que tienen sus propias condiciones.',
      ],
    },
    {
      titulo: 'Legislación aplicable',
      parrafos: [
        `Estos términos se rigen por la legislación del Estado Plurinacional de Bolivia. ${NORMATIVA.consumidor}`,
      ],
    },
  ];
}

function cookies(t: TenantConfig): readonly SeccionLegal[] {
  return [
    titular(t),
    {
      titulo: 'Qué son las cookies',
      parrafos: [
        'Son pequeños archivos que un sitio guarda en tu navegador para recordar información entre visitas.',
      ],
    },
    {
      titulo: 'Cookies de este sitio',
      parrafos: [
        'Este sitio no instala cookies propias: no tiene inicio de sesión, ni carrito, ni analítica, ni publicidad.',
      ],
    },
    {
      titulo: 'Cookies de terceros',
      parrafos: [
        'Google Maps: el mapa de cada sucursal se carga solo si pulsas «Ver mapa». Hasta entonces no hay ninguna conexión con Google. Al cargarlo, Google puede instalar sus propias cookies según su política.',
        'WhatsApp y las redes sociales solo se abren si pulsas su enlace, en su propia página.',
      ],
    },
    {
      titulo: 'Por qué no hay banner de cookies',
      parrafos: [
        'Porque el sitio no instala cookies sin que lo pidas. El único contenido que puede instalarlas, el mapa, espera a que pulses el botón, y el aviso junto a ese botón explica qué pasa al cargarlo.',
      ],
    },
    {
      titulo: 'Cómo controlarlas',
      parrafos: [
        'Puedes borrar o bloquear las cookies desde la configuración de tu navegador en cualquier momento.',
      ],
    },
  ];
}

function reembolsos(t: TenantConfig): readonly SeccionLegal[] {
  return [
    titular(t),
    {
      titulo: 'Cómo se paga',
      parrafos: [
        'Este sitio no cobra. Los paquetes se contratan y se pagan en la recepción de las sucursales.',
        'Antes de pagar, recepción te informa el precio, la duración, la sucursal donde vale el paquete y sus condiciones. Pide y conserva tu comprobante.',
      ],
    },
    {
      titulo: 'Cambios, cancelaciones y reembolsos',
      parrafos: [
        'Las condiciones de cambio, congelamiento, cancelación y reembolso de cada paquete son las que te informa recepción al contratar. Si no te las explicaron, pídelas antes de pagar.',
        `Si pagaste un servicio que ${t.name} no pudo prestar, o hubo un error en el cobro, puedes pedir la revisión en recepción o por WhatsApp presentando tu comprobante.`,
      ],
    },
    {
      titulo: 'Tus derechos como consumidor',
      parrafos: [
        NORMATIVA.consumidor,
        'Si tu reclamo no se resuelve, puedes acudir al Viceministerio de Defensa de los Derechos del Usuario y del Consumidor.',
      ],
    },
  ];
}

const RESUMEN: Readonly<Record<DocumentoLegalId, string>> = {
  privacidad: 'Qué datos se recogen, para qué y cómo ejercer tus derechos.',
  terminos: 'Las condiciones de uso de este sitio informativo.',
  cookies: 'Este sitio no instala cookies propias; el mapa de Google solo se carga si lo pides.',
  reembolsos: 'Cómo se paga y qué hacer si necesitas un cambio o un reembolso.',
};

export function documentoLegal(id: DocumentoLegalId, tenant: TenantConfig): DocumentoLegal {
  const secciones = { privacidad, terminos, cookies, reembolsos }[id](tenant);
  return {
    id,
    titulo: TITULO_DE_DOCUMENTO[id],
    resumen: RESUMEN[id],
    actualizado: tenant.legal.updatedAt,
    secciones,
  };
}
