-- =============================================================================
-- V4 · RENDIMIENTO — patrones de asistencia agregados en la base
-- =============================================================================
--
-- CAUSA. `/panel/asistencia` pedía las últimas 500 entradas enteras (nombre,
-- código, sede, membresía derivada con su subconsulta) para contar en el
-- servidor web la hora pico, el mapa día × hora, el reparto por método y por
-- sede. Con más de 500 entradas en 30 días —un gimnasio con 20 entradas diarias
-- ya las supera— las estadísticas se calculaban SOLO con los últimos días y lo
-- decían como si fueran del mes: lentas y además equivocadas.
--
-- CORRECCIÓN. Una vista que agrega en la base por día de la semana, hora local
-- del gimnasio, método y sede, en la ventana de 30 días del gimnasio. Devuelve
-- como mucho 7 × 24 × 3 × sedes filas, tenga el gimnasio 500 o 50 000 entradas.
-- `security_invoker`: RLS de `attendance_records` decide, como en `v_attendance_log`.
-- =============================================================================

create view public.v_attendance_patterns
with (security_invoker = true) as
select
  a.tenant_id,
  extract(isodow from (a.checked_in_at at time zone t.timezone))::integer as dia_iso,
  extract(hour from (a.checked_in_at at time zone t.timezone))::integer as hora,
  a.method,
  a.branch_id,
  b.name as branch_name,
  count(*)::integer as veces
from public.attendance_records a
join public.tenants t on t.id = a.tenant_id
left join public.branches b on b.tenant_id = a.tenant_id and b.id = a.branch_id
where a.attendance_date > app.hoy_del_gimnasio(a.tenant_id) - 30
group by a.tenant_id, 2, 3, a.method, a.branch_id, b.name;

comment on view public.v_attendance_patterns is
  'V4: entradas de los últimos 30 días agregadas por día ISO, hora local, método y sede (antes se contaban 500 filas en el servidor web).';

grant select on public.v_attendance_patterns to authenticated;
revoke all on public.v_attendance_patterns from anon;
