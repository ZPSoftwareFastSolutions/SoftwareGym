# GymPlatform.Infrastructure

Implementa los puertos que declara Application. Es la capa reemplazable.

## Contiene

- `GymDbContext` y las `IEntityTypeConfiguration<T>`.
- Interceptores: auditoría, soft delete, estampado de `TenantId`.
- Migraciones.
- Proveedor de JWT y hashing de contraseñas.
- Clientes HTTP hacia terceros, con políticas de resiliencia.
- Implementación del repositorio de tenants que sustituirá al registro estático
  del sitio público.

## Reglas

**Multi-tenancy**
- Filtro global aplicado por reflexión a toda entidad `ITenantOwned`.
- Interceptor de `SaveChanges` que estampa el `TenantId` en cada entidad
  `Added`. Nunca confiar en que el handler lo asigne.
- Ningún `IgnoreQueryFilters()` sin filtro manual de tenant al lado y un
  comentario que lo justifique: quita **todos** los filtros, incluido el de
  tenant.

**Persistencia**
- Índice único filtrado para la unicidad con soft delete:
  `CREATE UNIQUE INDEX ... WHERE EliminadoEn IS NULL`. Sin esto, el sistema
  "recuerda" cuentas borradas y bloquea altas legítimas.
- `EnableRetryOnFailure` obliga a envolver toda transacción explícita en
  `CreateExecutionStrategy().ExecuteAsync(...)`, o EF lanza en ejecución.
- Migraciones **fuera del arranque de la aplicación**: N réplicas arrancando en
  paralelo compiten sobre el mismo esquema. Paso separado del pipeline, con
  `dotnet ef migrations bundle`.
- Revisar siempre el SQL generado, no la migración en C#: EF a veces resuelve un
  renombre como `DROP` + `ADD`, que es pérdida total de datos y en el modelo C#
  parece inofensivo.

**Seguridad**
- Contraseñas con Argon2id o bcrypt con coste alto. Nunca SHA ni MD5, ni
  siquiera con sal.
- Refresh tokens opacos, almacenados **hasheados**, con rotación y detección de
  reutilización.
- Secretos desde el gestor de secretos con identidad administrada. Nunca en
  `appsettings.json` ni en variables `ENV` del Dockerfile (quedan en las capas
  de la imagen para siempre).

## Patrón Outbox

No existe transacción atómica entre una base de datos y un broker de mensajes.
El evento se inserta en la tabla `Outbox` **en la misma transacción** que el
cambio de negocio, y un proceso aparte lo publica. El consumidor deduplica: la
entrega es at-least-once.
