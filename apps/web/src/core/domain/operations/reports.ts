/**
 * CAPA: Domain / Operations
 *
 * Catálogo de reportes.
 *
 * El catálogo es DATO, no código repartido por las rutas: añadir un reporte es
 * añadir una entrada aquí, y la navegación, el título, los filtros que ofrece,
 * el gráfico, la exportación y la guarda de permiso salen solos. Es la misma
 * regla del enlatado aplicada dentro del producto (§1).
 *
 * V2.2 LO VUELVE HÍBRIDO. Cada reporte declara QUÉ filtros admite —periodo,
 * estado, plan, método, rol, búsqueda— y la pantalla solo ofrece esos. Un
 * filtro de «rol» en el reporte de pagos no significa nada, y ofrecerlo haría
 * pensar que el reporte está vacío por culpa del filtro.
 */

import type { PresetDePeriodo } from './periodo';

export type ClaveDeReporte =
  | 'asistencia'
  | 'asistencia-por-socio'
  | 'membresias'
  | 'vencimientos'
  | 'pagos'
  | 'ingresos-por-plan'
  | 'comprobantes'
  | 'clientes'
  | 'usuarios';

export type TipoDeFiltro =
  | 'periodo'
  | 'estado-membresia'
  | 'estado-comprobante'
  | 'estado-socio'
  | 'plan'
  | 'metodo-pago'
  | 'metodo-asistencia'
  | 'origen'
  | 'rol'
  | 'busqueda';

export type CategoriaDeReporte = 'operacion' | 'dinero' | 'personas';

export const NOMBRE_DE_CATEGORIA: Readonly<Record<CategoriaDeReporte, string>> = {
  operacion: 'Operación',
  dinero: 'Dinero',
  personas: 'Personas',
};

/** Nombres de icono. Coinciden con el set de la capa de presentación. */
export type IconoDeReporte =
  | 'calendar'
  | 'layers'
  | 'star'
  | 'group'
  | 'clock'
  | 'receipt'
  | 'chart'
  | 'user'
  | 'wallet';

export interface FiltroDeReporte {
  readonly desde?: string;
  readonly hasta?: string;
  readonly estado?: string;
  readonly planId?: string;
  readonly metodo?: string;
  readonly origen?: string;
  readonly rol?: string;
  readonly q?: string;
}

export interface ColumnaDeReporte {
  readonly clave: string;
  readonly titulo: string;
  /** Alinea a la derecha: importes y conteos se leen mejor así. */
  readonly numerica?: boolean;
  /** Se suma en la fila de totales y en el resumen de cabecera. */
  readonly sumable?: boolean;
  /** Se formatea como importe. */
  readonly moneda?: boolean;
}

export interface GraficoDeReporte {
  readonly titulo: string;
  /** Columna por la que se agrupa (el eje de categorías). */
  readonly agruparPor: string;
  /** Columna numérica que se suma; sin ella, se cuentan filas. */
  readonly medida?: string;
  /** `etiqueta` para series de fechas; `valor` para rankings. */
  readonly orden: 'etiqueta' | 'valor';
}

export interface DefinicionDeReporte {
  readonly clave: ClaveDeReporte;
  readonly titulo: string;
  readonly descripcion: string;
  readonly icono: IconoDeReporte;
  readonly categoria: CategoriaDeReporte;
  /** Permiso mínimo para verlo, además de `reports.read`. */
  readonly permiso: string;
  readonly filtros: readonly TipoDeFiltro[];
  readonly columnas: readonly ColumnaDeReporte[];
  readonly grafico?: GraficoDeReporte;
  /** Periodo con el que se abre si no se eligió otro. */
  readonly periodoPorDefecto?: PresetDePeriodo;
}

