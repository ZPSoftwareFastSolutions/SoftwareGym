# CLAUDE.md — GYM PLATFORM · Memoria y reglas de trabajo

> Archivo de contexto persistente. Claude Code lo carga al abrir una sesión en
> este repositorio. **Describe el sistema tal como está HOY**, no cómo se llegó
> hasta aquí.
>
> - **Última actualización:** 2026-09-11 · cierre de **V3.0 multisucursal**.
> - **Rama de trabajo vigente:** `feat/v3.0-multisucursal` → de ella sale V3.1.
> - **Roadmap de la serie V3:** `GYM_PLATFORM_ROADMAP_V3.md` (lo aporta el
>   usuario; no vive en el repositorio). Decisiones de V3.0: [ADR 0005](docs/architecture/adr/0005-multisucursal.md).
> - **Historia completa** (cada fase, cada defecto con su prueba, cada decisión
>   con su contexto): [`docs/historial/bitacora-v1-a-v2.2.md`](docs/historial/bitacora-v1-a-v2.2.md).
>   No se mantiene; si contradice a este archivo, manda este archivo.
>
> **Regla de mantenimiento:** se actualiza al cerrar cada avance importante
> (feature completa, cambio de arquitectura, despliegue, migración) y al final
> de cada sesión. Cambian sobre todo §12 (deuda) y §14 (historial); el resto
> solo cuando cambia una decisión de fondo.

---

## 0. Para una sesión nueva: lo esencial en un minuto

| | |
|---|---|
| **Qué es** | Software **enlatado** multi-tenant para gimnasios: un solo código, un archivo de configuración por cliente. |
| **Stack** | Next.js 16.3.4 (App Router) · React 19.1 · TypeScript 5.9 estricto · Tailwind v4 · Supabase (Auth + PostgreSQL 17 con RLS + Storage) · Vercel |
| **Código** | Todo en `apps/web`. `src/Backend/` (.NET) son solo README: **no hay backend propio**. |
| **En producción** | https://gym-platform-alpha.vercel.app (desplegado desde `feat/v3.0-multisucursal`, commit `eb3b0ff`, 2026-09-11) |
| **Clientes demo** | `/mitico` (real, todas las capacidades, **dos sedes: Prado y Miraflores**) · `/aurora-fit` (demo, solo sitio público, sede única Recoleta) |
| **Estado** | V1 ✅ sitio público · V2 ✅ login · V2.1 ✅ dashboards, asistencia QR, reportes · V2.2 ✅ gestión de socios, cobro por QR · **V3.0 ✅ multisucursal** |
| **Siguiente** | **V3.1**: entrenadores + ejercicios (§13). Luego V3.2 rutinas, V3.3 clases/sesiones, V3.4 reservas |

**Antes de tocar nada, léase:** §2 (reglas), §3 (arquitectura), §4 (seguridad
de datos) y §12 (deuda viva).

**Cinco reglas que no se rompen nunca:**

1. **Enlatado:** un gimnasio nuevo = un archivo de configuración + registrarlo.
   Si hay que tocar un componente, una ruta o una consulta para un cliente, el
   diseño está mal.
2. **El aislamiento vive en la base (RLS), no en el código.** Esconder un botón
   no es seguridad. Toda tabla nueva nace con RLS y políticas por
   `app.tenant_allows(tenant_id, 'permiso')`.
3. **Capacidad apagada = ruta 404**, no enlace oculto (`loadTenantPage(params, [flags])`).
4. **`service_role` jamás** al repositorio, al navegador ni a `NEXT_PUBLIC_*`.
5. **Verificar probando, no leyendo:** typecheck + build + audit + pruebas de
   RLS con sesión simulada (§9). Casi todos los defectos serios de este
   proyecto aparecieron así.

---

## 1. Objetivo del producto

**GYM PLATFORM** es un **software enlatado vertical** para gimnasios,
desarrollado por **ZP Software Fast Solutions**. No se construye el sistema de
un gimnasio: se construye un **producto reutilizable** que se vende muchas
veces. Cada cliente recibe una instancia configurada —identidad visual,
contenido, planes, capacidades contratadas— sin bifurcar el código.

### La prueba de aceptación

> **Dar de alta un gimnasio son dos pasos: crear su archivo de configuración y
> registrarlo. Si hiciera falta tocar un componente, una ruta, una hoja de
> estilo o una consulta, el producto habría dejado de ser enlatado.**

Toda decisión técnica se juzga contra esa frase.

### Evolución

```text
V1   ✅  Sitio público multi-tenant, configurable, estático
V2   ✅  Base de datos (Supabase), aislamiento RLS, login y registro
V2.1 ✅  Dashboards por rol, asistencia con QR, notificaciones, reportes
V2.2 ✅  Gestión de socios, cobro por QR con comprobantes, racha, reportes híbridos
V3.0 ✅  Multisucursal: sedes, usuario↔sede, asistencia por sede, vistas y vitrina
V3.1 ⏭  Entrenadores + ejercicios
V3.2     Programas + rutinas + asignaciones
V3.3     Clases + sesiones (con sede)
V3.4     Reservas
V4       Suscripciones, licencias, facturación, integraciones
```

Son **fases del mismo producto**: el código evoluciona, no se copia. La API
.NET que preveía el plan original (V1.5) **no se construyó**; Supabase cubre
identidad, datos y almacenamiento (ADR 0004). Si algún día existe, debe
propagar el JWT del usuario, nunca usar `service_role`.

---

## 2. Reglas de estilo y código

### 2.1 Idioma

| Elemento | Idioma |
|---|---|
| Comentarios y documentación | **Español** |
| Nombres de dominio de V1 (`PlanCard`, `tenant`, `features`) | Inglés técnico |
| Módulos operativos desde V2.1 (`FichaDeSocio`, `calcularRacha`, `PERMISO`) | Español (convención vigente del código operativo; respetarla al extender) |
| Tablas y columnas SQL | Inglés (`customers`, `payment_receipts`); funciones nuevas en español (`registrar_socio`) |
| Textos visibles al usuario final | **Español neutro de Bolivia**: «entrena», «elige», «puedes». **Sin voseo.** |
| Mensajes de commit | Español, con cuerpo que explica **por qué** |

Los comentarios explican **por qué**, nunca **qué**. Uno que parafrasea la
línea de abajo es ruido; uno que explica la decisión, el riesgo que evita o el
bug que costó encontrar, vale su espacio. Los archivos abren con un bloque
`CAPA: …` que dice a qué capa pertenecen y por qué existen.

### 2.2 TypeScript

- `strict: true` **y** `noUncheckedIndexedAccess: true`. No se relajan.
- Cero `any`: `unknown` y se estrecha. Cero `@ts-ignore` sin justificación.
- `interface` para contratos, `type` para uniones. `readonly` por defecto.
- Tipos con marca nominal para valores validados (`TenantSlug`, `CssColor`).
- Todo dato que entra de fuera (configuración, formulario, base) se **valida en
  tiempo de ejecución**. TypeScript garantiza la forma, no los valores.
- Alias: `@core/*` → `src/core`, `@infra/*` → `src/infrastructure`, `@/*` → `src`.

### 2.3 Arquitectura — Dependency Rule

```text
presentation / app  →  application  →  domain
                            ↑
                 infrastructure (implementa los puertos)
```

| Regla | Comprobación |
|---|---|
| `core/domain` no importa de ninguna otra capa ni de frameworks | grep de §9 vacío |
| `core/application` no importa de `infrastructure` | Los puertos se declaran en `application/ports` |
| Solo el composition root construye adaptadores | `infrastructure/config/composition-root.ts` |
| Ningún componente lee un color de marca | Solo tokens semánticos |
| Ningún archivo de `src` nombra a un cliente | grep del ADR 0003 (§9) |

### 2.4 Componentes

- **Server Components por defecto.** `'use client'` lo más abajo posible.
- Átomos y moléculas (`presentation/ui`) **no conocen el dominio ni hacen fetch**.
- Variantes como **enum**, nunca booleanos combinables.
- Composición sobre configuración: antes de la octava prop, partir o usar `children`.
- Un componente usado una sola vez vive junto a su feature; pasa a `ui/` con el
  **tercer** consumidor real.
- Código pesado de cliente se carga bajo demanda (`next/dynamic`): el lector de
  QR y el formulario de acceso solo bajan al abrirse.

### 2.5 Estilos

- **Nunca** un color literal en un componente: tokens `--t-*`. Excepciones
  justificadas y comentadas: el fondo blanco del QR (contraste de lectura) y el
  lienzo de reducción de imágenes.
- Valores arbitrarios de Tailwind: uno aislado se tolera, tres en un componente no.
- Propiedades lógicas (`ms-`, `me-`, `start-`, `end-`). Mobile-first.
- No pasar por `className` utilidades que compitan con las propias del
  componente (`hidden` pierde contra `inline-flex`; ver `lib/cn.ts`).

### 2.6 Accesibilidad — no negociable

- Foco visible siempre. Objetivos táctiles de 44 px en controles principales.
- HTML semántico antes que ARIA: tablas reales con `<caption>` y `<th scope>`.
- Todo gráfico SVG lleva su alternativa textual (tabla oculta visualmente).
- `prefers-reduced-motion` respetado. Contraste AA en paleta clara y oscura.

### 2.7 Seguridad

- Fallar cerrado: una flag ausente no habilita nada; un tenant que no se
  resuelve lanza o da 404, nunca cae a un valor por defecto.
- Ocultar un enlace **no** desactiva nada: la ruta responde 404 y la base niega.
- El tenant **nunca** sale del formulario: sale de la ruta (re-resuelta contra el
  registro) o de la sesión (`app.current_tenant_id()`).
