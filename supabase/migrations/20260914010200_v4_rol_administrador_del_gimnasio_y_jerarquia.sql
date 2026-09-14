-- =============================================================================
-- V4 · ADMINISTRACIÓN DEL GIMNASIO — rol `admin`, jerarquía de roles y gestión de personal
-- =============================================================================
--
-- QUÉ FALTABA. El nivel más alto dentro de un gimnasio era Gerencia, y no había
-- forma de gestionar personal y roles desde el producto. Peor: la política
-- `user_roles_insert_gimnasio` dejaba a cualquiera con `users.manage` otorgar
-- CUALQUIER rol de alcance `tenant` —un gerente podía nombrar gerentes y, en
-- cuanto existiera un rol superior, nombrarse a sí mismo—. Miraba QUÉ ALCANCE
-- tenía el rol, no QUÉ NIVEL.
--
-- QUÉ SE HACE.
-- 1. `roles.level`: admin 40 · gerencia 30 · recepción 20 · entrenador 10 ·
--    socio 0 · plataforma 100. Es la única jerarquía; el dominio la replica solo
--    para no ofrecer botones que la base rechaza.
-- 2. Permiso `roles.manage` y rol `admin` (Administrador): todos los permisos de
--    gimnasio (todo lo que tiene Gerencia más `roles.manage`), nunca
--    `tenants.manage` (plataforma) ni `trainers.self` (trabajar como entrenador).
--    Sigue siendo un rol de gimnasio: `app.tenant_allows` y cada política lo
--    atan a SU gimnasio. No hay nada «global» en él.
-- 3. Otorgar y quitar roles mira el nivel: con `roles.manage`, hasta el propio
--    nivel (un administrador nombra a otro); con `users.manage` a secas, solo
--    por debajo. Nadie toca sus propios roles ni su propia cuenta, ni la de
--    alguien de nivel superior. El gimnasio no se queda sin su último
--    administrador activo.
-- 4. RPC invocador `otorgar_rol`, `retirar_rol`, `cambiar_estado_de_cuenta` y,
--    para la plataforma, `designar_administrador_de_gimnasio` (alta del primer
--    administrador de un gimnasio). Autoría y auditoría salen de la sesión.
-- =============================================================================

-- ---------------------------------------------------------------- 1. niveles

alter table public.roles
  add column level smallint not null default 0
  constraint roles_level_valido check (level between 0 and 100);

comment on column public.roles.level is
  'V4: jerarquía. Se otorga hasta el propio nivel con roles.manage, o por debajo con users.manage.';

update public.roles set level = case code
  when 'super_admin' then 100
  when 'manager' then 30
  when 'receptionist' then 20
  when 'trainer' then 10
  else 0
end;

-- ---------------------------------------------------------------- 2. permiso y rol

insert into public.permissions (code, module, action, description)
values ('roles.manage', 'roles', 'manage', 'Otorgar y quitar roles del gimnasio hasta el propio nivel')
on conflict (code) do nothing;

insert into public.roles (code, name, description, scope, is_system, level, tenant_id)
select 'admin', 'Administrador',
       'Control administrativo total del gimnasio: todos sus módulos, su personal y sus roles. Nunca otro gimnasio.',
       'tenant', true, 40, null
where not exists (select 1 from public.roles where code = 'admin' and tenant_id is null);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'admin' and r.tenant_id is null
  and p.code not in ('tenants.manage', 'trainers.self')
on conflict do nothing;

-- ---------------------------------------------------------------- 3. ayudantes

create function app.nivel_de_la_sesion()
returns smallint
language sql stable security definer
set search_path = ''
as $$
  select coalesce(max(r.level), 0)::smallint
  from public.app_users u
  join public.user_roles ur on ur.app_user_id = u.id
  join public.roles r on r.id = ur.role_id
  where u.auth_user_id = (select auth.uid())
    and u.status = 'active'
    and r.scope = 'tenant'
