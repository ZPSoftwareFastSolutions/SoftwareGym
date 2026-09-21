/**
 * Pruebas del inventario por sucursal (V4.3).
 *
 * Lo que se prueba aquí es lo que decide la pantalla antes de ir al servidor:
 * qué es un producto válido, cómo se lee una existencia y cuánto vale lo que
 * hay. Quién puede escribirlo lo decide RLS y se prueba contra la base (§9.2).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANTIDAD_MAXIMA,
  nivelDeExistencias,
  valorDelInventario,
  validarProducto,
  type FormularioDeProducto,
  type ProductoDeInventario,
} from '../src/core/domain/operations/inventario.ts';
import { accionesRapidas, type ContextoDeTablero } from '../src/core/domain/operations/tablero.ts';

const VALIDO: FormularioDeProducto = {
  name: 'Proteína Whey 2 kg',
  category: 'Suplementos',
  quantity: '12',
  price: '350.50',
};

function producto(parcial: Partial<ProductoDeInventario> = {}): ProductoDeInventario {
  return {
    id: 'p1',
    name: 'Agua 600 ml',
    category: null,
    quantity: 10,
    price: 8,
    updatedAt: '2026-09-21T10:00:00Z',
    ...parcial,
  };
}

describe('V4.3 · validar un producto del inventario', () => {
  it('acepta lo que escribe el mostrador y lo normaliza', () => {
    const resultado = validarProducto({ ...VALIDO, name: '  Proteína   Whey 2 kg ', category: ' Suplementos ' });
    assert.ok(resultado.ok);
    assert.equal(resultado.datos.name, 'Proteína Whey 2 kg');
    assert.equal(resultado.datos.category, 'Suplementos');
    assert.equal(resultado.datos.quantity, 12);
    assert.equal(resultado.datos.price, 350.5);
  });

  it('la categoría es opcional y vacía significa «sin categoría», no cadena vacía', () => {
    const resultado = validarProducto({ ...VALIDO, category: '   ' });
    assert.ok(resultado.ok);
    assert.equal(resultado.datos.category, null);
  });

  it('admite la coma decimal, porque es como se escribe un precio aquí', () => {
    const resultado = validarProducto({ ...VALIDO, price: '35,90' });
    assert.ok(resultado.ok);
    assert.equal(resultado.datos.price, 35.9);
  });

  it('rechaza lo que la base rechazaría, y lo dice antes de ir al servidor', () => {
    for (const parcial of [
      { name: 'A' },
      { name: 'x'.repeat(81) },
      { quantity: '-3' },
      { quantity: '2.5' },
      { quantity: String(CANTIDAD_MAXIMA + 1) },
      { price: '-1' },
      { price: 'gratis' },
      { price: '1000000' },
    ] as readonly Partial<FormularioDeProducto>[]) {
      const resultado = validarProducto({ ...VALIDO, ...parcial });
      assert.equal(resultado.ok, false, `debería rechazar ${JSON.stringify(parcial)}`);
    }
  });

  it('un precio de cero es válido: hay cosas que se prestan, no se venden', () => {
    const resultado = validarProducto({ ...VALIDO, price: '0', quantity: '0' });
    assert.ok(resultado.ok);
    assert.equal(resultado.datos.price, 0);
  });
});

describe('V4.3 · leer las existencias', () => {
  it('distingue agotado, queda poco y disponible', () => {
    assert.equal(nivelDeExistencias(0), 'agotado');
    assert.equal(nivelDeExistencias(1), 'bajo');
    assert.equal(nivelDeExistencias(5), 'bajo');
    assert.equal(nivelDeExistencias(6), 'disponible');
  });

  it('suma lo que hay parado en la sede sin arrastrar colas de coma flotante', () => {
    const total = valorDelInventario([
      producto({ id: 'a', price: 0.1, quantity: 1 }),
      producto({ id: 'b', price: 0.2, quantity: 1 }),
    ]);
    assert.equal(total, 0.3);
    assert.equal(valorDelInventario([]), 0);
    assert.equal(valorDelInventario([producto({ price: 8, quantity: 10 })]), 80);
  });
});

describe('V4.3 · el inventario es una capacidad contratada, no un extra suelto', () => {
  const PERMISOS_DE_RECEPCION = ['dashboard.read', 'attendance.read', 'attendance.create', 'customers.read'];

  function contexto(parcial: Partial<ContextoDeTablero> = {}): ContextoDeTablero {
    return {
      enfoque: 'mostrador',
      capacidades: { enableAttendance: true, enableInventory: true },
      permisos: [...PERMISOS_DE_RECEPCION, 'inventory.read'],
      puedeOperarEnSede: true,
      ...parcial,
    };
  }

  it('con la capacidad y el permiso, el mostrador la ve', () => {
    assert.ok(accionesRapidas(contexto()).some((a) => a.clave === 'inventario'));
  });

  it('sin la capacidad contratada no aparece, aunque sobre el permiso', () => {
    const claves = accionesRapidas(contexto({ capacidades: { enableAttendance: true } })).map((a) => a.clave);
    assert.ok(!claves.includes('inventario'));
  });

  it('sin el permiso no aparece, aunque el gimnasio la tenga contratada', () => {
    const claves = accionesRapidas(contexto({ permisos: PERMISOS_DE_RECEPCION })).map((a) => a.clave);
    assert.ok(!claves.includes('inventario'));
  });
});
