-- =============================================================================
-- V4.2 · Autorización nominal de clases e invitados que no son socios
-- =============================================================================
--
-- EL HUECO QUE CIERRA. Hoy `classes.access_mode` tiene tres valores y ninguno
-- sirve para un evento con invitados:
--
--   membresia  cualquiera con membresía vigente
--   planes     los planes marcados en «Planes que la incluyen»
--   abierta    **cualquiera que tenga ficha en el gimnasio**
--
-- «Abierta» es justo lo que el cliente pidió evitar: que alguien entre solo
-- porque la clase existe. Y un NO SOCIO no puede ni registrarse, porque
-- `class_attendances.customer_id` es obligatorio con FK a `customers`.
--
-- POR QUÉ NO SE TOCA `class_attendances`. Esa tabla significa «un SOCIO asistió
-- a esta sesión»: lleva la membresía que lo habilitó, la leen las vistas de
-- ocupación, los reportes y la lógica de reservas de V3.4, y su disparador
-- `app.validar_asistencia_a_clase` se endureció dos veces con defectos que
-- encontró la batería. Hacer `customer_id` nulo obligaría a ramificar esa
-- función entera y a revisar cada vista que da por hecho que hay socio.
--
-- Se hace lo mismo que con los pases de acceso: SEPARAR EL HECHO NUEVO.
--
--   class_attendances          «un socio asistió»      intacta
--   class_session_admissions   «esta persona está autorizada, y vino o no»
--
-- Una admisión vale para las dos audiencias: un SOCIO al que se autoriza a una
-- clase que su plan no cubre (una promoción), o un INVITADO que no tiene ficha.
-- Una fila, dos casos, con un CHECK que obliga a que sea uno u otro.
--
-- Y `access_mode` gana un cuarto valor, `autorizados`: ahí no entra nadie que no
-- tenga su admisión nominal, tenga la membresía que tenga.
-- =============================================================================

-- ---------------------------------------------------------------- 1. el modo nuevo

alter table public.classes drop constraint if exists clases_acceso;
alter table public.classes add constraint clases_acceso
  check (access_mode in ('membresia', 'planes', 'abierta', 'autorizados'));

comment on column public.classes.access_mode is
  'V4.2: membresia | planes | abierta | autorizados. «autorizados» exige una admisión nominal por persona (eventos, promociones, invitados).';

-- ---------------------------------------------------------------- 2. admisiones

create table if not exists public.class_session_admissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null,

  /** Si es un socio del gimnasio. Excluyente con los datos de invitado. */
  customer_id uuid,

  /** Si NO es socio: los datos mínimos para saber a quién se dejó entrar. */
  guest_name text,
  guest_document text,
  guest_phone text,

  /** Por qué se le autoriza: «invitado de un socio», «promoción», «evento». */
  reason text,

  /** Se rellena cuando la persona efectivamente llega. NULL = autorizada y no vino. */
  checked_in_at timestamptz,

  created_at timestamptz not null default now(),
  authorized_by uuid references public.app_users(id),

  constraint csa_sesion_del_mismo_gimnasio
    foreign key (tenant_id, session_id) references public.class_sessions(tenant_id, id) on delete cascade,
  constraint csa_socio_del_mismo_gimnasio
    foreign key (tenant_id, customer_id) references public.customers(tenant_id, id) on delete cascade,

  -- O socio, o invitado con nombre. Nunca las dos cosas, nunca ninguna: una
  -- admisión sin persona es una puerta abierta sin dueño.
  constraint csa_socio_o_invitado check (
    (customer_id is not null and guest_name is null)
    or (customer_id is null and length(btrim(coalesce(guest_name, ''))) between 2 and 120)
  ),
  constraint csa_documento check (guest_document is null or length(btrim(guest_document)) between 3 and 30),
  constraint csa_motivo check (reason is null or length(reason) <= 200)
);

comment on table public.class_session_admissions is
  'V4.2: quién está autorizado a una sesión, sea socio (promoción) o invitado sin ficha. No sustituye a class_attendances, que sigue siendo la asistencia de los socios.';

-- Un socio no se autoriza dos veces a la misma sesión. Parcial porque para los
-- invitados `customer_id` es NULL y varios NULL no chocan entre sí.
create unique index if not exists csa_un_socio_por_sesion
  on public.class_session_admissions (session_id, customer_id)
  where customer_id is not null;

