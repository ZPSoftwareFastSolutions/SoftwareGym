# Base de datos — GYM PLATFORM V2

Proyecto Supabase: **`ZPSoftwareFastSolutions's Project`** · ref `dnclwawnjnzqqxgsuhpn`
· PostgreSQL 17 · región `us-west-2`.

## Cómo está organizado

| Esquema | Qué contiene | ¿Publicado como API REST? |
|---|---|---|
| `public` | Tablas y vistas de negocio | **Sí** — PostgREST lo expone |
| `app` | Funciones de contexto y autorización | **No** — deliberadamente fuera de la API |
| `auth` | Credenciales, gestionado por Supabase Auth | Solo vía SDK |

La separación no es cosmética. PostgREST publica cada función de `public` como
endpoint `/rest/v1/rpc/...`. Las funciones de contexto son `SECURITY DEFINER`
—se ejecutan con privilegios del propietario— y no deben ser invocables desde
fuera. Viven en `app`, que PostgREST no publica; las políticas RLS pueden
usarlas igual, porque su evaluación es interna a la base.

## El aislamiento entre gimnasios

Es lo único que no se puede negociar. Está construido en tres capas:

1. **`tenant_id` en toda tabla de negocio**, y como **primera columna de todo
   índice**. Sin eso la consulta filtrada por gimnasio recorre las filas de los
   demás.
2. **RLS activo con cero políticas por defecto.** PostgreSQL deniega cuando no
   hay política: el «denegar por defecto» está en la base, no en la aplicación.
3. **`app.current_tenant_id()` como única fuente del tenant.** Se deriva de la
   identidad autenticada. Un `tenant_id` enviado por el cliente jamás se usa
   para decidir acceso.

Cada `INSERT` y `UPDATE` lleva además `WITH CHECK`: el filtro de lectura impide
*ver* datos ajenos, pero sin `WITH CHECK` un usuario podría *escribir* una fila
con el `tenant_id` de otro gimnasio.

> **Riesgo a vigilar.** La clave `service_role` de Supabase tiene `BYPASSRLS`:
> salta todas las políticas de esta base. Nunca debe llegar al navegador ni a
> un cliente. Si la futura API .NET la usa, el aislamiento vuelve a depender del
> código de la aplicación y se pierde la garantía que da la base. La forma
> correcta es que la API propague el JWT del usuario.

## Migraciones

El historial vive en `supabase_migrations.schema_migrations` dentro del
proyecto. Para materializarlo en este repositorio hace falta la CLI de
Supabase:

```bash
npx supabase link --project-ref dnclwawnjnzqqxgsuhpn
```

```bash
npx supabase db pull
```

Eso escribe los archivos `.sql` en `supabase/migrations/`. **Está pendiente**:
hasta que se haga, el esquema está versionado en el servidor pero no en el
repositorio, que es justo lo que la regla §47 del documento maestro pide evitar.

> **Estado al cierre de V2.2 (2026-09-10): 27 migraciones, 17 tablas con RLS,
> 14 vistas, 53 políticas en `public` y 7 en `storage`, 2 buckets.** El
> inventario completo y vigente está en
> [`migrations/README.md`](migrations/README.md) y el modelo de datos en la §4
> de [`/CLAUDE.md`](../CLAUDE.md). La tabla de abajo cubre solo la base inicial
> de V2.

Migraciones iniciales de V2, en orden:

| # | Nombre | Qué hace |
|---|---|---|
| 0001 | `tipos_y_plataforma` | Enums y tabla `tenants` |
| 0002 | `identidad_roles_permisos` | `app_users`, `roles`, `permissions`, y sus uniones |
| 0003 | `contexto_de_tenant` | Funciones de contexto y autorización |
| 0004 | `dominio_gimnasio` | `customers`, `membership_plans`, `memberships`, `payments` |
| 0005 | `asistencia_auditoria_vistas` | `attendance_records`, `audit_log`, vistas derivadas |
| 0006 | `politicas_rls` | Primera tanda de políticas |
| 0007 | `portal_del_cliente` | Vínculo socio ↔ cuenta y políticas «solo lo mío» |
| 0008 | `semilla_roles_permisos` | 20 permisos y los 4 roles del sistema |
| 0009 | `esquema_privado_app` | Funciones movidas fuera de la API expuesta |
| 0010 | `repuntar_politicas_y_triggers` | Políticas y triggers apuntando a `app.*` |
| 0011 | `semilla_tenants_y_planes` | Mítico y Aurora Fit con sus planes reales |

## Decisiones que conviene no revisitar sin motivo

- **`membership_status` no incluye «por vencer».** Es un valor derivado de
  `end_date`; guardarlo obligaría a un proceso diario que lo recalcule y
  permitiría que la fila contradiga a la fecha. Se calcula en `v_memberships`.
- **Las vistas llevan `security_invoker = true`.** Por omisión una vista se
  ejecuta con los permisos de su propietario y **saltaría el RLS** de las
  tablas que consulta: una fuga entre gimnasios servida en bandeja.
- **Los pagos no tienen política de `UPDATE` ni `DELETE`.** Un cobro registrado
  no se edita: si hubo error se registra el asiento inverso.
- **Los socios no se borran.** Se archivan con `deleted_at`. Borrar un socio con
  histórico de pagos es perder contabilidad.
- **El precio se congela en `memberships.price`.** Si el plan sube de 250 a 300,
  la membresía vendida en 250 sigue valiendo 250.
- **El super administrador NO lee los socios ni los pagos de sus clientes.**
  Administrar gimnasios no es lo mismo que ver los datos personales de sus
  socios. Es mínimo privilegio, y el documento maestro (§39, §112) lo pide
  explícitamente.

## Prueba de aislamiento

Se verificó con dos recepcionistas de gimnasios distintos y un socio del portal,
simulando la sesión con `set local role authenticated` y el `sub` del JWT:

| Escenario | Resultado |
|---|---|
| Recepción de Mítico lista socios | Solo los suyos (1 de 2) |
| Recepción de Aurora lista socios | Solo los suyos (1 de 2) |
| Aurora lee el socio de Mítico **por su id exacto** | 0 filas |
| Aurora da de alta un socio en Mítico | Bloqueado por RLS |
| Aurora edita el socio de Mítico | Bloqueado: la fila no es visible |
| Aurora registra un cobro en Mítico | Bloqueado por RLS |
| Socio del portal lista socios | Solo su propia ficha, con un compañero en el mismo gimnasio |
| Socio del portal comprueba permisos de recepción | Ninguno |

Los datos de la prueba se retiraron. **Falta automatizarla**: mientras sea
manual, se degrada. Es el punto 15 de la lista de pendientes del documento
maestro y el único control que no se deteriora con el tiempo si está en CI.
