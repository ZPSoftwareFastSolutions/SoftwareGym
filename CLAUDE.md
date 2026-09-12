# CLAUDE.md — GYM PLATFORM · Memoria y reglas de trabajo

> Archivo de contexto persistente. Claude Code lo carga al abrir una sesión en
> este repositorio. **Describe el sistema tal como está HOY**, no cómo se llegó
> hasta aquí.
>
> - **Última actualización:** 2026-09-12 · cierre de **V3.2 programas, rutinas y métricas de entrenamiento**.
> - **Rama de trabajo vigente:** `feat/v3.2-rutinas-programas` → de ella sale V3.3.
> - **Roadmap de la serie V3:** `GYM_PLATFORM_ROADMAP_V3.md` (lo aporta el
>   usuario; no vive en el repositorio). Decisiones de V3.0: [ADR 0005](docs/architecture/adr/0005-multisucursal.md) · V3.1: [ADR 0006](docs/architecture/adr/0006-entrenadores-y-medios-de-ejercicios.md) · V3.2: [ADR 0007](docs/architecture/adr/0007-rutinas-asignadas-y-metricas-de-entrenamiento.md).
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
| **En producción** | https://gym-platform-alpha.vercel.app (desplegado desde `feat/v3.1-entrenadores-ejercicios`, commit `9c55f7b`, 2026-09-11) |
| **Clientes demo** | `/mitico` (real, todas las capacidades, **dos sedes: Prado y Miraflores**) · `/aurora-fit` (demo, solo sitio público, sede única Recoleta) |
| **Estado** | V1 ✅ sitio público · V2 ✅ login · V2.1 ✅ dashboards, asistencia QR, reportes · V2.2 ✅ gestión de socios, cobro por QR · V3.0 ✅ multisucursal · V3.1 ✅ entrenadores + ejercicios · **V3.2 ✅ rutinas + métricas** |
| **Siguiente** | **V3.3**: clases + sesiones (§13). Luego V3.4 reservas |

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
V3.1 ✅  Entrenadores (perfil, cuenta opcional, sedes, ausencias, socios según plan) + ejercicios con medios
V3.2 ✅  Programas → rutinas → ejercicios, asignación por copia, progreso y métricas de entrenamiento
V3.3 ⏭  Clases + sesiones (con sede)
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
               ├─ PostgreSQL ─ 32 tablas con RLS, 26 vistas security_invoker, 14 RPC invocador
               └─ Storage ──── comprobantes (privado) · qr-pagos (público) · ejercicios (privado, URL firmada)
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
        entrenadores/ [id]/ actions.ts        Equipo, cuenta, sedes, ausencias, socios y regla por plan (V3.1)
        entrenador/              Espacio de trabajo del entrenador: su perfil y sus socios (V3.1)
        ejercicios/ [id]/ actions.ts          Catálogo con medios, subida directa a Storage y cuota (V3.1)
        rutinas/ [id]/ asignada/[id]/ actions.ts  Programas, rutinas, asignación por copia y marca de hecho (V3.2)
        entrenamiento/           Métricas del gerente: ejercicio más hecho, qué hace cada socio, qué día es día de qué (V3.2)
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
        trainers.ts              Entrenador, ausencias (turnos, solapes, disponibilidad), regla del plan (V3.1)
        exercises.ts             Catálogo, grupos musculares, política de medios, bytes mágicos, cuota, enlaces (V3.1)
        training.ts              Rutinas y LECTURA del entrenamiento: etiqueta del día por grupo/familia, conclusiones (V3.2)
        periodo.ts               Presets hoy/ayer/7d/30d/mes/mes-anterior/año
        reports.ts               Catálogo de 9 reportes, resumen, serie, CSV seguro
    application/
      ports/                     tenant-repository, operations-repository, members-repository,
                                 receipts-repository (+ PaymentSettingsPort), reports-repository,
                                 branches-repository (+ PublicBranchesPort), trainers-repository,
                                 exercises-repository, training-repository, resultado
      tenant/get-tenant.usecase.ts, theming/build-theme.ts, auth/login.usecase.ts
  infrastructure/
    config/composition-root.ts   ÚNICO sitio que construye adaptadores
    tenants/                     tenant.registry.ts, static-tenant.repository.ts, tenant.validator.ts
    auth/                        supabase.config.ts, supabase.server.ts, supabase.public.ts (anónimo, sin cookies),
                                 cookie-options.ts, session-hint.ts
    operations/                  supabase-{operations,members,receipts,reports,branches,trainers,exercises,training}.repository.ts, qr.ts
  presentation/
    ui/                          Átomos/moléculas: Button, Badge, Modal (Dialogo), StatCard, DataTable,
                                 Campo, BarChart, DonutChart, HeatMap, QrCode, EmptyState, Logo, Reveal…
    patterns/                    Organismos: SiteHeader/Footer, AccessForm/Modal, CheckInPanel, QrScanner,
                                 FichaDeSocio, SocioForms, ComprobanteForms, AjustesDeCobroForm,
                                 PaymentQrModal, ContenidoDePagoQr, RachaCalendario, ReportFilters,
                                 NotificationsPanel, DashboardNav, AccionConEstado, SelectorDeImagen,
                                 SelectorDeSucursal, SucursalForm, TarjetaDeSucursal, EntrenadorForms,
                                 EjercicioForms (compresión, póster y subida directa), UsoDeMedios,
                                 RutinaForms (programa, rutina, ejercicio, asignación y marca de hecho)…
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
`paymentSettingsRepository`, `branchesRepository`, `trainersRepository`,
`exercisesRepository`, `trainingRepository`) **se crean por petición** con el cliente de
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
`trainers.self` → entrenador; resto → socio. Un rol nuevo llega solo a su sitio.

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

**Feature flags** (`feature-flags.ts`, 26 en total; V3.0 reutiliza `enableMultiBranch`; V3.1 usa `enableTrainers` y añade `enableExercises`):

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
| `enableTrainers` | **V3.1**: `/panel/entrenadores`, espacio `/panel/entrenador`, regla de entrenador por plan | ✅ | ❌ |
| `enableExercises` | **V3.1**: `/panel/ejercicios` (catálogo, medios, cuota) | ✅ | ❌ |
| `enableRoutines` | **V3.2**: `/panel/rutinas`, `/panel/entrenamiento`, rutina del socio y marca de ejercicios | ✅ | ❌ |
| `enableReservations`, `enableClasses` | **Reservadas para V3.3–V3.4** | ❌ | ❌ |

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
2. **RLS activo en las 32 tablas**, sin política = denegado. 106 políticas en
   `public` + 10 en `storage`.
