# Migraciones aplicadas

> **Esta carpeta está vacía de `.sql` a propósito y es una deuda conocida, no
> un descuido.** El esquema vive hoy solo en el servidor de Supabase. Traerlo
> aquí requiere `npx supabase link --project-ref dnclwawnjnzqqxgsuhpn` seguido
> de `npx supabase db pull`, y eso pide la contraseña de la base, que no está
> —ni debe estar— en el repositorio ni en una sesión automatizada.
>
> Mientras tanto, este archivo deja constancia de **qué** se aplicó y **en qué
> orden**, para que una revisión pueda contrastarlo contra el servidor y para
> que el día que se haga el `db pull` se note enseguida si falta algo.
>
> Incumple la regla §47 del documento maestro. Cerrarlo es el punto A de la
> lista de pendientes de `CLAUDE.md`.

## Cómo comprobar que esta lista sigue al día

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

## V2 · Base de datos y aislamiento (2026-09-09)

| Versión | Nombre |
|---|---|
| 20260909082347 | `v2_0001_tipos_y_plataforma` |
| 20260909082416 | `v2_0002_identidad_roles_permisos` |
| 20260909082451 | `v2_0003_contexto_de_tenant` |
| 20260909082529 | `v2_0004_dominio_gimnasio` |
| 20260909082607 | `v2_0005_asistencia_auditoria_vistas` |
| 20260909082650 | `v2_0006_politicas_rls` |
| 20260909082715 | `v2_0007_portal_del_cliente` |
| 20260909082739 | `v2_0008_semilla_roles_permisos` |
| 20260909082835 | `v2_0009_esquema_privado_app` |
| 20260909082907 | `v2_0010_repuntar_politicas_y_triggers` |
| 20260909082938 | `v2_0011_semilla_tenants_y_planes` |
| 20260909140850 | `v2_0012_aprovisionar_perfil_al_registrarse` |

## V2.1 · Operación del gimnasio (2026-09-09)

| Versión | Nombre | Qué introduce |
|---|---|---|
| 20260910012817 | `v21_check_in_tokens_y_avisos` | `check_in_tokens`, `notices`, `notice_reads` y sus políticas |
| 20260910012915 | `v21_vistas_de_dashboard_y_reportes` | Vistas de indicadores, series y bitácora, todas con `security_invoker` |
| 20260910013056 | `v21_los_ingresos_no_cuentan_cobros_futuros` | Un cobro con fecha futura no es dinero que entró |
| 20260910013643 | `v21_kpis_con_slug_v2` | El slug en los indicadores, para no resolver el id en cada carga |
| 20260910020354 | `v21_panorama_sin_numeros_que_mienten` | Se retira un conteo que daba cero por falta de permiso, no por falta de datos |
| 20260910020651 | `v21_token_de_check_in_sin_depender_de_pgcrypto` | **Corrige** el alta de socios: `gen_random_bytes` no es alcanzable con el `search_path` fijado |
| 20260910020817 | `v21_el_socio_de_una_fila_pertenece_a_su_gimnasio` | **Corrige** integridad: claves foráneas compuestas `(tenant_id, customer_id)` |
| 20260910021336 | `v21_vistas_de_reporte_con_hora_local` | **Corrige** el reporte de pagos (vacío) y el de membresías (incompleto); horas en la zona del gimnasio |

Las tres marcadas como **Corrige** salieron de probar la aplicación, no de
revisar el código. El detalle de cada una está en `CLAUDE.md`, sección
«V2.1 · Operación del gimnasio».

## V2.2 · Gestión de socios y cobro por QR (2026-09-10)

| Versión | Nombre | Qué introduce |
|---|---|---|
| 20260910134747 | `v22_planes_con_codigo_y_recepcion_solo_crea` | `membership_plans.code` para enlazar el plan público con el cobro; recepción pierde `customers.update` y `memberships.update` |
| 20260910134844 | `v22_comprobantes_almacenamiento_y_cobro_por_qr` | `payment_receipts`, `tenant_payment_settings`, buckets `comprobantes` (privado) y `qr-pagos` (público) con sus políticas |
| 20260910135144 | `v22_operaciones_atomicas_vinculo_de_cuenta_y_vistas` | RPC `registrar_socio`, `vender_membresia`, `revisar_comprobante` (invocador); vínculo cuenta↔ficha por correo confirmado; vistas `v_customer_detail`, `v_receipts`, `v_users_roles` |
| 20260910135355 | `v22_rotar_qr_sin_security_definer` | **Corrige** un aviso del analizador: la rotación del QR deja de ser `SECURITY DEFINER`; un disparador fuerza el token aleatorio |
| 20260910140118 | `v22_ajustes_de_cobro_con_slug` | El slug en los ajustes de cobro, para servir el QR sin sesión |
| 20260910140432 | `v22_columnas_insertables_y_autoria_desde_la_sesion` | Permisos por columna; la autoría sale de la sesión, no del formulario |
| 20260910191501 | `v22_comprobante_aprobado_exige_pago` | **Corrige** integridad: un comprobante aprobado sin cobro era dinero invisible para los dashboards |

