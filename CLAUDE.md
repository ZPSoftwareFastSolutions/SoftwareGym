# CLAUDE.md — MÍTICO GYM · landing de Mítico Fitness

> Archivo de contexto persistente de la rama **`miticogym-v1`**. Claude Code lo
> carga al abrir una sesión. **Describe el sistema tal como está HOY en esta
> rama**, no cómo se llegó hasta aquí.
>
> - **Última actualización:** 2026-09-22 · rama `miticogym-v4`: logotipo oficial
>   en la cabecera y como favicon, paleta alineada con el verde del logo
>   (`#00FA2D`). Ver §5 «Marca» y §9.
> - Antes: 2026-09-16 · creación de la rama `miticogym-v1`
>   desde `feat/goldgym-v1`: landing de Mítico Fitness con los datos oficiales
>   del cliente, **sin panel, sin sesión y sin base de datos**.
> - **Decisión que define la rama:** [ADR 0012](docs/architecture/adr/0012-landing-sin-base-de-datos.md).
>
> **⚠️ ESTA RAMA NO ES EL PRODUCTO COMPLETO.** GYM PLATFORM tiene un panel de
> gestión, autenticación, 41 tablas con RLS, socios, asistencia, cobros, clases,
> reservas y administración. **Nada de eso existe aquí**, y no está apagado:
> está borrado. Todo sigue vivo en `feat/goldgym-v1` y ramas anteriores, con su
> historia en [`docs/historial/bitacora-v1-a-v2.2.md`](docs/historial/bitacora-v1-a-v2.2.md).
> Si necesitas trabajar en el sistema de gestión, **esta no es la rama**.
>
> **Regla de mantenimiento:** se actualiza al cerrar cada avance importante y al
> final de cada sesión. Cambian sobre todo §8 (pendientes) y §9 (historial).

---

## 0. Para una sesión nueva: lo esencial en un minuto

| | |
|---|---|
| **Qué es** | La **landing informativa** de Mítico Fitness (La Paz, Bolivia). Diez páginas estáticas. |
| **Qué NO es** | Un sistema. Cero socios, cero login, cero roles, cero base de datos, cero pagos en línea. |
| **Stack** | Next.js 16.3.4 (App Router) · React 19.1 · TypeScript 5.9 estricto · Tailwind v4. **Tres dependencias en total.** |
| **Datos** | Todo el contenido vive en `apps/web/tenants/mitico.tenant.ts`. No hay otra fuente. |
| **Rutas** | `/` → 308 a `/mitico`. Diez páginas públicas. Todo lo demás, 404. |
| **Build** | 10 páginas SSG + `/`, `/_not-found`, `/robots.txt`, `/sitemap.xml`. Sin ISR: nada que revalidar. |
| **Verificación** | `npm run typecheck` · `npm test` (24) · `npm run build` · `npm audit` (0) |
| **Siguiente** | Confirmar con el cliente los datos pendientes (§8) y desplegar. |

**Antes de tocar nada, léase:** §1 (reglas), §2 (arquitectura), §3 (el
contenido y de dónde sale) y §8 (pendientes).

**Cinco reglas que no se rompen nunca:**

1. **Enlatado:** un gimnasio nuevo = un archivo de configuración + registrarlo.
   Ningún archivo de `src` puede nombrar a un cliente.
2. **Aquí no se habla con nada.** No hay base de datos, ni API, ni servicio
   externo. Si una tarea parece pedir uno, es señal de que pertenece a otra rama.
3. **Capacidad apagada = ruta 404**, no enlace oculto (`loadTenantPage(params, flag)`).
4. **No se inventan datos del cliente.** Un dato que el gimnasio no entregó se
   deja vacío y la interfaz lo omite; nunca se rellena con algo verosímil.
5. **El validador es la única red.** Sin panel ni base, si una errata pasa el
   validador, se publica. Toda regla nueva del contenido se valida en el build.

---

## 1. Reglas de estilo y código

### 1.1 Idioma

