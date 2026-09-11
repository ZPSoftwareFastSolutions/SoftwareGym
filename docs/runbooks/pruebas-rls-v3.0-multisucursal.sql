-- =====================================================================
-- Pruebas de RLS de V3.0 · Multisucursal
--
-- Se ejecuta completo (SQL Editor de Supabase o MCP `execute_sql`). NO deja
-- rastro: la excepción final revierte todo y devuelve el resultado en el
-- mensaje de error. Resultado esperado del 2026-09-11 al final del archivo.
--
-- Ids de los datos de demostración de Mítico y Aurora (CLAUDE.md §8). Los
-- ataques usan ids literales resueltos ANTES de cambiar de rol (§9.2).
-- =====================================================================
do $$
declare
  r text := ''; n int; v text; a0 bigint;
  t_mit uuid := '4b79e41f-6d51-407a-a16f-bce8b000b50c';
  t_aur uuid := 'c2f30bc2-b509-4f96-bc8e-b6fcaaab3488';
  b_pra uuid := '26ee6a4c-33bf-4bd3-acfa-3f356e759e4c';
  b_mir uuid := 'ee9dd276-fee1-40b8-8c61-c3b4023d7b33';
  b_rec uuid := '4c402db1-67ee-48d0-ad14-4567c4c2ce52';
  s_ger text := '758b1b40-4e4a-4fee-9bbd-750d03b05f5a';
  s_rec text := 'fcef6ed7-6aad-42a5-b543-969eb2acaf81';
  s_juan text := 'a370ad78-0725-4fdc-a8d2-2b1e5b3625d1';
  s_adm text := '4e5d445a-cf7e-4043-a7e4-78d130afd4af';
  u_rec uuid := '5d29d769-b247-41c4-97fa-4f897fc9d9a5';
  c_juan uuid := 'bdd26a0b-058d-4b84-a488-0c8df66a7a86';
  c_diego uuid := '18d4b8f7-8d00-4209-bd1b-132fe0880718';
  c_vale uuid := '9dcbda37-666c-452a-a934-4622b0c07faa';
  c_carlos uuid := 'e33e9e26-d2c8-4ad0-822c-aa0aa6e3983f';
  c_camila uuid := 'e7ed0611-e375-448c-9088-2cb85c23a93e';
