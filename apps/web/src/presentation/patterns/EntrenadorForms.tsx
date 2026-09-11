'use client';

/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Formularios de entrenadores (V3.1): perfil, cuenta, sedes, ausencias,
 * asignación de socios y regla del plan.
 *
 * Validan en el cliente solo para contestar rápido; la acción vuelve a validar
 * con el mismo dominio y la base aplica permisos, gimnasio y regla del plan.
 */

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import {
  asignarSocio,
  guardarEntrenador,
  guardarReglaDePlan,
  guardarSucursalesDeEntrenador,
  registrarAusencia,
  vincularCuentaDeEntrenador,
} from '@/app/[tenant]/panel/entrenadores/actions';
import {
  MAXIMO_DE_SECUNDARIOS,
  NOMBRE_DE_TIPO_DE_AUSENCIA,
  type Entrenador,
  type TipoDeAusencia,
  type Turno,
} from '@core/domain/operations/trainers';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon, type AnyIconKey } from '../icons/Icon';

function Enviar({ texto, icono = 'check', compacto = false }: { readonly texto: string; readonly icono?: AnyIconKey; readonly compacto?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--t-radius-md)] bg-action font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50',
        compacto ? 'h-11 px-4 text-[0.86rem]' : 'h-12 px-6',
      )}
    >
      <Icon name={pending ? 'refresh' : icono} size={17} className={cn(pending && 'animate-spin')} />
      {pending ? 'Guardando…' : texto}
    </button>
  );
}

function Aviso({ estado }: { readonly estado: EstadoDeFormulario }) {
  if (!estado.exito && !estado.mensaje) return null;
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--t-radius-md)] border px-4 py-3 text-[0.88rem] text-ink',
        estado.exito ? 'border-action/40 bg-action/10' : 'border-structural/50 bg-structural/10',
      )}
    >
      <Icon name={estado.exito ? 'check' : 'alert'} size={17} className={cn('mt-0.5 shrink-0', estado.exito ? 'text-action' : 'text-structural')} />
      {estado.exito ?? estado.mensaje}
    </p>
  );
}

// ------------------------------------------------------------------ perfil

