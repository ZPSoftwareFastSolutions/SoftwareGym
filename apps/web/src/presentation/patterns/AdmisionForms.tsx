'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Autorizar a alguien en una sesión de clase (V4.2).
 *
 * QUÉ RESUELVE. Antes, «clase abierta» significaba que entraba cualquiera con
 * ficha en el gimnasio, y un no socio no podía ni registrarse. Desde aquí se
 * autoriza NOMINALMENTE a dos clases de persona con el mismo formulario:
 *
 *   SOCIO      se le deja entrar a una clase que su plan no cubre (promoción)
 *   INVITADO   no tiene ficha: se guardan nombre, documento y teléfono
 *
 * Son dos pestañas y no dos formularios sueltos porque la base obliga a elegir
 * uno u otro (un CHECK): enseñarlos a la vez invita a rellenar los dos y a
 * recibir un error que no se entiende.
 *
 * La lista de socios llega YA RESUELTA desde el servidor; el navegador no
 * decide a quién se puede autorizar. Y lo que impide autorizar de más no es
 * esta pantalla: es el disparador, que bloquea la sesión y comprueba el cupo.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import {
  autorizarEnSesion,
  deshacerLlegadaDeAdmision,
  marcarLlegadaDeAdmision,
  quitarAdmision,
} from '@/app/[tenant]/panel/clases/actions';
import {
  LARGO_MAXIMO_DE_MOTIVO,
  resumirAdmisiones,
  type Admision,
} from '@core/domain/operations/admissions';
import { formatoTelefono } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../icons/Icon';
import { AccionConEstado } from './AccionConEstado';

/** Un socio del gimnasio, tal como lo ofrece el desplegable. */
export interface SocioParaAutorizar {
  readonly id: string;
  readonly nombre: string;
  readonly codigo: string | null;
}

interface AdmisionFormsProps {
  readonly slug: string;
  readonly sessionId: string;
  readonly admisiones: readonly Admision[];
  readonly socios: readonly SocioParaAutorizar[];
  /** `false` en una sesión cancelada o cerrada: se ve la lista, no se autoriza. */
  readonly sePuedeAutorizar: boolean;
}

function Enviar({ etiqueta }: { readonly etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 text-[0.88rem] font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={pending ? 'refresh' : 'check'} size={16} className={cn(pending && 'animate-spin')} />
      {pending ? 'Autorizando…' : etiqueta}
    </button>
  );
}

