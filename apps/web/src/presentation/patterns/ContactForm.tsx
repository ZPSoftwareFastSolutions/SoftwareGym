'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Formulario de contacto que envía la consulta por WhatsApp (V4.2).
 *
 * ANTES: un `<form method="get">` que apuntaba a `wa.me` —WhatsApp ignora esos
 * campos— y un botón que era un enlace suelto: nada de lo escrito llegaba, no
 * había validación y el botón funcionaba igual con el formulario vacío.
 *
 * AHORA: el navegador valida para no hacer perder el tiempo; la acción de
 * servidor vuelve a validar y devuelve el enlace con la consulta redactada al
 * número del gimnasio. La pestaña de WhatsApp se abre en el MISMO clic (si se
 * abriera después de esperar al servidor, el navegador la bloquearía como
 * ventana emergente) y recibe el enlace cuando llega. Si aun así no se abrió,
 * queda un botón para abrirlo a mano.
 */

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { prepararConsultaPorWhatsApp, type EstadoDeContacto } from '@/app/[tenant]/contacto/actions';
import { INTERESES_DE_CONTACTO, LARGO_MAXIMO_DE_MENSAJE, validarContacto } from '@core/domain/operations/contacto';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';

const CAMPO = [
  'w-full min-h-12 rounded-[var(--t-radius-md)]',
  'border border-line bg-surface px-4 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/60',
  'transition-colors focus:border-action focus:outline-none aria-[invalid=true]:border-action',
].join(' ');

const INICIAL: EstadoDeContacto = {};

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" icon="whatsapp" iconPosition="start" fullWidth glow disabled={pending} aria-busy={pending}>
      {pending ? 'Preparando tu mensaje…' : 'Enviar por WhatsApp'}
    </Button>
  );
}

function ErrorDeCampo({ id, texto }: { readonly id: string; readonly texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-1.5 text-[0.82rem] text-action">
      {texto}
    </p>
  );
}

