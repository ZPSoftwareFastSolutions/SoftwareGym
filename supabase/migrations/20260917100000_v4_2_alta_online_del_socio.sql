-- V4.2 · Alta online del socio: pagar y subir el comprobante sin pasar antes por recepción.
--
-- EL PROBLEMA. `receipts_insert_self` exige `customer_id = app.current_customer_id()`:
-- solo una cuenta YA vinculada a su ficha sube comprobantes, y crear una ficha
-- exige `customers.create` (personal). Quien se registraba en la web, elegía un
-- plan y pagaba por QR no podía subir la captura: tenía que ir a recepción o
-- mandar sus datos por WhatsApp.
--
-- LA SOLUCIÓN, SIN ESTADOS NUEVOS.
-- 1. `public.crear_mi_ficha()` (invocador) → `app.crear_ficha_propia()` (DEFINER):
--    la cuenta de la sesión, con el correo CONFIRMADO, obtiene su ficha. Si ya
--    existe UNA ficha libre con ese correo en su gimnasio (la creó recepción),
--    se VINCULA esa, no se crea otra. Con dos candidatas no adivina.
-- 2. Un correo, una ficha por gimnasio (índice único): recepción ya no puede dar
--    de alta a quien se registró en línea, ni al revés, con el mismo correo.
-- 3. Una ficha creada por el propio socio (autoría = su cuenta) y SIN NINGUNA
--    membresía no entra al gimnasio: ni pase de acceso ni asistencia. Subir un
--    comprobante no da acceso; lo da la membresía que crea `revisar_comprobante`
--    al aprobarlo. Las fichas que crea recepción no cambian de comportamiento.
--
-- «Socio pendiente» NO es un estado de la base: es una lectura de la aplicación
-- (membresía aprobada + datos presenciales que el gimnasio exige y faltan).

-- ---------------------------------------------------------------------------
-- 2. Un correo, una ficha por gimnasio. Comprobado antes: 0 duplicados.
create unique index if not exists customers_tenant_email_uk
  on public.customers (tenant_id, lower(email))
  where email is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- 1. Ficha propia para pagar.
create or replace function app.crear_ficha_propia()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user      uuid := app.current_app_user_id();
  v_tenant    uuid := app.current_tenant_id();
  v_customer  uuid;
  v_nombre    text;
  v_correo    text;
  v_confirmado timestamptz;
  v_n         integer;
  v_libre     uuid;
  v_first     text;
  v_last      text;
  v_prefijo   text;
  v_numero    integer;
  v_codigo    text;
  v_intento   integer := 0;
  v_indice    text;
begin
  if v_user is null or v_tenant is null then
    raise exception 'sin_cuenta' using errcode = '42501';
  end if;

  -- Solo una cuenta de socio: el personal no se crea fichas a sí mismo por aquí.
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

  select count(*) into v_n
  from public.customers c
  where c.tenant_id = v_tenant and c.deleted_at is null and lower(c.email) = v_correo;

  if v_n > 1 then
    raise exception 'ficha_ambigua' using errcode = '22023';
  end if;

  if v_n = 1 then
    select c.id into v_libre
    from public.customers c
    where c.tenant_id = v_tenant and c.deleted_at is null and lower(c.email) = v_correo
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

  if not app._enlazar_cuenta_y_ficha(v_user, v_customer) then
    raise exception 'sin_cuenta' using errcode = '42501';
  end if;

  return jsonb_build_object('customer_id', v_customer, 'code', v_codigo, 'creada', true, 'vinculada', true);
end;
$$;

revoke all on function app.crear_ficha_propia() from public, anon;
grant execute on function app.crear_ficha_propia() to authenticated;

create or replace function public.crear_mi_ficha()
returns jsonb
language sql
security invoker
set search_path to ''
as $$ select app.crear_ficha_propia() $$;

revoke all on function public.crear_mi_ficha() from public, anon;
grant execute on function public.crear_mi_ficha() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Sin pago aprobado no hay entrada (solo fichas creadas por el propio socio).
create or replace function app.ficha_propia_sin_membresia(p_customer uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.customers c
    join public.app_users u on u.customer_id = c.id and u.id = c.created_by
    where c.id = p_customer
  )
  and not exists (select 1 from public.memberships m where m.customer_id = p_customer)
$$;

revoke all on function app.ficha_propia_sin_membresia(uuid) from public, anon;
grant execute on function app.ficha_propia_sin_membresia(uuid) to authenticated;

create or replace function app.exigir_pago_aprobado_para_entrar()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if app.ficha_propia_sin_membresia(new.customer_id) then
    raise exception 'ficha_sin_pago_aprobado' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists access_passes_exigir_pago_aprobado on public.access_passes;
create trigger access_passes_exigir_pago_aprobado
  before insert on public.access_passes
  for each row execute function app.exigir_pago_aprobado_para_entrar();

drop trigger if exists attendance_exigir_pago_aprobado on public.attendance_records;
create trigger attendance_exigir_pago_aprobado
  before insert on public.attendance_records
  for each row execute function app.exigir_pago_aprobado_para_entrar();

-- ---------------------------------------------------------------------------
-- 2b. `registrar_socio` traduce el correo repetido a un error de negocio.
do $do$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'registrar_socio';

  if position('customers_tenant_email_uk' in v_def) = 0 then
    v_def := replace(
      v_def,
      $a$      if v_indice = 'customers_tenant_document_uk' then$a$,
      $b$      if v_indice = 'customers_tenant_email_uk' then
        raise exception 'correo_duplicado' using errcode = '23505';
      end if;
      if v_indice = 'customers_tenant_document_uk' then$b$
    );
    if position('customers_tenant_email_uk' in v_def) = 0 then
      raise exception 'no se encontró el punto de inserción en registrar_socio';
    end if;
    execute v_def;
  end if;
end;
$do$;