$$;

create function app.nivel_de_cuenta(p_app_user uuid)
returns smallint
language sql stable security definer
set search_path = ''
as $$
  select coalesce(max(r.level), 0)::smallint
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.app_user_id = p_app_user
    and r.scope = 'tenant'
$$;

-- Si la sesión puede otorgar o quitar un rol de ese nivel (sin mirar a quién).
create function app.puede_otorgar_nivel(p_level smallint)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select app.current_tenant_id() is not null
     and app.has_permission('users.manage')
     and (
       p_level < app.nivel_de_la_sesion()
       or (app.has_permission('roles.manage') and p_level <= app.nivel_de_la_sesion())
     )
$$;

-- Si la sesión puede tocar los roles o el estado de OTRA cuenta de su gimnasio.
create function app.puede_administrar_cuenta(p_app_user uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_users u
    where u.id = p_app_user
      and u.tenant_id is not null
      and u.tenant_id = app.current_tenant_id()
  )
  and p_app_user is distinct from app.current_app_user_id()
  and app.puede_otorgar_nivel(app.nivel_de_cuenta(p_app_user))
$$;

revoke all on function app.nivel_de_la_sesion(), app.nivel_de_cuenta(uuid),
  app.puede_otorgar_nivel(smallint), app.puede_administrar_cuenta(uuid) from public, anon;
grant execute on function app.nivel_de_la_sesion(), app.nivel_de_cuenta(uuid),
  app.puede_otorgar_nivel(smallint), app.puede_administrar_cuenta(uuid) to authenticated;

-- ---------------------------------------------------------------- 4. políticas

drop policy if exists user_roles_insert_gimnasio on public.user_roles;
create policy user_roles_insert_gimnasio on public.user_roles
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.app_users u
      join public.roles r on r.id = user_roles.role_id
      where u.id = user_roles.app_user_id
        and u.tenant_id = (select app.current_tenant_id())
        and r.scope = 'tenant'
        and (r.tenant_id is null or r.tenant_id = u.tenant_id)
        and app.puede_otorgar_nivel(r.level)
    )
  );

drop policy if exists user_roles_delete_gimnasio on public.user_roles;
create policy user_roles_delete_gimnasio on public.user_roles
  for delete to authenticated
  using (
    exists (
      select 1
      from public.app_users u
      join public.roles r on r.id = user_roles.role_id
      where u.id = user_roles.app_user_id
        and u.tenant_id = (select app.current_tenant_id())
        and r.scope = 'tenant'
        and app.puede_otorgar_nivel(r.level)
        and app.puede_administrar_cuenta(u.id)
    )
  );

-- Cuentas: gerencia ya no desactiva (ni reescribe) a quien está a su altura o
-- por encima, y nadie se desactiva a sí mismo.
drop policy if exists app_users_update on public.app_users;
create policy app_users_update on public.app_users
  for update to authenticated
  using (
    (select app.is_platform_admin())
    or (
      tenant_id = (select app.current_tenant_id())
      and (select app.has_permission('users.manage'))
      and app.puede_administrar_cuenta(id)
    )
  )
  with check (
    (select app.is_platform_admin())
    or (
      tenant_id = (select app.current_tenant_id())
      and (select app.has_permission('users.manage'))
      and app.puede_administrar_cuenta(id)
    )
  );

-- ---------------------------------------------------------------- 5. disparadores

-- Quién otorgó sale de la sesión, nunca del cliente.
create function app.preparar_rol_otorgado()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.granted_by := app.current_app_user_id();
  new.granted_at := now();
  return new;
end;
$$;

create trigger user_roles_preparar
  before insert on public.user_roles
  for each row execute function app.preparar_rol_otorgado();

-- El gimnasio no se queda sin su último administrador activo. Sin sesión
-- (mantenimiento con la clave de servicio o una migración) y desde la
-- plataforma no aplica: son quienes reparan un gimnasio mal configurado.
create function app.conservar_un_administrador()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_cuenta uuid;
  v_tenant uuid;
