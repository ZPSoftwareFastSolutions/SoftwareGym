-- =============================================================================
-- V4.2 · GOLD: historial de DEMOSTRACIÓN para probar la operación
-- =============================================================================
--
-- GOLD'S GYM PREMIUM tiene la operación encendida (asistencia, socios, cobros,
-- reportes) pero casi sin datos: dashboards, reportes, racha, «por vencer» e
-- historial de ingresos no se pueden revisar vacíos. Esta semilla deja un
-- historial coherente de junio a septiembre de 2026:
--
--   · 16 socios con ficha completa (documento, teléfono, nacimiento, sede de
--     origen), repartidos en las cuatro sucursales.
--   · Membresías de los planes REALES de GOLD, con renovaciones consecutivas
--     (empiezan el día siguiente al vencimiento, como `vender_membresia`),
--     vencidas, por vencer, una vuelta tras dejar de venir y planes largos.
--   · Un pago por membresía (efectivo, QR, transferencia, tarjeta) al precio
--     del plan; los pagos por QR llevan su comprobante APROBADO por recepción.
--     Además, dos comprobantes rechazados con motivo y dos pendientes.
--   · Entradas (`attendance_records`, una por socio y día, con sede y hora
--     local) dentro de la vigencia de cada membresía, y su pase de acceso
--     (`access_passes`). Algunos socios entrenan a veces en otra sede, uno
--     dejó de venir hace diez días y ninguna entrada queda en el futuro.
--
-- QUÉ NO ES: datos del cliente. Todo socio lleva el correo `@demo.gymplatform.bo`
-- y la nota «Datos de demostración». Para retirarlos basta con filtrar por ese
-- dominio. Los comprobantes no tienen imagen en Storage (no se puede subir un
-- archivo desde SQL): la bandeja muestra «Imagen no disponible».
--
-- ALCANCE: solo el gimnasio `golds-gym-premium`, resuelto por slug; ningún otro
-- gimnasio se lee ni se escribe. Idempotente: si ya existe un socio con el
-- dominio de demostración, no hace nada. Reproducible: `setseed` fija el azar.
--
-- DISPARADORES: `preparar_pase_de_acceso` fija la fecha y la hora del pase en
-- «ahora» (es lo correcto al escanear), así que se apaga SOLO durante esta
-- transacción para escribir pases históricos y se vuelve a encender al final.
-- Si algo falla, la transacción entera se revierte, también el ALTER.
-- =============================================================================

alter table public.access_passes disable trigger preparar_pase_de_acceso;

do $$
declare
  v_tenant uuid;
  v_tz text;
  v_ahora timestamptz := now();
  v_hoy date;
  v_recepcion uuid;
  v_sedes uuid[];
  v_numero int;
  v_nota constant text := 'Datos de demostración: historial sembrado para probar la operación de GOLD (V4.2). No es un socio real.';
  s record;
  v_plan record;
  v_cliente uuid;
  v_origen uuid;
  v_tramo text;
  v_codigo_plan text;
  v_inicio date;
  v_fin date;
  v_fin_anterior date;
  v_membresia uuid;
  v_pago uuid;
  v_recibo uuid;
  v_metodos text[];
  v_metodo public.payment_method;
  v_pagado timestamptz;
  v_indice int;
  v_recibos int := 0;
  v_fecha date;
  v_tope date;
  v_dia int;
  v_prob numeric;
  v_hora numeric;
  v_minimo numeric;
  v_maximo numeric;
  v_momento timestamptz;
  v_sede uuid;
  v_metodo_entrada public.attendance_method;
  v_socios int;
  v_desde date;
  v_hasta date;
