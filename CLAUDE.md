# CLAUDE.md — Memoria y reglas de trabajo

> Archivo de contexto persistente del proyecto. Claude Code lo carga
> automáticamente al abrir una sesión en este repositorio.
>
> **Regla de mantenimiento:** este archivo se actualiza al cerrar cada avance
> importante (una feature completa, un cambio de arquitectura, un despliegue) y
> al final de cada sesión. Las secciones **3. Estado actual** y **4. Pendientes**
> son las que cambian; las demás solo cuando cambia una decisión de fondo.
>
> **Última actualización:** 2026-09-09 · Datos reales de Mítico Fitness cargados
> (bonus de V1): contrato de catálogo ampliado con productos y grupos de planes.

---

## 1. Objetivo del proyecto

**GYM PLATFORM** es un **software enlatado vertical** para gimnasios,
desarrollado por ZP Software Fast Solutions.

No se está construyendo el sistema de un gimnasio. Se está construyendo un
**producto reutilizable** que se vende muchas veces: cada cliente recibe una
instancia configurada del mismo producto —identidad visual, contenido, planes,
capacidades contratadas— sin que se bifurque el código.

### La prueba de aceptación

> **Dar de alta un gimnasio son dos pasos: crear su archivo de configuración y
> registrarlo. Si hiciera falta tocar un componente, una ruta, una hoja de
> estilo o una consulta, el producto habría dejado de ser enlatado.**

Toda decisión técnica se juzga contra esa frase. Es el criterio que decide
discusiones cuando dos opciones parecen igual de buenas.

### Evolución prevista

```text
V1   ✅  Sitio público multi-tenant, configurable, estático
V1.5     API .NET + PostgreSQL; la configuración pasa de archivos a base de datos
V2       Autenticación, clientes, membresías, pagos, dashboard, auditoría
V3       Asistencia, QR, reservas, entrenadores, rutinas, clases
V4       Multi-sucursal, suscripciones, licencias, facturación, integraciones
```

V1–V4 son **fases del mismo producto**, no cuatro proyectos. El código
evoluciona; no se copia.

---

## 2. Reglas de estilo y código

### 2.1 Idioma

| Elemento | Idioma |
|---|---|
| Comentarios y documentación | **Español** |
| Nombres de dominio y contenido (`PlanCard`, `tenant`, `plans`) | Inglés técnico |
| Textos visibles al usuario final | Español rioplatense (voseo: "entrená", "elegí") |
| Mensajes de commit | Español, con cuerpo explicando **por qué** |

Los comentarios explican **por qué**, nunca **qué**. Un comentario que
parafrasea la línea de abajo es ruido; uno que explica la decisión, el riesgo
que evita o el bug que costó encontrarlo, vale su espacio.

### 2.2 TypeScript

- `strict: true` **y** `noUncheckedIndexedAccess: true`. No se relajan.
- Cero `any`. Si algo es genuinamente desconocido, `unknown` y se estrecha.
- Cero `@ts-ignore` / `@ts-expect-error` sin comentario que justifique y sin
  fecha de caducidad.
- `interface` para contratos, `type` para uniones y utilidades.
- `readonly` por defecto en las propiedades de los contratos de dominio.
- Tipos con marca nominal (`TenantSlug`, `CssColor`) para valores validados: el
  compilador impide confundirlos con un `string` cualquiera.
- Los datos que entran desde fuera del código (configuración, API) se **validan
  en tiempo de ejecución**. TypeScript garantiza la forma, no los valores.

### 2.3 Arquitectura — Dependency Rule

Las dependencias apuntan **solo hacia adentro**:

```text
presentation  →  application  →  domain
                      ↑
              infrastructure (implementa los puertos)
```

| Regla | Comprobación |
|---|---|
| `core/domain` no importa de ninguna otra capa | `grep -r "from '@infra\|@/presentation'" src/core/domain` vacío |
| `core/application` no importa de `infrastructure` | Los puertos se declaran en `application/ports` |
| Solo el composition root construye adaptadores | `new StaticTenantRepository()` aparece una sola vez |
| Ningún componente lee un color de marca | Se usan tokens semánticos, nunca `branding.palette.*` |
| Ningún archivo nombra a un cliente | Ver el grep del ADR 0003 |