export function EntrenadorForm({ slug, entrenador }: { readonly slug: string; readonly entrenador?: Entrenador }) {
  const [estado, accion] = useActionState(guardarEntrenador, {});
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {
    firstName: entrenador?.firstName ?? '',
    lastName: entrenador?.lastName ?? '',
    email: entrenador?.email ?? '',
    phone: entrenador?.phone ?? '',
    bio: entrenador?.bio ?? '',
    specialties: entrenador?.specialties.join(', ') ?? '',
  };

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {entrenador && <input type="hidden" name="trainerId" value={entrenador.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="entrenador-nombre" etiqueta="Nombre" error={errores.firstName} obligatorio>
          <input name="firstName" defaultValue={valores.firstName} required maxLength={60} autoComplete="off" className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="entrenador-apellido" etiqueta="Apellido" error={errores.lastName} obligatorio>
          <input name="lastName" defaultValue={valores.lastName} required maxLength={60} autoComplete="off" className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="entrenador-correo" etiqueta="Correo de contacto" error={errores.email} ayuda="Opcional. No da acceso: la cuenta se vincula aparte.">
          <input name="email" type="email" defaultValue={valores.email} maxLength={120} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="entrenador-telefono" etiqueta="Teléfono" error={errores.phone}>
          <input name="phone" type="tel" defaultValue={valores.phone} maxLength={40} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Campo id="entrenador-especialidades" etiqueta="Especialidades" error={errores.specialties} ayuda="Separadas por coma. Ej.: Fuerza, Movilidad, Baile. Hasta 8.">
        <input name="specialties" defaultValue={valores.specialties} maxLength={400} className={CLASE_DE_CONTROL} />
      </Campo>

      <Campo id="entrenador-bio" etiqueta="Presentación" error={errores.bio} ayuda="Uso interno del gimnasio. Hasta 600 caracteres.">
        <textarea name="bio" defaultValue={valores.bio} maxLength={600} rows={3} className={cn(CLASE_DE_CONTROL, 'h-auto min-h-24 resize-y py-3')} />
      </Campo>

      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto={entrenador ? 'Guardar cambios' : 'Crear entrenador'} />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ cuenta

export function VincularCuentaForm({ slug, trainerId, correoSugerido }: { readonly slug: string; readonly trainerId: string; readonly correoSugerido: string | null }) {
  const [estado, accion] = useActionState(vincularCuentaDeEntrenador, {});
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="trainerId" value={trainerId} />
      <Campo
        id={`cuenta-${trainerId}`}
        etiqueta="Correo de la cuenta"
        error={estado.errores?.email}
        ayuda="El entrenador se registra primero en «Acceso» de la web con este correo y lo confirma. Al vincularla, entra y ve solo sus socios asignados."
      >
        <input name="email" type="email" required defaultValue={estado.valores?.email ?? correoSugerido ?? ''} maxLength={120} className={CLASE_DE_CONTROL} />
      </Campo>
      <Aviso estado={estado} />
      <div>
        <Enviar texto="Vincular cuenta" icono="lock" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ sedes

export function SucursalesDeEntrenadorForm({
  slug,
  trainerId,
  sucursales,
  seleccionadas,
}: {
  readonly slug: string;
  readonly trainerId: string;
  readonly sucursales: readonly { readonly id: string; readonly name: string; readonly isActive: boolean }[];
  readonly seleccionadas: readonly string[];
}) {
  const [estado, accion] = useActionState(guardarSucursalesDeEntrenador, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="trainerId" value={trainerId} />
      <fieldset className="flex flex-wrap gap-2.5">
        <legend className="sr-only">Sedes donde trabaja</legend>
        {sucursales.map((s) => (
          <label
            key={s.id}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--t-radius-md)] border border-line px-3.5 text-[0.88rem] transition-colors has-[:checked]:border-action has-[:checked]:bg-action/10',
              !s.isActive && 'opacity-60',
            )}
          >
            <input type="checkbox" name="branchIds" value={s.id} defaultChecked={seleccionadas.includes(s.id)} disabled={!s.isActive && !seleccionadas.includes(s.id)} className="h-4 w-4 accent-[var(--t-action)]" />
            {s.name}
            {!s.isActive && <span className="text-[0.76rem] text-muted">(inactiva)</span>}
          </label>
        ))}
      </fieldset>
      <Aviso estado={estado} />
      <div>
        <Enviar texto="Guardar sedes" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ ausencias

const ICONO_DE_AUSENCIA: Readonly<Record<TipoDeAusencia, AnyIconKey>> = {
  horas: 'clock',
  turno: 'layers',
  dia: 'calendar',
  periodo: 'archive',
};

export function AusenciaForm({ slug, trainerId, turnos, hoy }: { readonly slug: string; readonly trainerId: string; readonly turnos: readonly Turno[]; readonly hoy: string }) {
  const [estado, accion] = useActionState(registrarAusencia, {});
  const valores = estado.valores ?? {};
  const [tipo, setTipo] = useState<TipoDeAusencia>((valores.kind as TipoDeAusencia | undefined) ?? 'dia');
  const errores = estado.errores ?? {};
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (estado.exito) setVersion((v) => v + 1);
  }, [estado.exito]);

  return (
    <form key={version} action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="trainerId" value={trainerId} />

      <fieldset>
        <legend className="mb-2 text-[0.86rem] font-semibold">¿Cuánto tiempo no estará disponible?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(NOMBRE_DE_TIPO_DE_AUSENCIA) as TipoDeAusencia[]).map((k) => (
            <label
              key={k}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--t-radius-md)] border border-line px-3 text-[0.86rem] transition-colors has-[:checked]:border-action has-[:checked]:bg-action/10"
            >
              <input type="radio" name="kind" value={k} checked={tipo === k} onChange={() => setTipo(k)} className="sr-only" />
              <Icon name={ICONO_DE_AUSENCIA[k]} size={16} className="text-action" />
              {NOMBRE_DE_TIPO_DE_AUSENCIA[k]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`ausencia-desde-${trainerId}`} etiqueta={tipo === 'periodo' ? 'Desde' : 'Fecha'} error={errores.startDate} obligatorio>
          <input name="startDate" type="date" required defaultValue={valores.startDate ?? hoy} className={CLASE_DE_CONTROL} />
        </Campo>

        {tipo === 'periodo' && (
          <Campo id={`ausencia-hasta-${trainerId}`} etiqueta="Hasta (incluido)" error={errores.endDate} obligatorio>
            <input name="endDate" type="date" required defaultValue={valores.endDate ?? ''} min={hoy} className={CLASE_DE_CONTROL} />
          </Campo>
        )}

        {tipo === 'turno' && (
          <Campo id={`ausencia-turno-${trainerId}`} etiqueta="Turno" error={errores.shiftCode} obligatorio>
            <select name="shiftCode" defaultValue={valores.shiftCode ?? turnos[0]?.code} className={CLASE_DE_CONTROL}>
              {turnos.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label} ({t.start}–{t.end})
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      {tipo === 'horas' && (
        <div className="grid grid-cols-2 gap-4">
          <Campo id={`ausencia-inicio-${trainerId}`} etiqueta="Desde las" error={errores.startTime} obligatorio>
            <input name="startTime" type="time" required defaultValue={valores.startTime ?? ''} className={CLASE_DE_CONTROL} />
          </Campo>
          <Campo id={`ausencia-fin-${trainerId}`} etiqueta="Hasta las" error={errores.endTime} obligatorio>
            <input name="endTime" type="time" required defaultValue={valores.endTime ?? ''} className={CLASE_DE_CONTROL} />
          </Campo>
        </div>
      )}

      <Campo id={`ausencia-motivo-${trainerId}`} etiqueta="Motivo (opcional)" error={errores.reason} ayuda="Algo breve: «Vacaciones», «Capacitación». Sin datos de salud.">
        <input name="reason" defaultValue={valores.reason ?? ''} maxLength={200} className={CLASE_DE_CONTROL} />
      </Campo>

      <Aviso estado={estado} />
      <div>
        <Enviar texto="Registrar ausencia" icono="calendar" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ asignación

export interface OpcionDeSocio {
  readonly id: string;
  readonly etiqueta: string;
  /** Lo que su plan vigente permite; `null` = sin membresía vigente. */
  readonly regla: string | null;
}

export function AsignarSocioForm({ slug, trainerId, socios }: { readonly slug: string; readonly trainerId: string; readonly socios: readonly OpcionDeSocio[] }) {
  const [estado, accion] = useActionState(asignarSocio, {});
  const [filtro, setFiltro] = useState('');
  const [elegido, setElegido] = useState('');
  const errores = estado.errores ?? {};

  const visibles = useMemo(() => {
    const q = filtro.trim().toLocaleLowerCase('es');
    return q ? socios.filter((s) => s.etiqueta.toLocaleLowerCase('es').includes(q)) : socios;
  }, [filtro, socios]);
  const regla = socios.find((s) => s.id === elegido)?.regla;

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="trainerId" value={trainerId} />

      <Campo id={`buscar-socio-${trainerId}`} etiqueta="Buscar socio" ayuda="Por nombre o código.">
        <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Ej.: MF-004 o Pérez" className={CLASE_DE_CONTROL} />
      </Campo>

      <Campo id={`socio-${trainerId}`} etiqueta="Socio" error={errores.customerId} obligatorio>
        <select name="customerId" required value={elegido} onChange={(e) => setElegido(e.target.value)} className={CLASE_DE_CONTROL}>
          <option value="" disabled>
            {visibles.length === 0 ? 'Ningún socio coincide' : 'Elige al socio'}
          </option>
          {visibles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etiqueta}
            </option>
          ))}
        </select>
      </Campo>
      {elegido && (
        <p className={cn('-mt-2 text-[0.8rem]', regla ? 'text-muted' : 'text-structural')}>
          {regla ? `Su plan permite: ${regla}.` : 'No tiene una membresía vigente: no se le puede asignar entrenador.'}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Campo id={`tipo-${trainerId}`} etiqueta="Tipo" error={errores.kind} obligatorio>
          <select name="kind" defaultValue="principal" className={CLASE_DE_CONTROL}>
            <option value="principal">Principal</option>
            <option value="secundario">Secundario</option>
          </select>
        </Campo>
        <Campo id={`foco-${trainerId}`} etiqueta="Área (opcional)" error={errores.focus} ayuda="Para un secundario: «Baile», «Nutrición», «Readaptación».">
          <input name="focus" maxLength={60} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Aviso estado={estado} />
      <div>
        <Enviar texto="Asignar socio" icono="plus" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ regla del plan

export function ReglaDePlanForm({
  slug,
  planId,
  includesTrainer,
  maxSecondaryTrainers,
}: {
  readonly slug: string;
  readonly planId: string;
  readonly includesTrainer: boolean;
  readonly maxSecondaryTrainers: number;
}) {
  const [estado, accion] = useActionState(guardarReglaDePlan, {});
  return (
    <form action={accion} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="planId" value={planId} />
      <label className="flex min-h-11 items-center gap-2 text-[0.86rem]">
        <input type="checkbox" name="includesTrainer" value="si" defaultChecked={includesTrainer} className="h-4 w-4 accent-[var(--t-action)]" />
        Principal
      </label>
      <label className="flex items-center gap-2 text-[0.86rem]">
        Secundarios
        <select
          name="maxSecondaryTrainers"
          defaultValue={String(maxSecondaryTrainers)}
          className="h-11 w-20 rounded-[var(--t-radius-md)] border border-line bg-raised px-3 text-[0.9rem] text-ink focus:border-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action/40"
        >
          {Array.from({ length: MAXIMO_DE_SECUNDARIOS + 1 }, (_, n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <Enviar texto="Guardar" compacto />
      <span aria-live="polite" className={cn('text-[0.8rem]', estado.exito ? 'text-action' : 'text-structural')}>
        {estado.exito ?? estado.mensaje ?? estado.errores?.maxSecondaryTrainers ?? ''}
      </span>
    </form>
  );
}