- `getUser()`, nunca `getSession()`, para decidir accesos.
- Imágenes subidas: se valida la **firma binaria** (magic bytes), no el `Content-Type`.
- `rel="noopener noreferrer"` en enlaces externos. `npm audit` limpio antes de desplegar.
- Cero secretos en el repositorio (ver §7 sobre la clave publicable, que sí es pública).

### 2.8 Dependencias

Tres preguntas antes de instalar: ¿cuánto pesa?, ¿qué arrastra?, ¿cuántas
líneas propias ahorra de verdad? Versiones **exactas**, sin `^`.

| Dependencia | Por qué está |
|---|---|
| `next` 16.3.4, `react`/`react-dom` 19.1.1 | Framework (16 por CVE-2025-66478 en 15.x) |
| `@supabase/ssr` 0.8.0, `@supabase/supabase-js` 2.86.0 | Auth con cookie `HttpOnly` y acceso a datos bajo RLS |
| `qrcode-generator` 1.5.0 | Codificar QR: **solo servidor**, no entra al paquete del navegador |
| `jsqr` 1.4.0 | Leer QR con cámara cuando no hay `BarcodeDetector` nativo; carga diferida |

Se descartaron a conciencia: librerías de gráficos (SVG propio), de iconos (set
propio en `presentation/icons/Icon.tsx`), de animación, `tailwind-merge`, de ZIP
(`lib/zip.ts`, ~130 líneas) y generadores de PDF (impresión del navegador).

### 2.9 Git

- Ramas `feat/`, `fix/`, `docs/`, `refactor/` + kebab-case. Versiones: `feat/v3-…`.
- Commits en español con cuerpo que explica el **porqué**. El diff ya dice qué.
- No se commitea código comentado ni restos de prueba.
- Cierre de firma: `Co-Authored-By: Claude …` (lo pide el harness).

### 2.10 Forma de trabajar con el asistente

- **Probar antes de dar por hecho.** Pruebas de base con sesión simulada (§9),
  build real, rutas medidas con `curl` sobre el alias tras desplegar.
- **El asistente no inicia sesión escribiendo contraseñas**, ni con cuentas de
  demostración. Las pantallas con sesión las recorre una persona; el asistente
  verifica permisos y flujos en la base y el sitio público en el navegador.
- Push y despliegue: solo cuando el usuario lo pide (lo ha pedido en cada
  versión cerrada). Confirmar acciones externas no solicitadas.
- Actualizar este archivo al cerrar cada avance importante.
- **«Leaked Password Protection» de Supabase está descartada a conciencia**
  (plan Pro). No volver a reportarla como hallazgo.

---

## 3. Arquitectura actual

### 3.1 Vista general

```text
 Navegador ──► Vercel (Next.js 16)
               ├─ Sitio público por gimnasio ─── estático (SSG, CDN)
               ├─ /[tenant]/pago/*  ──────────── Route Handlers públicos (QR de cobro)
               ├─ /[tenant]/panel/* ──────────── dinámico, Server Components + Server Actions
               └─ middleware.ts ──────────────── solo renueva la cookie de sesión
                        │  cliente de servidor con la cookie del usuario (nunca service_role)
                        ▼
               Supabase  (proyecto dnclwawnjnzqqxgsuhpn · us-west-2)
               ├─ Auth ─────── cuentas; disparadores asignan tenant, rol y vínculo a la ficha
               ├─ PostgreSQL ─ 19 tablas con RLS, 17 vistas security_invoker, 5 RPC invocador
               └─ Storage ──── comprobantes (privado) · qr-pagos (público)
```

**La configuración de cada gimnasio (marca, contenido, flags) vive en archivos
versionados** (`apps/web/tenants/*.tenant.ts`); **los datos operativos** (socios,
membresías, pagos, asistencia **y sucursales**) **viven en Supabase**. Las sedes
NO se declaran en el archivo del tenant: gerencia las edita en el panel y la
vitrina las lee de la base (ISR 5 min). La tabla `tenants` de la
base existe y comparte `slug`, nombre, zona horaria y moneda con el archivo; el
puente es el `slug`. Mudar la configuración a la base es deuda declarada (§12).

### 3.2 Mapa del código (`apps/web`)

```text
tenants/                         ← LO ÚNICO POR CLIENTE
  mitico.tenant.ts               Mítico Fitness (datos reales, plan professional)
  aurora-fit.tenant.ts           Aurora Fit (demo, plan starter)
src/
  middleware.ts                  Renueva sesión y la cookie de pista gp-sesion. NO autoriza.
  app/
    page.tsx, not-found.tsx, sitemap.ts, robots.ts   Vitrina de la plataforma y SEO
    auth/confirmar/route.ts      Retorno del correo de confirmación (PKCE y token_hash)
    [tenant]/
      layout.tsx                 BISAGRA DEL ENLATADO: resuelve el tenant, inyecta tokens, 404 si no existe
      page.tsx + nosotros, servicios, planes, sucursales, instalaciones, galeria, horarios, contacto
      acceso/                    Login y registro (page estática + actions.ts)
      pago/datos, pago/qr        Datos e imagen públicos del QR de cobro
      panel/
        layout.tsx               Cabecera y navegación del panel (entradas filtradas por flag + permiso)
        page.tsx                 Reparte a plataforma | gimnasio | socio según permisos
        _datos.ts                exigirPerfil / exigirPermiso (guardas por página, React cache)
        _acciones.ts             contextoDeAccion (guardas de Server Actions), imagenDeFormulario
        _sucursal.ts             Sede de trabajo: cookie por dispositivo gp-sucursal, resuelta contra v_mis_sucursales
        actions.ts               registrarCheckIn (con sede), cambiarSucursalDeTrabajo, marcarAvisoLeido
        socio/ gimnasio/ plataforma/          Los tres espacios de trabajo
        asistencia/              Check-in (cámara/teclado), estadísticas, historial
        socios/ [id]/ nuevo/ actions.ts       Gestión de socios (V2.2)
        comprobantes/ [id]/imagen/ actions.ts Bandeja de comprobantes y descarga ZIP
        cobros/                  QR del banco (gerencia)
        sucursales/ [id]/ actions.ts          Administración de sedes y personal por sede (V3.0)
        reportes/ [reporte]/ csv/ _filtros.ts Reportes híbridos
  core/
    domain/
      tenant/                    tenant-config.ts (CONTRATO CENTRAL), branding.ts, feature-flags.ts
      catalog/catalog.ts         Servicios, planes, programas, productos, galería, equipo…
      shared/                    Tipos base y marcas nominales
      operations/                Reglas del sistema privado, sin I/O:
        workspace.ts             PERMISO, espacioDeTrabajo(), PerfilOperativo
        attendance.ts            Métodos, resultado de check-in, estadísticas
        dashboard.ts             Indicadores, series, variación
        notifications.ts         Avisos derivados (vencimiento) + manuales
        members.ts               Ficha, alta, validaciones, filtros, edad/cumpleaños
        receipts.ts              Comprobantes, firma binaria de imágenes, nombres en ZIP
        streak.ts                calcularRacha (los días cerrados no la cortan; la sede no existe para ella)
        branches.ts              Sucursal, validarSucursal, resolverSucursalOperativa, repartoPorSucursal, mapas
        periodo.ts               Presets hoy/ayer/7d/30d/mes/mes-anterior/año
        reports.ts               Catálogo de 9 reportes, resumen, serie, CSV seguro
    application/
      ports/                     tenant-repository, operations-repository, members-repository,
                                 receipts-repository (+ PaymentSettingsPort), reports-repository,
                                 branches-repository (+ PublicBranchesPort), resultado
      tenant/get-tenant.usecase.ts, theming/build-theme.ts, auth/login.usecase.ts
  infrastructure/
    config/composition-root.ts   ÚNICO sitio que construye adaptadores
    tenants/                     tenant.registry.ts, static-tenant.repository.ts, tenant.validator.ts
    auth/                        supabase.config.ts, supabase.server.ts, supabase.public.ts (anónimo, sin cookies),
                                 cookie-options.ts, session-hint.ts
    operations/                  supabase-{operations,members,receipts,reports,branches}.repository.ts, qr.ts
  presentation/
    ui/                          Átomos/moléculas: Button, Badge, Modal (Dialogo), StatCard, DataTable,
                                 Campo, BarChart, DonutChart, HeatMap, QrCode, EmptyState, Logo, Reveal…
    patterns/                    Organismos: SiteHeader/Footer, AccessForm/Modal, CheckInPanel, QrScanner,
                                 FichaDeSocio, SocioForms, ComprobanteForms, AjustesDeCobroForm,
                                 PaymentQrModal, ContenidoDePagoQr, RachaCalendario, ReportFilters,
                                 NotificationsPanel, DashboardNav, AccionConEstado, SelectorDeImagen,
                                 SelectorDeSucursal, SucursalForm, TarjetaDeSucursal…
    sections/                    Secciones del sitio público (Hero, Plans, TrainingPlans, Products, Branches…)
    layouts/PageHero.tsx, icons/Icon.tsx
  lib/                           cn, formato (fechas/importes/hoyEnZona), page-guards, tenant-links,
                                 site-url, cobro, zip
  styles/globals.css             Sistema de diseño: tokens, utilidades, impresión
```

~20 000 líneas en `src`. Pruebas de dominio en `apps/web/tests` (`npm test`). `supabase/migrations/README.md` lista las migraciones;
`docs/` guarda ADR, guías y runbooks (algunos describen solo V1: ver §12).

### 3.3 Capas y piezas clave

