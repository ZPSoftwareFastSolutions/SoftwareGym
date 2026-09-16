-- =============================================================================
-- BATERÍA DE RLS · V4.2 — foto de perfil, pases de acceso y alcance de sede
-- =============================================================================
--
-- Ejecutada el 2026-09-16 contra el proyecto dnclwawnjnzqqxgsuhpn.
-- TODO COMO SE ESPERABA **tras una corrección que encontró ella misma**
-- (migración `v4_2_la_guarda_de_la_foto_solo_aplica_al_socio`).
--
-- Cada bloque es un `do $$ … $$` que termina en `raise exception`: la excepción
-- devuelve el resultado en el mensaje y REVIERTE todo lo que el bloque escribió.
-- No deja rastro en la base de producción.
--
-- ─────────────────────────────────────────────────────────────────────────
-- TRES TRAMPAS QUE YA DIERON FALSOS POSITIVOS (las dos primeras vienen de V3;
-- la tercera se aprendió aquí):
--
--   1. Resolver los ids del «ataque» ANTES de cambiar de rol y usarlos como
--      literales: bajo RLS un subselect devuelve 0 filas y el INSERT «no falla».
--   2. Las funciones de contexto son STABLE y se cachean dentro de UNA
--      sentencia: cada rol se mide en su propia sentencia.
--   3. **Comprobar QUÉ ROLES tiene la cuenta con la que se prueba.** La primera
--      pasada usó a Juan Pérez como «socio» y dio tres FUGAS seguidas: cambiaba
--      su nombre, tocaba fichas ajenas y se abría la puerta él mismo. No era una
--      fuga: Juan Pérez es el ADMINISTRADOR de Mítico desde que se le designó en
--      V4. La batería estaba mal, no el sistema. Para probar «socio» hace falta
--      una cuenta cuyo único rol sea `customer` (aquí, María López).
--
-- IDs usados:
--   Mítico             4b79e41f-6d51-407a-a16f-bce8b000b50c
--   GOLD               e0fdd2ba-5e67-490d-940d-a6fcf1f7975e
--   Prado / Miraflores 26ee6a4c-…-3f356e759e4c / ee9dd276-…-c3b4023d7b33
--   recepción (sub)    fcef6ed7-6aad-42a5-b543-969eb2acaf81
--   María López (sub)  c25555c2-5e84-42db-b7c5-ed4301007511  · ficha bc199357-…
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BLOQUE 1 · El tope diario y quién pone el número
-- -----------------------------------------------------------------------------
-- RESULTADO 2026-09-16:
--   pase1=ok pase2=ok pase3=ok
--   4to=limite_de_accesos_diarios      (el cuarto NO pasa, ni en otra sede)
--   ultimo_numero=3                    (lo numera la base, no el cliente)
--   entradas_del_dia=0                 (los pases no tocan attendance_records)
--   fija_numero=bloqueado(42501)       (pass_number no está concedido)
--   socio_ve=3                         (ve los suyos)
do $$
declare
  r text := ''; n int;
  v_mitico uuid := '4b79e41f-6d51-407a-a16f-bce8b000b50c';
  v_juan   uuid := 'bdd26a0b-058d-4b84-a488-0c8df66a7a86';
  v_prado  uuid := '26ee6a4c-33bf-4bd3-acfa-3f356e759e4c';
  v_mira   uuid := 'ee9dd276-fee1-40b8-8c61-c3b4023d7b33';
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','fcef6ed7-6aad-42a5-b543-969eb2acaf81','role','authenticated')::text, true);
  execute 'set local role authenticated';

  for n in 1..3 loop
    begin
      insert into access_passes (tenant_id, customer_id, branch_id, method)
      values (v_mitico, v_juan, v_prado, 'qr');
      r := r || format('pase%s=ok ', n);
    exception when others then
      r := r || format('pase%s=FALLO(%s:%s) ', n, sqlstate, sqlerrm);
    end;
  end loop;

  -- El cuarto, y encima en otra sede: el tope es del gimnasio, no de la puerta.
  begin
    insert into access_passes (tenant_id, customer_id, branch_id, method)
    values (v_mitico, v_juan, v_mira, 'qr');
    r := r || '4to=FUGA ';
  exception when others then r := r || format('4to=%s ', sqlerrm); end;

  select max(pass_number) into n from access_passes where customer_id = v_juan;
  r := r || format('ultimo_numero=%s ', n);

  -- Lo que sostiene todo el diseño: los pases NO tocan la entrada del día.
  select count(*) into n from attendance_records
  where customer_id = v_juan and attendance_date = app.hoy_del_gimnasio(v_mitico);
  r := r || format('entradas_del_dia=%s ', n);

  begin
    insert into access_passes (tenant_id, customer_id, branch_id, method, pass_number)
    values (v_mitico, v_juan, v_prado, 'qr', 99);
    r := r || 'fija_numero=FUGA ';
  exception when others then r := r || format('fija_numero=bloqueado(%s) ', sqlstate); end;

  perform set_config('request.jwt.claims',
    json_build_object('sub','a370ad78-0725-4fdc-a8d2-2b1e5b3625d1','role','authenticated')::text, true);
  select count(*) into n from access_passes;
  r := r || format('socio_ve=%s ', n);

  raise exception 'RESULTADO: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- BLOQUE 2 · Alcance de sede, aislamiento y la guarda de la foto
