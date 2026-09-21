-- =============================================================================
-- V4.3 · Inventario por sucursal
-- =============================================================================
--
-- Qué se vende o se presta EN una sede: suplementos, bebidas, ropa, candados.
-- No es el catálogo comercial del sitio (`content.products` del archivo del
-- tenant, que es texto de vitrina) ni un sistema de ventas: aquí vive qué hay,
-- cuánto queda y a qué precio, POR SUCURSAL.
--
-- SUSTITUYE a `20260918000000_v4_3_inventario_y_normalizacion.sql`, que NUNCA
-- llegó a aplicarse y, tal como estaba escrito, no podía aplicarse:
--   · llamaba a `app.is_admin()`, que no existe en esta base (el ayudante de
--     plataforma se llama `app.is_platform_admin`, y además un administrador de
--     gimnasio no es plataforma);
--   · creaba un disparador con `public.moddatetime`, que tampoco existe aquí
--     (la convención del proyecto es `app.touch_row`, que además lleva `version`);
--   · sus políticas evaluaban `app.current_tenant_id()` y
--     `app.puede_operar_sucursal(branch_id)` POR FILA en el SELECT, justo el
--     patrón que V4 tuvo que corregir (contar 50 000 filas pasaba de 20 s a
--     18 ms al envolver el contexto en `(select …)`);
--   · no tenía permiso propio: la pantalla usaba `attendance.create`, con lo que
--     «puede registrar entradas» pasaba a significar «puede borrar productos»;
--   · no tenía clave foránea compuesta, así que una fila podía apuntar a la
--     sede de otro gimnasio.
--
-- Decisiones de esta versión:
--   · Permiso propio en dos niveles: `inventory.read` (consultar, también
--     recepción, que es quien tiene al socio delante) e `inventory.manage`
--     (dar de alta, corregir y retirar: Administración y Gerencia). Sigue la
--     regla de siempre: recepción opera, gerencia corrige.
--   · La sede acota la ESCRITURA (`app.puede_operar_sucursal`, como la
--     asistencia y los pases); la LECTURA es del gimnasio y la acota la propia
--     consulta, que pide una sucursal. Así el SELECT no evalúa funciones por fila.
--   · Un producto se puede BORRAR, a diferencia de un socio o un pago: no es un
--     hecho con fecha, es una ficha de mostrador que se equivocó o que se dejó
--     de vender. Lo que no se borra es lo que ya se cobró (`payments`).
-- =============================================================================

-- ---------------------------------------------------------------- 1. permisos

insert into public.permissions (code, module, action, description)
values
  ('inventory.read', 'inventory', 'read', 'Consultar el inventario de la sucursal en la que se opera'),
  ('inventory.manage', 'inventory', 'manage', 'Dar de alta, corregir y retirar productos del inventario')
on conflict (code) do nothing;

-- Consultar: Administración, Gerencia y Recepción (el mostrador responde
-- «¿queda proteína?» sin llamar a nadie).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('admin', 'manager', 'receptionist') and r.tenant_id is null
  and p.code = 'inventory.read'
on conflict do nothing;

-- Corregir existencias y precios: Administración y Gerencia.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('admin', 'manager') and r.tenant_id is null
  and p.code = 'inventory.manage'
on conflict do nothing;

-- ---------------------------------------------------------------- 2. tabla

create table if not exists public.branch_inventory_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null,

  name text not null check (length(btrim(name)) between 2 and 80),
  category text check (category is null or length(btrim(category)) between 1 and 40),
  quantity integer not null default 0 check (quantity >= 0 and quantity <= 99999),
  price numeric(10,2) not null default 0 check (price >= 0 and price <= 99999.99),

  created_at timestamptz not null default now(),
  created_by uuid default app.current_app_user_id(),
  updated_at timestamptz not null default now(),
  version integer not null default 0,

  -- El motor impide que un producto de un gimnasio cuelgue de la sede de otro.
  constraint branch_inventory_products_sucursal_fk
    foreign key (tenant_id, branch_id) references public.branches (tenant_id, id) on delete cascade
);

