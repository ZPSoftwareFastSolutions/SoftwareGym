# ADR 0008 · Clases grupales, sesiones generadas y acceso por plan (V3.3)

- **Estado:** aceptada · 2026-09-12
- **Contexto de versión:** V3.3 (rama `feat/v3.3-clases-sesiones`)
- **Relacionadas:** ADR 0005 (multisucursal), ADR 0006 (entrenadores), ADR 0007 (rutinas)

## Contexto

El gimnasio vende clases grupales —Box, Karate, Baile fitness, Fit funcional— y
eventos puntuales (una masterclass). El roadmap pide CLASES y SESIONES con sede,
instructor y capacidad obligatoria, sin reservas (V3.4). El cliente pidió además
que las clases vayan «en base a los planes»: los paquetes Dance incluyen baile,
otros no.

Las preguntas abiertas de `CLAUDE.md §13` se resolvieron así.

## Decisión 1 · Quién entra lo decide el plan, en la base

Cada clase declara `access_mode`:

| Modo | Entra |
|---|---|
| `planes` | Quien tenga vigente, **el día de la sesión**, un plan marcado en `class_plans` |
| `membresia` | Cualquier membresía vigente ese día |
| `abierta` | Cualquiera (eventos, clases de prueba) |

`app.acceso_a_clase` aplica la regla al registrar la asistencia y guarda la
membresía que habilitó (`class_attendances.membership_id`, deducida, no
concedida al cliente). El dominio (`accesoAClase`) replica la regla para que la
pantalla ANTICIPE —«tu plan incluye Box y Karate»— sin decidir nada.

Se mira el día de la sesión, no hoy: una membresía que empieza el mes que viene
no habilita la clase de mañana (la batería lo encontró con Juan Pérez: «Básico»
hoy, «Mítico» desde el 07/10).

## Decisión 2 · Horario semanal + sesiones generadas, y sesiones sueltas

`class_schedules` guarda el patrón (día ISO, hora, sede, instructor, cupo y
duración opcionales). `generar_sesiones_de_clases` crea las sesiones de un rango
(hasta 62 días) y **un índice único `(schedule_id, session_date)` retiene
también las canceladas**: regenerar no duplica ni resucita lo que se canceló.
Los conflictos (instructor ocupado o ausente, sede inactiva) se omiten y se
informan uno por uno: un choque no tira la generación entera.

Los eventos y las clases extra son sesiones sin horario. Editar un horario no
toca las sesiones ya generadas (mismo criterio que la copia de rutinas, ADR
0007); retirarlo cancela sus sesiones futuras que no tienen asistentes.

## Decisión 3 · La capacidad se respeta con un bloqueo, no con un conteo en pantalla

La sesión hereda el cupo de la clase o del horario. El disparador de asistencia
hace `SELECT … FOR UPDATE` sobre la sesión antes de contar: dos registros
simultáneos no pueden quedarse ambos con el último lugar. La capacidad de una
sesión no baja de los asistentes ya registrados.

## Decisión 4 · Asistir a una clase no es entrar al gimnasio

`class_attendances` es otro hecho que `attendance_records`: la entrada la marca el
QR en recepción; esto dice quién estuvo en qué clase. Mezclarlas rompería la
regla «una entrada por día» y la racha (dos clases el mismo día no son dos días).

Quién registra: `classes.attend` **y** (ser el instructor de la sesión **o**
`app.puede_operar_sucursal` de su sede). Recepción, en sus sedes; el instructor,
en sus clases; gerencia, en todas. El socio no se registra solo: eso sería una
reserva (V3.4). Ventana: desde media hora antes de empezar hasta una semana
después.

## Decisión 5 · El calendario es del gimnasio; la asistencia es personal

- Clases, horarios y sesiones: los lee cualquier cuenta del gimnasio (como las
  sedes). La vitrina anónima ve solo las clases `is_public` y sus horarios.
- Nombre del instructor y ocupación: por funciones DEFINER de columnas fijas
  (`app.nombre_de_entrenador`, `app.asistentes_de_sesion`). El socio no lee
  `trainers` ni la asistencia ajena.
- Asistentes con nombre y candidatos: `asistentes_de_sesion` y
  `candidatos_de_sesion`, solo para quien puede tomar asistencia en ESA sesión.
  El instructor no lee `customers` (lección de V3.1).
- La política de lectura de `class_attendances` nombra su condición
  (`classes.manage`, el propio socio, `app.puede_tomar_asistencia`). La primera
  versión aceptaba `classes.attend` y el entrenador veía la asistencia de todas
  las clases: la batería lo encontró (misma trampa que V3.2).

## Alcance por rol

| | Clases y horarios | Generar / cancelar | Tomar asistencia | Ver asistentes | Métricas |
|---|:-:|:-:|:-:|:-:|:-:|
| Gerencia | ✅ | ✅ | ✅ todas | ✅ | ✅ |
| Recepción | 👁 | ❌ | ✅ sus sedes | ✅ sus sedes | ❌ |
| Entrenador | 👁 | ❌ | ✅ sus sesiones | ✅ sus sesiones | ❌ |
| Socio | 👁 (su plan resaltado) | ❌ | ❌ | solo lo suyo | ❌ |
| Anónimo | 👁 solo públicas | ❌ | ❌ | ❌ | ❌ |

## Consecuencias

- V3.4 (reservas) cuelga de `class_sessions` y su cupo: una reserva ocupa un
  lugar antes de la sesión y la asistencia la confirma. La regla de acceso por
  plan ya existe y se reutiliza.
- Deuda: sin lista de espera ni reservas; sin aviso al socio cuando se cancela
  una sesión (queda en su calendario con el motivo); sin reporte CSV de
  asistencia a clases; la ocupación de `v_class_stats` recorre 30 días por
  clase con subconsultas (bien para cientos de sesiones al mes, no para miles);
  el horario no conoce feriados ni los días cerrados del tenant.
