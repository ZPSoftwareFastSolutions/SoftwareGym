/**
 * CAPA: Application / Ports
 *
 * Puertos de sucursales (V3.0).
 *
 * Dos puertos y no uno, porque tienen dos audiencias distintas:
 *
 * - `BranchesRepositoryPort` va con la SESIÓN de quien pregunta. Igual que el
 *   resto de repositorios operativos, no recibe «quién» ni «qué gimnasio»:
 *   eso sale de la sesión y lo aplica RLS.
 * - `PublicBranchesPort` va SIN sesión, para la vitrina estática. Solo puede
 *   ver lo que la política pública deja: sedes activas y sus datos de puerta.
 *
 * Mezclarlos invitaría a usar el cliente con cookies en una página estática,
 * y eso la sacaría del CDN.
 */

import type {
  DatosDeSucursal,
  IndicadoresDeSucursal,
  PersonalDeSucursales,
  Sucursal,
  SucursalOperable,
} from '../../domain/operations/branches';
import type { ResultadoDeOperacion } from './resultado';

export interface SerieDiariaDeSucursal {
  /** `null` = histórico sin sede. */
  readonly branchId: string | null;
  readonly dia: string;
  readonly visitas: number;
  readonly socios: number;
}

export interface BranchesRepositoryPort {
  /** Todas las sedes del gimnasio de la sesión, activas e inactivas. */
  listar(): Promise<readonly Sucursal[]>;

  porId(id: string): Promise<Sucursal | null>;

  /** Sedes del gimnasio y si la sesión puede operar en cada una. */
  misSucursales(): Promise<readonly SucursalOperable[]>;

  /** Indicadores de actividad por sede, con «hoy» del gimnasio. */
  indicadores(): Promise<readonly IndicadoresDeSucursal[]>;

  /** Serie diaria por sede de los últimos `dias`. */
  serieDiaria(dias: number): Promise<readonly SerieDiariaDeSucursal[]>;

  /** `tenantId` sale del perfil de la sesión, nunca del formulario. RLS lo vuelve a exigir. */
  crear(tenantId: string, datos: DatosDeSucursal): Promise<ResultadoDeOperacion<{ readonly id: string }>>;

  actualizar(id: string, datos: DatosDeSucursal): Promise<ResultadoDeOperacion<null>>;

  /** Activar o desactivar. Nunca se borra una sede: tiene historia. */
  cambiarEstado(id: string, activa: boolean): Promise<ResultadoDeOperacion<null>>;

  establecerPrimaria(id: string): Promise<ResultadoDeOperacion<null>>;

  /** Personal del gimnasio (cuentas que no son solo de socio) con sus sedes asignadas. */
  personal(): Promise<readonly PersonalDeSucursales[]>;

  asignar(tenantId: string, appUserId: string, branchId: string): Promise<ResultadoDeOperacion<null>>;

  retirar(appUserId: string, branchId: string): Promise<ResultadoDeOperacion<null>>;

  /** Deja constancia de un cambio de sede de trabajo. Si falla, no bloquea el cambio. */
  auditarCambioDeSucursal(tenantId: string, sucursal: Pick<Sucursal, 'id' | 'code'>): Promise<void>;
}

export interface PublicBranchesPort {
  /** Sedes activas de un gimnasio, para la vitrina. Vacío si no hay o si la base no responde. */
  sucursalesPublicas(tenantSlug: string): Promise<readonly Sucursal[]>;
}
