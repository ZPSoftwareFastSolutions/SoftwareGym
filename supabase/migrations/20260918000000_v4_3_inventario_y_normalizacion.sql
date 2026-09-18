-- V4.3 · Inventario simple por sucursal.
--
-- Tabla básica para gestión de productos físicos en la sede.
-- Sin trazabilidad histórica compleja, enfocado en simplicidad.

create table if not exists public.branch_inventory_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  category text,
  quantity integer not null default 0 check (quantity >= 0),
  price numeric(10,2) not null default 0.00 check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para búsquedas y RLS
create index if not exists branch_inventory_products_tenant_id_idx on public.branch_inventory_products(tenant_id);
create index if not exists branch_inventory_products_branch_id_idx on public.branch_inventory_products(branch_id);

-- RLS
alter table public.branch_inventory_products enable row level security;

-- Solo cuentas autorizadas en la sucursal o administradores
create policy "select_branch_inventory_products"
  on public.branch_inventory_products for select
  to authenticated
  using (tenant_id = app.current_tenant_id() and (app.is_admin() or app.puede_operar_sucursal(branch_id)));

create policy "insert_branch_inventory_products"
  on public.branch_inventory_products for insert
  to authenticated
  with check (tenant_id = app.current_tenant_id() and (app.is_admin() or app.puede_operar_sucursal(branch_id)));

create policy "update_branch_inventory_products"
  on public.branch_inventory_products for update
  to authenticated
  using (tenant_id = app.current_tenant_id() and (app.is_admin() or app.puede_operar_sucursal(branch_id)))
  with check (tenant_id = app.current_tenant_id() and (app.is_admin() or app.puede_operar_sucursal(branch_id)));

create policy "delete_branch_inventory_products"
  on public.branch_inventory_products for delete
  to authenticated
  using (tenant_id = app.current_tenant_id() and (app.is_admin() or app.puede_operar_sucursal(branch_id)));

-- Trigger de updated_at
create trigger branch_inventory_products_updated_at
  before update on public.branch_inventory_products
  for each row execute function public.moddatetime('updated_at');

-- Forzar formato de teléfono: Esta migración no normalizará los teléfonos viejos
-- a menos que sea estrictamente necesario. Preferimos la validación en código.