| Elemento | Idioma |
|---|---|
| Comentarios y documentación | **Español** |
| Nombres de dominio heredados (`PlanCard`, `tenant`, `features`) | Inglés técnico |
| Dominio nuevo de esta rama (`SedeDeVitrina`, `resumirSemana`) | Español |
| Textos visibles al usuario final | **Español neutro de Bolivia.** Sin voseo. |
| Mensajes de commit | Español, con cuerpo que explica **por qué** |

Los comentarios explican **por qué**, nunca **qué**. Uno que parafrasea la línea
de abajo es ruido; uno que explica la decisión o el riesgo que evita, vale su
espacio. Los archivos abren con un bloque `CAPA: …`.

### 1.2 TypeScript

- `strict: true` **y** `noUncheckedIndexedAccess: true`. No se relajan.
- Cero `any`. `interface` para contratos, `type` para uniones, `readonly` por defecto.
- Todo dato que entra de fuera (la configuración del gimnasio) se **valida en
  tiempo de ejecución**: TypeScript garantiza la forma, no los valores.
- Alias: `@core/*` → `src/core`, `@infra/*` → `src/infrastructure`, `@/*` →
  `src`, `@tenants/*` → `tenants`.

### 1.3 Arquitectura — Dependency Rule

```text
presentation / app  →  application  →  domain
                            ↑
                 infrastructure (implementa el puerto)
```

| Regla | Comprobación |
|---|---|
| `core/domain` no importa de ninguna otra capa ni de frameworks | grep de §7 vacío |
| `core/application` no importa de `infrastructure` | El puerto se declara en `application/ports` |
| Solo el composition root construye adaptadores | `infrastructure/config/composition-root.ts` |
| Ningún componente lee un color de marca | Solo tokens semánticos |
| Ningún archivo de `src` nombra a un cliente | grep del ADR 0003 (§7) |

### 1.4 Componentes

- **Server Components por defecto.** `'use client'` lo más abajo posible: en
  esta rama solo lo son la cabecera (scroll y menú), las pestañas, el
  formulario de contacto, el acordeón, `Reveal` y el icono de enlace.
- Átomos y moléculas (`presentation/ui`) **no conocen el dominio**.
- Variantes como enum, nunca booleanos combinables.
- Composición sobre configuración: antes de la octava prop, partir o usar `children`.

### 1.5 Estilos

- **Nunca** un color literal en un componente: tokens `--t-*`.
- Propiedades lógicas (`ms-`, `me-`, `start-`, `end-`). Mobile-first.
- Los resets de elementos van en `@layer base` (en Tailwind v4 una regla suelta
  gana a toda utilidad).
- **Ninguna fila se desplaza en horizontal**: rejillas que envuelven o pestañas.
  Las tablas anchas sí se desplazan dentro de su propia caja.

### 1.6 Accesibilidad — no negociable

- Foco visible siempre. Objetivos táctiles de 44 px en controles principales.
- HTML semántico antes que ARIA: el horario es una `<table>` real con
  `<caption>` y `<th scope>`; las pestañas son el patrón `tablist` del estándar.
- `prefers-reduced-motion` respetado. Contraste AA.

### 1.7 Seguridad

- Fallar cerrado: una flag ausente no habilita nada; un tenant que no se
  resuelve da 404, nunca cae a un valor por defecto.
- Ocultar un enlace **no** desactiva nada: la ruta responde 404.
- `rel="noopener noreferrer"` en enlaces externos; `noopener` también al abrir
  WhatsApp con `window.open`.
- Cero secretos: no hay ninguno que guardar.
- **No se recoge ningún dato personal.** El formulario de contacto compone un
  mensaje de WhatsApp en el navegador y no envía nada a ningún servidor.

### 1.8 Dependencias

Tres preguntas antes de instalar: ¿cuánto pesa?, ¿qué arrastra?, ¿cuántas líneas
propias ahorra de verdad? Versiones **exactas**, sin `^`.

| Dependencia | Por qué está |
|---|---|
| `next` 16.3.4, `react`/`react-dom` 19.1.1 | Framework |

