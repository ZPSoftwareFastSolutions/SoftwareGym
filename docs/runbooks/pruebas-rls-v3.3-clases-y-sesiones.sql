-- =============================================================================
-- Pruebas de RLS · V3.3 clases grupales, horarios, sesiones y asistencia
--
-- Cómo se usa: pegar CADA bloque por separado en el editor SQL de Supabase (o
-- `execute_sql` por MCP). No dejan rastro: cada bloque termina con una
-- excepción que revierte todo (también los ajustes previos que hace como
-- postgres) y devuelve el resultado en el mensaje. Plantilla y trampas: CLAUDE.md §9.2.
--
-- Los ids son los de Mítico en la semilla del 2026-09-12 (hoy = sábado 12/09).
-- Con otra fecha, cambiar las sesiones por unas equivalentes:
--   box11  Box, viernes pasado 18:00, Prado, instructor = Entrenador Demo
--   box14  Box, lunes próximo 18:00, Prado
--   kar10  Karate, jueves pasado 18:00, Prado, sin instructor
--   kar12  Karate, hoy 10:00, Miraflores, sin instructor
-- Socios: MF-007 plan «fit» (incluye Box, no Karate) · MF-009 «trimestral» y
-- MF-005 «anual» (Box y Karate) · MF-008 Juan Pérez: HOY tiene «Básico» (su
-- «Mítico» empieza el 07/10) · MF-001 sin membresía.
--
-- Resultado del 2026-09-12 (todo como se esperaba):
--   A · GERENCIA   fit_box=1 · duplicado=ya_registrado/23505 · basico_box=plan_no_incluye_clase ·
--                  sin_membresia=sin_membresia_vigente · futura=sesion_futura · karate_cupo1=ok ·
--                  llena=clase_llena · edita_pasada=sesion_pasada · cancela_sin_motivo=motivo_requerido ·
--                  cancela=1 · edita_cancelada=sesion_cancelada · cruce=entrenador_ocupado ·
--                  pasado=sesion_pasada · rango=rango_invalido · clase_aurora=42501 ·
--                  genera={creadas:19, existentes:30, conflictos:[]} · regenera={creadas:0, existentes:49}
--   B · RECEPCIÓN  crea_clase=42501 · edita_sesion=0 · genera=sin_permiso · planes=sin_permiso ·
--                  registra_prado=1 · registra_miraflores_sin_asignar=sin_permiso · candidatos_miraflores=0 ·
--                  lista_prado=1 · stats=0 · quita=1
--   C · ENTRENADOR crea_clase=42501 · su_clase=3 · clase_ajena=sin_permiso · candidatos_suya=6 ·
--                  candidatos_ajena=0 · lista_suya=3 · lista_ajena=0 · ajenas_visibles=0 · customers=0 · stats=0
--   D · SOCIO      clases=7 · con_planes=5 · ocupacion_y_nombre=30 · ajenas=0 · mis_clases=20 ·
--                  se_registra=sin_permiso · insert_directo=42501 · borra_ajena=0 · lista=0 · candidatos=0 ·
--                  stats=0 · overview=0 · edita_clase=0
--   E · SUPER ADMIN clases=0 · asistencias=0 · genera=sin_permiso
--   F · ANÓNIMO    clases=3 (solo públicas) · horarios=4 · planes=8 · sesiones=42501 · asistencias=42501 ·
--                  columna trainer_id=42501 · vistas=42501 · RPC=42501
--
-- Dos defectos que encontró esta batería (corregidos en migraciones aparte):
--   1. Volver a generar sesiones informaba «instructor ocupado» en cada fecha que
--      YA tenía su sesión: el disparador BEFORE veía la propia sesión del horario
--      antes de que ON CONFLICT la descartara.
--   2. El entrenador veía la asistencia de TODAS las clases (32 filas ajenas): la
--      política aceptaba `classes.attend`, permiso que también tiene recepción.
--      Misma lección que V3.2: cada política nombra su condición.
-- =============================================================================

