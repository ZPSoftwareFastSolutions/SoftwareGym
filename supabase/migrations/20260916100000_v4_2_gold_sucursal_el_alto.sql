-- =============================================================================
-- V4.2 · GOLD — la sucursal «Miraflores» pasa a llamarse «El Alto»
-- =============================================================================
--
-- POR QUÉ ESTÁ ACOTADO AL TENANT. `branches.code` es único POR GIMNASIO, no
-- globalmente: Mítico tiene su propia sede `MIRAFLORES` (Edificio Torre
-- Vicenta), con 5 horarios, 30 sesiones, una asignación de personal y entradas
-- registradas. Un UPDATE por `code` sin filtrar por gimnasio la renombraría
-- también y dejaría a Mítico con una sede «El Alto» que no existe.
--
-- Por eso el WHERE lleva el tenant, y por eso la migración COMPRUEBA al final
-- que Mítico sigue intacta en vez de confiar en que el filtro estaba bien.
--
-- ESTADO DE LA SEDE DE GOLD ANTES DEL CAMBIO (comprobado el 2026-09-16):
-- 0 horarios, 0 sesiones, 0 entradas y 0 asignaciones de personal. No hay
-- historial que reinterpretar: se renombran código y nombre y no queda ninguna
-- referencia funcional a «Miraflores» en GOLD.
--
-- El `code` cambia además del nombre porque es el PUENTE con el archivo del
-- tenant (`content.branches.showcase[].code` y `FacilityItem.branchCode`).
-- Dejarlo como `MIRAFLORES` mantendría el nombre viejo vivo en la vitrina,
-- que es justo lo que se pidió eliminar. El archivo se cambia en el mismo
-- commit; si se aplicara esta migración sin desplegar el código, la sede
-- aparecería sin su texto de vitrina hasta el despliegue (no rompe nada).
-- =============================================================================

update public.branches b
set code = 'ELALTO',
    name = 'Golden Gym El Alto'
from public.tenants t
where t.id = b.tenant_id
  and t.slug = 'golds-gym-premium'
  and b.code = 'MIRAFLORES';

-- ---------------------------------------------------------------- comprobación

do $$
declare
  v_gold_elalto int;
  v_gold_viejo  int;
  v_mitico      int;
begin
  select count(*) into v_gold_elalto
  from public.branches b join public.tenants t on t.id = b.tenant_id
  where t.slug = 'golds-gym-premium' and b.code = 'ELALTO' and b.name = 'Golden Gym El Alto';

  select count(*) into v_gold_viejo
  from public.branches b join public.tenants t on t.id = b.tenant_id
  where t.slug = 'golds-gym-premium' and (b.code = 'MIRAFLORES' or b.name ilike '%miraflores%');

  -- Mítico tiene que seguir EXACTAMENTE como estaba.
  select count(*) into v_mitico
  from public.branches b join public.tenants t on t.id = b.tenant_id
  where t.slug = 'mitico' and b.code = 'MIRAFLORES' and b.name = 'Miraflores';

  if v_gold_elalto <> 1 then
    raise exception 'GOLD debería tener exactamente una sede ELALTO y tiene %', v_gold_elalto;
  end if;
  if v_gold_viejo <> 0 then
    raise exception 'GOLD conserva % referencia(s) a Miraflores', v_gold_viejo;
  end if;
  if v_mitico <> 1 then
    raise exception 'La sede Miraflores de Mítico se alteró: quedan % filas', v_mitico;
  end if;
end $$;
