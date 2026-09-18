'use client';

/**
 * CAPA: Presentation / Patterns
 *
 * Acceso con enlace por correo (V4.2): pedirlo y, al volver, crear la
 * contraseña. Sirve a quien la olvidó y al socio que dio de alta recepción y
 * nunca tuvo cuenta. Nada de esto decide nada: las acciones de servidor validan,
 * canjean los tokens y aplican la misma puerta que el inicio de sesión.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { crearContrasena, pedirEnlaceDeAcceso, type EstadoFormulario } from '@/app/[tenant]/acceso/actions';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';

const CAMPO = [
  'w-full min-h-12 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/50',
  'transition-colors focus:border-action focus:outline-none aria-[invalid=true]:border-action',
].join(' ');

const INICIAL: EstadoFormulario = {};

function Enviar({ children, pendiente }: { readonly children: string; readonly pendiente: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending} aria-busy={pending}>
      {pending ? pendiente : children}
    </Button>
  );
}

function Aviso({ estado }: { readonly estado: EstadoFormulario }) {
  if (!estado.mensaje && !estado.exito) return null;
  return (
    <p
      role={estado.exito ? 'status' : 'alert'}
      className="flex items-start gap-2.5 rounded-[var(--t-radius-md)] border border-action/40 bg-action/10 px-4 py-3 text-[0.88rem] leading-relaxed text-ink"
    >
      <Icon name={estado.exito ? 'check' : 'shield'} size={16} className="mt-0.5 shrink-0 text-action" />
      <span>{estado.exito ?? estado.mensaje}</span>
    </p>
  );
}

export function PedirEnlaceForm({ slug, alVolver }: { readonly slug: string; readonly alVolver: () => void }) {
  const [estado, accion] = useActionState(pedirEnlaceDeAcceso, INICIAL);
  return (
    <form action={accion} className="mt-7 flex flex-col gap-5" noValidate>
      <input type="hidden" name="tenantSlug" value={slug} />
      <div>
        <h2 className="t-h3">Entrar con un enlace</h2>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
          ¿Olvidaste tu contraseña, o te registraron en recepción y nunca creaste una? Escribe tu correo: te enviamos un
          enlace para entrar y crear tu contraseña. Tu cuenta queda unida a tu ficha de socio.
        </p>
      </div>
      <Aviso estado={estado} />
      <div>
        <label htmlFor="enlace-email" className="mb-2 block text-[0.85rem] text-muted">
          Correo electrónico
        </label>
        <input
          id="enlace-email"
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
          aria-invalid={Boolean(estado.errores?.email)}
        />
        {estado.errores?.email && <p className="mt-1.5 text-[0.82rem] text-action">{estado.errores.email}</p>}
      </div>
      <Enviar pendiente="Enviando…">Enviarme el enlace</Enviar>
      <button type="button" onClick={alVolver} className="min-h-11 text-[0.88rem] font-semibold text-action underline-offset-4 hover:underline">
        Volver a iniciar sesión
      </button>
    </form>
  );
}

export function CrearContrasenaForm({
  slug,
  accessToken,
  refreshToken,
}: {
  readonly slug: string;
  readonly accessToken: string;
  readonly refreshToken: string;
}) {
  const [estado, accion] = useActionState(crearContrasena, INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="accessToken" value={accessToken} />
      <input type="hidden" name="refreshToken" value={refreshToken} />
      <div>
        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-action">Tu cuenta</p>
        <h2 className="t-h3 mt-2">Crea tu contraseña</h2>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
          La usarás para entrar a tu panel: tu QR, tu membresía y tus clases. Mínimo 8 caracteres; mejor una frase larga.
        </p>
      </div>
      <Aviso estado={estado} />
      <div>
        <label htmlFor="nueva-clave" className="mb-2 block text-[0.85rem] text-muted">
          Contraseña nueva
        </label>
        <input
          id="nueva-clave"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          className={CAMPO}
          aria-invalid={Boolean(estado.errores?.password)}
        />
        {estado.errores?.password && <p className="mt-1.5 text-[0.82rem] text-action">{estado.errores.password}</p>}
      </div>
      <div>
        <label htmlFor="nueva-clave-2" className="mb-2 block text-[0.85rem] text-muted">
          Repite la contraseña
        </label>
        <input
          id="nueva-clave-2"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          maxLength={72}
          required
          className={CAMPO}
          aria-invalid={Boolean(estado.errores?.confirmacion)}
        />
        {estado.errores?.confirmacion && <p className="mt-1.5 text-[0.82rem] text-action">{estado.errores.confirmacion}</p>}
      </div>
      <Enviar pendiente="Guardando…">Guardar y entrar</Enviar>
    </form>
  );
}
