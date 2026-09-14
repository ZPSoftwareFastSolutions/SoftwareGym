/**
 * CAPA: Presentation / App — qué secciones del panel le corresponden a quien entra.
 *
 * Vivía dentro del layout. V4 lo saca aquí porque lo usan dos pantallas: la
 * navegación y el resumen de Administración, que muestra los mismos módulos como
 * tarjetas. Una sola lista evita que un módulo aparezca en una y no en la otra.
 *
 * Dos condiciones por entrada, y las dos hacen falta: la capacidad tiene que
 * estar CONTRATADA por el gimnasio y la persona tiene que tener PERMISO. Una flag
 * apagada no es «esta persona no puede», es «este gimnasio no lo compró», y por
 * eso la ruta responde 404 y no un aviso de permisos.
 *
 * NO es control de acceso: cada ruta vuelve a exigir su permiso y RLS decide.
 */

import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import {
  PERMISO,
  SEGMENTO_DE_ESPACIO,
  espacioDeTrabajo,
  tienePermiso,
  type PerfilOperativo,
} from '@core/domain/operations/workspace';
import { tenantHref } from '@/lib/tenant-links';
import type { EntradaDePanel } from '@/presentation/patterns/DashboardNav';

export interface OpcionesDeNavegacion {
  /** Comprobantes por revisar: solo se consulta si la pestaña va a existir. */
  readonly contarPendientes?: () => Promise<number>;
}

export async function entradasDelPanel(
  tenant: TenantConfig,
  perfil: PerfilOperativo,
  opciones: OpcionesDeNavegacion = {},
): Promise<EntradaDePanel[]> {
  const { slug, features } = tenant;
  const espacio = espacioDeTrabajo(perfil);
  const puede = (permiso: string) => tienePermiso(perfil, permiso);

  const entradas: EntradaDePanel[] = [
    {
      href: tenantHref(slug, SEGMENTO_DE_ESPACIO[espacio]),
      etiqueta: espacio === 'socio' ? 'Mi panel' : espacio === 'entrenador' ? 'Mis socios' : espacio === 'administracion' ? 'Administración' : 'Resumen',
      icono: espacio === 'entrenador' ? 'trainer' : espacio === 'administracion' ? 'key' : 'layers',
      grupo: 'inicio',
    },
  ];

  // Un entrenador que además es socio del gimnasio sigue viendo su membresía.
  if (espacio === 'entrenador' && perfil.customerId) {
    entradas.push({ href: tenantHref(slug, 'panel/socio'), etiqueta: 'Mi membresía', icono: 'idcard', grupo: 'socios' });
  }

  const esPersonal = espacio === 'gimnasio' || espacio === 'administracion';

  // Administración entra a su resumen; la operación del día (mostrador, series,
  // vencimientos) sigue siendo el dashboard del gimnasio.
  if (espacio === 'administracion') {
    entradas.push({ href: tenantHref(slug, 'panel/gimnasio'), etiqueta: 'Operación del día', icono: 'layers', grupo: 'dia' });
  }

  if (features.enableAttendance && puede(PERMISO.verAsistencia)) {
    entradas.push({ href: tenantHref(slug, 'panel/asistencia'), etiqueta: 'Asistencia', icono: 'calendar', grupo: 'dia' });
  }

  // Clases (V3.3): recepción y el instructor toman asistencia desde aquí; el
  // socio ve las suyas en su propio panel, no en esta agenda.
  if ((esPersonal || espacio === 'entrenador') && features.enableClasses && puede(PERMISO.verClases)) {
    entradas.push({ href: tenantHref(slug, 'panel/clases'), etiqueta: 'Clases', icono: 'clock', grupo: 'dia' });
  }

  if (esPersonal && features.enablePayments && puede(PERMISO.verPagos)) {
    // El contador sale de una consulta de solo cabeceras (`count`, sin filas):
    // la pestaña avisa de que hay trabajo sin traerse los comprobantes.
    const pendientes = opciones.contarPendientes ? await opciones.contarPendientes() : undefined;
    entradas.push({
      href: tenantHref(slug, 'panel/comprobantes'),
      etiqueta: 'Comprobantes',
      icono: 'receipt',
      grupo: 'dia',
      ...(pendientes !== undefined ? { insignia: pendientes } : {}),
    });
  }

  if (esPersonal && features.enableMemberManagement && puede(PERMISO.verSocios)) {
    entradas.push({ href: tenantHref(slug, 'panel/socios'), etiqueta: 'Socios', icono: 'group', grupo: 'socios' });
  }

  // Alguien del personal que además entrena socios (recepción con perfil de
  // entrenador, por ejemplo) llega a su lista desde aquí.
  if (esPersonal && features.enableTrainers && puede(PERMISO.trabajarComoEntrenador)) {
    entradas.push({ href: tenantHref(slug, 'panel/entrenador'), etiqueta: 'Mis socios', icono: 'user', grupo: 'socios' });
  }

  // Las rutinas las ven el personal y también el entrenador desde su espacio:
  // es su herramienta de trabajo, no una pantalla de gerencia.
  if ((esPersonal || espacio === 'entrenador') && features.enableRoutines && puede(PERMISO.verRutinas)) {
    entradas.push({ href: tenantHref(slug, 'panel/rutinas'), etiqueta: 'Rutinas', icono: 'layers', grupo: 'entrenamiento' });
  }

  if (esPersonal && features.enableExercises && puede(PERMISO.verEjercicios)) {
    entradas.push({ href: tenantHref(slug, 'panel/ejercicios'), etiqueta: 'Ejercicios', icono: 'dumbbell', grupo: 'entrenamiento' });
  }

  if (esPersonal && features.enableTrainers && puede(PERMISO.verEntrenadores)) {
    entradas.push({ href: tenantHref(slug, 'panel/entrenadores'), etiqueta: 'Entrenadores', icono: 'trainer', grupo: 'entrenamiento' });
  }

  if (esPersonal && features.enableRoutines && puede(PERMISO.verMetricasDeEntrenamiento)) {
    entradas.push({ href: tenantHref(slug, 'panel/entrenamiento'), etiqueta: 'Métricas', icono: 'chart', grupo: 'entrenamiento' });
  }

  if (features.enableReports && puede(PERMISO.verReportes)) {
    entradas.push({ href: tenantHref(slug, 'panel/reportes'), etiqueta: 'Reportes', icono: 'chart', grupo: 'gestion' });
  }

  if (esPersonal && features.enableMultiBranch && puede(PERMISO.gestionarSucursales)) {
    entradas.push({ href: tenantHref(slug, 'panel/sucursales'), etiqueta: 'Sucursales', icono: 'pin', grupo: 'gestion' });
  }

  if (esPersonal && features.enablePayments && puede(PERMISO.configurar)) {
    entradas.push({ href: tenantHref(slug, 'panel/cobros'), etiqueta: 'Cobro QR', icono: 'qr', grupo: 'gestion' });
  }

  // V4: personal y roles. Lo ve quien lee cuentas del gimnasio; qué puede tocar
  // lo decide la jerarquía de roles en la base.
  if (esPersonal && puede(PERMISO.verUsuarios)) {
    entradas.push({ href: tenantHref(slug, 'panel/personal'), etiqueta: 'Personal y roles', icono: 'key', grupo: 'gestion' });
  }

  return entradas;
}