### 2.4 Estructura de carpetas

```text
apps/web/
  src/
    app/                    Rutas (Next.js App Router)
      [tenant]/             Todo el sitio de un gimnasio
    core/
      domain/               Contratos y reglas. Sin framework, sin I/O.
        tenant/             TenantConfig, branding, feature flags
        catalog/            Servicios, planes, instalaciones, galería
        shared/             Tipos con marca nominal y sus validadores
      application/
        ports/              Interfaces de salida (se declaran aquí)
        tenant/             Casos de uso
        theming/            Derivación de tokens desde el branding
    infrastructure/
      tenants/              Repositorio, registro, validador
      config/               Composition root
    presentation/
      ui/                   Átomos y moléculas — sin dominio, sin fetch
      patterns/             Organismos (header, footer, tarjetas)
      sections/             Secciones de página completas
      layouts/              Armazones reutilizables
      icons/                Set SVG propio
    styles/                 Sistema de diseño (globals.css)
    lib/                    Utilidades transversales
  tenants/                  Configuración por gimnasio ← lo único por cliente
src/Backend/                API .NET (V1.5)
docs/                       Arquitectura, ADR, guías, runbooks
```

**Regla de ubicación:** un componente usado una sola vez vive junto a su
feature. Se promueve a `ui/` recién con el **tercer** consumidor real.

### 2.5 Componentes

- **Server Components por defecto.** `'use client'` lo más abajo posible del
  árbol: uno en el layout raíz convierte toda la app en cliente.
- Átomos y moléculas **no conocen el dominio** y **no hacen fetch**. Reciben
  props.
- Variantes como **enum** (`variant="peligro"`), nunca booleanos combinables:
  `n` booleanos producen `2^n` estados y casi ninguno tiene sentido.
- **Composición sobre configuración**: antes de añadir la octava prop, partir el
  componente o exponer `children`.
- Reenviar `...props` y `ref` a los átomos, o el consumidor no puede añadir
  `aria-*` ni handlers.

### 2.6 Estilos

- **Nunca** un color literal en un componente. Solo tokens semánticos.
- Valores arbitrarios de Tailwind (`mt-[13px]`) son señal de que falta un token.
  Uno aislado se tolera; tres en el mismo componente, no.
- Propiedades lógicas (`ms-`, `me-`, `start-`, `end-`) en vez de `ml`/`mr`/
  `left`/`right`: cuestan lo mismo y evitan reescribir todo si llega RTL.
- Mobile-first. Nunca `max-*` como base.
- Al pasar `className`, **no** enviar utilidades que compitan con las propias del
  componente: `hidden` sobre un botón con `inline-flex` no lo oculta. Se
  compone con un contenedor. (Ver el comentario en `lib/cn.ts`.)

### 2.7 Accesibilidad — no negociable

- Foco visible siempre. `outline: none` sin reemplazo está prohibido.
- Objetivos táctiles de 44 px de alto en controles principales.
- HTML semántico antes que ARIA. Un horario es una `<table>` con `<caption>` y
  `<th scope>`, no `div`s con aspecto de tabla.
- Para patrones complejos (diálogo, combobox, tabs), librería headless probada
  antes que reimplementar WAI-ARIA a mano.
- `prefers-reduced-motion` respetado: el movimiento provoca mareo real.
- Contraste WCAG AA verificado **en las dos paletas**, clara y oscura.

### 2.8 Seguridad

- Todo dato de configuración que llegue a `<style>`, `dangerouslySetInnerHTML` o
  una consulta se **valida antes**. Hoy la config está versionada; mañana la
  edita el cliente desde un panel.
- Fallar cerrado: una flag ausente no habilita nada; un tenant que no se
  resuelve lanza, no cae a un valor por defecto.
