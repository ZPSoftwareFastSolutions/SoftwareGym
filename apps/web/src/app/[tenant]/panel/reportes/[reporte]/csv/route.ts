/**
 * CAPA: Presentation / App — descarga de un reporte en CSV.
 *
 * Es un Route Handler y no una acción de servidor porque devuelve un archivo:
 * hace falta poner `Content-Type` y `Content-Disposition`.
 *
 * LAS MISMAS GUARDAS QUE LA PÁGINA, y los MISMOS filtros leídos con la misma
 * función (`_filtros.ts`). Una ruta que devuelve datos en crudo es justo la que
 * se prueba a mano: si la página comprobara el permiso y esta no, bastaría con
 * añadir `/csv` a la URL. Y si leyeran los filtros distinto, el CSV no
 * coincidiría con la tabla que se estaba mirando.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { aCsv, reportePorClave } from '@core/domain/operations/reports';
import { PERMISO, espacioDeTrabajo, tienePermiso } from '@core/domain/operations/workspace';
import {
  operationsRepository,
  reportsRepository,
  tenantRepository,
} from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { getAuthenticatedUser } from '@infra/auth/supabase.server';
import { leerFiltros } from '../../_filtros';

interface Contexto {
  readonly params: Promise<{ tenant: string; reporte: string }>;
}

export async function GET(peticion: Request, { params }: Contexto) {
  const { tenant: slugCrudo, reporte: clave } = await params;

  const definicion = reportePorClave(clave);
  if (!definicion) return new NextResponse('Reporte no encontrado', { status: 404 });

  const tenant = await getTenantBySlug(tenantRepository(), slugCrudo.trim().toLowerCase());
  // Las mismas capacidades que exige la página. Un gimnasio sin reportes
  // contratados no tiene esta ruta, ni siquiera para quien tendría permiso.
  if (
    !tenant ||
    tenant.features.memberLogin !== true ||
    tenant.features.enableReports !== true ||
    (definicion.capacidad !== undefined && tenant.features[definicion.capacidad] !== true)
  ) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  if (!isSupabaseConfigured()) return new NextResponse('No disponible', { status: 503 });

  const usuario = await getAuthenticatedUser();
  if (!usuario) return new NextResponse('Sin sesión', { status: 401 });

  const repo = await operationsRepository();
  const perfil = await repo.perfil();

  // Sin perfil, de otro gimnasio, sin reportes o sin el permiso del reporte:
  // la misma respuesta en los cuatro casos. Distinguirlos convertiría esta ruta
  // en un mapa de qué existe y quién es quién.
  const autorizado =
    perfil !== null &&
    perfil.tenantSlug === tenant.slug &&
    espacioDeTrabajo(perfil) === 'gimnasio' &&
    tienePermiso(perfil, PERMISO.verReportes) &&
    tienePermiso(perfil, definicion.permiso);

  if (!autorizado) return new NextResponse('No autorizado', { status: 403 });

  const hoy = await repo.hoyDelGimnasio(tenant.slug);
  const parametros = Object.fromEntries(new URL(peticion.url).searchParams.entries());
  const { filtro, rango } = leerFiltros(definicion, parametros, hoy);

  const filas = await (await reportsRepository()).filas(definicion.clave, filtro, hoy);
  const csv = aCsv(definicion.columnas, filas);

  const periodo =
    rango.desde && rango.hasta
      ? rango.desde === rango.hasta
        ? `_${rango.desde}`
        : `_${rango.desde}_a_${rango.hasta}`
      : '';
  const nombre = `${tenant.slug}-${definicion.clave}${periodo || `_${hoy}`}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // Comillas alrededor del nombre: sin ellas, un guion o un espacio cortan
      // la cabecera y el archivo se descarga como «download».
      'Content-Disposition': `attachment; filename="${nombre}"`,
      // Una foto del momento. En una caché compartida podría servir las cifras
      // de un gimnasio a otro.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