begin
  select coalesce(max(id), 0) into a0 from audit_log;

  -- ===== Recepción (asignada a Prado y Miraflores) =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_rec, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_juan, b_mir, 'qr');
    r := r || '1.rec_juan_miraflores=ok | ';
  exception when others then r := r || format('1.rec_juan_miraflores=err(%s %s) | ', sqlstate, sqlerrm); end;

  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_juan, b_pra, 'qr');
    r := r || '2.mismo_dia_otra_sede=ok(MAL) | ';
  exception when others then r := r || format('2.mismo_dia_otra_sede=err(%s) | ', sqlstate); end;

  begin insert into attendance_records (tenant_id, customer_id, branch_id, method, checked_in_at) values (t_mit, c_diego, b_pra, 'qr', now() - interval '3 days');
    r := r || '3.fija_hora=ok(MAL) | ';
  exception when others then r := r || format('3.fija_hora=err(%s) | ', sqlstate); end;

  select count(*) into n from branches; r := r || format('4.rec_ve_sedes=%s | ', n);
  select count(*) into n from branches where id = b_rec; r := r || format('4b.rec_ve_sede_aurora=%s | ', n);

  begin insert into branches (tenant_id, code, name) values (t_mit, 'NUEVA', 'Nueva');
    r := r || '5.rec_crea_sede=ok(MAL) | ';
  exception when others then r := r || format('5.rec_crea_sede=err(%s) | ', sqlstate); end;
  update branches set name = 'X' where id = b_pra; get diagnostics n = row_count; r := r || format('5b.rec_edita_sede=%s | ', n);
  begin perform establecer_sucursal_primaria(b_mir); r := r || '5c.rec_primaria=ok(MAL) | ';
  exception when others then r := r || format('5c.rec_primaria=err(%s) | ', sqlstate); end;
  begin insert into user_branches (tenant_id, app_user_id, branch_id) values (t_mit, u_rec, b_pra); r := r || '5d.rec_asigna=ok(MAL) | ';
  exception when others then r := r || format('5d.rec_asigna=err(%s) | ', sqlstate); end;
  select count(*) into n from user_branches; r := r || format('5e.rec_ve_asignaciones=%s | ', n);
  select string_agg(code || ':' || puede_operar, ',' order by code) into v from v_mis_sucursales; r := r || '6.rec_mis_sucursales=' || v || ' | ';

  -- Días siguientes (como propietario): Miraflores → Prado → Miraflores
  execute 'reset role';
  insert into attendance_records (tenant_id, customer_id, branch_id, method, checked_in_at) values
    (t_mit, c_juan, b_pra, 'qr', now() + interval '1 day'),
    (t_mit, c_juan, b_mir, 'qr', now() + interval '2 days');
  update user_branches set is_active = false where app_user_id = u_rec and branch_id = b_mir;

  perform set_config('request.jwt.claims', json_build_object('sub', s_rec, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select string_agg(coalesce(branch_code, 'SIN') || '/m=' || coalesce(left(membership_id::text, 8), 'null'), ', ' order by attendance_date)
    into v from v_attendance_log where customer_id = c_juan and attendance_date >= current_date - 1;
  r := r || '7.juan_log=' || coalesce(v, '∅') || ' | ';

  select string_agg(code || ':' || puede_operar, ',' order by code) into v from v_mis_sucursales; r := r || '8.rec_solo_prado=' || v || ' | ';
  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_diego, b_mir, 'qr');
    r := r || '8b.rec_opera_miraflores=ok(MAL) | ';
  exception when others then r := r || format('8b.rec_opera_miraflores=err(%s) | ', sqlstate); end;
  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_diego, b_pra, 'qr');
    r := r || '8c.rec_opera_prado=ok | ';
  exception when others then r := r || format('8c.rec_opera_prado=err(%s) | ', sqlstate); end;

  -- ===== Gerencia (branches.all + branches.manage) =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_ger, 'role', 'authenticated')::text, true);
  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_vale, b_mir, 'manual');
    r := r || '9.ger_miraflores_sin_asignacion=ok | ';
  exception when others then r := r || format('9.ger_miraflores_sin_asignacion=err(%s) | ', sqlstate); end;

  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_carlos, b_rec, 'qr');
    r := r || '10.fila_mitico_sede_aurora=ok(MAL) | ';
  exception when others then r := r || format('10.fila_mitico_sede_aurora=err(%s) | ', sqlstate); end;
  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_aur, c_carlos, b_rec, 'qr');
    r := r || '10b.fila_aurora=ok(MAL) | ';
  exception when others then r := r || format('10b.fila_aurora=err(%s) | ', sqlstate); end;

  select count(*) into n from branches where tenant_id = t_aur; r := r || format('11.ger_ve_aurora=%s | ', n);
  update branches set name = 'Hack' where id = b_rec; get diagnostics n = row_count; r := r || format('11b.ger_edita_aurora=%s | ', n);
  begin insert into branches (tenant_id, code, name) values (t_aur, 'HACK', 'Hack'); r := r || '11c.ger_crea_en_aurora=ok(MAL) | ';
  exception when others then r := r || format('11c.ger_crea_en_aurora=err(%s) | ', sqlstate); end;
  begin insert into user_branches (tenant_id, app_user_id, branch_id) values (t_aur, u_rec, b_rec); r := r || '11d.asigna_en_aurora=ok(MAL) | ';
  exception when others then r := r || format('11d.asigna_en_aurora=err(%s) | ', sqlstate); end;
  begin insert into user_branches (tenant_id, app_user_id, branch_id) values (t_mit, u_rec, b_rec); r := r || '11e.asigna_sede_ajena=ok(MAL) | ';
  exception when others then r := r || format('11e.asigna_sede_ajena=err(%s) | ', sqlstate); end;
  begin perform establecer_sucursal_primaria(b_rec); r := r || '11f.primaria_ajena=ok(MAL) | ';
  exception when others then r := r || format('11f.primaria_ajena=err(%s) | ', sqlstate); end;

  begin update branches set is_active = false where id = b_pra; r := r || '12.desactiva_primaria=ok(MAL) | ';
  exception when others then r := r || format('12.desactiva_primaria=err(%s) | ', sqlstate); end;
  begin update branches set is_primary = false where id = b_pra; r := r || '12b.quita_primaria_directo=ok(MAL) | ';
  exception when others then r := r || format('12b.quita_primaria_directo=err(%s) | ', sqlstate); end;

  update branches set is_active = false where id = b_mir; get diagnostics n = row_count; r := r || format('13.desactiva_miraflores=%s | ', n);
  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_camila, b_mir, 'qr');
    r := r || '13b.entrada_en_inactiva=ok(MAL) | ';
  exception when others then r := r || format('13b.entrada_en_inactiva=err(%s %s) | ', sqlstate, sqlerrm); end;
  select count(*) into n from v_attendance_log where branch_id is null; r := r || format('13c.historico_sin_sucursal=%s | ', n);

  -- Sede única activa: recepción sin asignaciones opera en Prado
  execute 'reset role';
  update user_branches set is_active = false where app_user_id = u_rec;
  perform set_config('request.jwt.claims', json_build_object('sub', s_rec, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_camila, b_pra, 'qr');
    r := r || '14.sede_unica=ok | ';
  exception when others then r := r || format('14.sede_unica=err(%s) | ', sqlstate); end;

  -- ===== Socio =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_juan, 'role', 'authenticated')::text, true);
  select count(*) into n from branches; r := r || format('15.juan_ve_sedes=%s | ', n);
  begin insert into attendance_records (tenant_id, customer_id, branch_id, method) values (t_mit, c_juan, b_pra, 'qr');
    r := r || '15b.juan_registra=ok(MAL) | ';
  exception when others then r := r || format('15b.juan_registra=err(%s) | ', sqlstate); end;
  select count(*) into n from user_branches; r := r || format('15c.juan_asignaciones=%s | ', n);

  -- ===== Super admin =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_adm, 'role', 'authenticated')::text, true);
  select count(*) into n from branches; r := r || format('16.admin_ve_sedes=%s | ', n);
  select count(*) into n from attendance_records; r := r || format('16b.admin_ve_asistencia=%s | ', n);

  -- ===== Anónimo =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  select count(*) into n from branches; r := r || format('17.anon_sedes_activas=%s | ', n);
  begin select count(created_by) into n from branches; r := r || '17b.anon_created_by=ok(MAL) | ';
  exception when others then r := r || format('17b.anon_created_by=err(%s) | ', sqlstate); end;
  begin select count(*) into n from user_branches; r := r || format('17c.anon_asignaciones=%s(MAL) | ', n);
  exception when others then r := r || format('17c.anon_asignaciones=err(%s) | ', sqlstate); end;

  execute 'reset role';
  select string_agg(action, ',' order by id) into v from audit_log where id > a0;
  r := r || '18.auditoria=' || coalesce(v, '∅');

  raise exception 'RESULTADO: %', r;
end $$;

-- Esperado (2026-09-11): 1=ok · 2=err(23505) · 3=err(42501) · 4=2 · 4b=0 ·
-- 5=err(42501) · 5b=0 · 5c=err(42501) · 5d=err(42501) · 5e=2 ·
-- 6=MIRAFLORES:true,PRADO:true · 7=MIRAFLORES → PRADO → MIRAFLORES con la
-- MISMA membership_id · 8=MIRAFLORES:false,PRADO:true · 8b=err(42501) ·
-- 8c=ok · 9=ok · 10=err(22023) · 10b=err(42501) · 11=0 · 11b=0 ·
-- 11c..11f=err(42501|23503|42501|42501) · 12=err(23514) · 12b=err(42501) ·
-- 13=1 · 13b=err(22023 sucursal_no_disponible) · 13c=154 · 14=ok · 15=2 ·
-- 15b=err(42501) · 15c=0 · 16=3 · 16b=0 · 17=2 · 17b=err(42501) ·
-- 17c=err(42501) · 18=eventos de asignación y de sede.