Y nada más. Se retiraron en esta rama `@supabase/ssr`, `@supabase/supabase-js`
(no hay base), `qrcode-generator` y `jsqr` (no hay QR). Siguen descartados a
conciencia: librerías de gráficos, de iconos (set propio en
`presentation/icons/Icon.tsx`), de animación y `tailwind-merge`.

### 1.9 Git

- Commits en español con cuerpo que explica el **porqué**. El diff ya dice qué.
- No se commitea código comentado ni restos de prueba.
- Push y despliegue: **solo cuando el usuario lo pide**.

---

## 2. Arquitectura

### 2.1 Vista general

```text
 Navegador ──► Vercel (Next.js 16) ──► archivos estáticos desde el CDN
                        │
                        └─ generados en el BUILD a partir de
                           apps/web/tenants/mitico.tenant.ts
```

Eso es todo. No hay middleware, ni Route Handlers, ni Server Actions, ni
cookies, ni servicios externos. Cada página se resuelve una vez, en el build.

### 2.2 Mapa del código (`apps/web`)

```text
tenants/
  mitico.tenant.ts               LO ÚNICO propio del cliente (~900 líneas)
src/
  app/
    layout.tsx                   Tipografías. NO declara título (ver §2.5)
    page.tsx                     Raíz: redirección permanente al gimnasio
    not-found.tsx, robots.ts, sitemap.ts
    [tenant]/
      layout.tsx                 BISAGRA DEL ENLATADO: resuelve el gimnasio, inyecta tokens, 404 si no existe
      page.tsx                   Portada
      nosotros, servicios, planes, sucursales, clases, instalaciones, galeria, horarios, contacto
  core/
    domain/
      tenant/                    tenant-config.ts (CONTRATO CENTRAL), branding.ts, feature-flags.ts
      catalog/
        catalog.ts               Servicios, planes, programas, productos, galería… + puerta del catálogo
        schedule.ts              Horario de atención: DaySchedule, resumirSemana, diasAbiertos
        branches.ts              SedeDeVitrina, ordenarSedes, urlDeMapaEmbebido, urlDeUbicacion
        classes.ts               Clases dirigidas: franjas, agenda por sede, días legibles
        facilities.ts            Reparto de instalaciones por sede
      shared/branding.types.ts   Marcas nominales (TenantSlug, CssColor)
    application/
      ports/tenant-repository.port.ts    EL ÚNICO PUERTO
      tenant/get-tenant.usecase.ts, theming/build-theme.ts
  infrastructure/
    config/composition-root.ts   Único sitio que construye adaptadores
    tenants/                     tenant.registry.ts, static-tenant.repository.ts, tenant.validator.ts
  presentation/
    ui/                          ArtFrame, Badge, Button, IconoDeEnlace, Cargando, Logo,
                                 Pestanas, Reveal, SectionHeading
    patterns/                    SiteHeader, SiteFooter, SocialLinks, WhatsAppFab, PlanCard,
                                 Accordion, FormularioDeContacto
    sections/                    Hero, About, Services, Plans, TrainingPlans, Products, Branches,
                                 Classes, Facilities, Gallery, Schedule, Contact, Faq, Testimonials,
                                 Team, MarqueeStrip, ClosingCta
    layouts/PageHero.tsx, icons/Icon.tsx
  lib/                           cn, page-guards, tenant-links, site-url
  styles/globals.css             Sistema de diseño: tokens, utilidades, impresión
tests/
  landing.test.ts                24 pruebas: dominio puro + validador + contrato de la landing
  alias.mjs, alias-hooks.mjs     Resolución de los alias de tsconfig para node --test
```

### 2.3 Capas y piezas clave

**Composition root.** Un solo puerto (`TenantRepositoryPort`) y un solo
adaptador (`StaticTenantRepository`), singleton de proceso. Se conserva la
indirección aunque hoy sea una sola línea: es el punto por el que esto vuelve a
leer de una API el día que haga falta, sin tocar ninguna página.

**Guardas.** Una sola, y basta: `loadTenantPage(params, flag)` en
`lib/page-guards.ts` responde 404 si el gimnasio no existe, si no tiene
`publicSite` o si la capacidad que la página necesita está apagada. Admite una
lista porque una página puede depender de dos (`showClasses` + `showBranches`).

