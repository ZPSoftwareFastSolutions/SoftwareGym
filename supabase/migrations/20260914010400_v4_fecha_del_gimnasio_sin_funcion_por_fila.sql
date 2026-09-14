-- =============================================================================
-- V4 · RENDIMIENTO — la fecha del gimnasio sin una función por fila
-- =============================================================================
--
-- ENCONTRADO AL MEDIR TRAS APLICAR V4 (batería V4, bloque 1: 2 000 socios y
-- 50 000 entradas, sesión de gerencia): las políticas ya daban 18 ms para contar
-- asistencias, pero dos vistas NUEVAS seguían lentas:
--   v_attendance_patterns   36 344 ms
--   v_customer_counts        1 214 ms
--
-- CAUSA. Las dos llamaban a `app.hoy_del_gimnasio(tenant_id)` con una columna de
-- la fila: la función hace su propia consulta a `tenants` (con su RLS) y el motor
-- no la reduce a una sola evaluación. 50 000 filas = 50 000 consultas. Es la misma
-- clase de defecto que la migración 010000 corrigió en las políticas.
--
-- CORRECCIÓN. Unir `tenants` una vez y calcular `(now() at time zone t.timezone)::date`
-- en la consulta: mismo valor que `app.hoy_del_gimnasio` (que hace exactamente eso),
-- mismas columnas y tipos (CREATE OR REPLACE lo exige). `tenants` es legible para
-- toda cuenta de su gimnasio (`tenants_select`), así que la unión no cambia qué filas
-- ve nadie: `customers` y `attendance_records` ya estaban acotadas al gimnasio.
-- =============================================================================

create or replace view public.v_customer_list
with (security_invoker = true) as
select
  c.id,
  c.tenant_id,
  c.code,
  c.first_name,
  c.last_name,
  (c.first_name || ' ') || c.last_name as full_name,
  c.document_id,
  c.phone,
  c.email,
  c.birth_date,
  c.status,
  c.deleted_at,
  c.created_at,
  m.id as membership_id,
  m.plan_id,
  p.name as plan_name,
  p.code as plan_code,
  m.start_date,
  m.end_date,
  m.effective_status as membership_status,
  m.days_remaining,
  v.last_visit,
  coalesce((now() at time zone t.timezone)::date - v.last_visit, 36500) as days_since_visit,
  (c.birth_date is not null and extract(month from c.birth_date) = extract(month from (now() at time zone t.timezone)::date)) as birthday_this_month
from public.customers c
join public.tenants t on t.id = c.tenant_id
left join lateral (
  select vm.id, vm.plan_id, vm.start_date, vm.end_date, vm.effective_status, vm.days_remaining
  from public.v_memberships vm
  where vm.tenant_id = c.tenant_id and vm.customer_id = c.id
  order by vm.end_date desc
  limit 1
) m on true
left join public.membership_plans p on p.tenant_id = c.tenant_id and p.id = m.plan_id
left join lateral (
  select max(a.attendance_date) as last_visit
  from public.attendance_records a
  where a.tenant_id = c.tenant_id and a.customer_id = c.id
) v on true;

create or replace view public.v_attendance_patterns
with (security_invoker = true) as
select
  a.tenant_id,
  extract(isodow from (a.checked_in_at at time zone t.timezone))::integer as dia_iso,
  extract(hour from (a.checked_in_at at time zone t.timezone))::integer as hora,
  a.method,
  a.branch_id,
  b.name as branch_name,
  count(*)::integer as veces
from public.attendance_records a
join public.tenants t on t.id = a.tenant_id
left join public.branches b on b.tenant_id = a.tenant_id and b.id = a.branch_id
where a.attendance_date > (now() at time zone t.timezone)::date - 30
group by a.tenant_id, 2, 3, a.method, a.branch_id, b.name;
