'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ContactInfo } from '@core/domain/tenant/tenant-config';
import type { SedeDeVitrina } from '@core/domain/catalog/branches';
import Link from 'next/link';
import { tenantHref } from '@/lib/tenant-links';
import { Icon } from '@/presentation/icons/Icon';

const FIELD_CLASSES = [
  'w-full min-h-12 rounded-xl',
  'border border-white/20 bg-white/5 px-4 py-3',
  'text-white placeholder:text-white/60',
  'transition-all duration-300 focus:border-action focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-action',
].join(' ');

const LABEL_CLASSES = 'mb-2 block text-sm font-semibold text-white/80';

const INTERESES = [
  'Información de paquetes',
  'Entrenamiento personalizado',
  'Clases dirigidas',
  'Productos y suplementos',
  'Sesión suelta',
  'Otra consulta',
] as const;

interface ContactFormProps {
  readonly contact: ContactInfo;
  readonly name: string;
  readonly sedes?: readonly SedeDeVitrina[];
  readonly slug: string;
}

export function ContactForm({ contact, name, sedes = [], slug }: ContactFormProps) {
  const searchParams = useSearchParams();
  const [nombre, setNombre] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [interes, setInteres] = useState('');
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const interesQuery = searchParams.get('interes');
    if (interesQuery === 'planes') setInteres('Información de paquetes');
    else if (interesQuery === 'clases') setInteres('Clases dirigidas');
    else if (interesQuery === 'productos') setInteres('Productos y suplementos');
  }, [searchParams]);

  // Con varias sedes, el mensaje va al WhatsApp de la elegida. Se usa su campo
  // `whatsapp` (con código de país) y no `phone`: `wa.me/78992777` no existe.
  const getSedePhone = () => {
    if (sedes.length > 1 && sedeSeleccionada) {
      const sede = sedes.find((s) => s.code === sedeSeleccionada);
      if (sede?.whatsapp) return sede.whatsapp;
    }
    return contact.whatsapp || contact.phone;
  };

  const numero = getSedePhone()?.replace(/\D/g, '') || '';

  const redactar = (): string =>
    [
      `¡Hola, ${name}! Te escribo desde la web.`,
      `Soy ${nombre.trim()}.`,
      interes ? `Me interesa: ${interes}.` : '',
      mensaje.trim() ? `\n${mensaje.trim()}` : '',
    ]
      .filter((line) => line !== '')
      .join('\n');

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!numero || !acepta) return;

    const encoded = encodeURIComponent(redactar());
    // `noopener`: sin él, la pestaña de WhatsApp recibe una referencia a esta
    // página (`window.opener`) y podría redirigirla.
    window.open(`https://wa.me/${numero}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="surface-card p-8 md:p-10 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-action/5 blur-[100px] pointer-events-none" />
      
      <header className="mb-8">
        <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--t-font-display)' }}>ESCRÍBENOS</h2>
        <p className="mt-2 text-white/60">Completa el formulario y te responderemos lo antes posible.</p>
      </header>

      <form onSubmit={enviar} className="relative z-10 flex flex-col gap-6">
        {/* Solo el nombre: la respuesta llega por WhatsApp, así que el teléfono
            ya lo tiene el gimnasio y el correo no se usaría para nada. Pedir
            datos que no se usan es acumular datos sin motivo. */}
        <div>
          <label htmlFor="nombre" className={LABEL_CLASSES}>
            Nombre
          </label>
          <input
            id="nombre"
            required
            autoComplete="given-name"
            maxLength={80}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={FIELD_CLASSES}
            placeholder="Tu nombre"
          />
        </div>

        {sedes.length > 1 && (
          <div>
            <label htmlFor="sede" className={LABEL_CLASSES}>
              <Icon name="pin" size={14} className="inline mr-1 text-action" />
              ¿A qué sucursal quieres escribir?
            </label>
            <select
              id="sede"
              required
              value={sedeSeleccionada}
              onChange={(e) => setSedeSeleccionada(e.target.value)}
              className={FIELD_CLASSES}
            >
              <option value="" disabled>
                Elige una sucursal
              </option>
              {sedes.map((sede) => (
                <option key={sede.code} value={sede.code} className="bg-black text-white">
                  {sede.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="interes" className={LABEL_CLASSES}>
            <Icon name="sparkle" size={14} className="inline mr-1 text-action" />
            ¿Qué te interesa?
          </label>
          <select
            id="interes"
            required
            value={interes}
            onChange={(e) => setInteres(e.target.value)}
            className={FIELD_CLASSES}
          >
            <option value="" disabled>
              Elige una opción
            </option>
            {INTERESES.map((opcion) => (
              <option key={opcion} value={opcion} className="bg-black text-white">
                {opcion}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mensaje" className={LABEL_CLASSES}>
            Mensaje (Opcional)
          </label>
          <textarea
            id="mensaje"
            rows={4}
            maxLength={1000}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className={FIELD_CLASSES}
            placeholder="Cuéntanos qué estás buscando"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="flex items-start gap-3 text-sm leading-relaxed text-white/75">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-action" />
            <span>
              Este sitio no guarda lo que escribes. Al enviar se abre WhatsApp con tu mensaje ya
              redactado, y lo lees antes de mandarlo. WhatsApp es un servicio de Meta, con sus propias
              condiciones.
            </span>
          </p>
          {/* Consentimiento explícito, sin marcar por defecto: lo exige que el
              dato salga hacia un tercero (WhatsApp) y es la única forma de que
              el consentimiento sea una decisión y no un descuido. */}
          <label htmlFor="acepta" className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
            <input
              id="acepta"
              type="checkbox"
              required
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--t-action)]"
            />
            <span>
              Acepto que mi nombre y mi mensaje se envíen por WhatsApp a {name}, según la{' '}
              <Link href={tenantHref(slug, 'legal/privacidad')} className="text-action underline underline-offset-2">
                política de privacidad
              </Link>
              .
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-action px-6 font-bold text-black transition-all hover:scale-[1.02] hover:bg-action/90 hover:shadow-[0_0_20px_rgb(var(--t-action-rgb)/0.3)] disabled:opacity-50"
        >
          <Icon name="whatsapp" size={20} />
          Enviar por WhatsApp
        </button>
      </form>
    </div>
  );
}
