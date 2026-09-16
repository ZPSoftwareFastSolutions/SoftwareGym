# Runbook — Despliegue de la landing de Mítico Fitness

> Rama `miticogym-v1`. Publica un sitio **estático y sin servicios externos**:
> no hay base de datos, ni autenticación, ni variables de entorno que
> configurar. Ver [ADR 0012](../architecture/adr/0012-landing-sin-base-de-datos.md).

## Entorno

| | |
|---|---|
| Plataforma | Vercel |
| Framework | Next.js 16 (App Router) |
| Salida | Estático prerenderizado (10 páginas) |
| Node | 20 o superior |
| Variables de entorno | **Ninguna** |
| Proyecto de Vercel | **Por crear.** Ver más abajo |

La configuración de build vive en `apps/web/vercel.json`.

## Antes de desplegar

```bash
cd apps/web
npm install
npm run typecheck
npm test
npm run build
npm audit
```

El build **valida la configuración del gimnasio**: si `mitico.tenant.ts` tiene
una errata (una sede sin siete días, una clase que apunta a una sucursal que no
existe, un enlace del menú que no exige su capacidad), el build falla. Es a
propósito: sin panel ni base de datos, el validador es lo único que hay entre
una errata y lo que se publica.

## Proyecto de Vercel

⚠️ **`apps/web/.vercel` apunta hoy al proyecto `gold-gym`**, que sirve la rama
`feat/goldgym-v1` (otro cliente). Un `vercel deploy --prod` desde aquí
**actualizaría el sitio de Gold's Gym con la landing de Mítico**.

Antes del primer despliegue de esta rama hay que apuntar a un proyecto propio:

```bash
cd apps/web
npx vercel whoami                       # cuenta zapasoftwarefastsolutions-1320
npx vercel link --yes --project mitico-gym
```

Si el proyecto no existe, `vercel link` ofrece crearlo.

## Desplegar

Desde `apps/web`, **no desde la raíz del repositorio**:

```bash
cd apps/web
npx vercel deploy --yes          # vista previa
npx vercel deploy --prod --yes   # producción
```

> **El despliegue por push de Git no funciona en estos proyectos** y es
> esperable: se crearon por CLI desde `apps/web`, con Root Directory en la raíz.
> Cambiarlo arregla Git y rompe la CLI. Se despliega por CLI.

## El alias público

Un proyecto nuevo nace con dos alias y **solo uno es público**:
`<proyecto>-<equipo>.vercel.app` está protegido por Vercel Authentication (302 a
`vercel.com/sso-api`) y `<proyecto>-<sufijo>.vercel.app` es el que se comparte.

```bash
npx vercel alias ls
```

**No adivinar el alias por el nombre.** Ya pasó con `gold-gym.vercel.app`, que
existe, respondió 200 y era una aplicación de otra cuenta. Verificar siempre el
`<title>` servido antes de dar una URL por buena:

```bash
curl -s https://<alias>/mitico | grep -o '<title>[^<]*</title>'
```

Debe decir `Mítico Fitness — El dolor que sientes hoy es la fuerza que tendrás mañana`.

## Verificación tras desplegar

```bash
B=https://<alias>
for r in / /mitico /mitico/planes /mitico/clases /mitico/horarios /mitico/instalaciones \
         /mitico/sucursales /mitico/contacto /mitico/galeria /mitico/nosotros /mitico/servicios \
         /mitico/acceso /mitico/panel /mitico/pago/qr /no-existe; do
  printf "%-26s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' "$B$r")"
done
curl -sI "$B/mitico" | grep -iE 'permissions-policy|content-security-policy|x-frame-options'
```

Esperado:

| Ruta | Código |
|---|---|
| `/` | 308 (permanente a `/mitico`) |
| Las diez páginas del gimnasio | 200 |
| `/mitico/acceso`, `/mitico/panel`, `/mitico/pago/qr` | 404 |
| `/no-existe` | 404 |

Y en las cabeceras: `camera=()`, `connect-src 'self'`, `X-Frame-Options: DENY`.

## Rollback

```bash
cd apps/web
npx vercel ls                          # lista de despliegues
npx vercel promote <url-del-anterior>  # vuelve a producción
```

No hay migraciones que revertir ni datos que restaurar: el sitio es el build.