**El validador** (`infrastructure/tenants/tenant.validator.ts`) corre en el
arranque del repositorio, o sea en el build. Comprueba:

- Colores y tipografías antes de inyectarlos en una etiqueta `<style>`.
- Coherencia entre flags y contenido (una sección encendida sin datos).
- Ids únicos y un solo destacado por grupo de planes; `altPrice` positivo.
- **Sedes:** código con formato, sin duplicados, semana de siete días, horas
  `HH:MM`, exactamente una principal, dirección y nombre no vacíos.
- **Clases:** horas válidas, fin posterior al inicio y `branchCode` que
  corresponde a una sede declarada. Una clase sin horarios debe explicar por qué.
- **Instalaciones:** `branchCode` con formato y existente; repartir exige
  `showBranches`.
- **Navegación:** cada entrada exige la capacidad que abre su página.

### 2.4 El enlatado: configuración, tema y capacidades

- **`TenantConfig`** (`core/domain/tenant/tenant-config.ts`): slug, nombre,
  dominios, `branding`, `contact`, `social`, `hours`, `navigation`, `features`,
  `seo`, `content` y `provisioning`. **En esta rama es la única fuente de datos
  que existe**: las sedes, sus horarios y las clases viven dentro de `content`.
- **Tema en dos capas de tokens:** `build-theme.ts` deriva `--t-*` del branding
  (ya validado) y `globals.css` los mapea a `--color-*` para Tailwind.
  Namespaces separados a propósito.

**Feature flags** (`feature-flags.ts`, 15). Todas las de operación se
eliminaron del contrato: no están en `false`, no existen.

| Flag | Qué habilita | Mítico |
|---|---|---|
| `publicSite` | Apagada, el gimnasio no tiene sitio: todas sus rutas 404 | ✅ |
| `showPlans` | `/planes` y la retícula de paquetes | ✅ |
| `showTrainingPlans` | Las rutinas de entrenamiento personalizado | ✅ |
| `showProducts` | Catálogo de mostrador | ✅ |
| `showGallery` | `/galeria` | ✅ |
| `showFacilities` | `/instalaciones` | ✅ |
| `showSchedule` | `/horarios` | ✅ |
| `showClasses` | `/clases` y la agenda semanal | ✅ |
| `showBranches` | `/sucursales` y los bloques de sede del resto del sitio | ✅ |
| `showTeam` | Sección de equipo | ❌ sin datos confirmados |
| `showTestimonials` | Testimonios | ❌ sin datos confirmados |
| `showFaq` | Preguntas frecuentes | ✅ |
| `showLocationMap` | Mapas incrustados | ✅ |
| `whatsappFloatingButton` | Botón flotante de WhatsApp | ✅ |
| `contactForm` | Formulario de contacto (compone un WhatsApp) | ✅ |

**Ojo:** `DEFAULT_FEATURE_FLAGS` nace con varias en `true` y se usa como base de
spread. Contradice «fallar cerrado» y se conserva por compatibilidad con el
contrato del producto; ver §8.

### 2.5 Renderizado

- **Todo el sitio es estático** (SSG por gimnasio, `dynamicParams = false`).
  Ninguna página declara `revalidate`: no hay nada que revalidar.
- **El layout raíz NO declara título.** Una plantilla en la raíz
  (`'%s | GYM PLATFORM'`) se aplica también al título por defecto de las rutas
  hijas y firmaba cada pestaña del cliente con el nombre del producto. El
  título lo pone el layout del gimnasio; la 404 global pone el suyo.
- **Cabeceras** (`next.config.ts`): CSP en bloqueo con `connect-src 'self'` —el
  sitio no llama a nadie—, `frame-src` solo para los mapas de Google,
  `camera=()` (ya no hay escáner de QR), `X-Frame-Options: DENY`, `nosniff`, COOP.

---

## 3. El contenido y de dónde sale

Todo en `apps/web/tenants/mitico.tenant.ts`, cuya cabecera cita el origen de
cada bloque. Resumen:

