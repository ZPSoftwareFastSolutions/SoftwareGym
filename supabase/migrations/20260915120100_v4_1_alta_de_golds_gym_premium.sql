-- =============================================================================
-- V4.1 · ALTA DE CLIENTE — GOLD'S GYM PREMIUM
-- =============================================================================
--
-- QUÉ ES. El alta de un gimnasio nuevo siguiendo el checklist del producto
-- (§12 de CLAUDE.md): tenant, sedes, planes vendibles y catálogo de clases con
-- su horario. NO hay una sola línea de esquema aquí: es el mismo modelo que ya
-- usan Mítico y Aurora. Si esta migración necesitara una tabla o una columna
-- propia de GOLD, el producto habría dejado de ser enlatado.
--
-- IDEMPOTENTE. Todo va con `on conflict do nothing` o condicionado a que no
-- exista: volver a aplicarla no duplica nada.
--
-- ─────────────────────────────────────────────────────────────────────────
-- DATOS PENDIENTES DEL CLIENTE. No se ha inventado ninguno; lo que falta queda
-- NULL o vacío y se completa desde el panel, sin desplegar:
--
--   1. DIRECCIONES de Garita, Cruce de Villas y Miraflores (solo se conoce la
--      de la sede principal). Quedan NULL.
--   2. SEDE DE CADA CLASE: el folleto da un solo calendario y no dice en qué
--      sucursal se dicta cada clase. TODOS los horarios se crean en la sede
--      principal (LAVITA). Reasignarlos es editar el horario en el panel.
--   3. CUPO DE CADA CLASE: la base lo exige (`clases_capacidad`, 1-200) y el
--      folleto no lo trae. Se crean todas con 30, que es un MARCADOR: gerencia
--      lo ajusta clase por clase. No hay reservas activas, así que hoy no
--      afecta a nada operativo.
--   4. QUÉ PLANES INCLUYEN QUÉ CLASE: solo se declara lo que el folleto dice
--      explícitamente (ver bloque 5). Strong, Body Pump y Karate quedan SIN
--      plan declarado, así que la vitrina dirá «consulta en recepción qué
--      paquete la incluye» en vez de afirmar algo que nadie confirmó.
--   5. PLANES DE LARGA DURACIÓN (3, 6 y 12 meses): el folleto da su precio
--      pero no qué incluyen. No se les asigna ninguna clase.
--   6. «Tarde — Especiales» del sábado: sin hora ni nombre de clase. No se crea.
--   7. «Folklore P.» del viernes se crea tal como lo escribe el folleto; si es
--      «Folklore Principiantes», se renombra en el panel.
--   8. «Baile» del calendario se registra como «Baile Fitness», que es el
--      nombre con el que el propio folleto lo lista en el Plan Aeróbicos.
--   9. STEP y X-55 aparecen en el Plan Aeróbicos pero NO en el calendario: se
--      crean como clases sin horario.
-- =============================================================================

-- ---------------------------------------------------------------- 1. tenant

