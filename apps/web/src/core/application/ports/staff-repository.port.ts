/**
 * CAPA: Application / Ports
 *
 * Puerto de personal y roles (V4).
 *
 * Como todos los puertos de datos, NO autoriza: no recibe quién pregunta. Que un
 * gerente no pueda nombrar administradores no está escrito aquí, sino en
 * `roles.level` y en las políticas de `user_roles` de la base.
 */

import type {
  CuentaDelGimnasio,
  EventoAdministrativo,
  FiltroDeCuentas,
  ResumenDePersonal,
} from '../../domain/operations/staff';
import type { RolDeGimnasio } from '../../domain/operations/workspace';
import type { Pagina } from '../../domain/shared/paginacion';
import type { ResultadoDeOperacion } from './resultado';

export interface StaffRepositoryPort {
  cuentas(filtro: { readonly vista: FiltroDeCuentas; readonly q?: string }, pagina: number, porPagina: number): Promise<Pagina<CuentaDelGimnasio>>;

  resumen(): Promise<ResumenDePersonal>;

  /** Últimos cambios administrativos del gimnasio (`audit_log`), si quien pregunta puede leerlos. */
  actividad(limite: number): Promise<readonly EventoAdministrativo[]>;

  otorgarRol(cuentaId: string, rol: RolDeGimnasio): Promise<ResultadoDeOperacion<void>>;

  retirarRol(cuentaId: string, rol: RolDeGimnasio): Promise<ResultadoDeOperacion<void>>;

  cambiarEstado(cuentaId: string, activa: boolean): Promise<ResultadoDeOperacion<void>>;

  /** Plataforma: da el rol de administrador a una cuenta ya registrada en ese gimnasio. */
  designarAdministrador(tenantId: string, correo: string): Promise<ResultadoDeOperacion<void>>;
}
