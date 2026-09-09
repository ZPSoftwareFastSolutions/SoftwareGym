# GymPlatform.Domain

Capa más interna. **No depende de nada.**

## Contiene

- Entidades con comportamiento y setters privados.
- Raíces de agregado y sus invariantes.
- Value objects: `Email`, `Dinero`, `TenantId`, `Telefono`.
- Eventos de dominio.
- Errores de dominio tipados.

## No contiene

- Atributos de persistencia (`[Table]`, `[Column]`, `[Key]`): esa configuración
  vive en `IEntityTypeConfiguration<T>`, dentro de Infrastructure.
- Interfaces de repositorio: se declaran en Application, donde se consumen. Esa
  es la dirección correcta de la inversión de dependencias.
- DTOs.

## Reglas

Una entidad anémica —solo `{ get; set; }` con toda la lógica en un service— no
es dominio: es un DTO con nombre de entidad. El estado cambia por métodos con
nombre de negocio (`membresia.Renovar()`), nunca asignando propiedades desde
fuera.

El agregado es la **frontera de consistencia transaccional**: una transacción
modifica exactamente un agregado. Si hacen falta dos, o son en realidad uno
solo, o la consistencia debe ser eventual mediante un evento de dominio.

Referencias entre agregados **por Id**, nunca por navegación de objeto.

## Entidades previstas para V1.5

`Tenant` · `TenantConfiguration` · `User` · `Role` · `Customer` ·
`MembershipPlan` · `Membership` · `Payment` · `AuditLog`
