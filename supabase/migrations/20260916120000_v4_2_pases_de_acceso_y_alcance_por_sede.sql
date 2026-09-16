-- =============================================================================
-- V4.2 · Pases de acceso, tope diario y alcance de sede por plan
-- =============================================================================
--
-- EL CONFLICTO QUE RESUELVE, Y CÓMO. GOLD pide «3 accesos por día». El sistema
-- tiene desde V3.0 un índice único que garantiza UNA entrada por socio y día en
-- todo el gimnasio (`attendance_tenant_customer_dia_uk`, decisión 20), y de él
-- cuelgan la racha, `v_attendance_daily`, los KPI y los reportes: ahí una fila
-- significa «este socio vino este día».
--
-- Quitar ese índice para admitir tres filas diarias habría cambiado el
-- significado de «visita» para Mítico y Aurora también, y obligado a reescribir
-- racha, dashboards y reportes a la vez. Se descartó.
--
-- Lo que se hace en su lugar: SEPARAR LOS DOS HECHOS.
--
--   attendance_records  «este socio vino este día»  (una por día, intacta)
--   access_passes       «pasó por esta puerta a esta hora»  (varias por día)
--
-- La racha, los KPI y los reportes siguen leyendo lo de siempre y no se enteran.
-- El tope de 3 se cuenta sobre los pases, que es donde tiene sentido contarlo.
--
-- ALCANCE DEL TOPE (decisión del cliente): **3 por día para todos los socios, en
-- cualquier sede**, se muevan entre sucursales o no. Es lo más simple de
-- explicar en un mostrador, y por eso se eligió frente a limitar solo los saltos
-- entre sedes. Es configurable por gimnasio: `tenants.daily_access_limit`.
--
-- ALCANCE DE SEDE POR PLAN. Hasta aquí la membresía valía en TODAS las sedes
-- (decisiones 19 y 24). Sigue siendo el valor por defecto —Mítico y Aurora no
-- cambian ni una fila— pero ahora un plan puede declarar otra cosa:
--
--   todas        vale en cualquier sede del gimnasio   (por defecto; lo de hoy)
--   sede_origen  solo donde el socio está registrado
--   listadas     solo las sedes marcadas para ese plan
--
-- CONCURRENCIA. El tope se comprueba en un disparador BEFORE que bloquea la
-- fila del socio (`for update`) antes de contar. Sin ese bloqueo, dos lectores
-- de QR disparando a la vez leerían ambos «lleva 2» y grabarían el cuarto pase.
-- Es la misma técnica que usa el cupo de las clases desde V3.3.
-- =============================================================================

-- ---------------------------------------------------------------- 1. tope por gimnasio

alter table public.tenants
  add column if not exists daily_access_limit smallint not null default 3
    check (daily_access_limit between 1 and 20);

comment on column public.tenants.daily_access_limit is
  'V4.2: pases de acceso que un socio puede usar por día. 3 por defecto (pedido de GOLD).';

-- ---------------------------------------------------------------- 2. sede de origen del socio

alter table public.customers
  add column if not exists home_branch_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customers_sede_de_origen_del_mismo_gimnasio'
  ) then
    alter table public.customers
      add constraint customers_sede_de_origen_del_mismo_gimnasio
      foreign key (tenant_id, home_branch_id) references public.branches(tenant_id, id);
  end if;
end $$;

comment on column public.customers.home_branch_id is
  'V4.2: sede donde el socio está registrado. NULL = sin sede de origen (el histórico). Solo la usan los planes de alcance sede_origen.';

-- ---------------------------------------------------------------- 3. alcance de sede del plan

alter table public.membership_plans
  add column if not exists branch_scope text not null default 'todas'
    check (branch_scope in ('todas', 'sede_origen', 'listadas'));

comment on column public.membership_plans.branch_scope is
  'V4.2: dónde vale el plan. «todas» es el comportamiento histórico y el valor por defecto: los planes que ya existían no cambian.';

create table if not exists public.membership_plan_branches (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null,
  branch_id uuid not null,
  primary key (plan_id, branch_id),
  constraint mpb_plan_del_mismo_gimnasio
    foreign key (tenant_id, plan_id) references public.membership_plans(tenant_id, id) on delete cascade,
  constraint mpb_sede_del_mismo_gimnasio
    foreign key (tenant_id, branch_id) references public.branches(tenant_id, id) on delete cascade
);

comment on table public.membership_plan_branches is
  'V4.2: sedes donde vale un plan de alcance «listadas». Vacío con ese alcance = no vale en ninguna, y la base lo dice.';

create index if not exists mpb_tenant_plan_idx on public.membership_plan_branches (tenant_id, plan_id);

alter table public.membership_plan_branches enable row level security;

