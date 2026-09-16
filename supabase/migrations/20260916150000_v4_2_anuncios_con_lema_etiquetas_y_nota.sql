-- V4.2 · Anuncios con lema, etiquetas y nota al pie.
--
-- POR QUÉ. La tarjeta destacada de la portada (estilo `anuncios`) enseña, además
-- del título y el resumen, una frase de impacto, una lista corta de etiquetas
-- («Clases incluidas: Ubound · Yoga…», «Categorías: Bikini · Wellness…») y una
-- nota breve al pie («Cupos limitados»). Hasta aquí eso solo cabía mezclado en el
-- resumen, y la tarjeta no lo podía componer.
--
-- QUÉ NO CAMBIA. Las cuatro columnas son opcionales: los anuncios existentes se
-- ven igual. Mismo modelo de acceso que el resto de la tabla: el anónimo LEE lo
-- publicado (la política no cambia), el personal con `content.manage` escribe.
-- Todo sigue siendo TEXTO, nunca marcado.

-- Etiquetas válidas: hasta 12, cada una entre 1 y 40 caracteres sin espacios en
-- los bordes. Un CHECK no admite subconsultas, así que la regla vive en una
-- función inmutable fuera de la API.
create or replace function app.etiquetas_de_anuncio_validas(p_etiquetas text[])
returns boolean
language sql
immutable
set search_path to ''
as $$
  select p_etiquetas is not null
     and coalesce(cardinality(p_etiquetas), 0) <= 12
     and not exists (
       select 1 from unnest(p_etiquetas) as e(valor)
       where e.valor is null or length(e.valor) < 1 or length(e.valor) > 40 or e.valor <> btrim(e.valor)
     )
$$;

alter table public.announcements
  add column tagline text,
  add column tags text[] not null default '{}',
  add column tags_label text,
  add column footnote text;

alter table public.announcements
  add constraint announcements_lema_corto check (tagline is null or (length(btrim(tagline)) between 1 and 120)),
  add constraint announcements_etiquetas_validas check (app.etiquetas_de_anuncio_validas(tags)),
  add constraint announcements_rotulo_de_etiquetas check (tags_label is null or (length(btrim(tags_label)) between 1 and 60)),
  add constraint announcements_nota_corta check (footnote is null or (length(btrim(footnote)) between 1 and 60));

-- Grants por columna, igual que las columnas de texto que ya existían.
grant select (tagline, tags, tags_label, footnote) on public.announcements to anon, authenticated;
grant insert (tagline, tags, tags_label, footnote) on public.announcements to authenticated;
grant update (tagline, tags, tags_label, footnote) on public.announcements to authenticated;

-- La vista pública gana las columnas AL FINAL (create or replace solo admite
-- añadir). Sigue siendo security_invoker: la política del anónimo decide.
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
  a.published_at,
  a.tagline,
  a.tags,
  a.tags_label,
  a.footnote
from public.announcements a
where a.is_active
  and a.published_at <= now()
  and (a.expires_at is null or a.expires_at > now())
order by a.sort_order desc, a.published_at desc;
