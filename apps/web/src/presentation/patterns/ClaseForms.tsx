'use client';

/**
 * CAPA: Presentation / Patterns (organismos)
 *
 * Formularios de clases grupales (V3.3): la clase, los planes que la incluyen,
 * el horario semanal, una sesión suelta o evento, la generación de sesiones, la
 * cancelación y la toma de asistencia.
 *
 * La toma de asistencia es el formulario del mostrador: se usa de pie, con la
 * fila de socios delante. Por eso busca por nombre, código o el texto que deja
 * un lector de QR USB, y cada socio tiene su botón grande de «Registrar»; si su
 * plan no incluye la clase, el botón no existe y se dice por qué.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import {
  agregarHorario,
  buscarSociosParaSesion,
  cancelarSesion,
  generarSesiones,
  guardarClase,
  guardarPlanesDeClase,
  guardarSesion,
  registrarAsistenciaAClase,
  type EstadoDeBusqueda,
} from '@/app/[tenant]/panel/clases/actions';
import {
  DIAS_ISO,
  fechasDelHorario,
  NOMBRE_DE_CATEGORIA,
  NOMBRE_DE_DIA_ISO,
  NOMBRE_DE_MODO_DE_ACCESO,
  NOMBRE_DE_MOTIVO_DE_ACCESO,
  NOMBRE_DE_NIVEL_DE_CLASE,
  NOMBRE_DE_TIPO_DE_CLASE,
  sumarDias,
  type CandidatoDeClase,
  type CategoriaDeClase,
  type Clase,
  type HorarioDeClase,
  type ModoDeAcceso,
  type NivelDeClase,
  type SesionDeClase,
  type TipoDeClase,
} from '@core/domain/operations/classes';
import { Campo, CLASE_DE_CONTROL } from '../ui/Campo';
import { Icon, type AnyIconKey } from '../icons/Icon';

/** Casilla con el color de acción del gimnasio (el único valor arbitrario del archivo). */
const CASILLA = 'h-5 w-5 accent-[var(--t-action)]';

export interface Opcion {
  readonly id: string;
  readonly nombre: string;
}

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

function Aviso({ estado }: { readonly estado: { readonly exito?: string; readonly mensaje?: string } }) {
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

function SelectorDeInstructor({
  id,
  instructores,
  valor,
  error,
  ayuda,
}: {
  readonly id: string;
  readonly instructores: readonly Opcion[];
  readonly valor: string;
  readonly error?: string;
  readonly ayuda?: string;
}) {
  return (
    <Campo id={id} etiqueta="Instructor" error={error} ayuda={ayuda}>
      <select name="trainerId" defaultValue={valor} className={CLASE_DE_CONTROL}>
        <option value="">Sin instructor asignado</option>
        {instructores.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nombre}
          </option>
        ))}
      </select>
    </Campo>
  );
}

// ------------------------------------------------------------------ clase

