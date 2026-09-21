-- =============================================================================
-- V5 · La cuenta y la ficha se emparejan aunque una lleve el alias del gimnasio
-- =============================================================================
--
-- V5 introdujo un ALIAS DE CORREO por gimnasio (`mutarEmailParaTenant`): lo que
-- la persona escribe como `juan@gmail.com` se guarda en Auth y en la ficha como
-- `juan+golds-gym-premium@gmail.com`, para que la misma persona pueda ser socia
-- de dos gimnasios. La idea funciona, pero dejó tres huecos en el emparejamiento
-- cuenta ↔ ficha, que es de lo que depende TODO el alta por recepción:
--
--   · Las fichas y las cuentas creadas ANTES de V5 tienen el correo sin alias.
--     `vincular_cuenta_confirmada` compara `lower(au.email) = lower(c.email)`,
--     así que una cuenta nueva (con alias) nunca encontraba su ficha vieja (sin
--     alias), y al revés.
--   · `crear_ficha_propia` busca la ficha por el correo exacto de Auth: con una
--     ficha antigua sin alias no la encontraba y CREABA UNA SEGUNDA FICHA para
--     la misma persona. Justo lo que no puede pasar.
--   · `vincular_ficha_por_correo` (la que corre cuando recepción guarda la
--     ficha) tenía el mismo problema al revés.
--
-- La solución no es quitar el alias ni reescribir los correos de nadie: es
-- comparar por el CORREO BASE, quitando el `+etiqueta` de la parte local, que es
-- exactamente lo que hace el servidor de correo al entregarlo. Si dos fichas
-- distintas comparten correo base, las funciones ya exigen UN solo candidato y
-- se quedan sin vincular, que es lo correcto: lo resuelve una persona.
-- =============================================================================

-- ---------------------------------------------------------------- 1. correo base

