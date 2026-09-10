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

  revisar(id: string, aprobar: boolean, nota: string | null): Promise<ResultadoDeOperacion<void>>;

  contarPendientes(): Promise<number>;
}

export interface AjustesDeCobro {
  readonly tenantId: string;
  readonly holder: string | null;
  readonly bank: string | null;
  readonly note: string | null;
  readonly expiresOn: string | null;
  readonly qrPath: string | null;
  readonly updatedAt: string | null;
}

export interface CambiosDeAjustesDeCobro {
  readonly holder: string | null;
  readonly bank: string | null;
  readonly note: string | null;
  readonly expiresOn: string | null;
}

export interface PaymentSettingsPort {
  /** Lectura pública: la usa también el visitante anónimo del sitio. */
  porSlug(tenantSlug: string): Promise<AjustesDeCobro | null>;

  /** Imagen pública del QR de cobro, o `null` si el gimnasio no subió ninguna. */
  imagenQr(ajustes: AjustesDeCobro): Promise<ImagenValidada | null>;

  guardar(
    tenantId: string,
    cambios: CambiosDeAjustesDeCobro,
    imagen: ImagenValidada | null,
  ): Promise<ResultadoDeOperacion<void>>;
}