export function ClaseForm({ slug, clase, instructores }: { readonly slug: string; readonly clase?: Clase; readonly instructores: readonly Opcion[] }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarClase, {});
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {
    name: clase?.name ?? '',
    description: clase?.description ?? '',
    category: clase?.category ?? 'fit',
    level: clase?.level ?? 'todos',
    kind: clase?.kind ?? 'regular',
    accessMode: clase?.accessMode ?? 'planes',
    durationMinutes: clase?.durationMinutes?.toString() ?? '60',
    capacity: clase?.capacity?.toString() ?? '',
    trainerId: clase?.trainerId ?? '',
    isPublic: clase?.isPublic ? 'on' : '',
  };

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {clase && <input type="hidden" name="classId" value={clase.id} />}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Campo id="clase-nombre" etiqueta="Nombre de la clase" error={errores.name} obligatorio ayuda="«Box», «Karate infantil», «Masterclass de salsa».">
          <input name="name" defaultValue={valores.name} required minLength={2} maxLength={80} autoComplete="off" className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="clase-tipo" etiqueta="Tipo" error={errores.kind} obligatorio>
          <select name="kind" defaultValue={valores.kind} className={CLASE_DE_CONTROL}>
            {(Object.keys(NOMBRE_DE_TIPO_DE_CLASE) as TipoDeClase[]).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_DE_TIPO_DE_CLASE[t]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="clase-categoria" etiqueta="Categoría" error={errores.category} obligatorio>
          <select name="category" defaultValue={valores.category} className={CLASE_DE_CONTROL}>
            {(Object.keys(NOMBRE_DE_CATEGORIA) as CategoriaDeClase[]).map((c) => (
              <option key={c} value={c}>
                {NOMBRE_DE_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="clase-nivel" etiqueta="Nivel" error={errores.level} obligatorio>
          <select name="level" defaultValue={valores.level} className={CLASE_DE_CONTROL}>
            {(Object.keys(NOMBRE_DE_NIVEL_DE_CLASE) as NivelDeClase[]).map((n) => (
              <option key={n} value={n}>
                {NOMBRE_DE_NIVEL_DE_CLASE[n]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="clase-capacidad" etiqueta="Capacidad" error={errores.capacity} obligatorio ayuda="Personas por sesión.">
          <input name="capacity" inputMode="numeric" required defaultValue={valores.capacity} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="clase-duracion" etiqueta="Duración (min)" error={errores.durationMinutes} obligatorio>
          <input name="durationMinutes" inputMode="numeric" required defaultValue={valores.durationMinutes} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
        <SelectorDeInstructor id="clase-instructor" instructores={instructores} valor={valores.trainerId ?? ''} error={errores.trainerId} ayuda="El habitual; cada horario puede tener otro." />
      </div>

      <Campo id="clase-acceso" etiqueta="Quién puede entrar" error={errores.accessMode} obligatorio ayuda="Con «solo los planes que la incluyen», márcalos después en la ficha de la clase.">
        <select name="accessMode" defaultValue={valores.accessMode} className={CLASE_DE_CONTROL}>
          {(Object.keys(NOMBRE_DE_MODO_DE_ACCESO) as ModoDeAcceso[]).map((m) => (
            <option key={m} value={m}>
              {NOMBRE_DE_MODO_DE_ACCESO[m]}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id="clase-descripcion" etiqueta="Descripción" error={errores.description} ayuda="La ve el socio y, si la publicas, la página pública.">
        <textarea name="description" defaultValue={valores.description} maxLength={600} rows={3} className={cn(CLASE_DE_CONTROL, 'h-auto min-h-24 resize-y py-3')} />
      </Campo>

      <label className="flex min-h-11 items-center gap-3 text-[0.9rem] text-ink">
        <input type="checkbox" name="isPublic" defaultChecked={valores.isPublic === 'on'} className={CASILLA} />
        Publicar en la página «Clases» del sitio
      </label>

      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto={clase ? 'Guardar clase' : 'Crear clase'} />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ planes

export function PlanesDeClaseForm({
  slug,
  clase,
  planes,
}: {
  readonly slug: string;
  readonly clase: Pick<Clase, 'id' | 'planIds' | 'accessMode'>;
  readonly planes: readonly Opcion[];
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarPlanesDeClase, {});

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="classId" value={clase.id} />
      {clase.accessMode !== 'planes' && (
        <p className="rounded-[var(--t-radius-md)] border border-line px-4 py-3 text-[0.84rem] text-muted">
          Esta clase admite «{NOMBRE_DE_MODO_DE_ACCESO[clase.accessMode].toLowerCase()}»: los planes marcados se guardan, pero hoy no restringen la entrada.
        </p>
      )}
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Planes que incluyen la clase</legend>
        {planes.map((p) => (
          <label key={p.id} className="flex min-h-11 items-center gap-3 rounded-[var(--t-radius-md)] border border-line px-3.5 text-[0.88rem] text-ink transition-colors hover:border-action">
            <input type="checkbox" name="planId" value={p.id} defaultChecked={clase.planIds.includes(p.id)} className={CASILLA} />
            {p.nombre}
          </label>
        ))}
      </fieldset>
      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto="Guardar planes" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ horario

export function HorarioForm({
  slug,
  clase,
  sedes,
  instructores,
}: {
  readonly slug: string;
  readonly clase: Pick<Clase, 'id' | 'durationMinutes' | 'capacity' | 'trainerId'>;
  readonly sedes: readonly Opcion[];
  readonly instructores: readonly Opcion[];
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(agregarHorario, {});
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="classId" value={clase.id} />

      <fieldset>
        <legend className="mb-2 text-[0.84rem] font-medium text-ink">
          Días <span className="text-structural">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {DIAS_ISO.map((d) => (
            <label key={d} className="flex min-h-11 items-center gap-2 rounded-[var(--t-radius-md)] border border-line px-3 text-[0.86rem] text-ink has-[:checked]:border-action has-[:checked]:text-action">
              <input type="checkbox" name="weekday" value={d} className={CASILLA} />
              {NOMBRE_DE_DIA_ISO[d]}
            </label>
          ))}
        </div>
        {errores.weekdays && <p className="mt-1.5 text-[0.8rem] text-structural">{errores.weekdays}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="horario-sede" etiqueta="Sede" error={errores.branchId} obligatorio>
          <select name="branchId" required defaultValue={sedes.length === 1 ? sedes[0]?.id : ''} className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Elige la sede
            </option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="horario-hora" etiqueta="Hora de inicio" error={errores.startTime} obligatorio>
          <input type="time" name="startTime" required step={300} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectorDeInstructor id="horario-instructor" instructores={instructores} valor={clase.trainerId ?? ''} error={errores.trainerId} ayuda="Tiene que trabajar en esa sede." />
        <Campo id="horario-duracion" etiqueta="Duración (min)" error={errores.durationMinutes} ayuda={`Vacío: ${clase.durationMinutes} min.`}>
          <input name="durationMinutes" inputMode="numeric" maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="horario-capacidad" etiqueta="Capacidad" error={errores.capacity} ayuda={`Vacío: ${clase.capacity} personas.`}>
          <input name="capacity" inputMode="numeric" maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Campo id="horario-fin" etiqueta="Termina el (opcional)" error={errores.endsOn} ayuda="Para un ciclo con fecha de cierre.">
        <input type="date" name="endsOn" className={CLASE_DE_CONTROL} />
      </Campo>

      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto="Agregar horario" icono="plus" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ sesión

export function SesionForm({
  slug,
  hoy,
  clases,
  sedes,
  instructores,
  sesion,
  classIdInicial,
}: {
  readonly slug: string;
  readonly hoy: string;
  readonly clases: readonly Pick<Clase, 'id' | 'name' | 'kind'>[];
  readonly sedes: readonly Opcion[];
  readonly instructores: readonly Opcion[];
  readonly sesion?: SesionDeClase;
  readonly classIdInicial?: string;
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(guardarSesion, {});
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {
    classId: sesion?.classId ?? classIdInicial ?? '',
    branchId: sesion?.branchId ?? (sedes.length === 1 ? sedes[0]?.id ?? '' : ''),
    trainerId: sesion?.trainerId ?? '',
    sessionDate: sesion?.sessionDate ?? hoy,
    startTime: sesion?.startTime ?? '',
    durationMinutes: sesion?.durationMinutes?.toString() ?? '',
    capacity: sesion?.capacity?.toString() ?? '',
    title: sesion?.title ?? '',
    notes: sesion?.notes ?? '',
  };

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tenantSlug" value={slug} />
      {sesion && <input type="hidden" name="sessionId" value={sesion.id} />}

      {sesion ? (
        <input type="hidden" name="classId" value={sesion.classId} />
      ) : (
        <Campo id="sesion-clase" etiqueta="Clase o evento" error={errores.classId} obligatorio>
          <select name="classId" required defaultValue={valores.classId} className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Elige la clase
            </option>
            {clases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.kind === 'evento' ? ' (evento)' : ''}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="sesion-fecha" etiqueta="Fecha" error={errores.sessionDate} obligatorio>
          <input type="date" name="sessionDate" required min={hoy} max={sumarDias(hoy, 365)} defaultValue={valores.sessionDate} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="sesion-hora" etiqueta="Hora" error={errores.startTime} obligatorio>
          <input type="time" name="startTime" required step={300} defaultValue={valores.startTime} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="sesion-sede" etiqueta="Sede" error={errores.branchId} obligatorio>
          <select name="branchId" required defaultValue={valores.branchId} className={CLASE_DE_CONTROL}>
            <option value="" disabled>
              Elige la sede
            </option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectorDeInstructor id="sesion-instructor" instructores={instructores} valor={valores.trainerId ?? ''} error={errores.trainerId} />
        <Campo id="sesion-duracion" etiqueta="Duración (min)" error={errores.durationMinutes} ayuda={sesion ? undefined : 'Vacío: la de la clase.'}>
          <input name="durationMinutes" inputMode="numeric" defaultValue={valores.durationMinutes} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="sesion-capacidad" etiqueta="Capacidad" error={errores.capacity} ayuda={sesion ? 'No menos que los ya registrados.' : 'Vacío: la de la clase.'}>
          <input name="capacity" inputMode="numeric" defaultValue={valores.capacity} maxLength={3} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>

      <Campo id="sesion-titulo" etiqueta="Título (opcional)" error={errores.title} ayuda="Para un evento: «Masterclass con invitado».">
        <input name="title" defaultValue={valores.title} maxLength={80} className={CLASE_DE_CONTROL} />
      </Campo>
      <Campo id="sesion-notas" etiqueta="Notas para los socios" error={errores.notes}>
        <textarea name="notes" defaultValue={valores.notes} maxLength={400} rows={2} className={cn(CLASE_DE_CONTROL, 'h-auto min-h-20 resize-y py-3')} />
      </Campo>

      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto={sesion ? 'Guardar sesión' : 'Programar sesión'} icono={sesion ? 'check' : 'plus'} />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ generar

export function GenerarSesionesForm({
  slug,
  hoy,
  horarios,
  classId,
}: {
  readonly slug: string;
  readonly hoy: string;
  readonly horarios: readonly Pick<HorarioDeClase, 'weekday' | 'startsOn' | 'endsOn' | 'isActive' | 'classId'>[];
  readonly classId?: string;
}) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(generarSesiones, {});
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(sumarDias(hoy, 27));
  const errores = estado.errores ?? {};
  const aplicables = horarios.filter((h) => !classId || h.classId === classId);
  // Vista previa con la misma regla que la base: cuántas sesiones tocan (sin
  // descontar las que ya existen, que la base informa al terminar).
  const previstas = aplicables.reduce((suma, h) => suma + fechasDelHorario(h, desde, hasta, hoy).length, 0);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      {classId && <input type="hidden" name="classId" value={classId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="generar-desde" etiqueta="Desde" error={errores.desde} obligatorio>
          <input type="date" name="desde" required min={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} className={CLASE_DE_CONTROL} />
        </Campo>
        <Campo id="generar-hasta" etiqueta="Hasta" error={errores.hasta} obligatorio ayuda="Hasta 62 días desde hoy.">
          <input type="date" name="hasta" required min={hoy} max={sumarDias(hoy, 62)} value={hasta} onChange={(e) => setHasta(e.target.value)} className={CLASE_DE_CONTROL} />
        </Campo>
      </div>
      <p className="text-[0.84rem] text-muted">
        {aplicables.length === 0
          ? 'No hay horarios activos: agrega uno antes de generar.'
          : `${aplicables.length} horario${aplicables.length === 1 ? '' : 's'} activo${aplicables.length === 1 ? '' : 's'} · hasta ${previstas} sesiones en el rango. Las que ya existen o se cancelaron no se duplican; si el instructor está ocupado o ausente, esa fecha se omite y se avisa.`}
      </p>
      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto="Generar sesiones" icono="calendar" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ cancelar

export function CancelarSesionForm({ slug, sessionId }: { readonly slug: string; readonly sessionId: string }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(cancelarSesion, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <Campo id="cancelar-motivo" etiqueta="Motivo" error={estado.errores?.motivo} obligatorio ayuda="Lo verán los socios en su calendario.">
        <input name="motivo" required minLength={4} maxLength={200} placeholder="Feriado, instructor enfermo…" className={CLASE_DE_CONTROL} />
      </Campo>
      <Aviso estado={estado} />
      <div className="flex justify-end">
        <Enviar texto="Cancelar sesión" icono="close" compacto />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ asistencia

function RegistrarCandidato({ slug, sessionId, candidato, metodo }: { readonly slug: string; readonly sessionId: string; readonly candidato: CandidatoDeClase; readonly metodo: 'manual' | 'qr' }) {
  const [estado, accion] = useActionState<EstadoDeFormulario, FormData>(registrarAsistenciaAClase, {});
  const hecho = candidato.yaRegistrado || Boolean(estado.exito);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--t-radius-md)] border border-line px-4 py-3">
      <span className="flex min-w-0 flex-col">
        <span className="font-medium text-ink">{candidato.fullName}</span>
        <span className="text-[0.78rem] text-muted">
          {[candidato.customerCode, candidato.planName ?? 'sin plan vigente'].filter(Boolean).join(' · ')}
        </span>
      </span>
      {hecho ? (
        <span className="inline-flex items-center gap-1.5 rounded-[var(--t-radius-sm)] bg-action/15 px-3 py-1.5 text-[0.82rem] font-semibold text-action">
          <Icon name="check" size={15} /> {estado.exito ?? 'Ya registrado'}
        </span>
      ) : candidato.habilitado ? (
        <form action={accion} className="flex flex-col items-end gap-1">
          <input type="hidden" name="tenantSlug" value={slug} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="customerId" value={candidato.customerId} />
          <input type="hidden" name="metodo" value={metodo} />
          <Enviar texto="Registrar" icono="plus" compacto />
          {estado.mensaje && <span className="text-[0.78rem] text-structural">{estado.mensaje}</span>}
        </form>
      ) : (
        <span className="text-[0.8rem] text-structural">{NOMBRE_DE_MOTIVO_DE_ACCESO[candidato.motivo]}</span>
      )}
    </li>
  );
}

export function TomarAsistenciaDeClase({ slug, sessionId, cuposLibres }: { readonly slug: string; readonly sessionId: string; readonly cuposLibres: number }) {
  const [estado, buscar] = useActionState<EstadoDeBusqueda, FormData>(buscarSociosParaSesion, {});
  // Un texto de 24 hexadecimales es lo que escribe un lector de QR USB: se
  // registra como método «qr» para que el reporte distinga cómo se tomó.
  const metodo = /^[0-9A-F]{24}$/i.test(estado.buscado ?? '') ? 'qr' : 'manual';

  return (
    <div className="flex flex-col gap-4">
      <form action={buscar} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tenantSlug" value={slug} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <Campo id="asistencia-buscar" etiqueta="Buscar socio" ayuda="Nombre, código (MF-004) o escanea su QR con el lector. Vacío: los que su plan admite." className="min-w-0 flex-1">
          <input type="search" name="buscar" maxLength={60} autoComplete="off" className={CLASE_DE_CONTROL} />
        </Campo>
        <Enviar texto="Buscar" icono="search" compacto />
      </form>

      <p className="text-[0.8rem] text-muted">{cuposLibres > 0 ? `${cuposLibres} cupos libres.` : 'Sesión llena: no se puede registrar a nadie más.'}</p>

      {estado.mensaje && <Aviso estado={{ mensaje: estado.mensaje }} />}
      {estado.candidatos && estado.candidatos.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Socios encontrados">
          {estado.candidatos.map((c) => (
            <RegistrarCandidato key={`${c.customerId}-${estado.buscado ?? ''}`} slug={slug} sessionId={sessionId} candidato={c} metodo={metodo} />
          ))}
        </ul>
      )}
    </div>
  );
}
