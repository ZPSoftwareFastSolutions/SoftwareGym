-- V4.2 · Complementos del alta online.
--
-- 1. `public.mi_ficha_sin_pago_aprobado()`: el panel del socio pregunta con la
--    MISMA regla que usa la base para negar la entrada (`app.ficha_propia_sin_membresia`)
--    si su QR ya sirve. Solo responde sobre la ficha de la propia sesión.
-- 2. Al vincular cuenta y ficha, la cuenta toma el nombre de la ficha si todavía
--    tiene el nombre por defecto (la parte local del correo). Un socio dado de
--    alta en recepción que activa su cuenta web no aparece como «mario.perez».

create or replace function public.mi_ficha_sin_pago_aprobado()
returns boolean
language sql
stable
security invoker
set search_path to ''
as $$
  select case
    when app.current_customer_id() is null then null
    else app.ficha_propia_sin_membresia(app.current_customer_id())
  end
$$;

revoke all on function public.mi_ficha_sin_pago_aprobado() from public, anon;
grant execute on function public.mi_ficha_sin_pago_aprobado() to authenticated;

create or replace function app._enlazar_cuenta_y_ficha(p_app_user uuid, p_customer uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.app_users u
  set customer_id = p_customer,
      full_name = case
        when lower(btrim(u.full_name)) = lower(split_part(u.email, '@', 1))
          then coalesce(
            nullif(btrim(
              (select c.first_name || ' ' || case when c.last_name = '(por completar)' then '' else c.last_name end
               from public.customers c where c.id = p_customer)
            ), ''),
            u.full_name)
        else u.full_name
      end,
      updated_at = now()
  where u.id = p_app_user
    and u.customer_id is null
    and not exists (select 1 from public.app_users o where o.customer_id = p_customer);
  return found;
end;
$$;