**Composition root.** `tenantRepository()` es singleton de proceso (config
estática). Los repositorios de datos (`operationsRepository`,
`membersRepository`, `receiptsRepository`, `reportsRepository`,
`paymentSettingsRepository`) **se crean por petición** con el cliente de
Supabase que lleva la cookie de quien pregunta: cachearlos serviría los datos
del primer usuario a todos. Se importan de forma dinámica.

**Guardas en tres niveles** (ninguna sustituye a la siguiente):

| Nivel | Pieza | Qué decide |
|---|---|---|
| Página pública | `loadTenantPage(params, flags)` (`lib/page-guards.ts`) | 404 si el tenant no existe o la capacidad no está contratada |
| Página del panel | `exigirPerfil(slug)` / `exigirPermiso(slug, permiso)` (`panel/_datos.ts`) | Sin sesión → acceso; tenant ajeno → su panel; sin permiso → su espacio |
| Server Action | `contextoDeAccion(form, flags, permiso)` (`panel/_acciones.ts`) | Re-resuelve slug, flags, sesión, tenant y permiso en cada envío |
| Base de datos | RLS + grants por columna + RPC invocador | **Lo único que protege los datos de verdad** |

**Resultado de escritura.** Los repositorios devuelven
`ResultadoDeOperacion<T>` (`exito`/`fallo` con mensaje legible), nunca lanzan
errores de Supabase a la interfaz. Los UPDATE usan `.select('id')` para
distinguir «RLS lo bloqueó» (0 filas) de «se guardó».

**Espacios de trabajo.** `espacioDeTrabajo(perfil)` decide por **permisos**, no
por nombre de rol: `tenants.manage` → plataforma; `dashboard.read` → gimnasio;
resto → socio. Un rol nuevo llega solo a su sitio.

**Sede de trabajo (V3.0).** Quien atiende opera EN una sede. Se guarda en la
cookie `gp-sucursal` (HttpOnly, por dispositivo, path `/<slug>`) y se resuelve
en cada petición con `contextoDeSucursal(perfil)` contra `v_mis_sucursales`:
preferencia válida → principal → primera operable. La cookie es preferencia,
no permiso: al registrar, la base vuelve a exigir `app.puede_operar_sucursal`.
El check-in envía la sede que la pantalla mostraba (campo `sucursal`).

**«Hoy» es del gimnasio.** Nunca `new Date()` del servidor para fechas de
negocio: `repo.hoyDelGimnasio(slug)` (base, `app.hoy_del_gimnasio`) o
`hoyEnZona()` (`lib/formato.ts`) en rutas sin sesión. La Paz es UTC-4.

### 3.4 Renderizado y sesión

- **Sitio público estático** (SSG por tenant, `dynamicParams = false`). El layout
  del tenant **no lee cookies**: si lo hiciera, todo el sitio saldría del CDN.
  El inicio, `/sucursales` y `/contacto` llevan `revalidate = 300` (ISR) porque
  muestran las sedes de la base; las leen con `createSupabasePublicClient`
  (anónimo, sin cookies).
- **`/panel/*`, `/pago/*` y `/auth/confirmar` son dinámicos.**
- **Cookie de sesión `HttpOnly`/`Secure`/`SameSite=Lax`** forzada en
  `cookie-options.ts` (tanto en el cliente de servidor como en el middleware).
- **Cookie de pista `gp-sesion=1`** (no `HttpOnly`, sin datos): la cabecera
  pública la lee para mostrar «Mi panel» en vez de «Acceso socios». **No es
  control de seguridad.** La escriben el middleware **y** las acciones
  `iniciarSesion`/`cerrarSesion` (`marcarSesionAbierta/Cerrada`), porque la
  respuesta de una Server Action con `redirect` no vuelve a pasar por el middleware.
- El middleware **no autoriza**; cada ruta protegida comprueba por su cuenta.
- Next 16 avisa que `middleware.ts` pasa a llamarse `proxy` (deuda, §12).

### 3.5 El enlatado: configuración, tema y capacidades

- **`TenantConfig`** (`core/domain/tenant/tenant-config.ts`): slug, nombre,
  dominios, `branding`, `contact`, `social`, `hours` (con zona horaria y días
  cerrados), `navigation` (cada entrada puede exigir una flag), `features`,
  `seo`, `content` (hero, about, services, planGroups, trainingPlans, products,
  facilities, gallery, team, testimonials, faq, closingCta, `paymentQr`,
  `branches`: texto de vitrina de las sedes unido a la base por `code`) y
  `provisioning` (plan, estado).
- **Registro y validación:** `tenant.registry.ts` lista los tenants;
  `tenant.validator.ts` corre en el build: una configuración inválida rompe el
  build, no la página en producción.
- **Tema en dos capas de tokens:** `build-theme.ts` deriva `--t-*` del branding
  (validado antes de inyectarse en `:root`) y `globals.css` los mapea a
  `--color-*` para Tailwind. Namespaces separados a propósito (la
  auto-referencia en `@theme inline` dejaba la página en blanco).
- **Planes con código:** cada plan del archivo y de `membership_plans` comparte
  un `code` (`basico`, `fit`, `mitico`…): así «Pagar con QR» en la página
  pública preselecciona el plan en el panel del socio (`?pagar=<code>`).

**Feature flags** (`feature-flags.ts`, 25 en total; V3.0 reutiliza `enableMultiBranch`, no añade otra):

| Flag | Qué habilita | Mítico | Aurora |
|---|---|---|---|
| `publicSite`, `showPlans`, `showGallery`, `showFacilities`, `showSchedule`, `showTestimonials`, `showFaq`, `showLocationMap`, `whatsappFloatingButton`, `contactForm`, `memberLogin` | Sitio público y acceso | según config¹ | según config¹ |
| `showTeam`, `showProducts`, `showTrainingPlans` | Equipo, productos, programas | ✅ | ❌ |
| `enableAttendance`, `enableQrAttendance` | Asistencia y check-in por QR | ✅ | ❌ |
| `enableNotifications` | Avisos al socio | ✅ | ❌ |
| `enableReports` | Reportes y CSV | ✅ | ❌ |
| `enablePayments` | Cobro por QR, comprobantes, `/pago/*`, `/panel/cobros` | ✅ | ❌ |
| `enableMemberManagement` | `/panel/socios` (alta, ficha, edición, venta) | ✅ | ❌ |
| `enableMultiBranch` | **V3.0**: selector de sede, `/panel/sucursales`, vistas y reporte por sede, sección pública «Nuestras sucursales». Apagada = sede única (las entradas igual llevan sede) | ✅ | ❌ |
| `enableReservations`, `enableTrainers`, `enableRoutines`, `enableClasses` | **Reservadas para V3.1–V3.4** | ❌ | ❌ |

¹ Ambos parten de `...DEFAULT_FEATURE_FLAGS`. Mítico tiene `showGallery` y
`showSchedule` apagadas a la espera de fotos y horarios confirmados; Aurora
apaga `showTeam`, `showFaq` y `showLocationMap`. **Ojo:** los defaults del
sitio público están en `true`, lo que contradice «fallar cerrado» (§12).

---

## 4. Datos y seguridad (Supabase)

**Proyecto** `dnclwawnjnzqqxgsuhpn` (org «Z&P Software Fast Solutions») ·
PostgreSQL 17 · `us-west-2` · plan gratuito.

### 4.1 Principios que sostienen el aislamiento

1. **`tenant_id` en toda tabla de negocio** y como primera columna de sus índices.
2. **RLS activo en las 19 tablas**, sin política = denegado. 60 políticas en
   `public` + 7 en `storage`.
3. **El tenant sale de la identidad:** `app.current_tenant_id()`,
   `app.current_customer_id()`, `app.current_app_user_id()`. Autorización:
   `app.tenant_allows(tenant_id, 'modulo.accion')` y `app.has_permission`.
4. **Esquema `app` fuera de la API.** Las funciones `SECURITY DEFINER` viven ahí
   (PostgREST publica todo `public` como `/rpc`). **En `public` no hay ninguna
   función DEFINER**: las 4 RPC son `SECURITY INVOKER` y corren bajo RLS.
5. **Claves foráneas compuestas** `(tenant_id, customer_id) → customers(tenant_id, id)`
   (y análogas con planes, membresías, pagos, **sucursales** y **usuarios**): el
   motor impide que una fila de un gimnasio apunte a un socio o a una sede de otro.
6. **Vistas con `security_invoker = true`** (sin eso saltarían RLS).
7. **Grants por columna** donde importa (qué columnas de un comprobante se
   pueden insertar o revisar; qué se puede rotar de un token).
8. **La autoría sale de la sesión**: defaults `app.current_app_user_id()` en
   `submitted_by`, `updated_by`, `created_by`; nunca del formulario.
9. **El super admin no lee socios ni pagos** de los gimnasios (mínimo privilegio).
   Sí ve las sedes (configuración, no datos personales).
10. **Alcance por sede (V3.0):** la base acota la OPERACIÓN (INSERT de asistencia
    exige `app.puede_operar_sucursal(branch_id)`); la LECTURA del historial sigue
    siendo del gimnasio, porque ficha, racha y «ya entró hoy» son del socio.

### 4.2 Tablas (19)

