/**
 * CAPA: Application / Ports
 *
 * Puertos de comprobantes de pago y de ajustes de cobro del gimnasio.
 */

import type {
  Comprobante,
  FiltroDeComprobantes,
  OrigenDeComprobante,
  TipoDeImagen,
} from '../../domain/operations/receipts';
import type { MetodoDePago } from '../../domain/operations/members';
import type { ModoDeMonto, ModoDeQr, PlanACobrar, QrDeCobro } from '../../domain/operations/cobro-qr';
import type { ResultadoDeOperacion } from './resultado';

export interface ImagenValidada {
  readonly bytes: Uint8Array;
  readonly tipo: TipoDeImagen;
}

export interface NuevoComprobante {
  readonly tenantId: string;
  readonly customerId: string;
  readonly planId: string | null;
  readonly amount: number;
  readonly method: MetodoDePago;
  readonly source: OrigenDeComprobante;
  readonly note: string | null;
  readonly imagen: ImagenValidada;
}

export interface ReceiptsRepositoryPort {
  listar(filtro: FiltroDeComprobantes): Promise<readonly Comprobante[]>;

  obtener(id: string): Promise<Comprobante | null>;

  /**
   * Bytes de la imagen, leídos con la sesión de quien pregunta. Si RLS no le
   * deja ver el comprobante, `null`: la imagen no se sirve por conocer su ruta.
   */
  imagen(id: string): Promise<ImagenValidada | null>;

  subir(nuevo: NuevoComprobante): Promise<ResultadoDeOperacion<string>>;

  /**
   * Aprueba o rechaza. `montoVerificado` es lo que se vio en el banco; si falta,
   * se usa el declarado. La base rechaza aprobar por debajo del precio del plan.
   */
  revisar(id: string, aprobar: boolean, nota: string | null, montoVerificado: number | null): Promise<ResultadoDeOperacion<void>>;

  contarPendientes(): Promise<number>;
}

export interface AjustesDeCobro {
  readonly tenantId: string;
  readonly holder: string | null;
  readonly bank: string | null;
  readonly note: string | null;
  readonly qrMode: ModoDeQr;
  readonly updatedAt: string | null;
}

export interface CambiosDeAjustesDeCobro {
  readonly holder: string | null;
  readonly bank: string | null;
  readonly note: string | null;
  readonly qrMode: ModoDeQr;
}

/** Configuración de UN QR. `planId` nulo = QR general. */
export interface DatosDeQrDeCobro {
  readonly planId: string | null;
  readonly amountMode: ModoDeMonto;
  readonly fixedAmount: number | null;
  readonly expiresOn: string | null;
}

/** Plan tal como lo ve la vitrina: lo necesario para elegir el QR y enseñar el precio. */
export interface PlanPublico extends PlanACobrar {
  readonly code: string | null;
  readonly name: string;
  readonly currency: string;
}

/**
 * Ajustes y QR de cobro.
 *
 * Las lecturas funcionan con cualquier cliente: la vitrina las hace SIN sesión
 * (lo público de un QR es lo que se imprime en el mostrador). Las escrituras
 * van por RPC con la sesión de gerencia: el gimnasio sale de la sesión, nunca
 * de un parámetro.
 */
export interface PaymentSettingsPort {
  porSlug(tenantSlug: string): Promise<AjustesDeCobro | null>;

  /** QR del gimnasio. `tenantId` sale de las filas, para buscar planes sin leer `tenants`. */
  qrsPorSlug(tenantSlug: string): Promise<{ readonly tenantId: string | null; readonly qrs: readonly QrDeCobro[] }>;

  /** Plan activo por su código público (`?plan=fit`). */
  planPorCodigo(tenantId: string, codigo: string): Promise<PlanPublico | null>;

  /** Bytes verificados de la imagen de un QR, o `null`. */
  imagenDeQr(qrPath: string): Promise<ImagenValidada | null>;

  guardarAjustes(cambios: CambiosDeAjustesDeCobro): Promise<ResultadoDeOperacion<void>>;

  /**
   * Crea o actualiza el QR general o el de un plan. `tenantId` (del perfil de la
   * sesión) solo construye la ruta de la imagen; la base comprueba que coincide.
   */
  guardarQr(tenantId: string, datos: DatosDeQrDeCobro, imagen: ImagenValidada | null): Promise<ResultadoDeOperacion<void>>;

  eliminarQr(id: string): Promise<ResultadoDeOperacion<void>>;
}