3. **El tenant sale de la identidad:** `app.current_tenant_id()`,
   `app.current_customer_id()`, `app.current_app_user_id()`. Autorización:
   `app.tenant_allows(tenant_id, 'modulo.accion')` y `app.has_permission`.
4. **Esquema `app` fuera de la API.** Las funciones `SECURITY DEFINER` viven ahí
   (PostgREST publica todo `public` como `/rpc`). **En `public` no hay ninguna
   función DEFINER**: las 14 RPC son `SECURITY INVOKER` y corren bajo RLS.
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
11. **Otorgar un rol mira QUÉ se otorga (V3.1):** fuera de la plataforma solo se
    insertan o borran roles de alcance `tenant`; `app_users` no se reescribe
    (`auth_user_id`, `tenant_id`) desde la API. Antes gerencia podía darse `super_admin`.
13. **Un ayudante de autorización dice más de lo que su nombre sugiere (V3.2):**
    `app.puede_entrenar_a` acepta a cualquiera con `customers.read` —recepción
    incluida—, así que no sirve para decidir quién LEE el progreso. Cada política
    nombra su condición en vez de reusar el ayudante más cercano.
12. **Columnas, no filas, cuando RLS no alcanza (V3.1):** el entrenador ve a sus
    socios por una función DEFINER con columnas fijas; no hay política de lectura
    de `customers` para él (daría documento, teléfono y notas).

### 4.2 Tablas (32)

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
| Cobro (V2.2) | `payment_receipts` | Estado `pendiente/aprobado/rechazado`, origen `recepcion/socio`; sellado tras revisión; **aprobado ⇔ tiene pago** (CHECK). `expected_amount` = precio del plan que fija un disparador al subir (no el formulario); `verified_amount` al aprobar. **La base no deja subir, aprobar ni enlazar un pago por debajo del precio** (`monto_insuficiente`, `pago_no_valido`); un pago por comprobante |
| | `tenant_payment_settings` | Titular, banco, nota y `qr_mode` (`global` \| `por_plan`); lectura pública; se escribe solo por RPC |
| Entrenamiento (V3.1) | `trainers` | Perfil (nombre, contacto, presentación, especialidades ≤ 8, activo). `app_user_id` opcional y único, solo por RPC; FK compuesta a `app_users` |
| | `trainer_branches` | N:M entrenador ↔ sede (FK compuestas; sede activa al asignar) |
| | `trainer_unavailability` | Ausencias `horas`/`turno`/`dia`/`periodo` en hora local del gimnasio (fecha + hora), ≤ 366 días, **sin solapes** (disparador) |
| | `customer_trainers` | Socio ↔ entrenador `principal`/`secundario` (+ área). Un principal vigente, el mismo entrenador una vez; **regla del plan de la membresía vigente** en disparador; se finaliza (`ended_on`), no se borra |
| | `exercises` | Catálogo por gimnasio: nombre único, `muscle_group` (14 códigos), equipo, descripción, instrucciones, activo |
| | `exercise_media` | `imagen`/`gif`/`video`/`enlace` (YouTube/Vimeo por id). Tamaño y MIME **leídos de `storage.objects`**; imagen ≤ 1 MB, GIF ≤ 3 MB, clip ≤ 15 MB y ≤ 60 s, póster ≤ 300 KB; 6 por ejercicio; **cuota `tenants.media_quota_bytes`** |
| Entrenamiento (V3.2) | `training_programs` | Plantilla por objetivo (`fuerza`, `hipertrofia`…), nivel y semanas. Nombre único por gimnasio |
| | `routines` | Rutina de un día (`Día A`), con orden, notas y minutos. Puede colgar de un programa o ir suelta; si el programa se borra, la rutina queda suelta |
| | `routine_exercises` | Ejercicio de la plantilla: series (1-12), repeticiones con formato validado (`10`, `8-12`, `al fallo`, `45 seg`), peso, descanso y nota. FK `RESTRICT` al catálogo: un ejercicio en uso no se borra |
| | `customer_routines` | **Copia** de la rutina para un socio (nombre, día, notas, `starts_on`, `ended_on`). Se finaliza, no se borra. El entrenador solo asigna a SUS socios (disparador) |
| | `customer_routine_exercises` | Los ejercicios de esa copia, editables solo para ese socio |
| | `exercise_completions` | Progreso: una fila por ejercicio, socio y **fecha local del gimnasio**, con series y peso opcionales. `source` (`socio`/`entrenador`/`gerencia`) lo DEDUCE la base; una marca por día (índice único); ni futuro ni más de 7 días atrás. **De aquí salen todas las métricas** |
| | `payment_qr_codes` | QR de cobro: `plan_id` NULL = **general** (siempre monto libre, uno por gimnasio) o de un plan (uno por plan, FK compuesta); `amount_mode` `libre`/`exacto` + `fixed_amount`; `expires_on`; ruta con prefijo del gimnasio (CHECK). Lectura: anónimo todo (es lo que se imprime en el mostrador), con sesión solo su gimnasio. Escritura: `settings.manage`, por RPC |

Enums: `payment_method` (`cash, qr, transfer, card, other`), `attendance_method`
(`manual, qr, kiosk`), `receipt_status`, `receipt_source`, estados de
membresía/socio/tenant.

### 4.3 Vistas (26, todas `security_invoker`)

`v_my_profile` (perfil + roles + permisos de quien entra) · `v_customer_overview`
· `v_customer_detail` · `v_memberships` (estado efectivo) ·
`v_expiring_memberships` · `v_memberships_report` · `v_payments_report` ·
`v_revenue_monthly` (no cuenta cobros futuros) · `v_dashboard_kpis` ·
`v_attendance_daily` · `v_attendance_log` (hora local, sede y `membership_id`
**derivado**: la membresía activa que cubría ese día) · `v_receipts` ·
`v_users_roles` · `v_platform_overview` (+ `sucursales`) ·
**V3.0:** `v_attendance_branch_daily` (serie por sede; `branch_id` NULL = histórico) ·
`v_branch_overview` (hoy, 7 d, 30 d, socios distintos 30 d y personal por sede) ·
`v_mis_sucursales` (sedes del gimnasio con `puede_operar` de la sesión) ·
**V3.1:** `v_trainers` (sedes, cuenta, asignaciones y ausencia de hoy) ·
`v_customer_trainers` (asignación + plan vigente y su regla) · `v_uso_de_medios` (cuota y uso) ·
**V3.2:** `v_routines` (ejercicios, asignaciones y grupos que cubre) · `v_customer_routines`
(rutina del socio + registros de 7 días) · `v_training_exercise_stats` (veces y socios por
ejercicio, 30/90 d) · `v_training_customer_stats` (qué hace cada socio) · `v_training_weekday`
(día × grupo muscular, 90 d) · `v_training_overview` (resumen, solo con `training.read`).

