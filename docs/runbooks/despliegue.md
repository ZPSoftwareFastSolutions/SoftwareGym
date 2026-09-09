# Runbook — Despliegue del sitio público

## Entorno

| | |
|---|---|
| Plataforma | Vercel |
| Framework | Next.js 16 (App Router) |
| Salida | Estático prerenderizado |
| **Root Directory** | `apps/web` |
| Node | 20 o superior |
| Proyecto | `zp-software-fast-solutions/gym-platform` |
| URL pública | https://gym-platform-alpha.vercel.app |

La configuración de build vive en `apps/web/vercel.json`. El *Root Directory*
del proyecto debe ser `apps/web`: Vercel detecta el framework leyendo el
`package.json` de esa carpeta, no el de la raíz del repositorio.

> **Protección de despliegue.** Vercel Authentication viene activada por
> defecto y protege las URL de despliegue (`gym-platform-<hash>-...`). El alias
> de producción `gym-platform-alpha.vercel.app` es el que se comparte con
> clientes: es público. Si al enviarle el enlace a alguien le aparece una
> pantalla de login de Vercel, le pasaste una URL de despliegue en vez del
> alias.

---

## Variables de entorno

Ninguna es obligatoria: V1 no consume servicios autenticados y **no hay
secretos en este proyecto**.

| Variable | Efecto si falta |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `sitemap.xml` y `robots.txt` usan la URL por defecto. Conviene fijarla en producción |
| `NEXT_PUBLIC_DEFAULT_TENANT` | El tenant por defecto es `mitico` |

> Recordatorio: todo lo prefijado con `NEXT_PUBLIC_` llega al navegador y es
> **público por definición**. Nunca poner ahí una credencial.

---

## Despliegue

### Automático

Cada push a `main` despliega a producción. Cada PR genera un despliegue de
vista previa con su propia URL — es la forma correcta de que el cliente revise
cambios antes de publicarlos.

### Manual

```bash
npx vercel --prod
```

### Verificación previa (obligatoria)

```bash
cd apps/web
npm run typecheck
npm run build
```

El build ejecuta el validador de configuración de todos los tenants: si alguno
está mal, falla ahí y no en producción.

---

## Checklist post-despliegue

```bash
BASE=https://<dominio>

# Rutas
for u in / /mitico /aurora-fit /mitico/planes /aurora-fit/planes \
         /mitico/acceso /sitemap.xml /robots.txt; do
  printf "%-24s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' $BASE$u)"
done

# Un tenant inexistente debe dar 404, no 200 con página vacía
curl -s -o /dev/null -w 'inexistente: %{http_code}\n' $BASE/no-existe

# Cabeceras de seguridad
curl -sI $BASE/mitico | grep -iE 'content-security-policy|x-content-type|referrer-policy|x-frame'
```

Revisión manual:

- [ ] `/mitico` en verde sobre negro; `/aurora-fit` en terracota sobre claro.
      Si los dos se ven iguales, el tema no se está inyectando.
- [ ] Menú móvil abre, cierra con `Escape` y bloquea el scroll del fondo.
- [ ] WhatsApp abre con el número y el mensaje del gimnasio correcto.
- [ ] Sin scroll horizontal a 320 px.
- [ ] Recorrido completo con teclado: el foco siempre visible.

---

## Rollback

Vercel conserva todos los despliegues. En el panel: **Deployments → el anterior
que funcionaba → Promote to Production**. Es instantáneo y no requiere build.

Si la causa fue una configuración de tenant inválida, el build habría fallado
antes de desplegar. Un fallo en producción con build verde apunta a datos
—textos, precios, enlaces—, no a estructura.

---

## Diagnóstico

| Síntoma | Causa probable | Comprobación |
|---|---|---|
| Un tenant se ve con el tema de otro | El `<style>` del tema no se inyectó | Ver `:root` en el HTML servido |
| Un tenant nuevo da 404 | Falta en `TENANT_REGISTRY` | `tenant.registry.ts` |
| Una sección da 404 inesperadamente | Su feature flag está apagada | `features` del tenant |
| El sitemap apunta a la URL equivocada | `NEXT_PUBLIC_SITE_URL` sin fijar | Variables del proyecto |
| Fuentes que no cargan | CSP bloqueando | `font-src 'self'` en `next.config.ts` |
| Build falla con `InvalidTenantConfigError` | Configuración inválida | El mensaje enumera cada problema |

---

## Dominio propio por cliente

1. Añadir el dominio en el panel de Vercel y apuntar el DNS.
2. Declararlo en `TenantConfig.domains`.
3. Añadir el middleware de resolución por host (aún no implementado:
   `findByHost` ya existe en el puerto y está listo para usarse).

Hasta entonces, cada gimnasio se sirve bajo su ruta: `/<slug>`.
