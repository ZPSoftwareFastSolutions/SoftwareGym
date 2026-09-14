-- =============================================================================
-- V4 · CORRECCIÓN — `cambiar_estado_de_cuenta` no escribe `updated_at`
-- =============================================================================
--
-- ENCONTRADO POR LA BATERÍA V4 (bloques 3 y 4): «Suspender» y «Reactivar» fallaban
-- siempre con «permission denied for table app_users», también para
-- Administración sobre una cuenta que sí podía administrar.
--
-- CAUSA. La RPC hacía `set status = …, updated_at = now()`. A `authenticated` solo
-- se le concede UPDATE de `customer_id`, `full_name` y `status` en `app_users`
-- (V3.1): nombrar otra columna en el SET exige su privilegio aunque el valor lo
-- fuera a pisar un disparador. Es la misma lección de V3.2 con `source` en
-- `marcar_ejercicio`: una RPC invocador no nombra columnas que el cliente no
-- puede escribir.
--
-- CORRECCIÓN. Solo `status`; `app_users_touch_updated_at` ya pone la fecha.
-- =============================================================================

create or replace function public.cambiar_estado_de_cuenta(p_usuario uuid, p_activa boolean)
returns void
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_cambiadas integer;
begin
  if not app.has_permission('users.manage') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_usuario = app.current_app_user_id() then
    raise exception 'cuenta_propia';
  end if;

  update public.app_users
  set status = case when p_activa then 'active'::public.user_status else 'suspended'::public.user_status end
  where id = p_usuario;
  get diagnostics v_cambiadas = row_count;

  -- Cero filas: de otro gimnasio o de nivel igual o superior (según quién
  -- pregunta). La misma respuesta para las dos.
  if v_cambiadas = 0 then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
end;
$$;
