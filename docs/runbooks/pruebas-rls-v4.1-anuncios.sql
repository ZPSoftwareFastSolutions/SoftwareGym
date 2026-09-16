-- =============================================================================
-- BATERÍA DE RLS · V4.1 — anuncios y aislamiento del tenant nuevo
-- =============================================================================
--
-- Ejecutada el 2026-09-15 contra el proyecto dnclwawnjnzqqxgsuhpn.
-- TODO COMO SE ESPERABA (resultados al pie de cada bloque).
--
-- CÓMO SE USA. Cada bloque es un `do $$ … $$` que termina en `raise exception`:
-- la excepción devuelve el resultado en el mensaje y REVIERTE todo lo que el
-- bloque escribió. No deja rastro en la base de producción.
--
-- DOS TRAMPAS que ya dieron falsos positivos en versiones anteriores y que esta
-- batería respeta:
--   1. Resolver los ids del «ataque» ANTES de cambiar de rol y usarlos como
--      literales: bajo RLS un subselect devuelve 0 filas y el INSERT «no falla».
--   2. Las funciones de contexto son STABLE y se cachean dentro de UNA
--      sentencia: cada rol se mide en su propia sentencia (en PL/pgSQL cada
--      sentencia ya es independiente).
--
-- IDs usados (ver §8 de CLAUDE.md):
--   Mítico            4b79e41f-6d51-407a-a16f-bce8b000b50c
--   GOLD              e0fdd2ba-5e67-490d-940d-a6fcf1f7975e
--   gerencia (sub)    758b1b40-4e4a-4fee-9bbd-750d03b05f5a
--   recepción (sub)   fcef6ed7-6aad-42a5-b543-969eb2acaf81
--   administración    a370ad78-0725-4fdc-a8d2-2b1e5b3625d1
--   plataforma (sub)  4e5d445a-cf7e-4043-a7e4-78d130afd4af
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BLOQUE 1-5 · Con sesión: quién publica, quién edita y qué ve cada uno
-- -----------------------------------------------------------------------------
-- RESULTADO 2026-09-15:
--   1.gerencia_publica=ok            (content.manage)
--   1.slug_por_disparador=1          (el slug NO viene del formulario)
--   2.mitico_publica_en_gold=bloqueado(42501)
--   2.ve_sedes_gold=0  2.ve_clases_gold=0  2.ve_planes_gold=0
--   3.recepcion_publica=bloqueado(42501)   3.recepcion_edita=0
--   3.recepcion_lee_los_suyos=1      (es del gimnasio: lee, no publica)
--   4.admin_edita=1
--   5.plataforma_ve_anuncios=0       (mínimo privilegio, decisión 17)
--   5.plataforma_ve_sedes_gold=4     (las sedes son configuración, no datos personales)
do $$
declare
  r text := '';
  n int;
  v_gold uuid := 'e0fdd2ba-5e67-490d-940d-a6fcf1f7975e';
  v_mitico uuid := '4b79e41f-6d51-407a-a16f-bce8b000b50c';
  v_anuncio_mitico uuid;
