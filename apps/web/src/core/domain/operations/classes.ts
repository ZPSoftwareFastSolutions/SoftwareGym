/**
 * CAPA: Domain / Operations
 *
 * Clases grupales, horarios, sesiones y asistencia a clase (V3.3).
 *
 *   CLASE (Box, Karate, Baile fitness…) → HORARIO semanal (lunes 19:00 en una
 *   sede) → SESIÓN concreta (lunes 14, 19:00) → ASISTENCIA de socios
 *
 * Una clase dice QUIÉN puede entrar: cualquier membresía vigente, solo los
 * planes que la incluyen, o abierta (eventos). Aquí vive la forma de los datos
 * (qué es un horario válido), las reglas que la pantalla necesita ANTICIPAR
 * —qué fechas genera un horario, si el plan de un socio incluye una clase, si
 * dos sesiones se cruzan— y la lectura de la ocupación. La base aplica las
 * mismas reglas por su cuenta: esto explica, RLS y los disparadores deciden.
 *
 * Todo es puro y sin I/O.
 */

// ------------------------------------------------------------------ catálogos

export type CategoriaDeClase =
  | 'fit'
  | 'baile'
  | 'combate'
  | 'artes_marciales'
  | 'mente_cuerpo'
  | 'ciclismo'
  | 'fuerza'
  | 'acuatica'
  | 'otro';

export const NOMBRE_DE_CATEGORIA: Readonly<Record<CategoriaDeClase, string>> = {
  fit: 'Fit y funcional',
  baile: 'Baile',
  combate: 'Deportes de combate',
  artes_marciales: 'Artes marciales',
  mente_cuerpo: 'Mente y cuerpo',
  ciclismo: 'Ciclismo indoor',
  fuerza: 'Fuerza',
  acuatica: 'Acuática',
  otro: 'Otra',
};

export type NivelDeClase = 'principiante' | 'intermedio' | 'avanzado' | 'todos';

export const NOMBRE_DE_NIVEL_DE_CLASE: Readonly<Record<NivelDeClase, string>> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  todos: 'Todos los niveles',
};

/** `regular` se repite por horario; `evento` es una ocasión puntual (masterclass, torneo). */
export type TipoDeClase = 'regular' | 'evento';

export const NOMBRE_DE_TIPO_DE_CLASE: Readonly<Record<TipoDeClase, string>> = {
  regular: 'Clase regular',
  evento: 'Evento',
};

export type ModoDeAcceso = 'membresia' | 'planes' | 'abierta';

export const NOMBRE_DE_MODO_DE_ACCESO: Readonly<Record<ModoDeAcceso, string>> = {
  membresia: 'Cualquier membresía vigente',
  planes: 'Solo los planes que la incluyen',
  abierta: 'Abierta (sin membresía)',
};

export type EstadoDeSesion = 'programada' | 'en_curso' | 'realizada' | 'cancelada';

export const NOMBRE_DE_ESTADO_DE_SESION: Readonly<Record<EstadoDeSesion, string>> = {
  programada: 'Programada',
  en_curso: 'En curso',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
};

/** Motivos con los que la base acepta o rechaza a un socio en una clase. */
export type MotivoDeAcceso = 'ok' | 'plan_no_incluye_clase' | 'sin_membresia_vigente' | 'clase_no_disponible';

export const NOMBRE_DE_MOTIVO_DE_ACCESO: Readonly<Record<MotivoDeAcceso, string>> = {
  ok: 'Puede entrar',
  plan_no_incluye_clase: 'Su plan no incluye esta clase',
  sin_membresia_vigente: 'Sin membresía vigente ese día',
  clase_no_disponible: 'Clase no disponible',
};

function en<T extends string>(mapa: Readonly<Record<T, string>>, valor: unknown): valor is T {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(mapa, valor);
}

export const esCategoriaDeClase = (v: unknown): v is CategoriaDeClase => en(NOMBRE_DE_CATEGORIA, v);
export const esNivelDeClase = (v: unknown): v is NivelDeClase => en(NOMBRE_DE_NIVEL_DE_CLASE, v);
export const esTipoDeClase = (v: unknown): v is TipoDeClase => en(NOMBRE_DE_TIPO_DE_CLASE, v);
export const esModoDeAcceso = (v: unknown): v is ModoDeAcceso => en(NOMBRE_DE_MODO_DE_ACCESO, v);
export const esEstadoDeSesion = (v: unknown): v is EstadoDeSesion => en(NOMBRE_DE_ESTADO_DE_SESION, v);
export const esMotivoDeAcceso = (v: unknown): v is MotivoDeAcceso => en(NOMBRE_DE_MOTIVO_DE_ACCESO, v);

