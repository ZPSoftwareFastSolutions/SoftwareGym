# ADR 0009 · Reservas de clases, lista de espera y faltas (V3.4)

- **Estado:** aceptada · 2026-09-12
- **Contexto de versión:** V3.4 (rama `feat/v3.4-reservas`)
- **Relacionadas:** ADR 0008 (clases, sesiones y acceso por plan)

## Contexto

Con V3.3 el gimnasio publica clases con cupo, pero quien llega primero entra y
quien viaja 40 minutos no sabe si habrá lugar. V3.4 deja que el socio aparte su
lugar antes de la sesión. El usuario confirmó las reglas recomendadas: la
reserva se abre 7 días antes y se cierra al empezar; cancelar hasta 2 h antes no
cuenta; 3 reservas activas; 3 faltas en 30 días bloquean 7 días; lista de espera
con paso automático; lugares opcionales para quien llega sin reservar; avisos
solo en el panel (WhatsApp y correo, V4).

## Decisión 1 · Las reglas son del gimnasio y viven en la base

`tenant_reservation_settings` (una fila por gimnasio, valores recomendados si no
existe) y `classes.walkin_spots`. El disparador `app.preparar_reserva` las aplica
al reservar, no la pantalla. El dominio (`reservations.ts`) las replica para
anticipar («se abre el jueves a las 07:00», «cancelar ahora cuenta como falta»).
Gerencia las cambia en «Reglas de reserva» por RPC con el gimnasio de la sesión.

No van en el archivo del tenant: cambian por decisión operativa del gimnasio,
no por contrato del producto, igual que las sedes (ADR 0005).

## Decisión 2 · Un solo cupo: asistencias + reservas que todavía no llegaron

`app.ocupacion_de_sesion` cuenta asistentes más reservas `reservada` sin
asistencia. Registrar la asistencia de quien reservó pasa su reserva a `asistio`
(disparador), así nunca ocupa dos lugares. Quien reservó entra a SU lugar aunque
la sesión esté completa; quien llega sin reserva, solo si queda lugar. La reserva
no puede tomar los `walkin_spots`.

Reservar, promover y registrar bloquean la fila de la sesión (`FOR UPDATE`): el
último lugar no lo toman dos a la vez.

## Decisión 3 · Cada estado exige lo que lo hace verdadero

`reservada → asistio` exige la asistencia; `→ no_asistio`, sesión terminada sin
ella; `en_espera → reservada`, ser el primero y que haya lugar; `→ justificada`,
gerencia; `→ cancelada`, antes de empezar. La cancelación tardía y la de una
sesión cancelada por el gimnasio las marca la base (el formulario no puede decir
«la canceló el gimnasio»). El socio solo puede cancelar lo suyo.

## Decisión 4 · Las faltas se derivan; «Cerrar lista» solo las escribe

Una reserva `reservada` de una sesión terminada sin asistencia ES una falta,
esté escrita o no. El bloqueo (`app.reservas_bloqueadas_hasta`), la lista de
faltas y los reportes la cuentan igual. Así el bloqueo es correcto sin un proceso
programado (`pg_cron` no se instaló). «Cerrar lista» deja la falta escrita y
cierra la espera de esa sesión.

## Decisión 5 · La lista de espera se mueve sola y avisa

Al cancelar un lugar ocupado o subir la capacidad, `app.promover_lista_de_espera`
pasa a los primeros mientras haya lugar y la sesión no haya empezado, y deja un
aviso en `customer_messages`. Cancelar una sesión cancela sus reservas (no
cuentan como falta) y avisa a cada socio. Avisos personales aparecen en la
bandeja de notificaciones del socio con prefijo `mensaje:`.

## Alcance por rol

| | Reservar | Cancelar | Ver lista de la sesión | Justificar | Reglas y métricas |
|---|:-:|:-:|:-:|:-:|:-:|
| Socio | ✅ lo suyo, con topes y bloqueo | ✅ lo suyo | ❌ (solo ocupación) | ❌ | ❌ |
| Recepción | ✅ para socios, en sus sedes | ✅ | ✅ sus sedes | ❌ | ❌ |
| Entrenador | ✅ para socios, en sus sesiones | ✅ | ✅ sus sesiones | ❌ | ❌ |
| Gerencia | ✅ por encima de topes y bloqueo | ✅ | ✅ | ✅ | ✅ |
| Anónimo | ❌ | ❌ | ❌ | ❌ | ❌ |

## Consecuencias

- La ocupación que ve el socio incluye reservas; la pantalla del mostrador
  distingue «reservó y no llegó» de «vino».
- Deuda: sin avisos por WhatsApp o correo ni recordatorio el día anterior; sin
  reservas recurrentes («todos los lunes»); la ventana se calcula con la hora del
  gimnasio pero los feriados no cierran reservas; `v_reservation_overview`
  recorre las reservas para contar bloqueados (bien para miles, no millones).