## V3.0 · Multisucursal (2026-09-11)

| Versión | Nombre | Qué introduce |
|---|---|---|
| 20260911043330 | `v3_sucursales_asignaciones_y_permisos` | Tablas `branches` y `user_branches` (N:M usuario↔sede) con RLS, FK compuestas `(tenant_id, …)` y grants por columna; `attendance_records.branch_id` (FK compuesta, `CHECK … NOT VALID`, índice); permisos `branches.manage` y `branches.all` (gerencia); `app.puede_operar_sucursal` en la política de INSERT de asistencia; disparador `sucursal_no_disponible`; RPC `establecer_sucursal_primaria`; auditoría por disparador de sedes y asignaciones; `registered_by` y `audit_log.actor_user_id` salen de la sesión |
| 20260911043415 | `v3_vistas_por_sucursal` | `v_attendance_log` + `branch_id`, `branch_code`, `branch_name` y `membership_id` **derivado**; vistas nuevas `v_attendance_branch_daily`, `v_branch_overview`, `v_mis_sucursales`; `v_platform_overview` + `sucursales` |
| 20260911050002 | `v3_semilla_sucursales` | Mítico: **Prado** (principal, Plaza del Estudiante) y **Miraflores** (Edificio Torre Vicenta, Av. Argentina 1843); Aurora Fit: **Recoleta** (sede única); recepción de demostración de Mítico asignada a las dos sedes |
| 20260911053257 | `v3_sucursal_principal_solo_por_rpc` | **Corrige** integridad: la marca de sede principal solo cambia por la RPC (se retira `UPDATE (is_primary)`; el cambio lo hace `app.fijar_sucursal_primaria`) |
| 20260911144537 | `v3_cobro_qr_por_plan_e_importe_verificado` | **Corrige** «gerencia no puede guardar el QR» (el `upsert` de PostgREST escribía `tenant_id` sin grant → 42501): RPC invocador `guardar_ajustes_de_cobro`, `guardar_qr_de_cobro`, `eliminar_qr_de_cobro` (el gimnasio sale de la sesión). `tenant_payment_settings.qr_mode` (`global`/`por_plan`); tabla `payment_qr_codes` (QR general o por plan, monto `libre`/`exacto`, vencimiento; FK compuesta al plan; RLS por `settings.manage`); se migran y retiran `qr_path`/`expires_on` de los ajustes. Planes activos legibles por anónimo (columnas públicas). Comprobantes: `expected_amount` (precio del plan fijado por disparador al subir) y `verified_amount`; CHECK e disparador que impiden aprobar o enlazar un pago por debajo del precio (`monto_insuficiente`, `pago_no_valido`); un pago por comprobante; `revisar_comprobante(…, p_monto_verificado)` |
| 20260911144622 | `v3_venta_y_alta_con_qr_exigen_importe_completo` | `vender_membresia` y `registrar_socio` rechazan un cobro con método `qr` menor que el precio del plan (`monto_insuficiente`); efectivo, tarjeta y transferencia no cambian |

**Cobro por QR (corrección V3.0).** Pruebas por rol, gimnasio ajeno, anónimo e
importes 180/179/181 en [`docs/runbooks/pruebas-rls-v3.0-cobro-qr.sql`](../../docs/runbooks/pruebas-rls-v3.0-cobro-qr.sql).
Los 6 intentos fallidos de gerencia dejaron 6 imágenes huérfanas en
`qr-pagos/4b79e41f…/qr-*.jpg`: se borran desde el panel de Storage (SQL no puede).

## V3.1 · Entrenadores + ejercicios (2026-09-11)