-- Y un invitado tampoco, identificado por su documento cuando lo dio.
create unique index if not exists csa_un_invitado_por_sesion
  on public.class_session_admissions (session_id, lower(btrim(guest_document)))
  where customer_id is null and guest_document is not null;

create index if not exists csa_tenant_sesion_idx
  on public.class_session_admissions (tenant_id, session_id);

-- ---------------------------------------------------------------- 3. disparador

create or replace function app.preparar_admision()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_sesion public.class_sessions%rowtype;
  v_ocup   record;
begin
  select * into v_sesion from public.class_sessions s where s.id = new.session_id for update;
  if not found or v_sesion.tenant_id <> new.tenant_id then
    raise exception 'sesion_no_disponible' using errcode = '22023';
  end if;

  -- Autorizar es operar EN esa sesión: la misma función que decide quién toma
  -- asistencia allí, no el permiso suelto (lección de V3.3: un permiso dice QUÉ
  -- se puede hacer, no DÓNDE).
  if not app.puede_tomar_asistencia(v_sesion.id) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  if v_sesion.status = 'cancelada' then
    raise exception 'sesion_cancelada' using errcode = '22023';
  end if;

  new.guest_name     := nullif(btrim(coalesce(new.guest_name, '')), '');
  new.guest_document := nullif(btrim(coalesce(new.guest_document, '')), '');
  new.guest_phone    := nullif(btrim(coalesce(new.guest_phone, '')), '');
  new.reason         := nullif(btrim(coalesce(new.reason, '')), '');
  new.created_at     := now();
  new.authorized_by  := app.current_app_user_id();

  if tg_op = 'INSERT' then
    -- El cupo es UNO solo: asistentes, reservas sin llegar y admisiones ya
    -- concedidas. Autorizar por encima del aforo es prometer un lugar que no
    -- existe, y con la sesión bloqueada arriba dos mostradores no pueden
    -- hacerlo a la vez.
    select * into v_ocup from app.ocupacion_de_sesion(v_sesion.id);
    if v_ocup.ocupados
       + (select count(*) from public.class_session_admissions a
          where a.session_id = v_sesion.id and a.customer_id is null)
       >= v_sesion.capacity then
      raise exception 'clase_llena' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function app.preparar_admision() from public, anon, authenticated;

drop trigger if exists preparar_admision on public.class_session_admissions;
create trigger preparar_admision
  before insert or update on public.class_session_admissions
  for each row execute function app.preparar_admision();

-- ---------------------------------------------------------------- 4. la regla de acceso

-- `acceso_a_clase` gana el modo `autorizados`. El resto NO cambia: los tres
-- modos que ya existían siguen respondiendo exactamente igual.
create or replace function app.acceso_a_clase(p_class uuid, p_customer uuid, p_fecha date)
returns table(membership_id uuid, plan_id uuid, motivo text)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_modo   text;
  v_tenant uuid;
begin
  select c.access_mode, c.tenant_id into v_modo, v_tenant from public.classes c where c.id = p_class;
  if v_modo is null then
    return query select null::uuid, null::uuid, 'clase_no_disponible'::text;
    return;
  end if;

  -- V4.2 · Con `autorizados`, la membresía no basta ni sobra: hace falta que
  -- alguien haya autorizado a ESA persona en ESA sesión.
  if v_modo = 'autorizados' then
    if exists (
      select 1
      from public.class_session_admissions a
      join public.class_sessions s on s.id = a.session_id
      where a.tenant_id = v_tenant and a.customer_id = p_customer
        and s.class_id = p_class and s.session_date = p_fecha
    ) then
      return query
        select m.id, m.plan_id, 'ok'::text
        from public.memberships m
        where m.tenant_id = v_tenant and m.customer_id = p_customer
          and m.status = 'active' and m.start_date <= p_fecha and m.end_date >= p_fecha
        order by m.end_date desc
        limit 1;
      if found then return; end if;
      -- Autorizado aunque no tenga membresía vigente: para eso es una admisión.
      return query select null::uuid, null::uuid, 'ok'::text;
      return;
    end if;
    return query select null::uuid, null::uuid, 'no_autorizado'::text;
    return;
  end if;

  return query
  with vigentes as (
    select m.id, m.plan_id, m.end_date
    from public.memberships m
    where m.tenant_id = v_tenant and m.customer_id = p_customer
      and m.status = 'active' and m.start_date <= p_fecha and m.end_date >= p_fecha
  ),
  habilitante as (
    select v.id, v.plan_id from vigentes v
    where v_modo = 'membresia'
       or exists (select 1 from public.class_plans cp where cp.class_id = p_class and cp.plan_id = v.plan_id)
    order by v.end_date desc
    limit 1
  )
  select h.id, h.plan_id, 'ok'::text from habilitante h
  union all
  select null::uuid, null::uuid,
         case
           when v_modo = 'abierta' then 'ok'
           when exists (select 1 from vigentes) then 'plan_no_incluye_clase'
           else 'sin_membresia_vigente'
         end
  where not exists (select 1 from habilitante)
  limit 1;