drop policy if exists mpb_select on public.membership_plan_branches;
create policy mpb_select on public.membership_plan_branches
  for select to authenticated
  using (tenant_id = (select app.current_tenant_id()));

drop policy if exists mpb_write on public.membership_plan_branches;
create policy mpb_write on public.membership_plan_branches
  for all to authenticated
  using (tenant_id = (select app.current_tenant_id()) and (select app.has_permission('plans.manage')))
  with check (tenant_id = (select app.current_tenant_id()) and (select app.has_permission('plans.manage')));

revoke all on public.membership_plan_branches from anon, authenticated;
grant select on public.membership_plan_branches to authenticated;
grant insert (tenant_id, plan_id, branch_id), delete on public.membership_plan_branches to authenticated;

-- ---------------------------------------------------------------- 4. pases de acceso

create table if not exists public.access_passes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null,
  branch_id uuid not null,

  -- Fecha LOCAL del gimnasio, no UTC: un pase de las 23:30 en La Paz pertenece
  -- a ese día y no al siguiente. La pone el disparador, nunca el cliente.
  pass_date date not null,
  passed_at timestamptz not null default now(),

  /** Qué número de pase del día es. Lo calcula la base, y es lo que el
      mostrador enseña («2 de 3»). */
  pass_number smallint not null,

  method public.attendance_method not null default 'qr',
  /** `true` cuando el pase es en una sede distinta a la de origen del socio. */
  cross_branch boolean not null default false,
  registered_by uuid references public.app_users(id),

  constraint ap_socio_del_mismo_gimnasio
    foreign key (tenant_id, customer_id) references public.customers(tenant_id, id) on delete cascade,
  constraint ap_sucursal_del_mismo_gimnasio
    foreign key (tenant_id, branch_id) references public.branches(tenant_id, id)
);

comment on table public.access_passes is
  'V4.2: cada paso por una puerta, con su sede y su hora. NO sustituye a attendance_records («vino este día»), que sigue siendo una fila por socio y día.';

-- `tenant_id` primero, como toda tabla de negocio. Este índice sirve al conteo
-- del tope, que es la consulta caliente: se hace en CADA escaneo.
create index if not exists access_passes_tenant_socio_dia_idx
  on public.access_passes (tenant_id, customer_id, pass_date);

create index if not exists access_passes_tenant_sede_fecha_idx
  on public.access_passes (tenant_id, branch_id, pass_date desc);

-- ---------------------------------------------------------------- 5. la regla

create or replace function app.puede_entrar_en_sucursal(p_customer uuid, p_branch uuid, p_fecha date)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_scope  text;
  v_origen uuid;
  v_tenant uuid;
begin
  select c.tenant_id, c.home_branch_id into v_tenant, v_origen
  from public.customers c where c.id = p_customer;

  if v_tenant is null then return 'socio_no_encontrado'; end if;

  -- El alcance sale de la membresía que cubre ESE día, no de la última vendida:
  -- es la misma regla que usan las clases desde V3.3 (lección de V3.3, «un socio
  -- con Mítico vendido no entraba a Box porque su plan de HOY era Básico»).
  select p.branch_scope into v_scope
  from public.memberships m
  join public.membership_plans p on p.id = m.plan_id
  where m.tenant_id = v_tenant and m.customer_id = p_customer
    and m.status = 'active' and m.start_date <= p_fecha and m.end_date >= p_fecha
  order by m.end_date desc
  limit 1;

  -- Sin membresía vigente no se decide aquí: la entrada se registra igual y se
  -- avisa (decisión 12). El alcance de sede solo aplica a quien SÍ tiene plan.
  if v_scope is null or v_scope = 'todas' then return 'ok'; end if;

  if v_scope = 'sede_origen' then
    -- Sin sede de origen registrada no se le puede reprochar nada: el histórico
    -- anterior a V4.2 no la tiene.
    if v_origen is null or v_origen = p_branch then return 'ok'; end if;
    return 'sucursal_fuera_del_plan';
  end if;

  if exists (
    select 1 from public.membership_plan_branches b
    join public.memberships m on m.plan_id = b.plan_id
    where b.tenant_id = v_tenant and b.branch_id = p_branch
      and m.customer_id = p_customer and m.status = 'active'
      and m.start_date <= p_fecha and m.end_date >= p_fecha
  ) then
    return 'ok';
  end if;

  return 'sucursal_fuera_del_plan';
end;
$function$;

revoke all on function app.puede_entrar_en_sucursal(uuid, uuid, date) from public, anon;
grant execute on function app.puede_entrar_en_sucursal(uuid, uuid, date) to authenticated;

-- ---------------------------------------------------------------- 6. el disparador

create or replace function app.preparar_pase_de_acceso()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_fecha  date;
  v_tope   smallint;
  v_usados smallint;
  v_motivo text;
  v_origen uuid;