begin
  select t.id, t.timezone into v_tenant, v_tz from public.tenants t where t.slug = 'golds-gym-premium';
  if v_tenant is null then
    raise notice 'GOLD no existe en esta base: no se siembra nada.';
    return;
  end if;
  if exists (select 1 from public.customers c where c.tenant_id = v_tenant and c.email like '%@demo.gymplatform.bo') then
    raise notice 'El historial de demostración de GOLD ya existe: no se repite.';
    return;
  end if;

  perform setseed(0.2026);
  v_hoy := (v_ahora at time zone v_tz)::date;

  select u.id into v_recepcion
  from public.app_users u
  join public.user_roles ur on ur.app_user_id = u.id
  join public.roles r on r.id = ur.role_id
  where u.tenant_id = v_tenant and r.code = 'receptionist' and u.status = 'active'
  order by u.created_at
  limit 1;

  select array_agg(b.id order by b.code) into v_sedes from public.branches b where b.tenant_id = v_tenant and b.is_active;

  select coalesce(max((regexp_match(c.code, '^GO-(\d+)$'))[1]::int), 0) into v_numero
  from public.customers c where c.tenant_id = v_tenant;

  -- planes: tramos separados por «|». «codigo@fecha» fija el inicio (alta o
  -- vuelta tras un hueco); «codigo» a secas renueva al día siguiente del
  -- vencimiento anterior. metodos: uno por tramo.
  for s in
    select * from (values
      ('Valeria',   'Mamani Quispe',     '6123401', '+591 71234501', date '1996-04-12', 'LAVITA',      0.70, 7.0,  0.05, 'normal@2026-06-02|normal|normal|normal',          'qr,cash,qr,transfer',    null::date),
      ('Diego',     'Choque Flores',     '6123402', '+591 71234502', date '1992-11-03', 'LAVITA',      0.60, 19.0, 0.10, 'trimestral@2026-06-05|normal',                    'transfer,qr',            null::date),
      ('Camila',    'Rojas Vargas',      '6123403', '+591 71234503', date '1999-09-24', 'GARITA',      0.55, 18.0, 0.05, 'aerobicos@2026-06-20|aerobicos|aerobicos',        'qr,qr,cash',             null::date),
      ('Luis',      'Condori Apaza',     '6123404', '+591 71234504', date '1988-02-17', 'ELALTO',      0.55, 8.0,  0.00, 'mananero@2026-06-10|mananero|mananero@2026-08-25', 'cash,cash,qr',           null::date),
      ('Andrea',    'Gutiérrez Salazar', '6123405', '+591 71234505', date '1994-07-30', 'CRUCEVILLAS', 0.65, 17.0, 0.08, 'semestral@2026-06-15',                            'card',                   null::date),
      ('Marco',     'Ticona Huanca',     '6123406', '+591 71234506', date '1990-05-09', 'ELALTO',      0.45, 20.0, 0.00, 'normal@2026-06-08',                               'cash',                   null::date),
      ('Natalia',   'Poma Limachi',      '6123407', '+591 71234507', date '1997-12-01', 'GARITA',      0.50, 12.5, 0.05, 'ejecutivo@2026-06-25|ejecutivo|ejecutivo',        'qr,transfer,qr',         null::date),
      ('Jorge',     'Quispe Mendoza',    '6123408', '+591 71234508', date '1985-03-22', 'LAVITA',      0.75, 7.3,  0.20, 'anual@2026-06-01',                                'transfer',               null::date),
      ('Paola',     'Alanoca Cruz',      '6123409', '+591 71234509', date '2000-01-15', 'CRUCEVILLAS', 0.50, 18.5, 0.05, 'normal@2026-07-15|normal',                        'cash,qr',                null::date),
      ('Rodrigo',   'Villca Nina',       '6123410', '+591 71234510', date '1993-08-08', 'GARITA',      0.60, 20.0, 0.10, 'trimestral@2026-07-01',                           'qr',                     date '2026-09-06'),
      ('Mariana',   'Huarachi López',    '6123411', '+591 71234511', date '1998-06-19', 'LAVITA',      0.60, 19.0, 0.05, 'aerobicos@2026-08-01|aerobicos',                  'qr,transfer',            null::date),
      ('Sergio',    'Callisaya Mamani',  '6123412', '+591 71234512', date '1991-10-27', 'ELALTO',      0.55, 20.5, 0.05, 'normal@2026-06-18|normal|normal',                 'cash,qr,cash',           null::date),
      ('Gabriela',  'Chura Ramos',       '6123413', '+591 71234513', date '1995-09-05', 'CRUCEVILLAS', 0.50, 9.0,  0.00, 'mananero@2026-07-20|mananero@2026-09-05',         'cash,qr',                null::date),
      ('Fernando',  'Tarqui Blanco',     '6123414', '+591 71234514', date '1987-01-11', 'LAVITA',      0.40, 13.0, 0.00, 'ejecutivo@2026-06-12',                            'card',                   null::date),
      ('Lucía',     'Apaza Coaquira',    '6123415', '+591 71234515', date '2001-09-14', 'GARITA',      0.65, 17.0, 0.05, 'normal@2026-08-20',                               'cash',                   null::date),
      ('Álvaro',    'Mendoza Soliz',     '6123416', '+591 71234516', date '1989-04-02', 'CRUCEVILLAS', 0.45, 18.0, 0.25, 'semestral@2026-06-03',                            'qr',                     null::date)
    ) as t(nombre, apellido, documento, telefono, nacimiento, sede, frecuencia, hora, cruce, planes, metodos, deja_de_venir)
  loop
    select b.id into v_origen from public.branches b where b.tenant_id = v_tenant and b.code = s.sede;
    if v_origen is null then
      raise exception 'La sede % de GOLD no existe', s.sede;
    end if;

    v_numero := v_numero + 1;
    v_cliente := gen_random_uuid();
    v_inicio := split_part(split_part(s.planes, '|', 1), '@', 2)::date;

    insert into public.customers (
      id, tenant_id, code, first_name, last_name, document_id, phone, email, birth_date,
      status, notes, home_branch_id, created_at
    ) values (
      v_cliente, v_tenant, 'GO-' || lpad(v_numero::text, 3, '0'), s.nombre, s.apellido, s.documento, s.telefono,
      lower(translate(split_part(s.nombre, ' ', 1) || '.' || split_part(s.apellido, ' ', 1), 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) || '@demo.gymplatform.bo',
      s.nacimiento, 'active', v_nota, v_origen,
      ((v_inicio + time '10:00') at time zone v_tz)
    );

    v_metodos := string_to_array(s.metodos, ',');
    v_fin_anterior := null;
    v_indice := 0;

    foreach v_tramo in array string_to_array(s.planes, '|') loop
      v_indice := v_indice + 1;
      v_codigo_plan := split_part(v_tramo, '@', 1);
      if position('@' in v_tramo) > 0 then
        v_inicio := split_part(v_tramo, '@', 2)::date;
      else
        v_inicio := v_fin_anterior + 1;
      end if;

      select mp.id, mp.price, mp.duration_days, mp.code into v_plan
      from public.membership_plans mp
      where mp.tenant_id = v_tenant and mp.code = v_codigo_plan and mp.is_active;
      if v_plan.id is null then
        raise exception 'El plan % de GOLD no existe', v_codigo_plan;
      end if;

      v_fin := v_inicio + v_plan.duration_days;
      v_metodo := coalesce(v_metodos[v_indice], 'cash')::public.payment_method;
      -- Quien renueva paga el último día de su membresía; quien entra, el primero.
      v_pagado := (((case when position('@' in v_tramo) > 0 then v_inicio else v_inicio - 1 end)
                    + time '09:30' + make_interval(mins => floor(random() * 600)::int)) at time zone v_tz);

      -- Por QR: primero el comprobante (así lo sube el socio o recepción) …
      v_recibo := null;
      if v_metodo = 'qr' then
        v_recibos := v_recibos + 1;
        v_recibo := gen_random_uuid();
        insert into public.payment_receipts (
          id, tenant_id, customer_id, plan_id, amount, currency, method, status, source,
          storage_path, mime_type, size_bytes, submitted_by, created_at
        ) values (
          v_recibo, v_tenant, v_cliente, v_plan.id, v_plan.price, 'BOB', 'qr', 'pendiente',
          (case when v_recibos % 2 = 0 then 'recepcion' else 'socio' end)::public.receipt_source,
          v_tenant::text || '/' || v_cliente::text || '/demo-historico-' || v_indice || '.jpg',
          'image/jpeg', 140000 + floor(random() * 90000)::int,
          case when v_recibos % 2 = 0 then v_recepcion end,
          v_pagado - interval '25 minutes'
        );
      end if;

      -- … después la membresía y el pago que la activa …
      v_membresia := gen_random_uuid();
      insert into public.memberships (id, tenant_id, customer_id, plan_id, start_date, end_date, status, price, currency, created_at)
      values (v_membresia, v_tenant, v_cliente, v_plan.id, v_inicio, v_fin,
              (case when v_fin < v_hoy then 'expired' else 'active' end)::public.membership_status,
              v_plan.price, 'BOB', v_pagado);

      v_pago := gen_random_uuid();
      insert into public.payments (id, tenant_id, customer_id, membership_id, amount, currency, method, paid_at, notes, idempotency_key, registered_by, created_at)
      values (v_pago, v_tenant, v_cliente, v_membresia, v_plan.price, 'BOB', v_metodo, v_pagado,
              case when v_recibo is not null then 'Comprobante de pago por QR revisado en recepción.' end,
              'demo-historico:' || v_cliente::text || ':' || v_indice, v_recepcion, v_pagado);

      -- … y la aprobación, como la haría `revisar_comprobante`.
      if v_recibo is not null then
        update public.payment_receipts
        set status = 'aprobado', payment_id = v_pago, membership_id = v_membresia,
            reviewed_by = v_recepcion, reviewed_at = v_pagado
        where id = v_recibo;
      end if;

      -- Entradas dentro de la vigencia, nunca en el futuro.
      v_tope := least(v_fin, v_hoy, coalesce(s.deja_de_venir, v_hoy));
      for v_fecha in select d::date from generate_series(v_inicio, v_tope, interval '1 day') as d loop
        v_dia := extract(isodow from v_fecha)::int;
        v_prob := s.frecuencia * case v_dia when 7 then 0.3 when 6 then 0.7 else 1 end;
        continue when random() >= v_prob;

        v_minimo := case v_dia when 7 then 7.2 when 6 then 8.2 else 7.1 end;
        v_maximo := case v_dia when 7 then 12.4 when 6 then 20.4 else 21.4 end;
        if v_plan.code = 'mananero' then
          v_maximo := least(v_maximo, 11.5);
        end if;
        v_hora := greatest(v_minimo, least(v_maximo, s.hora + random() * 1.5 - 0.5));
        v_momento := ((v_fecha + make_interval(secs => round(v_hora * 3600)::int)) at time zone v_tz);
        continue when v_momento >= v_ahora;

        v_sede := case when random() < s.cruce then v_sedes[1 + floor(random() * array_length(v_sedes, 1))::int] else v_origen end;
        v_metodo_entrada := (case when random() < 0.85 then 'qr' else 'manual' end)::public.attendance_method;

        insert into public.attendance_records (tenant_id, customer_id, branch_id, method, checked_in_at, registered_by, created_at)
        values (v_tenant, v_cliente, v_sede, v_metodo_entrada, v_momento, v_recepcion, v_momento)
        on conflict do nothing;

        insert into public.access_passes (tenant_id, customer_id, branch_id, pass_date, passed_at, pass_number, method, cross_branch, registered_by)
        values (v_tenant, v_cliente, v_sede, v_fecha, v_momento, 1, v_metodo_entrada, v_sede <> v_origen, v_recepcion);

        -- De vez en cuando sale y vuelve el mismo día (el tope diario es de 3).
        if random() < 0.06 and v_momento + interval '3 hours' < v_ahora and v_hora + 3 <= v_maximo then
          insert into public.access_passes (tenant_id, customer_id, branch_id, pass_date, passed_at, pass_number, method, cross_branch, registered_by)
          values (v_tenant, v_cliente, v_sede, v_fecha, v_momento + interval '3 hours', 2, v_metodo_entrada, v_sede <> v_origen, v_recepcion);
        end if;
      end loop;

      v_fin_anterior := v_fin;
    end loop;
  end loop;

  -- Comprobantes que no activaron nada: dos rechazados con su motivo …
  insert into public.payment_receipts (tenant_id, customer_id, plan_id, amount, currency, method, status, source, storage_path, mime_type, size_bytes, created_at)
  select v_tenant, c.id, mp.id, mp.price, 'BOB', 'qr', 'pendiente', 'socio',
         v_tenant::text || '/' || c.id::text || '/demo-historico-rechazado.jpg', 'image/jpeg', 98000,
         (x.subido at time zone v_tz)
  from (values
    ('6123403', 'aerobicos', timestamp '2026-08-19 21:40'),
    ('6123411', 'aerobicos', timestamp '2026-08-31 22:05')
  ) as x(documento, plan, subido)
  join public.customers c on c.tenant_id = v_tenant and c.document_id = x.documento
  join public.membership_plans mp on mp.tenant_id = v_tenant and mp.code = x.plan;

  update public.payment_receipts pr
  set status = 'rechazado', reviewed_by = v_recepcion, reviewed_at = pr.created_at + interval '14 hours',
      review_note = case c.document_id
        when '6123403' then 'La captura no deja leer el importe ni la fecha. Vuelve a subirla completa o paga en recepción.'
        else 'El pago no aparece en la cuenta del gimnasio. Consulta con tu banco o acércate a recepción.'
      end
  from public.customers c
  where c.id = pr.customer_id and pr.tenant_id = v_tenant and pr.storage_path like '%/demo-historico-rechazado.jpg';

  -- … y dos renovaciones esperando revisión en la bandeja.
  insert into public.payment_receipts (tenant_id, customer_id, plan_id, amount, currency, method, status, source, storage_path, mime_type, size_bytes, submitted_by, note, created_at)
  select v_tenant, c.id, mp.id, mp.price, 'BOB', 'qr', 'pendiente', x.origen::public.receipt_source,
         v_tenant::text || '/' || c.id::text || '/demo-historico-pendiente.jpg', 'image/jpeg', 121000,
         case when x.origen = 'recepcion' then v_recepcion end, x.nota,
         (x.subido at time zone v_tz)
  from (values
    ('6123415', 'normal', 'socio',     timestamp '2026-09-16 21:10', 'Renuevo el Plan Normal.'),
    ('6123412', 'normal', 'recepcion', timestamp '2026-09-16 19:05', 'Pagó con QR en el mostrador; falta verificar en el banco.')
  ) as x(documento, plan, origen, subido, nota)
  join public.customers c on c.tenant_id = v_tenant and c.document_id = x.documento
  join public.membership_plans mp on mp.tenant_id = v_tenant and mp.code = x.plan;

  -- Las revisiones de arriba dejan avisos «de hoy» a socios que no tienen cuenta:
  -- en un historial serían ruido fechado mal.
  delete from public.customer_messages m
  using public.customers c
  where m.customer_id = c.id and c.tenant_id = v_tenant and c.email like '%@demo.gymplatform.bo';

  -- Comprobación: lo que promete la cabecera.
  select count(*) into v_socios from public.customers c where c.tenant_id = v_tenant and c.email like '%@demo.gymplatform.bo';
  select min(a.attendance_date), max(a.attendance_date) into v_desde, v_hasta
  from public.attendance_records a join public.customers c on c.id = a.customer_id
  where a.tenant_id = v_tenant and c.email like '%@demo.gymplatform.bo';
  if v_socios < 15 or v_hasta - v_desde < 90 then
    raise exception 'Historial incompleto: % socios, % días', v_socios, v_hasta - v_desde;
  end if;
  if (select count(distinct a.branch_id) from public.attendance_records a join public.customers c on c.id = a.customer_id
      where a.tenant_id = v_tenant and c.email like '%@demo.gymplatform.bo') < 4 then
    raise exception 'Las entradas no llegan a las cuatro sedes';
  end if;
end $$;

alter table public.access_passes enable trigger preparar_pase_de_acceso;
