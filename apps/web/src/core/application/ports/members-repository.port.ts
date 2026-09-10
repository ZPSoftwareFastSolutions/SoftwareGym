/**
 * CAPA: Application / Ports
 *
 * Puerto de gestión de socios.
 *
 * Igual que el de operación, NO autoriza: ninguno de sus métodos recibe quién
 * pregunta. La identidad viaja en la sesión y la decide RLS en la base. Que
 * recepción no pueda editar un socio no está escrito aquí ni en la
 * implementación: está en los permisos de su rol, y la escritura simplemente
 * no afecta a ninguna fila.
 */

import type {
  EstadoDeMembresia,
  FichaDeSocio,
  FiltroDeSocios,
  MembresiaDeHistorial,
  MetodoDePago,
  PagoDeHistorial,
  PlanVendible,
} from '../../domain/operations/members';
import type { ResultadoDeOperacion } from './resultado';

/** Datos de alta ya validados y normalizados (vacíos convertidos en `null`). */
export interface AltaDeSocio {
  readonly nombre: string;
  readonly apellido: string;
  readonly documento: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly nacimiento: string | null;
  readonly nota: string | null;
  readonly planId: string | null;
  readonly inicio: string | null;
  readonly metodo: MetodoDePago;
  readonly monto: number | null;
}

export interface SocioRegistrado {
  readonly customerId: string;
  readonly code: string;
  readonly token: string | null;
  readonly membershipId: string | null;
  readonly paymentId: string | null;
  readonly cuentaVinculada: boolean;
}

export interface CambiosDeSocio {
  readonly nombre: string;
  readonly apellido: string;
  readonly documento: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly nacimiento: string | null;
  readonly nota: string | null;
}

export interface VentaDeMembresia {
  readonly customerId: string;
  readonly planId: string;
  readonly inicio: string | null;
  readonly metodo: MetodoDePago;
  readonly monto: number | null;
  readonly nota: string | null;
}

export interface CambiosDeMembresia {
  readonly startDate: string;
  readonly endDate: string;
  readonly status: Extract<EstadoDeMembresia, 'active' | 'suspended' | 'cancelled'>;
}

export interface MembersRepositoryPort {
  listar(filtro: FiltroDeSocios, hoy: string): Promise<readonly FichaDeSocio[]>;

  /** Ficha de cualquier socio visible para quien pregunta. */
  ficha(customerId: string): Promise<FichaDeSocio | null>;

  planesVendibles(): Promise<readonly PlanVendible[]>;

  membresias(customerId: string): Promise<readonly MembresiaDeHistorial[]>;

  pagos(customerId: string): Promise<readonly PagoDeHistorial[]>;

  /** Fechas con entrada del socio en los últimos `dias`. */
  diasDeAsistencia(customerId: string, dias: number): Promise<readonly string[]>;

  registrar(alta: AltaDeSocio): Promise<ResultadoDeOperacion<SocioRegistrado>>;

  actualizar(customerId: string, cambios: CambiosDeSocio): Promise<ResultadoDeOperacion<void>>;

  /** Archiva: el socio sale de las listas y conserva todo su histórico. */
  archivar(customerId: string): Promise<ResultadoDeOperacion<void>>;

  restaurar(customerId: string): Promise<ResultadoDeOperacion<void>>;

  rotarQr(customerId: string): Promise<ResultadoDeOperacion<string>>;

  venderMembresia(venta: VentaDeMembresia): Promise<ResultadoDeOperacion<{ readonly inicio: string }>>;

  actualizarMembresia(
    membershipId: string,
    cambios: CambiosDeMembresia,
  ): Promise<ResultadoDeOperacion<void>>;

  /** Separa la cuenta web de la ficha. La cuenta sigue existiendo. */
  desvincularCuenta(customerId: string): Promise<ResultadoDeOperacion<void>>;
}
