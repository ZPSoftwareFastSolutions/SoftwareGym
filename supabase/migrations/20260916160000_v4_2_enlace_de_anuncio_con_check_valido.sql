-- V4.2 · El enlace de un anuncio nunca se pudo guardar.
--
-- CAUSA. `announcements_link_url_check` (V4.1) era `link_url ~ '^https?://[^\s]{3,500}$'`.
-- El motor de expresiones regulares de PostgreSQL no admite un límite de
-- repetición mayor que 255 (RE_DUP_MAX): la expresión no compila y el CHECK
-- lanza 2201B «invalid repetition count(s)» con CUALQUIER valor no nulo. Con
-- `link_url` vacío el CHECK no llega a evaluar la expresión, por eso nadie lo vio:
-- todos los anuncios se habían guardado sin enlace. Lo encontró la primera
-- escritura real de un enlace.
--
-- ARREGLO. La misma regla, escrita de forma que compile: http/https, sin espacios,
-- al menos 3 caracteres tras el esquema y 500 como máximo (medido con length).

alter table public.announcements drop constraint announcements_link_url_check;

alter table public.announcements
  add constraint announcements_link_url_check check (
    link_url is null
    or (link_url ~ '^https?://[^\s]{3,}$' and length(link_url) <= length('https://') + 500)
  );
