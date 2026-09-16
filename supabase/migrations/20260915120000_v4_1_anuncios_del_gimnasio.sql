-- =============================================================================
-- V4.1 · CAPACIDAD GENÉRICA — anuncios del gimnasio
-- =============================================================================
--
-- POR QUÉ UNA TABLA NUEVA Y NO `notices`. Se revisó `notices` antes de decidir:
-- es la bandeja PRIVADA del socio (título, cuerpo, audiencia, vigencia) y la lee
-- solo quien tiene sesión en ese gimnasio. No tiene imagen, ni resumen, ni orden
-- de presentación, y ningún anónimo la ve. La vitrina necesita lo contrario:
-- arte, un resumen corto para la tarjeta, prioridad y lectura pública. Forzar
-- las dos cosas en una tabla obligaría a que la bandeja del socio tuviera
-- columnas de marketing y a que una política dejara leer `notices` al anónimo:
-- un riesgo real (los avisos manuales de un gimnasio no son públicos) a cambio
-- de ahorrar una tabla.
--
-- QUÉ ES. Anuncios tipo panfleto que el gimnasio publica en su sitio: clases
-- nuevas, eventos, promociones, comunicados. NO es un CMS: es un contenido con
-- forma fija que se gestiona desde el panel, como las sedes o las clases.
--
-- ENLATADO. La capacidad es del PRODUCTO, no de un cliente. Cualquier gimnasio
-- la enciende con la flag `enableAnnouncements`; quien no la contrata no ve ni
-- la pantalla ni la sección, y su sitio queda igual que hoy.
--
-- AISLAMIENTO. `tenant_id` en la tabla y en sus índices; políticas con el
-- contexto evaluado UNA VEZ POR CONSULTA (regla de V4); `tenant_slug` por
-- disparador para que la vitrina anónima filtre sin unir; y lo que ve el
-- anónimo es solo lo publicado y vigente, nunca un borrador.
-- =============================================================================

-- ---------------------------------------------------------------- 1. permiso

insert into public.permissions (code, module, action, description)
values ('content.manage', 'content', 'manage', 'Publicar y editar los anuncios del sitio del gimnasio')
on conflict (code) do nothing;

-- Administración y Gerencia publican. Recepción no: un anuncio es la cara
-- pública del gimnasio, no una tarea de mostrador.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('admin', 'manager') and r.tenant_id is null
  and p.code = 'content.manage'
on conflict do nothing;

-- ---------------------------------------------------------------- 2. tabla

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- Denormalizado por disparador, como en `branches` y `classes`: deja que la
  -- vitrina estática filtre por slug sin unir `tenants` (que el anónimo no lee).
  tenant_slug text,

  title text not null,
  -- Lo que se lee en la tarjeta del carrusel. Corto a propósito: si el resumen
  -- no cabe en una tarjeta, el carrusel deja de ser un índice y pasa a ser el
  -- contenido, y entonces el detalle no aporta nada.
  summary text,
  -- El panfleto completo. Se muestra en el detalle, no en el carrusel.
  body text,

  -- Arte principal en el bucket `anuncios`. Sin imagen, la tarjeta cae al marco
  -- generativo de la marca: nunca se ve una imagen rota.
  image_path text,
  image_alt text,

  -- Para qué es el anuncio. Lista cerrada para que la presentación pueda
  -- rotular y colorear sin adivinar, y para no acabar con veinte etiquetas
  -- escritas a mano que signifiquen lo mismo.
  kind text not null default 'novedad'
    check (kind in ('clase', 'evento', 'promocion', 'actividad', 'novedad', 'informacion', 'comunicado')),

  -- Información adicional: el enlace al que lleva «Saber más» (una inscripción,
  -- el grupo de WhatsApp, la publicación de la red social).
  link_url text check (link_url is null or link_url ~ '^https?://[^\s]{3,500}$'),
  link_label text,

  -- Prioridad. Mayor primero: subir un anuncio no obliga a reordenar el resto.
  sort_order integer not null default 0,

  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,

  created_at timestamptz not null default now(),
  created_by uuid default app.current_app_user_id() references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_users(id) on delete set null,

  constraint announcements_title_no_vacio check (length(btrim(title)) between 1 and 160),
  constraint announcements_resumen_corto check (summary is null or length(summary) <= 300),
  constraint announcements_vigencia check (expires_at is null or expires_at > published_at)
);