export function AdmisionForms({ slug, sessionId, admisiones, socios, sePuedeAutorizar }: AdmisionFormsProps) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(autorizarEnSesion, {});
  const [pestana, setPestana] = useState<'invitado' | 'socio'>('invitado');
  const errores = estado.errores ?? {};
  const previos = estado.valores ?? {};
  const resumen = resumirAdmisiones(admisiones);

  return (
    <div className="flex flex-col gap-6">
      {admisiones.length > 0 && (
        <p className="text-[0.85rem] text-muted">
          {resumen.total} {resumen.total === 1 ? 'persona autorizada' : 'personas autorizadas'} ·{' '}
          {resumen.invitados} {resumen.invitados === 1 ? 'invitado' : 'invitados'} · {resumen.socios}{' '}
          {resumen.socios === 1 ? 'socio' : 'socios'} · {resumen.vinieron}{' '}
          {resumen.vinieron === 1 ? 'llegó' : 'llegaron'}
        </p>
      )}

      {admisiones.length === 0 ? (
        <EmptyState
          icono="group"
          titulo="Nadie autorizado todavía"
          descripcion="Autoriza a un invitado o a un socio para que pueda entrar a esta sesión."
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {admisiones.map((admision) => (
            <li
              key={admision.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--t-radius-md)] border border-line px-4 py-3"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-[0.95rem] text-ink">{admision.nombre}</strong>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[0.7rem] font-semibold',
                      admision.esInvitado ? 'bg-structural/20 text-structural' : 'bg-action/15 text-action',
                    )}
                  >
                    {admision.esInvitado ? 'Invitado' : 'Socio'}
                  </span>
                  {admision.vino && (
                    <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-action">
                      <Icon name="check" size={13} />
                      Llegó
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[0.78rem] text-muted">
                  {[admision.customerCode, admision.documento, admision.telefono, admision.motivo]
                    .filter((dato) => dato !== null && dato !== '')
                    .join(' · ') || 'Sin datos adicionales'}
                </span>
              </span>

              {sePuedeAutorizar && (
                <span className="flex flex-wrap items-start gap-2">
                  {admision.vino ? (
                    <AccionConEstado
                      accion={deshacerLlegadaDeAdmision}
                      campos={{ tenantSlug: slug, admissionId: admision.id }}
                      etiqueta="Deshacer"
                      icono="refresh"
                    />
                  ) : (
                    <AccionConEstado
                      accion={marcarLlegadaDeAdmision}
                      campos={{ tenantSlug: slug, admissionId: admision.id }}
                      etiqueta="Llegó"
                      icono="check"
                      variante="primario"
                    />
                  )}
                  {/* Retirar solo tiene sentido antes de que llegue: después es
                      un registro de quién estuvo, y eso no se borra. */}
                  {!admision.vino && (
                    <AccionConEstado
                      accion={quitarAdmision}
                      campos={{ tenantSlug: slug, admissionId: admision.id }}
                      etiqueta="Retirar"
                      icono="close"
                      variante="peligro"
                      confirmar={`¿Retirar la autorización de ${admision.nombre}?`}
                    />
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {sePuedeAutorizar && (
        <div className="rounded-[var(--t-radius-md)] border border-line p-5">
          <h3 className="t-h3 text-[1rem]">Autorizar a alguien</h3>

          <div role="tablist" aria-label="A quién autorizar" className="mt-4 flex flex-wrap gap-2">
            {(['invitado', 'socio'] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                role="tab"
                aria-selected={pestana === opcion}
                onClick={() => setPestana(opcion)}
                className={cn(
                  'min-h-11 rounded-[var(--t-radius-md)] border px-4 text-[0.88rem] font-semibold transition-colors',
                  pestana === opcion
                    ? 'border-action bg-action text-on-action'
                    : 'border-line text-muted hover:border-action hover:text-action',
                )}
              >
                {opcion === 'invitado' ? 'Un invitado' : 'Un socio'}
              </button>
            ))}
          </div>

          {/* `key` fuerza a React a montar un formulario limpio al cambiar de
              pestaña: si no, los campos del invitado viajarían con el socio y la
              base los rechazaría por su CHECK. */}
          <form key={pestana} action={accion} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="tenantSlug" value={slug} />
            <input type="hidden" name="sessionId" value={sessionId} />

            {pestana === 'socio' ? (
              <Campo id="adm-socio" etiqueta="Socio" obligatorio ayuda="Su nombre sale de su ficha.">
                <select name="customerId" required className={CLASE_DE_CONTROL}>
                  <option value="">Elige un socio…</option>
                  {socios.map((socio) => (
                    <option key={socio.id} value={socio.id}>
                      {socio.codigo ? `${socio.codigo} · ${socio.nombre}` : socio.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            ) : (
              <>
                <Campo id="adm-nombre" etiqueta="Nombre del invitado" obligatorio error={errores.nombre}>
                  <input
                    name="nombre"
                    defaultValue={previos.nombre ?? ''}
                    maxLength={120}
                    required
                    className={CLASE_DE_CONTROL}
                  />
                </Campo>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id="adm-documento"
                    etiqueta="Documento"
                    error={errores.documento}
                    ayuda="Opcional, pero evita que se autorice dos veces a la misma persona."
                  >
                    <input
                      name="documento"
                      defaultValue={previos.documento ?? ''}
                      maxLength={30}
                      className={CLASE_DE_CONTROL}
                    />
                  </Campo>

                  <Campo id="adm-telefono" etiqueta="Teléfono" ayuda="Opcional.">
                    <input
                      name="telefono"
                      defaultValue={previos.telefono ? (formatoTelefono(previos.telefono) === '—' ? previos.telefono : formatoTelefono(previos.telefono)) : ''}
                      maxLength={40}
                      className={CLASE_DE_CONTROL}
                      onBlur={(e) => { e.target.value = formatoTelefono(e.target.value) === '—' ? '' : formatoTelefono(e.target.value); }}
                    />
                  </Campo>
                </div>
              </>
            )}

            <Campo
              id="adm-motivo"
              etiqueta="Motivo"
              error={errores.motivo}
              ayuda="Por qué se le autoriza: «invitado de un socio», «promoción», «evento»."
            >
              <input
                name="motivo"
                defaultValue={previos.motivo ?? ''}
                maxLength={LARGO_MAXIMO_DE_MOTIVO}
                className={CLASE_DE_CONTROL}
              />
            </Campo>

            <div className="flex flex-wrap items-center gap-4">
              <Enviar etiqueta={pestana === 'socio' ? 'Autorizar al socio' : 'Autorizar al invitado'} />
              <p
                aria-live="polite"
                className={cn('text-[0.85rem]', estado.exito ? 'text-action' : 'text-structural')}
              >
                {estado.exito ?? estado.mensaje ?? ''}
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