**OFICIAL, de los documentos del cliente:**

- `tarifario_gym_mitico.md` → los 14 paquetes en cuatro familias
  (`content.planGroups`) y las seis rutinas de superhéroes
  (`content.trainingPlans`). Los paquetes que el tarifario vende con dos precios
  —una sucursal o las dos— se declaran como **un** paquete con `altPrice`, que
  es como están escritos.
- `horarios_m_tico_fitness.md` → las dos sedes con su teléfono y su horario de
  atención propio (`content.branches.sedes`) y las cinco clases dirigidas con
  sus franjas por sede (`content.classes`).

**REAL, heredado del material comercial anterior:** `content.products`.

**Redacción propia sobre hechos que constan:** `content.about`,
`content.services`, `content.faq`, textos de vitrina de cada sede y descripciones
de instalaciones.

**Lo que NO se inventó** (y por eso se ve así):

- `contact.email` está vacío: la sección de contacto omite la fila en vez de
  publicar una dirección falsa.
- Las direcciones son la zona («Zona Centro, El Prado · La Paz»), que es lo que
  dicen los documentos. No hay dirección postal exacta.
- Las instalaciones no declaran superficie ni fichas de datos: el gimnasio no
  las midió, y la sección está preparada para no anunciar un «0 m²».
- Equipo y testimonios: **secciones apagadas y sin contenido**. Publicar nombres
  de entrenadores o reseñas de socios inventados en el sitio real de un negocio
  no es relleno, es información falsa sobre personas.
- La rutina «Avengers Unidas» dice «consulta en recepción todo lo que incluye»
  porque el tarifario da su precio y no desglosa sus prestaciones.
- La clase de baile fitness del martes muestra solo la hora de inicio: el
  documento oficial no publica la de cierre, y por eso `FranjaDeClase.endTime`
  es opcional.

### 3.1 Cómo se presentan las dos sucursales

El reparto por sede es **dato**, nunca código. Con una sola sede, todo se ve
como una lista y no aparece ninguna pestaña.

| Sección | Cómo |
|---|---|
| Instalaciones | `FacilityItem.branchCode` → una pestaña por sede. Un área sin código es de TODAS y se repite en cada pestaña |
| Horario de atención | `SedeDeVitrina.week` → una pestaña por sede, cada una con su tabla |
| Agenda de clases | `FranjaDeClase.branchCode` → una pestaña por sede, con sus días y horas |
| Catálogo de clases | Una pestaña por sede, con las clases que se dictan allí |
| Sucursales | Tres presentaciones de la misma sección: `portada`, `detalle` (con mapa) y `mapas` |

---

## 4. Rutas

| Ruta | Tipo | Capacidad | Qué hace |
|---|---|---|---|
| `/` | estática | — | **308** permanente a `/mitico` |
| `/mitico` | SSG | `publicSite` | Portada |
| `/mitico/nosotros` | SSG | `publicSite` | Relato, valores e hitos |
| `/mitico/servicios` | SSG | `publicSite` | Servicios, paquetes, rutinas y productos |
| `/mitico/planes` | SSG | `showPlans` | Tarifario completo y rutinas |
| `/mitico/sucursales` | SSG | `showBranches` | Las dos sedes con mapa y anclas `#sede-CODE` |
| `/mitico/clases` | SSG | `showClasses` | Catálogo y agenda semanal, por sede |
| `/mitico/instalaciones` | SSG | `showFacilities` | Áreas en pestañas por sucursal |
| `/mitico/galeria` | SSG | `showGallery` | Galería |
| `/mitico/horarios` | SSG | `showSchedule` | Atención por sede + agenda de clases |
| `/mitico/contacto` | SSG | `publicSite` | Contacto, mapas y formulario |
| Cualquier otra | — | — | **404** real |

**El botón de los paquetes dice «Consultar» y lleva a contacto.** No hay QR, ni
pasarela, ni comprobantes: el paquete se cierra hablando con el gimnasio. Una
prueba lo fija (`ningún paquete invita a pagar en la página`).