| Área | Tabla | Notas |
|---|---|---|
| Plataforma | `tenants` | slug, nombre, `timezone`, `currency`, `status`, `is_demo` |
| Sedes (V3.0) | `branches` | `code` único por tenant, nombre, dirección, teléfono, correo, `opening_hours` (texto), lat/long, `google_maps_url` (solo Google), `is_primary` (una por tenant, solo por RPC), `is_active` (sin DELETE). `tenant_slug` por disparador para la vitrina anónima |
| | `user_branches` | N:M usuario↔sede con `is_active` (retirar = desactivar). FK compuestas a `branches` y `app_users` |
| Identidad | `app_users`, `roles`, `permissions`, `role_permissions`, `user_roles` | `app_users.auth_user_id` → `auth.users`; `customer_id` vincula cuenta ↔ ficha |
| Gimnasio | `customers` | Código correlativo (`MF-001`), se **archivan** (`deleted_at`), no se borran |
| | `membership_plans` | `code` único por tenant, `duration_days`, `price` |
| | `memberships` | Precio **congelado**; «por vencer» es **derivado** (vista), no se guarda |
| | `payments` | **Sin UPDATE ni DELETE**: un error se corrige con asiento inverso. `idempotency_key` |
| Operación | `attendance_records` | Una entrada por socio y día (única, **aunque sea en otra sede**); `attendance_date` fijada en zona del gimnasio; `branch_id` con FK compuesta y `CHECK NOT VALID` (obligatoria en filas nuevas; el histórico previo a V3.0 queda NULL); solo se insertan `tenant_id, customer_id, branch_id, method` |
| | `check_in_tokens` | Token opaco de 24 hex por socio, rotable; un disparador fuerza que sea aleatorio |
| | `notices`, `notice_reads` | Avisos manuales y su marca de leído |
| | `audit_log` | Escriben los disparadores de sedes y asignaciones y el cambio de sede de trabajo (V3.0). `actor_user_id` sale de la sesión |
| Cobro (V2.2) | `payment_receipts` | Estado `pendiente/aprobado/rechazado`, origen `recepcion/socio`; sellado tras revisión; **aprobado ⇔ tiene pago** (CHECK) |
| | `tenant_payment_settings` | QR del banco (ruta en Storage), titular, banco, nota, vencimiento; lectura pública |

Enums: `payment_method` (`cash, qr, transfer, card, other`), `attendance_method`
(`manual, qr, kiosk`), `receipt_status`, `receipt_source`, estados de
membresía/socio/tenant.

### 4.3 Vistas (17, todas `security_invoker`)

`v_my_profile` (perfil + roles + permisos de quien entra) · `v_customer_overview`
· `v_customer_detail` · `v_memberships` (estado efectivo) ·
`v_expiring_memberships` · `v_memberships_report` · `v_payments_report` ·
`v_revenue_monthly` (no cuenta cobros futuros) · `v_dashboard_kpis` ·
`v_attendance_daily` · `v_attendance_log` (hora local, sede y `membership_id`
**derivado**: la membresía activa que cubría ese día) · `v_receipts` ·
`v_users_roles` · `v_platform_overview` (+ `sucursales`) ·
**V3.0:** `v_attendance_branch_daily` (serie por sede; `branch_id` NULL = histórico) ·
`v_branch_overview` (hoy, 7 d, 30 d, socios distintos 30 d y personal por sede) ·
`v_mis_sucursales` (sedes del gimnasio con `puede_operar` de la sesión).

> Los reportes leen de vistas y **no** de embebidos de PostgREST: con claves
> foráneas compuestas hay dos relaciones posibles y el embebido falla.

### 4.4 Funciones

**RPC públicas (`SECURITY INVOKER`, atómicas):**

| Función | Qué hace | Errores de negocio |
|---|---|---|
| `registrar_socio(nombre, apellido, documento, teléfono, correo, nacimiento, nota, plan_id, inicio, método, monto)` | Ficha con código correlativo (reintenta si choca), membresía si hay plan, pago si `monto > 0`, QR por disparador, vínculo con cuenta existente | `sin_permiso`, `nombre_invalido`, `correo_invalido`, `plan_invalido`, `inicio_invalido`, `monto_invalido`, `documento_duplicado` |
| `vender_membresia(customer, plan_id, inicio, método, monto, nota)` | Membresía que empieza al día siguiente de la vigente; pago si `monto > 0` | `socio_no_encontrado`, `sin_permiso`, `plan_invalido`, `monto_invalido` |
| `revisar_comprobante(id, aprobar, nota)` | `FOR UPDATE`; rechazar exige motivo; aprobar crea membresía (si hay plan) + pago con `idempotency_key = 'comprobante:'||id` | `comprobante_no_encontrado`, `comprobante_ya_revisado`, `motivo_requerido`, `sin_permiso` |
| `rotar_token_check_in(customer)` | Nuevo token QR (el disparador pone el valor aleatorio) | — |
| `establecer_sucursal_primaria(branch)` | Cambia la sede principal (delega en `app.fijar_sucursal_primaria`, que repite el permiso) | `sin_permiso`, `sucursal_inactiva` |

**Esquema `app` (25):** contexto (`current_*`, `tenant_allows`,
`has_permission`, `is_platform_admin`, `tenant_de_ruta`, `hoy_del_gimnasio`,
`puede_operar_sucursal`), sedes (`preparar_sucursal`, `exigir_sucursal_disponible`
→ error `sucursal_no_disponible`, `fijar_sucursal_primaria`, `auditar_sucursal`,
`auditar_asignacion_de_sucursal`),
disparadores de Auth (`handle_new_auth_user`: asigna tenant desde el slug
validado y **siempre rol `customer`**, ignorando metadatos;
`vincular_cuenta_confirmada` / `vincular_ficha_por_correo` /
`_enlazar_cuenta_y_ficha`: vinculan cuenta ↔ ficha **solo con correo confirmado
y un único candidato**), y disparadores de filas (`emitir_token_de_check_in`,
`token_siempre_aleatorio`, `set_attendance_date`, `sellar_comprobante_revisado`,
`fijar_slug_de_ajustes`, `touch_*`).

### 4.5 Storage

| Bucket | Acceso | Límite | Ruta |
|---|---|---|---|
| `comprobantes` | Privado. Personal con `payments.read` lee su gimnasio; el socio lee lo suyo | 5 MB · jpeg/png/webp | `{tenant_id}/{customer_id}/{uuid}.{ext}` |
| `qr-pagos` | Público de lectura; escribe `settings.manage` | 2 MB | `{tenant_id}/qr-{timestamp}.{ext}` |

Las imágenes **no se entregan con URL firmada**: pasan por
`/[tenant]/panel/comprobantes/[id]/imagen` (sesión, re-verificación de firma
binaria, `no-store`, CSP de sandbox) y `/[tenant]/pago/qr` (público, 410 si el
QR venció). La CSP (`img-src 'self'`) bloquearía imágenes de otro dominio en
silencio. `storage.protect_delete` impide borrar objetos por SQL.

### 4.6 Roles y permisos (22 permisos)

| Permiso | Super admin | Gerente | Recepción | Socio |
|---|:-:|:-:|:-:|:-:|
| `tenants.manage` | ✅ | | | |
| `users.read`, `users.manage` | ✅ | ✅ | | |
| `audit.read` | ✅ | ✅ | | |
| `dashboard.read` | | ✅ | ✅ | |
| `customers.read`, `customers.create` | | ✅ | ✅ | |
| `customers.update`, `customers.archive` | | ✅ | | |
| `memberships.read`, `memberships.create` | | ✅ | ✅ | |
| `memberships.update` | | ✅ | | |
| `payments.read`, `payments.create` | | ✅ | ✅ | |
| `attendance.read`, `attendance.create` | | ✅ | ✅ | |
| `plans.read` | | ✅ | ✅ | ✅ |
| `plans.manage`, `settings.manage`, `reports.read` | | ✅ | | |
| `branches.manage` (administrar sedes y asignar personal) | | ✅ | | |
| `branches.all` (operar en todas las sedes sin asignación; vista global) | | ✅ | | |

- **Recepción crea, gerencia corrige.** Recepción no edita socios ni membresías
  ni ve reportes/configuración: lo niega la base (UPDATE → 0 filas; CSV → 403).
- **El socio** no tiene permisos operativos: accede a lo suyo por políticas
  «self» (`customer_id = app.current_customer_id()`).
- Los códigos de permiso se nombran en `PERMISO` (`workspace.ts`): cambiar uno
  rompe la compilación en un solo sitio.
- **Operar en una sede** = `attendance.create` **y** `app.puede_operar_sucursal`:
  sede activa del propio gimnasio y (`branches.all` **o** asignación activa en
  `user_branches` **o** es la única sede activa del gimnasio). Recepción de
  Mítico está asignada a Prado y Miraflores; gerencia opera por `branches.all`.
- Leer sedes no requiere permiso: cualquier cuenta del gimnasio las ve; el
  visitante anónimo ve solo las activas y sus columnas públicas.

### 4.7 Migraciones

**31 aplicadas** (`v2_0001` … `v3_sucursal_principal_solo_por_rpc`), listadas
con su propósito en [`supabase/migrations/README.md`](supabase/migrations/README.md).
**Viven solo en el servidor**: materializarlas requiere `npx supabase link` +
`npx supabase db pull`, que pide la contraseña de la base (no disponible en la
sesión). Deuda #1 de §12. Toda migración nueva: `apply_migration` por MCP con
nombre `v3_…` en snake_case español, y añadir su fila al README de migraciones.

---

## 5. Funcionalidad actual

### 5.1 Rutas