export const REPORTES: readonly DefinicionDeReporte[] = [
  {
    clave: 'asistencia',
    titulo: 'Asistencia',
    descripcion: 'Cada entrada registrada, con socio, fecha, hora y método.',
    icono: 'calendar',
    categoria: 'operacion',
    permiso: 'attendance.read',
    filtros: ['periodo', 'metodo-asistencia', 'plan', 'busqueda'],
    periodoPorDefecto: '30d',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha' },
      { clave: 'hora', titulo: 'Hora' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'metodo', titulo: 'Método' },
    ],
    grafico: { titulo: 'Entradas por día', agruparPor: 'fecha', orden: 'etiqueta' },
  },
  {
    clave: 'asistencia-por-socio',
    titulo: 'Constancia por socio',
    descripcion: 'Cuántas veces vino cada socio en el periodo y cuánto hace de su última visita.',
    icono: 'chart',
    categoria: 'operacion',
    permiso: 'attendance.read',
    filtros: ['periodo', 'plan', 'estado-membresia', 'busqueda'],
    periodoPorDefecto: '30d',
    columnas: [
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'visitas', titulo: 'Visitas', numerica: true, sumable: true },
      { clave: 'ultima', titulo: 'Última visita' },
      { clave: 'dias', titulo: 'Días sin venir', numerica: true },
    ],
    grafico: { titulo: 'Socios con más visitas', agruparPor: 'socio', medida: 'visitas', orden: 'valor' },
  },
  {
    clave: 'membresias',
    titulo: 'Membresías',
    descripcion: 'Membresías vendidas, su vigencia y su estado real a hoy.',
    icono: 'layers',
    categoria: 'dinero',
    permiso: 'memberships.read',
    filtros: ['periodo', 'estado-membresia', 'plan', 'busqueda'],
    columnas: [
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'inicio', titulo: 'Inicio' },
      { clave: 'fin', titulo: 'Fin' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'precio', titulo: 'Precio', numerica: true, sumable: true, moneda: true },
    ],
    grafico: { titulo: 'Membresías por plan', agruparPor: 'plan', orden: 'valor' },
  },
  {
    clave: 'vencimientos',
    titulo: 'Vencimientos',
    descripcion: 'Membresías que vencen o vencieron en los últimos y próximos 30 días: a quién llamar.',
    icono: 'clock',
    categoria: 'operacion',
    permiso: 'memberships.read',
    filtros: ['estado-membresia', 'plan', 'busqueda'],
    columnas: [
      { clave: 'fin', titulo: 'Vence' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'dias', titulo: 'Días', numerica: true },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'telefono', titulo: 'Teléfono' },
    ],
    grafico: { titulo: 'Vencimientos por estado', agruparPor: 'estado', orden: 'valor' },
  },
  {
    clave: 'pagos',
    titulo: 'Pagos',
    descripcion: 'Cobros registrados, con importe, método, plan y fecha.',
    icono: 'star',
    categoria: 'dinero',
    permiso: 'payments.read',
    filtros: ['periodo', 'metodo-pago', 'plan', 'busqueda'],
    periodoPorDefecto: 'mes',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'metodo', titulo: 'Método' },
      { clave: 'importe', titulo: 'Importe', numerica: true, sumable: true, moneda: true },
      { clave: 'nota', titulo: 'Nota' },
    ],
    grafico: { titulo: 'Ingresos por día', agruparPor: 'fecha', medida: 'importe', orden: 'etiqueta' },
  },
  {
    clave: 'ingresos-por-plan',
    titulo: 'Ingresos por plan',
    descripcion: 'Qué plan deja más dinero: cobros, total y ticket promedio en el periodo.',
    icono: 'wallet',
    categoria: 'dinero',
    permiso: 'payments.read',
    filtros: ['periodo', 'metodo-pago'],
    periodoPorDefecto: 'mes',
    columnas: [
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'cobros', titulo: 'Cobros', numerica: true, sumable: true },
      { clave: 'total', titulo: 'Total', numerica: true, sumable: true, moneda: true },
      { clave: 'promedio', titulo: 'Ticket promedio', numerica: true, moneda: true },
    ],
    grafico: { titulo: 'Total por plan', agruparPor: 'plan', medida: 'total', orden: 'valor' },
  },
  {
    clave: 'comprobantes',
    titulo: 'Comprobantes',
    descripcion: 'Comprobantes de pago por QR: quién, cuánto, cuándo y en qué quedó cada uno.',
    icono: 'receipt',
    categoria: 'dinero',
    permiso: 'payments.read',
    filtros: ['periodo', 'estado-comprobante', 'origen', 'plan', 'busqueda'],
    periodoPorDefecto: '7d',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha' },
      { clave: 'hora', titulo: 'Hora' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'importe', titulo: 'Importe', numerica: true, sumable: true, moneda: true },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'origen', titulo: 'Origen' },
    ],
    grafico: { titulo: 'Comprobantes por estado', agruparPor: 'estado', orden: 'valor' },
  },
  {
    clave: 'clientes',
    titulo: 'Clientes',
    descripcion: 'Padrón de socios con su plan, su estado y sus datos de contacto.',
    icono: 'group',
    categoria: 'personas',
    permiso: 'customers.read',
    filtros: ['estado-socio', 'estado-membresia', 'plan', 'busqueda'],
    columnas: [
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'socio', titulo: 'Socio' },
      { clave: 'plan', titulo: 'Plan' },
      { clave: 'membresia', titulo: 'Membresía' },
      { clave: 'telefono', titulo: 'Teléfono' },
      { clave: 'correo', titulo: 'Correo' },
      { clave: 'estado', titulo: 'Estado' },
    ],
    grafico: { titulo: 'Socios por plan', agruparPor: 'plan', orden: 'valor' },
  },
  {
    clave: 'usuarios',
    titulo: 'Usuarios y roles',
    descripcion: 'Cuentas del gimnasio con su rol: quién puede entrar al sistema y con qué alcance.',
    icono: 'user',
    categoria: 'personas',
    permiso: 'users.read',
    filtros: ['rol', 'busqueda'],
    columnas: [
      { clave: 'nombre', titulo: 'Nombre' },
      { clave: 'correo', titulo: 'Correo' },
      { clave: 'rol', titulo: 'Rol' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'alta', titulo: 'Alta' },
    ],
    grafico: { titulo: 'Cuentas por rol', agruparPor: 'rol', orden: 'valor' },
  },
];