/** Día ISO: 1 = lunes … 7 = domingo, el mismo que usa la base (`isodow`). */
export type DiaIso = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DIAS_ISO: readonly DiaIso[] = [1, 2, 3, 4, 5, 6, 7];

export const NOMBRE_DE_DIA_ISO: Readonly<Record<DiaIso, string>> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export const DIA_ISO_CORTO: Readonly<Record<DiaIso, string>> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };

export function esDiaIso(valor: unknown): valor is DiaIso {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 7;
}

// ------------------------------------------------------------------ entidades

export interface Clase {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: CategoriaDeClase;
  readonly level: NivelDeClase;
  readonly kind: TipoDeClase;
  readonly accessMode: ModoDeAcceso;
  readonly durationMinutes: number;
  readonly capacity: number;
  /** Lugares que la reserva no puede tomar: quedan para quien llega al mostrador (V3.4). */
  readonly walkinSpots: number;
  readonly trainerId: string | null;
  readonly trainerName: string | null;
  readonly isPublic: boolean;
  readonly isActive: boolean;
  readonly planIds: readonly string[];
  readonly planNames: readonly string[];
  readonly horarios: number;
  readonly proximas7d: number;
}

export interface HorarioDeClase {
  readonly id: string;
  readonly classId: string;
  readonly className: string;
  readonly category: CategoriaDeClase;
  readonly branchId: string;
  readonly branchName: string;
  readonly trainerId: string | null;
  readonly trainerName: string | null;
  readonly weekday: DiaIso;
  /** `HH:MM`. */
  readonly startTime: string;
  readonly durationMinutes: number;
  readonly capacity: number;
  /** Lo que el horario cambia respecto de la clase; `null` = hereda. */
  readonly durationOverride: number | null;
  readonly capacityOverride: number | null;
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly isActive: boolean;
}

export interface SesionDeClase {
  readonly id: string;
  readonly classId: string;
  readonly scheduleId: string | null;
  readonly className: string;
  readonly category: CategoriaDeClase;
  readonly kind: TipoDeClase;
  readonly accessMode: ModoDeAcceso;
  readonly branchId: string;
  readonly branchName: string;
  readonly trainerId: string | null;
  readonly trainerName: string | null;
  /** `YYYY-MM-DD` en la fecha local del gimnasio. */
  readonly sessionDate: string;
  /** `HH:MM`. */
  readonly startTime: string;
  readonly durationMinutes: number;
  readonly capacity: number;
  readonly asistentes: number;
  /** V3.4: reservas que todavía no llegaron, lista de espera y lugares tomados (asistentes + reservas). */
  readonly reservadas: number;
  readonly enEspera: number;
  readonly ocupados: number;
  readonly walkinSpots: number;
  /** La reserva de quien mira (socio), si tiene una viva en esta sesión. */
  readonly miReservaId: string | null;
  readonly miReservaEstado: string | null;
  readonly miPosicion: number | null;
  readonly title: string | null;
  readonly notes: string | null;
  readonly status: 'programada' | 'cancelada';
  readonly cancelReason: string | null;
  /** Calculado por la base con la hora del gimnasio. */
  readonly estado: EstadoDeSesion;
}

export interface AsistenteDeClase {
  readonly attendanceId: string;
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly fullName: string;
  readonly planName: string | null;
  readonly method: 'manual' | 'qr';
  readonly checkedInAt: string;
  readonly markedByName: string | null;
}

export interface CandidatoDeClase {
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly fullName: string;
  readonly planName: string | null;
  readonly habilitado: boolean;
  readonly motivo: MotivoDeAcceso;
  readonly yaRegistrado: boolean;
}

/** Una clase a la que fue un socio. */
export interface ClaseAsistida {
  readonly id: string;
  readonly sessionId: string;
  readonly className: string;
  readonly category: CategoriaDeClase;
  readonly branchName: string;
  readonly sessionDate: string;
  readonly startTime: string;
}

export interface EstadisticaDeClase {
  readonly classId: string;
  readonly name: string;
  readonly category: CategoriaDeClase;
  readonly kind: TipoDeClase;
  readonly accessMode: ModoDeAcceso;
  readonly isActive: boolean;
  readonly capacity: number;
  readonly sesiones30d: number;
  readonly canceladas30d: number;
  readonly asistencias30d: number;
  readonly socios30d: number;
  /** Promedio de asistentes/capacidad de las sesiones realizadas (0-100). `null` sin sesiones. */
  readonly ocupacion30d: number | null;
  readonly maximo30d: number | null;
}

export interface FranjaDeClases {
  readonly dia: DiaIso;
  readonly hora: number;
  readonly sesiones: number;
  readonly asistencias: number;
  readonly capacidad: number;
}

