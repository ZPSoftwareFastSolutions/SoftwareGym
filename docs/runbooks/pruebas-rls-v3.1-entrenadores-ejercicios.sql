-- =============================================================================
-- Pruebas de RLS · V3.1 entrenadores + ejercicios (y corrección de roles)
--
-- Cómo se usa: pegar en el editor SQL de Supabase (o `execute_sql` por MCP) y
-- ejecutar. No deja rastro: todo ocurre en un bloque que termina con una
-- excepción, que revierte los cambios y devuelve el resultado en el mensaje.
--
-- Plantilla y trampas conocidas: CLAUDE.md §9.2. Los ids del ataque se
-- resuelven ANTES de cambiar de rol y se usan como literales.
--
-- Resultado esperado (2026-09-11) al final del archivo.
-- =============================================================================
do $$
declare
  r   text := '';
  n   int;
  v   text;
  b   boolean;

  -- Identidades (auth.users.id)
  s_gerencia   constant text := '758b1b40-4e4a-4fee-9bbd-750d03b05f5a';
  s_recepcion  constant text := 'fcef6ed7-6aad-42a5-b543-969eb2acaf81';
  s_socio      constant text := 'a370ad78-0725-4fdc-a8d2-2b1e5b3625d1';
  s_admin      constant text := '4e5d445a-cf7e-4043-a7e4-78d130afd4af';
  s_entrenador text;

  t_mitico uuid;
  t_aurora uuid;
  c_juan   constant uuid := 'bdd26a0b-058d-4b84-a488-0c8df66a7a86';
  plan_juan uuid;
  tr_demo  uuid;
  tr_nuevo uuid;
  tr_otro  uuid;
  tr_aurora uuid;
  b_prado  uuid;
  b_recoleta uuid;
  ej_mitico uuid;
  ej_aurora uuid;
  asig_sec uuid;
  cuota_original bigint;
  rol_super constant uuid := '4ff26d17-c719-4670-8f65-6bf3c4efac38';
  rol_recep constant uuid := '3b4d305a-ca69-4428-a837-a719d1f7dd05';
  u_gerencia uuid;
