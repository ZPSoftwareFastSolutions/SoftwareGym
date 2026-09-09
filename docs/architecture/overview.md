# Arquitectura — GYM PLATFORM

> Documento vivo. Toda decisión estructural que contradiga lo escrito aquí
> debe registrarse antes como un ADR en `docs/architecture/adr/`.

---

## 1. Qué se está construyendo

GYM PLATFORM es un **software enlatado vertical** para gimnasios: una única
base de código que se despliega para múltiples clientes cambiando
configuración, no código.

La prueba de aceptación arquitectónica del proyecto completo es una sola frase:

> **Dar de alta un gimnasio nuevo son dos pasos: crear su archivo de
> configuración y registrarlo. Si hiciera falta tocar un componente, una ruta,
> una hoja de estilo o una consulta, el producto habría dejado de ser
> enlatado.**

Todo lo demás en este documento existe para sostener esa frase.

---

## 2. Estado actual: V1

| Entregado en V1 | Estado |
|---|---|
| Sitio público multi-tenant (9 rutas por gimnasio) | ✅ Completo |
| Sistema de temas por configuración | ✅ Completo |
| Feature flags con guardas de ruta | ✅ Completo |
| Dos tenants de demostración | ✅ Mítico Fitness · Aurora Fit |
| SEO, sitemap, robots, cabeceras de seguridad | ✅ Completo |
| Autenticación | ⛔ No existe (V2) |
| API .NET y base de datos | ⛔ No existe (V1.5 / V2) |
| Sistema de gestión privado | ⛔ No existe (V2) |

### Despliegue

| | |
|---|---|
| URL pública | https://gym-platform-alpha.vercel.app |
| Proyecto | `zp-software-fast-solutions/gym-platform` |
| Framework | Next.js 16 · React 19 · Tailwind CSS v4 |
| Vulnerabilidades conocidas | 0 (`npm audit` limpio) |

Se subió de Next 15 a Next 16 durante la entrega: Next 15.5.x arrastraba una
vulnerabilidad crítica (CVE-2025-66478) y un `postcss` transitivo con avisos
altos que solo se resolvían en la major siguiente. La migración no requirió
cambios de código.

**V1 no tiene backend a propósito.** El sitio público es estático: no necesita
uno, y añadirlo antes de tener el módulo de gestión sería construir
infraestructura sin consumidor.

---

## 3. Estructura del repositorio

```text
SoftwareGym/
├── apps/
│   └── web/                        Sitio público multi-tenant (Next.js 16)
│       ├── src/
│       │   ├── app/                Rutas — Presentation
│       │   ├── core/
│       │   │   ├── domain/         Contratos y reglas. Sin framework.
│       │   │   └── application/    Casos de uso y puertos
│       │   ├── infrastructure/     Adaptadores + composition root
│       │   ├── presentation/       UI (atomic design)
│       │   ├── styles/             Sistema de diseño
│       │   └── lib/                Utilidades transversales
│       └── tenants/                Configuración por gimnasio
├── src/Backend/                    API .NET (a partir de V1.5)
│   ├── GymPlatform.Domain/
│   ├── GymPlatform.Application/
│   ├── GymPlatform.Infrastructure/
│   └── GymPlatform.Api/
├── docs/
│   ├── architecture/               Este documento, theming, multi-tenancy, ADR
│   ├── tenants/                    Guía de alta de clientes
│   └── runbooks/                   Despliegue y operación
└── infrastructure/docker/          Composición local (V1.5)
```

---

## 4. Clean Architecture en el frontend

La Dependency Rule se aplica igual que en el backend: **las dependencias
apuntan solo hacia adentro**.

```text
        ┌──────────────────────────────────────────┐
        │           PRESENTATION                   │
        │  app/ · presentation/ · styles/          │
        └──────────────────┬───────────────────────┘
                           │ depende de
        ┌──────────────────▼───────────────────────┐
        │           APPLICATION                    │
        │  casos de uso · puertos · theming        │
        └──────────────────┬───────────────────────┘
                           │ depende de
        ┌──────────────────▼───────────────────────┐
        │             DOMAIN                       │
        │  TenantConfig · FeatureFlags · Catalog   │
        │  ── no depende de NADA ──                │
        └──────────────────────────────────────────┘
                           ▲
                           │ implementa puertos
        ┌──────────────────┴───────────────────────┐
        │          INFRASTRUCTURE                  │
        │  repositorio · validador · registro      │
        └──────────────────────────────────────────┘
```