insert into public.tenants (slug, name, legal_name, status, is_demo, timezone, currency)
values (
  'golds-gym-premium',
  'Gold''s Gym Premium',
  -- PENDIENTE: razón social real. Hoy repite el nombre comercial.
  'Gold''s Gym Premium',
  'trial',
  false,
  'America/La_Paz',
  'BOB'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- 2. sucursales

-- La primera que se inserta es la principal. El resto quedan activas y sin
-- dirección hasta que el cliente la entregue.
insert into public.branches (tenant_id, code, name, address, is_primary, is_active)
select t.id, v.code, v.name, v.address, v.is_primary, true
from public.tenants t
cross join (values
  ('LAVITA', 'Gold''s Gym Premium', 'Av. Apumalla #422, Caparazón Mall Center 4° Piso', true),
  ('GARITA', 'Gold Gym Body Garita', null, false),
  ('CRUCEVILLAS', 'Gold Gym Cruce de Villas', null, false),
  ('MIRAFLORES', 'Golden Gym Miraflores', null, false)
) as v(code, name, address, is_primary)
where t.slug = 'golds-gym-premium'
on conflict do nothing;

-- ---------------------------------------------------------------- 3. planes

-- Los `code` son los mismos que los `id` de `content.planGroups` en
-- `tenants/golds-gym-premium.tenant.ts`: ese es el puente que hace que «Pagar
-- con QR» sepa de qué plan habla y que el precio salga de la BASE.
insert into public.membership_plans (tenant_id, code, name, description, duration_days, price, currency, is_active, sort_order)
select t.id, v.code, v.name, v.descripcion, v.dias, v.precio, 'BOB', true, v.orden
from public.tenants t
cross join (values
  ('normal',      'Plan Normal',     'Entrena 3 veces por semana, eliges tus días. Incluye todos los servicios.', 30,  250.00, 1),
  ('mananero',    'Plan Mañanero',   'Acceso a todo desde las 07:00 (horario de cierre por confirmar).',          30,  186.00, 2),
  ('ejecutivo',   'Plan Ejecutivo',  'Máquinas, aeróbicos, spinning, duchas, casilleros y vestidores.',           30,  170.00, 3),
  ('aerobicos',   'Plan Aeróbicos',  'Clases de aeróbicos, válido en cualquier sucursal.',                        30,  150.00, 4),
  ('trimestral',  '3 Meses',         'Plan de tres meses.',                                                       90,  520.00, 5),
  ('semestral',   '6 Meses',         'Plan de seis meses.',                                                      180, 1000.00, 6),
  ('anual',       'Anual',           'Plan anual.',                                                             365, 1900.00, 7)
) as v(code, name, descripcion, dias, precio, orden)
where t.slug = 'golds-gym-premium'
on conflict do nothing;

-- ---------------------------------------------------------------- 4. clases

-- `is_public = true`: el calendario es argumento de venta y se publica en
-- `/golds-gym-premium/clases`. `access_mode = 'planes'` en todas: quién entra
-- lo decide el paquete, que es lo que dice el folleto.
insert into public.classes (tenant_id, name, description, category, level, kind, access_mode, duration_minutes, capacity, is_public, is_active)
select t.id, v.name, v.descripcion, v.categoria, 'todos', 'regular', 'planes', v.duracion, 30, true, true
from public.tenants t
cross join (values
  ('Ubound',        'Clase de aeróbicos incluida en el Plan Aeróbicos.',            'fit',             60),
  ('Full Kombat',   'Clase de combate incluida en el Plan Aeróbicos.',              'combate',         60),
  ('Fight Do',      'Clase de combate incluida en el Plan Aeróbicos.',              'combate',         60),
  ('Body Combat',   'Clase de combate incluida en el Plan Aeróbicos.',              'combate',         60),
  ('Baile Fitness', 'Clase de baile incluida en el Plan Aeróbicos.',                'baile',           60),
  ('Folklore',      'Clase de folklore incluida en el Plan Aeróbicos.',             'baile',           60),
  -- PENDIENTE: el folleto la escribe así. Si es «Folklore Principiantes», se renombra en el panel.
  ('Folklore P.',   'Folklore, horario del viernes por la tarde.',                  'baile',           60),
  ('Yoga',          'Clase de yoga incluida en el Plan Aeróbicos.',                 'mente_cuerpo',    60),
  ('Oxigeno',       'Clase incluida en el Plan Aeróbicos.',                         'fit',             60),
  -- PENDIENTE: en el Plan Aeróbicos pero sin horario en el folleto.
  ('Step',          'Clase incluida en el Plan Aeróbicos. Horario por confirmar.',  'fit',             60),
  ('X-55',          'Clase incluida en el Plan Aeróbicos. Horario por confirmar.',  'fit',             60),
  -- PENDIENTE: en el calendario pero NO en la lista del Plan Aeróbicos.
  ('Strong',        'Clase del calendario semanal. Consulta en recepción qué paquete la incluye.', 'fit',    60),
  ('Body Pump',     'Clase del calendario semanal. Consulta en recepción qué paquete la incluye.', 'fuerza', 60),
  ('Spinning',      'Sesiones de spinning con horario propio. Incluido en el Plan Ejecutivo.',     'ciclismo', 60),
  -- PENDIENTE: el folleto no da mensualidad de Karate. Sin plan declarado.
  ('Karate',        'Clases de karate en dos bloques por tarde. Consulta la mensualidad en recepción.', 'artes_marciales', 90)
) as v(name, descripcion, categoria, duracion)
where t.slug = 'golds-gym-premium'
on conflict do nothing;

-- ---------------------------------------------------------------- 5. planes por clase

-- SOLO lo que el folleto dice de forma explícita:
--   · Plan Aeróbicos: las diez clases que enumera.
--   · Plan Ejecutivo: «Aeróbicos» y «Spinning».
--   · Plan Normal («incluye todos los servicios») y Plan Mañanero («acceso a
--     todo»): lo mismo que el Ejecutivo.
-- Lo que NO dice queda sin declarar a propósito: la vitrina responde «consulta
-- en recepción qué paquete la incluye», que es la verdad.
insert into public.class_plans (tenant_id, class_id, plan_id)
select t.id, c.id, p.id
from public.tenants t
join public.classes c on c.tenant_id = t.id
join public.membership_plans p on p.tenant_id = t.id
where t.slug = 'golds-gym-premium'
  and (
    (
      c.name in ('Ubound', 'Baile Fitness', 'Full Kombat', 'Fight Do', 'Body Combat',
                 'Folklore', 'Folklore P.', 'Step', 'X-55', 'Yoga', 'Oxigeno')
      and p.code in ('aerobicos', 'ejecutivo', 'normal', 'mananero')
    )
    or (
      c.name = 'Spinning'
      and p.code in ('ejecutivo', 'normal', 'mananero')
    )
  )
on conflict do nothing;

-- ---------------------------------------------------------------- 6. horarios

-- PENDIENTE (ver cabecera): todos en la sede principal, porque el folleto trae
-- un calendario único y no dice en qué sucursal se dicta cada clase.
-- `weekday` es ISO: 1 = lunes … 7 = domingo.
insert into public.class_schedules (tenant_id, class_id, branch_id, weekday, start_time, duration_minutes, is_active)
select t.id, c.id, b.id, v.dia, v.hora::time, v.duracion, true
from public.tenants t
-- El VALUES va ANTES de los join que lo referencian: en SQL una relación solo
-- puede usarse en una condición que aparezca después de declararla.
cross join (values
  -- Lunes
  (1, '08:30', 'Full Kombat',   null::smallint),
  (1, '09:30', 'Ubound',        null),
  (1, '10:30', 'Fight Do',      null),
  (1, '17:00', 'Baile Fitness', null),
  (1, '18:00', 'Strong',        null),
  (1, '19:00', 'Ubound',        null),
  (1, '20:00', 'Baile Fitness', null),
  (1, '21:00', 'Full Kombat',   null),
  -- Martes
  (2, '08:30', 'Yoga',          null),
  (2, '09:30', 'Body Pump',     null),
  (2, '10:30', 'Ubound',        null),
  (2, '17:00', 'Baile Fitness', null),
  (2, '18:00', 'Strong',        null),
  (2, '19:00', 'Folklore',      null),
  (2, '20:00', 'Full Kombat',   null),
  (2, '21:00', 'Ubound',        null),
  -- Miércoles
  (3, '08:30', 'Ubound',        null),
  (3, '09:30', 'Yoga',          null),
  (3, '10:30', 'Full Kombat',   null),
  (3, '17:00', 'Yoga',          null),
  (3, '18:00', 'Baile Fitness', null),
  (3, '19:00', 'Fight Do',      null),
  (3, '20:00', 'Full Kombat',   null),
  (3, '21:00', 'Ubound',        null),
  -- Jueves
  (4, '08:30', 'Body Combat',   null),
  (4, '09:30', 'Ubound',        null),
  (4, '10:30', 'Full Kombat',   null),
  (4, '17:00', 'Baile Fitness', null),
  (4, '18:00', 'Ubound',        null),
  (4, '19:00', 'Folklore',      null),
  (4, '20:00', 'Full Kombat',   null),
  (4, '21:00', 'Ubound',        null),
  -- Viernes
  (5, '08:30', 'Ubound',        null),
  (5, '09:30', 'Full Kombat',   null),
  (5, '10:30', 'Body Pump',     null),
  (5, '17:00', 'Baile Fitness', null),
  (5, '18:00', 'Folklore P.',   null),
  (5, '19:00', 'Full Kombat',   null),
  (5, '20:00', 'Ubound',        null),
  (5, '21:00', 'Body Combat',   null),
  -- Sábado («Tarde — Especiales» no se crea: sin hora ni nombre de clase)
  (6, '08:30', 'Oxigeno',       null),
  (6, '09:30', 'Ubound',        null),
  (6, '10:30', 'Body Combat',   null),
  -- Domingo (el folleto da tramos: Fight Do dura dos horas)
  (7, '08:00', 'Fight Do',      120),
  (7, '10:00', 'Ubound',        60),
  (7, '11:00', 'Full Kombat',   60),
  -- Spinning: horario propio de lunes a viernes
  (1, '08:00', 'Spinning',      60),
  (3, '08:00', 'Spinning',      60),
  (5, '08:00', 'Spinning',      60),
  (1, '18:00', 'Spinning',      60),
  (1, '19:30', 'Spinning',      60),
  (3, '19:00', 'Spinning',      60),
  (4, '19:00', 'Spinning',      60),
  (5, '19:00', 'Spinning',      60),
  -- Karate: dos bloques de 90 minutos, martes, miércoles y viernes
  (2, '14:00', 'Karate',        90),
  (2, '15:30', 'Karate',        90),
  (3, '14:00', 'Karate',        90),
  (3, '15:30', 'Karate',        90),
  (5, '14:00', 'Karate',        90),
  (5, '15:30', 'Karate',        90)
) as v(dia, hora, clase, duracion)
join public.branches b on b.tenant_id = t.id and b.code = 'LAVITA'
join public.classes c on c.tenant_id = t.id and c.name = v.clase
where t.slug = 'golds-gym-premium'
on conflict do nothing;
