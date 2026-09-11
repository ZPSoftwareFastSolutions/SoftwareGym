/**
 * CAPA: Domain / Operations
 *
 * Entrenadores (V3.1).
 *
 * Un entrenador es un PERFIL del gimnasio. Tener cuenta es opcional: solo la
 * necesita quien entra al sistema, y se la vincula gerencia. Su «no
 * disponibilidad» son ausencias puntuales —unas horas, un turno, un día, unos
 * días—; no es una agenda de citas.
 *
 * Quién puede tener entrenador lo decide el PLAN de su membresía vigente
 * (`includesTrainer`, `maxSecondaryTrainers`). La base aplica esa regla al
 * insertar; aquí se repite para explicarla en la pantalla antes de enviar.
 *
 * Todo es puro y sin I/O (se prueba con `node --test`).
 */

export type TipoDeAsignacion = 'principal' | 'secundario';
export type TipoDeAusencia = 'horas' | 'turno' | 'dia' | 'periodo';
export type EstadoDeMembresiaDelAsignado = 'vigente' | 'vencida' | 'sin_membresia';

export const NOMBRE_DE_TIPO_DE_ASIGNACION: Readonly<Record<TipoDeAsignacion, string>> = {
  principal: 'Principal',
  secundario: 'Secundario',
};

export const NOMBRE_DE_TIPO_DE_AUSENCIA: Readonly<Record<TipoDeAusencia, string>> = {
  horas: 'Unas horas',
  turno: 'Un turno',
  dia: 'Un día',
  periodo: 'Varios días',
};

export const NOMBRE_DE_ESTADO_DEL_ASIGNADO: Readonly<Record<EstadoDeMembresiaDelAsignado, string>> = {
  vigente: 'Vigente',
  vencida: 'Vencida',
  sin_membresia: 'Sin membresía',
};

/** Turno de trabajo con nombre, en la hora local del gimnasio. */
export interface Turno {
  /** Minúsculas, números y guiones: se guarda con la ausencia. */
  readonly code: string;
  readonly label: string;
  /** `HH:MM` */
  readonly start: string;
  /** `HH:MM`, posterior a `start`. */
  readonly end: string;
}

/** Si el archivo del gimnasio no declara turnos, se usan estos. */
export const TURNOS_POR_DEFECTO: readonly Turno[] = [
  { code: 'manana', label: 'Mañana', start: '06:00', end: '12:00' },
  { code: 'tarde', label: 'Tarde', start: '12:00', end: '18:00' },
  { code: 'noche', label: 'Noche', start: '18:00', end: '22:00' },
];

/** Turnos del gimnasio: los de su archivo de configuración o los de por defecto. */
export function turnosDelGimnasio(definidos: readonly Turno[] | undefined): readonly Turno[] {
  return definidos && definidos.length > 0 ? definidos : TURNOS_POR_DEFECTO;
}

export interface Entrenador {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly bio: string | null;
  readonly specialties: readonly string[];
  readonly isActive: boolean;
  /** Cuenta vinculada; `null` = perfil sin acceso al sistema. */
  readonly appUserId: string | null;
  readonly accountEmail: string | null;
  readonly branchIds: readonly string[];
  readonly principales: number;
  readonly secundarios: number;
  /** Tiene alguna ausencia que toca el día de hoy (del gimnasio). */
  readonly ausenciaHoy: boolean;
}

export interface Ausencia {
  readonly id: string;
  readonly trainerId: string;
  readonly kind: TipoDeAusencia;
  readonly shiftCode: string | null;
  /** `YYYY-MM-DD` */
  readonly startDate: string;
  readonly endDate: string;
  /** `HH:MM` o `null` (día completo). */
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly reason: string | null;
}

export interface AsignacionDeEntrenador {
  readonly id: string;
  readonly customerId: string;
  readonly trainerId: string;
  readonly kind: TipoDeAsignacion;
  readonly focus: string | null;
  readonly startsOn: string;
  readonly endedOn: string | null;
  readonly customerCode: string | null;
  readonly customerName: string;
  readonly trainerName: string;
  readonly trainerActive: boolean;
  readonly planName: string | null;
  readonly membershipEnd: string | null;
  readonly includesTrainer: boolean | null;
  readonly maxSecondaryTrainers: number | null;
  readonly membershipStatus: EstadoDeMembresiaDelAsignado;
}

