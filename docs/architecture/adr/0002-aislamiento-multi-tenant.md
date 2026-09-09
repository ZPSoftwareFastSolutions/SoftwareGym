# ADR 0002 — Estrategia de aislamiento multi-tenant

**Estado:** Aceptada · **Fecha:** 2026-09-08 · **Ámbito:** V1 → V4

## Contexto

El documento fundacional planteaba **una base de datos separada por gimnasio**.
Es la opción más intuitiva y la que mejor suena en una conversación comercial:
"tus datos están en tu propia base".

Con dos clientes es cómodo. Con veinte, cada cambio de esquema pasa a ser veinte
migraciones coordinadas, veinte ventanas de mantenimiento y veinte formas de
quedar desincronizado. El coste no crece: se multiplica.

## Decisión

**Columna discriminadora `TenantId`** sobre una base compartida, con filtro
global obligatorio en el ORM.

La separación física queda reservada para un cliente que la exija por
cumplimiento normativo y la pague, y se implementa como un caso especial, no
como el modelo por defecto.

## Motivos

1. Una sola migración por cambio de esquema, sin importar cuántos clientes haya.
2. Una mejora hecha para un gimnasio queda disponible para todos: es el objetivo
   declarado del producto enlatado.
3. El aislamiento lógico bien implementado —filtro global, `TenantId` primero en
   todo índice, interceptor en `SaveChanges`— es sólido. Los incidentes reales
   de multi-tenancy no ocurren en la consulta principal: ocurren en la caché,
   los jobs, las exportaciones y los logs, y **esos vectores fallan igual con
   bases separadas**.
4. El coste por cliente es marginal, que es la condición para que el modelo
   comercial funcione.

## Consecuencias

**Obligaciones que esta decisión impone** (todas en `multi-tenancy.md`):

- `TenantId NOT NULL` en toda tabla de negocio.
- `TenantId` como primera columna de todo índice.
- Filtro global en EF Core sobre toda entidad `ITenantOwned`.
- `TenantId` en **toda** clave de caché.
- `TenantScope` explícito en jobs en background.
- Test de aislamiento automatizado sobre la lista completa de rutas, en CI.

**Riesgo asumido:** una consulta que se salte el filtro global expone datos de
otro cliente. Se mitiga con el test de aislamiento en CI y con revisión línea a
línea de todo SQL escrito a mano.

## Revisión

Se reevalúa si aparece un cliente con requisito regulatorio de separación
física, o si un tenant alcanza un volumen que degrade a los demás.
