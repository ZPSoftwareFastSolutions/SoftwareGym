-- =====================================================================
-- Pruebas de seguridad e integridad · Cobro por QR (V3.0)
--
-- Se ejecuta completo (SQL Editor de Supabase o MCP `execute_sql`). NO deja
-- rastro: la excepción final revierte todo y devuelve el resultado en el
-- mensaje de error. Resultado esperado al final del archivo.
--
-- Cubre: quién administra QR (gerencia sí; recepción, socio, super admin y
-- anónimo no), aislamiento entre gimnasios (QR, planes y rutas ajenas), e
-- integridad del importe (180/179/181, bypass por UPDATE directo, pago de otro
-- socio, pago reutilizado, columnas no escribibles, venta y alta por QR).
-- Ids literales resueltos ANTES de cambiar de rol (CLAUDE.md §9.2).
-- =====================================================================
do $$
declare
  r text := ''; n int; v text; j jsonb;
  t_mit uuid := '4b79e41f-6d51-407a-a16f-bce8b000b50c';
  t_aur uuid := 'c2f30bc2-b509-4f96-bc8e-b6fcaaab3488';
  p_fit uuid := '5c92de8b-3b68-4b07-9d73-00af67373788';       -- Mítico, Bs 180
  p_aur uuid := '88dcc941-ef63-4019-a68e-24cbf407dbbd';       -- Aurora, Bs 320
  s_ger text := '758b1b40-4e4a-4fee-9bbd-750d03b05f5a';
  s_rec text := 'fcef6ed7-6aad-42a5-b543-969eb2acaf81';
  s_juan text := 'a370ad78-0725-4fdc-a8d2-2b1e5b3625d1';
  s_adm text := '4e5d445a-cf7e-4043-a7e4-78d130afd4af';
  c_juan uuid := 'bdd26a0b-058d-4b84-a488-0c8df66a7a86';
  c_diego uuid := '18d4b8f7-8d00-4209-bd1b-132fe0880718';
  q_aur uuid; rc1 uuid; rc2 uuid; rc3 uuid; pago1 uuid; pago_otro uuid; pago_bs1 uuid;