| Ruta | Tipo | Capacidad + permiso | Qué hace |
|---|---|---|---|
| `/` | estática | — | Vitrina de la plataforma |
| `/[tenant]` + `nosotros`, `servicios`, `planes`, `instalaciones`, `galeria`, `horarios`, `contacto` | SSG | `publicSite` + flag de sección | Sitio comercial |
| `/[tenant]/sucursales` | SSG + ISR 300 s | `enableMultiBranch` | Todas las sedes: una fila por sede con imagen, mapa, texto de vitrina, datos y «Cómo llegar»; anclas `#sede-CODE` |
| `/[tenant]/acceso` | SSG | `memberLogin` | Login y registro (también en modal desde la cabecera) |
| `/auth/confirmar` | dinámica | — | Confirma correo; destino validado contra el registro (sin redirector abierto) |
| `/[tenant]/pago/datos` · `/pago/qr` | handler | `enablePayments` | JSON e imagen del QR de cobro vigente (caché 60 s / 300 s; 410 vencido) |
| `/[tenant]/panel` | dinámica | sesión | Reparte al espacio que corresponde |
| `…/panel/socio` | dinámica | sesión | Panel del socio |
| `…/panel/gimnasio` | dinámica | `dashboard.read` | Dashboard de gerencia y recepción |
| `…/panel/plataforma` | dinámica | `tenants.manage` | Resumen de gimnasios (sin datos personales) |
| `…/panel/asistencia` | dinámica | `enableAttendance` + `attendance.read` | Check-in, estadísticas, historial |
| `…/panel/socios`, `/nuevo`, `/[id]` | dinámica | `enableMemberManagement` + `customers.*` | Lista, alta, ficha completa |
| `…/panel/comprobantes`, `/[id]/imagen` | dinámica | `enablePayments` + `payments.read` | Bandeja, revisión, ZIP |
| `…/panel/cobros` | dinámica | `enablePayments` + `settings.manage` | Subir QR del banco y vencimiento |
| `…/panel/sucursales`, `/[id]` | dinámica | `enableMultiBranch` + `branches.manage` | Sedes con indicadores, comparativa, alta/edición, activar/desactivar, principal, personal por sede |
| `…/panel/reportes`, `/[reporte]`, `/[reporte]/csv` | dinámica | `enableReports` + `reports.read` + permiso del reporte | Reportes con filtros, impresión y CSV |

Build: 48 páginas generadas; solo `/panel/*`, `/pago/*` y `/auth/confirmar` son dinámicas.
`/[tenant]`, `/[tenant]/sucursales` y `/[tenant]/contacto` son SSG con ISR de 300 s.

### 5.2 Flujos

**Acceso.** Formulario validado en cliente y servidor (nombre sin dígitos,
correo con TLD, contraseña 8–72, distinta del correo). El mensaje de error no
distingue correo inexistente de contraseña incorrecta. `signUp` envía
`emailRedirectTo` a `/auth/confirmar`. El disparador crea `app_users` con rol
`customer` en el gimnasio de la ruta. Si hay una ficha con ese correo y el
correo está confirmado, se vinculan solas. Cerrar sesión es un POST.

**Check-in** (`CheckInPanel` + `registrarCheckIn`). Botón **Cámara**
(`BarcodeDetector` nativo o `jsqr` diferido, muestreo cada 120 ms a 640 px,
patrón `^[0-9A-F]{24}$`) o teclado/lector USB. Una entrada por día (la base lo
garantiza). Membresía vencida: **se registra igual** y avisa. Código inexistente
y código de otro gimnasio dan la **misma** respuesta neutra.

**Multisucursal (V3.0).**
1. **Sede de trabajo:** en la cabecera del panel (personal, flag encendida) un
   selector con las sedes operables; con una sola, su nombre. Cambiarla escribe
   la cookie y audita `branch.operational_changed`.
2. **Check-in:** el QR identifica al socio; la sede la pone el mostrador. La
   entrada queda en esa sede. Mismo día en otra sede → «Ya tenía su entrada de
   hoy en Prado, a las 07:10» (una entrada por día). Sede inactiva →
   `sucursal_no_disponible`; sede sin alcance → «pide a gerencia que te asigne».
3. **Membresía única:** vale en todas las sedes; nada se descuenta al entrar.
   La entrada «usa» la vigencia de la membresía que la cubría (derivada en la vista).
4. **Dashboard:** con `branches.all`, barra «Vista: Global · Prado · Miraflores».
   Global = KPIs del gimnasio + una tarjeta por sede. Vista de sede = mostrador
   grande «Escanear QR», serie y últimas entradas (Sucursal · Estado) de esa sede.
   Sin `branches.all`, siempre la sede de trabajo.
5. **Asistencia:** filtro por sede (incluye «Sin sucursal registrada»), columna
   Sucursal y reparto de 30 días por sede.
6. **Socio:** columna Sucursal en sus entradas y «Este mes: Prado 5 · Miraflores 7».
   La racha usa solo fechas.
7. **Reportes:** filtro `sucursal` en `asistencia` y `asistencia-por-socio`
   (+ columna en `asistencia`); reporte nuevo `asistencia-por-sucursal`
   (requiere la flag: sin ella 404, también su CSV).
8. **Vitrina** (`BranchesSection`, tres presentaciones):
   - Inicio: chips de sedes en el hero, sedes en la franja animada y sección
     `portada` (beneficios de la membresía única y una tarjeta grande por sede
     con número, texto, destacados, dirección, horario y «Conocer la sede»).
   - Página `/sucursales` (en el menú con la flag): presentación `detalle`, una
     fila por sede con imagen + mapa, texto completo y «Cómo llegar».
   - Contacto: presentación `mapas` (sustituye al mapa único).
   El texto comercial de cada sede vive en `content.branches.showcase` del
   archivo del tenant (tagline, descripción, destacados), unido por `code` como
   los planes; dirección, horario y mapa vienen de la base. Una sede sin texto
   se publica igual. Enlace «Ver ubicación» = `google_maps_url` del negocio.

**Cobro por QR y comprobantes.**
1. Gerencia sube el QR del banco con vencimiento en `/panel/cobros`
   (`tenant_payment_settings` + bucket `qr-pagos`). El archivo de configuración
   (`content.paymentQr`) solo aporta titular, banco y nota **de respaldo**.
2. En `/planes`, cada paquete muestra **«Pagar con QR»** → modal con QR, importe
   y pasos (`PaymentQrModal` → `ContenidoDePagoQr`, que pide `/pago/datos`).
   Sin QR vigente, explica que se paga en recepción.
3. El socio sube la captura desde su panel (`subirMiComprobante`); recepción
   puede adjuntarla (`subirComprobante`), incluso al dar de alta a quien pagó
   por QR (el alta se crea sin plan y el comprobante lleva el plan propuesto).
   Las imágenes se reducen en el navegador (1600 px, JPEG 0,85) y el servidor
   valida la firma binaria.
4. Recepción o gerencia **aprueba** (`revisar_comprobante`): membresía + pago
   en una transacción. Ese pago es el que suman dashboards y reportes.
   **Una captura no activa nada hasta que alguien la aprueba.**
5. **Descarga ZIP** (`DescargarComprobantesZip`, `lib/zip.ts`) con filtros
   (hoy, ayer, rango, estado, origen, método) y `resumen.csv`. Se arma **en el
   navegador** porque Vercel corta respuestas de más de 4,5 MB.

**Gestión de socios** (`socios/actions.ts`): `registrarSocio`,
`actualizarSocio`, `archivarSocio`, `restaurarSocio`, `rotarQrDeSocio`,
`desvincularCuentaDeSocio`, `venderMembresia`, `actualizarMembresia`,
`obtenerFichaCompleta`. La lista tiene accesos rápidos con conteo (activos, por
vencer, vencidos, sin membresía, sin venir 7+ días, cumpleaños, archivados).
La ficha (`/socios/[id]`) muestra datos, QR grande y rotación, membresías,
racha, pagos, comprobantes y zona de gerencia. **`FichaDeSocio`** abre la misma
ficha en un modal desde cualquier fila de cualquier historial (`BotonFicha`).

**Panel del socio.** Tarjetas funcionales (plan con días restantes, visitas del
mes, racha con calendario, QR). Membresía con barra de vigencia, **«Mostrar QR»**
a pantalla grande, pagar/renovar con QR y subir comprobante, estado de sus
comprobantes, información personal, últimas entradas y pagos.

**Racha** (`streak.ts`). Días consecutivos con entrada; los días que el
gimnasio cierra según `hours.week` no la cortan; hoy sin entrada todavía la
deja «en riesgo», no rota. Calendario de 12 semanas (`RachaCalendario`).

**Dashboard del gimnasio.** Todas las tarjetas llevan a algo: registrar
entrada (abre la cámara), socios filtrados, por vencer, ingresos del mes,
comprobantes pendientes, nuevo socio, sin venir 7+ días, cumpleaños, estado del
QR de cobro. Gráficos de 30 días, membresías por estado, ingresos por mes;
tablas de vencimientos y últimas entradas con ficha en modal. La pestaña
«Comprobantes» de la navegación muestra el número de pendientes.

**Asistencia.** Tarjetas enlazadas, entradas por día (30 d), mapa de calor
día × hora, reparto por método, por hora; historial con búsqueda por GET
(nombre/código y rango), filas con ficha en modal.

**Reportes** (`reports.ts`, una sola ruta para todos): `asistencia`,
`asistencia-por-socio`, `vencimientos` (operación); `membresias`, `pagos`,
`ingresos-por-plan`, `comprobantes` (dinero); `clientes`, `usuarios` (personas).
Cada definición declara permiso, filtros admitidos (periodo, estado, plan,
método, origen, rol, texto), columnas (sumables/moneda) y gráfico. El CSV usa
los mismos filtros, BOM UTF-8, comillas en todo campo y neutraliza fórmulas
(`= + - @`). **Imprimir/PDF** usa la hoja de impresión: cabecera propia y
`data-print="hide"` en pie del sitio, WhatsApp, navegación y filtros.

**Notificaciones.** Derivadas (vencimiento próximo o vencido, calculado de
`end_date`) + avisos manuales de `notices`, con marca de leído.

---

## 6. Sistema de diseño e interfaz