export function ContactForm({ slug, gimnasio }: { readonly slug: string; readonly gimnasio: string }) {
  const [estado, accion] = useActionState(prepararConsultaPorWhatsApp, INICIAL);
  const [erroresLocales, setErroresLocales] = useState<Readonly<Record<string, string>>>({});
  const [largo, setLargo] = useState(0);
  const ventana = useRef<Window | null>(null);
  const errores = { ...erroresLocales, ...(estado.errores ?? {}) };

  // Llega el enlace: la pestaña abierta en el clic lo recibe. Sin enlace (el
  // servidor encontró un error), la pestaña en blanco se cierra.
  useEffect(() => {
    const abierta = ventana.current;
    ventana.current = null;
    if (!abierta) return;
    if (estado.enlace) abierta.location.href = estado.enlace;
    else abierta.close();
  }, [estado]);

  const alEnviar = (evento: React.FormEvent<HTMLFormElement>) => {
    const datos = new FormData(evento.currentTarget);
    const texto = (nombre: string) => String(datos.get(nombre) ?? '');
    const encontrados = validarContacto({
      nombre: texto('nombre'),
      telefono: texto('telefono'),
      email: texto('email'),
      interes: texto('interes'),
      mensaje: texto('mensaje'),
    });
    setErroresLocales(encontrados);
    if (Object.keys(encontrados).length > 0) {
      evento.preventDefault();
      return;
    }
    // Mismo clic: la pestaña se abre antes de esperar al servidor.
    ventana.current = window.open('', '_blank');
  };

  return (
    <form action={accion} onSubmit={alEnviar} className="surface-card flex flex-col gap-5 p-6 sm:p-7 lg:p-9" noValidate>
      <input type="hidden" name="tenantSlug" value={slug} />
      {/* Trampa para robots: fuera de la vista y del tabulador. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Sitio web
          <input name="sitioWeb" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <h3 className="t-h3">Escríbenos</h3>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
          Completa tus datos y te abrimos WhatsApp con el mensaje listo para {gimnasio}. Solo tienes que enviarlo.
        </p>
      </div>

      {estado.enlace && (
        <div role="status" className="flex flex-col gap-3 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-[0.88rem] leading-relaxed text-ink">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-action" />
            Tu mensaje está listo. Si WhatsApp no se abrió, ábrelo aquí.
          </p>
          <a
            href={estado.enlace}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--t-radius-md)] border border-action px-4 text-[0.86rem] font-semibold text-action transition-colors hover:bg-action hover:text-on-action"
          >
            <Icon name="whatsapp" size={16} />
            Abrir WhatsApp
          </a>
        </div>
      )}
      {estado.mensaje && !estado.enlace && (
        <p role="alert" className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 px-4 py-3 text-[0.88rem] text-ink">
          <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-action" />
          {estado.mensaje}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contacto-nombre" className="mb-2 block text-[0.82rem] font-semibold text-ink">
            Nombre y apellido
          </label>
          <input
            id="contacto-nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            maxLength={80}
            required
            placeholder="Tu nombre"
            className={CAMPO}
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={errores.nombre ? 'contacto-nombre-error' : undefined}
          />
          <ErrorDeCampo id="contacto-nombre-error" texto={errores.nombre} />
        </div>
        <div>
          <label htmlFor="contacto-telefono" className="mb-2 block text-[0.82rem] font-semibold text-ink">
            Teléfono
          </label>
          <input
            id="contacto-telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={24}
            required
            placeholder="+591 7…"
            className={CAMPO}
            aria-invalid={Boolean(errores.telefono)}
            aria-describedby={errores.telefono ? 'contacto-telefono-error' : undefined}
          />
          <ErrorDeCampo id="contacto-telefono-error" texto={errores.telefono} />
        </div>
      </div>

      <div>
        <label htmlFor="contacto-email" className="mb-2 block text-[0.82rem] font-semibold text-ink">
          Correo electrónico <span className="font-normal text-muted">(opcional)</span>
        </label>
        <input
          id="contacto-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          maxLength={254}
          placeholder="tucorreo@ejemplo.com"
          className={CAMPO}
          aria-invalid={Boolean(errores.email)}
          aria-describedby={errores.email ? 'contacto-email-error' : undefined}
        />
        <ErrorDeCampo id="contacto-email-error" texto={errores.email} />
      </div>

      <div>
        <label htmlFor="contacto-interes" className="mb-2 block text-[0.82rem] font-semibold text-ink">
          ¿Qué te interesa?
        </label>
        <select
          id="contacto-interes"
          name="interes"
          defaultValue=""
          required
          className={CAMPO}
          aria-invalid={Boolean(errores.interes)}
          aria-describedby={errores.interes ? 'contacto-interes-error' : undefined}
        >
          <option value="" disabled>
            Elige una opción
          </option>
          {INTERESES_DE_CONTACTO.map((interes) => (
            <option key={interes}>{interes}</option>
          ))}
        </select>
        <ErrorDeCampo id="contacto-interes-error" texto={errores.interes} />
      </div>

      <div>
        <label htmlFor="contacto-mensaje" className="mb-2 flex items-baseline justify-between gap-3 text-[0.82rem] font-semibold text-ink">
          Mensaje <span className={cn('font-normal', largo > LARGO_MAXIMO_DE_MENSAJE ? 'text-action' : 'text-muted')}>{largo}/{LARGO_MAXIMO_DE_MENSAJE}</span>
        </label>
        <textarea
          id="contacto-mensaje"
          name="mensaje"
          rows={4}
          maxLength={LARGO_MAXIMO_DE_MENSAJE}
          onChange={(e) => setLargo(e.target.value.length)}
          placeholder="Cuéntanos qué estás buscando"
          className={`${CAMPO} resize-y`}
          aria-invalid={Boolean(errores.mensaje)}
          aria-describedby={errores.mensaje ? 'contacto-mensaje-error' : undefined}
        />
        <ErrorDeCampo id="contacto-mensaje-error" texto={errores.mensaje} />
      </div>

      <Enviar />
    </form>
  );
}
