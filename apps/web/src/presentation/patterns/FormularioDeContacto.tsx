'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Formulario de contacto.
 *
 * NO HAY SERVIDOR AL QUE ENVIAR, y eso decide el diseño entero: en vez de
 * simular un envío que se pierde —lo peor que puede hacer un formulario—, lo
 * que se escribe aquí se REDACTA como mensaje de WhatsApp y se abre la
 * conversación con el gimnasio. El visitante ve su propio texto antes de
 * enviarlo, así que sabe exactamente qué está mandando y a quién.
 *
 * Antes esto era un `<form action={wa.me}>` con un enlace por botón: el
 * visitante rellenaba cuatro campos, pulsaba, y llegaba a WhatsApp con el
 * mensaje genérico de siempre. Lo que había escrito se perdía por el camino
 * sin que nada se lo dijera.
 *
 * Es cliente porque compone el mensaje en el navegador. No envía nada a ningún
 * servidor, no guarda nada y no deja rastro: al pulsar, lo único que ocurre es
 * que se abre WhatsApp.
 */

import { useState, type FormEvent } from 'react';
import type { ContactInfo } from '@core/domain/tenant/tenant-config';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';

const FIELD_CLASSES = [
  'w-full min-h-12 rounded-[var(--t-radius-md)]',
  'border border-line bg-surface px-4 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/60',
  'transition-colors focus:border-action focus:outline-none',
].join(' ');

const LABEL_CLASSES = 'mb-2 block text-[0.82rem] font-semibold text-ink';

const INTERESES = [
  'Información de paquetes',
  'Entrenamiento personalizado',
  'Clases dirigidas',
  'Sesión suelta',
  'Otra consulta',
] as const;

interface FormularioDeContactoProps {
  readonly contact: ContactInfo;
  readonly name: string;
}

export function FormularioDeContacto({ contact, name }: FormularioDeContactoProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [interes, setInteres] = useState('');
  const [mensaje, setMensaje] = useState('');

  const numero = contact.whatsapp.replace(/\D/g, '');

  const redactar = (): string =>
    [
      `Hola ${name} 👋`,
      nombre.trim() && `Soy ${nombre.trim()}.`,
      interes && `Me interesa: ${interes}.`,
      mensaje.trim(),
      telefono.trim() && `Mi teléfono: ${telefono.trim()}`,
      correo.trim() && `Mi correo: ${correo.trim()}`,
    ]
      .filter(Boolean)
      .join('\n');

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    // `noopener` es obligatorio al abrir con `window.open`: sin él, la pestaña
    // de destino recibe una referencia a esta página por `window.opener`.
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(redactar())}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <form className="surface-card flex flex-col gap-5 p-7 lg:p-9" onSubmit={alEnviar}>
      <div>
        <h3 className="t-h3">Escríbenos</h3>
        <p className="mt-2 text-[0.88rem] text-muted">
          Completa el formulario y te respondemos el mismo día.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="nombre" className={LABEL_CLASSES}>
            Nombre y apellido
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            required
            placeholder="Tu nombre"
            className={FIELD_CLASSES}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="telefono" className={LABEL_CLASSES}>
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            autoComplete="tel"
            required
            placeholder="+591 ..."
            className={FIELD_CLASSES}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={LABEL_CLASSES}>
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
          className={FIELD_CLASSES}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="interes" className={LABEL_CLASSES}>
          ¿Qué te interesa?
        </label>
        <select
          id="interes"
          name="interes"
          className={FIELD_CLASSES}
          value={interes}
          onChange={(e) => setInteres(e.target.value)}
        >
          <option value="" disabled>
            Elige una opción
          </option>
          {INTERESES.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="mensaje" className={LABEL_CLASSES}>
          Mensaje
        </label>
        <textarea
          id="mensaje"
          name="mensaje"
          rows={4}
          placeholder="Cuéntanos qué estás buscando"
          className={`${FIELD_CLASSES} resize-y`}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />
      </div>

      <p
        className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-line bg-raised p-4 text-[0.8rem] text-muted"
        role="note"
      >
        <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-action" />
        <span>
          Al enviar se abre una conversación de WhatsApp con {name} y el mensaje ya redactado. Podrás
          leerlo y cambiarlo antes de mandarlo; esta página no guarda ni envía tus datos a ningún
          sitio.
        </span>
      </p>

      <Button type="submit" size="lg" icon="whatsapp" iconPosition="start" fullWidth glow>
        Enviar por WhatsApp
      </Button>
    </form>
  );
}
