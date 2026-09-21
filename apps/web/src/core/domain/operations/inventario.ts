/**
 * CAPA: Domain / Operations
 *
 * Inventario de la sucursal (V4.3).
 *
 * Lo que se vende o se presta EN una sede: suplementos, bebidas, ropa,
 * candados. No es el catálogo comercial del sitio (`content.products`, que es
 * texto de vitrina) ni un sistema de ventas: aquí solo vive qué hay, cuánto
 * queda y a qué precio, por sucursal.
 *
 * Todo es puro y sin I/O: las mismas reglas las repite la base (CHECK de
 * `branch_inventory_products`); aquí se adelantan para contestar en la pantalla
 * sin ir al servidor, nunca para decidir.
 */

export interface ProductoDeInventario {
  readonly id: string;
  readonly name: string;
  readonly category: string | null;
  readonly quantity: number;
  readonly price: number;
  readonly updatedAt: string;
}

/** Lo que llega del formulario, tal cual. */
export interface FormularioDeProducto {
  readonly name: string;
  readonly category: string;
  readonly quantity: string;
  readonly price: string;
}

/** Datos ya normalizados, listos para la base. */
export interface DatosDeProducto {
  readonly name: string;
  readonly category: string | null;
  readonly quantity: number;
  readonly price: number;
}

export const LARGO_MAXIMO_DE_NOMBRE = 80;
export const LARGO_MAXIMO_DE_CATEGORIA = 40;
/** Un inventario de mostrador, no un almacén: cinco cifras sobran. */
export const CANTIDAD_MAXIMA = 99_999;
export const PRECIO_MAXIMO = 99_999.99;

function limpio(valor: string): string | null {
  const recortado = valor.trim().replace(/\s+/g, ' ');
  return recortado === '' ? null : recortado;
}

/** Número escrito por una persona: admite coma decimal, rechaza lo demás. */
function numero(valor: string): number | 'invalido' {
  const recortado = valor.trim().replace(',', '.');
  if (recortado === '') return 'invalido';
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(recortado)) return 'invalido';
  const convertido = Number(recortado);
  return Number.isFinite(convertido) ? convertido : 'invalido';
}

export function validarProducto(
  formulario: FormularioDeProducto,
): { readonly ok: true; readonly datos: DatosDeProducto } | { readonly ok: false; readonly errores: Readonly<Record<string, string>> } {
  const errores: Record<string, string> = {};

  const name = limpio(formulario.name) ?? '';
  if (name.length < 2) errores.name = 'Escribe el nombre del producto.';
  else if (name.length > LARGO_MAXIMO_DE_NOMBRE) errores.name = `El nombre puede tener hasta ${LARGO_MAXIMO_DE_NOMBRE} caracteres.`;

  const category = limpio(formulario.category);
  if (category && category.length > LARGO_MAXIMO_DE_CATEGORIA) {
    errores.category = `La categoría puede tener hasta ${LARGO_MAXIMO_DE_CATEGORIA} caracteres.`;
  }

  const quantity = numero(formulario.quantity);
  if (quantity === 'invalido' || !Number.isInteger(quantity)) errores.quantity = 'La cantidad es un número entero, sin decimales.';
  else if (quantity > CANTIDAD_MAXIMA) errores.quantity = `La cantidad no puede pasar de ${CANTIDAD_MAXIMA}.`;

  const price = numero(formulario.price);
  if (price === 'invalido') errores.price = 'El precio se escribe con hasta dos decimales. Ej.: 35.50.';
  else if (price > PRECIO_MAXIMO) errores.price = 'Ese precio es demasiado alto. Revisa la cifra.';

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  return {
    ok: true,
    datos: {
      name,
      category,
      quantity: quantity as number,
      price: price as number,
    },
  };
}

export type NivelDeExistencias = 'agotado' | 'bajo' | 'disponible';

/** Umbral por debajo del cual conviene reponer antes de quedarse sin nada. */
export const EXISTENCIAS_BAJAS = 5;

export function nivelDeExistencias(cantidad: number): NivelDeExistencias {
  if (cantidad <= 0) return 'agotado';
  return cantidad <= EXISTENCIAS_BAJAS ? 'bajo' : 'disponible';
}

export const NOMBRE_DE_NIVEL: Readonly<Record<NivelDeExistencias, string>> = {
  agotado: 'Agotado',
  bajo: 'Queda poco',
  disponible: 'Disponible',
};

/** Lo que vale el inventario de la sede: para saber cuánto dinero hay parado. */
export function valorDelInventario(productos: readonly ProductoDeInventario[]): number {
  const total = productos.reduce((suma, producto) => suma + producto.price * producto.quantity, 0);
  // Dos decimales: sumar flotantes arrastra colas (0.1 + 0.2 = 0.30000000000000004).
  return Math.round(total * 100) / 100;
}