- Ocultar un enlace **no** desactiva una sección. La ruta debe responder 404.
- `rel="noopener noreferrer"` en todo enlace externo.
- Cero secretos en el repositorio. Nada de `NEXT_PUBLIC_*` con credenciales:
  todo lo que llega al navegador es público por definición.
- `npm audit` limpio antes de desplegar.

### 2.9 Dependencias

Antes de instalar algo, tres preguntas: ¿cuánto pesa en el bundle?, ¿qué
arrastra?, ¿cuántas líneas propias me ahorra de verdad?

En V1 se descartaron `framer-motion` (~40 KB para dos animaciones de
`transform`), una librería de iconos (se usan 12) y `tailwind-merge` (las
variantes se resuelven con enums internos). Versiones **exactas** en
`package.json`, sin `^`.

### 2.10 Git

- Ramas: `feat/`, `fix/`, `docs/`, `refactor/` + descripción en kebab-case.
- Commits con cuerpo que explica el **porqué** y las consecuencias, no la lista
  de archivos. El diff ya dice qué cambió.
- No se commitea código comentado. El historial es el archivo.

---

## 3. Estado actual

**Última actualización: 2026-09-09**

### V1 — Sitio público multi-tenant ✅ Entregado y desplegado

**En vivo:** https://gym-platform-alpha.vercel.app

| | |
|---|---|
| Vitrina de la plataforma | https://gym-platform-alpha.vercel.app |
| Mítico Fitness | https://gym-platform-alpha.vercel.app/mitico |
| Aurora Fit | https://gym-platform-alpha.vercel.app/aurora-fit |

**Rama:** `feat/v1-public-site` (publicada) · **Commits:** 3 · **Base:** `main`
**Pull request:** pendiente de abrir en
https://github.com/ZPSoftwareFastSolutions/SoftwareGym/compare/main...feat/v1-public-site

#### Qué existe

- **9 rutas por gimnasio**: inicio, nosotros, servicios, planes, instalaciones,
  galería, horarios, contacto, acceso de socios.
- **Clean Architecture** aplicada al frontend, con la Dependency Rule verificada.
- **`TenantConfig`**: contrato único de configuración por cliente (branding,
  contacto, horarios, navegación, 23 feature flags, SEO, contenido completo).
- **Sistema de temas en dos capas de tokens** (`--t-*` → `--color-*`), derivado
  de la configuración y validado antes de inyectarse.
- **Guardas de ruta por feature flag**: apagar una capacidad quita el enlace
  **y** hace que la ruta responda 404.
- **Validador de configuración en el arranque**: una config inválida rompe el
  build, no la página en producción.
- **Dos tenants de demostración con identidad opuesta**, que son la prueba viva
  del enlatado:

| | Mítico Fitness | Aurora Fit |
|---|---|---|
| Tema | Oscuro | Claro |
| Paleta | Verde neón `#39FF14` sobre carbón | Terracota `#E4572E` sobre blanco cálido |
| Tipografía | Bebas Neue, caja alta | Fraunces serif, caja mixta |
| Forma | Cristal con resplandor | Elevada, sin resplandor |
| Planes | 3 mensuales | 4 con periodicidad mixta |
| Flags | Equipo y FAQ activos | Equipo, FAQ y mapa apagados |

- **Métricas:** 24 páginas estáticas · ~106 kB de JS inicial · `npm audit` sin
  vulnerabilidades · sin librería de animación ni de iconos.

#### Documentación escrita

`docs/architecture/overview.md` · `theming.md` · `multi-tenancy.md` ·
3 ADR · `docs/tenants/alta-de-gimnasio.md` · `docs/runbooks/despliegue.md` ·
READMEs por capa del backend.

#### Decisiones que costó tomar y conviene no revisitar sin motivo

1. **Next.js sobre Blazor** para el sitio público (ADR 0001): el contenido es
   estático y Blazor WASM penaliza el LCP en el móvil de gama media, que es el
   dispositivo real del visitante de un gimnasio.