export interface ResumenDeClases {
  readonly hoy: string;
  readonly clases: number;
  readonly horarios: number;
  readonly sesionesHoy: number;
  readonly sesiones7d: number;
  readonly asistencias30d: number;
  readonly socios30d: number;
  readonly canceladas30d: number;
}

/** Lo que la vitrina pública enseña de una clase. */
export interface ClasePublica {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: CategoriaDeClase;
  readonly level: NivelDeClase;
  readonly kind: TipoDeClase;
  readonly accessMode: ModoDeAcceso;
  readonly durationMinutes: number;
  /** Planes que la incluyen (`code` une con el paquete del archivo del gimnasio, como en los cobros). */
  readonly planes: readonly { readonly id: string; readonly name: string; readonly code: string | null }[];
  readonly horarios: readonly { readonly weekday: DiaIso; readonly startTime: string; readonly branchId: string; readonly durationMinutes: number }[];
}

export type Validacion<T> =
  | { readonly ok: true; readonly datos: T }
  | { readonly ok: false; readonly errores: Readonly<Record<string, string>> };

// ------------------------------------------------------------------ tiempo

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esHora(valor: string): boolean {
  return PATRON_HORA.test(valor);
}

/** Fecha ISO real (no acepta 2026-02-30). */
export function esFecha(valor: string): boolean {
  if (!PATRON_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function minutosDelDia(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

/** `19:00` + 90 min → `20:30`. Pasada la medianoche, da la vuelta (`23:30` + 60 → `00:30`). */
export function horaDeFin(inicio: string, duracion: number): string {
  const total = (minutosDelDia(inicio) + duracion) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Día ISO de una fecha `YYYY-MM-DD`, sin depender de la zona del servidor. */
export function diaIsoDe(fecha: string): DiaIso {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return (dia === 0 ? 7 : dia) as DiaIso;
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntreFechas(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000);
}

/** Los siete días a partir de `hoy`, para la agenda de la semana. */
export function proximosSieteDias(hoy: string): readonly string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
}

/** Máximo de días que la base genera de una vez (el mismo tope que `generar_sesiones_de_clases`). */
export const MAXIMO_DIAS_DE_GENERACION = 62;

/**
 * Las fechas en que un horario tiene sesión dentro de un rango. Replica lo que
 * hace la base al generar, para poder decir «se crearán 12 sesiones» ANTES de
 * pulsar el botón. Nunca antes de hoy.
 */
export function fechasDelHorario(
  horario: Pick<HorarioDeClase, 'weekday' | 'startsOn' | 'endsOn' | 'isActive'>,
  desde: string,
  hasta: string,
  hoy: string,
): readonly string[] {
  if (!horario.isActive) return [];
  const inicio = [hoy, horario.startsOn].reduce((mayor, fecha) => (fecha > mayor ? fecha : mayor), desde);
  const fin = horario.endsOn && horario.endsOn < hasta ? horario.endsOn : hasta;
  if (fin < inicio) return [];
  const fechas: string[] = [];
  // Primer día de la semana pedida a partir del inicio; luego de siete en siete.
  let actual = sumarDias(inicio, (horario.weekday - diaIsoDe(inicio) + 7) % 7);
  while (actual <= fin) {
    fechas.push(actual);
    actual = sumarDias(actual, 7);
  }
  return fechas;
}

/** ¿Se pisan dos franjas del mismo día? El borde no cuenta: 18:00-19:00 y 19:00-20:00 no se cruzan. */
export function seSolapan(
  a: { readonly startTime: string; readonly durationMinutes: number },
  b: { readonly startTime: string; readonly durationMinutes: number },
): boolean {
  const inicioA = minutosDelDia(a.startTime);
  const inicioB = minutosDelDia(b.startTime);
  return inicioA < inicioB + b.durationMinutes && inicioB < inicioA + a.durationMinutes;
}

/**
 * Estado de una sesión a una hora local dada (`YYYY-MM-DDTHH:MM`). La base ya
 * lo calcula en la vista; esto sirve para lo que se pinta con datos que no
 * vienen de ella (la vitrina, las pruebas) y para no contradecirla.
 */
export function estadoDeSesion(
  sesion: Pick<SesionDeClase, 'status' | 'sessionDate' | 'startTime' | 'durationMinutes'>,
  ahoraLocal: string,
): EstadoDeSesion {
  if (sesion.status === 'cancelada') return 'cancelada';
  const inicio = `${sesion.sessionDate}T${sesion.startTime}`;
  if (ahoraLocal < inicio) return 'programada';
  const finMinutos = minutosDelDia(sesion.startTime) + sesion.durationMinutes;
  const diaDelFin = finMinutos >= 24 * 60 ? sumarDias(sesion.sessionDate, 1) : sesion.sessionDate;
  const fin = `${diaDelFin}T${horaDeFin(sesion.startTime, sesion.durationMinutes)}`;
  return ahoraLocal < fin ? 'en_curso' : 'realizada';
}

// ------------------------------------------------------------------ acceso por plan

/**
 * Si una clase admite a un socio. Es la misma regla que aplica la base en
 * `app.acceso_a_clase`, y la pantalla la usa para decirle al socio qué clases
 * le incluye su plan. `planVigenteId` = plan de la membresía que cubre el día.
 */
export function accesoAClase(
  clase: Pick<Clase, 'accessMode' | 'planIds'>,
  planVigenteId: string | null,
): MotivoDeAcceso {
  if (clase.accessMode === 'abierta') return 'ok';
  if (!planVigenteId) return 'sin_membresia_vigente';
  if (clase.accessMode === 'membresia') return 'ok';
  return clase.planIds.includes(planVigenteId) ? 'ok' : 'plan_no_incluye_clase';
}

/** Las clases activas que incluye un plan (para la vitrina de planes y el panel del socio). */
export function clasesDelPlan<T extends Pick<Clase, 'accessMode' | 'planIds' | 'isActive'>>(clases: readonly T[], planId: string | null): readonly T[] {
  return clases.filter((c) => c.isActive && accesoAClase(c, planId) === 'ok');
}

/** Una clase «solo planes» sin ningún plan marcado no admite a nadie: gerencia tiene que saberlo. */
export function claseSinAcceso(clase: Pick<Clase, 'accessMode' | 'planIds' | 'isActive'>): boolean {
  return clase.isActive && clase.accessMode === 'planes' && clase.planIds.length === 0;
}

// ------------------------------------------------------------------ ocupación

export type NivelDeOcupacion = 'llena' | 'alta' | 'media' | 'baja' | 'vacia';

export function porcentajeDeOcupacion(asistentes: number, capacidad: number): number {
  if (capacidad <= 0) return 0;
  return Math.min(100, Math.round((asistentes / capacidad) * 100));
}

/** Umbrales de lectura: una clase al 80 % ya se siente llena en sala. */
export function nivelDeOcupacion(asistentes: number, capacidad: number): NivelDeOcupacion {
  if (asistentes <= 0) return 'vacia';
  if (asistentes >= capacidad) return 'llena';
  const p = porcentajeDeOcupacion(asistentes, capacidad);
  if (p >= 80) return 'alta';
  if (p >= 40) return 'media';
  return 'baja';
}

/** Lugares libres: la capacidad menos asistentes y reservas que todavía no llegaron. */
export function cuposLibres(sesion: Pick<SesionDeClase, 'capacity' | 'ocupados'>): number {
  return Math.max(0, sesion.capacity - sesion.ocupados);
}

/** Sesiones agrupadas por fecha y ordenadas por hora, para la agenda. */
export function agendaPorDia<T extends Pick<SesionDeClase, 'sessionDate' | 'startTime'>>(
  sesiones: readonly T[],
  dias: readonly string[],
): readonly { readonly fecha: string; readonly sesiones: readonly T[] }[] {
  return dias.map((fecha) => ({
    fecha,
    sesiones: sesiones.filter((s) => s.sessionDate === fecha).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

// ------------------------------------------------------------------ validación

function limpio(valor: string): string | null {
  const recortado = valor.trim().replace(/\s+/g, ' ');
  return recortado === '' ? null : recortado;
}

function entero(valor: string): number | null {
  const texto = valor.trim();
  if (texto === '' || !/^[0-9]{1,4}$/.test(texto)) return null;
  return Number(texto);
}

export interface FormularioDeClase {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly level: string;
  readonly kind: string;
  readonly accessMode: string;
  readonly durationMinutes: string;
  readonly capacity: string;
  /** Opcional en el formulario: vacío = 0. */
  readonly walkinSpots?: string;
  readonly trainerId: string;
  readonly isPublic: boolean;
}

export interface DatosDeClase {
  readonly name: string;
  readonly description: string | null;
  readonly category: CategoriaDeClase;
  readonly level: NivelDeClase;
  readonly kind: TipoDeClase;
  readonly accessMode: ModoDeAcceso;
  readonly durationMinutes: number;
  readonly capacity: number;
  readonly walkinSpots: number;
  readonly trainerId: string | null;
  readonly isPublic: boolean;
}

export function validarClase(formulario: FormularioDeClase): Validacion<DatosDeClase> {
  const errores: Record<string, string> = {};
  const name = formulario.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) errores.name = 'El nombre debe tener entre 2 y 80 caracteres.';

  const description = limpio(formulario.description);
  if (description && description.length > 600) errores.description = 'Hasta 600 caracteres.';

  const { category, level, kind, accessMode } = formulario;
  if (!esCategoriaDeClase(category)) errores.category = 'Elige la categoría.';
  if (!esNivelDeClase(level)) errores.level = 'Elige el nivel.';
  if (!esTipoDeClase(kind)) errores.kind = 'Elige si es clase o evento.';
  if (!esModoDeAcceso(accessMode)) errores.accessMode = 'Elige quién puede entrar.';

  const durationMinutes = entero(formulario.durationMinutes);
  if (durationMinutes === null || durationMinutes < 15 || durationMinutes > 240) errores.durationMinutes = 'Entre 15 y 240 minutos.';

  const capacity = entero(formulario.capacity);
  if (capacity === null || capacity < 1 || capacity > 200) errores.capacity = 'La capacidad es obligatoria: entre 1 y 200 personas.';

  const lugaresTexto = (formulario.walkinSpots ?? '').trim();
  const walkinSpots = lugaresTexto === '' ? 0 : entero(lugaresTexto);
  if (walkinSpots === null || (capacity !== null && walkinSpots >= capacity)) {
    errores.walkinSpots = 'Menos lugares que la capacidad (0 = todo se puede reservar).';
  }

  const trainerCrudo = formulario.trainerId.trim();
  if (trainerCrudo !== '' && !PATRON_UUID.test(trainerCrudo)) errores.trainerId = 'Elige un instructor de la lista.';

  if (
    Object.keys(errores).length > 0 ||
    !esCategoriaDeClase(category) ||
    !esNivelDeClase(level) ||
    !esTipoDeClase(kind) ||
    !esModoDeAcceso(accessMode) ||
    durationMinutes === null ||
    capacity === null ||
    walkinSpots === null
  ) {
    return { ok: false, errores };
  }
  return {
    ok: true,
    datos: {
      name,
      description,
      category,
      level,
      kind,
      accessMode,
      durationMinutes,
      capacity,
      walkinSpots,
      trainerId: trainerCrudo === '' ? null : trainerCrudo,
      isPublic: formulario.isPublic,
    },
  };
}

export interface FormularioDeHorario {
  readonly branchId: string;
  readonly trainerId: string;
  readonly weekdays: readonly string[];
  readonly startTime: string;
  readonly durationMinutes: string;
  readonly capacity: string;
  readonly endsOn: string;
}

export interface DatosDeHorario {
  readonly branchId: string;
  readonly trainerId: string | null;
  /** Uno o varios días: un horario «lunes, miércoles y viernes» son tres filas en la base. */
  readonly weekdays: readonly DiaIso[];
  readonly startTime: string;
  readonly durationMinutes: number | null;
  readonly capacity: number | null;
  readonly endsOn: string | null;
}

export function validarHorario(formulario: FormularioDeHorario, hoy: string): Validacion<DatosDeHorario> {
  const errores: Record<string, string> = {};

  const branchId = formulario.branchId.trim();
  if (!PATRON_UUID.test(branchId)) errores.branchId = 'Elige la sede.';

  const trainerCrudo = formulario.trainerId.trim();
  if (trainerCrudo !== '' && !PATRON_UUID.test(trainerCrudo)) errores.trainerId = 'Elige un instructor de la lista.';

  const weekdays = [...new Set(formulario.weekdays.map((d) => Number(d)))].filter(esDiaIso).sort((a, b) => a - b);
  if (weekdays.length === 0 || weekdays.length !== new Set(formulario.weekdays).size) errores.weekdays = 'Marca al menos un día.';

  const startTime = formulario.startTime.trim().slice(0, 5);
  if (!esHora(startTime)) errores.startTime = 'Hora de inicio en formato HH:MM.';

  const duracionTexto = formulario.durationMinutes.trim();
  const durationMinutes = duracionTexto === '' ? null : entero(duracionTexto);
  if (duracionTexto !== '' && (durationMinutes === null || durationMinutes < 15 || durationMinutes > 240)) {
    errores.durationMinutes = 'Entre 15 y 240 minutos, o vacío para usar la de la clase.';
  }

  const capacidadTexto = formulario.capacity.trim();
  const capacity = capacidadTexto === '' ? null : entero(capacidadTexto);
  if (capacidadTexto !== '' && (capacity === null || capacity < 1 || capacity > 200)) {
    errores.capacity = 'Entre 1 y 200, o vacío para usar la de la clase.';
  }

  const endsOnTexto = formulario.endsOn.trim();
  if (endsOnTexto !== '' && (!esFecha(endsOnTexto) || endsOnTexto < hoy)) errores.endsOn = 'Una fecha de hoy en adelante, o vacío si no termina.';

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    datos: {
      branchId,
      trainerId: trainerCrudo === '' ? null : trainerCrudo,
      weekdays,
      startTime,
      durationMinutes,
      capacity,
      endsOn: endsOnTexto === '' ? null : endsOnTexto,
    },
  };
}

export interface FormularioDeSesion {
  readonly classId: string;
  readonly branchId: string;
  readonly trainerId: string;
  readonly sessionDate: string;
  readonly startTime: string;
  readonly durationMinutes: string;
  readonly capacity: string;
  readonly title: string;
  readonly notes: string;
}

export interface DatosDeSesion {
  readonly classId: string;
  readonly branchId: string;
  readonly trainerId: string | null;
  readonly sessionDate: string;
  readonly startTime: string;
  readonly durationMinutes: number | null;
  readonly capacity: number | null;
  readonly title: string | null;
  readonly notes: string | null;
}

export function validarSesion(formulario: FormularioDeSesion, hoy: string): Validacion<DatosDeSesion> {
  const errores: Record<string, string> = {};

  const classId = formulario.classId.trim();
  if (!PATRON_UUID.test(classId)) errores.classId = 'Elige la clase.';
  const branchId = formulario.branchId.trim();
  if (!PATRON_UUID.test(branchId)) errores.branchId = 'Elige la sede.';
  const trainerCrudo = formulario.trainerId.trim();
  if (trainerCrudo !== '' && !PATRON_UUID.test(trainerCrudo)) errores.trainerId = 'Elige un instructor de la lista.';

  const sessionDate = formulario.sessionDate.trim();
  if (!esFecha(sessionDate)) errores.sessionDate = 'Elige la fecha.';
  else if (sessionDate < hoy) errores.sessionDate = 'No se programa una sesión en el pasado.';

  const startTime = formulario.startTime.trim().slice(0, 5);
  if (!esHora(startTime)) errores.startTime = 'Hora de inicio en formato HH:MM.';

  const duracionTexto = formulario.durationMinutes.trim();
  const durationMinutes = duracionTexto === '' ? null : entero(duracionTexto);
  if (duracionTexto !== '' && (durationMinutes === null || durationMinutes < 15 || durationMinutes > 240)) {
    errores.durationMinutes = 'Entre 15 y 240 minutos, o vacío para usar la de la clase.';
  }

  const capacidadTexto = formulario.capacity.trim();
  const capacity = capacidadTexto === '' ? null : entero(capacidadTexto);
  if (capacidadTexto !== '' && (capacity === null || capacity < 1 || capacity > 200)) {
    errores.capacity = 'Entre 1 y 200, o vacío para usar la de la clase.';
  }

  const title = limpio(formulario.title);
  if (title && (title.length < 2 || title.length > 80)) errores.title = 'Entre 2 y 80 caracteres.';
  const notes = limpio(formulario.notes);
  if (notes && notes.length > 400) errores.notes = 'Hasta 400 caracteres.';

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    datos: { classId, branchId, trainerId: trainerCrudo === '' ? null : trainerCrudo, sessionDate, startTime, durationMinutes, capacity, title, notes },
  };
}

export function validarRangoDeGeneracion(desde: string, hasta: string, hoy: string): Validacion<{ readonly desde: string; readonly hasta: string }> {
  const errores: Record<string, string> = {};
  if (!esFecha(desde)) errores.desde = 'Elige desde qué fecha.';
  if (!esFecha(hasta)) errores.hasta = 'Elige hasta qué fecha.';
  if (Object.keys(errores).length > 0) return { ok: false, errores };

  const inicio = desde < hoy ? hoy : desde;
  if (hasta < inicio) errores.hasta = 'La fecha final tiene que ser posterior a la inicial.';
  else if (diasEntreFechas(hoy, hasta) > MAXIMO_DIAS_DE_GENERACION) errores.hasta = `Como máximo ${MAXIMO_DIAS_DE_GENERACION} días desde hoy.`;
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { desde: inicio, hasta } };
}

export function validarMotivoDeCancelacion(motivo: string): Validacion<string> {
  const texto = limpio(motivo);
  if (!texto || texto.length < 4) return { ok: false, errores: { motivo: 'Escribe el motivo: el socio lo verá en el calendario.' } };
  if (texto.length > 200) return { ok: false, errores: { motivo: 'Hasta 200 caracteres.' } };
  return { ok: true, datos: texto };
}

// ------------------------------------------------------------------ lectura para gerencia

export type TonoDeConclusion = 'bueno' | 'neutro' | 'atencion';

export interface ConclusionDeClases {
  readonly clave: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly tono: TonoDeConclusion;
}

export interface DatosDeConclusionesDeClases {
  readonly resumen: ResumenDeClases;
  readonly estadisticas: readonly EstadisticaDeClase[];
  readonly franjas: readonly FranjaDeClases[];
  readonly clases: readonly Pick<Clase, 'name' | 'accessMode' | 'planIds' | 'isActive' | 'horarios' | 'kind'>[];
}

/** Debajo de esto una clase no dice nada todavía: dos sesiones sueltas no son un patrón. */
const MINIMO_DE_SESIONES = 3;
/** Una clase regular por debajo de esta ocupación media está sobrando cupo. */
export const OCUPACION_BAJA = 30;
export const OCUPACION_ALTA = 80;

function plural(n: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

function listaCorta(nombres: readonly string[], maximo = 3): string {
  const visibles = nombres.slice(0, maximo);
  const resto = nombres.length - visibles.length;
  return resto > 0 ? `${visibles.join(', ')} y ${resto} más` : visibles.join(', ');
}

/**
 * Conclusiones del cuadro de clases. Como en entrenamiento (V3.2), son frases
 * con el número que las sostiene: qué clase se llena, cuál sobra, a qué hora
 * conviene abrir otra y qué está mal configurado (una clase «solo planes» sin
 * planes no la puede tomar nadie).
 */
export function conclusionesDeClases(datos: DatosDeConclusionesDeClases): readonly ConclusionDeClases[] {
  const conclusiones: ConclusionDeClases[] = [];

  const sinAcceso = datos.clases.filter(claseSinAcceso);
  if (sinAcceso.length > 0) {
    conclusiones.push({
      clave: 'sin-acceso',
      titulo: `${plural(sinAcceso.length, 'clase')} sin ningún plan que la incluya`,
      detalle: `${listaCorta(sinAcceso.map((c) => c.name))}: están en «solo planes» y ningún plan está marcado, así que nadie puede entrar. Marca sus planes o ábrela a cualquier membresía.`,
      tono: 'atencion',
    });
  }

  const sinHorario = datos.clases.filter((c) => c.isActive && c.kind === 'regular' && c.horarios === 0);
  if (sinHorario.length > 0) {
    conclusiones.push({
      clave: 'sin-horario',
      titulo: `${plural(sinHorario.length, 'clase')} sin horario semanal`,
      detalle: `${listaCorta(sinHorario.map((c) => c.name))}: sin horario no se generan sesiones.`,
      tono: 'atencion',
    });
  }

  if (datos.resumen.asistencias30d === 0) {
    conclusiones.push({
      clave: 'sin-datos',
      titulo: 'Todavía no hay asistencia a clases registrada',
      detalle: 'La ocupación se llena cuando recepción o el instructor registran quién vino a cada sesión.',
      tono: 'atencion',
    });
    return conclusiones;
  }

  const conDatos = datos.estadisticas.filter((e) => e.isActive && e.sesiones30d >= MINIMO_DE_SESIONES && e.ocupacion30d !== null);
  const ordenadas = [...conDatos].sort((a, b) => (b.ocupacion30d ?? 0) - (a.ocupacion30d ?? 0) || b.asistencias30d - a.asistencias30d);

  const top = ordenadas[0];
  if (top && top.ocupacion30d !== null) {
    conclusiones.push({
      clave: 'clase-top',
      titulo: `«${top.name}» es la clase que más se llena`,
      detalle: `${top.ocupacion30d} % de ocupación media en ${plural(top.sesiones30d, 'sesión', 'sesiones')} (${top.asistencias30d} asistencias, ${plural(top.socios30d, 'socio')} distintos).${
        top.ocupacion30d >= OCUPACION_ALTA ? ' Conviene abrir otro horario antes de que empiece a rebotar gente.' : ''
      }`,
      tono: top.ocupacion30d >= OCUPACION_ALTA ? 'bueno' : 'neutro',
    });
  }

  const bajas = ordenadas.filter((e) => e.kind === 'regular' && (e.ocupacion30d ?? 0) < OCUPACION_BAJA && e.classId !== top?.classId);
  if (bajas.length > 0) {
    conclusiones.push({
      clave: 'ocupacion-baja',
      titulo: `${plural(bajas.length, 'clase')} por debajo del ${OCUPACION_BAJA} % de ocupación`,
      detalle: `${listaCorta(bajas.map((e) => `${e.name} (${e.ocupacion30d} %)`))}. O el horario no conviene, o hay que difundirlas entre los planes que las incluyen.`,
      tono: 'atencion',
    });
  }

  const pico = [...datos.franjas]
    .filter((f) => f.sesiones > 0)
    .sort((a, b) => b.asistencias / Math.max(1, b.sesiones) - a.asistencias / Math.max(1, a.sesiones) || b.asistencias - a.asistencias)[0];
  if (pico && pico.asistencias > 0) {
    conclusiones.push({
      clave: 'franja-pico',
      titulo: `La franja más concurrida: ${NOMBRE_DE_DIA_ISO[pico.dia].toLowerCase()} a las ${String(pico.hora).padStart(2, '0')}:00`,
      detalle: `${Math.round(pico.asistencias / pico.sesiones)} asistentes por sesión en promedio (${porcentajeDeOcupacion(pico.asistencias, pico.capacidad)} % del cupo).`,
      tono: 'neutro',
    });
  }

  const canceladas = datos.estadisticas.reduce((s, e) => s + e.canceladas30d, 0);
  const realizadas = datos.estadisticas.reduce((s, e) => s + e.sesiones30d, 0);
  if (canceladas > 0) {
    const porcentaje = Math.round((canceladas / Math.max(1, canceladas + realizadas)) * 100);
    conclusiones.push({
      clave: 'cancelaciones',
      titulo: `${plural(canceladas, 'sesión cancelada', 'sesiones canceladas')} en 30 días`,
      detalle: `${porcentaje} % de las sesiones programadas. ${porcentaje >= 10 ? 'Es alto: revisa ausencias de instructores y horarios.' : 'Dentro de lo normal.'}`,
      tono: porcentaje >= 10 ? 'atencion' : 'neutro',
    });
  }

  conclusiones.push({
    clave: 'alcance',
    titulo: `${plural(datos.resumen.socios30d, 'socio')} tomaron clases este mes`,
    detalle: `${datos.resumen.asistencias30d} asistencias en 30 días. ${datos.resumen.sesiones7d} sesiones programadas para los próximos 7 días.`,
    tono: 'bueno',
  });

  return conclusiones;
}

export function mensajeDeErrorDeClases(codigo: string): string {
  const c = codigo;
  if (c.includes('plan_no_incluye_clase')) return 'El plan vigente de ese socio no incluye esta clase.';
  if (c.includes('sin_membresia_vigente')) return 'Ese socio no tiene membresía vigente el día de la sesión.';
  if (c.includes('clase_llena')) return 'La sesión ya está llena: no quedan cupos.';
  if (c.includes('ya_registrado')) return 'Ese socio ya está registrado en esta sesión.';
  if (c.includes('sesion_futura')) return 'La asistencia se registra desde media hora antes de empezar.';
  if (c.includes('fecha_demasiado_antigua')) return 'Solo se registra asistencia de sesiones de la última semana.';
  if (c.includes('sesion_cancelada')) return 'Esa sesión está cancelada.';
  if (c.includes('sesion_con_asistencia')) return 'No se cancela una sesión que ya tiene asistentes. Quítalos primero si fue un error.';
  if (c.includes('sesion_pasada')) return 'Esa sesión ya pasó: no se puede programar ni cambiar.';
  if (c.includes('motivo_requerido')) return 'Escribe el motivo de la cancelación.';
  if (c.includes('capacidad_menor_que_asistentes')) return 'La capacidad no puede quedar por debajo de los asistentes ya registrados.';
  if (c.includes('capacidad_menor_que_reservas')) return 'La capacidad no puede quedar por debajo de los lugares ya reservados.';
  if (c.includes('clases_lugares_sin_reserva')) return 'Los lugares sin reserva tienen que ser menos que la capacidad.';
  if (c.includes('entrenador_ocupado')) return 'El instructor ya tiene otra sesión a esa hora.';
  if (c.includes('entrenador_ausente')) return 'El instructor tiene una ausencia registrada a esa hora.';
  if (c.includes('entrenador_sin_sede')) return 'Ese instructor no trabaja en esa sede. Asígnale la sede en su perfil.';
  if (c.includes('entrenador_inactivo')) return 'Ese instructor está inactivo.';
  if (c.includes('sucursal_no_disponible')) return 'Esa sede no existe o está inactiva.';
  if (c.includes('clase_no_disponible')) return 'Esa clase no existe o está archivada.';
  if (c.includes('socio_no_disponible')) return 'Ese socio no está disponible en este gimnasio.';
  if (c.includes('sesion_no_disponible')) return 'Esa sesión no existe.';
  if (c.includes('rango_invalido')) return `Elige un rango de hoy en adelante, de ${MAXIMO_DIAS_DE_GENERACION} días como máximo.`;
  if (c.includes('classes_nombre_uk')) return 'Ya hay una clase con ese nombre.';
  if (c.includes('class_schedules_franja_uk')) return 'Esa clase ya tiene ese horario en esa sede.';
  if (c.includes('23505')) return 'Ese registro ya existe.';
  if (c.includes('23503')) return 'La sede, el instructor o el plan no pertenecen a este gimnasio.';
  if (c.includes('23514')) return 'Algún dato no tiene el formato esperado.';
  if (c.includes('sin_permiso') || c.includes('42501')) return 'Tu cuenta no puede hacer esta operación en esta clase o sede.';
  return 'No se pudo guardar. Vuelve a intentarlo.';
}