comment on table public.announcements is
  'V4.1: anuncios públicos del gimnasio (panfletos de clases, eventos, promociones). Capacidad genérica: la enciende cualquier tenant con enableAnnouncements.';
comment on column public.announcements.summary is
  'Texto de la tarjeta del carrusel. El contenido completo va en body y se ve en el detalle.';
comment on column public.announcements.sort_order is
  'Prioridad: mayor primero. Empates, por published_at descendente.';

-- `tenant_id` primero, como toda tabla de negocio. El índice sirve al listado
-- del panel (todo el gimnasio, por prioridad) y al de la vitrina.
create index if not exists announcements_tenant_orden_idx
  on public.announcements (tenant_id, sort_order desc, published_at desc);

-- El índice de la vitrina: parcial sobre lo activo, que es lo único que el
-- anónimo puede llegar a leer.
create index if not exists announcements_publicos_idx
  on public.announcements (tenant_slug, sort_order desc, published_at desc)
  where is_active;

-- ---------------------------------------------------------------- 3. disparadores

create or replace function app.preparar_anuncio()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- El slug NO llega del formulario: se deriva del gimnasio de la fila, que a
  -- su vez lo impone RLS. Así el filtro público no puede apuntar a otro tenant.
  select t.slug into new.tenant_slug from public.tenants t where t.id = new.tenant_id;

  new.title := btrim(new.title);
  new.summary := nullif(btrim(coalesce(new.summary, '')), '');
  new.body := nullif(btrim(coalesce(new.body, '')), '');
  new.image_alt := nullif(btrim(coalesce(new.image_alt, '')), '');
  new.link_label := nullif(btrim(coalesce(new.link_label, '')), '');
  new.link_url := nullif(btrim(coalesce(new.link_url, '')), '');

  -- Un enlace sin rótulo se muestra igual; un rótulo sin enlace sería un botón
  -- que no lleva a ninguna parte.
  if new.link_url is null then
    new.link_label := null;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := app.current_app_user_id();
    -- Quién y cuándo lo creó no se reescribe desde la API.
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;

  return new;
end;
$$;

revoke all on function app.preparar_anuncio() from public, anon, authenticated;

drop trigger if exists preparar_anuncio on public.announcements;
create trigger preparar_anuncio
  before insert or update on public.announcements
  for each row execute function app.preparar_anuncio();

-- Constancia en la bitácora, como las sedes: el resumen de Administración ya
-- lee `audit_log` y así los anuncios aparecen ahí sin tocar esa pantalla.
create or replace function app.auditar_anuncio()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.audit_log (tenant_id, action, entity, entity_id, metadata)
  values (
    new.tenant_id,
    case when tg_op = 'INSERT' then 'announcement.created' else 'announcement.updated' end,
    'announcement',
    -- `audit_log.entity_id` es texto: la bitácora guarda identificadores de
    -- entidades de tipos distintos, no solo uuid.
    new.id::text,
    jsonb_build_object('title', new.title, 'kind', new.kind, 'is_active', new.is_active)
  );
  return null;
end;
$$;

revoke all on function app.auditar_anuncio() from public, anon, authenticated;

drop trigger if exists auditar_anuncio on public.announcements;
create trigger auditar_anuncio
  after insert or update on public.announcements
  for each row execute function app.auditar_anuncio();

-- ---------------------------------------------------------------- 4. RLS

alter table public.announcements enable row level security;

-- Cualquier cuenta del gimnasio ve sus anuncios, publicados o no: el calendario
-- de clases funciona igual (V3.3). Lo que decide quién PUBLICA es content.manage.
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (tenant_id = (select app.current_tenant_id()));