begin
  if app.current_app_user_id() is null or app.is_platform_admin() then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'user_roles' then
    if not exists (select 1 from public.roles r where r.id = old.role_id and r.code = 'admin') then
      return old;
    end if;
    v_cuenta := old.app_user_id;
  else
    if new.status = old.status or new.status = 'active' then
      return new;
    end if;
    if not exists (
      select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
      where ur.app_user_id = old.id and r.code = 'admin'
    ) then
      return new;
    end if;
    v_cuenta := old.id;
  end if;

  select u.tenant_id into v_tenant from public.app_users u where u.id = v_cuenta;

  if not exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.app_users u on u.id = ur.app_user_id
    where r.code = 'admin'
      and u.tenant_id = v_tenant
      and u.status = 'active'
      and u.id <> v_cuenta
  ) then
    raise exception 'ultimo_administrador' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger user_roles_conservar_administrador
  before delete on public.user_roles
  for each row execute function app.conservar_un_administrador();

create trigger app_users_conservar_administrador
  before update of status on public.app_users
  for each row execute function app.conservar_un_administrador();

-- Auditoría: quién dio o quitó qué rol y a qué cuenta (sin datos personales: la
-- plataforma también lee `audit_log`).
create function app.auditar_rol()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_fila public.user_roles%rowtype;
begin
  v_fila := coalesce(new, old);
  insert into public.audit_log (tenant_id, action, entity, entity_id, metadata)
  select u.tenant_id,
         case tg_op when 'INSERT' then 'role.granted' else 'role.revoked' end,
         'user_roles',
         v_fila.app_user_id::text,
         jsonb_build_object('role', r.code, 'level', r.level)
  from public.app_users u
  join public.roles r on r.id = v_fila.role_id
  where u.id = v_fila.app_user_id;
  return null;
end;
$$;

create trigger user_roles_auditar
  after insert or delete on public.user_roles
  for each row execute function app.auditar_rol();

create function app.auditar_estado_de_cuenta()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (tenant_id, action, entity, entity_id, metadata)
  values (new.tenant_id, 'account.status_changed', 'app_users', new.id::text,
          jsonb_build_object('from', old.status, 'to', new.status));
  return null;
end;
$$;

create trigger app_users_auditar_estado
  after update of status on public.app_users
  for each row when (old.status is distinct from new.status)
  execute function app.auditar_estado_de_cuenta();

-- ---------------------------------------------------------------- 6. RPC (invocador)

create function public.otorgar_rol(p_usuario uuid, p_rol text)
returns void
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_rol public.roles%rowtype;
  v_cuenta public.app_users%rowtype;
begin
  if not app.has_permission('users.manage') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  -- Entrenador y socio tienen su propio flujo (vincular perfil, registrarse).
  if p_rol is null or p_rol not in ('admin', 'manager', 'receptionist') then
    raise exception 'rol_no_otorgable';
  end if;

  select * into v_rol from public.roles where code = p_rol and scope = 'tenant' and tenant_id is null;
  select * into v_cuenta from public.app_users where id = p_usuario;
  if not found or v_cuenta.tenant_id is distinct from app.current_tenant_id() then
    raise exception 'cuenta_no_encontrada';
  end if;
  if v_cuenta.status <> 'active' then
    raise exception 'cuenta_inactiva';
  end if;
  if exists (select 1 from public.user_roles where app_user_id = p_usuario and role_id = v_rol.id) then
    raise exception 'ya_tiene_el_rol';
  end if;
  if not app.puede_otorgar_nivel(v_rol.level) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  insert into public.user_roles (app_user_id, role_id) values (p_usuario, v_rol.id);
end;
$$;