---

## 5. Sistema de diseño e interfaz

- **Tokens:** `--t-bg`, `--t-surface`, `--t-raised`, `--t-ink`, `--t-muted`,
  `--t-line`, `--t-action`, `--t-on-action`, `--t-structural`, radios
  `--t-radius-*`, expuestos a Tailwind como `bg-action`, `text-muted`,
  `border-line`. Utilidades propias: `surface-card`, `t-h1…t-h3`, `section`,
  `bg-grid`, `bg-aura`.
- **Pestañas** (`ui/Pestanas.tsx`): patrón `tablist` del estándar, flechas,
  Inicio y Fin, `aria-selected`/`aria-controls`, solo la activa con `tabIndex 0`.
  La fila **envuelve**: con muchas sedes se ven en dos líneas, nunca en una barra
  que se corta. Los paneles se renderizan en el servidor y se ocultan con
  `hidden`, así que cambiar de pestaña no pide nada ni parpadea.
- **Formulario de contacto** (`patterns/FormularioDeContacto.tsx`): compone el
  mensaje de WhatsApp con lo que la persona escribió y abre la conversación. No
  envía, no guarda y no deja rastro.
- **Impresión:** `@media print` en `globals.css` + `data-print="hide"`.
- **Marca (V4).** El logotipo oficial vive en `apps/web/brand/<slug>/logo-plano.png`
  (maestro, no se sirve). `node scripts/generar-marca.mjs <slug>` genera desde él
  `public/tenants/<slug>/`: `logo.png`, `isotipo.png` (recorte automático del
  primer bloque del logo), `favicon.ico` (16/32/48), `icon-192/512.png` y
  `apple-icon.png`. Se declaran en `branding.logo.mark`, `.full` e `.icons`; el
  validador comprueba formato de ruta y **que el archivo exista** en `public/`.
  `ui/Logo.tsx` usa el isotipo si hay, y si no el monograma tipográfico. Los
  iconos se emiten por metadatos desde la configuración (`lib/brand-icons.ts`),
  no con `app/icon.png`, que sería global; `/favicon.ico` en la raíz lo sirve
  `app/favicon.ico/route.ts` (estática). **Ningún componente escribe un verde a
  mano:** los brillos usan `rgb(var(--t-action-rgb)/α)`, que sale de la paleta.

---

## 6. Decisiones de fondo (no revisitar sin motivo nuevo)

1. **Next.js y no Blazor** para el sitio (ADR 0001).
2. **Un producto, muchos gimnasios** (ADR 0002): el gimnasio es un dato de la ruta.
3. **Configuración como dato** (ADR 0003): ningún archivo de `src` nombra a un cliente.
4. **Esta rama no tiene base de datos** (ADR 0012). Lo que no se contrata no se
   apaga: se borra. Una flag apagada tiene interruptor; una que no existe, no.
5. **Las sedes, sus horarios y las clases viven en el archivo del gimnasio.**
   Eran datos de la base porque gerencia los editaba sin desplegar; sin panel, no
   hay quien los edite.
6. **Una sede es un solo objeto.** Antes vivía partida entre la base (datos) y
   el archivo (texto de vitrina), unidas por `code`. Sin base, ese puente solo
   aporta la posibilidad de que una mitad quede huérfana de la otra.
7. **El fin de una franja de clase es opcional.** Deducirlo copiándolo de otro
   día sería inventar un dato con aspecto de oficial.
8. **Un dato que el cliente no entregó se deja vacío** y la interfaz lo omite:
   correo sin publicar, área sin superficie, sección sin datos apagada.
9. **El formulario no simula un envío.** Lo peor que puede hacer un formulario
   es perder lo que alguien escribió sin decírselo.
10. **PDF = impresión del navegador. Gráficos SVG propios, sin librería.**

---

## 7. Cómo se verifica

### 7.1 Antes de cada commit relevante

```bash
cd apps/web
npm run typecheck
npm test             # 24 pruebas: dominio puro, validador y contrato de la landing
npm run build        # valida también la configuración del gimnasio
npm audit            # debe dar 0
```

