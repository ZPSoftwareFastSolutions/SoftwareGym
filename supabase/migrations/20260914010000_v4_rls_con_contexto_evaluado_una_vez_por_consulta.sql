-- =============================================================================
-- V4 · RENDIMIENTO — RLS con el contexto evaluado una vez por consulta
-- =============================================================================
--
-- SÍNTOMA. Con volumen real las páginas del panel se congelaban. Medido en una
-- transacción revertida con 2 000 socios y 50 000 entradas en Mítico, con la
-- sesión de gerencia:
--   select count(*) from attendance_records          > 20 s
--   v_customer_detail, 500 filas                      34 s
--   v_attendance_log, 800 filas                       57 s
--   v_dashboard_kpis                                  superó el statement_timeout
--
-- CAUSA. Las políticas llamaban a app.tenant_allows(tenant_id, 'x') con una
-- COLUMNA DE LA FILA como argumento. PostgreSQL no puede calcular eso una vez:
-- lo evalúa en cada fila, y cada evaluación son dos subconsultas (el gimnasio de
-- la sesión y el permiso, con cuatro tablas unidas). Lo mismo con
-- app.current_customer_id() y el resto del contexto sin envolver en SELECT.
--
-- CORRECCIÓN. Mismo significado, otra forma:
--   app.tenant_allows(col, 'p')
--     → col = (select app.current_tenant_id()) and (select app.has_permission('p'))
--   app.current_customer_id()   → (select app.current_customer_id())
--   (igual current_app_user_id, current_tenant_id, current_trainer_id, is_platform_admin)
--
-- Un `(select f())` que no mira la fila es un initPlan: se calcula UNA vez por
-- consulta. tenant_allows exigía además un tenant no nulo: `null = x` es null y
-- una política que da null niega, igual que antes. Se comprobó antes de migrar
-- que ninguna política usa estas llamadas bajo NOT, CASE o COALESCE, donde null
-- y false dejarían de ser lo mismo.
--
-- VERIFICACIÓN. Huella de filas visibles de las 79 tablas y vistas de `public`
-- por gerencia, recepción, entrenador, socio, plataforma y anónimo ANTES y
-- DESPUÉS (docs/runbooks/pruebas-rls-v4-administracion-y-rendimiento.sql): el
-- md5 de cada rol tiene que ser idéntico.
--
-- Queda fuera `storage.objects` (sus políticas son del esquema de Storage y
-- miran pocas filas por subida).
-- =============================================================================

create function pg_temp.contexto_una_vez(p text) returns text
language sql immutable as $f$
  select regexp_replace(
    regexp_replace(p,
      '(?<!SELECT )app\.(current_customer_id|current_app_user_id|current_tenant_id|current_trainer_id|is_platform_admin)\(\)',
      '( SELECT app.\1() AS \1)', 'g'),
    'app\.tenant_allows\(([a-z_]+(\.[a-z_]+)?), (''[a-z_.]+''::text)\)',
    '((\1 = ( SELECT app.current_tenant_id() AS current_tenant_id)) AND ( SELECT app.has_permission(\3) AS has_permission))',
    'g')
$f$;

do $$
declare
  p record;
  nueva_q text;
  nueva_c text;
  sentencia text;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    nueva_q := pg_temp.contexto_una_vez(p.qual);
    nueva_c := pg_temp.contexto_una_vez(p.with_check);
    if nueva_q is distinct from p.qual or nueva_c is distinct from p.with_check then
      sentencia := format('alter policy %I on public.%I', p.policyname, p.tablename);
      if p.qual is not null then sentencia := sentencia || ' using (' || nueva_q || ')'; end if;
      if p.with_check is not null then sentencia := sentencia || ' with check (' || nueva_c || ')'; end if;
      execute sentencia;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'app\.tenant_allows\('
  ) then
    raise exception 'quedó una política que evalúa el permiso por fila';
  end if;
end $$;
