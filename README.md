# GYM PLATFORM

**Software enlatado vertical para gimnasios.** Una sola base de código que se
despliega para múltiples clientes cambiando configuración, no código.

Desarrollado por **ZP Software Fast Solutions**.

**Demo en vivo:** https://gym-platform-alpha.vercel.app

| | |
|---|---|
| Vitrina de la plataforma | https://gym-platform-alpha.vercel.app |
| Mítico Fitness | https://gym-platform-alpha.vercel.app/mitico |
| Aurora Fit | https://gym-platform-alpha.vercel.app/aurora-fit |

---

## Estado

| Versión | Alcance | Estado |
|---|---|---|
| **V1** | Sitio público multi-tenant | ✅ Entregado |
| **V2** | Supabase (Auth, PostgreSQL con RLS, Storage), login y registro | ✅ Entregado |
| **V2.1** | Dashboards por rol, asistencia con QR, notificaciones, reportes | ✅ Entregado |
| **V2.2** | Gestión de socios, cobro por QR con comprobantes, racha, reportes híbridos | ✅ Entregado · rama `feat/v2.2-gestion` |
| V3 | Reservas, entrenadores, rutinas, clases | Siguiente |
| V4 | Multi-sucursal, suscripciones, facturación | Pendiente |

> **La descripción completa y vigente del sistema** —arquitectura, modelo de
> datos, seguridad, rutas, flujos, despliegue, deuda y punto de partida de V3—
> está en [`CLAUDE.md`](CLAUDE.md). Este README resume; si discrepan, manda
> `CLAUDE.md`. La API .NET prevista para V1.5 no se construyó: Supabase la
> sustituye (ADR 0004).

---

## La prueba de aceptación

> **Dar de alta un gimnasio son dos pasos: crear su archivo de configuración y
> registrarlo. Si hiciera falta tocar un componente, una ruta, una hoja de
> estilo o una consulta, el producto habría dejado de ser enlatado.**

Los dos gimnasios incluidos existen para demostrarlo: comparten el 100 % del
código y no comparten ni un color, ni una tipografía, ni una forma, ni un texto.

| | Mítico Fitness | Aurora Fit |
|---|---|---|
| Ruta | `/mitico` | `/aurora-fit` |
| Tema | Oscuro | Claro |
| Paleta | Verde neón sobre negro carbón | Terracota sobre blanco cálido |
| Tipografía | Bebas Neue, caja alta | Fraunces serif, caja mixta |
| Forma | Esquinas suaves, cristal, resplandor | Redondeadas, elevadas, sin resplandor |
| Planes | 3, mensuales | 4, periodicidad mixta |
| Capacidades | Equipo y FAQ activos | Equipo, FAQ y mapa apagados |

---

## Arranque rápido

```bash
cd apps/web
npm install
npm run dev
```

| Ruta | Contenido |
|---|---|
| `http://localhost:3000/` | Vitrina de la plataforma |
| `http://localhost:3000/mitico` | Mítico Fitness |
| `http://localhost:3000/aurora-fit` | Aurora Fit |

```bash
npm run typecheck   # tipos
npm run build       # compila y valida toda la configuración de tenants
npm run start       # servidor de producción
```

---

## Qué incluye

### Sistema privado (V2 → V2.2)

- **Acceso de socios** con Supabase Auth: cookie `HttpOnly`, confirmación de
  correo, cuentas vinculadas a su ficha.
- **Tres espacios de trabajo** según permisos: plataforma, gimnasio (gerencia y
  recepción) y socio.
- **Asistencia** con check-in por cámara o lector, estadísticas y mapa de calor.
- **Gestión de socios**: alta con plan, cobro y QR; ficha completa; edición,
  venta y corrección de membresías (recepción crea, gerencia corrige).
- **Cobro por QR** con comprobantes: el socio sube la captura, el personal la
  aprueba y se crean membresía y pago; descarga en ZIP.