create function public.retirar_rol(p_usuario uuid, p_rol text)
returns void
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_borradas integer;
begin
  if not app.has_permission('users.manage') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_rol is null or p_rol not in ('admin', 'manager', 'receptionist') then
    raise exception 'rol_no_otorgable';
  end if;
  if p_usuario = app.current_app_user_id() then
    raise exception 'cuenta_propia';
  end if;

  delete from public.user_roles ur
  using public.roles r
  where r.id = ur.role_id
    and r.code = p_rol
    and r.tenant_id is null
    and ur.app_user_id = p_usuario;
  get diagnostics v_borradas = row_count;

  -- Cero filas: no tenía ese rol, es de otro gimnasio o está por encima de
  -- quien pregunta. La misma respuesta para las tres: distinguirlas filtra.
  if v_borradas = 0 then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
end;
$$;

create function public.cambiar_estado_de_cuenta(p_usuario uuid, p_activa boolean)
returns void
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_cambiadas integer;
begin
  if not app.has_permission('users.manage') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_usuario = app.current_app_user_id() then
    raise exception 'cuenta_propia';
  end if;

  update public.app_users
  set status = case when p_activa then 'active'::public.user_status else 'suspended'::public.user_status end,
      updated_at = now()
  where id = p_usuario;
  get diagnostics v_cambiadas = row_count;

  if v_cambiadas = 0 then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
end;
$$;

-- Alta del primer administrador de un gimnasio. La cuenta tiene que existir y
-- ser de ESE gimnasio (se registró en su sitio): la plataforma no crea cuentas
-- ni contraseñas, solo otorga el rol.
create function public.designar_administrador_de_gimnasio(p_tenant uuid, p_correo text)
returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_cuenta uuid;
  v_rol uuid;
begin
  if not app.is_platform_admin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  select u.id into v_cuenta
  from public.app_users u
  where u.tenant_id = p_tenant
    and lower(u.email) = lower(btrim(coalesce(p_correo, '')))
    and u.status = 'active';
  if v_cuenta is null then
    raise exception 'cuenta_no_encontrada';
  end if;

  select id into v_rol from public.roles where code = 'admin' and tenant_id is null;
  if exists (select 1 from public.user_roles where app_user_id = v_cuenta and role_id = v_rol) then
    raise exception 'ya_tiene_el_rol';
  end if;

  insert into public.user_roles (app_user_id, role_id) values (v_cuenta, v_rol);
  return v_cuenta;
end;
$$;

revoke all on function public.otorgar_rol(uuid, text), public.retirar_rol(uuid, text),
  public.cambiar_estado_de_cuenta(uuid, boolean), public.designar_administrador_de_gimnasio(uuid, text)
  from public, anon;
grant execute on function public.otorgar_rol(uuid, text), public.retirar_rol(uuid, text),
  public.cambiar_estado_de_cuenta(uuid, boolean), public.designar_administrador_de_gimnasio(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------- 7. vista de personal

-- Cuentas del gimnasio con sus roles y su nivel, para «Personal y roles».
-- `security_invoker`: la lee quien tiene `users.read` en su gimnasio (y la
-- plataforma, que ya leía `v_users_roles`).
create view public.v_staff
with (security_invoker = true) as
select
  u.id,
  u.tenant_id,
  u.full_name,
  u.email,
  u.status,
  u.created_at,
  u.customer_id,
  coalesce(array_agg(r.code order by r.level desc) filter (where r.id is not null), array[]::text[]) as roles,
  coalesce(max(r.level) filter (where r.scope = 'tenant'), 0)::smallint as level,
  bool_or(r.code in ('admin', 'manager', 'receptionist', 'trainer')) is true as is_staff
from public.app_users u
left join public.user_roles ur on ur.app_user_id = u.id
left join public.roles r on r.id = ur.role_id
where u.tenant_id is not null
group by u.id;

grant select on public.v_staff to authenticated;
revoke all on public.v_staff from anon;