| Versión | Nombre | Qué introduce |
|---|---|---|
| 20260911191206 | `v3_roles_de_gimnasio_no_otorgan_plataforma` | **Corrige una escalada de privilegios existente desde V2**: `user_roles_write` dejaba a gerencia (`users.manage`) otorgar CUALQUIER rol a cuentas de su gimnasio, incluido `super_admin` (probado: `is_platform_admin` pasaba a verdadero). Ahora fuera de la plataforma solo se insertan/borran roles de alcance `tenant`; sin UPDATE de roles; `app_users` sin INSERT y con UPDATE solo de `customer_id`, `full_name`, `status` |
| 20260911191920 | `v3_1_entrenadores_ejercicios_y_permisos` | Permisos `trainers.read/manage/self`, `exercises.read/manage`; rol `trainer` (solo `trainers.self`). `membership_plans.includes_trainer` y `max_secondary_trainers` (0–5); `tenants.media_quota_bytes` (300 MB). Tablas con RLS y FK compuestas: `trainers` (cuenta opcional, única), `trainer_branches` (N:M), `trainer_unavailability` (horas/turno/día/periodo, sin solapes), `customer_trainers` (principal único, secundarios según el plan, fin en vez de borrar), `exercises` (catálogo por gimnasio, 14 grupos musculares), `exercise_media` (imagen/GIF/clip/enlace; tamaño y tipo leídos de `storage.objects`; cuota y 6 por ejercicio). Disparadores de validación y auditoría; RPC `vincular_cuenta_de_entrenador`, `desvincular_cuenta_de_entrenador`, `mis_socios_asignados` (DEFINER solo en `app`); vistas `v_trainers`, `v_customer_trainers`, `v_uso_de_medios`; bucket privado `ejercicios` (15 MB, imagen/GIF/MP4/WebM) con políticas por `exercises.read/manage` |
| 20260911192032 | `v3_1_semilla_entrenador_demo_y_ejercicios` | Mítico: cuenta demo `entrenador@miticofitness.com` vinculada al perfil «Entrenador Demo» en sus sedes activas; 13 ejercicios base sin medios. **Sin asignaciones**: los planes nacen sin entrenador (lo decide gerencia) |
| 20260911192503 | `v3_1_mensajes_de_asignacion_y_especialidades` | Ajustes que detectó la batería de RLS (no eran brechas): especialidades sin repetir mayúsculas; «ya asignado» / «ya tiene principal» antes de la regla del plan; entrenador de otro gimnasio → `entrenador_no_disponible` |

Pruebas por rol, gimnasio ajeno, anónimo, cuota y escalada de roles:
[`docs/runbooks/pruebas-rls-v3.1-entrenadores-ejercicios.sql`](../../docs/runbooks/pruebas-rls-v3.1-entrenadores-ejercicios.sql).

**Histórico sin sucursal.** Las 154 entradas anteriores a V3.0 no guardaron
dónde ocurrieron y no hay dato fiable para deducirlo: se dejaron con
`branch_id` NULL («sin sucursal registrada») en vez de inventarles una sede.
`attendance_sucursal_obligatoria` es `CHECK (branch_id IS NOT NULL) NOT VALID`:
la base la exige en toda fila nueva sin reescribir las anteriores. Si algún día
el negocio confirma la sede de ese periodo, se asigna con un UPDATE explícito y
documentado, y la restricción se puede validar (`VALIDATE CONSTRAINT`).

## V3.2 · Programas, rutinas y progreso (2026-09-12)

| Versión | Nombre | Qué introduce |
|---|---|---|
| 20260912061426 | `v3_2_programas_rutinas_y_progreso` | Permisos `routines.read/manage/assign`, `training.log`, `training.read`; el rol `trainer` suma además `exercises.read`; recepción solo `routines.read`. Tablas con RLS y FK compuestas: `training_programs` (objetivo, nivel, semanas), `routines` (día, orden, notas, minutos), `routine_exercises` (series, repeticiones con formato validado, peso, descanso), `customer_routines` + `customer_routine_exercises` (**la asignación COPIA la rutina**, editable por socio) y `exercise_completions` (progreso con fecha local del gimnasio, series y peso opcionales, origen deducido por la base). RPC `asignar_rutina` (copia atómica), `marcar_ejercicio` (socio y ejercicio salen de la fila, una marca por día) y `desmarcar_ejercicio`; disparadores de validación, alcance del entrenador (`app.puede_entrenar_a`) y auditoría; vistas `v_routines`, `v_customer_routines`, `v_training_exercise_stats`, `v_training_customer_stats`, `v_training_weekday` y `v_training_overview` |
| 20260912061634 | `v3_2_marcar_ejercicio_respeta_indice_parcial` | La batería de RLS encontró que el `ON CONFLICT` no repetía el predicado del índice parcial: **toda marca fallaba** con 42P10 |
| 20260912061803 | `v3_2_marcar_ejercicio_no_escribe_el_origen` | La RPC nombraba `source` en el INSERT, columna que no se concede a nadie (la deduce la base): «permission denied» en cada marca |
| 20260912061936 | `v3_2_progreso_y_catalogo_con_el_alcance_justo` | El progreso lo veía recepción (la política reusaba `puede_entrenar_a`, que acepta a cualquiera con `customers.read`); ahora es de `training.read`, el propio socio y SU entrenador. Y el rol `customer` recibe `exercises.read`: sin eso no podía leer el nombre de los ejercicios de su propia rutina |
| 20260912062135 | `v3_2_semilla_programa_y_entrenamiento_demo` | Mítico: programa «Full Body 3 días» (Día A empuje, Día B pierna, Día C tirón), asignado a 5 socios, y seis semanas de ejercicios completados con patrón lunes/miércoles/viernes para que las métricas tengan datos. Los disparadores de validación se apagan solo durante la carga histórica |

