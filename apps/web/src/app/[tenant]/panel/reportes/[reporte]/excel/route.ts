/**
 * CAPA: Presentation / App — descarga de un reporte en Excel (XLSX).
 *
 * Devuelve un archivo de Excel real generado en servidor usando exceljs,
 * aplicando colores corporativos, formatos de celdas numéricas y
 * redimensionamiento automático.
 */

import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@core/application/tenant/get-tenant.usecase';
import { reportePorClave } from '@core/domain/operations/reports';
import { PERMISO, espacioDeTrabajo, tienePermiso } from '@core/domain/operations/workspace';
import {
  operationsRepository,
  reportsRepository,
  tenantRepository,
} from '@infra/config/composition-root';
import { isSupabaseConfigured } from '@infra/auth/supabase.config';
import { getAuthenticatedUser } from '@infra/auth/supabase.server';
import { leerFiltros } from '../../_filtros';
import ExcelJS from 'exceljs';

interface Contexto {
  readonly params: Promise<{ tenant: string; reporte: string }>;
}

export async function GET(peticion: Request, { params }: Contexto) {
  const { tenant: slugCrudo, reporte: clave } = await params;

  const definicion = reportePorClave(clave);
  if (!definicion) return new NextResponse('Reporte no encontrado', { status: 404 });

  const tenant = await getTenantBySlug(tenantRepository(), slugCrudo.trim().toLowerCase());
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

  // Crear Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = tenant.name;
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet(definicion.titulo);

  // Cabeceras
  sheet.columns = definicion.columnas.map(col => ({
    header: col.titulo,
    key: col.clave,
    width: Math.max(col.titulo.length + 5, 15) // Ajuste inicial
  }));

  // Estilo a la fila de cabecera
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD4AF37' } // Dorado corporativo
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Filas
  for (const fila of filas) {
    const valores: Record<string, any> = {};
    for (const col of definicion.columnas) {
      let valor = fila[col.clave];
      if (valor === null || valor === undefined) valor = '';
      // Si es moneda, asegurarse de pasarlo como número (se espera que lo sea en la BD, o se convierte)
      if (col.moneda && typeof valor === 'number') {
        valores[col.clave] = valor;
      } else {
        valores[col.clave] = valor;
      }
    }
    const row = sheet.addRow(valores);
    
    // Aplicar formatos a las celdas añadidas
    row.eachCell((cell: any, colNumber: number) => {
      const colDef = definicion.columnas[colNumber - 1];
      if (colDef?.moneda) {
        cell.numFmt = '"Bs" #,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if (colDef?.numerica) {
        cell.alignment = { horizontal: 'right' };
      }
    });
  }

  // Autoajuste final de columnas
  sheet.columns.forEach((column: any, i: number) => {
    const colDef = definicion.columnas[i];
    if (!colDef) return;
    
    let maxLength = colDef.titulo.length;
    
    sheet.getColumn(i + 1).eachCell({ includeEmpty: false }, (cell: any) => {
      // Si es numérico/moneda, el valor crudo es corto (ej: 150) pero formateado es largo ("Bs 150.00")
      let textLength = cell.value ? cell.value.toString().length : 0;
      if (colDef.moneda && typeof cell.value === 'number') {
        textLength += 8; // Espacio extra para el formato de moneda y decimales
      }
      
      if (textLength > maxLength) {
        maxLength = textLength;
      }
    });
    // Limitar el ancho máximo a 50. Para moneda, un mínimo de 12 para que no salga ######
    const widthRaw = Math.min(maxLength + 2, 50);
    column.width = colDef.moneda ? Math.max(widthRaw, 12) : widthRaw;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const periodo =
    rango.desde && rango.hasta
      ? rango.desde === rango.hasta
        ? `_${rango.desde}`
        : `_${rango.desde}_a_${rango.hasta}`
      : '';
  const nombre = `${tenant.slug}-${definicion.clave}${periodo || `_${hoy}`}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