2. **Columna discriminadora `TenantId`, no base por cliente** (ADR 0002): el
   plan original proponía bases separadas; con veinte clientes cada migración
   serían veinte despliegues coordinados.
3. **Configuración como dato, nunca como código** (ADR 0003).
4. **Next 16 en vez de 15**: 15.5.x arrastraba CVE-2025-66478 (crítica) y avisos
   altos transitivos que solo cerraba la major siguiente. La migración no
   requirió cambios de código.

#### Bugs encontrados y corregidos durante V1

- Auto-referencia de tokens en `@theme inline` que colapsaba el tema a página en
  blanco → namespaces separados `--t-*` / `--color-*`.
- Tenants de tema claro sobre fondo oscuro: los tokens se inyectaban en un
  `<div>` interior y `body` quedaba fuera → ahora van a `:root`.
- Solapamiento del header a 390 px: `hidden` perdía contra el `inline-flex`
  propio del botón → resuelto por composición y documentado en `lib/cn.ts`.

### V1 · Bonus — Datos reales de Mítico Fitness ✅ 2026-09-09

Origen: `informacion_empresa.md` (material comercial de la empresa). Sustituye
el contenido de demostración por la oferta real.

**Ampliaciones del contrato de dominio** (autorizadas explícitamente por el
cliente tras señalarse que no entraban sin tocar arquitectura):

| Cambio | Motivo |
|---|---|
| `ProductItem` + `ProductCategory` en `catalog.ts` | El gimnasio vende indumentaria, suplementación y accesorios. No existía el concepto. |
| `PlanGroup` y `TenantContent.planGroups` (sustituye a `plans`) | La oferta real son 17 paquetes en 5 familias comerciales, no una lista plana. |
| `MembershipPlan.routines?` | Los planes personalizados se venden con rutinas de nombre propio (Batman, Thor, Hulk…). |
| `BillingPeriod` += `quincenal` | Existe un paquete de 15 días. |
| `FeatureFlags.showProducts` | Capacidad nueva, apagada por defecto. |

**Regla de destacado revisada:** `featured` es único **por grupo**, no por
tenant. Un único destacado global obligaría a elegir entre resaltar una
mensualidad o un plan personalizado, que no compiten entre sí.

**Estado de Mítico tras el cambio:**

- Menú de 4 entradas del material comercial (Mítico · Rutina · Ejercicio ·
  Información) sobre las rutas del producto. Las etiquetas son dato: Aurora Fit
  conserva sus 8 entradas sin que se tocara un archivo de aplicación.
- 17 paquetes en 5 grupos · 12 productos en 3 categorías · 4 redes sociales
  reales · WhatsApp `+591 77700867` · slogan y CTA de marca.
- Secciones sin información real **apagadas por flag**, con sus rutas
  devolviendo 404 verificado: galería, instalaciones, horarios, equipo,
  testimonios, mapa. No se dejan encendidas con contenido inventado.

**Verificado:** `tsc --noEmit` limpio · `next build` 23 páginas · `npm audit` 0
vulnerabilidades · Dependency Rule y grep del ADR 0003 sin hallazgos ·
404 confirmado por HTTP en las 3 rutas apagadas · Aurora Fit sin regresión ·
móvil 375 px sin desborde horizontal.

**Pendiente de confirmar por escrito con el cliente** (marcado en el encabezado
de `mitico.tenant.ts`): email, dirección, horarios, URL del mapa y el enlace del
grupo de WhatsApp. Siguen siendo valores heredados de la demo.

---

## 4. Lista de pendientes

### 🔴 Prioridad alta — antes de sumar features