end;
$function$;

-- ---------------------------------------------------------------- 5. RLS

alter table public.class_session_admissions enable row level security;

-- La lee quien gestiona clases, quien puede tomar asistencia EN esa sesión y el
-- propio socio autorizado. Un invitado no tiene cuenta: no lee nada.
drop policy if exists csa_select on public.class_session_admissions;
create policy csa_select on public.class_session_admissions
  for select to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and (
      (select app.has_permission('classes.manage'))
      or app.puede_tomar_asistencia(session_id)
      or customer_id = (select app.current_customer_id())
    )
  );

drop policy if exists csa_insert on public.class_session_admissions;
create policy csa_insert on public.class_session_admissions
  for insert to authenticated
  with check (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('classes.attend'))
    and app.puede_tomar_asistencia(session_id)
  );

drop policy if exists csa_update on public.class_session_admissions;
create policy csa_update on public.class_session_admissions
  for update to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('classes.attend'))
    and app.puede_tomar_asistencia(session_id)
  )
  with check (tenant_id = (select app.current_tenant_id()));

drop policy if exists csa_delete on public.class_session_admissions;
create policy csa_delete on public.class_session_admissions
  for delete to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('classes.attend'))
    and app.puede_tomar_asistencia(session_id)
  );

revoke all on public.class_session_admissions from anon, authenticated;
grant select on public.class_session_admissions to authenticated;
-- La autoría y la fecha las pone el disparador y no se conceden.
grant insert (tenant_id, session_id, customer_id, guest_name, guest_document, guest_phone, reason)
  on public.class_session_admissions to authenticated;
-- Solo se actualiza la llegada: marcar que vino, o deshacerlo.
grant update (checked_in_at) on public.class_session_admissions to authenticated;
grant delete on public.class_session_admissions to authenticated;

-- ---------------------------------------------------------------- 6. vista

create or replace view public.v_class_session_admissions
with (security_invoker = true) as
select
  a.id,
  a.tenant_id,
  a.session_id,
  a.customer_id,
  c.code as customer_code,
  coalesce(c.first_name || ' ' || c.last_name, a.guest_name) as nombre,
  (a.customer_id is null) as es_invitado,
  a.guest_document,
  a.guest_phone,
  a.reason,
  a.checked_in_at,
  (a.checked_in_at is not null) as vino,
  a.created_at
from public.class_session_admissions a
left join public.customers c on c.tenant_id = a.tenant_id and c.id = a.customer_id;

comment on view public.v_class_session_admissions is
  'V4.2: admisiones de una sesión con el nombre resuelto, sea socio o invitado.';

grant select on public.v_class_session_admissions to authenticated;
revoke all on public.v_class_session_admissions from anon;

-- ---------------------------------------------------------------- 7. comprobación

do $$
declare n int;
begin
  -- Ninguna clase existente cambia de modo.
  select count(*) into n from public.classes where access_mode = 'autorizados';
  if n <> 0 then raise exception '% clases quedaron en modo autorizados sin pedirlo', n; end if;

  -- `class_attendances` sigue exigiendo socio: no se tocó.
  select count(*) into n from information_schema.columns
  where table_schema = 'public' and table_name = 'class_attendances'
    and column_name = 'customer_id' and is_nullable = 'NO';
  if n <> 1 then raise exception 'class_attendances.customer_id dejó de ser obligatoria'; end if;
end $$;
