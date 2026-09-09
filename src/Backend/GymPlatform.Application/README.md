# GymPlatform.Application

Casos de uso. Depende **solo** de Domain.

## Contiene

- `Commands` y `Queries` con sus handlers (CQRS con MediatR).
- Pipeline behaviors.
- **Puertos**: `IUnitOfWork`, `ITenantContext`, `IDateTimeProvider`,
  `IEmailSender` y los repositorios por agregado.
- Validadores de forma del request (FluentValidation).

## Orden del pipeline — no negociable

```text
1. RequestLogging       contexto de correlación
2. Validation           corta antes de tocar la base de datos
3. Authorization        política y RBAC sobre el request tipado
4. Idempotency          corta si la petición ya se procesó
5. Transaction          SOLO para ICommand, nunca para IQuery
6. Handler
7. DomainEventDispatch  después del commit, nunca antes
```

Un behavior mal ubicado abre transacciones sobre peticiones inválidas, toma
bloqueos de escritura en consultas de lectura, o registra datos que nunca
llegaron a persistirse.

## Reglas

- **Command** muta a través del agregado y devuelve `Result` o un identificador.
  Nunca el objeto completo.
- **Query** lee, no muta jamás y proyecta directamente a DTO sin pasar por el
  agregado.
- La regla de negocio vive en el agregado, no en el handler. Un handler con
  lógica de negocio es un dominio anémico disfrazado.
- FluentValidation valida la **forma** del request; el dominio valida las
  **reglas**.
- Aquí no aparece `Microsoft.EntityFrameworkCore`. Si aparece, el caso de uso ha
  quedado acoplado al ORM y deja de ser testeable sin base de datos.
- `try/catch` genérico dentro del handler: no. Eso pertenece al manejador global
  de excepciones.

## Flujo esperado ≠ excepción

"Cliente no encontrado" en una búsqueda es un `Result`, no un `throw`. Las
excepciones son caras y ocultan el flujo real del caso de uso.