> **Nota de entorno:** en el shell Bash de esta máquina `npm run <script>` no
> ejecuta nada (sale 0 o 1 sin salida). Usar la herramienta de PowerShell, o
> llamar directo: `npx next build`, `node --import ./tests/alias.mjs --test 'tests/*.test.ts'`.

```bash
# Dependency Rule: salida vacía
grep -rnE "from '(@infra|@/presentation|@/app|next|react)" apps/web/src/core/domain
grep -rn "from '@infra" apps/web/src/core/application
# ADR 0003: ningún archivo de src nombra al cliente (salida vacía)
grep -rn "mitico" apps/web/src --include=*.ts --include=*.tsx | grep -v "tenant.registry" | grep -vE ':\s*(\*|//|/\*)'
# ADR 0012: ni base de datos, ni sesión, ni panel (salida vacía)
grep -rniE "supabase|memberLogin|acceso socios|service_role" apps/web/src --include=*.ts --include=*.tsx
# Voseo en textos (salida vacía)
grep -rnE "(pagás|tenés|querés|podés|hacés|necesitás|preferís|ahorrás|contanos|\bsos\b)" apps/web/src apps/web/tenants --include=*.ts --include=*.tsx
```

### 7.2 Tras desplegar (sobre el dominio)

```bash
B=https://<dominio>
for r in / /mitico /mitico/planes /mitico/clases /mitico/horarios /mitico/instalaciones \
         /mitico/sucursales /mitico/contacto /mitico/acceso /mitico/panel /mitico/pago/qr /no-existe; do
  printf "%-26s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' "$B$r")"
done
curl -sI "$B/mitico" | grep -iE 'permissions-policy|content-security-policy'
```

Esperado: `/` **308**, las diez públicas **200**, `acceso`/`panel`/`pago` y
`/no-existe` **404**, `camera=()` y `connect-src 'self'`.

**Verificado en local el 2026-09-16** sobre `next start` con el build de
producción: exactamente esos códigos.

---

## 8. Deuda y pendientes

### 🔴 Alta — antes de publicar

1. **Datos que tiene que confirmar el cliente.** Ninguno se inventó; están
   marcados como `PENDIENTE` en la cabecera y el cuerpo de
   `tenants/mitico.tenant.ts`:
   - **Dirección postal exacta de cada sede.** Hoy se publica la zona.
   - **Correo de contacto** (hoy vacío, la fila no se dibuja).
   - **Cifras de la portada** (`content.hero.stats`): «5 disciplinas dirigidas»
     y «6 rutinas personalizadas» salen de los documentos; «2 sedes» y
     «16 h abierto cada día» también, pero conviene que el cliente las apruebe.
   - **Relato de «Nosotros»** y descripciones de instalaciones: redacción propia.
   - **Hitos de «Nuestra historia»**: vacíos, la sección no se dibuja.
   - **Fotografías reales** (galería y programas): hoy, composiciones de marca.
   - **Superficie y fichas de cada área** de instalaciones.
   - **Equipo y testimonios**: sin datos, secciones apagadas. Si el cliente los
     entrega, encender `showTeam` / `showTestimonials` y rellenarlos.
   - **Qué incluye la rutina «Avengers Unidas»** (550 Bs sin desglose).
   - **Hora de cierre del baile fitness del martes** (hoy solo el inicio).
   - **Mapa:** `contact.mapEmbedUrl` y los de cada sede apuntan al negocio
     genérico; conviene una URL por sucursal.
2. **Revisión humana de la vitrina** en escritorio y en 375 px: pestañas de
   instalaciones, horarios y clases; formulario de contacto abriendo WhatsApp
   con el mensaje redactado; mapas de las dos sedes.
3. **Despliegue.** Esta rama todavía no se ha desplegado. El proyecto de Vercel
   al que hoy apunta `apps/web/.vercel` es `gold-gym` (de otra rama): **crear un
   proyecto propio para Mítico** o enlazar el que el usuario indique. No
   desplegar sin que lo pida.

### 🟡 Media

