# ADR 0010 · Administración del gimnasio, jerarquía de roles y rendimiento con volumen (V4)

- **Estado:** aceptada · 2026-09-14 (migraciones escritas; se aplican con autorización del dueño de la base)
- **Contexto de versión:** V4 (rama `feat/v4-seradmingym`, sale de `feat/v3.4-reservas`)
- **Relacionadas:** ADR 0004 (identidad y aislamiento), ADR 0007 (rutinas)

## Contexto

El pedido tiene cuatro partes: un nivel de «Admin/Superadmin» con control total del
gimnasio sin cruzar a otro; la duplicación «Día A · Día A · Empuje» en rutinas; la
lentitud de las páginas con muchos registros; y el desplazamiento horizontal de la
navegación de gerencia (13 pestañas).

Lo que se encontró al revisar el sistema real:

1. No existía un rol por encima de Gerencia ni una pantalla de personal. Y la
   política `user_roles_insert_gimnasio` dejaba a quien tuviera `users.manage` dar
   CUALQUIER rol de alcance `tenant`: miraba el alcance, no el nivel.
2. La autorización es coherente en todas las capas: la pantalla decide por permisos
   (`v_my_profile`) y la base por los mismos permisos (`app.has_permission`). No hay
   inconsistencia de rol entre el frontend y el backend que corregir.
3. La duplicación estaba en los DATOS: nombre «Día A · Empuje» + etiqueta «Día A»,
   unidos por cinco pantallas; la ayuda del formulario sugería ese nombre.
4. Con 2 000 socios y 50 000 entradas (medido en transacción revertida), contar
   asistencias tardaba > 20 s y el dashboard superaba el `statement_timeout`: las
   políticas llamaban a `app.tenant_allows(tenant_id, …)` en cada fila.

## Decisión 1 · «Admin/Superadmin» es un rol DE GIMNASIO (`admin`), no la plataforma

`super_admin` sigue siendo la plataforma (decisión 17: no lee socios ni pagos). El
nuevo `admin` («Administración») tiene todos los permisos de gimnasio —lo de Gerencia
más `roles.manage`— y ninguno de plataforma. Es un rol de alcance `tenant`: cada
política lo ata a SU gimnasio con el mismo `tenant_id = app.current_tenant_id()`, así
que el aislamiento no depende de ninguna regla nueva.

Su espacio de trabajo es `panel/administracion` (resumen con la estructura del de
gerencia: estado del negocio, personal, todos los módulos y cambios administrativos);
la operación del día sigue en `panel/gimnasio`.

## Decisión 2 · La jerarquía es un número en la base: `roles.level`

admin 40 · gerencia 30 · recepción 20 · entrenador 10 · socio 0 · plataforma 100.

- Con `roles.manage` se otorga y quita hasta el propio nivel (un administrador nombra
  a otro). Con `users.manage` a secas, solo por debajo: Gerencia ya no nombra gerentes.
- Nadie toca sus propios roles ni su cuenta, ni la de alguien de nivel superior
  (`app.puede_administrar_cuenta`, también en la política de UPDATE de `app_users`).
- El gimnasio no se queda sin su último administrador activo (disparador).
- Escrituras por RPC invocador (`otorgar_rol`, `retirar_rol`, `cambiar_estado_de_cuenta`);
  autoría y auditoría (`role.granted`, `role.revoked`, `account.status_changed`) desde la sesión.
- El primer administrador de un gimnasio lo designa la plataforma sobre una cuenta ya
  registrada en ESE gimnasio (`designar_administrador_de_gimnasio`). Nadie crea
  cuentas ni contraseñas desde el panel.

El dominio (`workspace.ts`: `NIVEL_DE_ROL`, `puedeOtorgarRol`, `puedeAdministrarCuenta`)
replica la regla solo para no ofrecer botones que la base rechaza.

## Decisión 3 · Políticas con el contexto evaluado una vez por consulta

Las 126 llamadas `app.tenant_allows(col, 'p')` pasan a
`col = (select app.current_tenant_id()) and (select app.has_permission('p'))`, y el
resto del contexto (`current_customer_id()`…) se envuelve en `(select …)`. Mismo
significado (se comprobó que ninguna está bajo NOT/CASE/COALESCE); PostgreSQL lo
calcula como initPlan una vez por consulta. Verificación: huella md5 de filas visibles
por rol, idéntica antes y después.

**Regla desde V4:** una política nueva nunca llama a una función de contexto con una
columna de la fila como argumento ni sin envolverla en `(select …)`.

## Decisión 4 · Paginar en la base, contar en la base

- `v_customer_list` (lista sin las siete subconsultas de la ficha, con «sin venir» y
  «cumple este mes» calculados con la fecha del gimnasio) y `v_customer_counts`.
- `v_attendance_patterns`: día × hora × método × sede de 30 días; las estadísticas
  de asistencia dejan de contar las últimas 500 filas (que con volumen eran de pocos días).
- Socios, comprobantes, bitácora de asistencia y personal paginan con `range` + `count`.
- Reportes: totales, gráfico y CSV necesitan el periodo entero (tope 2 000, ahora
  avisado); la TABLA pinta 50 filas por página y «Ver todas las filas para imprimir»
  conserva la impresión completa.
- Los desplegables de socios leen id, código y nombre (`opciones()`), no fichas.

## Decisión 5 · Navegación agrupada, sin desplazamiento horizontal

Hasta 6 entradas, todas a la vista y envolviendo línea. Con más, grupos (Día a día,
Socios, Entrenamiento, Gestión) con menú en escritorio y un botón «Secciones» en
pantallas estrechas. Ninguna opción se quita. La lista de entradas vive en
`panel/_navegacion.ts` y la usan la navegación y el resumen de Administración.

## Decisión 6 · Estados de carga como mitigación, después de optimizar

`panel/loading.tsx` (esqueleto al cambiar de sección), `Paginacion` con giro en el
enlace pendiente (`useLinkStatus`), filtros con `next/form` y botón que se deshabilita,
ZIP de comprobantes que pide la lista al pulsar.

## Consecuencias

- Gerencia pierde la capacidad de nombrar otros gerentes (la gana Administración).
- La ficha completa (`v_customer_detail`) sigue siendo pesada por diseño: se usa para UN socio.
- Deuda: el catálogo de ejercicios no pagina (tope 500, URLs firmadas en lote); los
  reportes siguen trayendo hasta 2 000 filas para agregar en el servidor web (mudar
  sus agregados a vistas es el siguiente paso si un gimnasio los supera);
  `storage.objects` conserva sus políticas por fila (pocas filas por subida).