### Reglas verificables

| Regla | Cómo se comprueba |
|---|---|
| `core/domain` no importa de ninguna otra capa | `grep -rE "from '@(infra\|/presentation)" src/core/domain` debe salir vacío |
| `core/application` no importa de `infrastructure` | Los puertos se declaran en `application/ports`, se implementan fuera |
| Ningún componente construye adaptadores | `new StaticTenantRepository()` aparece **solo** en el composition root |
| Ningún componente lee un color de marca | Los componentes usan tokens semánticos, nunca `branding.palette.*` |

### Responsabilidad de cada capa

**Domain** — `src/core/domain/`
Contratos del producto: `TenantConfig`, `FeatureFlags`, catálogo comercial,
tipos con marca nominal y sus validadores puros. Sin React, sin Next, sin I/O.

**Application** — `src/core/application/`
Casos de uso (`getTenantBySlug`, `visibleNavigation`), puertos de salida y
derivación del tema. No sabe de dónde vienen los datos.

**Infrastructure** — `src/infrastructure/`
Implementación de los puertos, validación de configuración en el arranque y
composition root. Es la única capa que se reemplaza al pasar de archivos a API.

**Presentation** — `src/app/` y `src/presentation/`
Rutas y UI. Recibe datos ya resueltos y filtrados; no toma decisiones de
dominio.

---

## 5. El contrato del producto enlatado

`TenantConfig` es la superficie completa de configuración de un cliente:

```text
TenantConfig
├── slug · name · legalName · tagline · domains
├── branding
│   ├── mode          dark | light
│   ├── logo          wordmark · subMark · monogram
│   ├── palette       11 primitivos de color
│   ├── typography    familias · escala · caja · tracking
│   └── shape         esquinas · superficie · glow · retícula
├── contact           teléfono · WhatsApp · email · dirección · mapa
├── social            enlaces por red (vacíos = inertes, no rotos)
├── hours             zona horaria · 7 días · nota de feriados
├── navigation        etiquetas, orden y flag requerida por ítem
├── features          24 feature flags
├── seo               título · plantilla · descripción · keywords · locale
├── provisioning      plan comercial · alta · estado
└── content           hero · about · services · plans · facilities
                      gallery · team · testimonials · faq · cta
```

Detalle de temas en [`theming.md`](./theming.md); aislamiento y flags en
[`multi-tenancy.md`](./multi-tenancy.md).

---

## 6. Estrategia de renderizado

Todas las páginas son **estáticas** (`generateStaticParams` sobre los slugs del
registro). Cada gimnasio obtiene una copia prerenderizada servida desde CDN:
TTFB de archivo estático, sin instancia por cliente y sin coste de cómputo por
visita.

El único componente cliente del sitio es `Reveal` (~700 bytes): un
`IntersectionObserver` que se desconecta tras la primera entrada. La cabecera
también es cliente porque necesita el estado del menú móvil.

No se usa librería de animación: todo se resuelve con `transform` y `opacity`,
las dos propiedades que el compositor anima sin provocar reflow.

---

## 7. Seguridad aplicada en V1

| Vector | Mitigación | Dónde |
|---|---|---|
| Inyección de CSS desde configuración | `parseCssColor` con expresión estricta antes de `<style>` | `domain/shared/branding.types.ts` |
| Inyección vía `font-family` | Lista blanca de caracteres | `infrastructure/tenants/tenant.validator.ts` |
| Configuración inválida en producción | Validación que falla el **build** | `tenant.validator.ts` |
| Sección apagada accesible por URL | Guarda de ruta que responde 404 | `lib/page-guards.ts` |
| XSS / clickjacking / sniffing | CSP, `frame-ancestors`, `nosniff`, `Referrer-Policy` | `next.config.ts` |
| `window.opener` en enlaces externos | `rel="noopener noreferrer"` en todo enlace externo | `ui/Button.tsx` |
| Credenciales en un formulario sin backend | Formulario de acceso **deshabilitado**, sin `action` | `app/[tenant]/acceso/page.tsx` |
| Fuga de configuración de otro cliente | 404 genérico, sin distinguir "no existe" de "apagado" | `not-found.tsx` |

