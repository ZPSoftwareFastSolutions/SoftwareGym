/**
 * CAPA: Domain / Operations
 *
 * Catálogo de reportes.
 *
 * El catálogo es DATO, no código repartido por las rutas: añadir un reporte
 * es añadir una entrada aquí, y la navegación, el título, la exportación y la
 * guarda de permiso salen solos. Es la misma regla del enlatado aplicada
 * dentro del producto (§1).
 */

export type ClaveDeReporte =
  | 'asistencia'
  | 'membresias'
  | 'pagos'
  | 'clientes'
  | 'vencimientos';

export interface ColumnaDeReporte {
  readonly clave: string;
  readonly titulo: string;
  /** Alinea a la derecha: importes y conteos se leen mejor así. */
  readonly numerica?: boolean;
}

export interface DefinicionDeReporte {
  readonly clave: ClaveDeReporte;
  readonly titulo: string;
  readonly descripcion: string;
  readonly icono: 'calendar' | 'layers' | 'star' | 'group' | 'clock';
  /** Permiso mínimo para verlo, además de `reports.read`. */
  readonly permiso: string;
  readonly columnas: readonly ColumnaDeReporte[];
}

export const REPORTES: readonly DefinicionDeReporte[] = [
  {
    clave: 'asistencia',
    titulo: 'Asistencia',
    descripcion: 'Entradas registradas, con socio, fecha, hora y método.',
    icono: 'calendar',
    permiso: 'attendance.read',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha' },
      { clave: 'hora', titulo: 'Hora' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'metodo', titulo: 'Método' },
    ],
  },
  {
    clave: 'membresias',
    titulo: 'Membresías',
    descripcion: 'Membresías vendidas, su vigencia y su estado real a hoy.',
    icono: 'layers',
    permiso: 'memberships.read',
    columnas: [
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'inicio', titulo: 'Inicio' },
      { clave: 'fin', titulo: 'Fin' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'precio', titulo: 'Precio', numerica: true },
    ],
  },
  {
    clave: 'pagos',
    titulo: 'Pagos',
    descripcion: 'Cobros registrados, con importe, método y fecha.',
    icono: 'star',
    permiso: 'payments.read',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'importe', titulo: 'Importe', numerica: true },
      { clave: 'metodo', titulo: 'Método' },
      { clave: 'nota', titulo: 'Nota' },
    ],
  },
  {
    clave: 'clientes',
    titulo: 'Clientes',
    descripcion: 'Padrón de socios con su estado y sus datos de contacto.',
    icono: 'group',
    permiso: 'customers.read',
    columnas: [
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'documento', titulo: 'Documento' },
      { clave: 'telefono', titulo: 'Teléfono' },
      { clave: 'correo', titulo: 'Correo' },
      { clave: 'estado', titulo: 'Estado' },
    ],
  },
  {
    clave: 'vencimientos',
    titulo: 'Vencimientos',
    descripcion: 'Membresías que vencen o vencieron en los últimos y próximos 30 días.',
    icono: 'clock',
    permiso: 'memberships.read',
    columnas: [
      { clave: 'fin', titulo: 'Vence' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'dias', titulo: 'Días', numerica: true },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'telefono', titulo: 'Teléfono' },
    ],
  },
];

export function reportePorClave(clave: string): DefinicionDeReporte | undefined {
  return REPORTES.find((reporte) => reporte.clave === clave);
}

export function reportesDisponibles(
  permisos: readonly string[],
): readonly DefinicionDeReporte[] {
  return REPORTES.filter((reporte) => permisos.includes(reporte.permiso));
}

export type FilaDeReporte = Readonly<Record<string, string | number | null>>;

/**
 * Serializa a CSV.
 *
 * Cita SIEMPRE todos los campos y duplica las comillas internas. Un nombre
 * con coma —«Pérez, Juan»— parte la fila en dos columnas si no se cita, y el
 * reporte llega a la hoja de cálculo desalineado sin que nadie lo note.
 *
 * Antepone además el BOM de UTF-8: sin él, Excel en Windows abre el archivo
 * con la página de códigos del sistema y «Mamani Quispe» sale con los acentos
 * rotos. Es el detalle que decide si el reporte se usa o se descarta.
 */
export function aCsv(
  columnas: readonly ColumnaDeReporte[],
  filas: readonly FilaDeReporte[],
): string {
  const escapar = (valor: string | number | null | undefined): string => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    return `"${texto.replace(/"/g, '""')}"`;
  };

  const cabecera = columnas.map((columna) => escapar(columna.titulo)).join(',');
  const cuerpo = filas.map((fila) =>
    columnas.map((columna) => escapar(fila[columna.clave])).join(','),
  );

  return `﻿${[cabecera, ...cuerpo].join('\r\n')}\r\n`;
}
