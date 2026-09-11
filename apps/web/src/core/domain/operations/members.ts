/**
 * CAPA: Domain / Operations
 *
 * Socios: la ficha completa, el alta y sus reglas.
 *
 * La validación vive aquí y se repite en la base (`registrar_socio`). No es
 * duplicación por descuido: la de aquí existe para decirle al mostrador QUÉ
 * campo está mal antes de enviar; la de la base, porque a la base se la puede
 * llamar sin pasar por este formulario.
 */

export type EstadoDeMembresia = 'active' | 'expiring_soon' | 'expired' | 'suspended' | 'cancelled';
export type EstadoDeSocio = 'active' | 'inactive' | 'archived';
export type MetodoDePago = 'cash' | 'qr' | 'transfer' | 'card' | 'other';

export const METODOS_DE_PAGO: readonly MetodoDePago[] = ['cash', 'qr', 'transfer', 'card', 'other'];

export const NOMBRE_DE_METODO_DE_PAGO: Readonly<Record<MetodoDePago, string>> = {
  cash: 'Efectivo',
  qr: 'QR',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
};

export const NOMBRE_DE_ESTADO_DE_MEMBRESIA: Readonly<Record<EstadoDeMembresia, string>> = {
  active: 'Activa',
  expiring_soon: 'Por vencer',
  expired: 'Vencida',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
};

