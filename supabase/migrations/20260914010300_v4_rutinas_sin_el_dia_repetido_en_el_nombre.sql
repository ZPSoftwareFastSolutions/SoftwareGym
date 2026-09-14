-- =============================================================================
-- V4 · RUTINAS — el día no se guarda dos veces
-- =============================================================================
--
-- SÍNTOMA. Las pantallas mostraban «Día A · Día A · Empuje» y
-- «Día 1 · Día 1 · Cuerpo completo A».
--
-- CAUSA (en los datos, no en el componente). Una rutina tiene dos campos:
-- `day_label` («Día A») y `name`. Las plantillas de demostración de V3.2 y V3.4
-- —y la ayuda del formulario, que sugería «Día A · Empuje» como nombre— guardaron
-- la etiqueta TAMBIÉN dentro del nombre. Las pantallas unen etiqueta y nombre, y
-- asignar una rutina COPIA el nombre al socio, así que la repetición viajó a las
-- 15 rutinas asignadas.
--
-- CORRECCIÓN.
-- 1. `app.nombre_sin_etiqueta_del_dia`: quita la etiqueta del principio del
--    nombre si le sigue un separador (« · », « - », «: », espacio…). «Día 1» no
--    se come a «Día 10»; si quitarla dejara el nombre con menos de 2 letras, se
--    conserva. Es la misma regla que `nombreSinEtiquetaDelDia` del dominio.
-- 2. Un disparador la aplica al guardar plantillas y rutinas asignadas: el dato
--    queda limpio aunque llegue de otra pantalla, de una RPC o de una semilla.
--    Se llama `zz_…` para correr DESPUÉS de `preparar_rutina`, que normaliza
--    espacios (los disparadores de una tabla corren por orden alfabético).
-- 3. Se limpian los datos existentes. La pantalla ya arma el título en un solo
--    sitio (`tituloDeRutina`), así que ni un dato viejo vuelve a duplicarse.
-- =============================================================================

create function app.nombre_sin_etiqueta_del_dia(p_nombre text, p_etiqueta text)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '[[:space:]]+', ' ', 'g'));
  v_etiqueta text := btrim(regexp_replace(coalesce(p_etiqueta, ''), '[[:space:]]+', ' ', 'g'));
  v_resto text;
  v_limpio text;
begin
  if v_etiqueta = '' then
    return v_nombre;
  end if;
  -- Mientras siga empezando por la etiqueta («Día 1 · Día 1 · Tirón» → «Tirón»).
  for vuelta in 1..5 loop
    exit when lower(left(v_nombre, length(v_etiqueta))) <> lower(v_etiqueta);
    v_resto := substr(v_nombre, length(v_etiqueta) + 1);
    -- Tras la etiqueta tiene que venir un separador: «Día 10» no empieza por «Día 1».
    exit when v_resto !~ '^[[:space:]·•*|:.,–—-]';
    v_limpio := btrim(regexp_replace(v_resto, '^[[:space:]·•*|:.,–—-]+', ''));
    exit when length(v_limpio) < 2;
    v_nombre := v_limpio;
  end loop;
  return v_nombre;
end;
$$;

create function app.rutina_sin_dia_en_el_nombre()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := app.nombre_sin_etiqueta_del_dia(new.name, new.day_label);
  return new;
end;
$$;

create trigger zz_rutina_sin_dia_en_el_nombre
  before insert or update of name, day_label on public.routines
  for each row execute function app.rutina_sin_dia_en_el_nombre();

create trigger zz_rutina_asignada_sin_dia_en_el_nombre
  before insert or update of name, day_label on public.customer_routines
  for each row execute function app.rutina_sin_dia_en_el_nombre();

-- Datos existentes. Solo cambia `name` (y los disparadores de actualización de
-- las tablas ponen `updated_at`), nada más de la rutina ni del progreso.
update public.routines
set name = app.nombre_sin_etiqueta_del_dia(name, day_label)
where name is distinct from app.nombre_sin_etiqueta_del_dia(name, day_label);

-- Las rutinas asignadas validan en cada UPDATE quién las toca (entrenador de ese
-- socio, gerencia); una migración no tiene sesión, así que esos disparadores se
-- apagan SOLO para esta corrección de texto, como en las semillas de V3.2.
alter table public.customer_routines disable trigger user;

update public.customer_routines
set name = app.nombre_sin_etiqueta_del_dia(name, day_label)
where name is distinct from app.nombre_sin_etiqueta_del_dia(name, day_label);

alter table public.customer_routines enable trigger user;