-- Dos veces el mismo producto en la misma sede es un error de captura, no dos
-- productos: la base lo impide sin distinguir mayúsculas.
create unique index if not exists branch_inventory_products_sede_nombre_uk
  on public.branch_inventory_products (tenant_id, branch_id, lower(name));

-- El listado siempre entra por sede y ordena por nombre.
create index if not exists branch_inventory_products_sede_idx
  on public.branch_inventory_products (tenant_id, branch_id, name);

drop trigger if exists branch_inventory_products_touch on public.branch_inventory_products;
create trigger branch_inventory_products_touch
  before update on public.branch_inventory_products
  for each row execute function app.touch_row();

-- ---------------------------------------------------------------- 3. RLS

alter table public.branch_inventory_products enable row level security;

-- Leer: cualquier cuenta del gimnasio CON el permiso. El contexto va en
-- `(select …)` para evaluarse una vez por consulta (§4.1.3), y la sede la acota
-- la consulta, no la política: un SELECT que llamara a
-- `app.puede_operar_sucursal(branch_id)` volvería a costar una subconsulta por fila.
drop policy if exists inventario_select on public.branch_inventory_products;
create policy inventario_select on public.branch_inventory_products
  for select to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('inventory.read'))
  );

-- Escribir: el permiso de gestión Y poder operar EN esa sede. Aquí sí se
-- comprueba la sede fila a fila, porque se escribe de una en una.
drop policy if exists inventario_insert on public.branch_inventory_products;
create policy inventario_insert on public.branch_inventory_products
  for insert to authenticated
  with check (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('inventory.manage'))
    and app.puede_operar_sucursal(branch_id)
  );

drop policy if exists inventario_update on public.branch_inventory_products;
create policy inventario_update on public.branch_inventory_products
  for update to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('inventory.manage'))
    and app.puede_operar_sucursal(branch_id)
  )
  with check (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('inventory.manage'))
    and app.puede_operar_sucursal(branch_id)
  );

drop policy if exists inventario_delete on public.branch_inventory_products;
create policy inventario_delete on public.branch_inventory_products
  for delete to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('inventory.manage'))
    and app.puede_operar_sucursal(branch_id)
  );

-- ---------------------------------------------------------------- 4. grants

-- Supabase concede todo por defecto sobre las tablas nuevas de `public`: se
-- retira y se concede columna a columna lo que el cliente puede escribir de
-- verdad. `updated_at`, `version` y `created_by` los pone la base (lección de
-- V4: una RPC que nombraba `updated_at` sin grant fallaba siempre).
revoke all on public.branch_inventory_products from anon, authenticated;
grant select on public.branch_inventory_products to authenticated;
grant insert (tenant_id, branch_id, name, category, quantity, price) on public.branch_inventory_products to authenticated;
grant update (name, category, quantity, price) on public.branch_inventory_products to authenticated;
grant delete on public.branch_inventory_products to authenticated;

-- ---------------------------------------------------------------- 5. comprobación

do $$
declare v_permisos int; v_politicas int;
begin
  select count(*) into v_permisos from public.permissions where code like 'inventory.%';
  if v_permisos <> 2 then
    raise exception 'Faltan permisos de inventario: %', v_permisos;
  end if;

  select count(*) into v_politicas from pg_policies
  where schemaname = 'public' and tablename = 'branch_inventory_products';
  if v_politicas <> 4 then
    raise exception 'El inventario debe tener 4 políticas, tiene %', v_politicas;
  end if;

  -- Ningún rol de gimnasio gana permisos que no sean los suyos: el socio y el
  -- entrenador no ven el inventario.
  if exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where p.code like 'inventory.%' and r.code in ('customer', 'trainer', 'super_admin')
  ) then
    raise exception 'El inventario se concedió a un rol que no debe verlo';
  end if;
end $$;