-- -----------------------------------------------------------------------------
-- RESULTADO 2026-09-16 (con una cuenta cuyo ÚNICO rol es `customer`):
--   semilla=ok
--   sede_origen=ok                        (en su sede, pasa)
--   otra_sede=sucursal_fuera_del_plan     (su plan no vale allí)
--   cross_tenant=bloqueado(42501)         (recepción de Mítico no abre GOLD)
--   socio_pone_su_foto=1
--   socio_cambia_su_nombre=bloqueado(42501)   ← el disparador
--   socio_toca_fichas_ajenas=0                ← RLS
--   socio_se_abre_puerta=bloqueado(42501)
--   socio_ve_sus_pases=1
--   anon_ve=bloqueado(42501)
do $$
declare
  r text := ''; n int;
  v_mitico uuid := '4b79e41f-6d51-407a-a16f-bce8b000b50c';
  v_gold   uuid := 'e0fdd2ba-5e67-490d-940d-a6fcf1f7975e';
  -- María López: SOLO rol customer. Ver la trampa 3 de la cabecera.
  v_maria  uuid := 'bc199357-fe9c-422c-9708-c126b3d7f4a9';
  v_prado  uuid := '26ee6a4c-33bf-4bd3-acfa-3f356e759e4c';
  v_mira   uuid := 'ee9dd276-fee1-40b8-8c61-c3b4023d7b33';
  v_plan   uuid;
