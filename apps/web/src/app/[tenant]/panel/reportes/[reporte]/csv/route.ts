/**
 * CAPA: Presentation / App — descarga de un reporte en CSV.
 *
 * Es un Route Handler y no una acción de servidor porque lo que devuelve es
 * un archivo, no una página: hace falta poner `Content-Type` y
 * `Content-Disposition`, y eso una acción no lo hace.
 *
 * LAS MISMAS GUARDAS QUE LA PÁGINA, Y NO POR DUPLICARLAS POR GUSTO. Una ruta que
 * devuelve datos en crudo es justo la que se prueba a mano: si la página
 * comprobara el permiso y esta no, bastaría con escribir `/csv` al final de
 * la URL para saltarse la comprobación. Por debajo sigue estando RLS, que le
 * devolvería cero filas, pero una defensa no se apoya en la siguiente.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { aCsv, reportePorClave } from '@core/domain/operations/reports';
import { PERMISO, espacioDeTrabajo, tienePermiso } from '@core/domain/operations/workspace';
import { operationsRepository, tenantRepository } from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { getAuthenticatedUser } from '@infra/auth/supabase.server';

interface Contexto {
  readonly params: Promise<{ tenant: string; reporte: string }>;
}

export async function GET(_peticion: Request, { params }: Contexto) {
  const { tenant: slugCrudo, reporte: clave } = await params;

  const definicion = reportePorClave(clave);
  if (!definicion) return new NextResponse('Reporte no encontrado', { status: 404 });

  const tenant = await getTenantBySlug(tenantRepository(), slugCrudo.trim().toLowerCase());
  // Las mismas capacidades que exige la página. Un gimnasio sin reportes
  // contratados no tiene esta ruta, ni siquiera para quien tendría permiso.
  if (
    !tenant ||
    tenant.features.memberLogin !== true ||
    tenant.features.enableReports !== true
  ) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  if (!isSupabaseConfigured()) return new NextResponse('No disponible', { status: 503 });

  const usuario = await getAuthenticatedUser();
  if (!usuario) return new NextResponse('Sin sesión', { status: 401 });

  const repo = await operationsRepository();
  const perfil = await repo.perfil();

  // Sin perfil, con perfil de otro gimnasio, sin permiso de reportes o sin el
  // permiso propio del reporte: la misma respuesta en los cuatro casos.
  // Distinguirlas convertiría esta ruta en un mapa de qué existe y quién es
  // quién dentro de la instalación.
  const autorizado =
    perfil !== null &&
    perfil.tenantSlug === tenant.slug &&
    espacioDeTrabajo(perfil) === 'gimnasio' &&
    tienePermiso(perfil, PERMISO.verReportes) &&
    tienePermiso(perfil, definicion.permiso);

  if (!autorizado) return new NextResponse('No autorizado', { status: 403 });

  const filas = await repo.filasDeReporte(definicion.clave);
  const csv = aCsv(definicion.columnas, filas);
  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = `${tenant.slug}-${definicion.clave}-${fecha}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // Las comillas alrededor del nombre importan: sin ellas, un slug con
      // guion o un nombre con espacio corta la cabecera y el archivo se
      // descarga como «download».
      'Content-Disposition': `attachment; filename="${nombre}"`,
      // Un reporte es una foto del momento. Cachearlo serviría cifras viejas
      // a quien lo descargue después, y en una caché compartida podría
      // servir las de otro gimnasio.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
