-- =============================================================================
-- V4.2 · CORRECCIÓN — la guarda de la foto solo aplica al propio socio
-- =============================================================================
--
-- LO ENCONTRÓ LA BATERÍA, no la lectura del código. Al sembrar datos de prueba
-- como superusuario, un simple
--
--     update customers set home_branch_id = ... where id = ...
--
-- reventó con `solo_la_foto`.
--
-- LA CAUSA. `app.socio_solo_cambia_su_foto` dejaba pasar a quien tuviera
-- `customers.update` y restringía a TODO el resto. Pero `app.has_permission`
-- se apoya en `auth.uid()`, que no existe fuera de una sesión autenticada: para
-- una migración, un `service_role` o cualquier mantenimiento por SQL devolvía
-- falso, y la guarda pensada para el socio acababa bloqueando al administrador
-- de la base.
--
-- LA CORRECCIÓN. La guarda se aplica solo a quien está editando SU PROPIA
-- ficha, que es el único caso para el que se escribió. Sin sesión no hay socio
-- que restringir y se deja pasar.
--
-- POR QUÉ SIGUE SIENDO SEGURO. La guarda no es lo que impide que un socio toque
-- la ficha de otro: eso lo hace RLS. `customers_update_self` solo deja tocar la
-- fila cuyo `id` coincide con `app.current_customer_id()`, y `customers_update`
-- exige `customers.update`. Quien llega hasta este disparador es, por fuerza,
-- o personal con permiso o el dueño de la fila. Lo único que añade la guarda es
-- que el dueño no pueda cambiarse el nombre, el documento ni el código
-- aprovechando la política que le dimos para la foto.
-- =============================================================================

create or replace function app.socio_solo_cambia_su_foto()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Sin sesión de aplicación no hay socio al que restringir: migraciones,
  -- mantenimiento y semillas pasan. RLS ya decidió quién llega hasta aquí.
  if app.current_app_user_id() is null then
    return new;
  end if;

  -- El personal edita la ficha entera, como siempre.
  if app.has_permission('customers.update') then
    return new;
  end if;

  -- Y solo se restringe a quien edita su PROPIA ficha, que es el caso para el
  -- que existe esta guarda.
  if app.current_customer_id() is distinct from old.id then
    return new;
  end if;

  -- Se compara la fila COMPLETA en JSON menos lo que sí puede cambiar, así que
  -- una columna nueva queda protegida sin tocar esta función.
  if (to_jsonb(new) - 'photo_url' - 'updated_at' - 'version')
     is distinct from
     (to_jsonb(old) - 'photo_url' - 'updated_at' - 'version') then
    raise exception 'solo_la_foto' using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all on function app.socio_solo_cambia_su_foto() from public, anon, authenticated;
