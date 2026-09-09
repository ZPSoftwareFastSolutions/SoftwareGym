# ADR 0004 — Identidad y aislamiento multi-tenant sobre Supabase

**Estado:** Aceptada · **Fecha:** 2026-09-09 · **Ámbito:** V2 → V4

## Contexto

El documento de arquitectura V2 preveía una API .NET con `JwtProvider.cs`
propio, EF Core con filtro global de tenant e interceptor de `SaveChanges` que
estampara el `TenantId`. La base de datos quedaba como detalle de
infraestructura.

Después se decidió que la base viviera en **Supabase**, que no es solo un
PostgreSQL alojado: trae autenticación (GoTrue) y Row Level Security como
mecanismo de autorización a nivel de fila.

Eso abre una pregunta que el documento maestro dejaba explícitamente abierta
(§133): dónde vive la identidad y dónde se garantiza el aislamiento.

## Decisión

**La identidad la gestiona Supabase Auth. El aislamiento lo garantiza RLS en la
base de datos.**

- Las credenciales viven en `auth.users`. No se implementa hashing, expiración
  de tokens, recuperación de contraseña ni rotación de refresh.
- `public.app_users` es el perfil de negocio y ata cada cuenta con su gimnasio.
- El modelo de autorización es **Usuario → Rol → Permiso**, en tablas.
- Toda tabla de negocio lleva `tenant_id`, tiene RLS activo y sus políticas se
  expresan sobre `app.current_tenant_id()`.

## Alternativas consideradas

**API .NET con autenticación propia y Supabase como PostgreSQL a secas.** Es lo
que decía el plan original. Se descarta como mecanismo *principal* por dos
motivos. El primero: reimplementar autenticación es donde más se pierde, y el
documento maestro (§40) exige almacenamiento seguro de contraseñas, expiración
de tokens de recuperación, protección de sesión y rate limiting —todo eso ya
resuelto y auditado en Supabase—. El segundo es más importante y va abajo.

**Filtro global de EF Core como garantía de aislamiento.** Un filtro global es
una convención del código de aplicación: `IgnoreQueryFilters()` lo desactiva
entero, incluido el de tenant, y basta un desarrollador con prisa para abrir la
fuga. RLS se evalúa en el motor, por debajo de cualquier ORM y de cualquier
consulta escrita a mano. Es una garantía, no una convención.

## Consecuencias

**A favor**

- El aislamiento no depende de que nadie se acuerde de filtrar. Se verificó que
  un usuario de un gimnasio no puede leer, insertar ni modificar datos de otro
  ni conociendo el `id` exacto de la fila.
- El rol CLIENTE se resuelve por identidad (`app.current_customer_id()`) y no
  por permiso, lo que impide el error clásico de darle `customers.read` al
  socio y abrirle la ficha de todos sus compañeros.
- Añadir Entrenador o Gerente de sucursal es insertar filas, no tocar código.

**En contra, y hay que asumirlo**

- **La clave `service_role` tiene `BYPASSRLS`.** Salta todas las políticas. Si
  se filtra o si un servidor la usa por comodidad, la garantía desaparece. No
  puede llegar nunca al navegador.
- La lógica de autorización queda repartida: los permisos de módulo están en
  tablas y las reglas de fila en políticas SQL. Hay que leer las dos para
  entender quién puede qué.
- Depender de Supabase Auth es una atadura real. Migrar a otro proveedor
  implicaría reemitir credenciales para todos los usuarios.

**Esto no cancela la API .NET.** ARCHITECV2 sigue en pie: la API puede
construirse encima y hablar con la misma base. La condición es que **propague
el JWT del usuario** en lugar de conectarse con `service_role`. Si se conecta
como `service_role`, el aislamiento vuelve a depender del código de aplicación
y esta decisión pierde su sentido.

## Pendiente

Automatizar la prueba de aislamiento en CI. Hoy se ejecutó a mano y pasó; una
prueba manual se degrada. Es el único control del sistema que no se deteriora
con el tiempo mientras esté automatizado.
