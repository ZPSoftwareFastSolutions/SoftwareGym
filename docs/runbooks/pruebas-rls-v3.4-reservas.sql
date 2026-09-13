-- =============================================================================
-- Pruebas de RLS · V3.4 reservas, lista de espera, faltas y avisos
--
-- Cómo se usa: pegar CADA bloque por separado en el editor SQL de Supabase (o
-- `execute_sql` por MCP). No dejan rastro: terminan con una excepción que revierte
-- todo y devuelve el resultado. Plantilla y trampas: CLAUDE.md §9.2.
--
-- Ids de la semilla del 2026-09-12 (sábado, 22:00 hora de La Paz):
--   llena  Fit funcional lun 14 07:00 Prado, cupo 4, 2 en espera (MF-009, MF-010)
--   fit15  Fit funcional mar 15 07:00 Prado · box14 Box lun 14 18:00 Prado (Entrenador Demo)
--   baile14 Baile fitness lun 14 19:00 Miraflores · kar15 Karate mar 15 18:00 Prado (sin instructor)
-- Socios: MF-005 anual (Fit y Box sí, Baile no) · MF-007 fit (vence el 14) ·
-- MF-009 trimestral · MF-003 quincenal, bloqueado hasta el 18/09 por tres faltas.
--
-- Resultado del 2026-09-12 (todo como se esperaba):
--   A · SOCIO MF-005  en_llena=reservada · reserva=reservada · duplicada=ya_reservado · para_otro=sin_permiso ·
--                     plan_sin_baile=plan_no_incluye_clase · no_abierta=reserva_no_abierta · box=reservada ·
--                     cuarta=limite_de_reservas · ajenas=0 · autoasistio=sin_asistencia_registrada · cancela_ajena=0 ·
--                     cancela_llena={tardia:false} · lista_staff=0 · stats=0 · ajustes=sin_permiso
--                     → MF-009 promovido de la espera a reservada, con 1 aviso «reserva_promovida»
--     SOCIO MF-003    reserva=reservas_bloqueadas · ve 1 aviso (el suyo) · marca leído 1
--   B · RECEPCIÓN     reserva para MF-009 en Prado=reservada (origen personal) · MF-007 el 15=sin_membresia_vigente ·
--                     cancela a pedido=tardia false · lista=6 · justifica=sin_permiso · ajustes=sin_permiso · avisos=0
--   C · ENTRENADOR    lista de su sesión=1 · lista ajena=0 · reservar en sesión ajena=sin_permiso · reservas ajenas visibles=0
--   D · GERENCIA      reserva por encima del bloqueo=reservada · justifica=ok → bloqueo libre · ajustes=ok ·
--                     bajar cupo bajo lo reservado=capacidad_menor_que_reservas · subir cupo → promueve 1 (queda 1 en espera) ·
--                     cancelar la sesión con reservas → 0 vivas y 1 aviso por socio · asistencia tardía de ayer →
--                     reserva=asistio · quitarla → no_asistio · cerrar lista futura=sesion_sin_terminar
--   E · SUPER ADMIN   0 reservas · F · ANÓNIMO tabla, RPC y avisos = 42501
--
-- Defectos encontrados al revisar la migración ANTES de aplicarla (no llegaron a la base):
--   1. `app.ajustes_de_reservas` armaba el registro por defecto con un ROW de enteros
--      contra columnas smallint: cast inválido. Se reescribió campo a campo.
--   2. Quitar la asistencia de una sesión ya terminada no podía devolver la reserva
--      a «no asistió»: la transición no admitía `asistio` como origen.
-- =============================================================================

-- ------------------------------------------------------------- A · SOCIO
do $$
declare r text := ''; n int; j jsonb; x text;
  llena uuid := 'fc2aa4e1-4dde-4f50-842b-7fe1bdeb485b';
  fit15 uuid := 'e6bc36fe-8c0e-4749-9e0e-981953952208';
  box14 uuid := '68759bfe-3377-4d20-bb68-73da2c2141e4';
  baile14 uuid := 'a593e2fb-5569-42b9-8a55-5e7542e05519';
  mf005 uuid := '9dcbda37-666c-452a-a934-4622b0c07faa';
  mf007 uuid := 'bc199357-fe9c-422c-9708-c126b3d7f4a9';
  mf009 uuid := 'e33e9e26-d2c8-4ad0-822c-aa0aa6e3983f';
  lejana uuid; fit16 uuid; mi_llena uuid; ajena uuid;