- **Tokens:** `--t-bg`, `--t-surface`, `--t-raised`, `--t-ink`, `--t-muted`,
  `--t-line`, `--t-action`, `--t-on-action`, `--t-structural`, radios
  `--t-radius-*`… expuestos a Tailwind como `bg-action`, `text-muted`,
  `border-line`, etc. Utilidades propias: `surface-card`, `t-h1…t-h3`,
  `section-y`, `bg-grid`, `bg-aura`.
- **Modales** (`ui/Modal.tsx`) sobre `<dialog>` nativo: `Modal` (con
  disparador, capturado en **fase de captura** para que un `<Link>` no navegue)
  y `Dialogo` (controlado). Anchos `sm…xl`, `montarSoloAbierto` para contenido
  pesado. El bloqueo del scroll es CSS (`html:has(dialog[open])`): el evento
  `close` no llega en todos los entornos.
- **`StatCard`**: unión de props — `href` (enlace), `boton` (disparador de
  modal) o ninguno; `accion` rotula la acción. Regla V2.2: **ninguna tarjeta sin función**.
- **Gráficos SVG propios** renderizados en servidor: `BarChart`, `DonutChart`,
  `HeatMap`, cada uno con tabla alternativa.
- **`DataTable`** con columnas `numerica`/`secundaria`, fila de totales y filas
  con ficha clicable (`BotonFicha` con overlay).
- **Formularios:** `useActionState` + `useFormStatus`; `Campo` +
  `CLASE_DE_CONTROL`; errores por campo devueltos por la acción
  (`EstadoDeFormulario`); los datos se vuelven a validar en el servidor.
- **Impresión:** `@media print` en `globals.css` + `data-print="hide"`.

---

## 7. Entorno, despliegue y servicios

| Servicio | Detalle |
|---|---|
| **Vercel** | Equipo `zp-software-fast-solutions` (`team_isXk9iHT5amXqAUJlB27m9uf`) · proyecto `gym-platform` (`prj_3Mm0F8ZG9Whii4GbFUffyodTbFFy`) · Root Directory `apps/web` · alias público `gym-platform-alpha.vercel.app` |
| **GitHub** | `ZPSoftwareFastSolutions/SoftwareGym` (**público**) · rama por defecto `main` |
| **Supabase** | Proyecto `dnclwawnjnzqqxgsuhpn` · MCP conectado (SQL, migraciones, advisors) |

**Despliegue.** La vía que funciona es la CLI, desde `apps/web`:

```bash
npx vercel deploy --prod --yes
```

Comprobar antes `npx vercel whoami` (cuenta `zapasoftwarefastsolutions-1320`;
el token caducó una vez en V2.1). **El despliegue por push no funciona**: los
Preview fallan con «Cannot patch preview comments when immutable static file
upload is enabled» (conflicto de la barra de comentarios de Vercel, no del
código) y la Production Branch no es la rama de trabajo. Arreglo en el panel
de Vercel: apagar Comments/Toolbar y fijar la Production Branch. El conector
MCP de Vercel da 403 sobre el equipo; la CLI sí lo alcanza. Las URL con hash
piden login de Vercel: **se comparte siempre el alias**.

**Variables de entorno: ninguna es obligatoria.** La URL y la clave publicable
de Supabase tienen valor por defecto en `infrastructure/auth/supabase.config.ts`
(duplicado a conciencia en `next.config.ts` para la CSP). Son **públicas por
diseño** (viajan al navegador) y las protege RLS. Si se definen
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (las dos o
ninguna), mandan. La configuración se valida **al usar, no al importar**: el
build debe compilar sin variables (un `throw` al importar tumbó el primer
despliegue entero).

**Cabeceras** (`next.config.ts`): CSP en bloqueo (`script-src 'self'
'unsafe-inline'`, `img-src 'self' data: blob:`, `connect-src` con el origen de
Supabase, `frame-ancestors 'none'`), `Permissions-Policy` con `camera=(self)`,
`X-Frame-Options DENY`, `nosniff`, COOP. Server Actions con `bodySizeLimit: 4mb`.

**Ajuste pendiente de verificar en Supabase** (panel, no MCP): Authentication →
URL Configuration: Site URL `https://gym-platform-alpha.vercel.app` y Redirect
URL `https://gym-platform-alpha.vercel.app/auth/confirmar*`. Sin eso el correo
de confirmación vuelve a `localhost`.

**Git en esta máquina (Windows).** Credential Manager tiene globalmente la
cuenta `Riceious` (sin permiso de escritura). Se corrige con
`credential.username = ZPSoftwareFastSolutions` en `.git/config` local. Si el
push se cuelga pidiendo contraseña, la caché caducó: un push manual desde una
terminal la renueva. Usar `GIT_TERMINAL_PROMPT=0` en la sesión.

**Desarrollo local:** `.claude/launch.json` define `gym-web` (`npm run dev` en
`apps/web`, puerto 3000) para el panel de navegador.

**Ramas** (cadena lineal; cada una contiene a la anterior):

```text
main (8a0208a, solo el commit inicial)
 └ feat/v1-public-site ─ feat/v2-public-site ─ feat/v2.1-operacion ─ feat/v2.2-gestion  ← VIGENTE
```

`feat/v2-plataforma` existe solo en local y está contenida en v2.2. La copia
local de `feat/v1-public-site` va 2 commits por delante de su remoto (también
contenidos en v2.2). **Nada se ha fusionado a `main`**: decidir con el usuario
si se abre PR de la cadena antes o después de V3. **V3 debe salir de
`feat/v2.2-gestion`.**

---

## 8. Datos y cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Super administrador | `admin@gymplatform.bo` | `Demo.Super.2026` |
| Gerente (Mítico) | `gerencia@miticofitness.com` | `Demo.Manager.2026` |
| Recepcionista (Mítico) | `recepcion@miticofitness.com` | `Demo.Receptionist.2026` |
| Socio (Mítico) | `juan.perez@demo.miticofitness.com` | `Demo.Mitico.2026` |

Otros 9 socios: `nombre.apellido@demo.miticofitness.com` / `Demo.Mitico.2026`.

> ⛔ **Contraseñas predecibles en un repositorio público.** Solo para enseñar el
> producto. Antes de cualquier uso real con datos de socios hay que borrar estas
> cuentas y cambiar las claves.

**Sucursales (2026-09-11):** Mítico → **Prado** (principal · Plaza del Estudiante ·
`maps.google.com/?cid=5209852825009402175` · coordenadas del embed del negocio) y
**Miraflores** (Edificio Torre Vicenta, Av. Argentina 1843 esq. ·
`maps.app.goo.gl/CU6shAKUoYGLpjED7` · sin coordenadas). Aurora → **Recoleta**.
Teléfono y horario por sede vacíos (pendientes del cliente). IDs: Prado
`26ee6a4c-33bf-4bd3-acfa-3f356e759e4c` · Miraflores `ee9dd276-fee1-40b8-8c61-c3b4023d7b33`
· Recoleta `4c402db1-67ee-48d0-ad14-4567c4c2ce52` · recepción (app_user)
`5d29d769-b247-41c4-97fa-4f897fc9d9a5`. Las 154 entradas previas: sin sede.

**Estado de la base (2026-09-10):** 2 gimnasios · 17 planes · 15 cuentas · 10
socios de Mítico (`MF-001…010`, mezcla de activas, por vencer y vencidas) · 11
membresías · 36 pagos (6 meses) · 154 entradas (90 días; Juan Pérez con racha
diaria del 24/08 al 10/09 salvo domingos) · 4 avisos · **0 comprobantes · QR de
cobro sin subir**.

IDs útiles para pruebas con sesión simulada (`sub` = `auth.users.id`):
Mítico `4b79e41f-6d51-407a-a16f-bce8b000b50c` · gerencia
`758b1b40-4e4a-4fee-9bbd-750d03b05f5a` · recepción
`fcef6ed7-6aad-42a5-b543-969eb2acaf81` · Juan Pérez (cuenta)
`a370ad78-0725-4fdc-a8d2-2b1e5b3625d1`, (ficha) `bdd26a0b-058d-4b84-a488-0c8df66a7a86`.

> Usuarios insertados a mano en `auth.users` necesitan `confirmation_token`,
> `recovery_token`, `email_change_token_new` y `email_change` en `''` (no NULL)
> y su fila en `auth.identities`; si no, GoTrue responde 500. El registro por
> formulario rechaza dominios no entregables (`demo.miticofitness.com`).

---

## 9. Cómo se verifica

### 9.1 Antes de cada commit relevante

```bash
cd apps/web
npm run typecheck    # incluye apps/web/tests
npm test             # node --test, sin dependencias: dominio puro (sedes, racha, reportes)
npm run build        # valida también la configuración de todos los tenants
npm audit            # debe dar 0
```

```bash
# Dependency Rule: salida vacía
grep -rnE "from '(@infra|@/presentation|@/app|next|react)" apps/web/src/core/domain
grep -rn "from '@infra" apps/web/src/core/application
# ADR 0003: ningún archivo nombra a un cliente (salida vacía)
grep -rn "mitico\|aurora-fit" apps/web/src --include=*.ts --include=*.tsx | grep -v "tenant.registry" | grep -vE ':\s*(\*|//|/\*)'
# Voseo en textos (los componentes también tienen texto visible)
grep -rnE "(pagás|tenés|querés|podés|hacés|necesitás|preferís|ahorrás|contanos|\bsos\b)" apps/web/src apps/web/tenants --include=*.ts --include=*.tsx
```

Tras cambiar la base: `get_advisors(security)` (solo debe quedar el aviso de
contraseñas filtradas, aceptado).

### 9.2 Pruebas de RLS con sesión simulada

Plantilla que **no deja rastro** (la excepción final revierte todo y devuelve
el resultado en el mensaje de error):