4. **`DEFAULT_FEATURE_FLAGS` contradice «fallar cerrado»:** varias flags nacen
   en `true` y se usan como base de spread.
5. **`DEFAULT_TENANT_SLUG` cae a un slug concreto** en `tenant.registry.ts`.
6. **`/mitico/nosotros` y `/mitico/servicios` no tienen guarda de flag** (hoy
   dependen solo de `publicSite`).
7. **Sin CI.** Falta GitHub Actions con typecheck + test + build + audit + greps.
8. **Cobertura de pruebas:** hay 24 (dominio de horarios, clases, sedes,
   instalaciones, el validador y el contrato de la landing). Faltan
   `build-theme` y `branding.types`.
9. **Documentos heredados que describen el sistema completo** y no esta rama:
   `docs/architecture/overview.md`, `multi-tenancy.md`,
   `docs/tenants/alta-de-gimnasio.md` y los ADR 0004 a 0011. Se conservan como
   historia del producto; ADR 0012 dice cuáles no aplican aquí.
10. **Enlaces del pie a 36 px de alto** (< 44 px de §1.6).

### 🟢 Bajo

11. El menú móvil se mantiene montado y oculto con `hidden` (decisión, no bug).
12. `tests/alias-hooks.mjs` usa `module.register()`, que Node marca como
    obsoleto a favor de `registerHooks()`. Funciona; migrar cuando moleste.

---

## 9. Historial de la rama

| Fecha | Qué pasó |
|---|---|
| 2026-09-22 | **`miticogym-v4`** (desde `miticogym-v3`). Logotipo oficial del CEO (versión plana `MF PNG.png`; el render 3D en pared se descartó) como isotipo de la cabecera y del pie, y como favicon completo (`.ico` 16/32/48, 192, 512, Apple 180), todo generado por `scripts/generar-marca.mjs` desde un maestro en `brand/mitico/`. Paleta movida al verde exacto del logo, `#00FA2D` (antes `#39FF14`), con tonos derivados del mismo matiz y contraste AA o mejor. Los 17 verdes escritos a mano en componentes pasan al token `--t-action-rgb`. Cabecera: sin la lógica muerta de `/v2`, filo y línea activa en el verde de la marca, botón que no se corta a 1024 px. El logo del pie enlazaba a `/mitico/v2` (404): corregido. Validador: rutas de marca y existencia de archivos. 29 pruebas; build de 10 páginas; `npm audit` 0. |
| 2026-09-16 | **Creación de `miticogym-v1`** desde `feat/goldgym-v1`. Se borran panel, acceso, cobro por QR, middleware, autenticación, los 12 adaptadores de Supabase, los 13 puertos operativos, `core/domain/operations`, los otros dos gimnasios del registro y las carpetas `supabase/`. Las flags de operación salen del contrato. Sedes, horarios y clases pasan a `TenantConfig` con **los datos oficiales de los dos documentos del cliente**; los paquetes con dos precios usan `altPrice`; el botón vuelve a «Consultar». Instalaciones, horarios y clases se presentan en pestañas por sucursal. Equipo y testimonios se apagan por no tener datos reales. El formulario de contacto pasa a componer el mensaje de WhatsApp en vez de perder lo escrito. ADR 0012; 24 pruebas; build de 10 páginas estáticas; `npm audit` 0. |

**De dónde viene esta rama.** `feat/goldgym-v1` = V4.1 del producto completo
(tres gimnasios, panel, base de datos). La historia de V1 a V4.1 está en
[`docs/historial/bitacora-v1-a-v2.2.md`](docs/historial/bitacora-v1-a-v2.2.md) y
en los ADR 0001 a 0011.

**Trabajo rescatado al crear la rama.** Al ramificar había cambios sin
commitear de `feat/goldgym-v1` (una sucursal nueva de GOLD en El Alto:
`golds-gym-premium.tenant.ts` y una migración). **Están a salvo en un stash**,
no se perdieron:

```bash
git stash list          # "WIP goldgym-v1: sucursal El Alto (rescatado al crear miticogym-v1)"
git checkout feat/goldgym-v1
git stash pop
```
