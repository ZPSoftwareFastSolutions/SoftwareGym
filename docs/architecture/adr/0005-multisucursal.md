# ADR 0005 — Multisucursal: la sede es un lugar del gimnasio, no otro gimnasio

**Estado:** Aceptada · **Fecha:** 2026-09-11 · **Ámbito:** V3.0 → V3.4

## Contexto

Mítico Fitness opera dos sedes (Prado y Miraflores). Hasta V2.2 el modelo solo
conocía el gimnasio: una entrada no decía dónde ocurrió, el personal no tenía
alcance por sede y la web publicaba una sola dirección. Las fases siguientes
(clases con sesiones por sede, reservas) necesitan que la sede exista antes.

## Decisión

1. **`branches` cuelga de `tenants`.** Socio, membresía y pagos siguen siendo
   del gimnasio. Toda relación hacia una sede usa FK compuesta
   `(tenant_id, branch_id) → branches(tenant_id, id)`: el motor impide que una
   fila de un gimnasio apunte a la sede de otro.
2. **La asistencia registra la sede donde ocurrió** (`attendance_records.branch_id`).
   Una sola entrada por socio y día, aunque sea en otra sede (regla V2.1
   intacta). La membresía que cubrió ese día se **deriva** en `v_attendance_log`;
   no se guarda y no se toca su vencimiento.
3. **El QR identifica al socio y nada más.** La sede la aporta la operación: la
   sede de trabajo de quien escanea.
4. **Usuario ↔ sede es N:M** (`user_branches`, con `is_active`). Operar en una
   sede exige, en la base, `app.puede_operar_sucursal`: sede activa del propio
   gimnasio y (permiso `branches.all` **o** asignación activa **o** ser la única
   sede activa del gimnasio).
5. **La sede de trabajo es una cookie por dispositivo**, validada en cada
   petición contra `v_mis_sucursales`. Un mostrador es un lugar físico. La
   cookie es una preferencia; el permiso lo decide la base.
6. **La base acota la operación, no la lectura del historial.** El personal lee
   la asistencia de todo su gimnasio: la ficha, la racha y la regla de «ya
   entró hoy» son del socio, no de una sede. Las vistas por sede son foco de
   pantalla.
7. **Sin borrado físico.** Una sede se desactiva; deja de aceptar entradas (lo
   impide un disparador) y conserva su historial. La principal no se puede
   desactivar y solo cambia por la RPC `establecer_sucursal_primaria`.
8. **La vitrina lee las sedes de la base** con un cliente anónimo sin cookies
   (ISR de 5 min). Las sedes no se declaran en el archivo del tenant: gerencia
   las edita sin desplegar.
9. **Histórico sin sede.** Lo anterior a V3.0 queda con `branch_id` NULL. La
   obligatoriedad es `CHECK … NOT VALID`: vale para toda fila nueva sin
   inventar el pasado.
10. **Capacidad `enableMultiBranch`** (ya existía en el contrato). Apagada, el
    gimnasio opera como sede única: sus entradas igualmente llevan sede, pero
    no hay selector, ni `/panel/sucursales` (404), ni vistas por sede.

## Alternativas descartadas

- **Un tenant por sede.** Rompe la membresía única, parte el historial del
  socio y duplica configuración. Descartado por definición del producto.
- **`app_users.branch_id`.** Impide que una recepcionista cubra dos sedes.
- **Asignar el histórico a la sede principal.** Sería inventar dónde entrenó
  cada socio durante tres meses.
- **Filtrar la lectura de asistencia por sede con RLS.** La ficha del socio
  mostraría visitas y racha falsas a quien trabaja en otra sede, y el aviso de
  «ya registró hoy» no podría decir dónde.
- **Sede de trabajo en la cuenta.** Obliga a cambiarla cada vez que alguien
  trabaja en otra sede, y dos dispositivos de la misma cuenta pelean por ella.

## Consecuencias

- Toda operación nueva que ocurra en un lugar (sesiones de clase en V3.3,
  reservas en V3.4) lleva `branch_id` con FK compuesta y comprueba
  `app.puede_operar_sucursal` en su política de escritura.
- Cobros y altas de socios **no** llevan sede en V3.0. Si el negocio necesita
  ingresos por sede, es una ampliación explícita, no un supuesto.