> Los reportes leen de vistas y **no** de embebidos de PostgREST: con claves
> foráneas compuestas hay dos relaciones posibles y el embebido falla.

### 4.4 Funciones

**RPC públicas (`SECURITY INVOKER`, atómicas):**

| Función | Qué hace | Errores de negocio |
|---|---|---|
| `registrar_socio(nombre, apellido, documento, teléfono, correo, nacimiento, nota, plan_id, inicio, método, monto)` | Ficha con código correlativo (reintenta si choca), membresía si hay plan, pago si `monto > 0`, QR por disparador, vínculo con cuenta existente | `sin_permiso`, `nombre_invalido`, `correo_invalido`, `plan_invalido`, `inicio_invalido`, `monto_invalido`, `documento_duplicado` |
| `vender_membresia(customer, plan_id, inicio, método, monto, nota)` | Membresía que empieza al día siguiente de la vigente; pago si `monto > 0`. Con método `qr`, el monto no puede ser menor que el precio (también en `registrar_socio`) | `socio_no_encontrado`, `sin_permiso`, `plan_invalido`, `monto_invalido`, `monto_insuficiente` |
| `revisar_comprobante(id, aprobar, nota, monto_verificado)` | `FOR UPDATE`; rechazar exige motivo; aprobar exige `monto_verificado` (o el declarado) ≥ `expected_amount` y crea membresía (si hay plan) + pago por lo verificado con `idempotency_key = 'comprobante:'||id` | `comprobante_no_encontrado`, `comprobante_ya_revisado`, `motivo_requerido`, `sin_permiso`, `monto_invalido`, `monto_insuficiente` |
| `guardar_ajustes_de_cobro(holder, bank, note, qr_mode)` | Crea o actualiza los ajustes del gimnasio **de la sesión** (sin `tenant_id` en el SET) | `sin_permiso`, `modo_de_qr_invalido` |
| `guardar_qr_de_cobro(plan_id, qr_path, amount_mode, fixed_amount, expires_on)` | Crea o reemplaza el QR general o el de un plan del gimnasio de la sesión; devuelve `qr_path_anterior` para borrar la imagen vieja | `sin_permiso`, `plan_invalido`, `qr_general_exacto`, `monto_exacto_distinto_al_precio`, `ruta_invalida`, `qr_requerido`, `modo_de_monto_invalido` |
| `eliminar_qr_de_cobro(id)` | Borra un QR del propio gimnasio y devuelve su ruta | `sin_permiso` (también si es de otro gimnasio) |
| `vincular_cuenta_de_entrenador(trainer, email)` | Vincula la cuenta **registrada y confirmada** del mismo gimnasio y otorga el rol `trainer` (vía `app.otorgar_cuenta_de_entrenador`) | `sin_permiso`, `cuenta_no_encontrada`, `correo_sin_confirmar`, `cuenta_ya_vinculada`, `entrenador_con_cuenta` |
| `desvincular_cuenta_de_entrenador(trainer)` | Quita la cuenta y el rol `trainer`; el perfil queda | `sin_permiso` |
| `mis_socios_asignados()` | Socios vigentes del entrenador de la sesión: código, nombre, plan, vigencia (vía `app.socios_del_entrenador`) | — |
| `asignar_rutina(customer, routine, nota)` | **Copia** la rutina y sus ejercicios al socio, atómico. El entrenador solo a los suyos (`app.puede_entrenar_a`) | `rutina_no_disponible`, `rutina_sin_ejercicios`, `sin_permiso`, 23505 (ya asignada) |
| `marcar_ejercicio(item, series, peso, nota, fecha)` | Marca un ejercicio como hecho. Socio y ejercicio salen de la FILA, no del formulario; repetir el mismo día no duplica | `ejercicio_no_disponible`, `fecha_futura`, `fecha_demasiado_antigua`, `sin_permiso` |
| `desmarcar_ejercicio(id)` | Deshace una marca (del propio socio o con `training.log`) | `sin_permiso` |
| `rotar_token_check_in(customer)` | Nuevo token QR (el disparador pone el valor aleatorio) | — |
| `establecer_sucursal_primaria(branch)` | Cambia la sede principal (delega en `app.fijar_sucursal_primaria`, que repite el permiso) | `sin_permiso`, `sucursal_inactiva` |

