-- =============================================================================
-- V4.2 · Foto de perfil del socio (identidad en el ingreso)
-- =============================================================================
--
-- PARA QUÉ. Que recepción pueda confirmar de un vistazo que quien pasa el QR es
-- quien dice ser. El QR es un token opaco y rotable (decisión 11): identifica
-- una ficha, no una cara. La foto cierra ese hueco sin tocar el QR.
--
-- POR QUÉ STORAGE Y NO UNA COLUMNA BINARIA. `customers.photo_url` YA EXISTE en
-- el esquema desde V2 y nunca se usó: es el sitio natural. Guardar el bitmap en
-- PostgreSQL metería cientos de KB por socio en cada `select *` de la ficha, de
-- la lista y de los reportes —que ya pagan siete subconsultas— y haría inútil el
-- trabajo de paginación de V4. El proyecto ya tiene tres buckets con el patrón
-- resuelto (`comprobantes`, `ejercicios`, `qr-pagos`); este es el cuarto.
--
-- PRIVADO, como `comprobantes` y `ejercicios`. La cara de un socio es dato
-- personal: no va en un bucket público que cualquiera pueda enumerar. Se sirve
-- con URL firmada de corta duración.
--
-- EL PROBLEMA QUE HAY QUE RESOLVER CON CUIDADO. Hoy el socio PUEDE leer su
-- ficha (`customers_select_self`) pero NO puede escribirla: `customers_update`
-- exige `customers.update`, que solo tiene el personal. Para que suba su foto
-- hace falta dejarle escribir su propia fila… sin abrirle el resto de la ficha.
--
-- Y los grants de columna no sirven aquí: son por ROL de base de datos, y el
-- socio y la recepcionista son el mismo rol (`authenticated`). Conceder
-- `update (photo_url)` no se le puede dar a uno y no al otro.
--
-- La solución es la del proyecto para invariantes que RLS no expresa (decisión
-- 22, «una y solo una sede principal»): un DISPARADOR que compara la fila
-- entera. Quien no tiene `customers.update` solo puede haber cambiado la foto;
-- cualquier otra diferencia se rechaza. Al comparar el JSON completo, una
-- columna que se añada mañana queda protegida sola, sin tocar esta función.
-- =============================================================================

-- ---------------------------------------------------------------- 1. bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- 512 KB: la foto se reduce en el navegador a un cuadrado pequeño antes de
-- subir. Es un avatar para reconocer una cara en el mostrador, no una
-- fotografía que haya que conservar en su resolución original.

-- ---------------------------------------------------------------- 2. socio de la ruta

-- `app.tenant_de_ruta` ya existe para el primer segmento. Para los avatares
-- hace falta también el segundo: `{tenant_id}/{customer_id}/{uuid}.{ext}`.
create or replace function app.customer_de_ruta(p_name text)
returns uuid
language sql
immutable
set search_path to ''
as $function$
  select nullif(split_part(p_name, '/', 2), '')::uuid
$function$;

comment on function app.customer_de_ruta(text) is
  'V4.2: id de socio del segundo segmento de una ruta de Storage. NULL si no es un uuid.';

revoke all on function app.customer_de_ruta(text) from public, anon;
grant execute on function app.customer_de_ruta(text) to authenticated;

-- ---------------------------------------------------------------- 3. políticas de Storage

-- Lee el personal que ya puede leer fichas, y el propio socio la suya. Nadie más.
drop policy if exists avatares_leer on storage.objects;
create policy avatares_leer on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatares'
    and app.tenant_de_ruta(name) = (select app.current_tenant_id())
    and (
      (select app.has_permission('customers.read'))
      or app.customer_de_ruta(name) = (select app.current_customer_id())
    )
  );

drop policy if exists avatares_subir on storage.objects;
create policy avatares_subir on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and app.tenant_de_ruta(name) = (select app.current_tenant_id())
    and (
      (select app.has_permission('customers.update'))
      or app.customer_de_ruta(name) = (select app.current_customer_id())
    )
  );

drop policy if exists avatares_borrar on storage.objects;
create policy avatares_borrar on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatares'
    and app.tenant_de_ruta(name) = (select app.current_tenant_id())
    and (
      (select app.has_permission('customers.update'))
      or app.customer_de_ruta(name) = (select app.current_customer_id())
    )
  );

-- ---------------------------------------------------------------- 4. el socio escribe SU foto y nada más

drop policy if exists customers_update_self on public.customers;
create policy customers_update_self on public.customers
  for update to authenticated
  using (id = (select app.current_customer_id()))
  with check (id = (select app.current_customer_id()));

create or replace function app.socio_solo_cambia_su_foto()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- El personal edita la ficha entera, como siempre.
  if app.has_permission('customers.update') then
    return new;
  end if;

  -- Quien no lo tiene llega por `customers_update_self`: solo su foto.
  -- Se compara la fila COMPLETA en JSON menos lo que puede cambiar, así que una
  -- columna nueva queda protegida sin tocar esta función.
  if (to_jsonb(new) - 'photo_url' - 'updated_at' - 'version')
     is distinct from
     (to_jsonb(old) - 'photo_url' - 'updated_at' - 'version') then
    raise exception 'solo_la_foto' using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all on function app.socio_solo_cambia_su_foto() from public, anon, authenticated;

drop trigger if exists socio_solo_cambia_su_foto on public.customers;
create trigger socio_solo_cambia_su_foto
  before update on public.customers
  for each row execute function app.socio_solo_cambia_su_foto();

-- ---------------------------------------------------------------- 5. comprobación

do $$
declare v_bucket int; v_pol int;
begin
  select count(*) into v_bucket from storage.buckets where id = 'avatares' and public = false;
  if v_bucket <> 1 then
    raise exception 'El bucket avatares debe existir y ser privado';
  end if;

  select count(*) into v_pol from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and policyname like 'avatares_%';
  if v_pol <> 3 then
    raise exception 'Faltan políticas de avatares: hay %', v_pol;
  end if;
end $$;
