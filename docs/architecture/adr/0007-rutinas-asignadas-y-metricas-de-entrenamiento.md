# ADR 0007 · Rutinas asignadas por copia y métricas de entrenamiento (V3.2)

- **Estado:** aceptada · 2026-09-12
- **Contexto de versión:** V3.2 (rama `feat/v3.2-rutinas-programas`)
- **Relacionadas:** ADR 0005 (multisucursal), ADR 0006 (entrenadores y medios)

## Contexto

V3.2 añade la capa de entrenamiento estructurado —programa → rutina →
ejercicios— y, a pedido del cliente, un cuadro de métricas para gerencia:
cuánta gente hace cada ejercicio, qué hace cada persona, qué se entrena cada
día y qué conclusiones salen de eso.

## Decisión 1 · Asignar COPIA la rutina

`asignar_rutina` duplica la rutina y sus ejercicios en `customer_routines` y
`customer_routine_exercises`.

- El entrenador ajusta series o peso **para ese socio** sin tocar la plantilla,
  que es lo que pide el roadmap («no obligar a que la asignación sea idéntica e
  inmutable al programa original»).
- Editar o archivar la plantilla **no reescribe** lo que el socio ya tiene: su
  historial sigue significando lo que significaba cuando lo hizo.
- Coste: los cambios de la plantilla no se propagan. Es deliberado; propagar
  cambiaría el entrenamiento de alguien sin que nadie lo decida.

## Decisión 2 · El progreso es el hecho registrado, no una casilla del plan

`exercise_completions` guarda una fila por ejercicio, socio y **fecha local del
gimnasio**, con series y peso opcionales.

- Un índice único por (ejercicio de la rutina, día) evita que un doble clic
  cuente doble: las métricas se leen como número de personas y sesiones.
- La base **deduce el origen** (`socio` / `entrenador` / `gerencia`) de la
  sesión: el formulario no puede decir que lo marcó otro.
- No se aceptan fechas futuras ni de más de una semana atrás: se corrige un
  olvido, no se inventa un historial.
- La marca la hacen el socio o su entrenador (decisión del cliente): con solo el
  entrenador, el volumen de datos no alcanzaba para que las métricas dijeran algo.

## Decisión 3 · Las métricas se agregan en la base y se interpretan en el dominio

Las vistas (`v_training_exercise_stats`, `v_training_customer_stats`,
`v_training_weekday`, `v_training_overview`) hacen los conteos con
`security_invoker`, así que cada quien ve lo suyo: gerencia todo el gimnasio, el
entrenador solo sus socios, el socio solo lo suyo.

La **lectura** es dominio puro y probado (`training.ts`):

- `etiquetasPorDia` nombra el día mirando primero si un grupo muscular se lleva
  ≥ 35 % («día de pecho») y, si no, la familia de movimiento con ≥ 50 % («día de
  pierna»). Sin ese doble umbral, un día variado se llamaría «día de bíceps»
  porque el bíceps sacó un registro más. Con menos de 5 registros el día se
  marca «pocos registros» en vez de inventar un patrón.
- `conclusionesDeEntrenamiento` devuelve frases con el número que las sostiene
  (ejercicio más y menos hecho, catálogo sin usar, grupo dominante, día de más
  movimiento, cobertura de rutinas, socios que no registran hace una semana).
  Son para leer en cinco minutos; el gráfico está al lado para comprobarlas.

Pasar la interpretación al dominio la vuelve probable con `node --test`: los
umbrales tienen prueba, y cambiar uno rompe un test y no una pantalla.

## Alcance por rol

| | Plantillas | Asignar | Marcar | Métricas |
|---|:-:|:-:|:-:|:-:|
| Gerencia | ✅ | ✅ cualquiera | ✅ | ✅ |
| Entrenador | ✅ | ✅ solo SUS socios | ✅ solo SUS socios | ❌ (ve lo de sus socios) |
| Recepción | ❌ (solo mira) | ❌ | ❌ | ❌ |
| Socio | ❌ | ❌ | ✅ lo suyo | ❌ |

Lo de «solo sus socios» lo aplica `app.puede_entrenar_a` en disparador y
política, no la pantalla.

## Consecuencias

- V3.3 (clases y sesiones) puede colgar de `exercise_completions` la asistencia
  a una sesión sin cambiar el modelo de progreso.
- Si mañana se quiere propagar un cambio de plantilla a las copias, hay que
  decidirlo explícitamente (y avisar a quien entrena).
- Deuda: sin recurrencia semanal en las rutinas (no hay «lunes = Día A»
  automático); el socio no ve gráficos de su progreso, solo su rutina y lo
  marcado; las métricas no comparan periodos (no hay «subió 12 % respecto al mes
  pasado»).
