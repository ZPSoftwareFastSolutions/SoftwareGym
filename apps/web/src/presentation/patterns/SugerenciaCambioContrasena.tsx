'use client';

import { useActionState, useState } from 'react';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PasswordInput } from '../ui/PasswordInput';
import { cambiarContrasenaSugerida, descartarSugerenciaContrasena, type EstadoCambioContrasena } from '../../app/[tenant]/panel/socio/actions';

const CAMPO = [
  'w-full min-h-12 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/50',
  'transition-colors focus:border-action focus:outline-none aria-[invalid=true]:border-action',
].join(' ');

export function SugerenciaCambioContrasena() {
  const [descartado, setDescartado] = useState(false);
  const [estado, accion, isPending] = useActionState<EstadoCambioContrasena, FormData>(cambiarContrasenaSugerida, {});

  if (descartado || estado.exito) return null;

  return (
    <div className="flex flex-col items-start gap-4 rounded-[var(--t-radius-md)] border border-action/30 bg-action/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Icon name="shield" size={24} className="mt-0.5 shrink-0 text-action" />
        <div>
          <h3 className="text-[1.05rem] font-bold text-ink">Mejora la seguridad de tu cuenta</h3>
          <p className="mt-1 text-[0.88rem] leading-relaxed text-muted">
            Tu contraseña actual fue generada automáticamente. Te recomendamos cambiarla por una propia.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3 sm:flex-nowrap">
        <button
          type="button"
          onClick={() => {
            setDescartado(true);
            descartarSugerenciaContrasena();
          }}
          className="h-11 rounded-[var(--t-radius-md)] px-4 text-[0.88rem] font-semibold text-muted hover:text-ink hover:underline"
        >
          Dejarlo así
        </button>
        <Modal
          titulo="Cambiar contraseña"
          descripcion="Escribe tu nueva contraseña. Mínimo 8 caracteres."
          anchoMaximo="sm"
          disparador={
            <Button variant="primary" size="md">
              Cambiar ahora
            </Button>
          }
        >
          <form action={accion} className="flex flex-col gap-4">
            {estado.mensaje && (
              <p className="rounded-[var(--t-radius-md)] bg-action/10 px-4 py-3 text-[0.85rem] text-ink border border-action/40">
                {estado.mensaje}
              </p>
            )}
            <div>
              <label htmlFor="clave-nueva" className="mb-2 block text-[0.85rem] text-muted">
                Nueva contraseña
              </label>
              <PasswordInput
                id="clave-nueva"
                name="password"
                required
                minLength={8}
                maxLength={72}
              />
              {estado.errores?.password && (
                <p className="mt-1 text-[0.8rem] text-action">{estado.errores.password}</p>
              )}
            </div>
            <div>
              <label htmlFor="clave-confirma" className="mb-2 block text-[0.85rem] text-muted">
                Repite la contraseña
              </label>
              <PasswordInput
                id="clave-confirma"
                name="confirmacion"
                required
                maxLength={72}
              />
              {estado.errores?.confirmacion && (
                <p className="mt-1 text-[0.8rem] text-action">{estado.errores.confirmacion}</p>
              )}
            </div>
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
}
