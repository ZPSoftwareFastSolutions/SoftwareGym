'use client';

/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Formularios de entrenamiento (V3.2): programa, rutina, ejercicios de una
 * rutina, asignación a un socio y la marca de «hecho».
 *
 * La marca es el formulario más usado del módulo —lo aprieta un socio con el
 * celular en la mano entre serie y serie—, así que es un botón grande con dos
 * campos opcionales al lado, no un diálogo.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import {
  actualizarEjercicioAsignado,
  actualizarEjercicioDeRutina,
  agregarEjercicioARutina,
  asignarRutinaASocio,
  desmarcarEjercicio,
  guardarPrograma,
  guardarRutina,
  marcarEjercicio,
} from '@/app/[tenant]/panel/rutinas/actions';
import {
  NOMBRE_DE_NIVEL,
  NOMBRE_DE_OBJETIVO,
  type EjercicioDeRutina,
  type Nivel,
  type Objetivo,
  type Programa,
  type Rutina,
} from '@core/domain/operations/training';
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

// ------------------------------------------------------------------ programa

export function ProgramaForm({ slug, programa }: { readonly slug: string; readonly programa?: Programa }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarPrograma, {});
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {
    name: programa?.name ?? '',
    description: programa?.description ?? '',
    goal: programa?.goal ?? 'hipertrofia',
    level: programa?.level ?? 'todos',
    weeks: programa?.weeks?.toString() ?? '',
  };

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {programa && <input type="hidden" name="programId" value={programa.id} />}

      <Campo id="programa-nombre" etiqueta="Nombre del programa" error={errores.name} obligatorio ayuda="Cómo lo llaman entre ustedes: «Full Body 3 días», «Fuerza principiantes».">
        <input name="name" defaultValue={valores.name} required minLength={2} maxLength={80} autoComplete="off" className={CLASE_DE_CONTROL} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="programa-objetivo" etiqueta="Objetivo" error={errores.goal} obligatorio>
          <select name="goal" defaultValue={valores.goal} className={CLASE_DE_CONTROL}>
            {(Object.keys(NOMBRE_DE_OBJETIVO) as Objetivo[]).map((o) => (
              <option key={o} value={o}>
                {NOMBRE_DE_OBJETIVO[o]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="programa-nivel" etiqueta="Nivel" error={errores.level} obligatorio>
          <select name="level" defaultValue={valores.level} className={CLASE_DE_CONTROL}>
            {(Object.keys(NOMBRE_DE_NIVEL) as Nivel[]).map((n) => (
              <option key={n} value={n}>
                {NOMBRE_DE_NIVEL[n]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="programa-semanas" etiqueta="Semanas" error={errores.weeks} ayuda="Opcional.">
          <input name="weeks" inputMode="numeric" defaultValue={valores.weeks} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Campo id="programa-descripcion" etiqueta="Para quién es" error={errores.description}>
        <textarea name="description" defaultValue={valores.description} maxLength={400} rows={3} className={cn(CLASE_DE_CONTROL, 'h-auto min-h-24 resize-y py-3')} />
      </Campo>

      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto={programa ? 'Guardar programa' : 'Crear programa'} />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ rutina

export function RutinaForm({
  slug,
  rutina,
  programas,
  programIdInicial,
}: {
  readonly slug: string;
  readonly rutina?: Rutina;
  readonly programas: readonly Pick<Programa, 'id' | 'name'>[];
  readonly programIdInicial?: string;
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarRutina, {});
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {
    name: rutina?.name ?? '',
    dayLabel: rutina?.dayLabel ?? '',
    position: rutina?.position?.toString() ?? '1',
    notes: rutina?.notes ?? '',
    estimatedMinutes: rutina?.estimatedMinutes?.toString() ?? '',
  };

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {rutina && <input type="hidden" name="routineId" value={rutina.id} />}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Campo id="rutina-nombre" etiqueta="Nombre de la rutina" error={errores.name} obligatorio ayuda="Ej.: «Día A · Empuje».">
          <input name="name" defaultValue={valores.name} required minLength={2} maxLength={80} autoComplete="off" className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="rutina-dia" etiqueta="Etiqueta del día" error={errores.dayLabel} ayuda="«Día A», «Lunes»…">
          <input name="dayLabel" defaultValue={valores.dayLabel} maxLength={40} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="rutina-programa" etiqueta="Programa" ayuda="Vacío: rutina suelta.">
          <select name="programId" defaultValue={rutina?.programId ?? programIdInicial ?? ''} className={CLASE_DE_CONTROL}>
            <option value="">Sin programa</option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="rutina-orden" etiqueta="Orden" error={errores.position} ayuda="1 = primera del programa.">
          <input name="position" inputMode="numeric" defaultValue={valores.position} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="rutina-minutos" etiqueta="Duración (min)" error={errores.estimatedMinutes}>
          <input name="estimatedMinutes" inputMode="numeric" defaultValue={valores.estimatedMinutes} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Campo id="rutina-notas" etiqueta="Notas para quien la haga" error={errores.notes}>
        <textarea name="notes" defaultValue={valores.notes} maxLength={400} rows={3} className={cn(CLASE_DE_CONTROL, 'h-auto min-h-24 resize-y py-3')} />
      </Campo>

      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto={rutina ? 'Guardar rutina' : 'Crear rutina'} />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ ejercicio

export interface OpcionDeEjercicio {
  readonly id: string;
  readonly nombre: string;
  readonly grupo: string;
}

/**
 * Alta o ajuste de un ejercicio dentro de una rutina. `destino` decide si se
 * toca la PLANTILLA o la copia de un socio: son acciones distintas con permisos
 * distintos.
 */
export function EjercicioDeRutinaForm({
  slug,
  routineId,
  itemId,
  destino,
  catalogo,
  ejercicio,
  siguientePosicion,
}: {
  readonly slug: string;
  readonly routineId?: string;
  readonly itemId?: string;
  readonly destino: 'plantilla' | 'socio';
  readonly catalogo: readonly OpcionDeEjercicio[];
  readonly ejercicio?: EjercicioDeRutina;
  readonly siguientePosicion?: number;
}) {
  const accionDelFormulario = itemId
    ? destino === 'socio'
      ? actualizarEjercicioAsignado
      : actualizarEjercicioDeRutina
    : agregarEjercicioARutina;
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(accionDelFormulario, {});
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      {routineId && <input type="hidden" name="routineId" value={routineId} />}
      {itemId && <input type="hidden" name="itemId" value={itemId} />}

      {ejercicio ? (
        <input type="hidden" name="exerciseId" value={ejercicio.exerciseId} />
      ) : (
        <Campo id="ejercicio-del-catalogo" etiqueta="Ejercicio" error={errores.exerciseId} obligatorio>
          <select name="exerciseId" required defaultValue="" className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Elige del catálogo
            </option>
            {catalogo.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} · {e.grupo}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Campo id="ejercicio-series" etiqueta="Series" error={errores.sets} obligatorio>
          <input name="sets" inputMode="numeric" required defaultValue={ejercicio?.sets ?? 3} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="ejercicio-reps" etiqueta="Repeticiones" error={errores.reps} obligatorio ayuda="«10», «8-12», «al fallo», «45 seg».">
          <input name="reps" required defaultValue={ejercicio?.reps ?? '10'} maxLength={20} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="ejercicio-peso" etiqueta="Peso (kg)" error={errores.weightKg}>
          <input name="weightKg" inputMode="decimal" defaultValue={ejercicio?.weightKg ?? ''} maxLength={6} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="ejercicio-descanso" etiqueta="Descanso (s)" error={errores.restSeconds}>
          <input name="restSeconds" inputMode="numeric" defaultValue={ejercicio?.restSeconds ?? ''} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Campo id="ejercicio-orden" etiqueta="Orden" error={errores.position}>
          <input name="position" inputMode="numeric" defaultValue={ejercicio?.position ?? siguientePosicion ?? 1} maxLength={2} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="ejercicio-notas" etiqueta="Nota (opcional)" error={errores.notes} ayuda="«Bajar despacio», «no bloquear el codo».">
          <input name="notes" defaultValue={ejercicio?.notes ?? ''} maxLength={200} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto={itemId ? 'Guardar ejercicio' : 'Agregar a la rutina'} icono={itemId ? 'check' : 'plus'} compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ asignación

export interface OpcionDeSocioParaRutina {
  readonly id: string;
  readonly etiqueta: string;
}

export function AsignarRutinaForm({
  slug,
  socios,
  rutinas,
  routineId,
}: {
  readonly slug: string;
  readonly socios: readonly OpcionDeSocioParaRutina[];
  readonly rutinas: readonly Pick<Rutina, 'id' | 'name' | 'programName' | 'ejercicios'>[];
  readonly routineId?: string;
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(asignarRutinaASocio, {});
  const [filtro, setFiltro] = useState('');
  const errores = estado.errores ?? {};
  const visibles = filtro.trim()
    ? socios.filter((s) => s.etiqueta.toLocaleLowerCase('es').includes(filtro.trim().toLocaleLowerCase('es')))
    : socios;

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      {routineId && <input type="hidden" name="routineId" value={routineId} />}

      <Campo id="asignar-buscar" etiqueta="Buscar socio" ayuda="Por nombre o código.">
        <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Ej.: MF-004 o Pérez" className={CLASE_DE_CONTROL} />
      </Campo>

      <Campo id="asignar-socio" etiqueta="Socio" error={errores.customerId} obligatorio>
        <select name="customerId" required defaultValue="" className={CLASE_DE_CONTROL}>
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

      {!routineId && (
        <Campo id="asignar-rutina" etiqueta="Rutina" error={errores.routineId} obligatorio>
          <select name="routineId" required defaultValue="" className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Elige la rutina
            </option>
            {rutinas.map((r) => (
              <option key={r.id} value={r.id} disabled={r.ejercicios === 0}>
                {r.programName ? `${r.programName} · ` : ''}
                {r.name} ({r.ejercicios} ejercicios)
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo id="asignar-nota" etiqueta="Nota para el socio (opcional)">
        <input name="notes" maxLength={400} placeholder="Empezar suave las dos primeras semanas" className={CLASE_DE_CONTROL} />
      </Campo>

      <Aviso estado={estado} />
      <p className="text-[0.8rem] text-muted">
        Al asignar se copia la rutina: los cambios que hagas después para este socio no tocan la plantilla.
      </p>
      <div className="flex justify-end">
        <Enviar texto="Asignar rutina" icono="plus" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ marcar

/**
 * El botón de «hecho» de un ejercicio. Con series y peso opcionales: si el
 * socio no anota nada, igual queda el registro, que es lo que alimenta las
 * métricas.
 */
export function MarcarEjercicio({
  slug,
  itemId,
  completadoHoy,
  seriesSugeridas,
  pesoSugerido,
}: {
  readonly slug: string;
  readonly itemId: string;
  readonly completadoHoy: boolean;
  readonly seriesSugeridas: number;
  readonly pesoSugerido: number | null;
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(completadoHoy ? desmarcarEjercicio : marcarEjercicio, {});
  const [detalle, setDetalle] = useState(false);
  const { errores } = estado;

  if (completadoHoy) {
    return (
      <form action={accion} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tenantSlug" value={slug} />
        <input type="hidden" name="itemId" value={itemId} />
        <span className="inline-flex items-center gap-1.5 rounded-[var(--t-radius-sm)] bg-action/15 px-3 py-1.5 text-[0.82rem] font-semibold text-action">
          <Icon name="check" size={15} /> Hecho hoy
        </span>
        <button type="submit" className="text-[0.8rem] text-muted underline-offset-4 hover:text-structural hover:underline">
          Deshacer
        </button>
        {estado.mensaje && <span className="text-[0.8rem] text-structural">{estado.mensaje}</span>}
      </form>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="itemId" value={itemId} />
      <div className="flex flex-wrap items-center gap-2">
        <Enviar texto="Marcar hecho" compacto />
        <button type="button" onClick={() => setDetalle((v) => !v)} className="h-11 px-2 text-[0.82rem] text-muted underline-offset-4 hover:text-ink hover:underline">
          {detalle ? 'Sin anotar' : 'Anotar series y peso'}
        </button>
      </div>
      {detalle && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[0.76rem] text-muted">
            Series
            <input
              name="sets"
              inputMode="numeric"
              defaultValue={seriesSugeridas}
              maxLength={2}
              aria-invalid={Boolean(errores?.sets)}
              className="h-11 w-20 rounded-[var(--t-radius-md)] border border-line bg-raised px-3 text-[0.9rem] text-ink focus:border-action focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.76rem] text-muted">
            Peso (kg)
            <input
              name="weightKg"
              inputMode="decimal"
              defaultValue={pesoSugerido ?? ''}
              maxLength={6}
              aria-invalid={Boolean(errores?.weightKg)}
              className="h-11 w-24 rounded-[var(--t-radius-md)] border border-line bg-raised px-3 text-[0.9rem] text-ink focus:border-action focus:outline-none"
            />
          </label>
        </div>
      )}
      {(errores?.sets || errores?.weightKg || estado.mensaje) && (
        <p role="alert" className="text-[0.8rem] text-structural">
          {errores?.sets ?? errores?.weightKg ?? estado.mensaje}
        </p>
      )}
      {estado.exito && <p className="text-[0.8rem] text-action">{estado.exito}</p>}
    </form>
  );
}