begin
  select s.id into lejana from class_sessions s join classes c on c.id = s.class_id where c.name = 'Fit funcional' and s.session_date >= '2026-09-22' order by s.session_date limit 1;
  select s.id into fit16 from class_sessions s join classes c on c.id = s.class_id where c.name = 'Fit funcional' and s.session_date = '2026-09-16';
  delete from class_reservations where customer_id = mf005 and session_id <> llena and session_id in (select id from class_sessions where session_date > '2026-09-12');
  select id into mi_llena from class_reservations where session_id = llena and customer_id = mf005 and status <> 'cancelada';
  select id into ajena from class_reservations where customer_id <> mf005 limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub','873112d0-1287-41c7-9604-b16f054b0de9','role','authenticated')::text, true);
  execute 'set local role authenticated';
  r := r || format('en_llena=%s ', (select mi_reserva_estado from v_class_sessions where id = llena));
  begin j := reservar_clase(fit15); r := r || format('reserva=%s ', j->>'estado'); exception when others then r := r || format('reserva=%s ', sqlerrm); end;
  begin j := reservar_clase(fit15); r := r || 'duplicada=PASO '; exception when others then r := r || format('duplicada=%s ', sqlerrm); end;
  begin j := reservar_clase(fit15, mf007); r := r || 'para_otro=PASO '; exception when others then r := r || format('para_otro=%s ', sqlerrm); end;
  begin j := reservar_clase(baile14); r := r || 'plan_sin_baile=PASO '; exception when others then r := r || format('plan_sin_baile=%s ', sqlerrm); end;
  begin j := reservar_clase(lejana); r := r || 'no_abierta=PASO '; exception when others then r := r || format('no_abierta=%s ', sqlerrm); end;
  begin j := reservar_clase(box14); r := r || format('box=%s ', j->>'estado'); exception when others then r := r || format('box=%s ', sqlerrm); end;
  begin j := reservar_clase(fit16); r := r || 'cuarta=PASO '; exception when others then r := r || format('cuarta=%s ', sqlerrm); end;
  select count(*) into n from class_reservations where customer_id <> mf005; r := r || format('ajenas=%s ', n);
  begin update class_reservations set status = 'asistio' where id = mi_llena; r := r || 'autoasistio=PASO '; exception when others then r := r || format('autoasistio=%s ', sqlerrm); end;
  begin update class_reservations set status = 'cancelada' where id = ajena; get diagnostics n = row_count; r := r || format('cancela_ajena=%s ', n); exception when others then r := r || format('cancela_ajena=%s ', sqlerrm); end;
  begin j := cancelar_reserva(mi_llena); r := r || format('cancela_llena=%s ', j::text); exception when others then r := r || format('cancela_llena=%s ', sqlerrm); end;
  select count(*) into n from reservas_de_sesion(llena); r := r || format('lista_staff=%s ', n);
  begin j := guardar_ajustes_de_reservas(3::smallint,0::smallint,60::smallint,5::smallint,true,5::smallint,3::smallint,30::smallint,7::smallint,true); r := r || 'ajustes=PASO '; exception when others then r := r || format('ajustes=%s ', sqlerrm); end;

  execute 'reset role';
  select status into x from class_reservations where session_id = llena and customer_id = mf009; r := r || format('| mf009_promovido=%s ', x);
  select count(*) into n from customer_messages where customer_id = mf009 and kind = 'reserva_promovida'; r := r || format('aviso_promovido=%s ', n);

  perform set_config('request.jwt.claims', json_build_object('sub','68805f64-5fb1-4c35-af60-a66ccf17c9ab','role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin j := reservar_clase(fit15); r := r || 'bloqueado=PASO '; exception when others then r := r || format('mf003_bloqueado=%s ', sqlerrm); end;
  select count(*) into n from customer_messages; r := r || format('sus_avisos=%s ', n);
  raise exception 'RESULTADO: %', r;
end $$;

-- ------------------------------------------------------------- B–F · PERSONAL, GERENCIA, SUPER ADMIN Y ANÓNIMO
do $$
declare r text := ''; n int; j jsonb; x text; d date;
  llena uuid := 'fc2aa4e1-4dde-4f50-842b-7fe1bdeb485b';
  fit15 uuid := 'e6bc36fe-8c0e-4749-9e0e-981953952208';
  box14 uuid := '68759bfe-3377-4d20-bb68-73da2c2141e4';
  kar15 uuid := '0001ad45-9990-44ff-8511-a7985c059e50';
  mf003 uuid := '83151246-2e63-440d-835f-fd13efb374d0';
  mf009 uuid := 'e33e9e26-d2c8-4ad0-822c-aa0aa6e3983f';
  mitico uuid; falta uuid; ayer uuid; ayer_res uuid; ayer_cust uuid; att uuid;
begin
  select id into mitico from tenants where slug = 'mitico';
  delete from class_reservations where customer_id = mf009 and session_id in (select id from class_sessions where session_date > '2026-09-12');
  select id into falta from class_reservations where customer_id = mf003 and status = 'no_asistio' order by created_at desc limit 1;
  select r2.id, r2.session_id, r2.customer_id into ayer_res, ayer, ayer_cust
  from class_reservations r2 join class_sessions s on s.id = r2.session_id join classes c on c.id = s.class_id
  where r2.status in ('reservada','no_asistio') and s.session_date = '2026-09-11' and c.access_mode = 'membresia' limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub','fcef6ed7-6aad-42a5-b543-969eb2acaf81','role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin j := reservar_clase(fit15, mf009); r := r || format('recepcion_reserva=%s ', j->>'estado'); exception when others then r := r || format('recepcion_reserva=%s ', sqlerrm); end;
  select source into x from class_reservations where session_id = fit15 and customer_id = mf009 and status <> 'cancelada'; r := r || format('origen=%s ', x);
  select count(*) into n from reservas_de_sesion(llena); r := r || format('lista=%s ', n);
  begin j := justificar_inasistencia(falta); r := r || 'recepcion_justifica=PASO '; exception when others then r := r || format('recepcion_justifica=%s ', sqlerrm); end;

  perform set_config('request.jwt.claims', json_build_object('sub','35b0cff9-48ee-44b8-8581-89cda456ca57','role','authenticated')::text, true);
  select count(*) into n from reservas_de_sesion(fit15); r := r || format('| entrenador_su_lista=%s ', n);
  select count(*) into n from reservas_de_sesion(kar15); r := r || format('lista_ajena=%s ', n);
  begin j := reservar_clase(kar15, mf009); r := r || 'reserva_en_ajena=PASO '; exception when others then r := r || format('reserva_en_ajena=%s ', sqlerrm); end;
  select count(*) into n from class_reservations r3 join class_sessions s on s.id = r3.session_id where s.trainer_id is distinct from '36448c43-23af-46bc-a38e-b73cdf7b2e11'; r := r || format('ajenas_visibles=%s ', n);

  perform set_config('request.jwt.claims', json_build_object('sub','758b1b40-4e4a-4fee-9bbd-750d03b05f5a','role','authenticated')::text, true);
  begin j := reservar_clase(fit15, mf003); r := r || format('| gerencia_sobre_bloqueo=%s ', j->>'estado'); exception when others then r := r || format('| gerencia_sobre_bloqueo=%s ', sqlerrm); end;
  begin j := justificar_inasistencia(falta); r := r || 'justifica=ok '; exception when others then r := r || format('justifica=%s ', sqlerrm); end;
  d := app.reservas_bloqueadas_hasta(mitico, mf003); r := r || format('bloqueo_tras_justificar=%s ', coalesce(d::text, 'libre'));
  begin update class_sessions set capacity = 2 where id = llena; r := r || 'baja_cupo=PASO '; exception when others then r := r || format('baja_cupo=%s ', sqlerrm); end;
  begin update class_sessions set capacity = 5 where id = llena; r := r || 'sube_cupo=ok '; exception when others then r := r || format('sube_cupo=%s ', sqlerrm); end;
  select count(*) into n from class_reservations where session_id = llena and status = 'en_espera'; r := r || format('espera_tras_subir=%s ', n);
  begin update class_sessions set status = 'cancelada', cancel_reason = 'Mantenimiento del salón' where id = box14; r := r || 'cancela_sesion=ok '; exception when others then r := r || format('cancela_sesion=%s ', sqlerrm); end;
  select count(*) into n from class_reservations where session_id = box14 and status = 'reservada'; r := r || format('box_vivas=%s ', n);
  if ayer is not null then
    begin insert into class_attendances (tenant_id, session_id, customer_id) values (mitico, ayer, ayer_cust) returning id into att; r := r || 'asistencia_tardia=ok '; exception when others then r := r || format('asistencia_tardia=%s ', sqlerrm); end;
    select status into x from class_reservations where id = ayer_res; r := r || format('reserva_tras_asistir=%s ', x);
    begin delete from class_attendances where id = att; r := r || 'quita=ok '; exception when others then r := r || format('quita=%s ', sqlerrm); end;
    select status into x from class_reservations where id = ayer_res; r := r || format('reserva_tras_quitar=%s ', x);
  end if;
  begin j := cerrar_lista_de_sesion(fit15); r := r || 'cerrar_futura=PASO '; exception when others then r := r || format('cerrar_futura=%s ', sqlerrm); end;

  perform set_config('request.jwt.claims', json_build_object('sub','4e5d445a-cf7e-4043-a7e4-78d130afd4af','role','authenticated')::text, true);
  select count(*) into n from class_reservations; r := r || format('| superadmin=%s ', n);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  execute 'set local role anon';
  begin select count(*) into n from class_reservations; r := r || 'anon_tabla=PASO '; exception when others then r := r || format('anon_tabla=%s ', sqlstate); end;
  begin j := reservar_clase(fit15, mf009); r := r || 'anon_rpc=PASO '; exception when others then r := r || format('anon_rpc=%s ', sqlstate); end;
  begin select count(*) into n from customer_messages; r := r || 'anon_avisos=PASO '; exception when others then r := r || format('anon_avisos=%s ', sqlstate); end;
  raise exception 'RESULTADO: %', r;
end $$;
