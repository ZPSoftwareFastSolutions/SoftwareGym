-- =============================================================================
-- V4 · Batería de pruebas: administración, jerarquía de roles, rutinas y rendimiento
-- =============================================================================
--
-- Cada bloque es independiente y NO DEJA RASTRO: termina con `raise exception`
-- y la transacción entera se revierte (incluidos los roles de prueba que otorga
-- como `postgres` al empezar). Ejecutar en el SQL editor de Supabase o por MCP,
-- un bloque cada vez, DESPUÉS de aplicar las migraciones 20260914010000…010300.
--
-- Ids de la base de demostración (CLAUDE.md §8):
--   Mítico           4b79e41f-6d51-407a-a16f-bce8b000b50c
--   gerencia (auth)  758b1b40-4e4a-4fee-9bbd-750d03b05f5a
--   recepción (auth) fcef6ed7-6aad-42a5-b543-969eb2acaf81
--   entrenador(auth) 35b0cff9-48ee-44b8-8581-89cda456ca57
--   Juan Pérez(auth) a370ad78-0725-4fdc-a8d2-2b1e5b3625d1
--   plataforma(auth) 4e5d445a-cf7e-4043-a7e4-78d130afd4af
--
-- Trampas conocidas (§9.2): resolver los ids ANTES de cambiar de rol; medir cada
-- rol en su propia sentencia.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. HUELLA DE VISIBILIDAD (antes y después de 20260914010000)
--    El md5 de cada rol tiene que ser IDÉNTICO antes y después de reescribir las
--    políticas. Valores de antes (2026-09-14):
--      gerencia   e8d4fb042e01c3fc5d7f86fb6546343c
--      recepcion  912aed44731ab78e7c6bc9d985ce5556
--      entrenador 97dd4e7ab8582b9f95fd46437ec17b30
--      socio      cb2dbe4aa5502d2cbd1d6ec6cbc4390c
--      plataforma 1d6a956ba514efb02ccec7b6a44b81bd
--      anonimo    d40031d2eddde31970135b65692085cb
--    OJO: las migraciones 010100+ crean vistas nuevas (v_customer_list…), que
--    cambian la lista de relaciones. Para comparar, correr la huella justo
--    después de 010000 o excluir las vistas `v_customer_list`,
--    `v_customer_counts`, `v_attendance_patterns` y `v_staff`.
-- -----------------------------------------------------------------------------
do $$
declare
  cuentas text[] := array[
    'gerencia:758b1b40-4e4a-4fee-9bbd-750d03b05f5a',
    'recepcion:fcef6ed7-6aad-42a5-b543-969eb2acaf81',
    'entrenador:35b0cff9-48ee-44b8-8581-89cda456ca57',
    'socio:a370ad78-0725-4fdc-a8d2-2b1e5b3625d1',
    'plataforma:4e5d445a-cf7e-4043-a7e4-78d130afd4af',
    'anonimo:'];
  nuevas text[] := array['v_customer_list', 'v_customer_counts', 'v_attendance_patterns', 'v_staff'];
  c text; quien text; sub text; rel record; n bigint; linea text; salida text := '';