No hay secretos en el repositorio: V1 no consume ningún servicio autenticado.

---

## 8. Accesibilidad

Compromiso: **WCAG 2.2 nivel AA**.

- Foco visible en todo elemento interactivo; nunca `outline: none` sin reemplazo.
- Objetivos táctiles de 44 px de alto mínimo en controles principales.
- `scroll-padding-top` para que la cabecera fija no tape el elemento enfocado.
- Horario semanal como `<table>` real, con `<caption>` y `<th scope>`.
- Acordeón sobre `<details>`/`<summary>` nativos: rol, teclado y búsqueda en
  página gratis, y cero JavaScript.
- `prefers-reduced-motion` desactiva todo movimiento.
- Contraste verificado en las dos paletas, clara y oscura.
- Migas de pan como `<nav>` con `aria-current="page"`.

**Pendiente:** auditoría con lector de pantalla real (NVDA/VoiceOver) e
integración de `axe-core` en CI. Las herramientas automáticas detectan entre el
30 % y el 40 % de los problemas: son necesarias, no suficientes.

---

## 9. Rendimiento

| Decisión | Efecto |
|---|---|
| Server Components por defecto | El JS del cliente se limita a `Reveal` y la cabecera |
| Sin librería de animación | ~40 KB que no entran al bundle |
| Sin librería de iconos | 12 iconos SVG inline en lugar de un paquete completo |
| Fondos generativos en CSS | Cero peticiones de imagen, cero riesgo de imagen rota |
| `next/font` autoalojado | Sin petición a dominio externo; sin salto de layout |
| `aspect-ratio` en todo `ArtFrame` | Espacio reservado desde el primer pintado (CLS) |
| Prerenderizado estático | LCP determinado por la CDN, no por cómputo |

**Pendiente:** presupuesto de tamaño de bundle y Lighthouse CI en el pipeline.
Sin límite automatizado, el bundle solo crece.

---

## 10. Evolución prevista

```text
V1   ✅  Sitio público multi-tenant, configurable, estático
V1.5     API .NET + PostgreSQL. El registro estático de tenants se sustituye
         por `GET /api/v1/tenants/{slug}/config`. Cambia UNA línea: el
         composition root.
V2       Autenticación (JWT + refresh rotativo), gestión de clientes,
         membresías, pagos, dashboard, auditoría.
V3       Asistencia, QR, reservas, entrenadores, rutinas, clases.
V4       Multi-sucursal, suscripciones, licencias, facturación, integraciones.
```

La migración de V1 a V1.5 está prevista por diseño: los consumidores dependen
de `TenantRepositoryPort`, no del archivo que hoy lo satisface. El puerto ya es
asíncrono para que sustituirlo no obligue a cambiar ni un consumidor.

---

## 11. Deuda técnica reconocida

Se declara en lugar de esconderse.

1. **Sin tests automatizados.** V1 se validó a mano. Prioridad para V1.5:
   tests de `tenant.validator`, `build-theme` y `visibleNavigation`, más un
   smoke test de rutas por tenant.
2. **Sin CI.** No hay pipeline que ejecute `typecheck`, `lint` y `build` en cada
   PR. Es lo primero que debe existir antes de que el equipo crezca.
3. **Sin fotografía real.** Los `ArtFrame` generativos son una solución de
   demostración; el sitio pide material fotográfico antes de publicarse.
4. **Formulario de contacto sin backend.** Se canaliza por WhatsApp y se avisa
   en pantalla. Se sustituye por `POST /api/v1/leads` en V1.5.
5. **Mapa sin URL configurada.** Marcador de posición honesto hasta que el
   cliente aporte la ubicación exacta.