-- ------------------------------------------------------------- A · GERENCIA
do $$
declare r text := ''; n int; j jsonb;
  box11 uuid := 'bca82228-411d-4bea-a9da-1764ca649ef2';
  box14 uuid := '68759bfe-3377-4d20-bb68-73da2c2141e4';
  kar12 uuid := '9403a08c-030d-4694-8ba6-8802ad4f8b56';
  juan  uuid := 'bdd26a0b-058d-4b84-a488-0c8df66a7a86';
  mf001 uuid := '1144973e-2417-4f3d-9765-aa58868af3de';
  mf005 uuid := '9dcbda37-666c-452a-a934-4622b0c07faa';
  mf007 uuid := 'bc199357-fe9c-422c-9708-c126b3d7f4a9';
  mf009 uuid := 'e33e9e26-d2c8-4ad0-822c-aa0aa6e3983f';
  prado uuid := '26ee6a4c-33bf-4bd3-acfa-3f356e759e4c';
  entr  uuid := '36448c43-23af-46bc-a38e-b73cdf7b2e11';
  c_box uuid; aurora uuid;
begin
  -- Trampa 1 de §9.2: los ids se resuelven ANTES de cambiar de rol.
  select id into aurora from tenants where slug = 'aurora-fit';
  select id into c_box from classes where name = 'Box';
  delete from class_attendances where session_id in (box11, kar12);
  update class_sessions set capacity = 1 where id = kar12;

  perform set_config('request.jwt.claims', json_build_object('sub','758b1b40-4e4a-4fee-9bbd-750d03b05f5a','role','authenticated')::text, true);
  execute 'set local role authenticated';

  begin insert into classes (tenant_id,name,category,capacity) values (aurora,'Ajena','fit',10); r := r || 'clase_aurora=PASO '; exception when others then r := r || format('clase_aurora=%s ', sqlstate); end;
  begin j := registrar_asistencia_a_clase(box11, mf007); r := r || format('fit_box=%s ', j->>'asistentes'); exception when others then r := r || format('fit_box=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(box11, mf007); r := r || 'duplicado=PASO '; exception when others then r := r || format('duplicado=%s/%s ', sqlerrm, sqlstate); end;
  begin j := registrar_asistencia_a_clase(box11, juan); r := r || 'basico_box=PASO '; exception when others then r := r || format('basico_box=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(box11, mf001); r := r || 'sin_membresia=PASO '; exception when others then r := r || format('sin_membresia=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(box14, mf007); r := r || 'futura=PASO '; exception when others then r := r || format('futura=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(kar12, mf009); r := r || 'karate_cupo1=ok '; exception when others then r := r || format('karate_cupo1=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(kar12, mf005); r := r || 'llena=PASO '; exception when others then r := r || format('llena=%s ', sqlerrm); end;
  begin update class_sessions set capacity = 20 where id = box11; r := r || 'edita_pasada=PASO '; exception when others then r := r || format('edita_pasada=%s ', sqlerrm); end;
  begin update class_sessions set status = 'cancelada' where id = box14; r := r || 'cancela_sin_motivo=PASO '; exception when others then r := r || format('cancela_sin_motivo=%s ', sqlerrm); end;
  begin update class_sessions set status = 'cancelada', cancel_reason = 'Feriado' where id = box14; get diagnostics n = row_count; r := r || format('cancela=%s ', n); exception when others then r := r || format('cancela=%s ', sqlerrm); end;
  begin update class_sessions set capacity = 5 where id = box14; r := r || 'edita_cancelada=PASO '; exception when others then r := r || format('edita_cancelada=%s ', sqlerrm); end;
  begin insert into class_sessions (tenant_id,class_id,branch_id,trainer_id,session_date,start_time) values ((select app.current_tenant_id()), c_box, prado, entr, '2026-09-14', '07:30'); r := r || 'cruce=PASO '; exception when others then r := r || format('cruce=%s ', sqlerrm); end;
  begin insert into class_sessions (tenant_id,class_id,branch_id,session_date,start_time) values ((select app.current_tenant_id()), c_box, prado, '2026-09-01', '09:00'); r := r || 'pasado=PASO '; exception when others then r := r || format('pasado=%s ', sqlerrm); end;
  begin j := generar_sesiones_de_clases('2026-09-12', '2026-12-31'); r := r || 'rango=PASO '; exception when others then r := r || format('rango=%s ', sqlerrm); end;
  begin j := generar_sesiones_de_clases('2026-09-12', '2026-10-05'); r := r || format('genera=%s ', j::text); exception when others then r := r || format('genera=%s ', sqlerrm); end;
  begin j := generar_sesiones_de_clases('2026-09-12', '2026-10-05'); r := r || format('regenera=%s ', j::text); exception when others then r := r || format('regenera=%s ', sqlerrm); end;
  raise exception 'RESULTADO: %', r;
end $$;

-- ------------------------------------------------------------- B · RECEPCIÓN (Prado y Miraflores; se le quita Miraflores durante la prueba)
do $$
declare r text := ''; n int; j jsonb; att uuid;
  box11 uuid := 'bca82228-411d-4bea-a9da-1764ca649ef2';
  box14 uuid := '68759bfe-3377-4d20-bb68-73da2c2141e4';
  kar12 uuid := '9403a08c-030d-4694-8ba6-8802ad4f8b56';
  mf007 uuid := 'bc199357-fe9c-422c-9708-c126b3d7f4a9';
  mf009 uuid := 'e33e9e26-d2c8-4ad0-822c-aa0aa6e3983f';
  c_box uuid;
begin
  select id into c_box from classes where name = 'Box';
  delete from class_attendances where session_id in (box11, kar12);
  update user_branches set is_active = false where app_user_id = '5d29d769-b247-41c4-97fa-4f897fc9d9a5' and branch_id = 'ee9dd276-fee1-40b8-8c61-c3b4023d7b33';

  perform set_config('request.jwt.claims', json_build_object('sub','fcef6ed7-6aad-42a5-b543-969eb2acaf81','role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into classes (tenant_id,name,category,capacity) values ((select app.current_tenant_id()),'Recepción crea','fit',10); r := r || 'crea_clase=PASO '; exception when others then r := r || format('crea_clase=%s ', sqlstate); end;
  begin update class_sessions set capacity = 3 where id = box14; get diagnostics n = row_count; r := r || format('edita_sesion=%s ', n); exception when others then r := r || format('edita_sesion=%s ', sqlstate); end;
  begin j := generar_sesiones_de_clases('2026-09-12', '2026-09-20'); r := r || 'genera=PASO '; exception when others then r := r || format('genera=%s ', sqlerrm); end;
  begin j := fijar_planes_de_clase(c_box, array[]::uuid[]); r := r || 'planes=PASO '; exception when others then r := r || format('planes=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(box11, mf007); r := r || format('registra_prado=%s ', j->>'asistentes'); exception when others then r := r || format('registra_prado=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(kar12, mf009); r := r || 'registra_miraflores_sin_asignar=PASO '; exception when others then r := r || format('registra_miraflores_sin_asignar=%s ', sqlerrm); end;
  select count(*) into n from candidatos_de_sesion(kar12, null); r := r || format('candidatos_miraflores=%s ', n);
  select count(*) into n from asistentes_de_sesion(box11); r := r || format('lista_prado=%s ', n);
  select count(*) into n from v_class_stats; r := r || format('stats=%s ', n);
  select id into att from class_attendances where session_id = box11 limit 1;
  begin delete from class_attendances where id = att; get diagnostics n = row_count; r := r || format('quita=%s ', n); exception when others then r := r || format('quita=%s ', sqlerrm); end;
  raise exception 'RESULTADO: %', r;
end $$;

-- ------------------------------------------------------------- C · ENTRENADOR (instructor de Box y Fit funcional)
do $$
declare r text := ''; n int; j jsonb;
  box11 uuid := 'bca82228-411d-4bea-a9da-1764ca649ef2';
  kar10 uuid := '75de1dcc-1442-4fc3-9a30-214e97856074';
  mf005 uuid := '9dcbda37-666c-452a-a934-4622b0c07faa';
  mf009 uuid := 'e33e9e26-d2c8-4ad0-822c-aa0aa6e3983f';
begin
  delete from class_attendances where session_id = box11 and customer_id = mf009;
  perform set_config('request.jwt.claims', json_build_object('sub','35b0cff9-48ee-44b8-8581-89cda456ca57','role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into classes (tenant_id,name,category,capacity) values ((select app.current_tenant_id()),'Entrenador crea','fit',10); r := r || 'crea_clase=PASO '; exception when others then r := r || format('crea_clase=%s ', sqlstate); end;
  begin j := registrar_asistencia_a_clase(box11, mf009); r := r || format('su_clase=%s ', j->>'asistentes'); exception when others then r := r || format('su_clase=%s ', sqlerrm); end;
  begin j := registrar_asistencia_a_clase(kar10, mf005); r := r || 'clase_ajena=PASO '; exception when others then r := r || format('clase_ajena=%s ', sqlerrm); end;
  select count(*) into n from candidatos_de_sesion(box11, null); r := r || format('candidatos_suya=%s ', n);
  select count(*) into n from candidatos_de_sesion(kar10, null); r := r || format('candidatos_ajena=%s ', n);
  select count(*) into n from asistentes_de_sesion(box11); r := r || format('lista_suya=%s ', n);
  select count(*) into n from asistentes_de_sesion(kar10); r := r || format('lista_ajena=%s ', n);
  select count(*) into n from class_attendances a join class_sessions s on s.id = a.session_id where s.trainer_id is distinct from '36448c43-23af-46bc-a38e-b73cdf7b2e11'; r := r || format('ajenas_visibles=%s ', n);
  select count(*) into n from customers; r := r || format('customers=%s ', n);
  select count(*) into n from v_class_stats; r := r || format('stats=%s ', n);
  raise exception 'RESULTADO: %', r;
end $$;

-- ------------------------------------------------------------- D · SOCIO (MF-007) · E · SUPER ADMIN · F · ANÓNIMO
do $$
declare r text := ''; n int; j jsonb; att_ajena uuid; c_box uuid;
  box11 uuid := 'bca82228-411d-4bea-a9da-1764ca649ef2';
  mf007 uuid := 'bc199357-fe9c-422c-9708-c126b3d7f4a9';
begin
  select id into c_box from classes where name = 'Box';
  select a.id into att_ajena from class_attendances a where a.customer_id <> mf007 limit 1;
  delete from class_attendances where session_id = box11 and customer_id = mf007;
  alter table class_attendances disable trigger class_attendances_validar;
  insert into class_attendances (tenant_id, session_id, customer_id) select tenant_id, id, mf007 from class_sessions where id = box11;
  alter table class_attendances enable trigger class_attendances_validar;

  perform set_config('request.jwt.claims', json_build_object('sub','c25555c2-5e84-42db-b7c5-ed4301007511','role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from classes; r := r || format('socio_clases=%s ', n);
  select count(*) into n from v_class_sessions where trainer_name is not null and asistentes > 0; r := r || format('ocupacion_y_nombre=%s ', n);
  select count(*) into n from class_attendances where customer_id <> mf007; r := r || format('ajenas=%s ', n);
  begin j := registrar_asistencia_a_clase(box11, mf007); r := r || 'se_registra=PASO '; exception when others then r := r || format('se_registra=%s ', sqlerrm); end;
  begin insert into class_attendances (tenant_id, session_id, customer_id) values ((select app.current_tenant_id()), box11, mf007); r := r || 'insert_directo=PASO '; exception when others then r := r || format('insert_directo=%s ', sqlstate); end;
  begin delete from class_attendances where id = att_ajena; get diagnostics n = row_count; r := r || format('borra_ajena=%s ', n); exception when others then r := r || format('borra_ajena=%s ', sqlstate); end;
  select count(*) into n from asistentes_de_sesion(box11); r := r || format('lista=%s ', n);
  select count(*) into n from v_class_overview; r := r || format('overview=%s ', n);
  begin update classes set name = 'Hackeo' where id = c_box; get diagnostics n = row_count; r := r || format('edita_clase=%s ', n); exception when others then r := r || format('edita_clase=%s ', sqlstate); end;

  perform set_config('request.jwt.claims', json_build_object('sub','4e5d445a-cf7e-4043-a7e4-78d130afd4af','role','authenticated')::text, true);
  select count(*) into n from classes; r := r || format('| superadmin_clases=%s ', n);
  begin j := generar_sesiones_de_clases(current_date, current_date + 7); r := r || 'superadmin_genera=PASO '; exception when others then r := r || format('superadmin_genera=%s ', sqlerrm); end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from classes where tenant_slug = 'mitico'; r := r || format('| anon_clases=%s ', n);
  select count(*) into n from class_schedules where tenant_slug = 'mitico'; r := r || format('anon_horarios=%s ', n);
  begin select count(*) into n from class_sessions; r := r || format('anon_sesiones=%s ', n); exception when others then r := r || format('anon_sesiones=%s ', sqlstate); end;
  begin select count(*) into n from class_attendances; r := r || format('anon_asistencias=%s ', n); exception when others then r := r || format('anon_asistencias=%s ', sqlstate); end;
  begin select count(*) into n from classes where trainer_id is not null; r := r || format('anon_trainer_col=%s ', n); exception when others then r := r || format('anon_trainer_col=%s ', sqlstate); end;
  begin j := registrar_asistencia_a_clase(box11, mf007); r := r || 'anon_rpc=PASO '; exception when others then r := r || format('anon_rpc=%s ', sqlstate); end;
  raise exception 'RESULTADO: %', r;
end $$;