begin
  -- ------------------------------------------------------------ preparación (postgres)
  select id into t_mitico from public.tenants where slug = 'mitico';
  select id into t_aurora from public.tenants where slug = 'aurora-fit';
  select a.id::text into s_entrenador from auth.users a where a.email = 'entrenador@miticofitness.com';
  select id into tr_demo from public.trainers where email = 'entrenador@miticofitness.com';
  select id into b_prado from public.branches where tenant_id = t_mitico and is_primary;
  select id into b_recoleta from public.branches where tenant_id = t_aurora limit 1;
  select id into u_gerencia from public.app_users where auth_user_id = s_gerencia::uuid;
  select m.plan_id into plan_juan from public.memberships m
   where m.customer_id = c_juan and m.status = 'active'
     and m.start_date <= app.hoy_del_gimnasio(t_mitico) and m.end_date >= app.hoy_del_gimnasio(t_mitico)
   order by m.end_date desc limit 1;

  insert into public.trainers (tenant_id, first_name, last_name) values (t_mitico, 'Otro', 'Prueba') returning id into tr_otro;
  insert into public.trainers (tenant_id, first_name, last_name) values (t_aurora, 'Ajeno', 'Aurora') returning id into tr_aurora;
  insert into public.exercises (tenant_id, name, muscle_group) values (t_aurora, 'Ejercicio ajeno', 'core') returning id into ej_aurora;
  select id into ej_mitico from public.exercises where tenant_id = t_mitico order by name limit 1;

  -- Objetos de Storage simulados (solo metadatos) para probar tamaño, tipo y cuota.
  insert into storage.objects (bucket_id, name, metadata) values
    ('ejercicios', t_mitico || '/' || ej_mitico || '/ok.webp',    '{"size": 500,      "mimetype": "image/webp"}'),
    ('ejercicios', t_mitico || '/' || ej_mitico || '/dos.webp',   '{"size": 600,      "mimetype": "image/webp"}'),
    ('ejercicios', t_mitico || '/' || ej_mitico || '/grande.mp4', '{"size": 20000000, "mimetype": "video/mp4"}'),
    ('ejercicios', t_mitico || '/' || ej_mitico || '/falso.webp', '{"size": 500,      "mimetype": "text/html"}');
  select media_quota_bytes into cuota_original from public.tenants where id = t_mitico;
  update public.tenants set media_quota_bytes = 1000 where id = t_mitico;

  r := format('plan_juan=%s ', coalesce(plan_juan::text, 'NINGUNO'));

  -- ============================================================ A · GERENCIA
  perform set_config('request.jwt.claims', json_build_object('sub', s_gerencia, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.trainers (tenant_id, first_name, last_name, email, specialties)
    values (t_mitico, '  Ana ', 'López', 'ANA@Example.com', array['Fuerza', ' fuerza ', 'Fuerza', 'Baile'])
    returning id into tr_nuevo;
    select array_to_string(specialties, '|') || ' ' || email into v from public.trainers where id = tr_nuevo;
    r := r || format('A1 crea=ok(%s) ', v);
  exception when others then r := r || format('A1 crea=err(%s %s) ', sqlstate, sqlerrm); end;

  select count(*) into n from public.v_trainers; r := r || format('A2 ve=%s ', n);

  begin insert into public.trainer_branches (tenant_id, trainer_id, branch_id) values (t_mitico, tr_nuevo, b_prado); r := r || 'A3 sede=ok ';
  exception when others then r := r || format('A3 sede=err(%s) ', sqlstate); end;

  begin
    insert into public.trainer_unavailability (tenant_id, trainer_id, kind, start_date, end_date, start_time, end_time, reason)
    values (t_mitico, tr_nuevo, 'horas', current_date + 1, current_date + 1, '08:00', '10:00', 'Trámite');
    r := r || 'A4 ausencia=ok ';
  exception when others then r := r || format('A4 ausencia=err(%s %s) ', sqlstate, sqlerrm); end;

  begin
    insert into public.trainer_unavailability (tenant_id, trainer_id, kind, start_date, end_date)
    values (t_mitico, tr_nuevo, 'dia', current_date + 1, current_date + 1);
    r := r || 'A5 solape=ok! ';
  exception when others then r := r || format('A5 solape=err(%s) ', sqlstate); end;

  begin
    insert into public.trainer_unavailability (tenant_id, trainer_id, kind, start_date, end_date)
    values (t_mitico, tr_nuevo, 'horas', current_date + 3, current_date + 3);
    r := r || 'A6 forma=ok! ';
  exception when others then r := r || format('A6 forma=err(%s) ', sqlstate); end;

  begin
    insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind) values (t_mitico, c_juan, tr_demo, 'principal');
    r := r || 'A7 plan_sin=ok! ';
  exception when others then r := r || format('A7 plan_sin=err(%s) ', sqlerrm); end;

  begin
    update public.membership_plans set includes_trainer = true, max_secondary_trainers = 1 where id = plan_juan;
    get diagnostics n = row_count; r := r || format('A8 plan=%s ', n);
  exception when others then r := r || format('A8 plan=err(%s) ', sqlstate); end;

  begin
    insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind) values (t_mitico, c_juan, tr_demo, 'principal');
    r := r || 'A9 principal=ok ';
  exception when others then r := r || format('A9 principal=err(%s) ', sqlerrm); end;

  begin
    insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind) values (t_mitico, c_juan, tr_nuevo, 'principal');
    r := r || 'A10 dos_principales=ok! ';
  exception when others then r := r || format('A10 dos_principales=err(%s) ', sqlstate); end;

  begin
    insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind, focus)
    values (t_mitico, c_juan, tr_nuevo, 'secundario', 'Baile') returning id into asig_sec;
    r := r || 'A11 secundario=ok ';
  exception when others then r := r || format('A11 secundario=err(%s) ', sqlerrm); end;

  begin
    insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind) values (t_mitico, c_juan, tr_otro, 'secundario');
    r := r || 'A12 tope=ok! ';
  exception when others then r := r || format('A12 tope=err(%s) ', sqlerrm); end;

  begin
    insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind) values (t_mitico, c_juan, tr_demo, 'secundario');
    r := r || 'A13 repetido=ok! ';
  exception when others then r := r || format('A13 repetido=err(%s) ', sqlstate); end;

  begin
    update public.customer_trainers set ended_on = current_date where id = asig_sec;
    get diagnostics n = row_count; r := r || format('A14 finaliza=%s ', n);
  exception when others then r := r || format('A14 finaliza=err(%s) ', sqlerrm); end;

  begin
    update public.customer_trainers set ended_on = null where id = asig_sec;
    r := r || 'A15 reabre=ok! ';
  exception when others then r := r || format('A15 reabre=err(%s) ', sqlerrm); end;

  begin update public.trainers set tenant_id = t_aurora where id = tr_nuevo; r := r || 'A16 tenant=ok! ';
  exception when others then r := r || format('A16 tenant=err(%s) ', sqlstate); end;

  begin update public.trainers set app_user_id = u_gerencia where id = tr_nuevo; r := r || 'A17 cuenta_directa=ok! ';
  exception when others then r := r || format('A17 cuenta_directa=err(%s) ', sqlstate); end;

  begin perform public.vincular_cuenta_de_entrenador(tr_nuevo, 'admin@gymplatform.bo'); r := r || 'A18 cuenta_ajena=ok! ';
  exception when others then r := r || format('A18 cuenta_ajena=err(%s) ', sqlerrm); end;

  begin perform public.vincular_cuenta_de_entrenador(tr_nuevo, 'entrenador@miticofitness.com'); r := r || 'A19 ya_vinculada=ok! ';
  exception when others then r := r || format('A19 ya_vinculada=err(%s) ', sqlerrm); end;

  -- Vincula y deshace en el acto (P0002): el bloque D mide al socio SIN rol de entrenador.
  begin
    perform public.vincular_cuenta_de_entrenador(tr_nuevo, 'juan.perez@demo.miticofitness.com');
    select string_agg(ro.code, '+' order by ro.code) into v
    from public.v_users_roles vu, unnest(vu.roles) ro(code) where vu.email = 'juan.perez@demo.miticofitness.com';
    r := r || format('A20 vincula=ok(%s) ', v);
    raise exception 'deshacer' using errcode = 'P0002';
  exception
    when sqlstate 'P0002' then null;
    when others then r := r || format('A20 vincula=err(%s) ', sqlerrm);
  end;

  begin perform public.vincular_cuenta_de_entrenador(tr_nuevo, 'recepcion@miticofitness.com'); r := r || 'A20b personal=ok ';
    raise exception 'deshacer' using errcode = 'P0002';
  exception
    when sqlstate 'P0002' then null;
    when others then r := r || format('A20b personal=err(%s) ', sqlerrm);
  end;

  select count(*) into n from public.trainers where tenant_id = t_aurora; r := r || format('A21 ve_aurora=%s ', n);
  update public.trainers set bio = 'x' where id = tr_aurora; get diagnostics n = row_count; r := r || format('A22 edita_aurora=%s ', n);

  begin insert into public.trainers (tenant_id, first_name, last_name) values (t_aurora, 'X', 'Y'); r := r || 'A23 crea_aurora=ok! ';
  exception when others then r := r || format('A23 crea_aurora=err(%s) ', sqlstate); end;

  begin insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind) values (t_mitico, c_juan, tr_aurora, 'secundario'); r := r || 'A24 entrenador_ajeno=ok! ';
  exception when others then r := r || format('A24 entrenador_ajeno=err(%s) ', sqlstate); end;

  begin insert into public.trainer_branches (tenant_id, trainer_id, branch_id) values (t_mitico, tr_nuevo, b_recoleta); r := r || 'A25 sede_ajena=ok! ';
  exception when others then r := r || format('A25 sede_ajena=err(%s) ', sqlstate); end;

  begin insert into public.exercises (tenant_id, name, muscle_group) values (t_mitico, 'Prueba RLS', 'core'); r := r || 'A26 ejercicio=ok ';
  exception when others then r := r || format('A26 ejercicio=err(%s) ', sqlstate); end;

  begin insert into public.exercises (tenant_id, name, muscle_group) values (t_mitico, 'prueba   rls', 'core'); r := r || 'A27 duplicado=ok! ';
  exception when others then r := r || format('A27 duplicado=err(%s) ', sqlstate); end;

  begin insert into public.exercises (tenant_id, name, muscle_group) values (t_mitico, 'Grupo raro', 'alas'); r := r || 'A28 grupo=ok! ';
  exception when others then r := r || format('A28 grupo=err(%s) ', sqlstate); end;

  select count(*) into n from public.exercises where tenant_id = t_aurora; r := r || format('A29 ve_ej_aurora=%s ', n);
  update public.exercises set name = 'hack' where id = ej_aurora; get diagnostics n = row_count; r := r || format('A30 edita_ej_aurora=%s ', n);

  begin
    insert into public.exercise_media (tenant_id, exercise_id, kind, external_provider, external_id)
    values (t_mitico, ej_mitico, 'enlace', 'youtube', 'dQw4w9WgXcQ');
    r := r || 'A31 enlace=ok ';
  exception when others then r := r || format('A31 enlace=err(%s) ', sqlerrm); end;

  begin
    insert into public.exercise_media (tenant_id, exercise_id, kind, storage_path)
    values (t_mitico, ej_mitico, 'imagen', t_mitico || '/' || ej_mitico || '/no-existe.webp');
    r := r || 'A32 sin_archivo=ok! ';
  exception when others then r := r || format('A32 sin_archivo=err(%s) ', sqlerrm); end;

  begin
    insert into public.exercise_media (tenant_id, exercise_id, kind, storage_path)
    values (t_mitico, ej_mitico, 'imagen', t_aurora || '/' || ej_mitico || '/ok.webp');
    r := r || 'A33 ruta_ajena=ok! ';
  exception when others then r := r || format('A33 ruta_ajena=err(%s) ', sqlerrm); end;

  begin
    insert into public.exercise_media (tenant_id, exercise_id, kind, storage_path)
    values (t_mitico, ej_mitico, 'video', t_mitico || '/' || ej_mitico || '/grande.mp4');
    r := r || 'A34 video_grande=ok! ';
  exception when others then r := r || format('A34 video_grande=err(%s) ', sqlerrm); end;

  begin
    insert into public.exercise_media (tenant_id, exercise_id, kind, storage_path)
    values (t_mitico, ej_mitico, 'imagen', t_mitico || '/' || ej_mitico || '/falso.webp');
    r := r || 'A35 tipo_falso=ok! ';
  exception when others then r := r || format('A35 tipo_falso=err(%s) ', sqlerrm); end;

  begin
    insert into public.exercise_media (tenant_id, exercise_id, kind, storage_path)
    values (t_mitico, ej_mitico, 'imagen', t_mitico || '/' || ej_mitico || '/ok.webp');
    select size_bytes::text || ':' || mime_type into v from public.exercise_media where storage_path like '%/ok.webp';
    r := r || format('A36 imagen=ok(%s) ', v);
  exception when others then r := r || format('A36 imagen=err(%s) ', sqlerrm); end;

  begin
    insert into public.exercise_media (tenant_id, exercise_id, kind, storage_path)
    values (t_mitico, ej_mitico, 'imagen', t_mitico || '/' || ej_mitico || '/dos.webp');
    r := r || 'A37 cuota=ok! ';
  exception when others then r := r || format('A37 cuota=err(%s) ', sqlerrm); end;

  select usado_bytes::text || '/' || cuota_bytes::text into v from public.v_uso_de_medios; r := r || format('A38 uso=%s ', v);

  begin
    for i in 1..5 loop
      insert into public.exercise_media (tenant_id, exercise_id, kind, external_provider, external_id)
      values (t_mitico, ej_mitico, 'enlace', 'vimeo', '12345678' || i);
    end loop;
    r := r || 'A39 septimo=ok! ';
  exception when others then r := r || format('A39 septimo=err(%s) ', sqlerrm); end;

  begin insert into storage.objects (bucket_id, name, metadata) values ('ejercicios', t_aurora || '/x/y.webp', '{}'); r := r || 'A40 storage_ajeno=ok! ';
  exception when others then r := r || format('A40 storage_ajeno=err(%s) ', sqlstate); end;

  -- ============================================================ B · RECEPCIÓN
  perform set_config('request.jwt.claims', json_build_object('sub', s_recepcion, 'role', 'authenticated')::text, true);
  select count(*) into n from public.trainers; r := r || format('B1 entrenadores=%s ', n);
  select count(*) into n from public.exercises; r := r || format('B2 ejercicios=%s ', n);
  begin insert into public.trainers (tenant_id, first_name, last_name) values (t_mitico, 'R', 'X'); r := r || 'B3 crea=ok! ';
  exception when others then r := r || format('B3 crea=err(%s) ', sqlstate); end;
  select count(*) into n from public.mis_socios_asignados(); r := r || format('B4 mis_socios=%s ', n);
  select count(*) into n from public.v_uso_de_medios; r := r || format('B5 uso=%s ', n);
  begin insert into storage.objects (bucket_id, name, metadata) values ('ejercicios', t_mitico || '/x/y.webp', '{}'); r := r || 'B6 storage=ok! ';
  exception when others then r := r || format('B6 storage=err(%s) ', sqlstate); end;

  -- ============================================================ C · ENTRENADOR (cuenta demo)
  perform set_config('request.jwt.claims', json_build_object('sub', s_entrenador, 'role', 'authenticated')::text, true);
  select (app.current_trainer_id() = tr_demo) into b; r := r || format('C1 soy=%s ', b);
  select count(*) into n from public.trainers; r := r || format('C2 perfiles=%s ', n);
  select count(*) into n from public.trainer_branches; r := r || format('C3 sedes=%s ', n);
  select string_agg(customer_code || ':' || kind || ':' || membership_status, ',') into v from public.mis_socios_asignados(); r := r || format('C4 mis_socios=%s ', coalesce(v, '-'));
  select count(*) into n from public.customers; r := r || format('C5 customers=%s ', n);
  select count(*) into n from public.memberships; r := r || format('C6 membresias=%s ', n);
  select count(*) into n from public.payments; r := r || format('C7 pagos=%s ', n);
  select count(*) into n from public.exercises; r := r || format('C8 ejercicios=%s ', n);
  update public.trainers set bio = 'yo' where id = tr_demo; get diagnostics n = row_count; r := r || format('C9 edita_perfil=%s ', n);
  begin insert into public.trainer_unavailability (tenant_id, trainer_id, kind, start_date, end_date) values (t_mitico, tr_demo, 'dia', current_date + 9, current_date + 9); r := r || 'C10 ausencia=ok! ';
  exception when others then r := r || format('C10 ausencia=err(%s) ', sqlstate); end;
  begin insert into public.customer_trainers (tenant_id, customer_id, trainer_id, kind) values (t_mitico, c_juan, tr_otro, 'secundario'); r := r || 'C11 asigna=ok! ';
  exception when others then r := r || format('C11 asigna=err(%s) ', sqlstate); end;
  begin perform public.vincular_cuenta_de_entrenador(tr_otro, 'recepcion@miticofitness.com'); r := r || 'C12 vincula=ok! ';
  exception when others then r := r || format('C12 vincula=err(%s) ', sqlerrm); end;
  select count(*) into n from public.customer_trainers; r := r || format('C13 sus_asignaciones=%s ', n);

  -- ============================================================ D · SOCIO
  perform set_config('request.jwt.claims', json_build_object('sub', s_socio, 'role', 'authenticated')::text, true);
  select count(*) into n from public.trainers; r := r || format('D1 entrenadores=%s ', n);
  select count(*) into n from public.exercises; r := r || format('D2 ejercicios=%s ', n);
  select count(*) into n from public.customer_trainers where customer_id = c_juan; r := r || format('D3 asignaciones_propias=%s ', n);

  -- ============================================================ E · SUPER ADMIN
  perform set_config('request.jwt.claims', json_build_object('sub', s_admin, 'role', 'authenticated')::text, true);
  select count(*) into n from public.trainers; r := r || format('E1 entrenadores=%s ', n);
  select count(*) into n from public.exercises; r := r || format('E2 ejercicios=%s ', n);

  -- ============================================================ F · ANÓNIMO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin select count(*) into n from public.trainers; r := r || format('F1 entrenadores=%s! ', n);
  exception when others then r := r || format('F1 entrenadores=err(%s) ', sqlstate); end;
  begin select count(*) into n from public.mis_socios_asignados(); r := r || format('F2 rpc=%s! ', n);
  exception when others then r := r || format('F2 rpc=err(%s) ', sqlstate); end;

  -- ============================================================ G · ENTRENADOR DESACTIVADO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', s_gerencia, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.trainers set is_active = false where id = tr_demo;
  perform set_config('request.jwt.claims', json_build_object('sub', s_entrenador, 'role', 'authenticated')::text, true);
  select count(*) into n from public.mis_socios_asignados(); r := r || format('G1 inactivo_mis_socios=%s ', n);

  -- ============================================================ H · ESCALADA DE ROLES (corrección V3.1)
  perform set_config('request.jwt.claims', json_build_object('sub', s_gerencia, 'role', 'authenticated')::text, true);
  begin insert into public.user_roles (app_user_id, role_id) values (u_gerencia, rol_super); r := r || 'H1 se_da_super=ok! ';
  exception when others then r := r || format('H1 se_da_super=err(%s) ', sqlstate); end;
  begin update public.user_roles set role_id = rol_super where app_user_id = u_gerencia; r := r || 'H2 cambia_rol=ok! ';
  exception when others then r := r || format('H2 cambia_rol=err(%s) ', sqlstate); end;
  begin update public.app_users set auth_user_id = s_admin::uuid where id = u_gerencia; r := r || 'H3 auth_uid=ok! ';
  exception when others then r := r || format('H3 auth_uid=err(%s) ', sqlstate); end;

  execute 'reset role';
  update public.tenants set media_quota_bytes = cuota_original where id = t_mitico;
  raise exception 'RESULTADO: %', r;
