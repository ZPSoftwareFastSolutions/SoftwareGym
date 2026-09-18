'use client';

import { useActionState, useEffect, useState } from 'react';
import { guardarProducto } from '@core/application/operations/inventory.actions';
import { Dialogo } from '@/presentation/ui/Modal';
import { Button } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { Campo, CLASE_DE_CONTROL } from '@/presentation/ui/Campo';
import type { InventoryProduct } from '@core/application/ports/inventory-repository.port';
import type { EstadoDeFormulario } from '@/app/[tenant]/panel/_acciones';
import { cn } from '@/lib/cn';

interface ModalNuevoProductoProps {
  readonly slug: string;
  readonly branchId: string;
  readonly producto?: InventoryProduct;
}

export function ModalNuevoProducto({ slug, branchId, producto }: ModalNuevoProductoProps) {
  const [abierto, setAbierto] = useState(false);
  const editando = !!producto;
  
  const [estado, action, pendiente] = useActionState<EstadoDeFormulario, FormData>(
    guardarProducto,
    {}
  );

  useEffect(() => {
    if (estado?.exito) {
      setAbierto(false);
    }
  }, [estado?.exito]);

  const disparador = editando ? (
    <Button variant="secondary" size="sm" icon="edit" onClick={() => setAbierto(true)}>
      Editar
    </Button>
  ) : (
    <Button variant="primary" icon="plus" onClick={() => setAbierto(true)}>
      Nuevo producto
    </Button>
  );

  return (
    <>
      {disparador}
      <Dialogo
        titulo={editando ? 'Editar producto' : 'Nuevo producto'}
        descripcion="Añade un producto al inventario de la sucursal."
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        anchoMaximo="sm"
      >
        <form action={action} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="tenantSlug" value={slug} />
          <input type="hidden" name="branchId" value={branchId} />
          {producto && <input type="hidden" name="id" value={producto.id} />}
          <Campo id={`prod-name-${producto?.id ?? 'new'}`} etiqueta="Nombre del producto" obligatorio>
            <input
              name="name"
              type="text"
              defaultValue={producto?.name ?? ''}
              required
              maxLength={100}
              className={CLASE_DE_CONTROL}
            />
          </Campo>
          <Campo id={`prod-category-${producto?.id ?? 'new'}`} etiqueta="Categoría (Opcional)">
            <input
              name="category"
              type="text"
              defaultValue={producto?.category ?? ''}
              maxLength={50}
              className={CLASE_DE_CONTROL}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo id={`prod-quantity-${producto?.id ?? 'new'}`} etiqueta="Stock" obligatorio>
              <input
                name="quantity"
                type="number"
                min={0}
                step={1}
                defaultValue={producto?.quantity ?? 0}
                required
                className={CLASE_DE_CONTROL}
              />
            </Campo>
            <Campo id={`prod-price-${producto?.id ?? 'new'}`} etiqueta="Precio" obligatorio>
              <input
                name="price"
                type="number"
                min={0}
                step={0.5}
                defaultValue={producto?.price ?? 0}
                required
                className={CLASE_DE_CONTROL}
              />
            </Campo>
          </div>
        
          {estado?.mensaje && (
            <p className="flex items-start gap-2 text-[0.86rem] text-structural">
              <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
              {estado.mensaje}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={pendiente}
              aria-busy={pendiente}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--t-radius-md)] bg-action px-5 text-[0.88rem] font-semibold text-on-action transition-colors hover:bg-action-strong disabled:pointer-events-none disabled:opacity-50"
            >
              <Icon name={pendiente ? 'refresh' : 'check'} size={16} className={cn(pendiente && 'animate-spin')} />
              {pendiente ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Añadir producto')}
            </button>
          </div>
        </form>
      </Dialogo>
    </>
  );
}