begin
  -- Un QR de Aurora creado como propietario, para intentar tocarlo desde Mítico.
  insert into payment_qr_codes (tenant_id, plan_id, qr_path, amount_mode)
  values (t_aur, null, t_aur::text || '/qr-prueba.png', 'libre') returning id into q_aur;

  -- ===== Gerencia de Mítico =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_ger, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin perform guardar_ajustes_de_cobro('Mítico Fitness', 'Banco Unión', null, 'por_plan'); r := r || 'A1.ger_ajustes=ok | ';
  exception when others then r := r || format('A1.ger_ajustes=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin perform guardar_ajustes_de_cobro('Mítico Fitness', 'Banco Unión', 'otra nota', 'por_plan'); r := r || 'A1b.ger_ajustes_2da_vez=ok | ';
  exception when others then r := r || format('A1b.ger_ajustes_2da_vez=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin
    insert into tenant_payment_settings (tenant_id, holder) values (t_mit, 'X')
    on conflict (tenant_id) do update set tenant_id = excluded.tenant_id, holder = excluded.holder;
    r := r || 'A1c.upsert_con_tenant_id=ok(MAL) | ';
  exception when others then r := r || format('A1c.upsert_con_tenant_id=err(%s) | ', sqlstate); end;

  begin j := guardar_qr_de_cobro(null, t_mit::text || '/qr-general.png', 'libre', null, null); r := r || 'A2.ger_qr_general=ok | ';
  exception when others then r := r || format('A2.ger_qr_general=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin j := guardar_qr_de_cobro(p_fit, t_mit::text || '/plan-fit.png', 'exacto', 180, '2030-01-01'); r := r || 'A3.ger_qr_plan_exacto=ok | ';
  exception when others then r := r || format('A3.ger_qr_plan_exacto=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin j := guardar_qr_de_cobro(p_fit, t_mit::text || '/plan-fit-2.png', 'libre', null, null);
    r := r || format('A3b.ger_reemplaza_qr_plan=ok(anterior=%s) | ', j ->> 'qr_path_anterior');
  exception when others then r := r || format('A3b.ger_reemplaza=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin j := guardar_qr_de_cobro(p_fit, null, 'exacto', 179, null); r := r || 'A4.exacto_179=ok(MAL) | ';
  exception when others then r := r || format('A4.exacto_179=err(%s) | ', sqlerrm); end;
  begin j := guardar_qr_de_cobro(null, null, 'exacto', 180, null); r := r || 'A5.general_exacto=ok(MAL) | ';
  exception when others then r := r || format('A5.general_exacto=err(%s) | ', sqlerrm); end;
  begin j := guardar_qr_de_cobro(p_aur, t_mit::text || '/x.png', 'libre', null, null); r := r || 'A6.plan_ajeno=ok(MAL) | ';
  exception when others then r := r || format('A6.plan_ajeno=err(%s) | ', sqlerrm); end;
  begin j := guardar_qr_de_cobro(null, t_aur::text || '/x.png', 'libre', null, null); r := r || 'A7.ruta_ajena=ok(MAL) | ';
  exception when others then r := r || format('A7.ruta_ajena=err(%s) | ', sqlerrm); end;

  begin insert into payment_qr_codes (tenant_id, plan_id, qr_path) values (t_aur, p_aur, t_aur::text || '/y.png'); r := r || 'A8.insert_en_aurora=ok(MAL) | ';
  exception when others then r := r || format('A8.insert_en_aurora=err(%s) | ', sqlstate); end;
  update payment_qr_codes set expires_on = '2000-01-01' where id = q_aur; get diagnostics n = row_count; r := r || format('A8b.update_qr_aurora=%s | ', n);
  delete from payment_qr_codes where id = q_aur; get diagnostics n = row_count; r := r || format('A8c.delete_qr_aurora=%s | ', n);
  begin perform eliminar_qr_de_cobro(q_aur); r := r || 'A8d.rpc_eliminar_aurora=ok(MAL) | ';
  exception when others then r := r || format('A8d.rpc_eliminar_aurora=err(%s) | ', sqlerrm); end;
  select count(*) into n from payment_qr_codes where tenant_id = t_aur; r := r || format('A8e.ger_lee_qr_aurora=%s | ', n);
  begin insert into payment_qr_codes (tenant_id, plan_id, qr_path) values (t_mit, p_aur, t_mit::text || '/z.png'); r := r || 'A9.plan_aurora_en_mitico=ok(MAL) | ';
  exception when others then r := r || format('A9.plan_aurora_en_mitico=err(%s) | ', sqlstate); end;
  begin update payment_qr_codes set tenant_id = t_aur where tenant_id = t_mit; r := r || 'A10.mover_tenant=ok(MAL) | ';
  exception when others then r := r || format('A10.mover_tenant=err(%s) | ', sqlstate); end;
  select string_agg(coalesce(plan_id::text, 'general') || ':' || amount_mode, ',') into v from payment_qr_codes where tenant_id = t_mit;
  r := r || 'A11.qrs_mitico=' || coalesce(v, '∅') || ' | ';

  -- ===== Recepción =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_rec, 'role', 'authenticated')::text, true);
  begin perform guardar_ajustes_de_cobro('X', null, null, 'global'); r := r || 'B1.rec_ajustes=ok(MAL) | ';
  exception when others then r := r || format('B1.rec_ajustes=err(%s) | ', sqlerrm); end;
  begin j := guardar_qr_de_cobro(null, t_mit::text || '/r.png', 'libre', null, null); r := r || 'B2.rec_qr=ok(MAL) | ';
  exception when others then r := r || format('B2.rec_qr=err(%s) | ', sqlerrm); end;
  begin insert into payment_qr_codes (tenant_id, plan_id, qr_path) values (t_mit, p_fit, t_mit::text || '/r2.png'); r := r || 'B3.rec_insert=ok(MAL) | ';
  exception when others then r := r || format('B3.rec_insert=err(%s) | ', sqlstate); end;
  update payment_qr_codes set expires_on = '2000-01-01' where tenant_id = t_mit; get diagnostics n = row_count; r := r || format('B4.rec_update=%s | ', n);
  delete from payment_qr_codes where tenant_id = t_mit; get diagnostics n = row_count; r := r || format('B5.rec_delete=%s | ', n);
  begin
    insert into tenant_payment_settings (tenant_id, holder) values (t_mit, 'X')
    on conflict (tenant_id) do update set holder = excluded.holder;
    r := r || 'B6.rec_ajustes_directo=ok(MAL) | ';
  exception when others then r := r || format('B6.rec_ajustes_directo=err(%s) | ', sqlstate); end;

  -- ===== Socio =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_juan, 'role', 'authenticated')::text, true);
  begin perform guardar_ajustes_de_cobro('X', null, null, 'global'); r := r || 'C1.socio_ajustes=ok(MAL) | ';
  exception when others then r := r || format('C1.socio_ajustes=err(%s) | ', sqlerrm); end;
  begin j := guardar_qr_de_cobro(null, t_mit::text || '/s.png', 'libre', null, null); r := r || 'C2.socio_qr=ok(MAL) | ';
  exception when others then r := r || format('C2.socio_qr=err(%s) | ', sqlerrm); end;
  update payment_qr_codes set expires_on = '2000-01-01' where tenant_id = t_mit; get diagnostics n = row_count; r := r || format('C3.socio_update=%s | ', n);

  -- ===== Super admin (plataforma, sin gimnasio ni settings.manage) =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_adm, 'role', 'authenticated')::text, true);
  begin perform guardar_ajustes_de_cobro('X', null, null, 'global'); r := r || 'D1.admin_ajustes=ok(MAL) | ';
  exception when others then r := r || format('D1.admin_ajustes=err(%s) | ', sqlerrm); end;
  begin insert into payment_qr_codes (tenant_id, qr_path) values (t_mit, t_mit::text || '/a.png'); r := r || 'D2.admin_insert=ok(MAL) | ';
  exception when others then r := r || format('D2.admin_insert=err(%s) | ', sqlstate); end;

  -- ===== Anónimo =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  select count(*) into n from payment_qr_codes where tenant_slug = 'mitico'; r := r || format('E1.anon_lee_qr_publicos=%s | ', n);
  begin insert into payment_qr_codes (tenant_id, qr_path) values (t_mit, t_mit::text || '/anon.png'); r := r || 'E2.anon_insert=ok(MAL) | ';
  exception when others then r := r || format('E2.anon_insert=err(%s) | ', sqlstate); end;
  begin perform guardar_ajustes_de_cobro('X', null, null, 'global'); r := r || 'E3.anon_rpc=ok(MAL) | ';
  exception when others then r := r || format('E3.anon_rpc=err(%s) | ', sqlstate); end;
  select count(*) into n from membership_plans where code = 'fit'; r := r || format('E4.anon_lee_plan_publico=%s | ', n);
  begin select count(description) into n from membership_plans; r := r || 'E5.anon_description=ok(MAL) | ';
  exception when others then r := r || format('E5.anon_description=err(%s) | ', sqlstate); end;
  select qr_mode into v from tenant_payment_settings where tenant_slug = 'mitico'; r := r || 'E6.anon_modo=' || coalesce(v, '∅') || ' | ';

  -- ===== Importe: socio sube comprobantes =====
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', s_juan, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into payment_receipts (tenant_id, customer_id, plan_id, amount, source, storage_path, mime_type, size_bytes)
    values (t_mit, c_juan, p_fit, 179, 'socio', t_mit::text || '/' || c_juan::text || '/p179.png', 'image/png', 100);
    r := r || 'F1.socio_sube_179=ok(MAL) | ';
  exception when others then r := r || format('F1.socio_sube_179=err(%s) | ', sqlerrm); end;
  begin
    insert into payment_receipts (tenant_id, customer_id, plan_id, amount, currency, source, storage_path, mime_type, size_bytes)
    values (t_mit, c_juan, p_fit, 180, 'USD', 'socio', t_mit::text || '/' || c_juan::text || '/p180.png', 'image/png', 100)
    returning id into rc1;
    select expected_amount || ' ' || currency into v from payment_receipts where id = rc1;
    r := r || 'F2.socio_sube_180=ok(esperado=' || v || ') | ';
  exception when others then r := r || format('F2.socio_sube_180=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin
    insert into payment_receipts (tenant_id, customer_id, plan_id, amount, source, storage_path, mime_type, size_bytes)
    values (t_mit, c_juan, p_aur, 400, 'socio', t_mit::text || '/' || c_juan::text || '/paur.png', 'image/png', 100);
    r := r || 'F3.socio_plan_aurora=ok(MAL) | ';
  exception when others then r := r || format('F3.socio_plan_aurora=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin
    insert into payment_receipts (tenant_id, customer_id, plan_id, amount, expected_amount, source, storage_path, mime_type, size_bytes)
    values (t_mit, c_juan, p_fit, 10, 5, 'socio', t_mit::text || '/' || c_juan::text || '/pexp.png', 'image/png', 100);
    r := r || 'F4.socio_fija_esperado=ok(MAL) | ';
  exception when others then r := r || format('F4.socio_fija_esperado=err(%s) | ', sqlstate); end;

  -- ===== Importe: recepción revisa =====
  perform set_config('request.jwt.claims', json_build_object('sub', s_rec, 'role', 'authenticated')::text, true);
  begin j := revisar_comprobante(rc1, true, null, 179); r := r || 'G1.aprobar_verificado_179=ok(MAL) | ';
  exception when others then r := r || format('G1.aprobar_verificado_179=err(%s) | ', sqlerrm); end;
  begin j := revisar_comprobante(rc1, true, null, 181);
    select verified_amount::text || '/' || (select amount from payments where id = payment_receipts.payment_id)::text into v from payment_receipts where id = rc1;
    pago1 := (j ->> 'payment_id')::uuid;
    r := r || 'G2.aprobar_181=ok(verificado/pago=' || v || ') | ';
  exception when others then r := r || format('G2.aprobar_181=err(%s %s) | ', sqlstate, sqlerrm); end;

  -- Bypass: pago de Bs 1 y UPDATE directo del comprobante, sin la RPC
  insert into payment_receipts (tenant_id, customer_id, plan_id, amount, source, storage_path, mime_type, size_bytes)
  values (t_mit, c_diego, p_fit, 180, 'recepcion', t_mit::text || '/' || c_diego::text || '/d180.png', 'image/png', 100)
  returning id into rc2;
  insert into payments (tenant_id, customer_id, amount, method) values (t_mit, c_diego, 1, 'qr') returning id into pago_bs1;
  begin
    update payment_receipts set status = 'aprobado', payment_id = pago_bs1, reviewed_at = now() where id = rc2;
    r := r || 'G3.bypass_pago_bs1=ok(MAL) | ';
  exception when others then r := r || format('G3.bypass_pago_bs1=err(%s) | ', sqlerrm); end;
  insert into payments (tenant_id, customer_id, amount, method) values (t_mit, c_juan, 500, 'qr') returning id into pago_otro;
  begin
    update payment_receipts set status = 'aprobado', payment_id = pago_otro, reviewed_at = now() where id = rc2;
    r := r || 'G4.bypass_pago_de_otro_socio=ok(MAL) | ';
  exception when others then r := r || format('G4.bypass_pago_de_otro_socio=err(%s) | ', sqlerrm); end;
  begin update payment_receipts set amount = 1 where id = rc2; r := r || 'G5.cambiar_importe=ok(MAL) | ';
  exception when others then r := r || format('G5.cambiar_importe=err(%s) | ', sqlstate); end;
  -- Reutilizar el pago ya usado por otro comprobante del mismo socio
  insert into payment_receipts (tenant_id, customer_id, plan_id, amount, source, storage_path, mime_type, size_bytes)
  values (t_mit, c_juan, p_fit, 180, 'recepcion', t_mit::text || '/' || c_juan::text || '/j2.png', 'image/png', 100)
  returning id into rc3;
  begin
    update payment_receipts set status = 'aprobado', payment_id = pago1, reviewed_at = now() where id = rc3;
    r := r || 'G6.reutilizar_pago=ok(MAL) | ';
  exception when others then r := r || format('G6.reutilizar_pago=err(%s) | ', sqlstate); end;
  begin j := revisar_comprobante(rc2, true, null, 180); r := r || format('G7.aprobar_180_exacto=ok(importe=%s) | ', j ->> 'importe');
  exception when others then r := r || format('G7.aprobar_180_exacto=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin j := revisar_comprobante(rc3, true, null, null); r := r || format('G8.aprobar_sin_verificado_usa_declarado=ok(importe=%s) | ', j ->> 'importe');
  exception when others then r := r || format('G8.aprobar_sin_verificado=err(%s %s) | ', sqlstate, sqlerrm); end;

  -- ===== Venta y alta por QR =====
  begin j := vender_membresia(c_diego, p_fit, null, 'qr', 179, null); r := r || 'H1.venta_qr_179=ok(MAL) | ';
  exception when others then r := r || format('H1.venta_qr_179=err(%s) | ', sqlerrm); end;
  begin j := vender_membresia(c_diego, p_fit, null, 'qr', 180, null); r := r || 'H2.venta_qr_180=ok | ';
  exception when others then r := r || format('H2.venta_qr_180=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin j := vender_membresia(c_diego, p_fit, null, 'cash', 150, null); r := r || 'H3.venta_efectivo_150=ok | ';
  exception when others then r := r || format('H3.venta_efectivo_150=err(%s %s) | ', sqlstate, sqlerrm); end;
  begin j := registrar_socio('Prueba', 'Qr', null, null, null, null, null, p_fit, null, 'qr', 100); r := r || 'H4.alta_qr_100=ok(MAL) | ';
  exception when others then r := r || format('H4.alta_qr_100=err(%s) | ', sqlerrm); end;

  -- ===== Histórico =====
  execute 'reset role';
  select string_agg(expected_amount || '/' || verified_amount, ',') into v from payment_receipts where id = '52b11c86-0309-47a7-a300-4972fc11ca77';
  r := r || 'I1.historico_esperado/verificado=' || coalesce(v, '∅');

  raise exception 'RESULTADO: %', r;
end $$;

-- Esperado (2026-09-11):
-- A1/A1b=ok · A1c=err(42501) · A2/A3=ok · A3b=ok(anterior=…/plan-fit.png) ·
-- A4=err(monto_exacto_distinto_al_precio) · A5=err(qr_general_exacto) ·
-- A6=err(plan_invalido) · A7=err(ruta_invalida) · A8=err(42501) · A8b=0 ·
-- A8c=0 · A8d=err(sin_permiso) · A8e=0 · A9=err(23503|42501) · A10=err(42501) ·
-- A11=general:libre,<plan>:libre · B1/B2=err(sin_permiso) · B3=err(42501) ·
-- B4=0 · B5=0 · B6=err(42501) · C1/C2=err(sin_permiso) · C3=0 ·
-- D1=err(sin_permiso) · D2=err(42501) · E1=2 · E2=err(42501) · E3=err(42501) ·
-- E4=1 · E5=err(42501) · E6=por_plan · F1=err(monto_insuficiente) ·
-- F2=ok(esperado=180.00 BOB) · F3=err(plan_invalido|42501) · F4=err(42501) ·
-- G1=err(monto_insuficiente) · G2=ok(verificado/pago=181.00/181.00) ·
-- G3=err(monto_insuficiente) · G4=err(pago_no_valido) · G5=err(42501) ·
-- G6=err(23505) · G7=ok(importe=180) · G8=ok(importe=180.00) ·
-- H1=err(monto_insuficiente) · H2=ok · H3=ok · H4=err(monto_insuficiente) ·
-- I1=25.00/25.00