export const NOMBRE_DE_ESTADO_DE_SOCIO: Readonly<Record<EstadoDeSocio, string>> = {
  active: 'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

export function esMetodoDePago(valor: unknown): valor is MetodoDePago {
  return typeof valor === 'string' && (METODOS_DE_PAGO as readonly string[]).includes(valor);
}

export function esEstadoDeMembresia(valor: unknown): valor is EstadoDeMembresia {
  return typeof valor === 'string' && valor in NOMBRE_DE_ESTADO_DE_MEMBRESIA;
}

export interface FichaDeSocio {
  readonly id: string;
  readonly code: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly documentId: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly birthDate: string | null;
  readonly status: EstadoDeSocio;
  readonly notes: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly membershipId: string | null;
  readonly planId: string | null;
  readonly planName: string | null;
  readonly planCode: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly membershipStatus: EstadoDeMembresia | null;
  readonly daysRemaining: number | null;
  readonly membershipPrice: number | null;
  /** `null` cuando quien mira no puede ver tokens (no registra asistencia). */
  readonly checkinToken: string | null;
  readonly tokenRotatedAt: string | null;
  readonly totalVisits: number;
  readonly lastVisit: string | null;
  readonly visits30d: number;
  readonly totalPaid: number;
  readonly pendingReceipts: number;
  /** `null` = no se sabe (quien mira no tiene alcance para saberlo). */
  readonly hasAccount: boolean | null;
  readonly accountEmail: string | null;
}

export interface PlanVendible {
  readonly id: string;
  readonly code: string | null;
  readonly name: string;
  readonly durationDays: number;
  readonly price: number;
  readonly currency: string;
}

export interface MembresiaDeHistorial {
  readonly id: string;
  readonly planName: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: EstadoDeMembresia;
  readonly price: number;
}

export interface PagoDeHistorial {
  readonly id: string;
  readonly paidDate: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: MetodoDePago;
  readonly planName: string | null;
  readonly notes: string | null;
}

export type FiltroDeEstadoDeSocio = EstadoDeMembresia | 'sin-membresia';

export interface FiltroDeSocios {
  readonly q?: string;
  readonly estado?: FiltroDeEstadoDeSocio;
  readonly planId?: string;
  readonly incluirArchivados?: boolean;
  readonly soloArchivados?: boolean;
  /** Socios cuyo cumpleaños cae en el mes de hoy. */
  readonly cumpleMes?: boolean;
  /** Socios activos que no entran desde hace al menos N días. */
  readonly inactivosDias?: number;
  readonly limite?: number;
}

export interface DatosDeSocio {
  readonly nombre: string;
  readonly apellido: string;
  readonly documento: string;
  readonly telefono: string;
  readonly correo: string;
  readonly nacimiento: string;
  readonly nota: string;
}

export interface DatosDeAlta extends DatosDeSocio {
  readonly planId: string;
  readonly inicio: string;
  readonly metodo: string;
  readonly monto: string;
}

export type ErroresDeFormulario = Readonly<Record<string, string>>;

const PATRON_NOMBRE = /^[\p{L}\p{M}][\p{L}\p{M}'\-. ]*$/u;
const PATRON_CORREO = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)*\.[A-Za-z]{2,}$/;
const PATRON_DOCUMENTO = /^[0-9A-Za-z][0-9A-Za-z\- ]{3,19}$/;
const PATRON_TELEFONO = /^\+?[0-9][0-9 ]{6,17}$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function diasEntre(desde: string, hasta: string): number {
  const a = new Date(`${desde}T12:00:00Z`).getTime();
  const b = new Date(`${hasta}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function validarNombre(valor: string, campo: string, errores: Record<string, string>) {
  const limpio = valor.trim();
  if (!limpio) errores[campo] = 'Es obligatorio.';
  else if (limpio.length < 2) errores[campo] = 'Es demasiado corto.';
  else if (limpio.length > 80) errores[campo] = 'Es demasiado largo.';
  else if (/\d/.test(limpio)) errores[campo] = 'No puede llevar números.';
  else if (!PATRON_NOMBRE.test(limpio)) errores[campo] = 'Solo letras, espacios, apóstrofos y guiones.';
}

export function validarDatosDeSocio(datos: DatosDeSocio, hoy: string): ErroresDeFormulario {
  const errores: Record<string, string> = {};

  validarNombre(datos.nombre, 'nombre', errores);
  validarNombre(datos.apellido, 'apellido', errores);

  const documento = datos.documento.trim();
  if (documento && !PATRON_DOCUMENTO.test(documento)) {
    errores.documento = 'Entre 4 y 20 caracteres: números, letras y guiones.';
  }

  const telefono = datos.telefono.trim();
  if (telefono && !PATRON_TELEFONO.test(telefono)) {
    errores.telefono = 'Solo números, con + opcional al inicio.';
  }

  const correo = datos.correo.trim();
  if (correo && (correo.length > 254 || !PATRON_CORREO.test(correo))) {
    errores.correo = 'Ese correo no tiene un formato válido.';
  }

  const nacimiento = datos.nacimiento.trim();
  if (nacimiento) {
    if (!PATRON_FECHA.test(nacimiento)) errores.nacimiento = 'Fecha inválida.';
    else if (nacimiento > hoy) errores.nacimiento = 'No puede ser una fecha futura.';
    else if (diasEntre(nacimiento, hoy) > 110 * 366) errores.nacimiento = 'Revisa el año.';
  }

  if (datos.nota.length > 500) errores.nota = 'Máximo 500 caracteres.';

  return errores;
}

export function validarAlta(datos: DatosDeAlta, hoy: string): ErroresDeFormulario {
  const errores: Record<string, string> = { ...validarDatosDeSocio(datos, hoy) };

  if (datos.planId) {
    const inicio = datos.inicio.trim();
    if (inicio) {
      if (!PATRON_FECHA.test(inicio)) errores.inicio = 'Fecha inválida.';
      else if (diasEntre(hoy, inicio) < -30) errores.inicio = 'No puede empezar hace más de 30 días.';
      else if (diasEntre(hoy, inicio) > 60) errores.inicio = 'No puede empezar dentro de más de 60 días.';
    }
    if (!esMetodoDePago(datos.metodo)) errores.metodo = 'Elige cómo pagó.';
    const monto = datos.monto.trim();
    if (monto) {
      const numero = Number(monto.replace(',', '.'));
      if (!Number.isFinite(numero) || numero < 0) errores.monto = 'Importe inválido.';
      else if (numero >= 100_000) errores.monto = 'Importe demasiado alto.';
    }
  }

  return errores;
}

export function importeDeTexto(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : null;
}

export function edad(nacimiento: string | null, hoy: string): number | null {
  if (!nacimiento || !PATRON_FECHA.test(nacimiento)) return null;
  const [ah, mh, dh] = hoy.split('-').map(Number);
  const [an, mn, dn] = nacimiento.split('-').map(Number);
  if (!ah || !mh || !dh || !an || !mn || !dn) return null;
  let años = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) años -= 1;
  return años >= 0 ? años : null;
}

export function cumpleEsteMes(nacimiento: string | null, hoy: string): boolean {
  return Boolean(nacimiento && nacimiento.slice(5, 7) === hoy.slice(5, 7));
}

export function diasDesde(fecha: string | null, hoy: string): number | null {
  if (!fecha || !PATRON_FECHA.test(fecha)) return null;
  return diasEntre(fecha, hoy);
}

/** Mensaje legible para un error lanzado por las operaciones de la base. */
export function mensajeDeErrorDeSocio(codigo: string): string {
  if (codigo.includes('documento_duplicado')) return 'Ya hay un socio con ese documento.';
  if (codigo.includes('nombre_invalido')) return 'Revisa el nombre y el apellido.';
  if (codigo.includes('correo_invalido')) return 'Ese correo no tiene un formato válido.';
  if (codigo.includes('plan_invalido')) return 'Ese plan no está disponible.';
  if (codigo.includes('inicio_invalido')) return 'La fecha de inicio está fuera del rango permitido.';
  if (codigo.includes('monto_invalido')) return 'El importe no es válido.';
  if (codigo.includes('monto_insuficiente')) return 'Un cobro por QR no puede ser menor que el precio del plan.';
  if (codigo.includes('sin_permiso') || codigo.includes('42501')) return 'Tu cuenta no puede hacer esta operación.';
  if (codigo.includes('socio_no_encontrado')) return 'Ese socio no existe o está archivado.';
  return 'No se pudo completar la operación. Vuelve a intentarlo.';
}
