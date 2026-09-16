# Correo de confirmación de cuenta — cómo se genera y cómo se instala

> V4.2 · §17 del encargo de GOLD. Última revisión: 2026-09-16.

## Qué problema resuelve

El correo que recibe alguien al registrarse **no lo envía esta aplicación**: lo
envía **Supabase Auth** con una plantilla guardada en la configuración del
proyecto. Esa plantilla es **una sola para los tres gimnasios** (Mítico, Aurora
Fit y Gold's Gym Premium comparten el proyecto `dnclwawnjnzqqxgsuhpn`).

Poner ahí el negro y dorado de GOLD dejaría a Mítico con el correo de otra
marca. Por eso la plantilla no se escribe a mano: **se genera** desde el registro
de gimnasios y elige la marca en tiempo de envío.

## Cómo elige la marca

El alta (`/[tenant]/acceso`, acción `registrarCuenta`) ya manda al registrarse:

```ts
data: { tenant_slug: slug, full_name: fullName }
```

Supabase expone esos metadatos en la plantilla como `.Data`, e interpola con
`text/template` de Go. La plantilla generada abre con:

```gotemplate
{{ if eq (printf "%v" .Data.tenant_slug) "mitico" }}
  … cuerpo con la marca de Mítico …
{{ else if eq (printf "%v" .Data.tenant_slug) "aurora-fit" }}
  …
{{ else }}
  … cuerpo de respaldo (la primera marca del registro) …
{{ end }}
```

El `printf "%v"` no es adorno: comparar con `eq` un metadato **ausente** contra
una cadena es un error de ejecución en Go, y ese error no rompe una página que
se pueda recargar —rompe el único correo que activa la cuenta—.

## Regenerar

```bash
cd apps/web
npm run correo
```

Escribe dos archivos en `docs/correo/`:

| Archivo | Para qué |
|---|---|
| `confirmacion.html` | Lo que se pega en el panel de Supabase |
| `confirmacion.txt` | Cuerpo en texto plano por gimnasio (los filtros de spam castigan el correo solo-HTML) |

**Se regenera cuando:** se da de alta un gimnasio, cambia la paleta de uno,
cambia su logotipo o cambia su correo de contacto. El generador lee
`TENANT_REGISTRY`, así que no hay una segunda lista que mantener.

## Instalar la plantilla (paso humano)

El asistente **no toca la configuración de Auth**: hace falta autorización
explícita y la consola no expone ese ajuste por MCP. Lo hace una persona:

1. Panel de Supabase → proyecto `dnclwawnjnzqqxgsuhpn`.
2. **Authentication → Emails → Confirm signup**.
3. **Subject**: `Confirma tu correo para activar tu cuenta`.
4. **Message body**: pegar el contenido íntegro de `docs/correo/confirmacion.html`.
5. Guardar.

### Antes de dar por bueno el cambio

- **Authentication → URL Configuration**: la *Site URL* y las *Redirect URLs*
  tienen que incluir el dominio real y `…/auth/confirmar*`. Sin eso el botón del
  correo lleva a `localhost` (§12.15 de `CLAUDE.md`).
- Registrar una cuenta de prueba en **cada** gimnasio y comprobar que llega con
  su marca. Es la única forma de verificar la rama del `else if`: la plantilla se
  interpola en el servidor de Supabase, no aquí.
- Abrir el correo en el teléfono: el cuerpo está pensado a 520 px de ancho
  máximo y con tablas, que es lo único que se ve igual en Gmail, Outlook y el
  cliente de un móvil.

## Qué NO cambia este trabajo

- **El mecanismo de autenticación** (§17 lo pide explícitamente). El enlace sigue
  siendo `{{ .ConfirmationURL }}`, que Supabase construye con el `redirect_to`
  que manda el formulario. No se arma ninguna URL a mano.
- **El flujo posterior**, que ya se arregló en la etapa 1 de V4.2: confirmar el
  enlace deja la sesión abierta y lleva a `/<slug>/panel`, no al formulario de
  acceso.

## Archivos

| Archivo | Qué es |
|---|---|
| `apps/web/src/core/domain/tenant/correo-de-confirmacion.ts` | El generador. Puro, sin I/O, con pruebas en `apps/web/tests/v4-2-correo-de-confirmacion.test.ts` |
| `apps/web/scripts/plantilla-de-correo.mjs` | Lee el registro de gimnasios y escribe los archivos |
| `docs/correo/confirmacion.html` · `.txt` | Generados. No se editan a mano: el siguiente `npm run correo` los pisa |
