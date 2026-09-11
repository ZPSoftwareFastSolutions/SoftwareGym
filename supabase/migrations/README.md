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

**Histórico sin sucursal.** Las 154 entradas anteriores a V3.0 no guardaron
dónde ocurrieron y no hay dato fiable para deducirlo: se dejaron con
`branch_id` NULL («sin sucursal registrada») en vez de inventarles una sede.
`attendance_sucursal_obligatoria` es `CHECK (branch_id IS NOT NULL) NOT VALID`:
la base la exige en toda fila nueva sin reescribir las anteriores. Si algún día
el negocio confirma la sede de ese periodo, se asigna con un UPDATE explícito y
documentado, y la restricción se puede validar (`VALIDATE CONSTRAINT`).