```sql
do $$
declare r text := ''; n int;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '<auth.users.id>', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    update customers set phone = '0' where id = '<uuid literal>';
    get diagnostics n = row_count;
    r := r || format('edita=%s', n);             -- 0 = bloqueado por RLS
  exception when others then
    r := r || format('edita=bloqueado(%s)', sqlstate);
  end;

  -- cambiar de rol = volver a llamar a set_config con otro sub
  raise exception 'RESULTADO: %', r;
end $$;
```

Batería V3.0 (resultado del 2026-09-11, todo como se esperaba): recepción
registra en su sede; mismo día en otra sede → 23505; recepción no fija la hora
(42501), no crea/edita sedes ni asigna; solo-Prado → Miraflores 42501; gerencia
opera sin asignación; fila de Mítico con sede de Aurora → rechazada; gerencia no
ve/edita/crea/asigna en Aurora; principal no se desactiva (23514) ni se quita por
UPDATE (42501); sede inactiva → `sucursal_no_disponible` con histórico intacto;
sede única activa → opera sin asignación; socio ve sus sedes y no registra;
super admin ve sedes, no asistencia; anónimo solo sedes activas y columnas
públicas; Miraflores→Prado→Miraflores con la MISMA `membership_id`; auditoría
de cada cambio. Script reproducible: [`docs/runbooks/pruebas-rls-v3.0-multisucursal.sql`](docs/runbooks/pruebas-rls-v3.0-multisucursal.sql).

Dos trampas que ya dieron falsos positivos:
1. **Resolver los ids del ataque ANTES de cambiar de rol** y usarlos como
   literales: bajo RLS el subselect devuelve 0 filas y el INSERT «no falla».
2. **Las funciones de contexto son `STABLE`**: dentro de UNA sentencia se
   cachean. Medir cada rol en su propia sentencia (en PL/pgSQL cada sentencia
   ya es independiente; con `UNION ALL` no).

### 9.3 Tras desplegar (sobre el alias)

```bash
B=https://gym-platform-alpha.vercel.app
for r in / /mitico /mitico/planes /aurora-fit /mitico/pago/datos /mitico/panel /aurora-fit/panel/socios /no-existe; do
  printf "%-28s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' "$B$r")"
done
curl -sI "$B/mitico" | grep -i permissions-policy
```

Esperado: públicas 200 · panel sin sesión 307 al acceso · capacidad apagada o
tenant inexistente 404 · `camera=(self)`. Y que `service_role` no aparezca en
ningún chunk servido.

---

## 10. Lecciones que costaron (no repetirlas)

| Síntoma | Causa | Regla |
|---|---|---|
| El build de Vercel caía en las 25 páginas | Validar variables de entorno **al importar** | Validar al usar; una capacidad que falta desactiva SU parte |
| La cabecera seguía en «Acceso socios» tras entrar | La respuesta de una Server Action con `redirect` no pasa por el middleware | Escribir la cookie de pista en la propia acción |
| Leer la sesión en el layout público | Saca todo el sitio del CDN | Cookie de pista leída en cliente |
| `document.cookie` mostraba los tokens | `@supabase/ssr` no marca `HttpOnly` por defecto | Forzarlo en servidor **y** middleware |
| Alta de socio fallaba siempre | `gen_random_bytes` (pgcrypto) fuera del `search_path` fijado | `gen_random_uuid()` del núcleo; no ampliar `search_path` |
| Fila con socio de otro gimnasio | Políticas comprobaban el tenant de la fila, no el del socio | Claves foráneas compuestas |
| Reporte de pagos vacío | Embebido de PostgREST ambiguo con FK compuestas; el error se trataba como «0 filas» | Vistas propias; no confundir error con vacío |
| Página congelada al cerrar un modal | Evento `close` del `<dialog>` que no llega | Bloqueo de scroll por CSS |
| El botón de acceso navegaba en vez de abrir el modal | `preventDefault` en burbujeo llega tarde | Interceptar en fase de captura |
| La cámara no pedía permiso | `Permissions-Policy: camera=()` | `camera=(self)` |
| Rotar el QR requería una función DEFINER expuesta | Analizador de seguridad | Disparador que fuerza el valor + función invocador |
| Un comprobante podía quedar «aprobado» sin pago | UPDATE directo del personal | CHECK `(status='aprobado') = (payment_id is not null)` |
| Texto con voseo tras «traducir» los tenants | Los textos por defecto viven en componentes | Barrer también `src` |
| Mapa oscuro en negativo | `invert` sobre vista satelital | Atenuar (`brightness`/`contrast`) |
| Entradas nocturnas en el día siguiente | Fecha en UTC | «Hoy» en la zona del gimnasio |
| Borrar objetos de Storage por SQL | `storage.protect_delete` | Borrar desde el panel o la API de Storage |
| Descargas grandes cortadas | Límite de 4,5 MB de las funciones de Vercel | Armar el ZIP en el navegador |
| `list_teams` vacío en el MCP de Vercel | El token no ve equipos, no «sin permisos» | Usar la CLI |
| El enlace de «Miraflores» abría «Edificio Torre Vicenta» | Nombre de sede y nombre del edificio no son lo mismo | Resolver el enlace y preguntar antes de cargar datos públicos |
| Gerencia podía dejar el gimnasio sin sede principal | `GRANT UPDATE (is_primary)` directo | Invariantes de «una y solo una» solo por RPC |
| Escapes `\u…` convertidos en caracteres invisibles al escribir archivos | Herramienta de escritura | Usar `\p{M}` o `charCodeAt`, nunca rangos con caracteres combinantes literales |
| Ningún `mt-*` de `p`, `h1–h4` ni listas se aplicaba; botones-enlace con texto blanco sobre el color de acción | Resets de `globals.css` fuera de capa: en Tailwind v4 una regla sin `@layer` gana a TODA utilidad | Los resets de elementos van en `@layer base` (corregido en V3.0) |
| Capturas del panel de navegador vacías o recortadas con la ventana oculta | El panel no pinta si la app está minimizada | Edge headless por CDP (script sin dependencias); los iframes solo salen si están en la vista |

---

## 11. Decisiones de fondo (no revisitar sin motivo nuevo)

1. **Next.js y no Blazor** para el sitio (ADR 0001): LCP en móvil de gama media.
2. **Columna `tenant_id`, no base por cliente** (ADR 0002).
3. **Configuración como dato** (ADR 0003).
4. **Identidad en Supabase Auth, aislamiento en RLS** (ADR 0004): RLS se evalúa
   en el motor, por debajo de cualquier consulta; un filtro de ORM es convención.
5. **Destino del panel por permisos, no por nombre de rol.**
6. **Derivados no se guardan:** «por vencer» y avisos de vencimiento salen de `end_date`.
7. **Pagos inmutables; socios archivados; precio congelado en la membresía.**
8. **Operaciones de varias tablas = RPC `SECURITY INVOKER`.** Atómicas y sin
   conceder nada que la sesión no tenga.
9. **La membresía pagada por QR se activa al aprobar el comprobante.**
10. **Vincular cuenta ↔ ficha solo con correo confirmado y candidato único.**
11. **El QR del socio es un token opaco y rotable**, sin datos personales.
12. **Una entrada con membresía vencida se registra** (y avisa).
13. **Mensajes neutros** donde distinguir filtra (login, código de check-in).
14. **QR generado en servidor; lectura en cliente bajo demanda.**
15. **PDF = impresión del navegador; CSV con BOM y comillas; ZIP en cliente.**
16. **Gráficos SVG propios, sin librería.**
17. **El super admin no ve datos personales de socios.**
18. **Leaked Password Protection descartada** (plan Pro).
19. **La sede es un lugar del gimnasio, no un tenant** (ADR 0005). Membresía única.
20. **Una entrada por socio y día, en cualquier sede.** La sede no cambia la regla.
21. **Histórico sin sede, no inventado** (`NOT VALID`).
22. **Sede de trabajo por dispositivo (cookie), permiso en la base.**
23. **La base acota operar por sede; leer el historial sigue siendo del gimnasio.**
24. **Las sedes viven en la base, no en el archivo del tenant.**

---

## 12. Deuda y pendientes

### 🔴 Alta — antes o al empezar V3

1. **Migraciones fuera del repositorio.** `npx supabase link --project-ref
   dnclwawnjnzqqxgsuhpn` + `npx supabase db pull` (lo hace una persona con la
   contraseña de la base). Mientras tanto, el inventario vive en
   `supabase/migrations/README.md`.
2. **Tests parciales, sin CI.** V3.0 añadió `npm test` (node --test, 24 pruebas:
   sedes, racha con varias sedes, catálogo y CSV de reportes). Faltan `periodo`,
   `members`, `tenant.validator`, `build-theme`, una prueba RLS automatizada
   (hoy es manual, §9.2) y GitHub Actions con typecheck + test + build + audit + greps.
3. **`DEFAULT_FEATURE_FLAGS` contradice «fallar cerrado»:** las flags del sitio
   público nacen en `true` y se usan como base de spread. Cuando la
   configuración venga de la base, una respuesta parcial encendería capacidades.
4. **Revisión humana con sesión** de las pantallas de V2.2 **y V3.0** (socios,
   ficha, comprobantes, cobros, dashboards global/por sede, selector de sede,
   check-in en Prado y en Miraflores, `/panel/sucursales` y asignaciones, panel
   del socio, reportes por sede, móvil 375 px). El asistente verificó permisos y
   flujos en la base, el build y el sitio público; no la UI con sesión.
4b. **Datos de sedes de Mítico por confirmar:** teléfono y horario de cada sede,
   coordenadas de Miraflores. Se cargan desde `/mitico/panel/sucursales/[id]`.
   El texto de vitrina de Prado y Miraflores (`content.branches`), el hito 2026
   de «Nosotros» y la cifra «2 sedes» del hero son redacción propuesta: confirmar.