/** Lo que ve el entrenador de un socio suyo: sin pagos, documento ni teléfono. */
export interface SocioAsignado {
  readonly assignmentId: string;
  readonly kind: TipoDeAsignacion;
  readonly focus: string | null;
  readonly startsOn: string;
  readonly customerId: string;
  readonly customerCode: string | null;
  readonly fullName: string;
  readonly planName: string | null;
  readonly membershipEnd: string | null;
  readonly membershipStatus: EstadoDeMembresiaDelAsignado;
}

export interface ReglaDePlan {
  readonly planId: string;
  readonly planName: string;
  readonly planCode: string | null;
  readonly includesTrainer: boolean;
  readonly maxSecondaryTrainers: number;
}

export type Validacion<T> =
  | { readonly ok: true; readonly datos: T }
  | { readonly ok: false; readonly errores: Readonly<Record<string, string>> };

// ------------------------------------------------------------------ utilidades

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PATRON_CORREO = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)*\.[a-z]{2,}$/i;
export const MAXIMO_DE_SECUNDARIOS = 5;

function limpio(valor: string): string | null {
  const recortado = valor.trim();
  return recortado === '' ? null : recortado;
}

export function esFechaValida(valor: string): boolean {
  if (!PATRON_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function esHoraValida(valor: string): boolean {
  return PATRON_HORA.test(valor);
}

/** Días entre dos fechas `YYYY-MM-DD` (fin − inicio). */
export function diasEntre(inicio: string, fin: string): number {
  return Math.round((Date.parse(`${fin}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 86_400_000);
}

export function esTipoDeAusencia(valor: unknown): valor is TipoDeAusencia {
  return valor === 'horas' || valor === 'turno' || valor === 'dia' || valor === 'periodo';
}

export function esTipoDeAsignacion(valor: unknown): valor is TipoDeAsignacion {
  return valor === 'principal' || valor === 'secundario';
}

// ------------------------------------------------------------------ entrenador

export interface FormularioDeEntrenador {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly bio: string;
  /** Separadas por coma o por línea. */
  readonly specialties: string;
}

export interface DatosDeEntrenador {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly bio: string | null;
  readonly specialties: readonly string[];
}

/** Especialidades sin vacías ni repetidas (sin distinguir mayúsculas), en el orden escrito. */
export function normalizarEspecialidades(texto: string): readonly string[] {
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const parte of texto.split(/[,\n]/)) {
    const valor = parte.trim().replace(/\s+/g, ' ');
    const clave = valor.toLocaleLowerCase('es');
    if (!valor || vistas.has(clave)) continue;
    vistas.add(clave);
    resultado.push(valor);
  }
  return resultado;
}

export function validarEntrenador(formulario: FormularioDeEntrenador): Validacion<DatosDeEntrenador> {
  const errores: Record<string, string> = {};

  const firstName = formulario.firstName.trim();
  const lastName = formulario.lastName.trim();
  if (firstName.length < 1 || firstName.length > 60) errores.firstName = 'Escribe el nombre (hasta 60 caracteres).';
  if (lastName.length < 1 || lastName.length > 60) errores.lastName = 'Escribe el apellido (hasta 60 caracteres).';

  const email = limpio(formulario.email)?.toLowerCase() ?? null;
  if (email && (email.length > 120 || !PATRON_CORREO.test(email))) errores.email = 'Ese correo no parece válido.';

  const phone = limpio(formulario.phone);
  if (phone && (phone.length > 40 || !/^[0-9+()\s-]+$/.test(phone))) {
    errores.phone = 'Usa solo números, espacios, «+», guiones o paréntesis.';
  }

  const bio = limpio(formulario.bio);
  if (bio && bio.length > 600) errores.bio = 'La presentación no puede pasar de 600 caracteres.';

  const specialties = normalizarEspecialidades(formulario.specialties);
  if (specialties.length > 8) errores.specialties = 'Hasta 8 especialidades.';
  else if (specialties.some((e) => e.length < 2 || e.length > 40)) {
    errores.specialties = 'Cada especialidad debe tener entre 2 y 40 caracteres.';
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { firstName, lastName, email, phone, bio, specialties } };
}

// ------------------------------------------------------------------ ausencias

export interface FormularioDeAusencia {
  readonly kind: string;
  readonly shiftCode: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
}

export interface DatosDeAusencia {
  readonly kind: TipoDeAusencia;
  readonly shiftCode: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly reason: string | null;
}

/** Tope de una ausencia larga: un año. La base aplica el mismo. */
export const MAXIMO_DIAS_DE_AUSENCIA = 366;

/**
 * Normaliza lo que se eligió en el formulario a la forma que guarda la base:
 * - horas: una fecha con hora de inicio y fin;
 * - turno: una fecha con las horas del turno elegido (las del gimnasio);
 * - día: una fecha, sin horas;
 * - periodo: varias fechas, días completos.
 */
export function validarAusencia(formulario: FormularioDeAusencia, turnos: readonly Turno[]): Validacion<DatosDeAusencia> {
  const errores: Record<string, string> = {};
  const kind = formulario.kind;
  if (!esTipoDeAusencia(kind)) return { ok: false, errores: { kind: 'Elige qué tipo de ausencia es.' } };

  const startDate = formulario.startDate.trim();
  if (!esFechaValida(startDate)) errores.startDate = 'Fecha inválida.';

  const reason = limpio(formulario.reason);
  if (reason && reason.length > 200) errores.reason = 'El motivo no puede pasar de 200 caracteres.';

  let endDate = startDate;
  let startTime: string | null = null;
  let endTime: string | null = null;
  let shiftCode: string | null = null;

  if (kind === 'horas') {
    startTime = formulario.startTime.trim();
    endTime = formulario.endTime.trim();
    if (!esHoraValida(startTime)) errores.startTime = 'Hora inválida.';
    if (!esHoraValida(endTime)) errores.endTime = 'Hora inválida.';
    else if (esHoraValida(startTime) && endTime <= startTime) errores.endTime = 'Tiene que terminar después de empezar.';
  } else if (kind === 'turno') {
    const turno = turnos.find((t) => t.code === formulario.shiftCode);
    if (!turno) errores.shiftCode = 'Elige un turno.';
    else {
      shiftCode = turno.code;
      startTime = turno.start;
      endTime = turno.end;
    }
  } else if (kind === 'periodo') {
    endDate = formulario.endDate.trim();
    if (!esFechaValida(endDate)) errores.endDate = 'Fecha inválida.';
    else if (esFechaValida(startDate)) {
      const dias = diasEntre(startDate, endDate);
      if (dias < 1) errores.endDate = 'Para un solo día elige «Un día».';
      else if (dias > MAXIMO_DIAS_DE_AUSENCIA) errores.endDate = 'Una ausencia no puede pasar de un año.';
    }
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { kind, shiftCode, startDate, endDate, startTime, endTime, reason } };
}

/** Inicio y fin de la ausencia como `YYYY-MM-DDTHH:MM` locales, fin excluido. */
export function limitesDeAusencia(a: Pick<Ausencia, 'startDate' | 'endDate' | 'startTime' | 'endTime'>): {
  readonly inicio: string;
  readonly fin: string;
} {
  const inicio = `${a.startDate}T${a.startTime ?? '00:00'}`;
  if (a.endTime) return { inicio, fin: `${a.endDate}T${a.endTime}` };
  const siguiente = new Date(`${a.endDate}T12:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return { inicio, fin: `${siguiente.toISOString().slice(0, 10)}T00:00` };
}

/** Dos ausencias se pisan si comparten algún minuto (mismo criterio que la base). */
export function seSolapan(
  a: Pick<Ausencia, 'startDate' | 'endDate' | 'startTime' | 'endTime'>,
  b: Pick<Ausencia, 'startDate' | 'endDate' | 'startTime' | 'endTime'>,
): boolean {
  const la = limitesDeAusencia(a);
  const lb = limitesDeAusencia(b);
  return la.inicio < lb.fin && lb.inicio < la.fin;
}

export type Disponibilidad =
  | { readonly estado: 'disponible' }
  /** Ausente en este momento. */
  | { readonly estado: 'ausente'; readonly ausencia: Ausencia }
  /** Hoy tiene una ausencia, pero no ahora. */
  | { readonly estado: 'ausencia_hoy'; readonly ausencia: Ausencia };

/** `fecha` y `hora` son las del gimnasio, nunca las del servidor. */
export function disponibilidadEn(ausencias: readonly Ausencia[], fecha: string, hora: string): Disponibilidad {
  const ahora = `${fecha}T${hora}`;
  const actual = ausencias.find((a) => {
    const { inicio, fin } = limitesDeAusencia(a);
    return inicio <= ahora && ahora < fin;
  });
  if (actual) return { estado: 'ausente', ausencia: actual };
  const hoy = ausencias.find((a) => a.startDate <= fecha && fecha <= a.endDate);
  if (hoy) return { estado: 'ausencia_hoy', ausencia: hoy };
  return { estado: 'disponible' };
}

/** Ausencias que todavía no terminaron, de la más próxima a la más lejana. */
export function ausenciasPendientes(ausencias: readonly Ausencia[], fecha: string, hora: string): readonly Ausencia[] {
  const ahora = `${fecha}T${hora}`;
  return ausencias
    .filter((a) => limitesDeAusencia(a).fin > ahora)
    .sort((x, y) => limitesDeAusencia(x).inicio.localeCompare(limitesDeAusencia(y).inicio));
}

/** «Mañana (06:00–12:00)», «08:00–10:00», «Día completo», «12 días». */
export function describirAusencia(a: Ausencia, turnos: readonly Turno[]): string {
  if (a.kind === 'turno') {
    const turno = turnos.find((t) => t.code === a.shiftCode);
    return `${turno?.label ?? 'Turno'} (${a.startTime ?? ''}–${a.endTime ?? ''})`;
  }
  if (a.kind === 'horas') return `${a.startTime ?? ''}–${a.endTime ?? ''}`;
  if (a.kind === 'dia') return 'Día completo';
  const dias = diasEntre(a.startDate, a.endDate) + 1;
  return `${dias} días`;
}

// ------------------------------------------------------------------ asignaciones

export type MotivoDeAsignacionRechazada =
  | 'sin_membresia_vigente'
  | 'plan_sin_entrenador'
  | 'plan_sin_mas_secundarios'
  | 'ya_tiene_principal'
  | 'entrenador_ya_asignado'
  | 'entrenador_inactivo';

export interface SituacionDeAsignacion {
  readonly kind: TipoDeAsignacion;
  /** Regla del plan de la membresía vigente, o `null` si no hay membresía vigente. */
  readonly plan: Pick<ReglaDePlan, 'includesTrainer' | 'maxSecondaryTrainers'> | null;
  readonly entrenadorActivo: boolean;
  readonly yaAsignado: boolean;
  readonly tienePrincipal: boolean;
  readonly secundariosVigentes: number;
}

/** El mismo orden de comprobaciones que el disparador de la base. */
export function evaluarAsignacion(
  s: SituacionDeAsignacion,
): { readonly ok: true } | { readonly ok: false; readonly motivo: MotivoDeAsignacionRechazada } {
  if (!s.entrenadorActivo) return { ok: false, motivo: 'entrenador_inactivo' };
  if (s.yaAsignado) return { ok: false, motivo: 'entrenador_ya_asignado' };
  if (s.kind === 'principal' && s.tienePrincipal) return { ok: false, motivo: 'ya_tiene_principal' };
  if (!s.plan) return { ok: false, motivo: 'sin_membresia_vigente' };
  if (s.kind === 'principal' && !s.plan.includesTrainer) return { ok: false, motivo: 'plan_sin_entrenador' };
  if (s.kind === 'secundario' && s.secundariosVigentes >= s.plan.maxSecondaryTrainers) {
    return { ok: false, motivo: 'plan_sin_mas_secundarios' };
  }
  return { ok: true };
}

/** Qué permite un plan, en una frase. */
export function resumenDeReglaDePlan(regla: Pick<ReglaDePlan, 'includesTrainer' | 'maxSecondaryTrainers'>): string {
  const principal = regla.includesTrainer ? 'Entrenador principal' : 'Sin entrenador principal';
  if (regla.maxSecondaryTrainers === 0) return `${principal} · sin secundarios`;
  const plural = regla.maxSecondaryTrainers === 1 ? 'secundario' : 'secundarios';
  return `${principal} · hasta ${regla.maxSecondaryTrainers} ${plural}`;
}

export function validarReglaDePlan(incluye: string, maximo: string): Validacion<{ readonly includesTrainer: boolean; readonly maxSecondaryTrainers: number }> {
  const numero = Number(maximo.trim() === '' ? '0' : maximo.trim());
  if (!Number.isInteger(numero) || numero < 0 || numero > MAXIMO_DE_SECUNDARIOS) {
    return { ok: false, errores: { maxSecondaryTrainers: `Entre 0 y ${MAXIMO_DE_SECUNDARIOS}.` } };
  }
  return { ok: true, datos: { includesTrainer: incluye === 'si', maxSecondaryTrainers: numero } };
}

export function validarFoco(texto: string): { readonly ok: true; readonly foco: string | null } | { readonly ok: false; readonly error: string } {
  const foco = limpio(texto.replace(/\s+/g, ' '));
  if (foco && (foco.length < 2 || foco.length > 60)) return { ok: false, error: 'El área debe tener entre 2 y 60 caracteres.' };
  return { ok: true, foco };
}

/** Mensaje legible para los códigos que devuelve la base. */
export function mensajeDeErrorDeEntrenadores(codigo: string): string {
  const c = codigo;
  if (c.includes('plan_sin_entrenador')) return 'El plan vigente de este socio no incluye entrenador principal.';
  if (c.includes('plan_sin_mas_secundarios')) return 'El plan vigente de este socio no admite más entrenadores secundarios.';
  if (c.includes('sin_membresia_vigente')) return 'El socio no tiene una membresía vigente.';
  if (c.includes('ya_tiene_principal')) return 'Este socio ya tiene entrenador principal. Finaliza esa asignación antes.';
  if (c.includes('entrenador_ya_asignado')) return 'Ese entrenador ya está asignado a este socio.';
  if (c.includes('entrenador_inactivo')) return 'El entrenador está inactivo.';
  if (c.includes('entrenador_no_disponible') || c.includes('socio_no_disponible')) return 'No se encontró ese socio o entrenador en este gimnasio.';
  if (c.includes('asignacion_finalizada')) return 'Esa asignación ya estaba finalizada.';
  if (c.includes('ausencia_solapada')) return 'Se cruza con otra ausencia de este entrenador.';
  if (c.includes('ausencia_forma') || c.includes('ausencia_rango')) return 'Revisa las fechas y horas de la ausencia.';
  if (c.includes('sucursal_no_disponible')) return 'Esa sede no está activa.';
  if (c.includes('cuenta_no_encontrada')) return 'No hay una cuenta con ese correo en este gimnasio. Pide al entrenador que se registre primero.';
  if (c.includes('correo_sin_confirmar')) return 'Esa cuenta todavía no confirmó su correo.';
  if (c.includes('cuenta_ya_vinculada')) return 'Esa cuenta ya está vinculada a otro entrenador.';
  if (c.includes('entrenador_con_cuenta')) return 'Este entrenador ya tiene una cuenta vinculada.';
  if (c.includes('especialidad_invalida')) return 'Cada especialidad debe tener entre 2 y 40 caracteres.';
  if (c.includes('trainer_branches_pkey') || c.includes('23505')) return 'Ese dato ya estaba registrado.';
  if (c.includes('sin_permiso') || c.includes('42501')) return 'Tu cuenta no puede administrar entrenadores.';
  return 'No se pudo guardar. Vuelve a intentarlo.';
}