- **Reportes** con filtros por periodo, plan, método y rol; CSV e impresión a PDF.
- **Aislamiento entre gimnasios en la base** (RLS en todas las tablas),
  verificado con sesiones simuladas por rol.

### Sitio público (V1)

**Nueve rutas por gimnasio:** Inicio · Nosotros · Servicios · Planes ·
Instalaciones · Galería · Horarios · Contacto · Acceso socios.

- Navegación con estado activo, menú móvil accesible y migas de pan.
- Sistema de temas completo derivado de la configuración del cliente.
- 22 feature flags: apagar una quita el enlace **y** hace que la ruta responda 404.
- WhatsApp flotante con mensaje precargado por gimnasio.
- Enlaces a redes sociales (inertes y anunciados como tales mientras estén vacíos).
- SEO por tenant, `sitemap.xml` y `robots.txt` generados desde el dominio.
- Cabeceras de seguridad: CSP, HSTS-ready, `nosniff`, `frame-ancestors`, `Referrer-Policy`.
- Responsive de 320 px en adelante, con `prefers-reduced-motion` respetado.

**Métricas del build:** 24 páginas estáticas · ~106 kB de JS inicial · sin
librería de animación ni de iconos · `npm audit` sin vulnerabilidades.

---

## Estructura

```text
apps/web/                Sitio público (Next.js 16 · TypeScript · Tailwind v4)
  src/core/domain/       Contratos y reglas. Sin framework.
  src/core/application/  Casos de uso, puertos, derivación del tema
  src/infrastructure/    Adaptadores, validación, composition root
  src/presentation/      UI (atomic design)
  src/app/               Rutas
  tenants/               Configuración por gimnasio
src/Backend/             API .NET (V1.5)
docs/                    Arquitectura, ADR, guías de alta, runbooks
```

Las dependencias apuntan **solo hacia adentro**: Domain no depende de nada,
Infrastructure implementa los puertos que Application declara, y ningún
componente construye adaptadores fuera del composition root.

---

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/architecture/overview.md`](docs/architecture/overview.md) | Arquitectura completa, capas, seguridad, deuda declarada |
| [`docs/architecture/theming.md`](docs/architecture/theming.md) | Sistema de temas y cadena de tokens |
| [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md) | Aislamiento, feature flags y vectores de fuga |
| [`docs/tenants/alta-de-gimnasio.md`](docs/tenants/alta-de-gimnasio.md) | **Procedimiento para incorporar un cliente** |
| [`docs/runbooks/despliegue.md`](docs/runbooks/despliegue.md) | Despliegue y operación |
| [`docs/architecture/adr/`](docs/architecture/adr/) | Decisiones con su motivo y sus consecuencias |

---

## Añadir un gimnasio

```bash
cp apps/web/tenants/mitico.tenant.ts apps/web/tenants/nuevo-gym.tenant.ts
# editar la configuración y registrarlo en tenant.registry.ts
npm run build   # el validador comprueba la configuración; falla si algo está mal
```

Procedimiento completo, checklist de publicación y errores frecuentes en
[`docs/tenants/alta-de-gimnasio.md`](docs/tenants/alta-de-gimnasio.md).

---

## Lo que todavía **no** hace

Declarado de forma explícita para que nadie lo suponga:

- **No hay tests automatizados ni CI.** Es la primera deuda a saldar.
- **Las migraciones de la base no están en el repositorio**: viven en Supabase
  y se listan en [`supabase/migrations/README.md`](supabase/migrations/README.md).
- **La configuración de cada gimnasio sigue en archivos**, no en la base.
- **El formulario de contacto no envía a un servidor.** Abre WhatsApp con los
  datos redactados, y así se indica en la propia página.
- **Las fotografías no son reales.** Se dibujan composiciones generativas con
  los colores de cada marca hasta que el cliente entregue su material.
- **Las cuentas de demostración usan contraseñas predecibles.** Hay que
  eliminarlas antes de cualquier uso con datos reales.