0. **Deuda detectada en la auditoría del 2026-09-09** (ninguna rompe hoy, todas
   se cobran solas más adelante):
   - `publicSite` está declarada y **no se usa en ningún sitio**: ponerla en
     `false` no apaga nada. O se aplica como guarda global o se elimina.
   - `DEFAULT_FEATURE_FLAGS` dice en su comentario que toda flag nace en
     `false`, pero tiene 10 en `true`, y **se usa como base de spread** en los
     dos tenants. Cuando la configuración llegue de la API (V1.5), un
     `{ ...DEFAULT, ...remoto }` con respuesta parcial encendería capacidades
     por omisión. Contradice el principio de fallar cerrado.
   - `next: "^16.3.4"` lleva caret; la regla §2.9 exige versión exacta.
   - `DEFAULT_TENANT_SLUG` cae a `'mitico'` hardcodeado en `tenant.registry.ts`.
     Sobrevive al grep del ADR 0003 solo porque el grep excluye ese archivo.
   - Deriva de documentación: `next.config.ts` cita
     `docs/architecture/security-headers.md`, que no existe;
     `get-tenant.usecase.ts` cita `guards/feature.guard.ts`, cuando el archivo
     real es `lib/page-guards.ts`.
   - `/[tenant]/nosotros` no tiene guarda de flag y quedó fuera del menú de
     Mítico: responde 200 sin estar enlazada desde ninguna parte.

1. **Abrir el PR de V1** y fusionar a `main`:
   https://github.com/ZPSoftwareFastSolutions/SoftwareGym/compare/main...feat/v1-public-site
2. **CI en GitHub Actions**: `typecheck`, `build`, `npm audit` y el grep del
   ADR 0003 en cada PR. Sin esto, las reglas de arriba se degradan solas.
3. **Tests.** Empezar por lo que más duele si se rompe: `tenant.validator`,
   `build-theme`, `visibleNavigation`, y un smoke test de las 9 rutas por tenant.
4. **Conectar el repo a Vercel** (Settings → Git) para que cada push despliegue
   solo. Hoy el despliegue va por CLI.

### 🟡 Prioridad media — cerrar V1 de verdad

5. **Fotografía real** de Mítico. Colocar en `apps/web/public/tenants/mitico/`,
   rellenar `GalleryItem.src` y volver a encender `showGallery`. El
   `aspect-ratio` no cambia: no habrá salto de layout.
6. **Datos de Mítico que faltan confirmar**: email, dirección y horarios. Con
   los horarios confirmados se vuelve a encender `showSchedule`. Precios,
   paquetes, productos, redes y WhatsApp ya son reales.
7. **URL del mapa** (`contact.mapEmbedUrl`) y activar `showLocationMap`.
8. **Enlace del grupo de WhatsApp**: el material comercial lo lista sin URL.
9. **Presupuesto de tamaño de bundle** y Lighthouse CI: sin límite automatizado,
   el bundle solo crece.
10. **Auditoría con lector de pantalla real** (NVDA/VoiceOver) e integración de
    `axe-core`. Las herramientas automáticas cubren entre el 30 % y el 40 %.

### 🟢 V1.5 — Backend

11. Solución .NET con los cuatro proyectos y el **test de arquitectura** desde el
    primer commit.
12. PostgreSQL + EF Core: filtro global de tenant, interceptor de `TenantId`,
    `TenantId` como primera columna de todo índice.
13. `GET /api/v1/tenants/{slug}/config` y sustitución del registro estático
    (cambia **una línea** del composition root).
14. `POST /api/v1/leads` para el formulario de contacto, que hoy se canaliza por
    WhatsApp.
15. **Test de aislamiento multi-tenant automatizado** sobre la lista completa de
    rutas. Es el único control que no se degrada con el tiempo.

### ⚪ V2 y posteriores

Autenticación (JWT + refresh rotativo con detección de reutilización, en cookie
`HttpOnly`), gestión de clientes y membresías, pagos, dashboard, auditoría
inmutable. Detalle en `docs/architecture/overview.md`.

---

## 5. Contexto técnico

### Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.3.4 (App Router) |
| Lenguaje | TypeScript 5.9 (`strict` + `noUncheckedIndexedAccess`) |
| UI | React 19.1 |
| Estilos | Tailwind CSS v4 (configuración en CSS con `@theme`) |
| Tipografías | `next/font` autoalojado: Bebas Neue · Fraunces · Inter |
| Animación | CSS puro + un `IntersectionObserver` (~700 bytes) |
| Iconos | Set SVG propio, 12 iconos inline |
| Backend | .NET 10 (previsto, V1.5) |
| Base de datos | PostgreSQL (previsto, V1.5) |

### Servicios conectados

| Servicio | Detalle |
|---|---|
| **Vercel** | Proyecto `zp-software-fast-solutions/gym-platform` · Root Directory `apps/web` · alias público `gym-platform-alpha.vercel.app` |
| **GitHub** | `ZPSoftwareFastSolutions/SoftwareGym` (público) · rama por defecto `main` |

> **Autenticación de Git en esta máquina.** Credential Manager guarda de forma
> global la cuenta `Riceious`, que no tiene permiso de escritura en este
> repositorio. Está resuelto con configuración **local**:
> `credential.username = ZPSoftwareFastSolutions` en `.git/config`. Los demás
> repositorios de la máquina no se ven afectados. Si aparece
> `Permission denied to Riceious`, esa configuración local se perdió.

> **Vercel Authentication** protege las URL de despliegue con hash
> (`gym-platform-<hash>-...`). **El enlace que se comparte con clientes es el
> alias**, que sí es público. Si a alguien le aparece una pantalla de login de
> Vercel, le pasaron una URL de despliegue en vez del alias.

### MCP disponibles en la sesión

> **La disponibilidad de MCP varía según la sesión: verificarla, no asumirla.**
> En la sesión del 2026-09-09 el MCP de Vercel **no estaba conectado** y el de
> GitHub falló al conectar. Tampoco están instalados `gh` ni la CLI de Vercel.
> Consecuencia práctica: se puede commitear y (probablemente) hacer `push`, pero
> **no abrir PRs ni desplegar desde la sesión**. Eso lo hace el usuario.

| MCP | Estado verificado 2026-09-09 | Uso en este proyecto |
|---|---|---|
| **Supabase** | ✅ Conectado | Org `Z&P Software Fast Solutions` · proyecto `ZPSoftwareFastSolutions's Project` (ref `dnclwawnjnzqqxgsuhpn`) · PostgreSQL 17.6.1 · `us-west-2` · **0 tablas**. Reservado para V1.5: es el candidato para sustituir el registro estático de tenants. |
| **Vercel** | ❌ No conectado | Despliegues y logs de build, cuando esté disponible |
| **GitHub** | ❌ Falló al conectar | PRs y API. Mientras tanto, git por CLI |
| **Browser** | ✅ Conectado | Verificación visual y responsive de los sitios |
| **Notion** | Sin usar | — |
| **Terminal** | ✅ Conectado | Lectura de la terminal del usuario |

*n8n no está conectado. Si se incorpora para automatizar avisos de vencimiento
de membresía (V2), documentarlo aquí.*

### Skills de arquitectura activas

Hay 55 skills validadoras instaladas en `~/.claude/skills/` (backend .NET,
persistencia, seguridad IAM, frontend, UI/UX). Las más aplicables a este
repositorio: `clean-architecture-enforcer`, `tenant-isolation-auditor`,
`multi-tenant-data-leak-guard`, `theming-manager`, `atomic-design`,
`accessibility-a11y`, `bundle-size-minimizer`, `server-side-rendering`.

### Comandos frecuentes

```bash
cd apps/web
npm run dev          # http://localhost:3000
npm run typecheck
npm run build        # compila y valida la configuración de todos los tenants
npm audit            # debe salir en 0 antes de desplegar
npx vercel deploy --prod --yes
```

### Verificación de las reglas de arquitectura

```bash
# Ningún archivo de aplicación nombra a un cliente concreto
grep -rn "mitico\|aurora-fit" apps/web/src --include=*.ts --include=*.tsx \
  | grep -v "tenant.registry" \
  | grep -vE ':\s*(\*|//|/\*)'
# Salida vacía = la regla se cumple
```