-- El anónimo ve SOLO lo activo, ya publicado y no vencido. Un borrador o un
-- anuncio programado para el mes que viene no existe para la vitrina.
drop policy if exists announcements_select_publico on public.announcements;
create policy announcements_select_publico on public.announcements
  for select to anon
  using (
    is_active
    and published_at <= now()
    and (expires_at is null or expires_at > now())
  );

drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements
  for insert to authenticated
  with check (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('content.manage'))
  );

drop policy if exists announcements_update on public.announcements;
create policy announcements_update on public.announcements
  for update to authenticated
  using (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('content.manage'))
  )
  with check (
    tenant_id = (select app.current_tenant_id())
    and (select app.has_permission('content.manage'))
  );

-- Sin política de DELETE a propósito: un anuncio retirado se desactiva. Tiene
-- historia (quedó en la bitácora y pudo llevar tráfico) y borrarlo deja huérfana
-- su imagen en Storage.

-- ---------------------------------------------------------------- 5. grants por columna

revoke all on public.announcements from anon, authenticated;

-- El anónimo lee lo que se pinta en la vitrina. Nada de autoría ni de tiempos
-- de edición: no son suyos y no los necesita.
grant select (
  id, tenant_slug, title, summary, body, image_path, image_alt,
  kind, link_url, link_label, sort_order, is_active, published_at, expires_at
) on public.announcements to anon;

grant select on public.announcements to authenticated;

-- `tenant_slug`, autoría y tiempos NO se conceden: los pone el disparador.
grant insert (
  tenant_id, title, summary, body, image_path, image_alt,
  kind, link_url, link_label, sort_order, is_active, published_at, expires_at
) on public.announcements to authenticated;

grant update (
  title, summary, body, image_path, image_alt,
  kind, link_url, link_label, sort_order, is_active, published_at, expires_at
) on public.announcements to authenticated;

-- ---------------------------------------------------------------- 6. Storage

-- Arte de los anuncios. Público de lectura, como `qr-pagos`: es lo que se
-- enseña en la portada, y una URL firmada por anuncio obligaría a renderizar la
-- vitrina con sesión (la sacaría del CDN).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anuncios', 'anuncios', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists anuncios_leer on storage.objects;
create policy anuncios_leer on storage.objects
  for select to authenticated
  using (bucket_id = 'anuncios');

-- La ruta empieza por el id del gimnasio y de ahí sale el tenant: subir a la
-- carpeta de otro gimnasio no pasa la comprobación aunque se tenga el permiso.
drop policy if exists anuncios_subir on storage.objects;
create policy anuncios_subir on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anuncios'
    and app.tenant_de_ruta(name) = (select app.current_tenant_id())
    and (select app.has_permission('content.manage'))
  );

drop policy if exists anuncios_borrar on storage.objects;
create policy anuncios_borrar on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anuncios'
    and app.tenant_de_ruta(name) = (select app.current_tenant_id())
    and (select app.has_permission('content.manage'))
  );

-- ---------------------------------------------------------------- 7. vista de vitrina

-- Lo publicado y vigente, ya ordenado. Existe para que la vitrina no repita la
-- regla de «qué está publicado» en el adaptador: si mañana cambia (por ejemplo,
-- programar por hora del gimnasio), cambia aquí y no en cada consumidor.
create or replace view public.v_announcements_public
with (security_invoker = true) as
select
  a.id,
  a.tenant_slug,
  a.title,
  a.summary,
  a.body,
  a.image_path,
  a.image_alt,
  a.kind,
  a.link_url,
  a.link_label,
  a.sort_order,
  a.published_at
from public.announcements a
where a.is_active
  and a.published_at <= now()
  and (a.expires_at is null or a.expires_at > now())
order by a.sort_order desc, a.published_at desc;

comment on view public.v_announcements_public is
  'V4.1: anuncios publicados y vigentes para la vitrina. security_invoker: el anónimo pasa por announcements_select_publico.';

grant select on public.v_announcements_public to anon, authenticated;
