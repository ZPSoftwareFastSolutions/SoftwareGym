/**
 * CAPA: Presentation / App — inventario de la sucursal (V4.3).
 *
 * El inventario es DE LA SEDE en la que se opera, no del gimnasio: cada
 * mostrador tiene sus existencias. Por eso la sucursal sale de
 * `contextoDeSucursal` (la cookie de sede, re-comprobada contra la base) y no
 * de la URL: quien no está operando en ninguna no ve un inventario vacío sino
 * el aviso de que elija sede.
 */

import type { Metadata } from 'next';
import { loadTenantPage } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { cn } from '@/lib/cn';
import { PERMISO } from '@core/domain/operations/workspace';
import { FILAS_POR_PAGINA, paginaDeLaUrl } from '@core/domain/shared/paginacion';
import { inventoryRepository } from '@infra/config/composition-root';
import { contextoDeSucursal } from '../_sucursal';
import { Paginacion } from '@/presentation/patterns/Paginacion';
import { BotonDeFiltrar, FormularioDeFiltro } from '@/presentation/patterns/FiltroConCarga';
import { AccionConEstado } from '@/presentation/patterns/AccionConEstado';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { CLASE_DE_CONTROL } from '@/presentation/ui/Campo';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPermiso, importe } from '../_datos';
import { eliminarProducto } from './actions';
import { ModalNuevoProducto } from './ModalNuevoProducto';
import { nivelDeExistencias, NOMBRE_DE_NIVEL, valorDelInventario, type ProductoDeInventario } from '@core/domain/operations/inventario';
import { Badge } from '@/presentation/ui/Badge';

export const metadata: Metadata = { title: 'Gestión de Inventario', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface InventarioPageProps {
  readonly params: Promise<{ tenant: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InventarioPage({ params, searchParams }: InventarioPageProps) {
  const tenant = await loadTenantPage(params, 'enableInventory');
  const { slug } = tenant;
  const { perfil, repo } = await exigirPermiso(slug, PERMISO.verInventario);

  const kpis = await repo.indicadores(slug);
  const moneda = kpis?.currency ?? 'BOB';

  const sede = await contextoDeSucursal(perfil);
  const sucursal = sede.actual;

  if (!sucursal) {
    return (
      <section className="surface-card">
        <EmptyState icono="archive" titulo="No estás en ninguna sucursal" descripcion="Para gestionar el inventario debes estar operando en una sucursal." />
      </section>
    );
  }

  const consulta = await searchParams;
  const qCrudo = Array.isArray(consulta.q) ? consulta.q[0] : consulta.q;
  const q = (qCrudo ?? '').trim().slice(0, 60);
  const pagina = paginaDeLaUrl(consulta.pagina);

  const repoInventario = await inventoryRepository();
  const productos = await repoInventario.listar(sucursal.id, q, pagina, FILAS_POR_PAGINA);
  const base = tenantHref(slug, 'panel/inventario');

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-card flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="t-h3">Inventario · {sucursal.name}</h2>
          <p className="mt-1.5 max-w-[70ch] text-[0.88rem] leading-relaxed text-muted">
            Lo que se vende en el mostrador de esta sede, con lo que queda y a qué precio.
            {productos.total > 0 && ` En esta página: ${importe(valorDelInventario(productos.filas), moneda)} en existencias.`}
          </p>
        </div>
        <ModalNuevoProducto slug={slug} />
      </section>

      <section id="productos" className="surface-card scroll-mt-28 p-6 sm:p-7" aria-labelledby="titulo-productos">
        <h2 id="titulo-productos" className="t-h3">Productos</h2>

        <FormularioDeFiltro ruta={base} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="relative">
            <label htmlFor="inventario-q" className="sr-only">Buscar producto</label>
            <Icon name="search" size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="inventario-q" name="q" type="search" defaultValue={q} maxLength={60} placeholder="Nombre del producto..." className={cn(CLASE_DE_CONTROL, 'ps-10')} />
          </div>
          <BotonDeFiltrar texto="Buscar" icono="search" />
        </FormularioDeFiltro>

        <DataTable<ProductoDeInventario>
          titulo="Productos del inventario"
          tituloOculto
          className="mt-5"
          columnas={[
            {
              clave: 'name',
              titulo: 'Producto',
              celda: (p) => (
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium text-ink">{p.name}</span>
                  {p.category && <span className="text-[0.76rem] text-muted">{p.category}</span>}
                </span>
              ),
            },
            {
              clave: 'quantity',
              titulo: 'Existencias',
              numerica: true,
              celda: (p) => {
                const nivel = nivelDeExistencias(p.quantity);
                return (
                  <span className="inline-flex items-center gap-2">
                    <span className="tabular-nums">{p.quantity}</span>
                    {nivel !== 'disponible' && (
                      <Badge tone={nivel === 'agotado' ? 'neutral' : 'structural'}>{NOMBRE_DE_NIVEL[nivel]}</Badge>
                    )}
                  </span>
                );
              },
            },
            { clave: 'price', titulo: 'Precio', numerica: true, celda: (p) => importe(p.price, moneda) },
            {
              clave: 'acciones',
              titulo: 'Acciones',
              celda: (p) => (
                <div className="flex flex-wrap gap-2">
                  <ModalNuevoProducto slug={slug} producto={p} />
                  <AccionConEstado
                    accion={eliminarProducto}
                    campos={{ tenantSlug: slug, id: p.id }}
                    etiqueta="Eliminar"
                    icono="close"
                    variante="peligro"
                    confirmar={`¿Eliminar ${p.name} del inventario?`}
                  />
                </div>
              ),
            },
          ]}
          filas={productos.filas}
          claveDeFila={(p) => p.id}
          vacio={
            <EmptyState
              icono="archive"
              titulo={q ? 'Ningún producto coincide con la búsqueda' : 'El inventario está vacío'}
              descripcion={q ? 'Prueba con otro nombre.' : 'Agrega el primero con el botón de arriba.'}
            />
          }
        />

        <Paginacion
          className="mt-5"
          ruta={base}
          parametros={consulta}
          pagina={pagina}
          porPagina={productos.porPagina}
          total={productos.total}
          filasEnPagina={productos.filas.length}
          ancla="productos"
        />
      </section>
    </div>
  );
}