begin
  foreach c in array cuentas loop
    quien := split_part(c, ':', 1); sub := split_part(c, ':', 2);
    linea := '';
    if sub = '' then
      perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
      execute 'set local role anon';
    else
      perform set_config('request.jwt.claims', json_build_object('sub', sub, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
    end if;
    for rel in
      select c2.relname from pg_class c2 join pg_namespace n2 on n2.oid = c2.relnamespace
      where n2.nspname = 'public' and c2.relkind in ('r', 'v') and not (c2.relname = any (nuevas))
      order by c2.relname
    loop
      begin
        execute format('select count(*) from public.%I', rel.relname) into n;
        linea := linea || rel.relname || '=' || n || ' ';
      exception when others then
        linea := linea || rel.relname || '=E' || sqlstate || ' ';
      end;
    end loop;
    execute 'reset role';
    salida := salida || quien || ' md5=' || md5(linea) || E'\n';
  end loop;
  raise exception E'HUELLA\n%', salida;
end $$;


-- -----------------------------------------------------------------------------
-- 1. RENDIMIENTO con volumen (2 000 socios, 50 000 entradas, 6 000 pagos)
--    Antes de V4: count(*) de asistencias > 20 s, 500 fichas 34 s, bitácora
--    800 filas 57 s, KPIs sobre el statement_timeout. Esperado después: cada
--    medición en milisegundos o pocos cientos.
-- -----------------------------------------------------------------------------
do $$
declare
  t uuid := '4b79e41f-6d51-407a-a16f-bce8b000b50c';
  prado uuid := '26ee6a4c-33bf-4bd3-acfa-3f356e759e4c';
  plan uuid; r text := ''; t0 timestamptz; n int;
begin
  select id into plan from membership_plans where tenant_id = t limit 1;
  insert into customers (tenant_id, first_name, last_name, code, email)
  select t, 'Carga' || g, 'Prueba' || lpad(g::text, 5, '0'), 'LT-' || g, 'lt' || g || '@ejemplo.test' from generate_series(1, 2000) g;
  insert into memberships (tenant_id, customer_id, plan_id, start_date, end_date, status, price, currency)
  select t, c.id, plan, current_date - 20, current_date + (random() * 40)::int - 10, 'active', 100, 'BOB' from customers c where c.code like 'LT-%';
  insert into attendance_records (tenant_id, customer_id, branch_id, method, checked_in_at)
  select t, c.id, prado, 'manual', now() - (d || ' days')::interval from customers c cross join generate_series(1, 25) d where c.code like 'LT-%';
  insert into payments (tenant_id, customer_id, amount, currency, method, paid_at)
  select t, c.id, 100, 'BOB', 'cash', now() - (d || ' days')::interval from customers c cross join generate_series(1, 3) d where c.code like 'LT-%';
  analyze customers; analyze attendance_records; analyze memberships; analyze payments;

  perform set_config('request.jwt.claims', json_build_object('sub', '758b1b40-4e4a-4fee-9bbd-750d03b05f5a', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  t0 := clock_timestamp(); select count(*) into n from attendance_records;
  r := r || format('asistencias_count(%s)=%sms ', n, extract(milliseconds from clock_timestamp() - t0)::int);
  t0 := clock_timestamp(); perform * from (select * from v_customer_list where deleted_at is null order by last_name, first_name limit 25) x;
  r := r || format('lista_25=%sms ', extract(milliseconds from clock_timestamp() - t0)::int);
  t0 := clock_timestamp(); select count(*) into n from v_customer_list where deleted_at is null;
  r := r || format('lista_total(%s)=%sms ', n, extract(milliseconds from clock_timestamp() - t0)::int);
  t0 := clock_timestamp(); perform * from v_customer_counts;
  r := r || format('conteos=%sms ', extract(milliseconds from clock_timestamp() - t0)::int);
  t0 := clock_timestamp(); perform * from (select * from v_attendance_log order by checked_in_at desc limit 25) x;
  r := r || format('bitacora_25=%sms ', extract(milliseconds from clock_timestamp() - t0)::int);
  t0 := clock_timestamp(); perform * from v_attendance_patterns;
  r := r || format('patrones=%sms ', extract(milliseconds from clock_timestamp() - t0)::int);
  t0 := clock_timestamp(); perform * from v_dashboard_kpis;
  r := r || format('kpis=%sms ', extract(milliseconds from clock_timestamp() - t0)::int);

  raise exception 'RENDIMIENTO: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- 2. ADMINISTRACIÓN: el rol existe con todos los permisos de gimnasio y ninguno de plataforma
--    Esperado: admin_permisos = permisos de gerencia + 1 (roles.manage);
--    sin tenants.manage ni trainers.self; niveles 40/30/20/10/0/100.
-- -----------------------------------------------------------------------------
do $$
declare r text;
begin
  select format('admin_permisos=%s gerencia_permisos=%s plataforma_en_admin=%s entrenador_en_admin=%s niveles=%s',
    (select count(*) from role_permissions rp join roles ro on ro.id = rp.role_id where ro.code = 'admin'),
    (select count(*) from role_permissions rp join roles ro on ro.id = rp.role_id where ro.code = 'manager'),
    exists (select 1 from role_permissions rp join roles ro on ro.id = rp.role_id join permissions p on p.id = rp.permission_id where ro.code = 'admin' and p.code = 'tenants.manage'),
    exists (select 1 from role_permissions rp join roles ro on ro.id = rp.role_id join permissions p on p.id = rp.permission_id where ro.code = 'admin' and p.code = 'trainers.self'),
    (select string_agg(code || ':' || level, ',' order by level desc) from roles))
  into r;
  raise exception 'ROL_ADMIN: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- 3. JERARQUÍA Y AISLAMIENTO CON UN ADMINISTRADOR DE MÍTICO
--    Se otorga `admin` a la cuenta de gerencia SOLO dentro de esta transacción.
--    Esperado:
--      admin ve socios de Mítico (>0) y 0 de Aurora; opera todos los módulos (lee pagos, clases, reportes)
--      otorga Gerencia a recepción: ok · la quita: ok
--      se quita su propio rol: cuenta_propia · se suspende: cuenta_propia
--      otorga a una cuenta de Aurora: cuenta_no_encontrada
--      escribe en una sede de Aurora: 0 filas · inserta un rol en una cuenta de Aurora: 42501
--      suspende a recepción: ok (y la reactiva)
-- -----------------------------------------------------------------------------
do $$
declare
  r text := '';
  n int;
  v_gerencia uuid;
  v_recepcion uuid;
  v_aurora_cuenta uuid;
  v_aurora_sede uuid := '4c402db1-67ee-48d0-ad14-4567c4c2ce52';
  v_rol_admin uuid;
  v_rol_manager uuid;
begin
  -- Ids resueltos ANTES de cambiar de rol (trampa 1 de §9.2).
  select id into v_gerencia from app_users where auth_user_id = '758b1b40-4e4a-4fee-9bbd-750d03b05f5a';
  select id into v_recepcion from app_users where auth_user_id = 'fcef6ed7-6aad-42a5-b543-969eb2acaf81';
  select u.id into v_aurora_cuenta from app_users u join tenants t on t.id = u.tenant_id where t.slug = 'aurora-fit' limit 1;
  select id into v_rol_admin from roles where code = 'admin' and tenant_id is null;
  select id into v_rol_manager from roles where code = 'manager' and tenant_id is null;
  insert into user_roles (app_user_id, role_id) values (v_gerencia, v_rol_admin);

  perform set_config('request.jwt.claims', json_build_object('sub', '758b1b40-4e4a-4fee-9bbd-750d03b05f5a', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from customers; r := r || format('socios_mitico=%s ', n);
  select count(*) into n from customers where tenant_id <> '4b79e41f-6d51-407a-a16f-bce8b000b50c'; r := r || format('socios_ajenos=%s ', n);
  select count(*) into n from payments; r := r || format('pagos=%s ', n);
  select count(*) into n from v_staff; r := r || format('v_staff=%s ', n);
  select count(*) into n from v_staff where tenant_id <> '4b79e41f-6d51-407a-a16f-bce8b000b50c'; r := r || format('staff_ajeno=%s ', n);

  begin perform otorgar_rol(v_recepcion, 'manager'); r := r || 'otorga_gerencia=ok ';
  exception when others then r := r || format('otorga_gerencia=%s ', sqlerrm); end;
  begin perform retirar_rol(v_recepcion, 'manager'); r := r || 'quita_gerencia=ok ';
  exception when others then r := r || format('quita_gerencia=%s ', sqlerrm); end;
  begin perform retirar_rol(v_gerencia, 'admin'); r := r || 'se_quita_admin=PERMITIDO ';
  exception when others then r := r || format('se_quita_admin=%s ', sqlerrm); end;
  begin perform cambiar_estado_de_cuenta(v_gerencia, false); r := r || 'se_suspende=PERMITIDO ';
  exception when others then r := r || format('se_suspende=%s ', sqlerrm); end;
  begin perform otorgar_rol(v_aurora_cuenta, 'receptionist'); r := r || 'otorga_en_aurora=PERMITIDO ';
  exception when others then r := r || format('otorga_en_aurora=%s ', sqlerrm); end;
  begin
    update branches set phone = '0' where id = v_aurora_sede; get diagnostics n = row_count;
    r := r || format('edita_sede_aurora=%s ', n);
  exception when others then r := r || format('edita_sede_aurora=%s ', sqlstate); end;
  begin
    insert into user_roles (app_user_id, role_id) values (v_aurora_cuenta, v_rol_manager);
    r := r || 'inserta_rol_aurora=PERMITIDO ';
  exception when others then r := r || format('inserta_rol_aurora=%s ', sqlstate); end;
  begin perform cambiar_estado_de_cuenta(v_recepcion, false); perform cambiar_estado_de_cuenta(v_recepcion, true); r := r || 'suspende_y_reactiva_recepcion=ok ';
  exception when others then r := r || format('suspende_recepcion=%s ', sqlerrm); end;

  raise exception 'ADMIN: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- 4. GERENCIA SIN ADMINISTRACIÓN NO ESCALA
--    Con un administrador (recepción, dentro de la transacción) por encima.
--    Esperado:
--      otorga Recepción a un socio con cuenta: ok (por debajo)
--      otorga Gerencia: sin_permiso · otorga Administración: sin_permiso
--      se inserta `admin` a sí mismo por INSERT directo: 42501
--      quita Administración a recepción: sin_permiso
--      suspende al administrador por RPC: sin_permiso · por UPDATE directo: 0 filas
-- -----------------------------------------------------------------------------
do $$
declare
  r text := '';
  n int;
  v_gerencia uuid;
  v_recepcion uuid;
  v_socio uuid;
  v_rol_admin uuid;
begin
  select id into v_gerencia from app_users where auth_user_id = '758b1b40-4e4a-4fee-9bbd-750d03b05f5a';
  select id into v_recepcion from app_users where auth_user_id = 'fcef6ed7-6aad-42a5-b543-969eb2acaf81';
  select id into v_socio from app_users where auth_user_id = 'a370ad78-0725-4fdc-a8d2-2b1e5b3625d1';
  select id into v_rol_admin from roles where code = 'admin' and tenant_id is null;
  insert into user_roles (app_user_id, role_id) values (v_recepcion, v_rol_admin);

  perform set_config('request.jwt.claims', json_build_object('sub', '758b1b40-4e4a-4fee-9bbd-750d03b05f5a', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin perform otorgar_rol(v_socio, 'receptionist'); r := r || 'otorga_recepcion=ok ';
  exception when others then r := r || format('otorga_recepcion=%s ', sqlerrm); end;
  begin perform otorgar_rol(v_socio, 'manager'); r := r || 'otorga_gerencia=PERMITIDO ';
  exception when others then r := r || format('otorga_gerencia=%s ', sqlerrm); end;
  begin perform otorgar_rol(v_socio, 'admin'); r := r || 'otorga_admin=PERMITIDO ';
  exception when others then r := r || format('otorga_admin=%s ', sqlerrm); end;
  begin
    insert into user_roles (app_user_id, role_id) values (v_gerencia, v_rol_admin);
    r := r || 'autoinserta_admin=PERMITIDO ';
  exception when others then r := r || format('autoinserta_admin=%s ', sqlstate); end;
  begin perform retirar_rol(v_recepcion, 'admin'); r := r || 'quita_admin=PERMITIDO ';
  exception when others then r := r || format('quita_admin=%s ', sqlerrm); end;
  begin perform cambiar_estado_de_cuenta(v_recepcion, false); r := r || 'suspende_admin=PERMITIDO ';
  exception when others then r := r || format('suspende_admin=%s ', sqlerrm); end;
  begin
    update app_users set status = 'suspended' where id = v_recepcion; get diagnostics n = row_count;
    r := r || format('update_directo_admin=%s ', n);
  exception when others then r := r || format('update_directo_admin=%s ', sqlstate); end;

  raise exception 'GERENCIA: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- 5. RECEPCIÓN, SOCIO, ENTRENADOR Y ANÓNIMO
--    Esperado: recepción otorga → sin_permiso; socio ve 1 fila de v_staff (la
--    suya) y otorga → sin_permiso; entrenador 1 fila; anónimo 42501 en v_staff,
--    v_customer_list, v_customer_counts, v_attendance_patterns y en las RPC.
-- -----------------------------------------------------------------------------
do $$
declare r text := ''; n int; v_socio uuid;
begin
  select id into v_socio from app_users where auth_user_id = 'a370ad78-0725-4fdc-a8d2-2b1e5b3625d1';

  perform set_config('request.jwt.claims', json_build_object('sub', 'fcef6ed7-6aad-42a5-b543-969eb2acaf81', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform otorgar_rol(v_socio, 'receptionist'); r := r || 'recepcion_otorga=PERMITIDO ';
  exception when others then r := r || format('recepcion_otorga=%s ', sqlerrm); end;
  select count(*) into n from v_customer_counts; r := r || format('recepcion_conteos=%s ', n);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', 'a370ad78-0725-4fdc-a8d2-2b1e5b3625d1', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from v_staff; r := r || format('socio_v_staff=%s ', n);
  select count(*) into n from v_customer_list; r := r || format('socio_lista=%s ', n);
  begin perform otorgar_rol(v_socio, 'admin'); r := r || 'socio_otorga=PERMITIDO ';
  exception when others then r := r || format('socio_otorga=%s ', sqlerrm); end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', '35b0cff9-48ee-44b8-8581-89cda456ca57', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from v_staff; r := r || format('entrenador_v_staff=%s ', n);
  select count(*) into n from v_attendance_patterns; r := r || format('entrenador_patrones=%s ', n);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin select count(*) into n from v_staff; r := r || format('anon_v_staff=%s ', n);
  exception when others then r := r || format('anon_v_staff=%s ', sqlstate); end;
  begin select count(*) into n from v_customer_list; r := r || format('anon_lista=%s ', n);
  exception when others then r := r || format('anon_lista=%s ', sqlstate); end;
  begin perform otorgar_rol(v_socio, 'admin'); r := r || 'anon_otorga=PERMITIDO ';
  exception when others then r := r || format('anon_otorga=%s ', sqlstate); end;

  raise exception 'OTROS_ROLES: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- 6. PLATAFORMA: designa al primer administrador y no lee datos del gimnasio
--    Esperado: designa a recepción de Mítico: ok · repetir: ya_tiene_el_rol ·
--    correo inexistente: cuenta_no_encontrada · socios 0 · v_customer_list 0.
-- -----------------------------------------------------------------------------
do $$
declare r text := ''; n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '4e5d445a-cf7e-4043-a7e4-78d130afd4af', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin perform designar_administrador_de_gimnasio('4b79e41f-6d51-407a-a16f-bce8b000b50c', 'recepcion@miticofitness.com'); r := r || 'designa=ok ';
  exception when others then r := r || format('designa=%s ', sqlerrm); end;
  begin perform designar_administrador_de_gimnasio('4b79e41f-6d51-407a-a16f-bce8b000b50c', 'recepcion@miticofitness.com'); r := r || 'repite=PERMITIDO ';
  exception when others then r := r || format('repite=%s ', sqlerrm); end;
  begin perform designar_administrador_de_gimnasio('4b79e41f-6d51-407a-a16f-bce8b000b50c', 'nadie@ejemplo.test'); r := r || 'inexistente=PERMITIDO ';
  exception when others then r := r || format('inexistente=%s ', sqlerrm); end;
  select count(*) into n from customers; r := r || format('socios=%s ', n);
  select count(*) into n from v_customer_list; r := r || format('lista=%s ', n);

  raise exception 'PLATAFORMA: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- 7. EL GIMNASIO NO SE QUEDA SIN SU ÚLTIMO ADMINISTRADOR
--    Un rol de prueba de nivel 40 con `users.manage` + `roles.manage` pero SIN
--    ser `admin` (solo dentro de la transacción) intenta quitarle el rol al único
--    administrador y suspenderlo. Esperado: ultimo_administrador en las dos.
-- -----------------------------------------------------------------------------
do $$
declare
  r text := '';
  v_gerencia uuid; v_recepcion uuid; v_rol_admin uuid; v_rol_prueba uuid;
begin
  select id into v_gerencia from app_users where auth_user_id = '758b1b40-4e4a-4fee-9bbd-750d03b05f5a';
  select id into v_recepcion from app_users where auth_user_id = 'fcef6ed7-6aad-42a5-b543-969eb2acaf81';
  select id into v_rol_admin from roles where code = 'admin' and tenant_id is null;
  insert into roles (code, name, scope, level) values ('prueba_nivel_40', 'Prueba', 'tenant', 40) returning id into v_rol_prueba;
  insert into role_permissions (role_id, permission_id) select v_rol_prueba, id from permissions where code in ('users.manage', 'users.read', 'roles.manage');
  insert into user_roles (app_user_id, role_id) values (v_recepcion, v_rol_admin), (v_gerencia, v_rol_prueba);

  perform set_config('request.jwt.claims', json_build_object('sub', '758b1b40-4e4a-4fee-9bbd-750d03b05f5a', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform retirar_rol(v_recepcion, 'admin'); r := r || 'quita_ultimo=PERMITIDO ';
  exception when others then r := r || format('quita_ultimo=%s ', sqlerrm); end;
  begin perform cambiar_estado_de_cuenta(v_recepcion, false); r := r || 'suspende_ultimo=PERMITIDO ';
  exception when others then r := r || format('suspende_ultimo=%s ', sqlerrm); end;

  raise exception 'ULTIMO_ADMIN: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- 8. RUTINAS SIN EL DÍA REPETIDO
--    Esperado: 0 plantillas y 0 rutinas asignadas cuyo nombre empiece por su
--    etiqueta; la función respeta «Día 10» y quita repeticiones dobles; guardar
--    «Día C · Tirón» con etiqueta «Día C» deja «Tirón».
-- -----------------------------------------------------------------------------
do $$
declare r text := ''; v_rutina uuid; v_nombre text;
begin
  r := r || format('plantillas_repetidas=%s asignadas_repetidas=%s ',
    (select count(*) from routines where day_label is not null and lower(name) like lower(day_label) || '%'),
    (select count(*) from customer_routines where day_label is not null and lower(name) like lower(day_label) || '%'));
  r := r || format('dia10=%s doble=%s igual=%s ',
    app.nombre_sin_etiqueta_del_dia('Día 10 · Brazos', 'Día 1'),
    app.nombre_sin_etiqueta_del_dia('Día 1 · Día 1 · Tirón', 'Día 1'),
    app.nombre_sin_etiqueta_del_dia('Día A', 'Día A'));
  select id into v_rutina from routines where day_label = 'Día C' limit 1;
  update routines set name = 'Día C · Tirón' where id = v_rutina returning name into v_nombre;
  r := r || format('al_guardar=%s', v_nombre);
  raise exception 'RUTINAS: %', r;
end $$;
