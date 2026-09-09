# GymPlatform.Api

Capa de presentación de la API. Es el **composition root** de la solución.

## Contiene

- Endpoints (Minimal API) o controllers finos: reciben, delegan al handler,
  devuelven.
- Middleware: resolución de tenant, manejo global de excepciones, correlación.
- Configuración de autenticación, autorización, CORS y rate limiting.
- Registro de dependencias.

## Reglas

**Estructura**
- Sin lógica de negocio. Un endpoint que hace más que delegar está mal ubicado.
- Sin `DbContext` inyectado: solo casos de uso.
- Las entidades de dominio nunca se serializan hacia el exterior. Siempre DTO:
  evita el over-posting y el contrato accidental.

**Errores**
- `application/problem+json` desde el manejador global, con `traceId` en toda
  respuesta —es lo que permite a soporte correlacionar el reporte del usuario
  con el log exacto—.
- Nunca `ex.Message` crudo en un 5xx: filtra rutas del servidor, fragmentos de
  SQL y nombres de host.

**Autorización**
- Denegar por defecto: `FallbackPolicy` que exige autenticación. Los endpoints
  públicos se marcan con `[AllowAnonymous]`. Olvidar un atributo debe cerrar la
  puerta, nunca abrirla.
- Autorizar por **permiso**, no por rol: `[HasPermission(Permisos.PagosRegistrar)]`
  en vez de `[Authorize(Roles = "Admin")]` disperso por cien endpoints.
- Autorización a nivel de **recurso**, no solo de endpoint. Omitirla es IDOR:
  el usuario tiene el permiso, cambia el `id` de la URL y accede a datos ajenos.

**Configuración**
- Versionado por segmento de URL (`/api/v1/...`), sin versión por defecto
  implícita: un cliente que no la declara debe fallar ruidosamente.
- `ValidateScopes` y `ValidateOnBuild` activos **también en producción**. Una
  captive dependency —un `Singleton` que captura un `Scoped`— es silenciosa en
  desarrollo, y en multi-tenant significa un `DbContext` compartido entre
  peticiones de clientes distintos.
- Health checks separados: `/health/live` no consulta dependencias externas
  (si lo hiciera, un parpadeo de la base reiniciaría todos los pods sanos);
  `/health/ready` sí las verifica.