**Esquema `app` (46):** rutinas y progreso V3.2 (`puede_entrenar_a` —gerencia sobre su
gimnasio, entrenador sobre SUS socios—, `preparar_programa`, `preparar_rutina`,
`preparar_ejercicio_de_rutina`, `validar_rutina_asignada`, `auditar_rutina_asignada`,
`preparar_completado`: fija la fecha local, deduce el origen y rechaza fechas imposibles),
entrenamiento V3.1 (`current_trainer_id`, `preparar_entrenador`,
`auditar_entrenador`, `preparar_ausencia`, `validar_asignacion_de_entrenador`,
`auditar_asignacion_de_entrenador`, `preparar_ejercicio`, `preparar_medio_de_ejercicio`,
`otorgar_cuenta_de_entrenador`, `retirar_cuenta_de_entrenador`, `socios_del_entrenador`), cobro (`preparar_qr_de_cobro`, `fijar_importe_esperado`,
`verificar_pago_del_comprobante`: congelan tenant, plan e importes y exigen el
precio completo), contexto (`current_*`, `tenant_allows`,
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
| `ejercicios` | **Privado**. Lee `exercises.read`, sube y borra `exercises.manage` del gimnasio de la ruta. Se sirve con **URL firmada de 1 h** (origen del proyecto en `img-src`/`media-src`); se sube **directo del navegador** con URL firmada de un solo uso | 15 MB · webp/jpeg/png/gif/mp4/webm | `{tenant_id}/{exercise_id}/{uuid}[-poster].{ext}` |
| `qr-pagos` | Público de lectura; escribe y borra `settings.manage` del gimnasio de la ruta | 2 MB | `{tenant_id}/qr-{timestamp}.{ext}` (general) · `{tenant_id}/plan-{plan_id}-{timestamp}.{ext}` |

Las imágenes **no se entregan con URL firmada**: pasan por
`/[tenant]/panel/comprobantes/[id]/imagen` (sesión, re-verificación de firma
binaria, `no-store`, CSP de sandbox) y `/[tenant]/pago/qr` (público, 410 si el
QR venció). La CSP (`img-src 'self'`) bloquearía imágenes de otro dominio en
silencio. `storage.protect_delete` impide borrar objetos por SQL.

### 4.6 Roles y permisos (32 permisos)

| Permiso | Super admin | Gerente | Recepción | Entrenador | Socio |
|---|:-:|:-:|:-:|:-:|:-:|
| `tenants.manage` | ✅ | | | | |
| `users.read`, `users.manage` | ✅ | ✅ | | | |
| `audit.read` | ✅ | ✅ | | | |
| `dashboard.read` | | ✅ | ✅ | | |
| `customers.read`, `customers.create` | | ✅ | ✅ | | |
| `customers.update`, `customers.archive` | | ✅ | | | |
| `memberships.read`, `memberships.create` | | ✅ | ✅ | | |
| `memberships.update` | | ✅ | | | |
| `payments.read`, `payments.create` | | ✅ | ✅ | | |
| `attendance.read`, `attendance.create` | | ✅ | ✅ | | |
| `plans.read` | | ✅ | ✅ | ✅¹ | ✅ |
| `routines.read` (programas, rutinas y rutinas asignadas) | | ✅ | ✅ | ✅ | |
| `routines.manage`, `routines.assign` (crear y asignar; el entrenador, solo a SUS socios) | | ✅ | | ✅ | |
| `training.log` (marcar ejercicios de un socio; el socio marca los suyos sin permiso) | | ✅ | | ✅ | |
| `training.read` (métricas del gimnasio) | | ✅ | | | |
| `exercises.read` (catálogo: el socio necesita leer los ejercicios de su rutina) | | ✅ | | ✅ | ✅ |
| `plans.manage`, `settings.manage`, `reports.read` | | ✅ | | | |
| `branches.manage` (administrar sedes y asignar personal) | | ✅ | | | |
| `branches.all` (operar en todas las sedes sin asignación; vista global) | | ✅ | | | |
| `trainers.read`, `trainers.manage` (equipo, cuenta, sedes, ausencias, asignaciones) | | ✅ | | | |
| `trainers.self` (su perfil y sus socios asignados) | | | | ✅ | |
| `exercises.manage` (catálogo y medios) | | ✅ | | | |

¹ El entrenador llega con `plans.read` porque su cuenta nace de un registro web (rol `customer`); el rol `trainer` solo aporta `trainers.self`.

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

**42 aplicadas** (`v2_0001` … `v3_2_semilla_programa_y_entrenamiento_demo`), listadas
con su propósito en [`supabase/migrations/README.md`](supabase/migrations/README.md).
**Viven solo en el servidor**: materializarlas requiere `npx supabase link` +
`npx supabase db pull`, que pide la contraseña de la base (no disponible en la
sesión). Deuda #1 de §12. Toda migración nueva: `apply_migration` por MCP con
nombre `v3_x_…` en snake_case español, y añadir su fila al README de migraciones.

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
| `/[tenant]/pago/datos` · `/pago/qr` | handler | `enablePayments` | JSON e imagen del QR de cobro que toca (`?plan=<código>`; imagen por `?qr=<id>` del mismo gimnasio). Cliente **anónimo**, elección de `resolverCobroQr` (caché 60 s / 300 s; 410 vencido) |
| `/[tenant]/panel` | dinámica | sesión | Reparte al espacio que corresponde |
| `…/panel/socio` | dinámica | sesión | Panel del socio |
| `…/panel/gimnasio` | dinámica | `dashboard.read` | Dashboard de gerencia y recepción |
| `…/panel/plataforma` | dinámica | `tenants.manage` | Resumen de gimnasios (sin datos personales) |
| `…/panel/asistencia` | dinámica | `enableAttendance` + `attendance.read` | Check-in, estadísticas, historial |
| `…/panel/socios`, `/nuevo`, `/[id]` | dinámica | `enableMemberManagement` + `customers.*` | Lista, alta, ficha completa |
| `…/panel/comprobantes`, `/[id]/imagen` | dinámica | `enablePayments` + `payments.read` | Bandeja, revisión, ZIP |
| `…/panel/cobros` | dinámica | `enablePayments` + `settings.manage` | Datos y modalidad, QR general y QR de cada plan activo (libre/exacto, vencimiento, «se cobra con»), eliminar |
| `…/panel/sucursales`, `/[id]` | dinámica | `enableMultiBranch` + `branches.manage` | Sedes con indicadores, comparativa, alta/edición, activar/desactivar, principal, personal por sede |
| `…/panel/entrenadores`, `/[id]` | dinámica | `enableTrainers` + `trainers.read` (escribir: `trainers.manage`; regla del plan: `plans.manage`) | Equipo con disponibilidad de hoy; perfil, cuenta, sedes, ausencias (horas/turno/día/periodo), socios asignados según plan, historial; «Entrenador según el plan» |
| `…/panel/entrenador` | dinámica | `enableTrainers` + `trainers.self` | Espacio del entrenador: su perfil, sus socios (código, nombre, plan, vigencia) y sus ausencias |
| `…/panel/ejercicios`, `/[id]` | dinámica | `enableExercises` + `exercises.read` (escribir: `exercises.manage`) | Catálogo con búsqueda y grupo muscular, miniaturas firmadas, medios (imagen/GIF/clip/enlace), uso de la cuota y «Liberar archivos sin uso» |
| `…/panel/rutinas`, `/[id]` | dinámica | `enableRoutines` + `routines.read` (escribir: `routines.manage`; asignar: `routines.assign`) | Programas con sus rutinas, ejercicios de cada rutina (series, repeticiones, descanso), asignación a socios y quién la está haciendo |
| `…/panel/rutinas/asignada/[id]` | dinámica | `enableRoutines` + sesión | La rutina de UN socio: la abren el socio (marcar), su entrenador (ajustar y marcar) y gerencia. RLS decide qué ve cada uno |
| `…/panel/entrenamiento` | dinámica | `enableRoutines` + `training.read` | Métricas: conclusiones automáticas, registros por día, mapa día × grupo muscular, tabla por ejercicio y por socio |
| `…/panel/reportes`, `/[reporte]`, `/[reporte]/csv` | dinámica | `enableReports` + `reports.read` + permiso del reporte | Reportes con filtros, impresión y CSV |

Build: 58 páginas generadas; solo `/panel/*`, `/pago/*` y `/auth/confirmar` son dinámicas.
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
1. Gerencia configura en `/panel/cobros` la **modalidad** (`global`: un QR
   para todo · `por_plan`: cada plan puede tener el suyo), el **QR general** y
   el **QR de cada plan** (monto libre o exacto = precio actual, vencimiento).
   Todo por RPC con el gimnasio de la sesión; los planes salen de la base. El
   archivo de configuración (`content.paymentQr`) solo aporta titular, banco y
   nota **de respaldo**.
2. En `/planes`, cada paquete muestra **«Pagar con QR»** → modal con QR, precio
   **de la base** y «paga exactamente X» (`PaymentQrModal` → `ContenidoDePagoQr`,
   que pide `/pago/datos?plan=<código>`). Elección (`seleccionarQrDeCobro`,
   `cobro-qr.ts`): modo global → general; por plan → el del plan si está vigente
   (y, si es exacto, su importe = precio actual) → si no, el general (siempre
   libre) → si no, pagar en recepción. Un QR exacto de otro plan nunca se reutiliza.
   El formulario del socio enseña el QR del plan que elige.
3. El socio sube la captura desde su panel (`subirMiComprobante`); recepción
   puede adjuntarla (`subirComprobante`), incluso al dar de alta a quien pagó
   por QR (el alta se crea sin plan y el comprobante lleva el plan propuesto).
   Las imágenes se reducen en el navegador (1600 px, JPEG 0,85) y el servidor
   valida la firma binaria.
4. Recepción o gerencia **aprueba** (`revisar_comprobante`) escribiendo el
   importe que llegó al banco: membresía + pago en una transacción. Ese pago es
   el que suman dashboards y reportes. **Una captura no activa nada hasta que
   alguien la aprueba, y nada se aprueba por debajo del precio del plan**
   (180 esperado: 179 se rechaza; 181 se acepta y se registra 181). No existe
   «pagar la diferencia después»: se rechaza con motivo.
5. **Descarga ZIP** (`DescargarComprobantesZip`, `lib/zip.ts`) con filtros
   (hoy, ayer, rango, estado, origen, método) y `resumen.csv`. Se arma **en el
   navegador** porque Vercel corta respuestas de más de 4,5 MB.

**Entrenadores (V3.1).**
1. **Perfil sin cuenta:** gerencia crea al entrenador (nombre, contacto, especialidades) y le marca sedes.
2. **Cuenta opcional:** el entrenador se registra en «Acceso» y confirma su correo; gerencia pega ese correo
   en su perfil → `vincular_cuenta_de_entrenador` otorga el rol `trainer`. Al entrar llega a `/panel/entrenador`.
3. **Regla del plan:** en «Entrenador según el plan» gerencia marca por plan si incluye principal y cuántos
   secundarios (0–5). Nacen todos sin entrenador.
4. **Asignación:** desde el perfil, socio + principal/secundario (+ área). La base exige membresía vigente
   hoy, lo que permite su plan, un principal a la vez y el mismo entrenador una vez. Finalizar deja historial.
5. **No disponibilidad:** unas horas, un turno (del archivo del gimnasio, `hours.staffShifts`; por defecto
   Mañana 06–12, Tarde 12–18, Noche 18–22), un día o varios días. Sin solapes. «Ahora: ausente/disponible»
   se calcula con la hora del gimnasio. No es agenda.
6. **Desactivar** quita el acceso de su cuenta a sus socios y bloquea asignaciones nuevas; lo vigente queda a la vista.

**Ejercicios y medios (V3.1).**
1. Catálogo del gimnasio (13 ejercicios base en Mítico). Nombre único, 14 grupos musculares, equipo, instrucciones.
2. **Subir:** el navegador reduce la imagen a WebP ≤ 1280 px, deja el GIF (≤ 3 MB) o valida el clip (≤ 15 MB,
   ≤ 60 s) y le saca un póster → `prepararSubidaDeMedio` (permiso, tope de 6, cuota) emite una URL firmada →
   PUT directo a Storage con progreso → `confirmarSubidaDeMedio` lee los bytes reales y registra; la base
   vuelve a medir con `storage.objects`. Fallo = el archivo se borra.
3. **Enlazar** un vídeo de YouTube/Vimeo (solo el id; 0 MB).
4. Se ve con URLs firmadas de 1 h; listas con miniaturas; el clip no se descarga hasta reproducirlo.
5. **Cuota** visible con barra (aviso al 80 %); «Liberar archivos sin uso» borra subidas abandonadas (> 1 h sin fila).

**Rutinas y progreso (V3.2).**
1. **Plantillas:** un PROGRAMA (objetivo y nivel) agrupa RUTINAS (Día A, Día B…) y cada rutina
   lista EJERCICIOS del catálogo con series, repeticiones, peso, descanso y notas. Gerencia y
   entrenadores las arman; recepción solo mira.
2. **Asignar COPIA la rutina** al socio (`asignar_rutina`): ajustarla para él no toca la
   plantilla, y editar la plantilla no le cambia lo suyo. Se finaliza, no se borra.
3. **Marcar:** el socio desde su panel o su entrenador desde el suyo; una marca por ejercicio y
   día, con series y peso opcionales. La base fija la fecha del gimnasio y deduce quién marcó.
4. **Alcance:** el entrenador solo asigna y marca a SUS socios (`app.puede_entrenar_a`), y ve el
   progreso de ellos; recepción ve las rutinas pero no el progreso; el socio, solo lo suyo.

**Métricas de entrenamiento (V3.2).** `/panel/entrenamiento` (gerencia) responde lo que se
preguntó el cliente: qué ejercicio hace más gente, qué hace cada persona, qué día se entrena
qué músculo. Las vistas agregan; `training.ts` interpreta:
- **Etiqueta del día:** un grupo con ≥ 35 % del día lo nombra («día de pecho»); si no, la familia
  de movimiento con ≥ 50 % («día de pierna»); con menos de 5 registros dice «pocos registros» en
  vez de inventar un patrón.
- **Conclusiones automáticas** con el número que las sostiene: ejercicio más y menos hecho,
  ejercicios del catálogo que nadie hace, grupo dominante, día de más movimiento, cobertura de
  rutinas y socios que no registran hace una semana.
- Gráfico de barras por día, mapa de calor día × grupo, tabla por ejercicio y tabla por socio.

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
 └ feat/v1-public-site ─ feat/v2-public-site ─ feat/v2.1-operacion ─ feat/v2.2-gestion
   └ feat/v3.0-multisucursal ─ feat/v3.1-entrenadores-ejercicios  ← VIGENTE
```

`feat/v2-plataforma` existe solo en local y está contenida en v2.2. La copia
local de `feat/v1-public-site` va 2 commits por delante de su remoto (también
contenidos en v2.2). **Nada se ha fusionado a `main`**: decidir con el usuario
si se abre PR de la cadena antes o después de V3. **V3.2 sale de
`feat/v3.1-entrenadores-ejercicios`.**

---

## 8. Datos y cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Super administrador | `admin@gymplatform.bo` | `Demo.Super.2026` |
| Gerente (Mítico) | `gerencia@miticofitness.com` | `Demo.Manager.2026` |
| Recepcionista (Mítico) | `recepcion@miticofitness.com` | `Demo.Receptionist.2026` |
| Entrenador (Mítico, V3.1) | `entrenador@miticofitness.com` | `Demo.Trainer.2026` |
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
`a370ad78-0725-4fdc-a8d2-2b1e5b3625d1`, (ficha) `bdd26a0b-058d-4b84-a488-0c8df66a7a86` ·
entrenador demo (cuenta) `35b0cff9-48ee-44b8-8581-89cda456ca57`, (perfil) `36448c43-23af-46bc-a38e-b73cdf7b2e11`.

**V3.1 (2026-09-11):** «Entrenador Demo» en Prado y Miraflores, sin socios asignados (los 13 planes nacen
sin entrenador); 13 ejercicios base sin medios; cuota de medios 300 MB por gimnasio.

**V3.2 (2026-09-12):** programa «Full Body 3 días» (Día A empuje · Día B pierna · Día C tirón),
asignado a 5 socios (15 rutinas asignadas) y **seis semanas de ejercicios completados** con patrón
lunes/miércoles/viernes: ~190 registros en 30 días. Son datos SEMBRADOS para que las métricas se
puedan ver y probar; el patrón semanal que muestran es el de la semilla, no el de un gimnasio real.

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

Batería V3.1 (2026-09-11, todo como se esperaba): gerencia crea, asigna sedes y ausencias (solape 23P01),
la regla del plan rechaza principal/secundarios fuera de plan, un principal a la vez, no reabre asignaciones,
no cambia `tenant_id` ni `app_user_id` por UPDATE, vincula solo cuentas confirmadas de su gimnasio, no ve ni
toca Aurora; medios: sin archivo, ruta ajena, clip > 15 MB, MIME falso y cuota excedida rechazados, 7.º medio
rechazado, Storage ajeno 42501; recepción, socio y super admin no ven entrenadores ni catálogo; el entrenador
ve su perfil, sus 2 sedes y SOLO sus socios (sin `customers`, `memberships`, `payments`), no se edita ni
asigna; desactivado no ve socios; anónimo 42501; gerencia no se da `super_admin`. Script:
[`docs/runbooks/pruebas-rls-v3.1-entrenadores-ejercicios.sql`](docs/runbooks/pruebas-rls-v3.1-entrenadores-ejercicios.sql).

Batería V3.2 (2026-09-12, todo como se esperaba): gerencia crea plantillas, no mete un ejercicio de
otro gimnasio (23503) ni repeticiones inventadas (23514), asigna copiando, no asigna dos veces la
misma rutina (23505) ni una rutina ajena, marca (origen `gerencia`), no marca dos veces el mismo día,
ni en el futuro, ni con 10 días de atraso, no ve ni edita plantillas de Aurora; recepción ve rutinas
y asignadas pero no crea, no asigna, no marca y **no ve el progreso**; el entrenador crea rutinas y
ve el catálogo, no asigna ni marca a quien no es su socio (`sin_permiso`), marca a los suyos (origen
`entrenador`) y ve solo su progreso; el socio ve su rutina con los NOMBRES de sus ejercicios, marca
(origen `socio`), desmarca lo suyo, no marca lo de otro ni inserta progreso a nombre ajeno (42501) y
no ve plantillas; super admin y anónimo, nada. Script y casos:
[`docs/runbooks/pruebas-rls-v3.2-rutinas-y-progreso.sql`](docs/runbooks/pruebas-rls-v3.2-rutinas-y-progreso.sql).

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
| «No soy gerente» al guardar el QR, siendo gerencia | `upsert` de PostgREST genera `ON CONFLICT DO UPDATE SET tenant_id = …` y no hay grant de UPDATE sobre `tenant_id` → 42501; el adaptador lo tradujo como «revisa que seas gerencia». Dejó 6 imágenes huérfanas | Nada de `upsert` sobre tablas con columnas no actualizables: RPC invocador con el tenant de la sesión. Los errores se traducen por **código** y el código queda en el log |
| Personal podía aprobar un comprobante enlazando un pago barato | UPDATE directo de `status`/`payment_id` | Disparador que congela importes y exige pago del mismo socio y ≥ precio |
| Ningún `mt-*` de `p`, `h1–h4` ni listas se aplicaba; botones-enlace con texto blanco sobre el color de acción | Resets de `globals.css` fuera de capa: en Tailwind v4 una regla sin `@layer` gana a TODA utilidad | Los resets de elementos van en `@layer base` (corregido en V3.0) |
| Gerencia podía darse `super_admin` (existía desde V2) | `user_roles_write` comprobaba a QUIÉN se otorgaba (usuario del gimnasio), no QUÉ rol | Toda política que otorga capacidades restringe también lo otorgado (roles de alcance `tenant`) |
| Un clip de 15 MB no cabe en una Server Action | Vercel corta a 4,5 MB | Subida directa a Storage con URL firmada de un solo uso + verificación de bytes en el servidor + tamaño real en la base |
| El entrenador necesitaba ver 4 columnas de un socio | RLS filtra filas, no columnas | Función DEFINER en `app` con columnas fijas, envuelta por una RPC invocador |
| Toda marca de ejercicio fallaba (42P10) | `ON CONFLICT` contra un índice PARCIAL sin repetir su predicado | Si el índice tiene `where`, el `ON CONFLICT` lo repite |
| «permission denied» al marcar, con la política correcta | La RPC nombraba en el INSERT una columna que a propósito no se concede a nadie (`source`, que deduce la base) | Una RPC no lista columnas que el cliente no puede escribir; el disparador las rellena |
| Recepción veía el progreso de entrenamiento | La política reusaba `app.puede_entrenar_a`, que acepta a cualquiera con `customers.read` | Cada política nombra su condición; un ayudante «cercano» no es la condición |
| El socio veía su rutina sin el nombre de los ejercicios | Las vistas unen con `exercises`, que exige `exercises.read`, y su rol no lo tenía | Al dar acceso a algo propio, comprobar también lo que ese algo necesita LEER para tener sentido |
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
25. **El precio esperado de un cobro lo fija la base**, nunca el formulario; un
    pago por QR menor que el precio no se acepta. Mayor, sí (se registra lo pagado).
26. **El QR general es siempre de monto libre**; el respaldo de un plan sin QR
    propio es el general, nunca el exacto de otro plan.
27. **Lo público del cobro se lee como anónimo** (`publicPaymentSettingsRepository`):
    con sesión, RLS solo enseña los QR del propio gimnasio.
28. **El entrenador es un perfil; la cuenta es opcional y la vincula gerencia** (ADR 0006). Nunca automático.
29. **Quién puede tener entrenador lo decide el plan, en la base.** Asignaciones se finalizan, no se borran.
30. **Medios con cuota por gimnasio medida por la base**, compresión en el navegador, clip corto + enlace para lo largo.
31. **Archivos grandes: subida directa con URL firmada y verificación posterior**; bucket privado servido con URL firmada.
32. **Asignar una rutina la COPIA** (ADR 0007): el entrenador la ajusta para ese socio sin tocar la plantilla, y editar la plantilla no cambia lo que alguien ya está haciendo.
33. **El progreso es un hecho con fecha del gimnasio**, una marca por ejercicio y día, con el origen deducido de la sesión. Ni futuro ni más de una semana atrás.
34. **Las métricas se agregan en la base y se INTERPRETAN en el dominio** (umbrales del «día de pierna» y conclusiones), para que la lectura tenga pruebas y no viva en una pantalla.

---

## 12. Deuda y pendientes

### 🔴 Alta — antes o al empezar V3

1. **Migraciones fuera del repositorio.** `npx supabase link --project-ref
   dnclwawnjnzqqxgsuhpn` + `npx supabase db pull` (lo hace una persona con la
   contraseña de la base). Mientras tanto, el inventario vive en
   `supabase/migrations/README.md`.
2. **Tests parciales, sin CI.** V3.0 añadió `npm test` (node --test, 46 pruebas:
   sedes, racha con varias sedes, catálogo y CSV de reportes, selección de QR e
   importes 180/179/181). Faltan `periodo`,
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
   del cliente vence el 10/09/2028). Hoy no hay ningún QR guardado.
5b. **6 imágenes huérfanas** en `qr-pagos/4b79e41f-…/qr-*.jpg` (los intentos
   fallidos de gerencia del 11/09): borrarlas desde el panel de Storage.
5c. **Revisión humana con sesión de `/panel/cobros`** (modalidad, QR general,
   QR por plan en modal, eliminar), de la revisión con importe verificado y del
   QR por plan en el panel del socio. Base y rutas públicas verificadas; la UI con
   sesión, no.
5d. **Revisión humana con sesión de V3.1:** `/panel/entrenadores` y perfil (crear, sedes, ausencias de
   cada tipo, vincular la cuenta demo, asignar tras marcar un plan), `/panel/entrenador` con
   `entrenador@miticofitness.com`, `/panel/ejercicios` (subir imagen grande, GIF, clip con póster,
   enlace de YouTube, quitar, liberar), en escritorio y móvil. Base, rutas, CSP y build verificados;
   la subida real con URL firmada necesita sesión y no la probó el asistente.
5e. **Planes de Mítico sin regla de entrenador:** gerencia debe marcar qué planes incluyen entrenador
   antes de asignar socios (decisión del cliente).
5f. **Revisión humana con sesión de V3.2:** `/panel/rutinas` (crear programa y rutina, agregar y
   ajustar ejercicios, asignar), `/panel/rutinas/asignada/[id]` con las tres cuentas (gerencia,
   `entrenador@miticofitness.com` y un socio) para marcar y desmarcar, `/panel/entrenamiento` y la
   sección «Tu rutina» del panel del socio, en escritorio y móvil. Base, rutas y build verificados;
   la UI con sesión, no.
5g. **Datos de entrenamiento sembrados en Mítico:** el patrón lunes/miércoles/viernes y los ~190
   registros salen de la semilla de demostración (§8), no de uso real. Antes de mostrar las métricas
   como si fueran del gimnasio, decidir si se limpian (`delete from exercise_completions`) o se
   dejan como demostración.
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
10h. **V3.2 — pendiente acotado:** las rutinas no tienen recurrencia (no existe «los lunes toca Día
    A»: el día se deduce de lo que se marca); las métricas no comparan periodos («subió 12 % contra
    el mes pasado»); el socio ve su rutina y lo marcado, pero no un gráfico de su progreso; la ficha
    de socio de gerencia todavía no muestra su rutina; editar una plantilla no propaga a las copias
    (decisión, ADR 0007, pero conviene un aviso en pantalla); `v_training_weekday` mira 90 días
    fijos y `v_training_*` usan `app.hoy_del_gimnasio` en cada fila (suficiente con miles de
    registros, no con millones).
10g. **V3.1 — pendiente acotado:** el socio y la ficha de socio todavía no muestran su entrenador; ausencias
    sin recurrencia (cada lunes); el entrenador no ve el catálogo (se le dará `exercises.read` en V3.2);
    medios de ejercicios inactivos siguen contando en la cuota; «Liberar archivos sin uso» recorre
    Storage carpeta por carpeta (bien para cientos de ejercicios, no para miles); la cuota del plan gratis
    (1 GB) es de TODO el proyecto: con más de 3 gimnasios subiendo vídeo, pasar a Pro o bajar cuotas.
10f. **Cobro — riesgos aceptados:** (a) en efectivo, tarjeta o transferencia el
    personal puede vender por debajo del precio (descuento del mostrador; solo QR
    exige el precio completo); (b) quien tiene `payments.create` registra pagos,
    así que el pago enlazado a un comprobante es de confianza del personal (la
    base exige mismo socio, mismo gimnasio e importe ≥ precio); (c) el anónimo lee
    los QR y precios activos de todos los gimnasios (dato público por naturaleza);
    (d) con `settings.manage`, una llamada manual a la RPC podría apuntar dos QR
    del propio gimnasio a la misma imagen y borrarla al reemplazar uno (la app
    siempre sube rutas nuevas); (e) un QR de un plan desactivado se conserva y se
    lista en `/panel/cobros` para eliminarlo; no se ofrece a nadie.
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

## 13. V3.3 — punto de partida

**Alcance (roadmap V3):** clases grupales y sus sesiones. Una CLASE (nombre,
descripción, categoría, capacidad, estado) y sus SESIONES concretas (fecha,
hora, duración, entrenador, **sucursal**, capacidad efectiva, estado). La
capacidad es obligatoria y se respeta en la sesión. **No** incluye reservas
(V3.4). Flag: `enableClasses` (apagada hoy).

**Lo que V3.2 deja listo:** `trainers` con alcance por socio
(`app.puede_entrenar_a`), `exercises` y `routines` como catálogo,
`exercise_completions` como registro de «esto ocurrió» con fecha local del
gimnasio —el mismo patrón que necesitará la asistencia a una sesión— y las
vistas de métricas, que se amplían con clases sin cambiar de forma.

**Patrón establecido (V3.0, V3.1 y V3.2 lo aplicaron de punta a punta):**

1. **Rama** `feat/v3.3-clases-sesiones` desde `feat/v3.2-rutinas-programas`.
2. **Base:** tablas con `tenant_id`, RLS + políticas por `app.tenant_allows`,
   FK compuestas (`(tenant_id, x)`), vistas `security_invoker`, grants por
   columna, autoría por default de sesión, auditoría por disparador, RPC
   invocador para operaciones de varias tablas; DEFINER solo en `app` y
   repitiendo permiso y gimnasio. **Cada política nombra su condición** (lección
   de V3.2). La sesión lleva `branch_id` y se comprueba con
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

Preguntas para el cliente antes de modelar V3.3: ¿una clase se repite semanalmente
(y hay que generar sesiones) o se cargan una por una?, ¿la capacidad es de la clase
o de cada sesión?, ¿quién puede cancelar una sesión y con cuánta antelación?,
¿la asistencia a una clase cuenta como entrada al gimnasio (asistencia) o es otra cosa?,
¿el socio ve el calendario de clases en su panel o también en la vitrina pública?

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
| V3.0 cobro QR | 2026-09-11 | (este commit) | **Corrección urgente.** Causa raíz de «gerencia no puede guardar el QR»: `upsert` con `tenant_id` sin grant (42501) mal traducido como falta de rol; ahora RPC invocador, sin ampliar permisos. QR general y por plan (`payment_qr_codes`, modalidad `global`/`por_plan`, monto libre/exacto), selección con respaldo en el general, precio de la base en la vitrina; la base rechaza cobros por QR y aprobaciones por debajo del precio (180/179/181 probados) y cierra el enlace de un pago barato por UPDATE directo. Migraciones `v3_cobro_qr_por_plan_e_importe_verificado` y `v3_venta_y_alta_con_qr_exigen_importe_completo`; batería RLS en `docs/runbooks/pruebas-rls-v3.0-cobro-qr.sql`; 46 pruebas de dominio |
| V3.2 | 2026-09-12 | (este commit) | Programas → rutinas → ejercicios; **asignar copia la rutina** al socio y se ajusta solo para él; progreso con una marca por ejercicio y día (fecha local del gimnasio, origen deducido por la base, series y peso opcionales); el socio marca desde su panel y el entrenador desde el suyo, cada uno acotado por `app.puede_entrenar_a`. **Métricas para gerencia** en `/panel/entrenamiento`: conclusiones automáticas, ejercicio más y menos hecho, qué hace cada socio, mapa día × grupo muscular y etiqueta del día («día de pierna») con umbrales probados en el dominio. Migraciones `v3_2_programas_rutinas_y_progreso` (+3 correcciones que encontró la batería de RLS) y semilla de demostración; ADR 0007; 102 pruebas de dominio |
| V3.1 | 2026-09-11 | `9c55f7b` | Desplegada (`dpl_AkFXrLTgx88Mv8ceBmVPm22xQvyc`) y verificada sobre el alias: públicas 200, `/mitico/panel/{entrenadores,entrenador,ejercicios}` 307 sin sesión, las mismas rutas en Aurora 404, CSP con el origen del proyecto en `img-src`/`media-src` y reproductores sin cookies en `frame-src`, sin `service_role` en 11 chunks (608 KB). Entrenadores + ejercicios. Perfil con cuenta opcional vinculada por gerencia (rol `trainer`, solo `trainers.self`), sedes N:M, ausencias por horas/turno/día/periodo sin solapes, socios principal/secundarios según el PLAN (en la base), espacio `/panel/entrenador` con columnas fijas; catálogo de ejercicios con imagen/GIF/clip/enlace, compresión en el navegador, subida directa firmada, bucket privado con URL firmada, cuota de 300 MB medida por la base. **Corrige una escalada de privilegios de V2** (gerencia podía darse `super_admin`). Migraciones `v3_roles_de_gimnasio_no_otorgan_plataforma`, `v3_1_entrenadores_ejercicios_y_permisos`, `v3_1_semilla_entrenador_demo_y_ejercicios`, `v3_1_mensajes_de_asignacion_y_especialidades`; ADR 0006; batería RLS V3.1; 79 pruebas de dominio |
| V3.0 | 2026-09-11 | `0227dd4`, `16fd88c` | Multisucursal: `branches`, `user_branches`, asistencia con sede (histórico sin sede), `branches.manage`/`branches.all`, sede de trabajo por dispositivo, dashboards global/por sede, `/panel/sucursales`, reportes por sede, «Nuestras sucursales» en la vitrina, auditoría por disparador, `npm test`. Mítico: Prado + Miraflores. Desplegada (`dpl_7DFPH7re52R8Q7kzHNwXo5sG99TQ`) y verificada sobre el alias: públicas 200 desde CDN, vitrina con las dos sedes y sus mapas, panel 307, `/aurora-fit/panel/sucursales` 404, CSV de la comparativa 401 sin sesión y 404 en Aurora, sin `service_role` en chunks |

Detalle de cada fase —defectos encontrados, tablas de pruebas por rol, notas de
despliegue— en [`docs/historial/bitacora-v1-a-v2.2.md`](docs/historial/bitacora-v1-a-v2.2.md).
