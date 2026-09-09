# Backend — GYM PLATFORM API

> **Estado: no implementado.** Esta estructura queda versionada para fijar la
> forma de la solución y las responsabilidades de cada capa antes de escribir la
> primera línea. Se materializa en **V1.5**.
>
> Se decidió no incluir proyectos vacíos que compilen sin hacer nada: es código
> muerto que hay que mantener y que confunde sobre lo que existe de verdad.

## Capas y Dependency Rule

```text
GymPlatform.Api             → Application, Infrastructure (solo composition root)
GymPlatform.Infrastructure  → Application, Domain
GymPlatform.Application     → Domain
GymPlatform.Domain          → NADA
```

`GymPlatform.Domain.csproj` no debe tener ninguna `PackageReference` fuera de la
BCL. Ni EF Core, ni MediatR, ni serializadores.

## Responsabilidad de cada proyecto

| Proyecto | Contiene | Nunca contiene |
|---|---|---|
| **Domain** | Entidades con comportamiento, value objects, invariantes, eventos de dominio, errores tipados | Atributos de persistencia, DTOs, interfaces de infraestructura |
| **Application** | Commands, Queries, handlers, pipeline behaviors, **puertos** (`IUnitOfWork`, `ITenantContext`, `IDateTimeProvider`) | `DbContext`, `HttpClient`, tipos de ASP.NET |
| **Infrastructure** | Implementación de los puertos, `DbContext`, `IEntityTypeConfiguration`, interceptores, migraciones, JWT | Reglas de negocio |
| **Api** | Endpoints, middleware, filtros, composition root | Lógica de negocio, acceso directo al `DbContext` |

## Test de arquitectura obligatorio

Sin esto, la Dependency Rule es una convención verbal que se degrada en el
primer sprint bajo presión:

```csharp
[Fact]
public void Domain_No_Debe_Depender_De_Otras_Capas()
{
    var resultado = Types.InAssembly(typeof(Tenant).Assembly)
        .ShouldNot()
        .HaveDependencyOnAny("GymPlatform.Application", "GymPlatform.Infrastructure",
                             "GymPlatform.Api", "Microsoft.EntityFrameworkCore")
        .GetResult();

    resultado.IsSuccessful.Should().BeTrue(
        string.Join(", ", resultado.FailingTypeNames ?? []));
}
```

## Reglas no negociables desde el primer commit

1. **`TenantId` nunca llega del cliente.** Sale del claim `tenant_id` del token
   autenticado. Un tenant que no se resuelve falla cerrado.
2. **Filtro global de tenant** en toda entidad `ITenantOwned`, más interceptor
   de `SaveChanges` que estampa el `TenantId` en cada entidad `Added`.
3. **`TenantId` como primera columna** de todo índice.
4. **Un `SaveChangesAsync` por caso de uso**, al final del handler.
5. **Nada de E/S remota dentro de una transacción abierta.**
6. **Idempotencia** en todo POST mutante, con índice único como árbitro. Nunca
   `SELECT` y después `INSERT`: dos peticiones concurrentes pasan ambas el
   `SELECT`.
7. **Concurrencia optimista** con `rowversion` en toda entidad editable.
8. **Errores como `application/problem+json`** (RFC 9457) desde v1: cambiar la
   forma del error después es un breaking change del contrato público.
9. **Paginación obligatoria** en toda colección, con máximo forzado en servidor.
10. **Las entidades de dominio nunca cruzan el límite del proceso.** Siempre DTO.

## Migración desde V1

El sitio público ya consume `TenantRepositoryPort`, no un archivo. Cuando esta
API exponga `GET /api/v1/tenants/{slug}/config`, la migración es sustituir la
implementación en el composition root del frontend. El puerto ya es asíncrono
justamente para que ese cambio no toque ningún consumidor.

Detalle de aislamiento en
[`../../docs/architecture/multi-tenancy.md`](../../docs/architecture/multi-tenancy.md).