Pruebas por rol, gimnasio ajeno, anónimo y reglas de progreso:
[`docs/runbooks/pruebas-rls-v3.2-rutinas-y-progreso.sql`](../../docs/runbooks/pruebas-rls-v3.2-rutinas-y-progreso.sql).

## V3.3 · Clases grupales, horarios y sesiones (2026-09-12)

| Versión | Nombre | Qué introduce |
|---|---|---|
| 20260912222251 | `v3_3_clases_horarios_sesiones_y_asistencia` | Permisos `classes.read`, `classes.manage` (gerencia) y `classes.attend` (gerencia, recepción y entrenador). Tablas con RLS y FK compuestas: `classes` (categoría, nivel, `regular`/`evento`, **quién puede entrar** `membresia`/`planes`/`abierta`, duración, **capacidad obligatoria**, instructor habitual, `is_public` para la vitrina), `class_plans` (qué planes incluyen cada clase), `class_schedules` (horario semanal por sede, con duración y cupo propios opcionales), `class_sessions` (fecha, hora, sede, instructor, cupo efectivo, título, estado `programada`/`cancelada` con motivo obligatorio; una por horario y fecha) y `class_attendances` (una por socio y sesión; la membresía que la habilitó la deduce la base). Disparadores: la sesión hereda de la clase, no se programa en el pasado, el instructor tiene que trabajar en la sede y no puede cruzarse consigo mismo ni con una ausencia (`entrenador_ocupado`, `entrenador_ausente`); cancelada no se reabre ni se cancela con asistentes; la asistencia exige `app.puede_tomar_asistencia` (recepción en sus sedes, el instructor en sus sesiones), ventana de media hora antes a 7 días después, plan que incluya la clase (`plan_no_incluye_clase`, `sin_membresia_vigente`) y cupo con bloqueo de la sesión (`clase_llena`). RPC `generar_sesiones_de_clases` (hasta 62 días; conflictos omitidos e informados), `registrar_asistencia_a_clase`, `fijar_planes_de_clase`, `cancelar_sesiones_de_horario`, `asistentes_de_sesion` y `candidatos_de_sesion` (columnas fijas por DEFINER en `app`: el instructor no lee `customers`; busca por código, nombre o token del QR). `app.nombre_de_entrenador` y `app.asistentes_de_sesion` dan nombre y ocupación sin abrir `trainers` ni la asistencia. Vistas `v_classes`, `v_class_schedules`, `v_class_sessions` (estado efectivo con la hora del gimnasio), `v_class_attendance_log`, `v_class_stats`, `v_class_slot_stats`, `v_class_overview`. Anónimo: clases públicas, sus horarios y sus planes (columnas concedidas) |
| 20260912222404 | `v3_3_semilla_clases_demo` | Mítico: Baile fitness, Bachata y Twerking (de su material comercial, publicadas, con los paquetes Dance y Mítico Fitness), y Fit funcional, Box, Karate y «Masterclass de Box» como **demostración** (no publicadas). 15 horarios en Prado y Miraflores, cuatro semanas de sesiones pasadas con asistencia que respeta plan y cupo, una cancelación y dos semanas por delante. Los disparadores de validación se apagan solo para la carga histórica; las sesiones futuras pasan por ellos |
| 20260912222644 | `v3_3_generar_no_cruza_con_su_propia_sesion` | La batería de RLS encontró que volver a generar marcaba «instructor ocupado» en cada fecha que ya tenía su sesión: el disparador BEFORE veía la propia sesión del horario antes de que `ON CONFLICT` la descartara. El cruce ya no cuenta la sesión del mismo horario y la generación salta las fechas existentes |
| 20260912222809 | `v3_3_asistencia_a_clase_con_el_alcance_justo` | El entrenador veía la asistencia de TODAS las clases: la política aceptaba `classes.attend`, que también tiene recepción. Ahora la leen `classes.manage`, quien puede tomar asistencia EN ESA sesión y el propio socio |

Pruebas por rol, sede sin asignación, gimnasio ajeno, anónimo y reglas de plan y cupo:
[`docs/runbooks/pruebas-rls-v3.3-clases-y-sesiones.sql`](../../docs/runbooks/pruebas-rls-v3.3-clases-y-sesiones.sql).
