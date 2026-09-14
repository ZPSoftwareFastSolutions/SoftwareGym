-- =============================================================================
-- V4 · RENDIMIENTO — lista paginable y conteos de socios en la base
-- =============================================================================
--
-- CAUSA. `/panel/socios` y el dashboard del gimnasio pedían a `v_customer_detail`
-- TODAS las fichas (tope silencioso de 500) para contar en memoria «activos»,
-- «sin venir 7 días» o «cumplen este mes», y la lista volvía a pedirlas con el
-- filtro. Cada ficha de esa vista trae siete subconsultas (visitas, última
-- visita, visitas de 30 días, total pagado, comprobantes, cuenta, correo), y
-- los desplegables de rutinas, entrenadores y comprobantes también la usaban
-- solo para mostrar «código · nombre». Además, esas subconsultas filtraban por
-- `customer_id` sin `tenant_id`, así que no alcanzaban los índices
-- `(tenant_id, customer_id, …)` y recorrían la tabla por cada socio.
--
-- CORRECCIÓN.
-- 1. `v_customer_list`: solo lo que muestra la lista, con última visita por el
--    índice único (tenant, socio, fecha) y las derivadas que antes se calculaban
--    en el servidor web (`birthday_this_month`, `days_since_visit`) con la fecha
--    del gimnasio. Así filtro, orden, `range` y `count` los hace la base.
-- 2. `v_customer_counts`: los accesos rápidos en una sola fila por gimnasio.
-- 3. `v_customer_detail` (la ficha de UN socio) con `tenant_id` en cada
--    subconsulta, mismas columnas y mismo significado.
--
-- Las tres son `security_invoker`: RLS de `customers`, `memberships` y
-- `attendance_records` decide qué ve cada uno, igual que antes.
-- =============================================================================

create view public.v_customer_list
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
  -- Quien nunca vino cuenta como «sin venir» desde siempre (36 500 días): así
  -- «sin venir N días» es un único filtro `gte` y se combina con la búsqueda.
  coalesce(hoy.dia - v.last_visit, 36500) as days_since_visit,
  (c.birth_date is not null and extract(month from c.birth_date) = extract(month from hoy.dia)) as birthday_this_month
from public.customers c
cross join lateral (select app.hoy_del_gimnasio(c.tenant_id) as dia) hoy
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

comment on view public.v_customer_list is
  'V4: lista de socios paginable (sin las siete subconsultas de la ficha). Filtros de «sin venir» y «cumple este mes» calculados con la fecha del gimnasio.';

create view public.v_customer_counts
with (security_invoker = true) as
select
  l.tenant_id,
  (count(*) filter (where l.deleted_at is null))::integer as todos,
  (count(*) filter (where l.deleted_at is null and l.membership_status = 'active'))::integer as activos,
  (count(*) filter (where l.deleted_at is null and l.membership_status = 'expiring_soon'))::integer as por_vencer,
  (count(*) filter (where l.deleted_at is null and l.membership_status = 'expired'))::integer as vencidos,
  (count(*) filter (where l.deleted_at is null and l.membership_id is null))::integer as sin_membresia,
  (count(*) filter (
    where l.deleted_at is null
      and l.membership_status in ('active', 'expiring_soon')
      and l.days_since_visit >= 7
  ))::integer as sin_venir_7d,
  (count(*) filter (where l.deleted_at is null and l.birthday_this_month))::integer as cumplen_mes,
  (count(*) filter (where l.deleted_at is not null))::integer as archivados
from public.v_customer_list l
group by l.tenant_id;

comment on view public.v_customer_counts is
  'V4: accesos rápidos de socios en una fila por gimnasio (antes se contaban en memoria trayendo todas las fichas).';

-- La ficha de un socio: mismas columnas y en el mismo orden (CREATE OR REPLACE
-- lo exige); solo cambia que cada subconsulta nombra el gimnasio.
create or replace view public.v_customer_detail
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
  c.notes,
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
  m.price as membership_price,
  k.token as checkin_token,
  k.rotated_at as token_rotated_at,
  ((select count(*) from public.attendance_records a
     where a.tenant_id = c.tenant_id and a.customer_id = c.id))::integer as total_visits,
  (select max(a.attendance_date) from public.attendance_records a
     where a.tenant_id = c.tenant_id and a.customer_id = c.id) as last_visit,
  ((select count(*) from public.attendance_records a
     where a.tenant_id = c.tenant_id and a.customer_id = c.id
       and a.attendance_date > (app.hoy_del_gimnasio(c.tenant_id) - 30)))::integer as visits_30d,
  (select coalesce(sum(pa.amount), 0::numeric) from public.payments pa
     where pa.tenant_id = c.tenant_id and pa.customer_id = c.id and pa.paid_at <= now()) as total_paid,
  ((select count(*) from public.payment_receipts r
     where r.tenant_id = c.tenant_id and r.customer_id = c.id and r.status = 'pendiente'::receipt_status))::integer as pending_receipts,
  app.ficha_tiene_cuenta(c.id) as has_account,
  (select u.email from public.app_users u where u.customer_id = c.id limit 1) as account_email
from public.customers c
left join lateral (
  select vm.id, vm.tenant_id, vm.customer_id, vm.plan_id, vm.start_date, vm.end_date, vm.status,
         vm.price, vm.currency, vm.notes, vm.created_at, vm.created_by, vm.updated_at, vm.version,
         vm.days_remaining, vm.effective_status
  from public.v_memberships vm
  where vm.tenant_id = c.tenant_id and vm.customer_id = c.id
  order by vm.end_date desc
  limit 1
) m on true
left join public.membership_plans p on p.tenant_id = c.tenant_id and p.id = m.plan_id
left join public.check_in_tokens k on k.tenant_id = c.tenant_id and k.customer_id = c.id;

grant select on public.v_customer_list, public.v_customer_counts to authenticated;
revoke all on public.v_customer_list, public.v_customer_counts from anon;