begin
  -- Se le pone al plan alcance «solo su sede» y se le fija Prado como origen.
  select m.plan_id into v_plan from memberships m
  where m.customer_id = v_maria and m.status = 'active'
    and m.start_date <= current_date and m.end_date >= current_date
  order by m.end_date desc limit 1;

  update membership_plans set branch_scope = 'sede_origen' where id = v_plan;
  update customers set home_branch_id = v_prado where id = v_maria;
  r := r || 'semilla=ok ';

  perform set_config('request.jwt.claims',
    json_build_object('sub','fcef6ed7-6aad-42a5-b543-969eb2acaf81','role','authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into access_passes (tenant_id, customer_id, branch_id, method)
    values (v_mitico, v_maria, v_prado, 'qr');
    r := r || 'sede_origen=ok ';
  exception when others then r := r || format('sede_origen=FALLO(%s) ', sqlerrm); end;

  begin
    insert into access_passes (tenant_id, customer_id, branch_id, method)
    values (v_mitico, v_maria, v_mira, 'qr');
    r := r || 'otra_sede=FUGA ';
  exception when others then r := r || format('otra_sede=%s ', sqlerrm); end;

  begin
    insert into access_passes (tenant_id, customer_id, branch_id, method)
    values (v_gold, v_maria, v_prado, 'qr');
    r := r || 'cross_tenant=FUGA ';
  exception when others then r := r || format('cross_tenant=bloqueado(%s) ', sqlstate); end;

  perform set_config('request.jwt.claims',
    json_build_object('sub','c25555c2-5e84-42db-b7c5-ed4301007511','role','authenticated')::text, true);

  update customers set photo_url = 'x/y/z.webp' where id = v_maria;
  get diagnostics n = row_count;
  r := r || format('socio_pone_su_foto=%s ', n);

  begin
    update customers set first_name = 'Intrusa' where id = v_maria;
    r := r || 'socio_cambia_su_nombre=FUGA ';
  exception when others then r := r || format('socio_cambia_su_nombre=bloqueado(%s) ', sqlstate); end;

  update customers set photo_url = 'a/b/c.webp' where tenant_id = v_mitico and id <> v_maria;
  get diagnostics n = row_count;
  r := r || format('socio_toca_fichas_ajenas=%s ', n);

  begin
    insert into access_passes (tenant_id, customer_id, branch_id, method)
    values (v_mitico, v_maria, v_prado, 'qr');
    r := r || 'socio_se_abre_puerta=FUGA ';
  exception when others then r := r || format('socio_se_abre_puerta=bloqueado(%s) ', sqlstate); end;

  select count(*) into n from access_passes;
  r := r || format('socio_ve_sus_pases=%s ', n);

  execute 'set local role anon';
  begin
    select count(*) into n from access_passes;
    r := r || format('anon_ve=%s ', n);
  exception when others then r := r || format('anon_ve=bloqueado(%s) ', sqlstate); end;

  raise exception 'RESULTADO: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- COMPROBACIONES SIN SESIÓN (no escriben nada)
-- -----------------------------------------------------------------------------

-- El renombrado de GOLD no tocó a Mítico. RESULTADO: gold_elalto 1 · gold_viejo 0 · mitico_miraflores 1
select
  (select count(*) from branches b join tenants t on t.id=b.tenant_id
     where t.slug='golds-gym-premium' and b.code='ELALTO') as gold_elalto,
  (select count(*) from branches b join tenants t on t.id=b.tenant_id
     where t.slug='golds-gym-premium' and (b.code='MIRAFLORES' or b.name ilike '%miraflores%')) as gold_viejo,
  (select count(*) from branches b join tenants t on t.id=b.tenant_id
     where t.slug='mitico' and b.code='MIRAFLORES') as mitico_miraflores;

-- Ningún plan existente cambió de comportamiento. RESULTADO: 0
select count(*) from membership_plans where branch_scope <> 'todas';

-- El índice que sostiene racha, KPI y reportes sigue en pie. RESULTADO: 1
select count(*) from pg_indexes
where schemaname='public' and indexname='attendance_tenant_customer_dia_uk';

-- Ninguna política nueva evalúa el contexto por fila (regla de V4). RESULTADO: 0 filas
select polname from pg_policy p join pg_class c on c.oid=p.polrelid
where c.relname in ('access_passes','membership_plan_branches')
  and (pg_get_expr(polqual, polrelid) like '%tenant_allows(%'
    or pg_get_expr(polwithcheck, polrelid) like '%tenant_allows(%');


-- -----------------------------------------------------------------------------
-- BLOQUE 3 · Autorización de clases e invitados (V4.2, etapa 4)
-- -----------------------------------------------------------------------------
-- RESULTADO 2026-09-16:
--   sin_admision=no_autorizado      ← LA PRUEBA QUE IMPORTA: un socio con
--                                     membresía vigente NO entra a una clase
--                                     «autorizados» sin su admisión nominal
--   invitado=ok                     (un no socio, sin ficha, puede ser admitido)
--   invitado_duplicado=bloqueado(23505)  (mismo documento, normalizado)
--   socio_e_invitado=bloqueado(23514)    (o socio o invitado, nunca los dos)
--   fija_llegada=bloqueado(42501)        (checked_in_at no se concede al crear)
--   admite_socio=ok
--   socio_ve=1                      (ve SU admisión, no la del invitado)
--   socio_autoriza=bloqueado(42501)
--   anon_ve=bloqueado(42501)
--   con_admision=ok                 (con la admisión puesta, pasa)
--
-- NOTA DE MÉTODO: `app.acceso_a_clase` es un ayudante DEFINER de disparadores y
-- no está concedido a `authenticated`. Se evalúa como superusuario, no dentro
-- de la sesión simulada; llamarla con `set role authenticated` da 42501 y eso
-- NO es un hallazgo, es la prueba mal escrita.