create or replace function app.correo_base(p_correo text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when p_correo is null or position('@' in p_correo) = 0 then lower(btrim(p_correo))
    else lower(split_part(split_part(btrim(p_correo), '@', 1), '+', 1) || '@' || split_part(btrim(p_correo), '@', 2))
  end
$$;

comment on function app.correo_base(text) is
  'El correo sin la etiqueta +algo de la parte local: con lo que de verdad se entrega el mensaje. Se usa para emparejar cuenta y ficha cuando una lleva el alias del gimnasio y la otra no.';

revoke all on function app.correo_base(text) from public, anon;
grant execute on function app.correo_base(text) to authenticated;

-- ------------------------------------------- 2. la cuenta confirma → busca ficha

create or replace function app.vincular_cuenta_confirmada()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid;
  v_tenant uuid;
  v_customer uuid;
  v_n integer;
begin
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;

  select u.id, u.tenant_id into v_user, v_tenant
  from public.app_users u
  where u.auth_user_id = new.id
    and u.customer_id is null
    and exists (
      select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
      where ur.app_user_id = u.id and r.code = 'customer'
    )
  limit 1;
  if v_user is null then return new; end if;

  -- Tiene que haber UNA sola ficha candidata. Con dos fichas con el mismo
  -- correo no se adivina cuál es: se deja para que recepción lo resuelva.
  -- La comparación va por correo BASE: la ficha puede llevar el alias del
  -- gimnasio y la cuenta no, o al revés (V5).
  select count(*), (array_agg(c.id))[1] into v_n, v_customer
  from public.customers c
  where c.tenant_id = v_tenant
    and c.deleted_at is null
    and app.correo_base(c.email) = app.correo_base(new.email)
    and not exists (select 1 from public.app_users o where o.customer_id = c.id);

  if v_n = 1 then
    perform app._enlazar_cuenta_y_ficha(v_user, v_customer);
  end if;
  return new;
exception
  -- Un fallo aquí NO puede impedir que alguien confirme su correo o se
  -- registre: el vínculo es una comodidad, el registro no.
  when others then return new;
end;
$$;

-- --------------------------------- 3. recepción guarda la ficha → busca cuenta

create or replace function app.vincular_ficha_por_correo(p_customer uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_tenant uuid;
  v_email text;
  v_user uuid;
  v_n integer;
begin
  select c.tenant_id, c.email into v_tenant, v_email
  from public.customers c where c.id = p_customer and c.deleted_at is null;
  if v_tenant is null or v_email is null then return false; end if;

  -- Esta función es SECURITY DEFINER: salta RLS. Por eso comprueba el permiso
  -- ella misma, antes de mirar nada más.
  if not (app.tenant_allows(v_tenant, 'customers.create') or app.tenant_allows(v_tenant, 'customers.update')) then
    return false;
  end if;

  if exists (select 1 from public.app_users o where o.customer_id = p_customer) then
    return true;
  end if;

  select count(*), (array_agg(u.id))[1] into v_n, v_user
  from public.app_users u
  join auth.users au on au.id = u.auth_user_id
  where u.tenant_id = v_tenant
    and u.customer_id is null
    and u.status = 'active'
    and au.email_confirmed_at is not null
    and app.correo_base(au.email) = app.correo_base(v_email)
    and exists (
      select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
      where ur.app_user_id = u.id and r.code = 'customer'
    );

  if v_n = 1 then
    return app._enlazar_cuenta_y_ficha(v_user, p_customer);
  end if;
  return false;
end;
$$;

-- ------------------------------ 4. el socio crea su ficha en línea (V4.2)

create or replace function app.crear_ficha_propia()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := app.current_app_user_id();
  v_tenant uuid := app.current_tenant_id();
  v_customer uuid;
  v_nombre text;
  v_correo text;
  v_confirmado timestamptz;
  v_n integer;
  v_libre uuid;
  v_first text;
  v_last text;
  v_prefijo text;
  v_numero integer;
  v_codigo text;
  v_intento integer := 0;
  v_indice text;
begin
  if v_user is null or v_tenant is null then
    raise exception 'sin_cuenta' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.app_user_id = v_user and r.code = 'customer'
  ) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  select u.customer_id, u.full_name into v_customer, v_nombre from public.app_users u where u.id = v_user;
  if v_customer is not null then
    return jsonb_build_object('customer_id', v_customer, 'creada', false, 'vinculada', false);
  end if;

  -- El correo sale de Auth y tiene que estar confirmado: es lo que prueba que la
  -- persona es dueña de la dirección con la que se la va a vincular.
  select lower(au.email), au.email_confirmed_at into v_correo, v_confirmado
  from auth.users au where au.id = (select auth.uid());
  if v_correo is null or v_confirmado is null then
    raise exception 'correo_sin_confirmar' using errcode = '22023';
  end if;

  -- Por correo BASE (V5): si ya tiene ficha hecha en recepción sin el alias del
  -- gimnasio, hay que ENCONTRARLA. Buscarla por el correo exacto creaba una
  -- segunda ficha para la misma persona.
  select count(*) into v_n
  from public.customers c
  where c.tenant_id = v_tenant and c.deleted_at is null
    and app.correo_base(c.email) = app.correo_base(v_correo);

  if v_n > 1 then
    raise exception 'ficha_ambigua' using errcode = '22023';
  end if;

  if v_n = 1 then
    select c.id into v_libre
    from public.customers c
    where c.tenant_id = v_tenant and c.deleted_at is null
      and app.correo_base(c.email) = app.correo_base(v_correo)
      and not exists (select 1 from public.app_users o where o.customer_id = c.id);
    if v_libre is null then
      -- La ficha con ese correo ya es de otra cuenta. No se reasigna.
      raise exception 'ficha_de_otra_cuenta' using errcode = '22023';
    end if;
    if not app._enlazar_cuenta_y_ficha(v_user, v_libre) then
      raise exception 'ficha_de_otra_cuenta' using errcode = '22023';
    end if;
    return jsonb_build_object('customer_id', v_libre, 'creada', false, 'vinculada', true);
  end if;

  -- Nombre de la cuenta partido en nombre y apellido; recepción lo corrige al
  -- completar la ficha. El apellido no puede quedar vacío en la tabla.
  v_nombre := btrim(regexp_replace(coalesce(v_nombre, ''), '\s+', ' ', 'g'));
  v_first := split_part(v_nombre, ' ', 1);
  v_last := btrim(substr(v_nombre, length(v_first) + 1));
  if length(v_first) < 1 then v_first := split_part(v_correo, '@', 1); end if;
  if length(v_last) < 1 then v_last := '(por completar)'; end if;

  -- Mismo código correlativo que `registrar_socio`.
  select regexp_replace(c.code, '-[0-9]+$', '') into v_prefijo
  from public.customers c
  where c.tenant_id = v_tenant and c.code ~ '^[A-Z]{1,6}-[0-9]+$'
  order by c.created_at desc
  limit 1;
  if v_prefijo is null then
    select upper(left(regexp_replace(t.slug, '[^a-z]', '', 'g'), 2)) into v_prefijo from public.tenants t where t.id = v_tenant;
  end if;

  loop
    select coalesce(max((regexp_match(c.code, '-([0-9]+)$'))[1]::integer), 0) + 1 into v_numero
    from public.customers c where c.tenant_id = v_tenant and c.code like v_prefijo || '-%';
    v_codigo := v_prefijo || '-' || lpad(v_numero::text, 3, '0');
    begin
      insert into public.customers (tenant_id, code, first_name, last_name, email, status, notes, created_by)
      values (v_tenant, v_codigo, left(v_first, 80), left(v_last, 80), v_correo, 'active',
              'Ficha creada en línea al pagar. Completar datos en recepción.', v_user)
      returning id into v_customer;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_indice = constraint_name;
      if v_indice = 'customers_tenant_email_uk' then
        raise exception 'ficha_de_otra_cuenta' using errcode = '22023';
      end if;
      v_intento := v_intento + 1;
      if v_intento >= 5 then raise; end if;
    end;
  end loop;

  return jsonb_build_object('customer_id', v_customer, 'creada', true, 'vinculada', false);
end;
$$;

-- --------------- 5. la vitrina del panel necesita el slug para limpiar el alias

-- `mapearFicha` ya sabe quitar el alias, pero solo si la vista le dice de qué
-- gimnasio es la fila. Sin esto, recepción ve «juan+golds-gym-premium@gmail.com»
-- en la ficha y cree que se escribió mal el correo.
do $$
declare v_def text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'v_customer_detail' and column_name = 'tenant_slug'
  ) then
    return;
  end if;

  -- Se envuelve la definición actual en vez de reescribirla: la vista de la
  -- ficha lleva siete subconsultas afinadas en V4 y copiarlas a mano aquí sería
  -- pedir que las dos versiones se separen con el primer arreglo.
  v_def := rtrim(pg_get_viewdef('public.v_customer_detail'::regclass, true), ' ;' || chr(10) || chr(9));
  execute format(
    'create or replace view public.v_customer_detail with (security_invoker = true) as '
    'select d.*, t.slug as tenant_slug from (%s) d join public.tenants t on t.id = d.tenant_id',
    v_def
  );
  grant select on public.v_customer_detail to authenticated;
end $$;

-- ---------------------------------------------------------------- 6. comprobación

do $$
declare v_base text;
begin
  if app.correo_base('Juan+golds-gym-premium@Gmail.com') <> 'juan@gmail.com' then
    raise exception 'correo_base no quita el alias';
  end if;
  if app.correo_base('juan@gmail.com') <> 'juan@gmail.com' then
    raise exception 'correo_base estropea un correo normal';
  end if;
  if app.correo_base(null) is not null then
    raise exception 'correo_base debería devolver null con null';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'v_customer_detail' and column_name = 'tenant_slug'
  ) then
    raise exception 'v_customer_detail sigue sin tenant_slug';
  end if;

  select app.correo_base(email) into v_base from public.customers where email is not null limit 1;
  if v_base is null then raise exception 'correo_base no funciona sobre datos reales'; end if;
end $$;