export function reportePorClave(clave: string): DefinicionDeReporte | undefined {
  return REPORTES.find((reporte) => reporte.clave === clave);
}

export function reportesDisponibles(permisos: readonly string[]): readonly DefinicionDeReporte[] {
  return REPORTES.filter((reporte) => permisos.includes(reporte.permiso));
}

export type FilaDeReporte = Readonly<Record<string, string | number | null>>;

export interface ResumenDeReporte {
  readonly registros: number;
  readonly totales: readonly { readonly titulo: string; readonly valor: number; readonly moneda: boolean }[];
}

export function resumirReporte(
  definicion: DefinicionDeReporte,
  filas: readonly FilaDeReporte[],
): ResumenDeReporte {
  const totales = definicion.columnas
    .filter((columna) => columna.sumable)
    .map((columna) => ({
      titulo: columna.titulo,
      moneda: Boolean(columna.moneda),
      valor: filas.reduce((suma, fila) => {
        const valor = fila[columna.clave];
        return suma + (typeof valor === 'number' && Number.isFinite(valor) ? valor : 0);
      }, 0),
    }));
  return { registros: filas.length, totales };
}

/**
 * Serie del gráfico de un reporte, calculada de las MISMAS filas que la tabla.
 *
 * No se pide a la base una serie aparte: si la tabla y el gráfico salieran de
 * dos consultas, un filtro aplicado a una y olvidado en la otra enseñaría un
 * gráfico que contradice a la tabla que tiene debajo.
 */
export function serieDeReporte(
  definicion: DefinicionDeReporte,
  filas: readonly FilaDeReporte[],
  maximo = 20,
): readonly { readonly etiqueta: string; readonly valor: number }[] {
  const grafico = definicion.grafico;
  if (!grafico) return [];

  const acumulado = new Map<string, number>();
  for (const fila of filas) {
    const bruto = fila[grafico.agruparPor];
    const etiqueta = bruto === null || bruto === undefined || bruto === '' ? 'Sin dato' : String(bruto);
    const medida = grafico.medida ? fila[grafico.medida] : 1;
    const valor = typeof medida === 'number' && Number.isFinite(medida) ? medida : 0;
    acumulado.set(etiqueta, (acumulado.get(etiqueta) ?? 0) + valor);
  }

  const puntos = [...acumulado.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor }));
  if (grafico.orden === 'etiqueta') {
    puntos.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
    return puntos.slice(-maximo);
  }
  puntos.sort((a, b) => b.valor - a.valor);
  return puntos.slice(0, maximo);
}

/**
 * Serializa a CSV.
 *
 * Cita SIEMPRE todos los campos y duplica las comillas internas. Un nombre con
 * coma —«Pérez, Juan»— parte la fila en dos columnas si no se cita, y el
 * reporte llega a la hoja de cálculo desalineado sin que nadie lo note.
 *
 * Antepone además el BOM de UTF-8: sin él, Excel en Windows abre el archivo con
 * la página de códigos del sistema y «Mamani Quispe» sale con los acentos
 * rotos. Es el detalle que decide si el reporte se usa o se descarta.
 *
 * Neutraliza también la inyección de fórmulas: una celda que empieza por `=`,
 * `+`, `-` o `@` la ejecuta Excel como fórmula. Una nota de pago escrita como
 * `=HYPERLINK(...)` se convertiría en un enlace malicioso en la hoja del
 * gerente. Se antepone un apóstrofo, que Excel muestra como texto.
 */
export function aCsv(
  columnas: readonly ColumnaDeReporte[],
  filas: readonly FilaDeReporte[],
): string {
  const escapar = (valor: string | number | null | undefined): string => {
    let texto = valor === null || valor === undefined ? '' : String(valor);
    if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replace(/"/g, '""')}"`;
  };

  const cabecera = columnas.map((columna) => escapar(columna.titulo)).join(',');
  const cuerpo = filas.map((fila) => columnas.map((columna) => escapar(fila[columna.clave])).join(','));

  return `﻿${[cabecera, ...cuerpo].join('\r\n')}\r\n`;
}