begin
  -- La fecha y la autoría NO llegan del cliente.
  v_fecha := app.hoy_del_gimnasio(new.tenant_id);
  new.pass_date := v_fecha;
  new.passed_at := now();
  new.registered_by := app.current_app_user_id();

  -- BLOQUEO ANTES DE CONTAR. Sin esto, dos lectores de QR disparando a la vez
  -- leen ambos «lleva 2» y graban los dos el tercero y el cuarto. Se bloquea la
  -- fila del socio, que serializa solo a ese socio y no al gimnasio entero.
  perform 1 from public.customers c where c.id = new.customer_id for update;

  v_motivo := app.puede_entrar_en_sucursal(new.customer_id, new.branch_id, v_fecha);
  if v_motivo <> 'ok' then
    raise exception '%', v_motivo using errcode = 'P0001';
  end if;

  select t.daily_access_limit into v_tope from public.tenants t where t.id = new.tenant_id;

  select count(*)::smallint into v_usados
  from public.access_passes a
  where a.tenant_id = new.tenant_id and a.customer_id = new.customer_id and a.pass_date = v_fecha;

  if v_usados >= coalesce(v_tope, 3) then
    raise exception 'limite_de_accesos_diarios' using errcode = 'P0001', detail = v_tope::text;
  end if;

  new.pass_number := v_usados + 1;

  select c.home_branch_id into v_origen from public.customers c where c.id = new.customer_id;
  new.cross_branch := v_origen is not null and v_origen <> new.branch_id;

  return new;
end;
$function$;

revoke all on function app.preparar_pase_de_acceso() from public, anon, authenticated;

drop trigger if exists preparar_pase_de_acceso on public.access_passes;
create trigger preparar_pase_de_acceso
  before insert on public.access_passes
  for each row execute function app.preparar_pase_de_acceso();

-- ---------------------------------------------------------------- 7. RLS de los pases

alter table public.access_passes enable row level security;

-- Se leen como la asistencia: el personal con `attendance.read` y el propio socio.
drop policy if exists access_passes_select on public.access_passes;
create policy access_passes_select on public.access_passes
  for select to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and ((select app.has_permission('attendance.read')) or customer_id = (select app.current_customer_id()))
  );

-- Se escriben con el mismo permiso y el mismo alcance de sede que la asistencia:
-- quien no puede operar en esa sede tampoco abre su puerta.
drop policy if exists access_passes_insert on public.access_passes;
create policy access_passes_insert on public.access_passes
  for insert to authenticated
  with check (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('attendance.create'))
    and app.puede_operar_sucursal(branch_id)
  );

-- Sin UPDATE ni DELETE: un pase es un hecho con hora, como un pago.

revoke all on public.access_passes from anon, authenticated;
grant select on public.access_passes to authenticated;
-- La fecha, el número, la hora, la autoría y `cross_branch` los pone el
-- disparador y NO se conceden: nombrarlos desde el cliente daría 42501
-- (lección de V3.2 y de `cambiar_estado_de_cuenta` en V4).
grant insert (tenant_id, customer_id, branch_id, method) on public.access_passes to authenticated;

-- ---------------------------------------------------------------- 8. vista de la bitácora

create or replace view public.v_access_passes
with (security_invoker = true) as
select
  a.id,
  a.tenant_id,
  a.customer_id,
  c.code as customer_code,
  (c.first_name || ' ' || c.last_name) as customer_name,
  a.branch_id,
  b.name as branch_name,
  a.pass_date,
  (a.passed_at at time zone t.timezone) as passed_local,
  a.pass_number,
  a.method,
  a.cross_branch
from public.access_passes a
join public.tenants t on t.id = a.tenant_id
join public.customers c on c.tenant_id = a.tenant_id and c.id = a.customer_id
left join public.branches b on b.tenant_id = a.tenant_id and b.id = a.branch_id;

comment on view public.v_access_passes is
  'V4.2: historial de pases con hora local, sede y si fue en una sede distinta a la de origen.';

grant select on public.v_access_passes to authenticated;
revoke all on public.v_access_passes from anon;

-- ---------------------------------------------------------------- 9. comprobación

do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
  where table_schema = 'public' and table_name = 'membership_plans' and column_name = 'branch_scope';
  if n <> 1 then raise exception 'Falta membership_plans.branch_scope'; end if;

  -- Ningún plan existente cambia de comportamiento.
  select count(*) into n from public.membership_plans where branch_scope <> 'todas';
  if n <> 0 then raise exception '% planes dejaron de valer en todas las sedes', n; end if;

  -- El índice único de asistencia sigue en pie: es lo que sostiene racha y KPI.
  select count(*) into n from pg_indexes
  where schemaname = 'public' and indexname = 'attendance_tenant_customer_dia_uk';
  if n <> 1 then raise exception 'Se perdió el índice de una entrada por día'; end if;
end $$;