begin
  -- 1 · Gerencia de Mítico publica
  perform set_config('request.jwt.claims',
    json_build_object('sub','758b1b40-4e4a-4fee-9bbd-750d03b05f5a','role','authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into announcements (tenant_id, title, summary, body, kind, sort_order, is_active)
    values (v_mitico, 'Prueba RLS', 'resumen', 'cuerpo', 'evento', 5, true)
    returning id into v_anuncio_mitico;
    r := r || '1.gerencia_publica=ok ';
  exception when others then
    r := r || format('1.gerencia_publica=FALLO(%s) ', sqlstate);
  end;

  select count(*) into n from announcements where id = v_anuncio_mitico and tenant_slug = 'mitico';
  r := r || format('1.slug_por_disparador=%s ', n);

  -- 2 · No publica en otro gimnasio ni ve nada suyo
  begin
    insert into announcements (tenant_id, title) values (v_gold, 'Intruso');
    r := r || '2.mitico_publica_en_gold=FUGA ';
  exception when others then
    r := r || format('2.mitico_publica_en_gold=bloqueado(%s) ', sqlstate);
  end;

  select count(*) into n from branches where tenant_id = v_gold;
  r := r || format('2.ve_sedes_gold=%s ', n);
  select count(*) into n from classes where tenant_id = v_gold;
  r := r || format('2.ve_clases_gold=%s ', n);
  select count(*) into n from membership_plans where tenant_id = v_gold;
  r := r || format('2.ve_planes_gold=%s ', n);

  -- 3 · Recepción lee pero no publica: un anuncio es la cara pública del
  --     gimnasio, no una tarea de mostrador
  perform set_config('request.jwt.claims',
    json_build_object('sub','fcef6ed7-6aad-42a5-b543-969eb2acaf81','role','authenticated')::text, true);

  begin
    insert into announcements (tenant_id, title) values (v_mitico, 'Recepcion');
    r := r || '3.recepcion_publica=FUGA ';
  exception when others then
    r := r || format('3.recepcion_publica=bloqueado(%s) ', sqlstate);
  end;

  update announcements set title = 'editado' where id = v_anuncio_mitico;
  get diagnostics n = row_count;
  r := r || format('3.recepcion_edita=%s ', n);

  select count(*) into n from announcements where tenant_id = v_mitico;
  r := r || format('3.recepcion_lee_los_suyos=%s ', n);

  -- 4 · Administración sí edita
  perform set_config('request.jwt.claims',
    json_build_object('sub','a370ad78-0725-4fdc-a8d2-2b1e5b3625d1','role','authenticated')::text, true);
  update announcements set title = 'editado por admin' where id = v_anuncio_mitico;
  get diagnostics n = row_count;
  r := r || format('4.admin_edita=%s ', n);

  -- 5 · La plataforma no lee el contenido de un gimnasio
  perform set_config('request.jwt.claims',
    json_build_object('sub','4e5d445a-cf7e-4043-a7e4-78d130afd4af','role','authenticated')::text, true);
  select count(*) into n from announcements;
  r := r || format('5.plataforma_ve_anuncios=%s ', n);
  select count(*) into n from branches where tenant_id = v_gold;
  r := r || format('5.plataforma_ve_sedes_gold=%s ', n);

  raise exception 'RESULTADO: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- BLOQUE 6 · Anónimo: la vitrina solo ve lo PUBLICADO
-- -----------------------------------------------------------------------------
-- Es la prueba que más importa de esta capacidad: un borrador, un anuncio
-- programado para más adelante y uno vencido NO pueden salir en la vitrina.
--
-- RESULTADO 2026-09-15:
--   anon.titulos_gold=[GOLD publicado]   (de cuatro sembrados, solo uno)
--   anon.vista_mitico=1                  (cada vitrina filtra por su slug)
--   anon.publica=bloqueado(42501)
--   anon.lee_autoria=bloqueado(42501)    (created_by no está concedido)
--   anon.sedes_gold=4  anon.clases_gold=15  anon.horarios_gold=60
do $$
declare
  r text := '';
  n int;
  titulos text;
  v_gold uuid := 'e0fdd2ba-5e67-490d-940d-a6fcf1f7975e';
  v_mitico uuid := '4b79e41f-6d51-407a-a16f-bce8b000b50c';
begin
  -- Sembrado como superusuario (se revierte): publicado, programado, vencido y
  -- retirado, para que el filtro tenga de dónde equivocarse.
  insert into announcements (tenant_id, title, kind, sort_order, is_active, published_at, expires_at) values
    (v_gold,  'GOLD publicado',  'evento',   10, true,  now() - interval '1 day', null),
    (v_gold,  'GOLD programado', 'evento',    9, true,  now() + interval '7 day', null),
    (v_gold,  'GOLD vencido',    'promocion', 8, true,  now() - interval '9 day', now() - interval '1 day'),
    (v_gold,  'GOLD retirado',   'novedad',   7, false, now() - interval '1 day', null),
    (v_mitico,'MITICO publicado','novedad',   5, true,  now() - interval '1 day', null);

  execute 'set local role anon';

  select count(*) into n from v_announcements_public where tenant_slug = 'golds-gym-premium';
  r := r || format('anon.vista_gold=%s ', n);

  select string_agg(title, '|' order by title) into titulos
    from v_announcements_public where tenant_slug = 'golds-gym-premium';
  r := r || format('anon.titulos_gold=[%s] ', coalesce(titulos, ''));

  select count(*) into n from v_announcements_public where tenant_slug = 'mitico';
  r := r || format('anon.vista_mitico=%s ', n);

  begin
    insert into announcements (tenant_id, title) values (v_gold, 'Anonimo');
    r := r || 'anon.publica=FUGA ';
  exception when others then
    r := r || format('anon.publica=bloqueado(%s) ', sqlstate);
  end;

  begin
    select count(*) into n from announcements a where a.created_by is null;
    r := r || 'anon.lee_autoria=FUGA ';
  exception when others then
    r := r || format('anon.lee_autoria=bloqueado(%s) ', sqlstate);
  end;

  -- La vitrina de GOLD, como cliente anónimo
  select count(*) into n from branches where tenant_slug = 'golds-gym-premium' and is_active;
  r := r || format('anon.sedes_gold=%s ', n);
  select count(*) into n from classes where tenant_slug = 'golds-gym-premium' and is_public and is_active;
  r := r || format('anon.clases_gold=%s ', n);
  select count(*) into n from class_schedules where tenant_slug = 'golds-gym-premium';
  r := r || format('anon.horarios_gold=%s ', n);

  raise exception 'RESULTADO: %', r;
end $$;


-- -----------------------------------------------------------------------------
-- COMPROBACIONES SIN SESIÓN (no escriben nada)
-- -----------------------------------------------------------------------------

-- El alta de GOLD quedó completa y no tocó a nadie más.
-- RESULTADO 2026-09-15: sedes 4 (1 principal) · planes 7 · clases 15 ·
-- horarios 60 · clase↔plan 47 · Mítico sigue con sus 8 clases.
select
  (select count(*) from branches b join tenants t on t.id = b.tenant_id where t.slug = 'golds-gym-premium') as sedes,
  (select count(*) from membership_plans p join tenants t on t.id = p.tenant_id where t.slug = 'golds-gym-premium') as planes,
  (select count(*) from classes c join tenants t on t.id = c.tenant_id where t.slug = 'golds-gym-premium') as clases,
  (select count(*) from class_schedules s join tenants t on t.id = s.tenant_id where t.slug = 'golds-gym-premium') as horarios,
  (select count(*) from class_plans cp join tenants t on t.id = cp.tenant_id where t.slug = 'golds-gym-premium') as clase_plan,
  (select count(*) from classes c join tenants t on t.id = c.tenant_id where t.slug = 'mitico') as clases_de_mitico;

-- Ninguna política nueva llama a una función de contexto por fila (regla de V4).
-- Debe devolver 0 filas.
select polname, pg_get_expr(polqual, polrelid) as expresion
from pg_policy p join pg_class c on c.oid = p.polrelid
where c.relname = 'announcements'
  and (pg_get_expr(polqual, polrelid) like '%tenant_allows(%'
    or pg_get_expr(polwithcheck, polrelid) like '%tenant_allows(%');
