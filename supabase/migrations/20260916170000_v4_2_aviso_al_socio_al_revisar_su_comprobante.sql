-- V4.2 · El socio recibe un aviso cuando se revisa su comprobante.
--
-- POR QUÉ. Hasta aquí el resultado de la revisión solo se veía entrando a «Mis
-- comprobantes» del panel: quien pagaba por QR no se enteraba de un rechazo
-- (importe menor, captura ilegible) hasta que volvía a mirar. Ahora la base deja
-- un aviso personal en su bandeja —la misma de las reservas, con marca de leído—.
--
-- CÓMO. Un disparador AFTER UPDATE sobre `payment_receipts`: solo cuando el
-- estado pasa de `pendiente` a `aprobado` o `rechazado`, que es exactamente lo
-- que hace `revisar_comprobante` (y lo único que permite `sellar_comprobante_revisado`).
-- Escribe con `app.avisar_al_socio`, la misma función DEFINER de V3.4: quien
-- revisa no tiene INSERT sobre `customer_messages`, ni debe tenerlo.
-- El texto sale de la fila revisada, nunca de un formulario.

alter table public.customer_messages drop constraint mensajes_tipo;
alter table public.customer_messages
  add constraint mensajes_tipo check (kind = any (array[
    'reserva_promovida', 'reserva_cancelada_por_gimnasio', 'reservas_bloqueadas', 'inasistencia_justificada',
    'comprobante_aprobado', 'comprobante_rechazado'
  ]));

create or replace function app.avisar_revision_de_comprobante()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_plan text;
  v_importe text;
begin
  if old.status::text <> 'pendiente' or new.status::text not in ('aprobado', 'rechazado') then
    return new;
  end if;

  select mp.name into v_plan from public.membership_plans mp where mp.id = new.plan_id and mp.tenant_id = new.tenant_id;
  -- «Bs 150» y no «BOB 150.00»: es un aviso para una persona, no un asiento.
  v_importe := case when new.currency = 'BOB' then 'Bs' else new.currency end || ' '
    || regexp_replace(to_char(coalesce(new.verified_amount, new.amount), 'FM999999990.00'), '\.00$', '');

  if new.status::text = 'aprobado' then
    perform app.avisar_al_socio(
      new.tenant_id, new.customer_id, 'comprobante_aprobado',
      'Tu comprobante fue aprobado',
      case when v_plan is null
        then format('Recepción aprobó tu pago de %s. Ya quedó registrado.', v_importe)
        else format('Recepción aprobó tu pago de %s del %s. Tu membresía ya está activa.', v_importe, v_plan)
      end,
      null);
  else
    perform app.avisar_al_socio(
      new.tenant_id, new.customer_id, 'comprobante_rechazado',
      'Tu comprobante fue rechazado',
      format('Recepción no pudo aprobar tu comprobante%s. Motivo: %s. Corrígelo y vuelve a subirlo desde tu panel, o consulta en recepción.',
        case when v_plan is null then '' else ' del ' || v_plan end,
        coalesce(nullif(btrim(new.review_note), ''), 'sin detalle')),
      null);
  end if;

  return new;
end;
$$;

revoke all on function app.avisar_revision_de_comprobante() from public;

create trigger payment_receipts_avisar_revision
  after update of status on public.payment_receipts
  for each row execute function app.avisar_revision_de_comprobante();