4c. **Revisar a ojo el efecto global de `@layer base`:** ahora se aplican los
   márgenes y colores de utilidad que antes se anulaban, también en el panel.
   Se revisó la vitrina (inicio, sucursales, planes, contacto, Aurora, móvil);
   el panel con sesión, no.
5. **Subir el QR real del banco de Mítico** en `/mitico/panel/cobros` (la imagen
   del cliente vence el 10/09/2028).
6. **Despliegue por push roto** (§7): dos interruptores en el panel de Vercel.

### 🟡 Media

7. `DEFAULT_TENANT_SLUG` cae a un slug concreto en `tenant.registry.ts`.
7b. Alta de un gimnasio nuevo: crear también su **sede principal** en
    `branches` (paso 2b del checklist) o su recepción no podrá registrar entradas.
8. `/[tenant]/nosotros` no tiene guarda de flag.
9. `middleware.ts` → `proxy.ts` (aviso de deprecación de Next 16).
10. `audit_log` ya registra sedes, asignaciones y cambio de sede de trabajo
    (V3.0); falta registrar altas, ediciones, ventas, aprobaciones y rotaciones de
    QR, y una pantalla para leerla (`audit.read`).
10b. **Sin sede en cobros ni altas.** Ingresos por sede no existen: si el negocio
    los pide, `payments.branch_id` es una ampliación explícita (ADR 0005).
10c. `v_attendance_daily`, `v_attendance_branch_daily` y `v_expiring_memberships`
    usan `current_date` (UTC) para su ventana de 90/30 días; los KPI usan la zona
    del gimnasio. Diferencia de horas en el borde de la ventana.
10d. El horario por sede es texto libre; la racha sigue usando el horario
    estructurado del tenant (días cerrados). Si las sedes cierran días distintos,
    habrá que estructurarlo.
10e. `/panel/sucursales` no tiene paginación ni búsqueda de personal (hoy son 3 cuentas).
11. **Configuración de tenants en archivos + tabla `tenants` en la base:**
    duplicación de slug, nombre, zona y moneda. Mudar a la base es cambiar el
    adaptador del composition root (el puerto ya es asíncrono).
12. CSP con `'unsafe-inline'` en scripts (lo exige el runtime de Next sin nonces).
13. Enlaces del pie a 36 px de alto (< 44 px de §2.6).
14. Dos archivos de prueba huérfanos en el bucket `comprobantes`
    (`…/ba80b8c5…/rls-recepcion-1789049433.png`, `…/bdd26a0b…/rls-prueba-1789049520.png`):
    borrarlos desde el panel de Storage.
15. Verificar la URL Configuration de Supabase Auth (§7).
16. Documentos que describen solo V1: `docs/architecture/overview.md`,
    `multi-tenancy.md`, `docs/runbooks/despliegue.md`,
    `docs/tenants/alta-de-gimnasio.md` (no cubren flags de V2.x, planes con
    `code` en la base ni el alta del gimnasio en Supabase).
17. Borrar las cuentas y contraseñas de demostración antes de uso real.

### 🟢 Contenido de Mítico por confirmar con el cliente

Email, dirección, horarios (para encender `showSchedule`), URL del mapa, enlace
del grupo de WhatsApp, fotografías reales (para `showGallery`), relato de
«Nosotros», instalaciones, equipo, testimonios y cifras del hero. Duda abierta:
el material lista cinco programas de entrenamiento con dos filas idénticas; se
cargaron cuatro.

### Alta de un gimnasio hoy (checklist real)

1. `apps/web/tenants/<slug>.tenant.ts` a partir de uno existente; registrarlo en
   `tenant.registry.ts`; `npm run build` valida.
2. Insertar el tenant en `public.tenants` con el **mismo slug**, zona horaria y moneda.
2b. Insertar al menos una sede en `public.branches` (la primera nace principal).
    Con varias sedes: encender `enableMultiBranch` y asignar recepción en el panel.
3. Insertar sus `membership_plans` con los mismos `code` que el archivo.
4. Crear la cuenta de gerencia y asignarle rol (`user_roles`).
5. Encender en el archivo solo las capacidades contratadas.
6. Si cobra por QR: gerencia sube el QR en `/panel/cobros`.

---

## 13. V3.1 — punto de partida

**Alcance (roadmap V3):** entrenadores (perfil, cuenta opcional, rol
`trainer`, asignación principal y secundarias, no disponibilidad) y catálogo de
ejercicios por tenant con media en Storage. **No** incluye rutinas (V3.2),
clases/sesiones (V3.3) ni reservas (V3.4). Flags: `enableTrainers` (y
`enableRoutines` recién en V3.2), apagadas hoy.

**Patrón establecido (V3.0 lo aplicó de punta a punta):**

1. **Rama** `feat/v3.1-entrenadores-ejercicios` desde `feat/v3.0-multisucursal`.
2. **Base:** tablas con `tenant_id`, RLS + políticas por `app.tenant_allows`,
   FK compuestas (`(tenant_id, x)`), vistas `security_invoker`, grants por
   columna, autoría por default de sesión, auditoría por disparador, RPC
   invocador para operaciones de varias tablas; si hay invariantes «una y solo
   una», solo por RPC. Permisos `modulo.accion` sembrados en `permissions` y
   `role_permissions`. Si algo ocurre en un lugar, lleva `branch_id` y
   `app.puede_operar_sucursal`. Probar con §9.2 por rol, gimnasio ajeno y anónimo.
3. **Dominio** puro en `core/domain/operations/<modulo>.ts` + pruebas en
   `apps/web/tests` → **puerto** → **adaptador** Supabase → composition root.
4. **Rutas** `/[tenant]/panel/<modulo>` con `loadTenantPage([... flag])` +
   `exigirPermiso`; acciones con `contextoDeAccion`; entrada en
   `panel/layout.tsx` por flag **y** permiso; 404 con la flag apagada.
5. **UI** con `StatCard`, `DataTable`, `Modal`, `AccionConEstado`, `FichaDeSocio`.
6. Encender la flag **solo** en Mítico; Aurora sigue en 404.
7. Verificar (§9), actualizar `supabase/migrations/README.md`, este archivo y, si
   la decisión es de fondo, un ADR.

Preguntas para el cliente antes de modelar V3.1: ¿todo entrenador tiene cuenta
o solo algunos?, ¿un entrenador trabaja en varias sedes?, ¿qué es «no
disponible» (vacaciones, turnos, horas)?, ¿los ejercicios llevan vídeo propio o
enlaces?, ¿quién crea ejercicios: gerencia o también entrenadores?

---

## 14. Historial de versiones

| Versión | Fecha | Commits clave | Resumen |
|---|---|---|---|
| V1 | 2026-09-08/09 | `27d334e`, `38b83fd` | Sitio público multi-tenant, temas, flags, Next 16 |
| V1 bonus | 2026-09-09 | `f3ea967`, `2880c8d` | Datos reales de Mítico: 13 paquetes en 4 grupos, 4 programas, 12 productos |
| V2 base | 2026-09-09 | `3702e81`, `048c830`, `3944db3` | Esquema multi-tenant con RLS; deuda de auditoría; sitemap |
| V2 acceso | 2026-09-09 | `7c45bbb`, `f7de8f6`, `5549970`, `addefde`, `e7a1d64` | Login y registro, panel por tenant, build sin variables, confirmación de correo |
| V2 cabecera | 2026-09-09 | `54bb33f`, `b1310db`, `0ba2a83` | «Mi panel» con sesión; cuentas demo por rol |
| V2.1 | 2026-09-09 | `399c795` | Dashboards por rol, asistencia QR, notificaciones, reportes CSV/PDF |
| V2.2 | 2026-09-10 | `406dd68`, `417738b` | Gestión de socios, cobro por QR con comprobantes, cámara, racha, reportes híbridos; desplegada |
| Cierre V2 | 2026-09-10 | `d599bda` | CLAUDE.md reescrito como referencia del estado actual; bitácora archivada; documentos alineados |
| V3.0 vitrina | 2026-09-11 | `eb3b0ff` | Landing multisucursal: chips de sedes en el hero, sección de sucursales rediseñada (portada/detalle/mapas), página `/sucursales` en el menú, texto de vitrina por sede en el tenant (`content.branches`), FAQ y «Nosotros» con las dos sedes; resets CSS a `@layer base` (márgenes y contraste de botones); voseo retirado de galería, horarios, instalaciones y tenants. Planes y pagos sin cambios. Desplegada (`dpl_58gzS8aVddniDoLLmXnWhrKPajwY`): `/mitico/sucursales` 200, `/aurora-fit/sucursales` 404, planes intactos |
| V3.0 | 2026-09-11 | `0227dd4`, `16fd88c` | Multisucursal: `branches`, `user_branches`, asistencia con sede (histórico sin sede), `branches.manage`/`branches.all`, sede de trabajo por dispositivo, dashboards global/por sede, `/panel/sucursales`, reportes por sede, «Nuestras sucursales» en la vitrina, auditoría por disparador, `npm test`. Mítico: Prado + Miraflores. Desplegada (`dpl_7DFPH7re52R8Q7kzHNwXo5sG99TQ`) y verificada sobre el alias: públicas 200 desde CDN, vitrina con las dos sedes y sus mapas, panel 307, `/aurora-fit/panel/sucursales` 404, CSV de la comparativa 401 sin sesión y 404 en Aurora, sin `service_role` en chunks |

Detalle de cada fase —defectos encontrados, tablas de pruebas por rol, notas de
despliegue— en [`docs/historial/bitacora-v1-a-v2.2.md`](docs/historial/bitacora-v1-a-v2.2.md).
