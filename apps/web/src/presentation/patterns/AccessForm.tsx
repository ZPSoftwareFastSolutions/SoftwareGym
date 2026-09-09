'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Formulario de acceso y registro de socios.
 *
 * Es de cliente porque necesita estado de pestaña y de envío. NO decide nada:
 * toda la validación que importa y la llamada al proveedor de identidad viven
 * en las acciones de servidor. Lo que hay aquí es para que el usuario no
 * pierda el tiempo, no para proteger nada.
 *
 * El slug del gimnasio viaja en un campo oculto solo por comodidad de la
 * acción: esta lo vuelve a resolver contra el registro del servidor y descarta
 * lo que llegue si no corresponde a un gimnasio real.
 */

import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  iniciarSesion,
  registrarse,
  type EstadoFormulario,
} from '@/app/[tenant]/acceso/actions';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';

const CAMPO = [
  'w-full min-h-12 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/50',
  'transition-colors focus:border-action focus:outline-none',
].join(' ');

const ESTADO_INICIAL: EstadoFormulario = {};

function BotonEnviar({ children }: { readonly children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" fullWidth glow disabled={pending}>
      {pending ? 'Un momento…' : children}
    </Button>
  );
}

/** Mensaje de error de un campo, atado al input por `aria-describedby`. */
function ErrorCampo({ id, mensaje }: { readonly id: string; readonly mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} className="mt-1.5 text-[0.82rem] text-action">
      {mensaje}
    </p>
  );
}

interface AccessFormProps {
  readonly slug: string;
  readonly gymName: string;
}

export function AccessForm({ slug, gymName }: AccessFormProps) {
  const [pestana, setPestana] = useState<'login' | 'registro'>('login');
  const idBase = useId();

  const [estadoLogin, accionLogin] = useActionState(iniciarSesion, ESTADO_INICIAL);
  const [estadoRegistro, accionRegistro] = useActionState(registrarse, ESTADO_INICIAL);

  const estado = pestana === 'login' ? estadoLogin : estadoRegistro;
  const errores = estado.errores ?? {};

  return (
    <div className="surface-card p-7 lg:p-9">
      {/* Pestañas. Se usa `role="tablist"` con botones reales para que el
          teclado funcione sin reimplementar el patrón a mano. */}
      <div role="tablist" aria-label="Acceso o registro" className="flex gap-2">
        {(
          [
            ['login', 'Iniciar sesión'],
            ['registro', 'Crear cuenta'],
          ] as const
        ).map(([clave, etiqueta]) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={pestana === clave}
            onClick={() => setPestana(clave)}
            className={cn(
              'min-h-11 flex-1 rounded-[var(--t-radius-md)] px-4 text-[0.88rem] font-semibold',
              'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
              pestana === clave
                ? 'bg-action text-on-action'
                : 'border border-line text-muted hover:text-ink',
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {estado.mensaje && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 px-4 py-3 text-[0.88rem] text-ink"
        >
          <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-action" />
          <span>{estado.mensaje}</span>
        </p>
      )}

      {estado.exito && (
        <p
          role="status"
          className="mt-6 flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-line bg-raised px-4 py-3 text-[0.88rem] text-ink"
        >
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-action" />
          <span>{estado.exito}</span>
        </p>
      )}

      {pestana === 'login' ? (
        <form action={accionLogin} className="mt-7 flex flex-col gap-5" noValidate>
          <input type="hidden" name="tenantSlug" value={slug} />

          <div>
            <label htmlFor={`${idBase}-email`} className="mb-2 block text-[0.85rem] text-muted">
              Correo electrónico
            </label>
            <input
              id={`${idBase}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              className={CAMPO}
              placeholder="tucorreo@ejemplo.com"
              aria-invalid={Boolean(errores.email)}
              aria-describedby={errores.email ? `${idBase}-email-error` : undefined}
            />
            <ErrorCampo id={`${idBase}-email-error`} mensaje={errores.email} />
          </div>

          <div>
            <label htmlFor={`${idBase}-password`} className="mb-2 block text-[0.85rem] text-muted">
              Contraseña
            </label>
            <input
              id={`${idBase}-password`}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={CAMPO}
              placeholder="••••••••"
              aria-invalid={Boolean(errores.password)}
              aria-describedby={errores.password ? `${idBase}-password-error` : undefined}
            />
            <ErrorCampo id={`${idBase}-password-error`} mensaje={errores.password} />
          </div>

          <BotonEnviar>Entrar</BotonEnviar>
        </form>
      ) : (
        <form action={accionRegistro} className="mt-7 flex flex-col gap-5" noValidate>
          <input type="hidden" name="tenantSlug" value={slug} />

          <div>
            <label htmlFor={`${idBase}-nombre`} className="mb-2 block text-[0.85rem] text-muted">
              Nombre completo
            </label>
            <input
              id={`${idBase}-nombre`}
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className={CAMPO}
              placeholder="Nombre y apellido"
              aria-invalid={Boolean(errores.fullName)}
              aria-describedby={errores.fullName ? `${idBase}-nombre-error` : undefined}
            />
            <ErrorCampo id={`${idBase}-nombre-error`} mensaje={errores.fullName} />
          </div>

          <div>
            <label htmlFor={`${idBase}-reg-email`} className="mb-2 block text-[0.85rem] text-muted">
              Correo electrónico
            </label>
            <input
              id={`${idBase}-reg-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              className={CAMPO}
              placeholder="tucorreo@ejemplo.com"
              aria-invalid={Boolean(errores.email)}
              aria-describedby={errores.email ? `${idBase}-reg-email-error` : undefined}
            />
            <ErrorCampo id={`${idBase}-reg-email-error`} mensaje={errores.email} />
          </div>

          <div>
            <label
              htmlFor={`${idBase}-reg-password`}
              className="mb-2 block text-[0.85rem] text-muted"
            >
              Contraseña
            </label>
            <input
              id={`${idBase}-reg-password`}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={CAMPO}
              placeholder="Al menos 8 caracteres"
              aria-invalid={Boolean(errores.password)}
              aria-describedby={`${idBase}-password-ayuda`}
            />
            <p id={`${idBase}-password-ayuda`} className="mt-1.5 text-[0.8rem] text-muted">
              Mínimo 8 caracteres. Mejor una frase larga que una palabra con símbolos.
            </p>
            <ErrorCampo id={`${idBase}-reg-password-error`} mensaje={errores.password} />
          </div>

          <p className="text-[0.82rem] leading-relaxed text-muted">
            Al crear tu cuenta quedas registrado como socio de {gymName}. Recepción la
            vinculará con tu ficha para que veas tu membresía y tus pagos.
          </p>

          <BotonEnviar>Crear cuenta</BotonEnviar>
        </form>
      )}
    </div>
  );
}