end $$;

-- -----------------------------------------------------------------------------
-- Resultado esperado (ejecutado el 2026-09-11, con la migración de mensajes):
--
-- A · gerencia: A1 crea=ok(Fuerza|Baile ana@example.com) · A2 ve=3 · A3 sede=ok
--   A4 ausencia=ok · A5 solape=err(23P01) · A6 forma=err(23514)
--   A7 plan_sin=err(plan_sin_entrenador) · A8 plan=1 · A9 principal=ok
--   A10 dos_principales=err(ya_tiene_principal) · A11 secundario=ok
--   A12 tope=err(plan_sin_mas_secundarios) · A13 repetido=err(entrenador_ya_asignado)
--   A14 finaliza=1 · A15 reabre=err(asignacion_finalizada) · A16 tenant=err(42501)
--   A17 cuenta_directa=err(42501) · A18 cuenta_ajena=err(cuenta_no_encontrada)
--   A19 ya_vinculada=err(cuenta_ya_vinculada) · A20 vincula=ok(customer+trainer)
--   A20b personal=ok · A21 ve_aurora=0 · A22 edita_aurora=0 · A23 crea_aurora=err(42501)
--   A24 entrenador_ajeno=err(entrenador_no_disponible) · A25 sede_ajena=err(sucursal_no_disponible)
--   A26 ejercicio=ok · A27 duplicado=err(23505) · A28 grupo=err(23514)
--   A29 ve_ej_aurora=0 · A30 edita_ej_aurora=0 · A31 enlace=ok
--   A32 sin_archivo=err(archivo_no_subido) · A33 ruta_ajena=err(ruta_invalida)
--   A34 video_grande=err(archivo_no_permitido) · A35 tipo_falso=err(archivo_no_permitido)
--   A36 imagen=ok(500:image/webp) · A37 cuota=err(cuota_de_medios_excedida)
--   A38 uso=500/1000 · A39 septimo=err(demasiados_medios) · A40 storage_ajeno=err(42501)
-- B · recepción: B1=0 · B2=0 · B3 err(42501) · B4=0 · B5=0 · B6 err(42501)
-- C · entrenador: C1 soy=t · C2 perfiles=1 · C3 sedes=2 · C4 mis_socios=MF-008:principal:vigente
--   C5 customers=0 · C6 membresias=0 · C7 pagos=0 · C8 ejercicios=0 · C9 edita_perfil=0
--   C10 err(42501) · C11 err(42501) · C12 err(sin_permiso) · C13 sus_asignaciones=1
-- D · socio: D1=0 · D2=0 · D3=0 · D4=0
-- E · super admin: E1=0 · E2=0 (no ve personal ni catálogo de los gimnasios)
-- F · anónimo: F1 err(42501) · F2 err(42501)
-- G · entrenador desactivado: G1 inactivo_mis_socios=0
-- H · escalada de roles: H1 err(42501) · H2 err(42501) · H3 err(42501)
-- -----------------------------------------------------------------------------
