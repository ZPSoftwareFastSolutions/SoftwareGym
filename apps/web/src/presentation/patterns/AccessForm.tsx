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
 */

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  iniciarSesion,
  registrarse,
  type EstadoFormulario,
} from '@/app/[tenant]/acceso/actions';
import { PATRON_NOMBRE_HTML } from '@core/application/auth/login.usecase';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';

const CAMPO = [
  'w-full min-h-12 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/50',
  'transition-colors focus:border-action focus:outline-none',
  'aria-[invalid=true]:border-action',
].join(' ');

const ESTADO_INICIAL: EstadoFormulario = {};

/**
 * El botón vive DENTRO del `<form>` a propósito: `useFormStatus` solo conoce
 * el formulario que lo contiene. Fuera devolvería siempre `pending: false` y
 * el botón seguiría activo durante el envío, que es justo lo que se quiere
 * evitar: dos clics seguidos son dos intentos de acceso.
 */
function BotonEnviar({ children }: { readonly children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      fullWidth
      glow
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Un momento…' : children}
    </Button>
  );
}

/**
 * Refuerzo para el borrado de la contraseña.
 *
 * React 19 ya resetea un formulario con `action` cuando la acción termina, y
 * se comprobó que lo hace: tras un intento fallido los campos quedan vacíos
 * sin tocar nada. Pero ese reseteo NO cubre los caminos en los que el
 * componente no llega a re-renderizar —una acción que redirige, o la vuelta
 * atrás desde la caché del navegador—.
 *
 * En el mostrador de un gimnasio la misma pantalla la usan varias personas, así
 * que la contraseña se borra también de forma explícita. Es redundante en el
 * caso normal, y eso está bien: es el único campo cuyo rastro no se puede
 * dejar al comportamiento de una librería.
 */
function LimpiarPasswordAlTerminar({
  formRef,
}: {
  readonly formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const { pending } = useFormStatus();
  const estabaEnviando = useRef(false);

  useEffect(() => {
    if (pending) {
      estabaEnviando.current = true;
      return;
    }
    if (!estabaEnviando.current) return;
    estabaEnviando.current = false;

    // La contraseña NO se queda escrita después de intentar entrar. En el
    // mostrador de un gimnasio la misma pantalla la usan varias personas y el
    // navegador restaura los campos al volver atrás: dejar la clave ahí es
    // regalarla al siguiente que se siente.
    formRef.current?.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((i) => {
      i.value = '';
    });
  }, [pending, formRef]);

  return null;
}

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
  /** `'ok'` o `'fallo'` cuando se vuelve del enlace de confirmación. */
  readonly confirmacion?: 'ok' | 'fallo';
}

export function AccessForm({ slug, gymName, confirmacion }: AccessFormProps) {
  const [pestana, setPestana] = useState<'login' | 'registro'>('login');
  const idBase = useId();
  const formLogin = useRef<HTMLFormElement>(null);
  const formRegistro = useRef<HTMLFormElement>(null);

  const [estadoLogin, accionLogin] = useActionState(iniciarSesion, ESTADO_INICIAL);
  const [estadoRegistro, accionRegistro] = useActionState(registrarse, ESTADO_INICIAL);

  const estado = pestana === 'login' ? estadoLogin : estadoRegistro;
  const errores = estado.errores ?? {};

  // Un alta correcta deja el formulario vacío: si sigue lleno, el usuario duda
  // de si se envió y lo intenta otra vez.
  useEffect(() => {
    if (estadoRegistro.exito) formRegistro.current?.reset();
  }, [estadoRegistro.exito]);

  return (
    <div className="surface-card p-7 lg:p-9">
      {confirmacion && (
        <p
          role="status"
          className={cn(
            'mb-6 flex items-start gap-2.5 rounded-[var(--t-radius-md)] px-4 py-3 text-[0.88rem]',
            confirmacion === 'ok'
              ? 'border border-action/40 bg-action/10 text-ink'
              : 'border border-line bg-raised text-ink',
          )}
        >
          <Icon
            name={confirmacion === 'ok' ? 'check' : 'shield'}
            size={16}
            className="mt-0.5 shrink-0 text-action"
          />
          <span>
            {confirmacion === 'ok'
              ? 'Tu correo quedó confirmado. Ya puedes iniciar sesión.'
              : 'No pudimos confirmar ese enlace. Puede haber caducado o haberse usado ya. Vuelve a registrarte o escríbenos.'}
          </span>
        </p>
      )}

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

      {/*
        El `key` distinto por pestaña NO es decorativo. Sin él React reconcilia
        los dos formularios como si fueran el mismo —misma estructura, mismos
        `name`— y reutiliza los `<input>`: lo escrito en «Iniciar sesión»,
        contraseña incluida, aparecía al cambiar a «Crear cuenta». Con `key`,
        cambiar de pestaña desmonta el formulario y los campos nacen vacíos.
      */}
      {pestana === 'login' ? (
        <form
          key="login"
          ref={formLogin}
          action={accionLogin}
          className="mt-7 flex flex-col gap-5"
          noValidate
        >
          <LimpiarPasswordAlTerminar formRef={formLogin} />
          <input type="hidden" name="tenantSlug" value={slug} />

          <div>
            <label htmlFor={`${idBase}-email`} className="mb-2 block text-[0.85rem] text-muted">
              Correo electrónico
            </label>
            <input
              id={`${idBase}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
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
              maxLength={72}
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
        <form
          key="registro"
          ref={formRegistro}
          action={accionRegistro}
          className="mt-7 flex flex-col gap-5"
          noValidate
        >
          <LimpiarPasswordAlTerminar formRef={formRegistro} />
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
              autoCapitalize="words"
              maxLength={120}
              minLength={3}
              // El navegador rechaza los dígitos antes de enviar. Es comodidad,
              // no seguridad: el servidor vuelve a comprobarlo, porque
              // `pattern` se salta desactivando JavaScript o enviando a mano.
              pattern={PATRON_NOMBRE_HTML}
              required
              className={CAMPO}
              placeholder="Nombre y apellido"
              aria-invalid={Boolean(errores.fullName)}
              aria-describedby={`${idBase}-nombre-ayuda`}
            />
            <p id={`${idBase}-nombre-ayuda`} className="mt-1.5 text-[0.8rem] text-muted">
              Solo letras. Sin números.
            </p>
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
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
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
              minLength={8}
              maxLength={72}
              required
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
            Al crear tu cuenta quedas registrado como socio de {gymName}. Te enviaremos un
            correo para confirmar tu dirección, y recepción vinculará la cuenta con tu ficha
            para que veas tu membresía y tus pagos.
          </p>

          <BotonEnviar>Crear cuenta</BotonEnviar>
        </form>
      )}
    </div>
  );
}
