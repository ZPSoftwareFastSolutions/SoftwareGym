# Multi-tenancy

Cómo conviven varios gimnasios sobre una sola base de código, y qué garantías
hay hoy frente a las que hacen falta cuando existan datos reales.

---

## 1. Modelo elegido

Tres estrategias posibles de aislamiento:

| Modelo | Aislamiento | Coste operativo | Cuándo |
|---|---|---|---|
| Columna discriminadora (`TenantId`) | Lógico | Bajo | **Elegido.** Cientos o miles de tenants |
| Schema por tenant | Medio | Alto: migraciones ×N | Decenas de tenants con esquemas divergentes |
| Base por tenant | Físico | Muy alto | Exigencia regulatoria o tenants enormes |

**Decisión:** columna discriminadora, salvo que aparezca un requisito de
cumplimiento explícito que obligue a separar físicamente. Los otros dos modelos
multiplican el coste de **cada** migración, y ese coste se paga para siempre.

El documento fundacional planteaba "base de datos separada por gimnasio". Se
descartó: con dos clientes es cómodo y con veinte es inviable —cada cambio de
esquema pasa a ser veinte despliegues coordinados—. La decisión completa está
en [`adr/0002-aislamiento-multi-tenant.md`](./adr/0002-aislamiento-multi-tenant.md).

---

## 2. Resolución del tenant

Dos mecanismos, mismo resultado:

### Por ruta (V1, activo)

```
/mitico/planes        → Mítico Fitness
/aurora-fit/planes    → Aurora Fit
```

Es explícito, se ve en los logs y en las trazas, y permite mostrar varios
clientes desde un único despliegue. Ideal para demostración y desarrollo.

### Por dominio (previsto, ya implementado en el puerto)

```
miticofitness.com     → Mítico Fitness
aurorafit.bo          → Aurora Fit
```

`TenantRepositoryPort.findByHost()` ya existe y `TenantConfig.domains` ya está
declarado. Cuando cada cliente tenga su dominio, un middleware reescribe el
host al slug correspondiente. Ninguna página cambia.

### Regla que no se negocia

> **El identificador de tenant nunca llega desde el body, la query string ni un
> header manipulable por el cliente.**

En V1 sale de la ruta prerenderizada. Desde V2, del claim `tenant_id` del token
autenticado. Un tenant que no se puede resolver debe **fallar cerrado**: nunca
degradar a "todos" ni a un valor por defecto.

---

## 3. Feature flags

22 capacidades declaradas en `FeatureFlags`. Dos reglas:

**1. El default de toda flag es `false`.** Una capacidad se enciende de forma
explícita. Un flag ausente jamás habilita nada: fallar cerrado es el único
comportamiento seguro cuando la configuración es un dato externo al código.

**2. Ocultar el enlace no basta.** Toda página protegida por una flag pasa por
`loadTenantPage(params, 'showGallery')`, que responde **404** si la capacidad
está apagada. Si el enlace desaparece del menú pero la URL sigue devolviendo
200, la capacidad no está desactivada: está escondida.

Verificación:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<sitio>/<tenant>/galeria
# 200 si showGallery está encendida, 404 si no
```

El 404 es **genérico**: no distingue "no existe" de "está apagada". Revelar la
diferencia da información sobre la configuración comercial de otro cliente.

---

## 4. Aislamiento en V1

En V1 no hay datos de usuario, ni sesiones, ni base de datos. La superficie de
fuga es pequeña, pero no es nula:

| Vector | Estado |
|---|---|
| Contenido de un tenant en la página de otro | ✅ Imposible: cada página se prerenderiza con una sola configuración |
| Configuración de un tenant filtrada por 404 | ✅ Mensaje genérico |
| Caché compartida entre tenants | ✅ No aplica: no hay caché de datos |
| Estado global entre peticiones | ✅ El repositorio es de solo lectura, sin estado por petición |
| Tema de un tenant aplicado a otro | ✅ Los tokens se emiten por página, no acumulados |

---

## 5. Aislamiento cuando existan datos (V2)

Esta sección es **el trabajo pendiente**, no lo entregado. Se escribe ahora
porque retrofittear aislamiento es carísimo y se hace mal bajo presión.

### 5.1 Capa de datos

```csharp
// Filtro global obligatorio para toda entidad ITenantOwned
builder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantContext.TenantId);
```

- `TenantId NOT NULL` en toda tabla de negocio.
- `TenantId` como **primera columna** de todo índice.
- Interceptor de `SaveChanges` que estampa `TenantId` en cada entidad `Added`.
  Nunca confiar en que el handler lo asigne.
- Ningún `IgnoreQueryFilters()` sin un filtro manual de tenant al lado y un
  comentario que lo justifique.

### 5.2 Los vectores que el filtro global NO cubre

Son los que producen los incidentes reales, porque nadie los revisa:

| Vector | Qué falla | Mitigación |
|---|---|---|
| **Caché** | Una clave sin tenant sirve datos ajenos al segundo visitante | `$"t:{tenantId}:pedido:{id}"` en **toda** clave |
| **Caché HTTP/CDN** | `Cache-Control: public` en respuesta autenticada | `private, no-store` en todo lo que lleve datos de tenant |
| **Inyección de dependencias** | Un `Singleton` que captura un `ITenantContext` con ámbito de petición queda fijado al primer tenant que llegó | `ValidateScopes` y `ValidateOnBuild` activos también en producción |
| **Jobs en background** | No hay `HttpContext`: o revienta o procesa todo | `TenantScope` explícito, uno por iteración |
| **Colas** | Un mensaje reprocesado con el tenant equivocado **escribe** en el inquilino incorrecto | `TenantId` en el mensaje, validado por el consumidor |
| **Exportaciones e informes** | Suelen usar SQL escrito a mano, fuera del filtro global | Revisión línea por línea de todo SQL crudo |
| **Buscador externo** | Elasticsearch no tiene tu filtro global | Índice por tenant, o filtro inyectado en el servidor |
| **Logs** | Un log con datos de negocio es visible para todo el que tenga acceso al stack de observabilidad | Registrar identificadores, no contenido |
| **Notificaciones** | Un correo con datos de otro inquilino es un incidente irreversible | Verificar destinatario contra el tenant del dato antes de enviar |

### 5.3 Prueba de aislamiento automatizada

El único control que no se degrada con el tiempo:

```csharp
[Theory, MemberData(nameof(TodosLosEndpointsDeRecurso))]
public async Task Endpoint_Con_Id_De_Otro_Tenant_No_Devuelve_Datos(string plantilla)
{
    var cliente = Factory.ClienteAutenticadoComo(TenantA);
    var resp = await cliente.GetAsync(plantilla.Replace("{id}", RecursoDeTenantB.ToString()));
    resp.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
}
```

Sobre la lista **completa** de rutas, en CI, en cada PR.

---

## 6. Principio

> En multi-tenant, **todo estado compartido entre peticiones es sospechoso
> hasta demostrar lo contrario.**

Ante la duda, particioná por tenant. El coste es despreciable comparado con un
incidente de divulgación entre clientes, que además es un incidente comercial
antes que técnico: se pierde al cliente afectado y a los que se enteran.
