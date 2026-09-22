# CLAUDE.md — GYM PLATFORM · Memoria y reglas de trabajo

> Archivo de contexto persistente. Claude Code lo carga al abrir una sesión en
> este repositorio. **Describe el sistema tal como está HOY**, no cómo se llegó
> hasta aquí.
>
> - **Última actualización:** 2026-09-21 · **V5 · la tarjeta de QR se DIBUJA en el PDF: se acabaron el QR achatado, las letras partidas y el token fuera del marco** (ver §13e). Antes: **V5 revisada: inventario por sucursal ordenado, `service_role` retirado del código y arquitectura re-verificada**. Antes: **V4.2 GOLD V1 completa: identidad, pases de acceso, autorización de clases, tableros por puesto, clases del socio y correo de confirmación** (5 migraciones aplicadas, batería RLS pasada y **desplegada** en el proyecto Vercel `gold-gym` — https://gold-gym-psi.vercel.app, commit `7600d75` —, ver §13d).
> - **Rama de trabajo vigente:** `goldgym-v5` (cadena `feat/goldgym-v1` -> `goldgym-v2` -> ... -> `goldgym-v5`). **Esta rama sirve SOLO a GOLD**: los archivos de Mitico y Aurora se retiraron del registro de tenants (sus landings viven en `miticogym-v3`). El producto sigue siendo enlatado —nada en `src` nombra a un cliente—, pero un despliegue de esta rama ya no responde `/mitico` ni `/aurora-fit`. Decisiones: [ADR 0011](docs/architecture/adr/0011-anuncios-y-contenido-por-sucursal.md) · V4: [ADR 0010](docs/architecture/adr/0010-administracion-del-gimnasio-y-rendimiento.md).
> - **Roadmap de la serie V3:** `GYM_PLATFORM_ROADMAP_V3.md` (lo aporta el
>   usuario; no vive en el repositorio). Decisiones de V3.0: [ADR 0005](docs/architecture/adr/0005-multisucursal.md) · V3.1: [ADR 0006](docs/architecture/adr/0006-entrenadores-y-medios-de-ejercicios.md) · V3.2: [ADR 0007](docs/architecture/adr/0007-rutinas-asignadas-y-metricas-de-entrenamiento.md) · V3.3: [ADR 0008](docs/architecture/adr/0008-clases-sesiones-y-acceso-por-plan.md) · V3.4: [ADR 0009](docs/architecture/adr/0009-reservas-lista-de-espera-y-faltas.md).
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
| **En producción** | **V4.2 en https://gold-gym-psi.vercel.app** (proyecto Vercel `gold-gym`, commit `7600d75`, despliegue `dpl_4w5XedNhQ68ED1Vs5eckJ67KEH8o`, 2026-09-16). El mismo despliegue sirve los tres gimnasios. `web` (https://web-rust-xi-23.vercel.app) quedó en V4 y `gym-platform` (https://gym-platform-alpha.vercel.app) en V3.2 (ver §7 y §14) |
| **Clientes** | `/mitico` (real, todas las capacidades, **dos sedes: Prado y Miraflores**) · `/aurora-fit` (demo, solo sitio público, sede única Recoleta) · **`/golds-gym-premium` (real, V4.1: cuatro sucursales, anuncios y clases; sin módulos operativos contratados)** |
| **Estado** | V1 ✅ sitio público · V2 ✅ login · V2.1 ✅ dashboards, asistencia QR, reportes · V2.2 ✅ gestión de socios, cobro por QR · V3.0 ✅ multisucursal · V3.1 ✅ entrenadores + ejercicios · V3.2 ✅ rutinas + métricas · V3.3 ✅ clases + sesiones + acceso por plan · V3.4 ✅ reservas + lista de espera + faltas · V4 ✅ administración del gimnasio + jerarquía de roles + rendimiento · V4.1 ✅ anuncios + instalaciones por sucursal + alta de GOLD · **V4.2 ✅ identidad y foto del socio, pases de acceso con tope diario, alcance de sede por plan, autorización de clases e invitados, historial de ingresos, tableros por puesto, clases del socio y correo de confirmación por marca (en producción)** |
| **Roles** | Plataforma (`super_admin`) · **Administración (`admin`, V4)** · Gerencia · Recepción · Entrenador · Socio. Jerarquía en la base: `roles.level` 100/40/30/20/10/0 (§4.6) |
| **Siguiente** | 1) Pegar la plantilla del correo en Supabase (runbook) · 2) Revisar V4.2 con sesión, incluido el 403 (§13d) · 3) Designar el administrador de GOLD · 4) Completar los datos que GOLD no entregó (§12, bloque GOLD) · 5) V4.x: suscripciones, licencias, facturación (§13) |

**Antes de tocar nada, léase:** §2 (reglas), §3 (arquitectura), §4 (seguridad
de datos), §12 (deuda viva), §13d (**V4.2, lo último y lo que queda**) y §13b (V4).

**Cinco reglas que no se rompen nunca:**

1. **Enlatado:** un gimnasio nuevo = un archivo de configuración + registrarlo.
   Si hay que tocar un componente, una ruta o una consulta para un cliente, el
   diseño está mal.
2. **El aislamiento vive en la base (RLS), no en el código.** Esconder un botón
   no es seguridad. Toda tabla nueva nace con RLS y políticas por gimnasio y
   permiso, **escritas para evaluarse una vez por consulta** (V4):
   `tenant_id = (select app.current_tenant_id()) and (select app.has_permission('permiso'))`.
   Nunca `app.tenant_allows(tenant_id, …)` en una política: evalúa por fila.
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
V3.3 ✅  Clases grupales por plan, horario semanal, sesiones generadas por sede, capacidad, asistencia a clase y vitrina
V3.4 ✅  Reservas con reglas por gimnasio, lista de espera automática, faltas y bloqueo, avisos al socio, reportes
V4   ✅  Administración del gimnasio (rol admin + jerarquía), rendimiento con volumen, paginación, navegación agrupada
V4.1 ✅  Anuncios del gimnasio (carrusel + detalle, gestionables), instalaciones por sucursal y alta de GOLD'S GYM PREMIUM
V4.2 ✅  GOLD V1: identidad del socio, pases de acceso, clases con invitados, tableros por puesto y correo por marca
V4.x ⏭  Suscripciones, licencias, facturación, integraciones
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
               ├─ PostgreSQL ─ 44 tablas con RLS, 46 vistas security_invoker, 31 RPC invocador
               │               (desde V4: 43 vistas y 31 RPC; políticas evaluadas una vez por consulta)
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
  golds-gym-premium.tenant.ts    Gold's Gym Premium (real, V4.1: 4 sedes, anuncios, clases)
src/
  middleware.ts                  Renueva sesión y la cookie de pista gp-sesion. NO autoriza.
  app/
    page.tsx, not-found.tsx, sitemap.ts, robots.ts   Vitrina de la plataforma y SEO
    auth/confirmar/route.ts      Retorno del correo de confirmación (PKCE y token_hash)
    [tenant]/
      layout.tsx                 BISAGRA DEL ENLATADO: resuelve el tenant, inyecta tokens, 404 si no existe
      page.tsx + nosotros, servicios, planes, sucursales, clases, instalaciones, galeria, horarios, contacto
      acceso/                    Login y registro (page estática + actions.ts)
      pago/datos, pago/qr        Datos e imagen públicos del QR de cobro
      panel/
        layout.tsx               Cabecera y navegación del panel (pide las entradas a _navegacion.ts)
        page.tsx                 Reparte a plataforma | administracion | gimnasio | entrenador | socio según permisos
        _datos.ts                exigirPerfil / exigirPermiso (guardas por página, React cache)
        _acciones.ts             contextoDeAccion (guardas de Server Actions), imagenDeFormulario
        _navegacion.ts           V4: entradasDelPanel (flag + permiso + grupo); la usan la navegación y el resumen de Administración
        _sucursal.ts             Sede de trabajo: cookie por dispositivo gp-sucursal, resuelta contra v_mis_sucursales
        actions.ts               registrarCheckIn (con sede), cambiarSucursalDeTrabajo, marcarAvisoLeido
        socio/ gimnasio/ plataforma/ (+ actions.ts: designar administrador)  Espacios de trabajo
        administracion/          V4: resumen de Administración (negocio, personal, módulos, cambios administrativos)
        anuncios/ actions.ts     V4.1: anuncios del sitio (publicar, editar, retirar y volver a publicar)
        personal/ actions.ts     V4: Personal y roles (cuentas paginadas, otorgar/quitar rol, suspender/reactivar)
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
        clases/ [id]/ sesion/[id]/ actions.ts  Agenda, catálogo con planes, horarios, generación, sesión y toma de asistencia, métricas (V3.3)
          reservas-actions.ts, _reservas.tsx   Reservar, cancelar, justificar, cerrar lista, reglas; sección de reservas de gerencia (V3.4)
        reportes/ [reporte]/ csv/ _filtros.ts Reportes híbridos
  core/
    domain/
      tenant/                    tenant-config.ts (CONTRATO CENTRAL), branding.ts, feature-flags.ts,
                                 correo-de-confirmacion.ts (V4.2: la plantilla de Supabase, generada por marca)
      catalog/catalog.ts         Servicios, planes, programas, productos, galería, equipo…
      shared/                    Tipos base, marcas nominales y paginacion.ts (V4: página de la URL, rango, números visibles, consulta con filtros)
      catalog/facilities.ts      V4.1: reparto de instalaciones por sede (el puente es `branches.code`)
      operations/                Reglas del sistema privado, sin I/O:
        announcements.ts         V4.1: anuncios — estado (publicado/programado/vencido/retirado), orden, validación, texto de tarjeta
        workspace.ts             PERMISO, espacioDeTrabajo(), PerfilOperativo; V4: NIVEL_DE_ROL, ROLES_OTORGABLES, puedeOtorgarRol, puedeAdministrarCuenta
        staff.ts                 V4: cuentas del gimnasio, resumen de personal, describirEvento (auditoría), mensajes de error de roles
        attendance.ts            Métodos, resultado de check-in, estadísticas; V4: resumirPatrones (calor, hora y día pico desde conteos de la base)
        dashboard.ts             Indicadores, series, variación
        notifications.ts         Avisos derivados (vencimiento) + manuales
        members.ts               Ficha, alta, validaciones, filtros, edad/cumpleaños; V4: SocioDeLista, ConteoDeSocios, OpcionDeSocio
        receipts.ts              Comprobantes, firma binaria de imágenes, nombres en ZIP
        streak.ts                calcularRacha (los días cerrados no la cortan; la sede no existe para ella)
        branches.ts              Sucursal, validarSucursal, resolverSucursalOperativa, repartoPorSucursal, mapas
        trainers.ts              Entrenador, ausencias (turnos, solapes, disponibilidad), regla del plan (V3.1)
        exercises.ts             Catálogo, grupos musculares, política de medios, bytes mágicos, cuota, enlaces (V3.1)
        training.ts              Rutinas y LECTURA del entrenamiento: etiqueta del día por grupo/familia, conclusiones (V3.2); V4: tituloDeRutina, nombreSinEtiquetaDelDia
        classes.ts               Clases: acceso por plan, fechas de un horario, cruces, estado de sesión, ocupación, conclusiones (V3.3)
        reservations.ts          Reservas: ventana, cancelación tardía, cupo y espera, bloqueo por faltas, reglas, conclusiones (V3.4)
        tablero.ts               V4.2: con qué mirada se abre un dashboard (enfoque, orden de bloques, acciones rápidas)
        agenda-del-socio.ts      V4.2: en qué situación está el socio ante una sesión (inscrito, completo, próximo…)
        acceso-al-panel.ts       V4.2: situación → respuesta (acceso, 403, 503, su panel). Solo «sin sesión» va al login
        periodo.ts               Presets hoy/ayer/7d/30d/mes/mes-anterior/año
        reports.ts               Catálogo de 11 reportes, resumen, serie, CSV seguro, TOPE_DE_FILAS_DE_REPORTE (2 000)
    application/
      ports/                     tenant-repository, operations-repository, members-repository,
                                 receipts-repository (+ PaymentSettingsPort), reports-repository,
                                 branches-repository (+ PublicBranchesPort), trainers-repository,
                                 exercises-repository, training-repository,
                                 classes-repository (+ PublicClassesPort), reservations-repository,
                                 staff-repository (V4), resultado
      tenant/get-tenant.usecase.ts, theming/build-theme.ts, auth/login.usecase.ts
  infrastructure/
    config/composition-root.ts   ÚNICO sitio que construye adaptadores
    tenants/                     tenant.registry.ts, static-tenant.repository.ts, tenant.validator.ts
    auth/                        supabase.config.ts, supabase.server.ts, supabase.public.ts (anónimo, sin cookies),
                                 cookie-options.ts, session-hint.ts
    operations/                  supabase-{operations,members,receipts,reports,branches,trainers,exercises,training,classes,reservations,staff}.repository.ts, qr.ts
  presentation/
    ui/                          Átomos/moléculas: Button, Badge, Modal (Dialogo), StatCard, DataTable,
                                 Campo, BarChart, DonutChart, HeatMap, QrCode, EmptyState, Logo, Reveal,
                                 Cargando (V4: Spinner), IconoDeEnlace (V4: IconoDeEnlace/GiroDeEnlace con useLinkStatus)…
    patterns/                    Organismos: SiteHeader/Footer, AccessForm/Modal, CheckInPanel, QrScanner,
                                 FichaDeSocio, SocioForms, ComprobanteForms, AjustesDeCobroForm,
                                 PaymentQrModal, ContenidoDePagoQr, RachaCalendario, ReportFilters,
                                 NotificationsPanel, DashboardNav, AccionConEstado, SelectorDeImagen,
                                 SelectorDeSucursal, SucursalForm, TarjetaDeSucursal, EntrenadorForms,
                                 EjercicioForms (compresión, póster y subida directa), UsoDeMedios,
                                 RutinaForms (programa, rutina, ejercicio, asignación y marca de hecho),
                                 ClaseForms (clase, planes, horario, sesión, generar, cancelar, tomar asistencia),
                                 AgendaDeClases (FilaDeSesion, AgendaSemanal, BarraDeOcupacion),
                                 ReservaForms (BotonDeReserva, CancelarReserva, AjustesDeReservaForm, ReservarParaSocio, MarcarQueVino),
                                 V4: DashboardNav (agrupada), Paginacion, FiltroConCarga (FormularioDeFiltro, BotonDeFiltrar),
                                 PersonalForms (OtorgarRolForm, DesignarAdministradorForm)…
    sections/                    Secciones del sitio público (Hero, Plans, TrainingPlans, Products, Branches…)
    layouts/PageHero.tsx, icons/Icon.tsx
  lib/                           cn, formato (fechas/importes/hoyEnZona/momentoEnZona), page-guards, tenant-links,
                                 site-url, cobro, zip, navegacion (V4: grupos del panel, entrada activa)
  styles/globals.css             Sistema de diseño: tokens, utilidades, impresión
```

~22 000 líneas en `src`. Pruebas de dominio en `apps/web/tests` (`npm test`). `supabase/migrations/README.md` lista las migraciones
y, desde V4, la carpeta guarda también los `.sql` nuevos;
`docs/` guarda ADR, guías y runbooks (algunos describen solo V1: ver §12).

### 3.3 Capas y piezas clave

**Composition root.** `tenantRepository()` es singleton de proceso (config
estática). Los repositorios de datos (`operationsRepository`,
`membersRepository`, `receiptsRepository`, `reportsRepository`,
`paymentSettingsRepository`, `branchesRepository`, `trainersRepository`,
`exercisesRepository`, `trainingRepository`, `classesRepository`, `reservationsRepository`, `staffRepository`) **se crean por petición** con el cliente de
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
por nombre de rol: `tenants.manage` → plataforma; `roles.manage` + `dashboard.read`
→ administracion (V4); `dashboard.read` → gimnasio; `trainers.self` → entrenador;
resto → socio. Un rol nuevo llega solo a su sitio.

**Autorización revisada en V4** (sin sistema paralelo): la pantalla decide con los
permisos de `v_my_profile`; la base, con los mismos permisos (`app.has_permission`)
y el gimnasio de la sesión. No había inconsistencia entre el rol mostrado y el
reconocido. La plataforma no pertenece a ningún gimnasio: `contextoDeAccion` exige
que la sesión sea del gimnasio de la ruta, así que sus acciones propias
(`plataforma/actions.ts`) comprueban `tenants.manage` y la RPC lo repite.

**Navegación (V4).** `panel/_navegacion.ts` arma las entradas (flag + permiso +
grupo `inicio`/`dia`/`socios`/`entrenamiento`/`gestion`). `DashboardNav` las
muestra en una fila que envuelve si son ≤ 6; si son más, un menú por grupo en
escritorio y un botón «Secciones» en pantallas estrechas. **Nunca desplazamiento
horizontal**; ninguna entrada se oculta.

**Listas largas (V4).** La base filtra, ordena, cuenta y corta: `range(desde, hasta)`
+ `count: 'exact'` con `core/domain/shared/paginacion.ts` (25 por página, tope 100,
página de la URL validada) y el componente `Paginacion` (enlaces con los filtros,
giro con `useLinkStatus`). Nada de traer 500 filas para ocultarlas en el navegador.
Los contadores se piden a vistas agregadas (`v_customer_counts`,
`v_attendance_patterns`), y los desplegables a `opciones()` (id, código, nombre).

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

**Feature flags** (`feature-flags.ts`, 27 en total; V3.0 reutiliza `enableMultiBranch`; V3.1 usa `enableTrainers` y añade `enableExercises`; V3.3 enciende `enableClasses`):

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
| `enableClasses` | **V3.3**: `/panel/clases` (agenda, catálogo, horarios, sesiones, asistencia y métricas), «Tus clases» del socio y del entrenador, página pública `/clases` (entrada de menú que exige la flag; el validador lo comprueba) | ✅ | ❌ |
| `enableReservations` | **V3.4** (exige `enableClasses`, lo comprueba el validador): reservar desde «Tus clases», lista de reservas y «Vino»/«Cerrar lista» en la sesión, reglas y faltas en `/panel/clases`, avisos personales, reporte `reservas-de-clases` | ✅ | ❌ |
| `enableInventory` | **V4.3**: `/panel/inventario` (productos y existencias de la sede donde se opera) y su accion rapida en el tablero. **Encendida en GOLD** | ❌ | ❌ |
| `enableAnnouncements` | **V4.1**: carrusel de anuncios con su detalle en el inicio y `/panel/anuncios` para publicarlos (`content.manage`). Sin anuncios publicados la sección no se dibuja, así que encenderla antes de publicar no se nota. **Encendida en GOLD**, apagada en Mítico y Aurora | ❌ | ❌ |

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
2. **RLS activo en las 44 tablas**, sin política = denegado. 145 políticas en
   `public` + 10 en `storage`.
3. **El tenant sale de la identidad:** `app.current_tenant_id()`,
   `app.current_customer_id()`, `app.current_app_user_id()`. Autorización:
   `app.has_permission` y, fuera de las políticas, `app.tenant_allows(tenant_id, 'modulo.accion')`.
   **En una política (V4)**: `tenant_id = (select app.current_tenant_id()) and (select app.has_permission('x'))`
   y todo el contexto envuelto en `(select …)`. Una función de contexto con una columna de la fila como
   argumento se evalúa POR FILA (dos subconsultas cada vez): con 50 000 entradas, más de 20 s para contar.
4. **Esquema `app` fuera de la API.** Las funciones `SECURITY DEFINER` viven ahí
   (PostgREST publica todo `public` como `/rpc`). **En `public` no hay ninguna
   función DEFINER**: las 27 RPC (31 tras V4) son `SECURITY INVOKER` y corren bajo RLS.
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
14. **El calendario es del gimnasio; quién asistió, no (V3.3):** clases, horarios y
    sesiones los lee cualquier cuenta del gimnasio (y el anónimo, las públicas).
    La asistencia la leen `classes.manage`, el propio socio y quien puede tomar
    asistencia EN ESA sesión (`app.puede_tomar_asistencia`). Nombre del instructor
    y ocupación, por funciones DEFINER de un dato (`app.nombre_de_entrenador`,
    `app.asistentes_de_sesion`).
15. **Otorgar un rol mira también su NIVEL (V4):** `roles.level` y
    `app.puede_otorgar_nivel` en las políticas de `user_roles` y en las RPC. Con
    `roles.manage` hasta el propio nivel; con `users.manage` solo por debajo. Nadie
    toca sus roles ni su cuenta, ni la de un superior (`app.puede_administrar_cuenta`,
    también en el UPDATE de `app_users`), y el gimnasio no se queda sin su último
    administrador activo (disparador). El administrador es un rol de gimnasio: lo
    ata a SU gimnasio la misma condición de `tenant_id` que al resto.

### 4.2 Tablas (44)

| Área | Tabla | Notas |
|---|---|---|
| Plataforma | `tenants` | slug, nombre, `timezone`, `currency`, `status`, `is_demo` |
| Sedes (V3.0) | `branches` | `code` único por tenant, nombre, dirección, teléfono, correo, `opening_hours` (texto), lat/long, `google_maps_url` (solo Google), `is_primary` (una por tenant, solo por RPC), `is_active` (sin DELETE). `tenant_slug` por disparador para la vitrina anónima |
| | `user_branches` | N:M usuario↔sede con `is_active` (retirar = desactivar). FK compuestas a `branches` y `app_users` |
| Identidad | `app_users`, `roles`, `permissions`, `role_permissions`, `user_roles` | `app_users.auth_user_id` → `auth.users`; `customer_id` vincula cuenta ↔ ficha; `status` `invited`/`active`/`suspended` (suspendida = sin contexto de gimnasio). **V4:** `roles.level` (0-100) y rol `admin`; `user_roles.granted_by`/`granted_at` los pone la base; otorgar y quitar se auditan (`role.granted`, `role.revoked`, `account.status_changed`) |
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
| Clases (V3.3) | `classes` | Nombre único, categoría (9), nivel, `regular`/`evento`, **`access_mode`** `membresia`/`planes`/`abierta`, duración 15-240, **capacidad 1-200 obligatoria**, instructor habitual, `is_public` (vitrina), activa. `tenant_slug` por disparador para el anónimo |
| | `class_plans` | Qué planes incluyen la clase (FK compuestas a clase y plan). Se fija entero por RPC |
| | `class_schedules` | Horario semanal: día ISO, hora, sede, instructor, duración y cupo opcionales (heredan), `starts_on`/`ends_on`, activo. Único por clase+sede+día+hora activos. El instructor tiene que trabajar en la sede |
| | `class_sessions` | Sesión concreta: fecha local, hora, duración, **cupo efectivo**, sede, instructor, título y notas; `programada`/`cancelada` (cancelada ⇔ motivo, CHECK). **Una por horario y fecha, también cancelada** (índice único). No en el pasado, sin cruce del instructor ni ausencia, no se reabre, no se cancela con asistentes |
| | `class_attendances` | Una por socio y sesión; `membership_id` que la habilitó (la deduce la base), `method` manual/qr, `marked_by` de la sesión. Plan, ventana (−30 min / +7 días) y cupo con `FOR UPDATE` en el disparador. **No es una entrada al gimnasio** |
| Reservas (V3.4) | `tenant_reservation_settings` | Reglas por gimnasio (apertura en días, cierre y cancelación libre en minutos, tope de activas, espera y su máximo, faltas que bloquean, ventana, días de bloqueo, si la cancelación tardía cuenta). Sin fila = recomendadas. Se escribe por RPC |
| | `class_reservations` | Una viva por socio y sesión. `reservada`/`en_espera`/`asistio`/`no_asistio`/`cancelada`/`justificada`; `source` socio/personal, `late_cancel`, `cancelled_by_gym`, membresía que la habilitó; todo lo pone la base. Solo se conceden `status` y `cancel_reason` para actualizar |
| | `customer_messages` | Avisos personales que escribe la base (lugar liberado, clase cancelada, bloqueo, falta justificada). El socio solo marca `read_at` |
| Contenido (V4.1) | `announcements` | Anuncios públicos del gimnasio: título, resumen de la tarjeta, contenido completo, arte (`image_path` en el bucket `anuncios`), `kind` (7 tipos), enlace validado `https?://`, `sort_order` (prioridad), `is_active`, `published_at` y `expires_at`. `tenant_slug` por disparador para la vitrina anónima; autoría y tiempos los pone la base. **Sin DELETE**: se retira (`is_active`), no se borra. El anónimo solo alcanza lo activo, publicado y no vencido |
| | `payment_qr_codes` | QR de cobro: `plan_id` NULL = **general** (siempre monto libre, uno por gimnasio) o de un plan (uno por plan, FK compuesta); `amount_mode` `libre`/`exacto` + `fixed_amount`; `expires_on`; ruta con prefijo del gimnasio (CHECK). Lectura: anónimo todo (es lo que se imprime en el mostrador), con sesión solo su gimnasio. Escritura: `settings.manage`, por RPC |

Enums: `payment_method` (`cash, qr, transfer, card, other`), `attendance_method`
(`manual, qr, kiosk`), `receipt_status`, `receipt_source`, estados de
membresía/socio/tenant.

### 4.3 Vistas (46, todas `security_invoker`)

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
(día × grupo muscular, 90 d) · `v_training_overview` (resumen, solo con `training.read`) ·
**V3.3:** `v_classes` (planes, horarios, próximas 7 d, nombre del instructor) · `v_class_schedules` ·
`v_class_sessions` (ocupación y **estado efectivo** programada/en_curso/realizada/cancelada con la hora
del gimnasio) · `v_class_attendance_log` · `v_class_stats` (ocupación 30 d por clase), `v_class_slot_stats`
(día × hora, 90 d) y `v_class_overview` (las tres, solo con `classes.manage`) ·
**V3.4:** `v_class_sessions` recreada con `reservadas`, `en_espera`, `ocupados`, `walkin_spots` y la reserva de quien
mira (`mi_reserva_*`, `mi_posicion`) · `v_class_reservations` (con `estado_efectivo`: la falta derivada) ·
`v_reservation_stats`, `v_reservation_overview`, `v_reservation_no_shows`, `v_class_attendance_report` y
`v_class_reservation_report` (todas de gerencia) ·
**V4:** `v_customer_list` (lista de socios paginable, sin las siete subconsultas de la
ficha; `days_since_visit` —36 500 si nunca vino— y `birthday_this_month` con la fecha del gimnasio) ·
`v_customer_counts` (accesos rápidos de socios en una fila) · `v_attendance_patterns` (entradas de 30 días por día ISO,
hora local, método y sede) · `v_staff` (cuentas del gimnasio con roles, nivel e `is_staff`) ·
**V4.1:** `v_announcements_public` (anuncios activos, ya publicados y no vencidos, ya ordenados por prioridad: la regla
de «qué está publicado» vive en la base, no en el adaptador). **Regla:** la fecha del
gimnasio en una vista se calcula uniendo `tenants` una vez (`(now() at time zone t.timezone)::date`), nunca con
`app.hoy_del_gimnasio(tenant_id)` por fila (36 s → 128 ms en `v_attendance_patterns`). `v_customer_detail` se
reescribe con `tenant_id` en cada subconsulta (mismas columnas; es la ficha de UN socio).

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
| `generar_sesiones_de_clases(desde, hasta, clase?)` | Crea las sesiones de los horarios activos (hasta 62 días; salta las existentes; los conflictos se omiten y se devuelven con su motivo) | `sin_permiso`, `rango_invalido` |
| `registrar_asistencia_a_clase(session, customer, método)` | Registra a un socio en una sesión; devuelve asistentes y capacidad | `sin_permiso`, `sesion_cancelada`, `sesion_futura`, `fecha_demasiado_antigua`, `plan_no_incluye_clase`, `sin_membresia_vigente`, `clase_llena`, `ya_registrado` |
| `fijar_planes_de_clase(clase, planes[])` | Deja los planes de la clase exactamente como llegan | `sin_permiso` |
| `cancelar_sesiones_de_horario(horario, motivo)` | Cancela las futuras sin asistentes (al retirar un horario) | `sin_permiso`, `motivo_requerido` |
| `asistentes_de_sesion(session)` · `candidatos_de_sesion(session, buscar)` | Nombre, código y plan de asistentes y candidatos (con si la clase lo admite); buscan por código, nombre o token del QR. Columnas fijas vía DEFINER en `app`, solo para quien toma asistencia en esa sesión | — |
| `reservar_clase(session, customer?)` | Reserva (sin socio, el de la sesión); devuelve estado y posición en espera | `sin_permiso`, `reserva_no_abierta`, `reserva_cerrada`, `reservas_bloqueadas` (detalle = fecha), `limite_de_reservas`, `ya_reservado`, `ya_registrado`, `reserva_cruzada`, `clase_llena`, `plan_no_incluye_clase`, `sin_membresia_vigente` |
| `cancelar_reserva(id, motivo)` · `justificar_inasistencia(id)` · `cerrar_lista_de_sesion(session)` | Cancelar (marca tardía y promueve la espera), justificar (gerencia) y escribir las faltas de una sesión terminada | `sesion_iniciada`, `reserva_no_cancelable`, `inasistencia_no_valida`, `sesion_sin_terminar`, `sin_permiso` |
| `guardar_ajustes_de_reservas(…)` · `reservas_de_sesion(session)` · `mi_estado_de_reservas()` | Reglas del gimnasio (gerencia), lista de la sesión con nombres (columnas fijas) y bloqueo/activas/reglas del socio | `sin_permiso` |
| `rotar_token_check_in(customer)` | Nuevo token QR (el disparador pone el valor aleatorio) | — |
| `establecer_sucursal_primaria(branch)` | Cambia la sede principal (delega en `app.fijar_sucursal_primaria`, que repite el permiso) | `sin_permiso`, `sucursal_inactiva` |
| **V4** `otorgar_rol(usuario, rol)` | Da `admin`/`manager`/`receptionist` a una cuenta activa del gimnasio de la sesión, si el nivel lo permite | `sin_permiso`, `rol_no_otorgable`, `cuenta_no_encontrada`, `cuenta_inactiva`, `ya_tiene_el_rol` |
| **V4** `retirar_rol(usuario, rol)` | Quita ese rol (0 filas por RLS = `sin_permiso`, sin distinguir ajeno/superior/sin rol) | `sin_permiso`, `rol_no_otorgable`, `cuenta_propia`, `ultimo_administrador` |
| **V4** `cambiar_estado_de_cuenta(usuario, activa)` | Suspende (`suspended`) o reactiva una cuenta que la sesión puede administrar | `sin_permiso`, `cuenta_propia`, `ultimo_administrador` |
| **V4** `designar_administrador_de_gimnasio(tenant, correo)` | Solo plataforma: da `admin` a una cuenta activa ya registrada en ESE gimnasio. No crea cuentas | `sin_permiso`, `cuenta_no_encontrada`, `ya_tiene_el_rol` |

**Esquema `app` (77 aplicadas + 10 de V4):** administración V4 (`nivel_de_la_sesion`, `nivel_de_cuenta`,
`puede_otorgar_nivel`, `puede_administrar_cuenta`, `preparar_rol_otorgado`, `conservar_un_administrador`, `auditar_rol`,
`auditar_estado_de_cuenta`), rutinas V4 (`nombre_sin_etiqueta_del_dia`, `rutina_sin_dia_en_el_nombre`), reservas V3.4 (`ajustes_de_reservas`, `ocupacion_de_sesion` —el cupo compartido—,
`reservas_bloqueadas_hasta` —faltas guardadas y derivadas—, `posicion_en_espera`, `promover_lista_de_espera`,
`avisar_al_socio`, `describir_sesion`, `preparar_reserva`, `cambiar_estado_de_reserva`,
`despues_de_cambiar_reserva`, `reserva_sigue_a_la_asistencia`, `reservas_siguen_a_la_sesion`,
`capacidad_no_baja_de_lo_reservado`, `lista_de_reservas`, `preparar_mensaje_al_socio`,
`preparar_ajustes_de_reservas`, `inicio_de_sesion`), clases V3.3 (`ahora_del_gimnasio`, `nombre_de_entrenador`,
`asistentes_de_sesion`, `puede_tomar_asistencia`, `acceso_a_clase` —la regla del plan—,
`exigir_entrenador_en_sede`, `preparar_clase`, `preparar_horario_de_clase`,
`preparar_sesion_de_clase`, `validar_asistencia_a_clase`, `auditar_clases`,
`lista_de_asistentes`, `candidatos_de_sesion`), rutinas y progreso V3.2 (`puede_entrenar_a` —gerencia sobre su
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
| `anuncios` (V4.1) | Público de lectura (es lo que se pinta en la portada; una URL firmada por anuncio sacaría la vitrina del CDN); escribe y borra `content.manage` del gimnasio de la ruta | 3 MB · jpeg/png/webp | `{tenant_id}/{uuid}.{ext}` |

Las imágenes **no se entregan con URL firmada**: pasan por
`/[tenant]/panel/comprobantes/[id]/imagen` (sesión, re-verificación de firma
binaria, `no-store`, CSP de sandbox) y `/[tenant]/pago/qr` (público, 410 si el
QR venció). La CSP (`img-src 'self'`) bloquearía imágenes de otro dominio en
silencio. `storage.protect_delete` impide borrar objetos por SQL.

### 4.6 Roles y permisos (37 permisos: 35 + `roles.manage` de V4 + `content.manage` de V4.1)

**Roles y nivel (`roles.level`, V4):** `super_admin` 100 (plataforma) · **`admin` 40** (Administración del
gimnasio) · `manager` 30 · `receptionist` 20 · `trainer` 10 · `customer` 0.

| Permiso | Super admin | **Admin (V4)** | Gerente | Recepción | Entrenador | Socio |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `tenants.manage` | ✅ | | | | | |
| **`roles.manage`** (otorgar y quitar roles hasta el propio nivel) | | ✅ | | | | |
| `users.read`, `users.manage` | ✅ | ✅ | ✅ | | | |
| `audit.read` | ✅ | ✅ | ✅ | | | |
| `dashboard.read` | | ✅ | ✅ | ✅ | | |
| `customers.read`, `customers.create` | | ✅ | ✅ | ✅ | | |
| `customers.update`, `customers.archive` | | ✅ | ✅ | | | |
| `memberships.read`, `memberships.create` | | ✅ | ✅ | ✅ | | |
| `memberships.update` | | ✅ | ✅ | | | |
| `payments.read`, `payments.create` | | ✅ | ✅ | ✅ | | |
| `attendance.read`, `attendance.create` | | ✅ | ✅ | ✅ | | |
| `plans.read` | | ✅ | ✅ | ✅ | ✅¹ | ✅ |
| `routines.read` (programas, rutinas y rutinas asignadas) | | ✅ | ✅ | ✅ | ✅ | |
| `routines.manage`, `routines.assign` (crear y asignar; el entrenador, solo a SUS socios) | | ✅ | ✅ | | ✅ | |
| `training.log` (marcar ejercicios de un socio; el socio marca los suyos sin permiso) | | ✅ | ✅ | | ✅ | |
| `training.read` (métricas del gimnasio) | | ✅ | ✅ | | | |
| `exercises.read` (catálogo: el socio necesita leer los ejercicios de su rutina) | | ✅ | ✅ | | ✅ | ✅ |
| `plans.manage`, `settings.manage`, `reports.read` | | ✅ | ✅ | | | |
| `branches.manage` (administrar sedes y asignar personal) | | ✅ | ✅ | | | |
| `branches.all` (operar en todas las sedes sin asignación; vista global) | | ✅ | ✅ | | | |
| `trainers.read`, `trainers.manage` (equipo, cuenta, sedes, ausencias, asignaciones) | | ✅ | ✅ | | | |
| `trainers.self` (su perfil y sus socios asignados) | | | | | ✅ | |
| `exercises.manage` (catálogo y medios) | | ✅ | ✅ | | | |
| `classes.read` (calendario de clases con ocupación; el socio lo lee sin permiso, por ser del gimnasio) | | ✅ | ✅ | ✅ | ✅ | |
| `classes.manage` (clases, planes que las incluyen, horarios, generar y cancelar sesiones, métricas) | | ✅ | ✅ | | | |
| `classes.attend` (registrar y quitar asistencia: recepción en SUS sedes, el entrenador en SUS sesiones; desde V3.4 también reservar por un socio y cerrar la lista ahí) | | ✅ | ✅ | ✅ | ✅ | |
| **`content.manage`** (V4.1: publicar y editar los anuncios del sitio) | | ✅ | ✅ | | | |
| **`inventory.read`** (V4.3: consultar el inventario de la sede) | | ✅ | ✅ | ✅ | | |
| **`inventory.manage`** (V4.3: alta, correccion y retirada de productos) | | ✅ | ✅ | | | |

**Quién otorga qué (V4):** Administración otorga y quita `admin`, `manager` y `receptionist` a cuentas de nivel ≤ 40
(no a sí misma). Gerencia solo `receptionist` y a cuentas por debajo de su nivel (**ya no nombra gerentes**).
`trainer` se otorga al vincular el perfil en Entrenadores; `customer` nace con el registro. La plataforma designa el
primer administrador de cada gimnasio.

V3.4 no agrega permisos: el socio reserva y cancela lo suyo SIN permiso (política «self»), el
personal usa `classes.attend` en la sesión donde opera y gerencia `classes.manage` (reglas,
justificar, reservar por encima de topes y bloqueo).

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

**63 aplicadas** (`v2_0001` … `v4_2_autorizacion_de_clases_e_invitados`), listadas
con su propósito en [`supabase/migrations/README.md`](supabase/migrations/README.md).
Las 49 hasta V3.4 **viven solo en el servidor**: materializarlas requiere `npx supabase link` +
`npx supabase db pull`, que pide la contraseña de la base (no disponible en la
sesión). Deuda #1 de §12.

**V4: 7 migraciones, aplicadas el 2026-09-14 y versionadas también como archivo** en `supabase/migrations/`:
`v4_rls_con_contexto_evaluado_una_vez_por_consulta`, `v4_lista_y_conteos_de_socios_en_la_base`,
`v4_patrones_de_asistencia_agregados_en_la_base`, `v4_rol_administrador_del_gimnasio_y_jerarquia`,
`v4_rutinas_sin_el_dia_repetido_en_el_nombre` y dos que encontró la batería al aplicarlas:
`v4_fecha_del_gimnasio_sin_funcion_por_fila` y `v4_cambiar_estado_de_cuenta_no_escribe_updated_at`.

**Toda migración nueva desde V4:** archivo `supabase/migrations/AAAAMMDDHHMMSS_v4_…sql` (snake_case español) +
`apply_migration` por MCP con el mismo nombre (con autorización del usuario: la base es de producción) + su fila en el
README de migraciones.

---

## 5. Funcionalidad actual

### 5.1 Rutas

| Ruta | Tipo | Capacidad + permiso | Qué hace |
|---|---|---|---|
| `/` | estática | — | Vitrina de la plataforma |
| `/[tenant]` + `nosotros`, `servicios`, `planes`, `instalaciones`, `galeria`, `horarios`, `contacto` | SSG | `publicSite` + flag de sección | Sitio comercial |
| `/[tenant]/sucursales` | SSG + ISR 300 s | `enableMultiBranch` | Todas las sedes: una fila por sede con imagen, mapa, texto de vitrina, datos y «Cómo llegar»; anclas `#sede-CODE` |
| `/[tenant]/clases` | SSG + ISR 300 s | `enableClasses` | Clases publicadas (`is_public`): descripción, nivel, duración, horario semanal por sede y paquetes que las incluyen; «Horario de la semana». Cliente anónimo, sin ocupación ni instructor |
| `/[tenant]/acceso` | SSG | `memberLogin` | Login y registro (también en modal desde la cabecera) |
| `/auth/confirmar` | dinámica | — | Confirma correo; destino validado contra el registro (sin redirector abierto) |
| `/[tenant]/pago/datos` · `/pago/qr` | handler | `enablePayments` | JSON e imagen del QR de cobro que toca (`?plan=<código>`; imagen por `?qr=<id>` del mismo gimnasio). Cliente **anónimo**, elección de `resolverCobroQr` (caché 60 s / 300 s; 410 vencido) |
| `/[tenant]/panel` | dinámica | sesión | Reparte al espacio que corresponde |
| `…/panel/socio` | dinámica | sesión | Panel del socio |
| `…/panel/administracion` | dinámica | `roles.manage` (**V4**) | Resumen de Administración: socios activos, ingresos, entradas y comprobantes; personal por rol y cuentas suspendidas; todos los módulos contratados agrupados; últimos cambios administrativos (`audit_log`, hora del gimnasio); accesos a «Operación del día» y «Personal y roles» |
| `…/panel/personal` | dinámica | `users.read` (**V4**; la plataforma se redirige a su panel) | Personal y roles: resumen, vistas Personal/Todas/Suspendidas, búsqueda, cuentas paginadas con roles y estado; «Dar rol», «Quitar …», «Suspender/Reactivar» solo donde la jerarquía lo permite |
| `…/panel/gimnasio` | dinámica | `dashboard.read` | Dashboard de gerencia y recepción («Operación del día» para Administración). V4: contadores de socios desde `v_customer_counts` |
| `…/panel/plataforma` | dinámica | `tenants.manage` | Resumen de gimnasios (sin datos personales). V4: «Designar» administrador por gimnasio (correo de una cuenta ya registrada) |
| `…/panel/asistencia` | dinámica | `enableAttendance` + `attendance.read` | Check-in, estadísticas (V4: agregadas en la base, 30 días reales), historial paginado (25) con filtros |
| `…/panel/accesos` | dinámica | `enableAttendance` + `attendance.read` (**V4.2**) | Historial de INGRESOS: cada paso por la puerta con su hora y su sede, paginado en la base (25), con filtros de rango, socio, sucursal y tipo (todos / en su sede de origen / en otra sucursal). Distinto de «Asistencia», que cuenta un día por socio |
| `…/panel/socios`, `/nuevo`, `/[id]` | dinámica | `enableMemberManagement` + `customers.*` | Lista paginada (25) con búsqueda, plan y accesos rápidos contados por la base (en rejilla, sin scroll horizontal), alta, ficha completa |
| `…/panel/comprobantes`, `/[id]/imagen` | dinámica | `enablePayments` + `payments.read` | Bandeja paginada (12 tarjetas), totales por importe, revisión, ZIP que pide la lista filtrada al pulsar (tope 500) |
| `…/panel/cobros` | dinámica | `enablePayments` + `settings.manage` | Datos y modalidad, QR general y QR de cada plan activo (libre/exacto, vencimiento, «se cobra con»), eliminar |
| `…/panel/anuncios` | dinámica | `enableAnnouncements` + `content.manage` (**V4.1**) | Anuncios del sitio: tarjetas con su estado (publicado / programado / vencido / retirado), alta y edición en modal (título, resumen, contenido, arte, tipo, enlace, prioridad, publicación y vencimiento), retirar y volver a publicar |
| `…/panel/sucursales`, `/[id]` | dinámica | `enableMultiBranch` + `branches.manage` | Sedes con indicadores, comparativa, alta/edición, activar/desactivar, principal, personal por sede |
| `…/panel/entrenadores`, `/[id]` | dinámica | `enableTrainers` + `trainers.read` (escribir: `trainers.manage`; regla del plan: `plans.manage`) | Equipo con disponibilidad de hoy; perfil, cuenta, sedes, ausencias (horas/turno/día/periodo), socios asignados según plan, historial; «Entrenador según el plan» |
| `…/panel/entrenador` | dinámica | `enableTrainers` + `trainers.self` | Espacio del entrenador: su perfil, sus socios (código, nombre, plan, vigencia) y sus ausencias |
| `…/panel/ejercicios`, `/[id]` | dinámica | `enableExercises` + `exercises.read` (escribir: `exercises.manage`) | Catálogo con búsqueda y grupo muscular, miniaturas firmadas, medios (imagen/GIF/clip/enlace), uso de la cuota y «Liberar archivos sin uso» |
| `…/panel/rutinas`, `/[id]` | dinámica | `enableRoutines` + `routines.read` (escribir: `routines.manage`; asignar: `routines.assign`) | Programas con sus rutinas, ejercicios de cada rutina (series, repeticiones, descanso), asignación a socios y quién la está haciendo |
| `…/panel/rutinas/asignada/[id]` | dinámica | `enableRoutines` + sesión | La rutina de UN socio: la abren el socio (marcar), su entrenador (ajustar y marcar) y gerencia. RLS decide qué ve cada uno |
| `…/panel/entrenamiento` | dinámica | `enableRoutines` + `training.read` | Métricas: conclusiones automáticas, registros por día, mapa día × grupo muscular, tabla por ejercicio y por socio |
| `…/panel/clases` | dinámica | `enableClasses` + `classes.read` (gestión: `classes.manage`) | Agenda de hoy y de la semana (filtro por sede y «solo las que dicto»), catálogo con planes, nueva clase, sesión o evento, generar sesiones; gerencia: conclusiones, ocupación por clase y mapa día × hora |
| `…/panel/clases/[id]` | dinámica | `enableClasses` + `classes.read` | Planes que incluyen la clase, horario semanal (agregar varios días, retirar), próximas sesiones y últimas dos semanas, datos, archivar |
| `…/panel/clases/sesion/[id]` | dinámica | `enableClasses` + `classes.read` (registrar: `classes.attend`) | Ocupación, asistentes (hora, método, quién registró), buscador por nombre/código/QR con «Registrar» o el motivo por el que no puede, editar y cancelar (gerencia). **V3.4:** lista de reservas con «Vino», «Cancelar», «Justificar», «Cerrar lista» y «Reservar para un socio» |
| `…/panel/reportes`, `/[reporte]`, `/[reporte]/csv` | dinámica | `enableReports` + `reports.read` + permiso del reporte | Reportes con filtros, impresión y CSV. V4: totales, gráfico y CSV con todas las filas (tope 2 000, avisado); la tabla pinta 50 por página y `?completa=1` («Ver todas las filas para imprimir») las pinta todas |

Carga (V4): el enlace pulsado (pestaña, tarjeta o botón-enlace) gira mientras llega la página. **No hay
`loading.tsx` en el panel a propósito**: un límite de carga hace que Next responda 200 antes de que la página decida,
y la redirección sin sesión (307) y la capacidad apagada (404) dejaban de ser respuestas reales.

Build: **99 páginas** generadas (tres gimnasios desde V4.1); solo `/panel/*`, `/pago/*` y `/auth/confirmar` son
dinámicas. `/[tenant]`, `/[tenant]/sucursales`, `/[tenant]/clases`, `/[tenant]/contacto` y, desde V4.1,
`/[tenant]/instalaciones` son SSG con ISR de 300 s (las acciones de clases y de anuncios revalidan al guardar).

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

**Clases grupales (V3.3).** Ver [ADR 0008](docs/architecture/adr/0008-clases-sesiones-y-acceso-por-plan.md).
1. **Clase:** gerencia la crea (categoría, nivel, clase o evento, duración, **capacidad obligatoria**,
   instructor habitual, publicarla en el sitio) y decide **quién puede entrar**: cualquier membresía,
   solo los planes marcados en «Planes que la incluyen», o abierta.
2. **Horario semanal:** días (varios a la vez), hora, sede, instructor (debe trabajar en esa sede),
   cupo y duración propios opcionales, fecha de fin opcional.
3. **Generar sesiones** (hasta 62 días): la pantalla anticipa cuántas tocan (`fechasDelHorario`); la
   base crea las que faltan y devuelve las omitidas con motivo (instructor ocupado o ausente). Una
   sesión cancelada no se vuelve a generar. Retirar un horario cancela sus sesiones futuras vacías.
4. **Sesión suelta o evento:** fecha, hora, sede, instructor, cupo y título. Editar una sesión no toca
   el horario; cancelarla exige motivo y no se puede con asistentes.
5. **Tomar asistencia** (recepción en sus sedes, el instructor en sus sesiones, gerencia en todas):
   desde media hora antes hasta una semana después. Buscar por nombre, código o el QR con lector USB
   (se registra como método `qr`); sin texto lista a los que su plan admite. Cada candidato trae su
   plan y, si no puede, el motivo («su plan no incluye esta clase», «sin membresía vigente ese día»).
   La base repite todo y bloquea la sesión para respetar el cupo. **No registra entrada al gimnasio.**
6. **Socio:** «Tus clases» en su panel: qué clases incluye su plan, sus sesiones de los próximos 7
   días con cupos, qué otras clases tendría con otro paquete y sus últimas clases.
7. **Entrenador:** «Tus clases de esta semana» en su espacio, con acceso a tomar asistencia.
8. **Métricas (gerencia):** conclusiones (clase que más se llena y sugerencia de abrir horario sobre el
   80 %, clases bajo el 30 %, franja pico, cancelaciones, clases «solo planes» sin plan y clases sin
   horario), ocupación por clase y mapa día × hora.
9. **Vitrina `/clases`:** solo las clases publicadas, con horario por sede y los paquetes que las incluyen.

**Reservas (V3.4).** Ver [ADR 0009](docs/architecture/adr/0009-reservas-lista-de-espera-y-faltas.md).
1. **Socio:** en «Tus clases» cada sesión trae su botón: «Reservar», «Entrar en lista de espera», «Reserva desde
   jue 17 · 18:00», «Reservas cerradas», «Llena», o, si ya reservó, «Tienes tu lugar» / «Puesto 2 en la lista de
   espera» con «Cancelar» (avisa si cancelar ahora cuenta como tardía). Ve cuántos días abre la reserva (7-14),
   sus reservas y su historial (vino, no vino, cancelación tardía, cancelada por el gimnasio), las reglas y, si
   está bloqueado, hasta cuándo. Avisos personales en su bandeja de notificaciones.
2. **Cupo único:** asistentes + reservas que no llegaron; la reserva no toma los «lugares sin reserva» de la clase.
   Quien reservó entra a su lugar aunque la sesión esté llena; registrar su asistencia pasa la reserva a «asistió».
3. **Lista de espera:** si se libera un lugar (cancelación o cupo mayor) pasa el primero y recibe un aviso.
4. **Faltas:** reserva sin asistencia de una sesión terminada (derivada; «Cerrar lista» la escribe) y cancelación
   tardía. 3 en 30 días bloquean 7 días desde la última. Gerencia justifica y la falta deja de contar (aviso al socio).
5. **Mostrador (recepción e instructor):** en la sesión, lista de reservas con «Vino», cancelar y reservar por un
   socio; «Cerrar lista» al terminar.
6. **Gerencia:** «Reglas de reserva» (todas editables), tarjetas (reservas por venir, en espera, asistencia con
   reserva, bloqueados), conclusiones (tasa de asistencia, clase con más faltas, demanda con lista de espera,
   bloqueados), cumplimiento por clase y faltas recientes con «Justificar». Cancelar una sesión cancela sus reservas
   sin falta y avisa.
7. **Reportes:** `asistencia-a-clases` (con «con reserva») y `reservas-de-clases` (resultado de cada reserva), con CSV.
8. **Catálogo:** 46 ejercicios en Mítico y un segundo programa, «Fuerza principiantes · 2 días».

**Administración del gimnasio (V4).** Ver [ADR 0010](docs/architecture/adr/0010-administracion-del-gimnasio-y-rendimiento.md).
1. **Primer administrador:** la persona se registra en el sitio del gimnasio (nace como socio) y confirma su correo;
   la plataforma, en `/panel/plataforma` → «Designar», escribe ese correo. La RPC exige cuenta activa DE ESE gimnasio.
2. **Al entrar**, Administración llega a `/panel/administracion` (resumen) y tiene todos los módulos contratados;
   «Operación del día» es el dashboard de gimnasio de siempre.
3. **Sumar personal:** la persona se registra en el sitio; en «Personal y roles» → «Todas las cuentas» se la busca y
   se le da Recepción, Gerencia o Administración. Entrenador se da vinculando su perfil en «Entrenadores».
4. **Quitar un rol o suspender** una cuenta: solo sobre cuentas por debajo (Gerencia) o hasta el propio nivel
   (Administración), nunca la propia, y nunca dejando al gimnasio sin administrador activo. Una cuenta suspendida
   no tiene contexto de gimnasio: la base no le entrega nada. Cada cambio queda en `audit_log` y en el resumen.
5. **Aislamiento:** el administrador de Mítico no ve ni toca nada de Aurora (misma condición `tenant_id` que el
   resto; batería V4 bloque 3).

**Listas, carga y navegación (V4).**
1. **Paginación:** socios, bitácora de asistencia y personal de a 25, comprobantes de a 12, tabla de reportes de a 50.
   Buscar o filtrar vuelve a la página 1; los enlaces conservan los filtros; una página inexistente muestra la lista
   vacía con su total.
2. **Carga:** al cambiar de sección aparece el esqueleto; al paginar gira el número pulsado; al filtrar el botón dice
   «Buscando…» y se deshabilita; el ZIP dice «Preparando la lista…» y luego «Descargando N de M…».
3. **Navegación:** con más de 6 secciones, grupos Día a día · Socios · Entrenamiento · Gestión (la pestaña del grupo
   muestra la sección actual y suma insignias); en móvil, «Secciones». Esc o un toque fuera cierra el menú.

**Rutinas (corrección V4).** El nombre se guarda sin la etiqueta del día (la base la quita al guardar, también en
las rutinas asignadas) y todas las pantallas usan `tituloDeRutina`: «Día A · Empuje», nunca «Día A · Día A · Empuje».
La ayuda del formulario ya no sugiere escribir el día en el nombre.

**Anuncios del gimnasio (V4.1).** Ver [ADR 0011](docs/architecture/adr/0011-anuncios-y-contenido-por-sucursal.md).
1. **Publicar:** en `/panel/anuncios`, Administración o Gerencia crean el anuncio (título, resumen de la tarjeta,
   contenido completo, arte, tipo, enlace opcional, prioridad, desde cuándo y hasta cuándo). Recepción no publica.
2. **La vitrina:** el inicio abre con el carrusel justo bajo la portada. La tarjeta promete —arte, tipo, fecha y
   resumen— y el detalle cumple: un `<dialog>` con el panfleto entero. **Sin anuncios publicados la sección no se
   dibuja**, así que encender la capacidad antes de tener contenido no se nota.
3. **Qué se ve:** solo lo activo, ya publicado y no vencido. Lo decide la BASE (política del anónimo +
   `v_announcements_public`), no el adaptador: un borrador no sale aunque alguien arme la consulta a mano.
4. **Retirar, no borrar:** un anuncio se desactiva. Tuvo tráfico, quedó en `audit_log` y borrarlo dejaría su imagen
   huérfana en Storage.
5. **Seguridad del contenido:** el cuerpo se guarda como TEXTO y se pinta respetando los saltos de línea, nunca como
   marcado; el enlace se valida contra `^https?://` en el dominio, en la acción y en la base.

**Instalaciones por sucursal (V4.1).** `FacilityItem.branchCode` une un área con `branches.code`, el mismo puente que
ya usan los planes y la vitrina de sedes. Ninguna área con sede → una sola lista, **como antes** (Mítico y Aurora no
cambian). Con sedes → una pestaña por sucursal (`ui/Pestanas.tsx`, patrón `tablist`, fila que envuelve y nunca se
desplaza). Un área sin sede es de TODAS y se repite en cada pestaña; un código que no existe cae en el grupo general
en vez de desaparecer en silencio.

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
- **Navegación del panel (V4):** `DashboardNav` agrupada (§3.3). Regla: **ninguna fila del panel se desplaza en
  horizontal** —usar rejillas que envuelven (accesos rápidos de socios) o menús—; las tablas anchas sí se desplazan
  dentro de su propia caja.
- **Carga (V4):** `ui/Cargando.tsx` (`Spinner`, respeta `prefers-reduced-motion`) y `ui/IconoDeEnlace.tsx`
  (`IconoDeEnlace`/`GiroDeEnlace` con `useLinkStatus`: el icono del enlace pulsado gira; ya lo usan `DashboardNav`,
  `StatCard` con `href` y `LinkButton`). Botones que esperan se deshabilitan con `aria-busy`. **Nada de `loading.tsx`
  en rutas con guardas** (rompe 307/404). La carga es mitigación: primero se optimiza la consulta.
- **Listas (V4):** `Paginacion` (tramo «26–50 de 312», primera/última/vecinas, objetivos de 44 px) y
  `FiltroConCarga` (`next/form` GET + botón con estado). Iconos nuevos: `chevronDown/Left/Right`, `key`.

---

## 7. Entorno, despliegue y servicios

| Servicio | Detalle |
|---|---|
| **Vercel** | Equipo `zp-software-fast-solutions` (`team_isXk9iHT5amXqAUJlB27m9uf`). **Tres proyectos:** `gym-platform` (`prj_3Mm0F8ZG9Whii4GbFUffyodTbFFy`, alias `gym-platform-alpha.vercel.app`, quedó en V3.2) · `web` (`prj_xaWtcja3zUtZBrGT7exVgatwVlwJ`, alias **`web-rust-xi-23.vercel.app`**, V4, commit `f54ce26`) · **`gold-gym`** (`prj_Jki34sbboqbJOnzsgH7MTAB3TIXe`, alias público **`gold-gym-psi.vercel.app`**, **V4.1**, commit `9332021`, 2026-09-15). **Hoy `apps/web/.vercel` está enlazado a `gold-gym`**: un `vercel deploy --prod` desde `apps/web` actualiza GOLD, no `web`. Para volver a `web`: `npx vercel link --yes --project web`. Todos se despliegan por CLI desde `apps/web` |
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
MCP de Vercel da 403 sobre el equipo (confirmado otra vez en V4.1 con
`get_project_deployment_protection`); la CLI sí lo alcanza. Las URL con hash
piden login de Vercel: **se comparte siempre el alias**.

**Cuál es el alias público de un proyecto (V4.1).** Un proyecto nuevo nace con
DOS alias y solo uno es público: `<proyecto>-<equipo>.vercel.app` está protegido
por Vercel Authentication (302 a `vercel.com/sso-api`) y
`<proyecto>-<sufijo>.vercel.app` —`gold-gym-psi`, `web-rust-xi-23`— es el que se
comparte. Se listan con `npx vercel alias ls`. **No adivinar el alias por el
nombre:** `gold-gym.vercel.app` existe y es de OTRA cuenta (un create-react-app
ajeno con el título «Golds gym»); probarlo dio 200 y no era esta aplicación.
Verificar siempre el `<title>` servido antes de dar una URL por buena.

**Proyecto `web`: un Root Directory no sirve para los dos flujos (2026-09-14).** El proyecto se creó por CLI desde
`apps/web` y tiene **Root Directory = raíz**. Eso es lo que necesita el **flujo de trabajo de este proyecto**
(`npx vercel deploy` ejecutado DENTRO de `apps/web`, que sube esa carpeta como raíz). El despliegue automático por
push de Git, en cambio, clona el repositorio entero y falla en `npm install` («Could not read package.json»).
Se probó poner Root Directory = `apps/web`: arregla Git pero **rompe la CLI desde `apps/web`** («The specified Root
Directory "apps/web" does not exist»), así que se devolvió a la raíz. **Regla:** en el proyecto `web` se despliega con
la CLI desde `apps/web`; los fallos del despliegue automático por push son esperables y no afectan nada (Production
Branch `main`). Hacer funcionar los dos exigiría otro proyecto de Vercel enlazado a Git o desplegar la CLI desde la
raíz del repositorio: decisión del usuario, no se cambia sin pedirlo.

**Vista previa antes que producción (V4).** `npx vercel deploy --yes` (sin `--prod`) publica una URL de vista previa
que no toca producción. Es lo que se usa cuando el código depende de migraciones aún no aplicadas: la vista previa
usa la MISMA base, así que sus pantallas nuevas fallan igual hasta migrar, pero producción sigue intacta. `vercel curl`
sobre una vista previa protegida no sirve para medir códigos de estado (devolvió 200 donde se esperaban 307/404).
CLI con sesión el 2026-09-14 (`zapasoftwarefastsolutions-1320`).

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

**`npm run correo` (V4.2).** Regenera `docs/correo/confirmacion.html` desde el registro de gimnasios. Se ejecuta al dar
de alta un gimnasio o al cambiar la paleta, el logotipo o el correo de contacto de uno, y el resultado lo pega una
persona en el panel de Supabase: [`docs/runbooks/correo-de-confirmacion.md`](docs/runbooks/correo-de-confirmacion.md).

**Ramas** (cadena lineal; cada una contiene a la anterior):

```text
main (8a0208a, solo el commit inicial)
 └ feat/v1-public-site ─ feat/v2-public-site ─ feat/v2.1-operacion ─ feat/v2.2-gestion
   └ feat/v3.0-multisucursal ─ feat/v3.1-entrenadores-ejercicios ─ feat/v3.2-rutinas-programas
     └ feat/v3.3-clases-sesiones ─ feat/v3.4-reservas
       └ feat/v4-seradmingym  ← VIGENTE (V4: administración, rendimiento, navegación)
```

**Entorno de esta máquina (sesión V3.3).** No hay Node en el PATH: se usa el
`node.exe` de `%LOCALAPPDATA%\ms-playwright-go\1.57.0` con el npm global de
`%APPDATA%\npm`, y hace falta `ComSpec=C:\Windows\System32\cmd.exe` (sin él, los
scripts `postinstall` de `npm ci` fallan con «The "file" argument must be of
type string»). La CLI de Vercel estaba sin sesión.

`feat/v2-plataforma` existe solo en local y está contenida en v2.2. La copia
local de `feat/v1-public-site` va 2 commits por delante de su remoto (también
contenidos en v2.2). **Nada se ha fusionado a `main`**: decidir con el usuario
si se abre PR de la cadena antes o después de V3. **V3.3 sale de
`feat/v3.2-rutinas-programas`; V3.4 salió de `feat/v3.3-clases-sesiones`; V4 (`feat/v4-seradmingym`, nombre pedido
por el usuario) salió de `feat/v3.4-reservas`.**

**Permisos de la sesión del asistente (V4).** El clasificador de acciones bloqueó `apply_migration` (y algunas
lecturas de definiciones de funciones de Auth) sobre la base de producción. No se esquiva: las migraciones se
escriben como archivo, se pide autorización explícita y se aplican después.

**Push desde esta máquina (2026-09-12).** Git Credential Manager ya tiene la cuenta
`ZPSoftwareFastSolutions` (se autorizó en el navegador con `git credential-manager github login
--username ZPSoftwareFastSolutions --browser`, que necesita `GCM_INTERACTIVE=always` en la sesión).
Con `credential.username` fijado en `.git/config`, `git push` funciona sin preguntar.

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

**Administración (V4):** no hay cuenta de demostración con rol `admin` (el asistente no crea cuentas ni
contraseñas). Se designa desde `/mitico/panel/plataforma` (con la cuenta de plataforma) con el correo de una cuenta
existente de Mítico (p. ej. la de gerencia, que entonces verá «Administración»).

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

**V3.4 (2026-09-12):** 46 ejercicios (33 nuevos) y programa «Fuerza principiantes · 2 días». Reglas de reserva
recomendadas guardadas. Reservas de DEMOSTRACIÓN: ~110 (tres semanas de historial con asistencias, faltas y
cancelaciones tardías; reservas de la semana próxima). **MF-003 bloqueado hasta el 18/09** por tres faltas en Fit
funcional. **Fit funcional del lunes 14 a las 07:00 con cupo 4 y dos en lista de espera** para ver la promoción.

**V3.3 (2026-09-12):** 7 clases en Mítico. **Baile fitness, Bachata y Twerking** salen del material del
cliente (paquetes Dance y Mítico Fitness) y están **publicadas** en `/mitico/clases`. **Fit funcional**
(cualquier membresía), **Box** y **Karate** (por plan) y el evento **«Masterclass de Box»** (abierto, sábado
19/09 11:30 en Prado) son **demostración** y no se publican. 15 horarios (Prado mañanas y tardes;
Miraflores baile y karate del sábado), el Entrenador Demo dicta Fit funcional y Box; el resto, sin
instructor. Sesiones sembradas desde el 15/08 (4 semanas) con ~130 asistencias que respetan plan y cupo,
una sesión de Box cancelada («El instructor avisó que estaba enfermo») y dos semanas por delante. Mismo
aviso que V3.2: la ocupación que muestran las métricas es de la semilla.

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
npm test             # node --test, sin dependencias: dominio puro (sedes, racha, cobro QR,
                     # entrenadores, ejercicios, rutinas, métricas, clases, reservas, jerarquía de
                     # roles, título de rutina, paginación, navegación, patrones, anuncios e
                     # instalaciones y, desde V4.2, identidad, admisiones, tablero por puesto,
                     # agenda del socio, respuestas de acceso y correo) — 280 pruebas
npm run build        # valida también la configuración de todos los tenants
npm audit            # debe dar 0
```

```bash
# Dependency Rule: salida vacía
grep -rnE "from '(@infra|@/presentation|@/app|next|react)" apps/web/src/core/domain
grep -rn "from '@infra" apps/web/src/core/application
# ADR 0003: ningún archivo nombra a un cliente (salida vacía)
grep -rn "mitico\|aurora-fit\|golds-gym" apps/web/src --include=*.ts --include=*.tsx | grep -v "tenant.registry" | grep -vE ':\s*(\*|//|/\*)'
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

Batería V3.3 (2026-09-12, todo como se esperaba tras dos correcciones): gerencia registra a un socio
cuyo plan incluye la clase, rechaza el duplicado (23505), al plan que no la incluye
(`plan_no_incluye_clase`), al que no tiene membresía ese día, la sesión futura, la llena (cupo 1 →
`clase_llena`), editar la pasada, cancelar sin motivo, editar la cancelada, el cruce del instructor
(`entrenador_ocupado`), programar en el pasado, rango de más de 62 días y una clase en Aurora (42501);
generar crea 19 y regenerar 0 sin conflictos falsos. Recepción no crea, no edita, no genera ni fija
planes; registra en Prado y **no en Miraflores al quitarle la asignación** (`sin_permiso`, candidatos 0).
El entrenador registra en SU sesión y no en una clase sin instructor, ve 0 asistencias ajenas y 0
`customers`. El socio ve el calendario con ocupación y nombre del instructor, solo su asistencia, no se
registra ni borra lo ajeno ni edita clases. Super admin, nada. Anónimo: 3 clases públicas, 4 horarios,
sus planes y 42501 en sesiones, asistencia, columnas no concedidas, vistas y RPC. Bloques ejecutables:
[`docs/runbooks/pruebas-rls-v3.3-clases-y-sesiones.sql`](docs/runbooks/pruebas-rls-v3.3-clases-y-sesiones.sql).

Batería V3.4 (2026-09-12, todo como se esperaba): el socio reserva, no duplica, no reserva por otro, ni una clase
que su plan no incluye, ni fuera de la ventana, ni una cuarta activa; no ve reservas ajenas, no se marca «asistió»,
no cancela lo ajeno; al cancelar su lugar en la sesión llena, el primero de la espera pasa a reservado con aviso;
el socio bloqueado no reserva y solo ve sus avisos. Recepción reserva por un socio en su sede (origen personal),
ve la lista, no justifica ni cambia reglas. El entrenador ve la lista de SU sesión y no la ajena. Gerencia reserva
por encima del bloqueo, justifica (bloqueo libre), no baja el cupo bajo lo reservado, al subirlo promueve, al
cancelar la sesión cancela reservas y avisa; la asistencia tardía cierra la reserva y quitarla la vuelve falta.
Super admin 0; anónimo 42501. Bloques ejecutables:
[`docs/runbooks/pruebas-rls-v3.4-reservas.sql`](docs/runbooks/pruebas-rls-v3.4-reservas.sql).

Dos trampas que ya dieron falsos positivos:
1. **Resolver los ids del ataque ANTES de cambiar de rol** y usarlos como
   literales: bajo RLS el subselect devuelve 0 filas y el INSERT «no falla».
2. **Las funciones de contexto son `STABLE`**: dentro de UNA sentencia se
   cachean. Medir cada rol en su propia sentencia (en PL/pgSQL cada sentencia
   ya es independiente; con `UNION ALL` no).

Batería V4 (2026-09-14, **todo como se esperaba tras dos correcciones** que encontró ella misma):
[`docs/runbooks/pruebas-rls-v4-administracion-y-rendimiento.sql`](docs/runbooks/pruebas-rls-v4-administracion-y-rendimiento.sql).
- **0 · Huella** de filas visibles por rol: idéntica en los 6 roles antes y después de reescribir las 126 políticas.
  Tras todas las migraciones, las únicas diferencias son las esperadas: +1 rol, +1 permiso, +34 permisos de rol.
- **1 · Rendimiento** (2 000 socios, 50 000 entradas, gerencia): contar asistencias > 20 s → **18 ms**; KPIs timeout →
  **54 ms**; bitácora 25 filas 57 s → **270 ms**; lista 25 socios **56 ms** (antes 34 s las 500 fichas); conteos
  **39 ms**; patrones **128 ms**; búsqueda 26 ms; comprobantes 12 filas 10 ms; personal 6 ms. Las dos últimas cifras
  salieron de corregir `v_customer_counts` (1,2 s) y `v_attendance_patterns` (36 s): llamaban a
  `app.hoy_del_gimnasio` por fila (migración `v4_fecha_del_gimnasio_sin_funcion_por_fila`).
- **2 · Rol `admin`:** 34 permisos (gerencia 33 + `roles.manage`), sin `tenants.manage` ni `trainers.self`; niveles 100/40/30/20/10/0.
- **3 · Administración de Mítico:** ve 10 socios y 38 pagos, 0 socios/sedes/cuentas ajenas; otorga y quita Gerencia a
  recepción; se quita su rol o se suspende → `cuenta_propia`; con una cuenta REAL de Aurora (movida dentro de la
  transacción): no la ve, otorgar → `cuenta_no_encontrada`, suspender → `sin_permiso`, INSERT de rol → 42501, UPDATE → 0;
  suspende y reactiva a recepción (auditado). **Esto encontró que suspender fallaba siempre** («permission denied»: la RPC
  nombraba `updated_at`, sin grant) → migración `v4_cambiar_estado_de_cuenta_no_escribe_updated_at`.
- **4 · Gerencia con un administrador arriba:** otorga Recepción; Gerencia y Administración → `sin_permiso`; se autoinserta
  `admin` → 42501; quita o suspende al administrador → `sin_permiso`; UPDATE directo → 0; sigue editando la cuenta de un socio (1).
- **5 · Otros roles:** recepción no otorga y ve conteos y lista de su gimnasio; socio y entrenador ven solo su fila de
  `v_staff`; el socio no otorga; anónimo 42501 en `v_staff`, `v_customer_list`, `v_attendance_patterns` y las RPC.
- **6 · Plataforma:** designa administrador (ok), repetir → `ya_tiene_el_rol`, correo inexistente → `cuenta_no_encontrada`;
  sigue viendo 0 socios, 0 lista, 0 pagos; gerencia no designa.
- **7 · Último administrador:** quitarle el rol o suspenderlo → `ultimo_administrador`.
- **8 · Rutinas:** 0 plantillas y 0 asignadas con la etiqueta en el nombre; `Día 10` intacto; doble repetición limpia.

**Medir con volumen, sin dejar rastro (V4).** Insertar datos de carga dentro de un `do $$ … raise exception $$`,
cambiar a la sesión simulada y medir con `clock_timestamp()`: la excepción final revierte todo. Así se encontró
que el cuello de botella eran las políticas y no el frontend.

### 9.3 Tras desplegar (sobre el alias)

```bash
B=https://gym-platform-alpha.vercel.app
for r in / /mitico /mitico/planes /mitico/clases /aurora-fit /aurora-fit/clases /mitico/pago/datos /mitico/panel /mitico/panel/clases /aurora-fit/panel/socios /no-existe; do
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
| Regenerar sesiones daba «instructor ocupado» en cada fecha ya generada | El disparador BEFORE corre antes de que `ON CONFLICT DO NOTHING` descarte el duplicado, y encontraba la propia sesión como cruce | Una validación de «choque» excluye el duplicado que el índice único ya resuelve; y quien genera salta lo que existe |
| El entrenador veía la asistencia de todas las clases | La política aceptaba `classes.attend`, que también tiene recepción: el permiso dice QUÉ puede hacer, no DÓNDE | Alcance con la función que ya decide dónde (`app.puede_tomar_asistencia`), no con el permiso suelto |
| Un socio con «Mítico» vendido no entraba a Box | Su plan vigente HOY era «Básico»; «Mítico» empezaba el mes siguiente | La regla de acceso mira la membresía que cubre el DÍA de la sesión; la pantalla lo anticipa, la base decide |
| Registro por defecto de un tipo compuesto rechazado | `row(…)::tabla` con enteros contra columnas `smallint` | En PL/pgSQL, declarar la variable del tipo y asignar campo a campo |
| Un contador de «ocupados» que cuenta dos veces a quien reservó y vino | Sumar reservas y asistencias por separado | La asistencia de quien reservó cierra su reserva; ocupados = asistentes + reservas sin asistencia |
| Un bloqueo que depende de que alguien «cierre la lista» | Faltas guardadas por un proceso que puede no correr | Derivar la falta del hecho (sesión terminada sin asistencia) y escribirla solo como registro |
| Con 50 000 entradas, contar la tabla tardaba > 20 s y el dashboard superaba el timeout (V4) | Políticas `app.tenant_allows(tenant_id, 'x')`: función con columna de la fila → dos subconsultas POR FILA | `col = (select app.current_tenant_id()) and (select app.has_permission('x'))`; contexto siempre en `(select …)`; medir con volumen en transacción revertida |
| «Día A · Día A · Empuje» en rutinas (V4) | La etiqueta del día se guardaba también en el nombre (semillas y ayuda del formulario) y la pantalla los unía | Un dato, un campo: la base normaliza al guardar y el título se arma en un solo sitio del dominio |
| El panel sin sesión respondía 200 (redirección en el navegador) y la capacidad apagada, 200 con pantalla de 404 (V4) | Un `loading.tsx` sobre páginas con guardas: Next envía el estado antes de que la página llame a `redirect`/`notFound` | Sin límites de carga sobre rutas con guardas; el aviso de carga va en el enlace (`useLinkStatus`). Medir los códigos con `curl` sobre el dominio tras desplegar |
| Una vista nueva tardaba 36 s con 50 000 filas (V4) | `app.hoy_del_gimnasio(tenant_id)` por fila: la función consulta `tenants` en cada llamada | La fecha del gimnasio sale de unir `tenants` una vez; medir cada vista nueva con volumen antes de dar la migración por buena |
| «Suspender cuenta» fallaba siempre (V4) | La RPC nombraba `updated_at`, sin grant de columna para `authenticated` (lo pone un disparador) | Repetida de V3.2: una RPC invocador solo nombra columnas que el cliente puede escribir; la batería lo encuentra, leer no |
| Gerencia podía nombrar gerentes (y se habría nombrado admin) (V4) | La política de `user_roles` miraba el ALCANCE del rol, no su NIVEL | `roles.level` y `app.puede_otorgar_nivel` en la política y en la RPC |
| `npm ci` fallaba en `postinstall` en Windows | `ComSpec` no definido en el entorno de la sesión | Definir `ComSpec` antes de `npm` |
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
35. **Quién entra a una clase lo decide el plan, en la base** (ADR 0008): `membresia`/`planes`/`abierta`, contra la membresía que cubre el día de la sesión.
36. **Horario semanal + sesiones generadas por rango**; una sesión por horario y fecha, también cancelada, para que regenerar no duplique ni resucite. Eventos = sesiones sin horario.
37. **La capacidad se respeta con bloqueo de la sesión**, no con un conteo en pantalla.
38. **Asistir a una clase no es entrar al gimnasio**: tabla aparte; la entrada la marca el QR de recepción. El socio no se registra solo (eso es reserva, V3.4).
39. **Las reglas de reserva son del gimnasio y viven en la base** (ADR 0009); el dominio las replica para anticipar.
40. **Un solo cupo**: asistentes + reservas que no llegaron; quien reservó entra a su lugar; la reserva no toma los lugares sin reserva.
41. **Las faltas se derivan** de la sesión terminada sin asistencia; «Cerrar lista» solo las escribe. Justificar las saca del conteo.
42. **La lista de espera se mueve sola y avisa**; cancelar una sesión cancela sus reservas sin falta y avisa.
43. **«Admin/Superadmin» es un rol DE GIMNASIO (`admin`), no la plataforma** (ADR 0010): todo lo de gimnasio + `roles.manage`; `super_admin` sigue sin leer socios (decisión 17).
44. **La jerarquía de roles es un número en la base (`roles.level`)**: hasta el propio nivel con `roles.manage`, por debajo con `users.manage`; nunca uno mismo ni un superior; nunca sin último administrador.
45. **El primer administrador lo designa la plataforma sobre una cuenta ya registrada**; nadie crea cuentas ni contraseñas desde el panel.
46. **Políticas con el contexto en `(select …)`**, evaluado una vez por consulta; nunca una función de contexto con una columna de la fila como argumento.
47. **Paginar y contar en la base** (`range` + `count`, vistas agregadas); nunca traer cientos de filas para ocultarlas. Excepción declarada: reportes, cuyos totales necesitan el periodo entero (tope 2 000 avisado; la tabla sí pagina).
48. **Navegación sin desplazamiento horizontal**: hasta 6 entradas a la vista; más, agrupadas en menús. Ninguna opción se quita.
49. **Un dato, un campo** (rutinas): la etiqueta del día no se repite en el nombre; la base normaliza y el título se arma en un solo sitio.
50. **Migraciones de V4 en adelante: archivo versionado + autorización del usuario antes de aplicarlas a producción.**
51. **Un PASE no es una ENTRADA** (V4.2): `access_passes` cuenta cada vez que alguien cruza una puerta y `attendance_records` sigue siendo «este socio vino este día», una por día. El tope diario se cuenta sobre los pases; la racha, los KPI y los reportes siguen contando entradas. Las dos cifras son correctas y la interfaz lo dice.
52. **El tope de accesos lo cuenta la BASE, con la fila del socio bloqueada** (`for update`) antes de contar: un `if accesos < 3` en el navegador no sobrevive a dos mostradores escaneando a la vez.
53. **Un plan puede acotar en qué sedes vale** (`membership_plans.branch_scope`: `todas` · `sede_origen` · `listadas`), pero el valor por defecto sigue siendo `todas`: ningún plan existente cambió de significado.
54. **La foto del socio vive en Storage privado**, servida con URL firmada de corta duración, nunca como binario en una columna de PostgreSQL. Es identificación en el mostrador, no un álbum.
55. **Cada situación de acceso tiene su respuesta, y solo «no hay sesión» lleva al formulario** (V4.2, §19/§20): un fallo de red es 503 con la sesión intacta, una cuenta sin ficha y una sin permiso son 403, el gimnasio equivocado es una vuelta a su propio panel, y la capacidad no contratada sigue siendo 404. Es una tabla en el dominio con una prueba que lo afirma, no una cadena de `if`.
56. **El foco no es seguridad** (V4.2): qué acciones ve cada puesto lo decide `operations/tablero.ts`, y cambia el ORDEN, nunca el contenido. La ruta vuelve a exigir capacidad y permiso, y RLS decide qué filas existen.
57. **El correo de confirmación se GENERA desde el registro de gimnasios** y elige su marca en tiempo de envío con los metadatos del alta: una sola plantilla en Supabase sirve a todos los clientes sin que ninguno reciba la marca de otro.

---

## 12. Deuda y pendientes

### 🔴 Alta — antes o al empezar V3

1. **Migraciones fuera del repositorio.** `npx supabase link --project-ref
   dnclwawnjnzqqxgsuhpn` + `npx supabase db pull` (lo hace una persona con la
   contraseña de la base). Mientras tanto, el inventario vive en
   `supabase/migrations/README.md`.
0. **V4 · Designar el administrador de Mítico** desde `/mitico/panel/plataforma` (cuenta de plataforma + correo de
   una cuenta existente de Mítico) y **revisión humana con sesión** de Administración, Personal y roles, navegación
   agrupada en 375 px, paginación y filtros, rutinas y ZIP de comprobantes (§13b).
2. **Tests parciales, sin CI.** V3.0 añadió `npm test` y hoy son **174 pruebas** (V4 suma jerarquía de roles, título de rutina, paginación, navegación agrupada y patrones de asistencia; V3.4 suma ventana,
   cancelación tardía, cupo y espera, bloqueo, reglas y avisos personales)
   (sedes, racha con varias sedes, catálogo y CSV de reportes, selección de QR e
   importes 180/179/181, entrenadores y ausencias, política de medios, la lectura
   de las métricas de entrenamiento y, desde V3.3, acceso a clases por plan, fechas
   de un horario, cruces, estado de sesión, ocupación y conclusiones de clases).
   Faltan `periodo`,
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
5h. **Revisión humana con sesión de V3.3:** con gerencia, `/panel/clases` (nueva clase, sesión o evento,
   generar sesiones y el informe de conflictos), `/panel/clases/[id]` (marcar planes, agregar horario
   de varios días, retirar horario) y `/panel/clases/sesion/[id]` (editar, cancelar); con
   `recepcion@miticofitness.com`, tomar asistencia en Prado y en Miraflores (buscar por nombre, código y
   con lector de QR); con `entrenador@miticofitness.com`, «Tus clases de esta semana» y registrar en su
   sesión de Box; con un socio, «Tus clases» en su panel. Escritorio y móvil 375 px. Base, rutas, build
   y vitrina `/mitico/clases` verificados; la UI con sesión, no.
5j. **Revisión humana con sesión de V3.4:** con un socio (p. ej. MF-005), reservar, entrar en espera en el Fit
   funcional del lunes 14, cancelar a tiempo y tarde, ver avisos; con MF-003, el bloqueo; con recepción, «Reservar
   para un socio», «Vino» y «Cerrar lista»; con gerencia, reglas, justificar, cancelar una sesión con reservas y los
   dos reportes nuevos. Escritorio y móvil. Base (batería RLS), dominio, build y rutas verificados; la UI con sesión, no.
5k. **Reservas de demostración en Mítico:** antes de uso real, decidir si se borran (`delete from class_reservations`
   y `customer_messages`) y confirmar con el cliente las reglas (hoy, las recomendadas).
5i. **Oferta de clases de Mítico por confirmar:** Box, Karate, Fit funcional y la Masterclass son de
   demostración (no publicadas); horarios, instructores y cupos de Baile fitness, Bachata y Twerking
   son propuesta. Gerencia los ajusta en el panel y decide qué publica. La cifra «18 clases semanales»
   del hero y de «Instalaciones» sigue sin confirmar.
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
10k. **V4 — pendiente acotado:** el catálogo de ejercicios no pagina (tope 500 y URLs firmadas en lote: bien para
    cientos, no miles); los reportes siguen pidiendo hasta 2 000 filas para agregar en el servidor web (mudar sus
    agregados a vistas si un gimnasio los supera; hoy la pantalla avisa al llegar al tope); `/panel/sucursales`,
    entrenadores y clases no paginan (volúmenes chicos por naturaleza); las políticas de `storage.objects` siguen con
    llamadas por fila (pocas filas por subida); `v_customer_detail` y `v_customer_list` llaman a
    `app.hoy_del_gimnasio` por fila (inlinable, barato; revisar con decenas de miles de socios); los desplegables de
    socios cortan en 1 000 (más allá conviene un buscador); no hay cuenta demo con rol `admin`; revisión humana con
    sesión de Administración, Personal y roles, navegación agrupada en 375 px, paginación y filtros.
10j. **V3.4 — pendiente acotado:** avisos solo en el panel (sin WhatsApp, correo ni recordatorio el día anterior: V4);
    sin reservas recurrentes («todos los lunes»); los feriados no cierran reservas; cambiar `walkin_spots` de una clase
    no promueve la espera de sus sesiones futuras (sí subir el cupo de una sesión); `v_reservation_overview` recorre
    reservas para contar bloqueados; la ficha de socio de gerencia no muestra sus reservas ni faltas.
10i. **V3.3 — pendiente acotado:** desde V3.4 el socio recibe aviso cuando se cancela una sesión que reservó; sin reporte CSV de asistencia a clases; el horario
    no conoce feriados ni los días cerrados del tenant (se cancela a mano); editar un horario no propaga a
    sesiones ya generadas (decisión, ADR 0008); la ficha de socio de gerencia no muestra sus clases;
    `v_class_stats`/`v_class_slot_stats` cuentan con subconsultas por sesión (bien para cientos al mes); la
    vitrina no enseña instructor ni ocupación a propósito.
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

### 🟠 GOLD'S GYM PREMIUM — datos que tiene que entregar el cliente (V4.1)

Ninguno se ha inventado: lo que falta está NULL, vacío o sin declarar, y todo se completa **desde el panel, sin
desplegar**. Está detallado en la cabecera de `tenants/golds-gym-premium.tenant.ts` y de la migración de alta.

G1. **Direcciones** de Garita, Cruce de Villas y Miraflores (solo se conoce la de la sede principal).
G2. **En qué sucursal se dicta cada clase.** El folleto trae un calendario único, así que los **60 horarios están en
    LAVITA**. Reasignarlos es editar cada horario en `/panel/clases/[id]`.
G3. **Cupo de cada clase.** La base lo exige (1-200) y el folleto no lo trae: las 15 clases se crearon con **30, que
    es un marcador**. Hoy no afecta a nada (GOLD no tiene reservas contratadas).
G4. **Qué incluyen los planes de 3, 6 y 12 meses:** el folleto da el precio pero no el alcance, así que no se les
    asignó ninguna clase. Hoy un socio anual no figura con acceso a ninguna clase.
G5. **Qué paquete incluye Strong y Body Pump:** están en el calendario pero NO en la lista del Plan Aeróbicos.
G6. **Horario de Step y X-55:** están en el Plan Aeróbicos pero no en el calendario (creadas sin horario).
G7. **Mensualidad de Karate.** Existe como clase con su horario; no se creó ningún paquete con precio inventado.
G8. **«Plan Mañanero: de 07:00 AM hasta las 12:00»** — el folleto dice «12:00 AM». Transcrito tal cual.
G9. **«Tarde — Especiales» del sábado:** sin hora ni nombre de clase. No se creó nada.
G10. **«Folklore P.» del viernes** se creó tal como lo escribe el folleto; si es «Folklore Principiantes», se renombra.
G11. **Correo, ciudad, cuál de los dos teléfonos es WhatsApp, redes sociales, mapa y dominio propio.**
G12. **Razón social** (`legalName` repite el nombre comercial).
G13. **Instalaciones propias de cada sede:** hoy las seis áreas de la plantilla se declaran iguales en las cuatro, y
     sin superficie ni fichas de datos. Quitar un área de una sede es borrar su entrada del archivo.
G14. **Fotografías** (galería apagada) y **arte de los anuncios**.
G15. **Identidad visual:** la paleta negro y dorado es una propuesta derivada del nombre; confirmar contra su manual.

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

## 13. Después de V4 — punto de partida (V4.x)

La primera entrega de V4 fue **administración del gimnasio y rendimiento** (§13b). Lo que sigue del roadmap.

**Alcance (roadmap):** suscripciones, licencias, facturación e integraciones. Lo
que V3 dejó pedido: avisos por WhatsApp o correo (hoy solo en el panel:
`customer_messages` ya es la cola de lo que habría que enviar), recordatorio de
clase el día anterior, cobro recurrente de membresías y licencia por gimnasio
(las capacidades `features` hoy viven en el archivo del tenant: §12.11).

**Lo que V3.4 deja listo:** `customer_messages` como registro de avisos
personales con `kind`, `session_id` y `read_at`; reglas por gimnasio en la base
(`tenant_reservation_settings`), el patrón para mudar otras configuraciones
operativas; reportes con capacidad contratada por reporte.

**Lo que V4 deja listo:** jerarquía de roles en la base (un rol nuevo = una fila en `roles` con su `level` y sus
permisos), `v_staff` y auditoría de roles, paginación reutilizable (`paginacion.ts` + `Paginacion`), navegación
agrupada que acepta módulos nuevos con solo declarar su `grupo`, estados de carga comunes y la carpeta de migraciones
con archivos versionados.

**Patrón establecido (V3.0 a V4 lo aplicaron de punta a punta):**

1. **Rama** `feat/v4-…` desde `feat/v4-seradmingym` (una vez aplicadas sus migraciones).
2. **Base:** migración como ARCHIVO en `supabase/migrations/` y aplicada con autorización; tablas con `tenant_id`,
   RLS + políticas con el contexto en `(select …)` (§4.1.3),
   FK compuestas (`(tenant_id, x)`), vistas `security_invoker`, grants por
   columna, autoría por default de sesión, auditoría por disparador, RPC
   invocador para operaciones de varias tablas; DEFINER solo en `app` y
   repitiendo permiso y gimnasio. **Cada política nombra su condición** (lección
   de V3.2 y V3.3: un permiso dice QUÉ, no DÓNDE ni DE QUIÉN). Una validación de
   «choque» en un disparador BEFORE no debe contar el duplicado que resuelve el
   índice único. Probar con §9.2 por rol, sede sin asignación, gimnasio ajeno y anónimo.
3. **Dominio** puro en `core/domain/operations/<modulo>.ts` + pruebas en
   `apps/web/tests` → **puerto** → **adaptador** Supabase → composition root.
4. **Rutas** `/[tenant]/panel/<modulo>` con `loadTenantPage([... flag])` +
   `exigirPermiso`; acciones con `contextoDeAccion`; entrada en
   `panel/_navegacion.ts` por flag **y** permiso, con su `grupo`; 404 con la flag apagada.
5. **UI** con `StatCard`, `DataTable`, `Modal`, `AccionConEstado`, `FichaDeSocio`,
   `FilaDeSesion`/`AgendaSemanal`; toda lista que crezca, con `Paginacion` + `range`/`count` y `FiltroConCarga`.
6. Encender la flag **solo** en Mítico; Aurora sigue en 404.
7. Verificar (§9), actualizar `supabase/migrations/README.md`, este archivo y, si
   la decisión es de fondo, un ADR.

Preguntas para el cliente antes de modelar V4: ¿qué canal de avisos (WhatsApp
Business API, correo, ambos) y quién paga el envío?, ¿el socio se suscribe con
cobro automático o sigue pagando por QR/recepción?, ¿qué factura el gimnasio
(¿Bolivia: facturación electrónica del SIN?)?, ¿cómo se vende el producto a otros
gimnasios (plan mensual por sede, por socio activo)?

**Cómo se resolvieron las preguntas de V3.4** (ADR 0009, reglas recomendadas que
confirmó el usuario): la reserva se abre 7 días antes y se cierra al empezar;
3 activas; cancelar hasta 2 h antes no cuenta; 3 faltas en 30 días bloquean 7 días;
lista de espera automática; lugares opcionales sin reserva; avisos en el panel.

**Cómo se resolvieron las preguntas de V3.3** (ADR 0008): la clase se repite por
horario semanal y las sesiones se generan (también hay sueltas); la capacidad es
de la clase y el horario o la sesión la ajustan; cancela gerencia, con motivo y
sin asistentes; la asistencia a clase NO es entrada al gimnasio; el socio ve sus
clases en su panel y la vitrina muestra las publicadas.

## 13b. V4 · administración del gimnasio y rendimiento (rama `feat/v4-seradmingym`)

Ver [ADR 0010](docs/architecture/adr/0010-administracion-del-gimnasio-y-rendimiento.md). Resumen de lo que cambia:

- **Rol `admin` («Administración»)**: todos los permisos de gimnasio + `roles.manage`; nunca plataforma. Espacio
  `panel/administracion` (resumen como el de gerencia: negocio, personal, módulos, cambios administrativos). La
  plataforma sigue siendo `super_admin` y ahora designa al primer administrador de cada gimnasio desde su panel.
- **Jerarquía `roles.level`** (admin 40 · gerencia 30 · recepción 20 · entrenador 10 · socio 0): con `roles.manage`
  hasta el propio nivel, con `users.manage` solo por debajo; nadie se toca a sí mismo ni a un superior; nunca sin
  último administrador. **Cambio de comportamiento:** Gerencia ya no nombra gerentes. Pantalla `panel/personal`
  («Personal y roles», `users.read`), RPC `otorgar_rol`/`retirar_rol`/`cambiar_estado_de_cuenta`.
- **Rendimiento**: políticas con `(select app.…())` (evaluadas una vez por consulta; **regla nueva para toda
  política**), `v_customer_list`/`v_customer_counts`, `v_attendance_patterns`, paginación en la base
  (`core/domain/shared/paginacion.ts`, `Paginacion`, `range` + `count`) en socios, comprobantes, asistencia y personal;
  reportes pintan 50 filas por página (totales y CSV con todas); desplegables con `opciones()`.
- **Rutinas**: título único `tituloDeRutina`; la base guarda el nombre sin la etiqueta del día.
- **Navegación** agrupada (`lib/navegacion.ts`, `panel/_navegacion.ts`, `DashboardNav`): sin desplazamiento horizontal.
- **Carga**: `ui/IconoDeEnlace.tsx` (el enlace pulsado gira), `ui/Cargando.tsx`, `Paginacion`, `FiltroConCarga`, ZIP
  de comprobantes bajo demanda. Se probó `panel/loading.tsx` y se retiró: rompía los 307/404 reales.

**Diagnóstico que dio origen a V4** (medido, no supuesto):
- Autorización: coherente entre pantalla y base; el hueco era de NIVEL (política de `user_roles`), no de rol mostrado.
- Rutinas: la etiqueta del día estaba también en el nombre (semillas de V3.2/V3.4 y ayuda del formulario).
- Lentitud: políticas por fila (> 20 s para contar 50 000 entradas), fichas completas para contar, listas sin paginar
  cortadas en silencio (500/800/2 000), estadísticas de asistencia de las últimas 500 filas.
- Scroll horizontal: 13 pestañas de gerencia en una fila con `overflow-x-auto` y accesos rápidos de socios igual.

**Estado (2026-09-14): V4 cerrada y en producción.**
- Código: typecheck limpio · **174 pruebas** (21 nuevas) · build de 66 páginas · `npm audit` 0 · greps limpios.
- Base: **7 migraciones aplicadas** con autorización del usuario (5 escritas antes + 2 que encontró la batería);
  batería V4 completa como se esperaba (§9.2); advisors de seguridad: solo el aviso aceptado de contraseñas filtradas.
- Producción: proyecto Vercel `web`, dominio **https://web-rust-xi-23.vercel.app**, despliegue `web-gu4lr6b3e…` desde
  `f54ce26` por CLI en `apps/web`. Verificado sobre el dominio: públicas 200; `/mitico/panel`, `/panel/socios`,
  `/panel/administracion` y `/panel/personal` **307** sin sesión; `/mitico/panel/reportes/pagos/csv` **401**;
  `/aurora-fit/clases` y `/aurora-fit/panel/socios` **404**; `/no-existe` 404; `camera=(self)`; 0 apariciones de
  `service_role` en 11 chunks.
- Tropiezos del despliegue, documentados en §7: el Root Directory del proyecto `web` (un solo valor no sirve a la CLI
  desde `apps/web` y al push de Git) y el `loading.tsx` que convertía los 307/404 en 200 (retirado en `f54ce26`).

**Pendiente:**
1. Designar un administrador de Mítico desde `/mitico/panel/plataforma` (cuenta de plataforma + correo de una cuenta
   existente de Mítico, p. ej. la de gerencia).
2. Revisión humana con sesión: navegación en escritorio y 375 px, Administración y Personal y roles con administración
   y gerencia (otorgar, quitar, suspender, reactivar), paginación y filtros de socios, comprobantes y asistencia,
   rutinas sin «Día A · Día A», ZIP de comprobantes, indicador de carga en pestañas y tarjetas.
3. Deuda acotada de V4 en §12 (10k).

## 13c. V4.1 · anuncios, instalaciones por sucursal y alta de GOLD (rama `feat/goldgym-v1`)

Ver [ADR 0011](docs/architecture/adr/0011-anuncios-y-contenido-por-sucursal.md). Entra el **tercer cliente** de la
plataforma y con él dos capacidades nuevas **del producto**, no suyas.

**La prueba que había que pasar:** incorporar un gimnasio con cuatro sucursales que comunica por panfletos **sin una
sola línea de código propia**. Se pasó: GOLD es un archivo de configuración, dos migraciones de datos y dos
capacidades que cualquier otro gimnasio enciende con una flag. No hay ni un `if (tenant === …)` en `src`.

- **Anuncios** (`enableAnnouncements` + `content.manage`): tabla `announcements`, bucket `anuncios`,
  `v_announcements_public`, dominio `announcements.ts`, puerto y adaptador (con y sin sesión), sección de carrusel
  + detalle en un `<dialog>` y `/panel/anuncios`. Se revisó `notices` antes de decidir y NO sirve: es la bandeja
  privada del socio, sin imagen ni orden, y abrirla al anónimo sería una fuga.
- **Instalaciones por sucursal:** `FacilityItem.branchCode` + `ui/Pestanas.tsx` genérico. Sin reparto declarado el
  comportamiento es el de siempre, comprobado sobre el HTML generado de Mítico (0 pestañas, sus 1.310 m² intactos).
- **Datos que no se inventaron:** correo, ciudad, direcciones de tres sedes, cupos de clase, qué incluyen los planes
  largos y la mensualidad de Karate. Un correo vacío ahora es válido y la vitrina omite la línea; un área sin
  superficie no pinta etiqueta ni retícula vacía; Karate es una clase sin plan declarado, así que la vitrina dice
  «consulta en recepción qué paquete la incluye».

**Estado (2026-09-15): cerrada, aplicada, publicada en GitHub y DESPLEGADA** en el proyecto Vercel `gold-gym`
(alias **https://gold-gym-psi.vercel.app**, commit `9332021`). Rama `feat/goldgym-v1` en GitHub.

Verificado sobre el dominio: `/golds-gym-premium` y sus 8 rutas públicas **200** (con el `<title>` de GOLD);
`/golds-gym-premium/panel` y `/panel/anuncios` **307** sin sesión; `/golds-gym-premium/galeria` **404**
(`showGallery` apagada); `/aurora-fit/clases` y `/no-existe` **404**; `/mitico` y `/aurora-fit` **200** (el mismo
despliegue sirve los tres gimnasios); `camera=(self)`, `X-Frame-Options: DENY`, `nosniff`; **0 apariciones de
`service_role` en 11 chunks**.
- Código: typecheck limpio · **199 pruebas** (25 nuevas) · build de **99 páginas** · `npm audit` 0 · greps limpios.
- Base: **2 migraciones aplicadas** con autorización del usuario; batería V4.1 completa como se esperaba
  (§9.2); advisors: solo el aviso aceptado de contraseñas filtradas; ninguna política nueva evalúa contexto por fila.
- GOLD en la base: 4 sedes (LAVITA principal), 7 planes, 15 clases publicadas, 60 horarios, 47 filas de `class_plans`.
  Mítico intacto (sus 8 clases y sus datos, verificado).

**Pendiente:**
1. ~~Desplegar V4.1 y verificar rutas~~ **hecho** (proyecto `gold-gym`, alias `gold-gym-psi.vercel.app`).
2. **Revisión humana con sesión:** `/panel/anuncios` con gerencia (publicar con arte, programar, retirar), el carrusel
   y su detalle en escritorio y en 375 px, y las pestañas de instalaciones de las cuatro sedes.
3. **Datos que tiene que entregar el cliente** (§12, bloque GOLD): direcciones de Garita, Cruce de Villas y
   Miraflores; en qué sucursal se dicta cada clase (hoy todas en LAVITA); cupo de cada clase (hoy 30, marcador);
   qué incluyen los planes de 3, 6 y 12 meses; mensualidad de Karate; qué paquete incluye Strong y Body Pump;
   horario de Step y X-55; el cierre real del Plan Mañanero; correo, ciudad, redes y mapa; fotografías.

## 13d. V4.2 · GOLD V1 — identidad, accesos y autorización de clases (rama `feat/goldgym-v1`)

Encargo «GOLD'S GYM PREMIUM — V1». Se entregó por etapas; **las etapas 1 a 4 están cerradas y su base aplicada**.

**Dos conflictos de fondo que NO se sobrescribieron en silencio**, y cómo se resolvieron con el usuario:

1. **«3 accesos por día» contra el índice único de una entrada por día** (decisión 20). Quitarlo habría cambiado el
   significado de «visita» para los tres gimnasios y roto racha, KPI y reportes. Se separaron los dos hechos:
   `attendance_records` sigue siendo «vino este día» (intacta) y `access_passes` es «pasó por esta puerta». El tope
   se cuenta sobre los pases. **Decisión del cliente: 3 para todos los socios en cualquier sede**, configurable en
   `tenants.daily_access_limit`.
2. **Acceso multisede por membresía contra «la membresía vale en todas las sedes»** (decisiones 19 y 24). Sigue
   siendo el valor por defecto —ningún plan existente cambió, y la migración lo comprueba—, pero un plan puede
   declarar `branch_scope`: `todas` · `sede_origen` · `listadas` (+ `membership_plan_branches`).

**Lo entregado por etapas:**

| Etapa | Qué | Commit |
|---|---|---|
| 1 | Sucursal **El Alto** (renombrado acotado a GOLD, con comprobación de que la Miraflores de Mítico queda intacta) y el login tras confirmar el correo | `cca427d` |
| §19/§20 | Una operación fallida deja de cerrar la sesión; existe el **403** | `255ef35` |
| 2 | **Foto de perfil** del socio y ventana de **identidad** al pasar el QR | `43be5c4` |
| 3 | **Pases de acceso**, tope diario y alcance de sede por plan | `2efff8e` |
| — | Corrección que encontró la batería + runbook V4.2 | `7f408e0` |
| 4 | **Autorización nominal de clases e invitados** (`access_mode = 'autorizados'`) | `d36f2fa` |
| 4 · UI | Pantalla de admisiones en la sesión: autorizar socios e invitados | `519f85b` |
| 5 · §12 | **Historial de ingresos** filtrable (`/panel/accesos`) sobre `v_access_passes` | `fe84cf3` |
| 5 | **Tableros por puesto** (§9, §10, §11, §13, §21) y **clases del socio** (§15, §16) | `9622fc5` |
| 6 · §17 | **Correo de confirmación** con la marca de cada gimnasio, y §19/§20 con prueba | `5229b02` |

**Los bugs, con su causa medida en el código:**
- **Login tras confirmar (§18):** la ruta SÍ creaba la sesión; redirigía siempre a `/<slug>/acceso`, el formulario de
  login, y el usuario volvía a escribir sus credenciales creyendo que no había funcionado. Ahora entra a `/<slug>/panel`.
- **Cierres de sesión inesperados (§19):** `getAuthenticatedUser()` devolvía `null` ante cualquier error, incluido uno
  de red, y `perfil()` descartaba el `error` de PostgREST. Ahora `estadoDeSesion()` distingue `anonimo` de
  `indisponible` usando las cookies como señal, y `perfilDetallado()` nombra el fallo.
- **Redirecciones (§20):** cinco situaciones, cinco respuestas. Solo «sin sesión» va al acceso; «autenticado sin
  permiso» es 403 real (`forbidden()` de Next 16, con `experimental.authInterrupts`); «no se pudo comprobar» es
  `panel/error.tsx` con reintentar y las cookies intactas; capacidad no contratada sigue siendo 404.

**Lo que resolvió la etapa 5 (2026-09-16).** Ninguna pantalla nueva salvo el historial de ingresos: las que había
enseñaban todo a la vez y en el mismo orden para todos.
- **`operations/tablero.ts`** decide, desde capacidades y permisos, qué acciones frecuentes se ofrecen y en qué orden
  van los bloques (`operacion` · `dinero` · `socios` · `sucursales`). Recepción abre con el mostrador; gerencia y
  administración, con el dinero. **Lo que cambia es el ORDEN, no el contenido**: un dashboard por rol habría duplicado
  la pantalla y las copias se irían separando con cada arreglo. El enfoque sale de lo que la persona PUEDE
  (`reports.read`), no del nombre del rol: recepción y gerencia comparten espacio de trabajo.
- **`presentation/patterns/AccionesRapidas.tsx`**: la fila de botones grandes, con «Escanear QR» como ventana del
  mostrador y no como enlace. Que una acción no aparezca es FOCO, no seguridad.
- **`operations/agenda-del-socio.ts`** resuelve en un sitio «¿en qué situación estoy con esta clase?» —inscrito, en
  espera, disponible, completo, no incluida en tu plan, cancelada, próximamente— y `MiAgendaDeClases` la lee como pidió
  el cliente: día → clase → hora → sede → disponibilidad → botón. Quien reservó sale como inscrito aunque la clase esté
  llena (decisión 40). Se añade el horario del gimnasio con hoy destacado.
- **`/panel/accesos`**: página aparte de «Asistencia» porque son dos preguntas distintas (una fila por socio y día
  frente a una por paso). `range` + `count: exact`; el texto de búsqueda se limpia de comas y paréntesis porque
  PostgREST separa por coma las condiciones de un `or`.

**Lo que resolvió la etapa 6 (2026-09-16).** El correo de confirmación lo envía **Supabase**, con UNA plantilla para
los tres gimnasios: poner ahí el dorado de GOLD habría dejado a Mítico con el correo de otra marca. La plantilla se
**genera** desde `TENANT_REGISTRY` (`npm run correo` → `docs/correo/confirmacion.html`) y elige la marca en tiempo de
envío con `.Data.tenant_slug`, que el alta ya manda. El slug se compara envuelto en `printf "%v"`: con `eq` a secas, un
metadato ausente es un error de ejecución de Go que rompe el único correo que activa la cuenta. Instalarla es un paso
humano, en [`docs/runbooks/correo-de-confirmacion.md`](docs/runbooks/correo-de-confirmacion.md).

§19 y §20 pasan además de código a **tabla probada**: `operations/acceso-al-panel.ts` mapea situación → respuesta y una
prueba afirma que **exactamente una** —no tener sesión— lleva al formulario de acceso.

**Estado (2026-09-16): las seis etapas cerradas, 5 migraciones aplicadas y verificadas, y DESPLEGADA** en `gold-gym`
(alias **https://gold-gym-psi.vercel.app**, commit `7600d75`, `dpl_4w5XedNhQ68ED1Vs5eckJ67KEH8o`).
- Verificado sobre el dominio (con el `<title>` de cada gimnasio comprobado antes): 16 públicas **200** (GOLD, Mítico y
  Aurora); **404** en `/no-existe`, capacidad no contratada (`/golds-gym-premium/galeria`, `/golds-gym-premium/panel/accesos`
  y `/panel/socios` —GOLD no tiene asistencia ni gestión de socios—, `/aurora-fit/clases`, `/aurora-fit/panel/accesos`);
  **307 → `/<slug>/acceso`** en 11 rutas del panel sin sesión; CSV **401**. **§20 medido contra el Auth real:** una cookie
  basura y un JWT caducado/falsificado van a **307 → acceso**, nunca a la pantalla de error, y el CSV da 401.
  `/auth/confirmar` con enlace vencido o token inválido → `/<slug>/acceso?confirmado=0`; con `gimnasio=https://evil…` o
  `//evil…` → `/?confirmado=0` (sin redirector abierto). Cabeceras: CSP, `camera=(self)`, `X-Frame-Options: DENY`,
  `nosniff`, HSTS, COOP. **0 apariciones de `service_role` en 12 chunks (602 KB).**
- **Lo que no se puede medir sin iniciar sesión** (y el asistente no inicia sesión): el **403** de «autenticado sin
  permiso» y el **503** de «no se pudo comprobar». Los cubren la prueba de la tabla de respuestas y la revisión humana.
- Worktree: `apps/web/.vercel` se enlazó con `npx vercel link --yes --project gold-gym --scope zp-software-fast-solutions`
  (el enlace no se versiona). Ese comando crea `.env.local` con un `VERCEL_OIDC_TOKEN`: está ignorado por git, pero se
  **borró antes de desplegar** para que no viajara en la subida.
- Código: typecheck limpio · **280 pruebas** · build de **102 páginas** · `npm audit` 0 · greps limpios.
- Base: batería V4.2 completa ([`docs/runbooks/pruebas-rls-v4.2-identidad-y-accesos.sql`](docs/runbooks/pruebas-rls-v4.2-identidad-y-accesos.sql)),
  advisors solo con el aviso aceptado. **Una corrección la encontró la batería**: la guarda de la foto bloqueaba
  también a quien no tiene sesión (migraciones y mantenimiento), porque `has_permission` es falso sin `auth.uid()`.
- **Trampa nueva del runbook:** comprobar QUÉ ROLES tiene la cuenta con la que se prueba. La primera pasada dio tres
  «fugas» que no lo eran: se estaba probando «el socio» con Juan Pérez, que es el administrador de Mítico desde V4.

**Login entre gimnasios y operación de GOLD (2026-09-16, commit `4e3e6c8`, `dpl_GqT5TcdbfwVGTFnLS2A3mKdbVTRa`).**
- **Hueco cerrado:** Supabase Auth es uno para todos los gimnasios, así que la contraseña correcta de una cuenta de Mítico
  en el formulario de GOLD abría sesión. Ahora `iniciarSesion` pregunta a la base (`v_my_profile`, con el mismo cliente
  que autenticó; **nunca `user_metadata`**, que el usuario puede reescribir) a qué gimnasio pertenece la cuenta. Si no es
  el de la ruta: `signOut({ scope: 'local' })` —el global cerraría sus sesiones legítimas en su propio gimnasio— y el
  MISMO mensaje que una contraseña incorrecta. La plataforma entra por cualquiera. Decisión en
  `decidirLoginPorGimnasio` (`operations/acceso-al-panel.ts`), con pruebas.
- **GOLD enciende su operación:** `enableAttendance`, `enableQrAttendance`, `enableMemberManagement`, `enablePayments`,
  `enableNotifications`, `enableReports`, `enableReservations`. Hasta aquí seguían «pendientes de contratación» y todo lo
  de V1 respondía 404 en GOLD. Entrenadores, ejercicios y rutinas siguen apagados. Verificado sobre el dominio: 10 rutas
  del panel de GOLD pasan de 404 a 307, su CSV da 401, y lo no contratado sigue en 404.
- **Cuentas de prueba de GOLD — SIN CREAR TODAVÍA.** El clasificador de permisos bloqueó al asistente la escritura en
  `auth.users` de producción, y no se forzó. Hay un script para que lo ejecute una persona en el SQL Editor de Supabase:
  cinco cuentas con el correo confirmado en `@pruebas.gymplatform.bo` —`administracion.gold`, `gerencia.gold`,
  `recepcion.gold` (asignada a LAVITA y ELALTO), `socio.gold` (GO-001, Plan Aeróbicos, pago de 150 Bs, sede LAVITA) y
  `socio2.gold` (GO-002, sin membresía)—. Las fichas se crean con `registrar_socio` simulando la sesión de
  Administración. **Las contraseñas NO están en el repositorio** (a diferencia de §8, que es de V2): se entregaron al
  usuario fuera de git.

**Portada compuesta por gimnasio (2026-09-16, `50e0509`, `dpl_G49gUobkJZPMDe2ZUHtbghL4pXyx`).** El usuario señaló, con
razón, que lo visual del encargo V4.1 (§6, §17 y el criterio «GOLD debe sentirse como su propio gimnasio») no se había
cumplido: el orden del inicio estaba escrito en `[tenant]/page.tsx` igual para todos, y GOLD usaba la misma tipografía,
retícula y brillo que Mítico. Ahora:
- **Capacidad `home`** (`core/domain/tenant/home-layout.ts`): `estilo` `clasica` | `anuncios`, `secciones` en orden y
  `planes` `tarjetas` | `tarifario`. Sin declarar = `COMPOSICION_CLASICA`, idéntica al orden anterior (la portada de
  Mítico mide los mismos 10 081 px). La sección solo se dibuja si su capacidad está contratada; el validador rompe el
  build ante secciones repetidas, desconocidas o «anuncios» duplicado con el estilo `anuncios`.
- **Piezas del producto:** `AnnouncementsHeroSection` (identidad + anuncios como pieza principal; sin anuncios, las
  cifras del gimnasio), `HoursSummarySection` + `resumirHorario` (solo une días consecutivos), carrusel `destacado`,
  tarifario en `PlansSection`.
- **GOLD:** portada `anuncios`, tarifario con mensuales y largo plazo, horarios, instalaciones por sucursal, «Así se ve
  por dentro» (composición generativa de marca hasta que haya fotos, `showGallery` encendida), sedes y cierre. Titulares
  en Fraunces sin mayúsculas, superficies planas, sin retícula ni brillo.
- **Defecto de plataforma corregido:** el brillo de botones, WhatsApp, puntos de sede y racha era fijo; ahora obedece a
  `shape.glowIntensity` (`--t-glow-strength`).
- **Capturas sin dependencias** con Edge por CDP: `kill` del proceso padre dejaba decenas de Edge vivos y sus perfiles
  llenaron el disco. Cerrar siempre el árbol (`taskkill /T /F`).

**Script de cuentas de prueba: la v1 no podía funcionar.** Escribía `auth.users.confirmed_at`, que en esta versión de
Supabase es columna CALCULADA (`LEAST(email_confirmed_at, phone_confirmed_at)`); el INSERT fallaba, la transacción se
revertía y no quedaba ninguna cuenta (también `auth.identities.email` es calculada). La v2 lo corrige y añade cinco
anuncios con datos textuales del folleto. **Ejecutada el 2026-09-16 con autorización expresa del usuario.** Verificado en
la base, sin iniciar sesión: las 5 contraseñas coinciden con su hash bcrypt; cada cuenta resuelve a `golds-gym-premium`
con su espacio (administracion · gimnasio · gimnasio · socio · socio); el personal ve los 2 socios de GOLD y 0 de Mítico;
recepción opera en 2 de 4 sedes; cada socio ve solo su ficha (GO-001 con Plan Aeróbicos y QR; GO-002 sin membresía).
Los 5 anuncios salen en la portada (prioridad: mayor `sort_order` primero) y el detalle abre con el texto completo.
**La prioridad de los anuncios es DESCENDENTE**: el primer intento los sembró al revés.

**Correo de alta y rediseño de GOLD (2026-09-16).**
- **«El correo de confirmación no llega».** Medido en `auth_logs`: los intentos fallidos eran `user_repeated_signup` de un
  correo con cuenta CONFIRMADA en Mítico desde el 09/09. Con confirmación activa Supabase responde éxito y NO envía nada
  (60 ms frente a 1,6 s de un alta real, cuyo correo sí llegó). Las cuentas son una por correo para toda la plataforma y
  `app_users.auth_user_id` es único: una persona no puede ser socia de dos gimnasios con el mismo correo (decisión de
  arquitectura, no cambiada). Arreglo `91311c8`: `identities: []` → mensaje honesto; contraseña correcta de otro gimnasio →
  se deniega diciendo por qué (`otro-gimnasio`); «Reenviar el correo» tras un alta, con la vuelta del enlace reenviado
  (sin PKCE, resultado en el fragmento) leída en el navegador y borrada de la barra.
- **Configuración de Supabase pendiente (paso humano, el asistente no tiene acceso a Auth):** `gold-gym-psi.vercel.app`
  NO está en Redirect URLs. Medido con un token inválido en `/auth/v1/verify`: el `redirect_to` de GOLD se descarta y se
  usa la Site URL (`gym-platform-alpha.vercel.app/`). La cuenta se confirma igual, pero la persona aterriza en otro sitio.
  Añadir `https://gold-gym-psi.vercel.app/**` en Authentication → URL Configuration.
- **Rediseño «Titanium Gold Championship»** (maqueta y DESIGN.md del cliente), todo como capacidad de marca:
  `palette.highlight` (color de energía), `typography.script` y `labelCase`, `shape.accentFinish: 'metallic'`
  (degradado recortado a la letra en `.t-accent` y `fill-action` en el botón principal), `logo.wordmarkAccent`,
  `hero.motto/branchesLabel/announcementsLabel`. Sin declarar, cada token reproduce el CSS anterior: Mítico mide los mismos
  10 081 px. Fuentes Oswald, Montserrat y Permanent Marker con `preload: false` (solo baja quien las usa).
- **Anuncios:** `tagline`, `tags`, `tags_label`, `footnote` (migración y panel) y título con dato acentuado tras el último
  « · » (`tituloConAcento`). Tarjeta destacada con insignia carmesí, etiquetas y fila al pie.
- **Cabecera:** la navegación completa aparece desde `xl` (1280 px); entre 1024 y 1279 se pisaba en Mítico y en GOLD.
- **Desplegado** (`91311c8`, `99ba225`, `9fdb76e` · `dpl_7HDn24t99FPWKRqycYRDGwmqC3f4`). **Trampa de Vercel:** el primer
  despliegue sirvió el HTML nuevo con la hoja de estilos ANTERIOR (caché del build: sin `.t-script`, `.t-accent` vieja).
  Se detectó comparando la captura de producción con la local y buscando las reglas en el CSS servido. Tras cambiar
  `globals.css`, desplegar con `npx vercel deploy --prod --yes --force` y comprobar una regla nueva en el `.css` servido.
- **Nombres de clase propios:** nunca con prefijo de utilidad de Tailwind (`fill-action` chocaba con `fill-*` de SVG).

**Pago por QR desde la vitrina y novedades primero (2026-09-16).**
- **GOLD no mostraba «Pagar con QR»:** `cobroDeTenant` exigía `content.paymentQr` en el archivo aunque el QR, titular y
  banco viven en la base (`/panel/cobros`). GOLD tenía su QR cargado y sin ese bloque las tarjetas decían «Quiero este
  plan». Ahora el bloque es solo respaldo.
- **Solo un socio sube comprobantes:** `GET /[tenant]/pago/cuenta` (dinámica, `private, no-store`, solo la propia
  sesión) responde `socio · sin-sesion · sin-ficha · otro-gimnasio · indisponible` con `cuentaParaSubirComprobante`
  (dominio, con pruebas). «Ya pagué» la consulta antes de mandar al panel y, si no es socio, explica qué falta y ofrece
  entrar o crear la cuenta, o pedir a recepción que la cree. El panel repite el aviso si se abre `?pagar=` a mano, y la
  acción y la base siguen exigiendo ficha.
- **Aviso de la revisión:** la base deja un aviso personal al aprobar o rechazar (migración `…170000`); llega a la
  campana del socio como tipo `comprobante` (rechazo = urgencia alta) junto a los de reservas.
- **Novedades primero:** la portada `anuncios` va en tres bloques. Con una columna (móvil y tablet) el orden es
  identidad → novedades → texto, botones, sedes y cifras. Con dos, las novedades ocupan la columna derecha desde arriba.
  La tarjeta destacada se limita a 30 rem para que en tablet asome la siguiente.
- **Contraste medido:** el carmesí `#D62828` da 3,9:1 sobre el fondo: solo texto ≥ 24 px (lemas a 1,5 rem) o fondo de
  insignia con texto blanco (5,0:1).
- **No se inventó:** el póster «Miss y Mister GOLDS · 7mo aniversario» y sus categorías de la maqueta no se publicaron
  (no hay imagen ni datos del evento); se cargan desde `/panel/anuncios` cuando el cliente los entregue. Tampoco
  «máquinas de última generación» ni «10+».

**Pendiente:**
1. ~~Desplegar y medir los códigos de estado~~ **hecho** (ver arriba).
1b. **Ejecutar el script de cuentas de prueba de GOLD** y, con ellas, probar el login cruzado: una cuenta de Mítico en
   `/golds-gym-premium/acceso` tiene que responder «Correo o contraseña incorrectos» y no abrir sesión. Falta el 403 y el 503, que exigen sesión.
2. **Pegar la plantilla del correo** en Supabase (Authentication → Emails → Confirm signup) y registrar una cuenta de
   prueba en cada gimnasio: la interpolación ocurre en el servidor de Supabase y no se puede verificar desde aquí.
3. Revisión humana con sesión de todo lo de esta rama, incluidos los tres tableros con recepción, gerencia y
   administración, y «Tus clases» del socio en 375 px.
4. Las etapas 5 y 6 **no añaden tablas, políticas ni RPC**: la batería V4.2 las cubre tal cual está. Si se toca la
   base otra vez, volver a pasarla.

## 13e. V5 · inventario, monitor, Excel y QR en PDF (rama `goldgym-v5`)

Lo que traen `goldgym-v2` … `goldgym-v5`, revisado el 2026-09-21 contra las reglas del proyecto.

**Lo nuevo que funciona tal cual llegó:**
- **Monitor de ingresos** (`/[tenant]/monitor`): pantalla de recepción que muestra a quién acaba de entrar, con su
  foto, su estado y su racha. Se comunica por eventos de `localStorage` entre pestañas del MISMO navegador (no hay
  WebSocket: el cliente de navegador que se importaba estaba sin usar y se retiró).
- **Reportes en Excel** (`/panel/reportes/[reporte]/excel`, exceljs en servidor) en lugar del CSV.
- **QR del socio en PDF** (`/panel/socios/[id]/imprimir-qr`). Llegó fotografiando la vista previa con html2canvas;
  se reescribió el 2026-09-21 para dibujarlo con las primitivas del PDF (más abajo).
- **Alias de correo por gimnasio** (`mutarEmailParaTenant`): la misma persona puede ser socia de dos gimnasios con su
  correo, porque en Auth se guarda `nombre+slug@dominio`. **Cambia la decisión de V4.2** («una cuenta por correo para
  toda la plataforma»); la ficha guarda el correo con alias y las pantallas lo muestran limpio.
- **Catch-all `[...catchAll]` y `not-found` por tenant**: una ruta inventada dentro de un gimnasio ya da 404 con su marca.
- **Mapas de sede por enlace incrustado** (`BranchShowcase.mapEmbedUrl`), que conviven con las coordenadas y la
  dirección que ya resolvía el dominio.

**Lo que se corrigió el 2026-09-21 (esta rama venía con la arquitectura torcida):**
1. **`service_role` en el código.** `panel/socio/actions.ts` creaba un cliente con `SUPABASE_SERVICE_ROLE_KEY` para
   cambiar la contraseña del socio. Esa clave tiene BYPASSRLS: con ella en el servidor web, cualquier fallo de
   cualquier ruta pasa de «ver lo tuyo» a «ver todo, de todos los gimnasios». Ahora se usa `auth.updateUser` con la
   sesión del propio socio, que es lo que hacía falta desde el principio (regla 4).
2. **Inventario contra la Dependency Rule.** Su Server Action vivía en `core/application/operations/` e importaba
   `@infra` y `@/app`. Se movió a `panel/inventario/actions.ts` con `contextoDeAccion`, validación de dominio
   (`operations/inventario.ts`, con pruebas) y la sede resuelta por la sesión, no por el formulario.
3. **La migración del inventario nunca se aplicó y no podía aplicarse** (§4.7 y el README de migraciones). Se
   reescribió y se aplicó: `/panel/inventario` consultaba una tabla inexistente y se veía siempre vacío.
4. **El inventario no era una capacidad contratada:** entraba por `memberLogin` y se autorizaba con
   `attendance.create`, así que «puede registrar entradas» significaba «puede borrar productos». Ahora tiene
   `enableInventory`, `inventory.read` / `inventory.manage` y su entrada de navegación.
5. **Administración no podía descargar ningún reporte:** la ruta exigía espacio `gimnasio` y el suyo es
   `administracion` (defecto heredado del CSV de V4). Ahora autoriza el permiso, no el espacio.
6. **Dependencias con `^` y `npm audit` en rojo** (exceljs arrastra `uuid` 8, con aviso moderado): versiones fijadas y
   `overrides` de `uuid` a 11.1.1, comprobando que exceljs sigue generando el `.xlsx`.
7. **Código muerto retirado:** `supabase.browser.ts` (cliente de navegador sin uso), los imports de `createClient` y
   `supabaseConfig` en `socios/actions.ts` y el enlace `/csv` del reporte, que ya apuntaba a `/excel`.
8. **Una prueba en rojo** (el tablero de recepción) que la rama traía sin actualizar: pasa sola al devolverle su
   capacidad y su permiso a la acción de inventario.

**Estado (2026-09-21):** typecheck limpio · **344 pruebas** (10 nuevas de inventario) · build de 40 páginas (solo
GOLD) · `npm audit` 0 · greps de arquitectura vacíos · batería RLS del inventario pasada y revertida · advisors con
solo el aviso aceptado.

**Alta por recepción y tablero del mostrador (2026-09-21).** El cliente pidió dos cosas: que el socio dado de alta en
recepción pueda entrar a la web sin fricción —y que quien nunca la abra no pierda nada—, y que el tablero de
recepción sea agradable en vez de una pared de números.

- **El alias de correo había dejado fuera a cuatro cuentas reales de GOLD.** Al entrar, el formulario convertía lo
  escrito en `juan+golds-gym-premium@gmail.com`, y las cuentas anteriores a V5 están guardadas sin alias: su
  contraseña correcta respondía «datos incorrectos» para siempre. Ahora se prueban las dos formas
  (`correosParaIniciarSesion`), en ese orden, y después sigue decidiendo `decidirLoginPorGimnasio`.
- **El enlace de acceso podía crear una segunda cuenta.** Manda el enlace a la cuenta que YA existe —probando las dos
  formas sin permitir altas— y solo crea una cuando no hay ninguna. Recepción y el formulario público usan el mismo
  camino, así que «me registraron en recepción y nunca entré» y «olvidé mi contraseña» son la misma puerta.
- **La base empareja por correo base** (migración `20260921110000`): una ficha sin alias encuentra su cuenta con alias
  y al revés. Sin esto, `crear_ficha_propia` habría creado una segunda ficha para quien ya tenía una.
- **Sin correo no hay desventaja, y ahora se dice.** La ficha de quien no tiene correo explica que su QR y su
  membresía funcionan igual y que el correo se puede agregar cuando quiera. El alta nunca exigió correo.
- **Tablero por profundidad, no por recorte** (`profundidadDelBloque`): recepción abre con la operación del día y el
  resto queda plegado en un `<details>` que dice qué hay dentro; gerencia y administración abren también con el
  dinero. **Ningún bloque se deja de dibujar**: plegar no es quitar, y una prueba lo afirma.
- **`ResumenDelDia`**: saludo con la hora DEL GIMNASIO, puesto, sede y fecha, y debajo «Para hoy», una lista corta
  ordenada por urgencia (`asuntosDelDia`) con lo que alguien tiene que hacer. Sin nada pendiente dice «Todo al día»,
  que es una respuesta; un hueco no lo es.

**La tarjeta de QR se dibuja, no se fotografía (2026-09-21).** El cliente imprimió la tarjeta y trajo tres
defectos que en la pantalla no se veían: el QR salía achatado —y un QR achatado escanea mal—, las letras aparecían
partidas por la mitad y el token de 24 caracteres se salía del marco de corte.

La causa era una sola: el PDF se hacía rasterizando la vista previa con `html2canvas` y estirando esa imagen hasta
cubrir la hoja. La vista previa tenía SIEMPRE proporción A4, así que en Carta u Oficio todo se deformaba; el texto,
al ser un mapa de bits reescalado, perdía los trazos finos; y nadie medía si el token cabía.

- **`core/domain/operations/impresion-de-qr.ts`** (dominio puro, en milímetros de la hoja real): las tres hojas
  (`carta`, `oficio`, `a4`), la celda de cada posición de la rejilla, el reparto vertical de la tarjeta
  (`distribucionDeTarjeta`), el token partido en líneas (`lineasDelToken`), el cuerpo de letra que cabe
  (`cuerpoQueCabe`) y los tramos contiguos de cada fila del QR (`tramosDeFila`, que evita dibujar miles de
  rectángulos sueltos). **La vista previa y el PDF leen estos mismos números**, así que lo que se ve es lo que sale.
- **`presentation/patterns/qr-pdf.ts`**: el dibujo, contra una interfaz mínima (`LienzoDePdf`) en vez de atarse a
  jsPDF. El texto es texto —nítido a cualquier zoom y se puede copiar—, el QR son rectángulos calculados desde su
  matriz (cuadrado exacto) y la línea base va al PIE de cada recuadro, que es lo que arreglaba las letras cortadas.
  Importa el dominio por ruta RELATIVA y con extensión `.ts` a propósito: su prueba corre con `node --test`, sin
  empaquetador que resuelva `@core/*`.
- **La matriz del QR se calcula en el SERVIDOR** (`matrizQr`, en la página): `qrcode-generator` no entra al paquete
  del navegador (§2.8); al cliente solo llegan booleanos. `jspdf` baja por `import()` diferido, solo al pulsar
  «Descargar PDF».
- **`html2canvas` y `file-saver` se retiraron** de las dependencias: ya no hace falta ni fotografiar ni un ayudante
  para guardar el archivo.
- **Pruebas que miran dónde cae cada trazo** (`tests/v5-pdf-de-la-tarjeta.test.ts`): ejecutan el mismo
  `dibujarTarjetaQr` que corre en el navegador contra un lienzo de mentira que apunta cada orden de dibujo, y
  comprueban en las tres hojas que nada se sale del marco, que el token se imprime entero en dos líneas, que un
  nombre larguísimo encoge en vez de desbordarse, que dos textos nunca comparten línea base y que el recuadro del QR
  es cuadrado. Un defecto de papel no lo encuentra un typecheck; lo encuentra saber en qué coordenada acabó cada cosa.

**Estado (2026-09-21, tarjeta de QR):** typecheck limpio · **379 pruebas** (35 nuevas: 28 de geometría y 7 de dibujo)
· `npm run build` correcto.

**Pendiente de esta rama:**
1. **Revisión humana con sesión** del tablero de recepción (es lo único que no puede ver el asistente), del
   inventario, el monitor de ingresos, el Excel de reportes y el QR en PDF.
2. **Decidir si Recepción debe CORREGIR existencias** (hoy consulta; corregir es de Gerencia y Administración): es
   una fila en `role_permissions`, no un cambio de código.
3. **El alias de correo por gimnasio** conviene probarlo con un proveedor que no admita `+` en la parte local, y
   decidir qué pasa con los correos que ya tienen `+` antes del alias.
4. `jspdf` y `exceljs` pesan y contradicen la decisión 15 («PDF = impresión del navegador»): si el PDF del QR y el
   Excel se quedan, conviene anotarlo como decisión revisada en vez de dejarla contradicha. (`html2canvas` y
   `file-saver` ya salieron al reescribir la tarjeta de QR.)

---
## 14. Historial de versiones

| Versión | Fecha | Commits clave | Resumen |
|---|---|---|---|
| V5 alta y tablero | 2026-09-21 | (rama `goldgym-v5`) | **Alta por recepción de punta a punta y tablero del mostrador**: el login acepta las cuentas anteriores al alias de correo (cuatro cuentas reales de GOLD no podían entrar), el enlace de acceso va a la cuenta que ya existe en vez de crear otra, la base empareja cuenta y ficha por correo base (migración `20260921110000`), la ficha explica que sin correo no falta nada, y el tablero abre con «Para hoy» y pliega lo que no es del turno sin quitar ningún bloque. 356 pruebas |
| V5 QR en PDF | 2026-09-21 | (rama `goldgym-v5`) | **La tarjeta de QR se dibuja en vez de fotografiarse**: se retiró `html2canvas` (y `file-saver`), la geometría de las tres hojas vive en `impresion-de-qr.ts` en milímetros reales y la vista previa lee los mismos números que el PDF. Arregla lo que el cliente vio en el papel: QR achatado, letras partidas y token de 24 caracteres fuera del marco. La matriz del QR se calcula en el servidor y `jspdf` baja diferido. 379 pruebas (35 nuevas, 7 de ellas dibujando contra un lienzo espía) |
| V5 revisión | 2026-09-21 | (rama `goldgym-v5`) | **Revisión de arquitectura de V5**: `service_role` fuera del código (la contraseña del socio se cambia con su propia sesión), inventario devuelto a su capa con capacidad y permisos propios (`enableInventory`, `inventory.read`/`inventory.manage`), su migración reescrita y **aplicada de verdad** (la anterior nunca se aplicó ni podía), Administración recupera la descarga de reportes, dependencias fijadas y `npm audit` a 0, código muerto retirado. 344 pruebas, batería RLS del inventario pasada |
| V4.3 Inventario | 2026-09-18 | `e7ac79c`, `fedd507`, `29f5a8f` | **Módulo de Inventario y mejoras**: página `/panel/inventario` con `ModalNuevoProducto`, botón de reserva en la vitrina, monitor de ingresos, reportes en Excel, QR del socio en PDF y alias de correo por gimnasio. **Su migración se añadió pero NO se aplicó** (ver §13e: se reescribió y se aplicó el 2026-09-21) |
| V4.2 GOLD V1 | 2026-09-16 | `cca427d` → `7600d75` (rama `feat/goldgym-v1`, en GitHub) · **producción** Vercel `gold-gym` (`gold-gym-psi.vercel.app`, `dpl_4w5XedNhQ68ED1Vs5eckJ67KEH8o`) | Encargo «GOLD'S GYM PREMIUM — V1», seis etapas. **Dos conflictos se resolvieron CON el usuario en vez de sobrescribir reglas**: los 3 accesos diarios contra «una entrada por socio y día» (decisión 20) → tabla `access_passes` aparte, `attendance_records` intacta; y el acceso multisede contra «la membresía vale en todas las sedes» (decisiones 19 y 24) → `membership_plans.branch_scope`, por defecto `todas`, con la migración comprobando que ningún plan existente cambió. Además: **foto de perfil** del socio en Storage privado (no un blob en Postgres) y **modal de identidad** al escanear, con todo el contenido venido del backend; **autorización nominal de clases** (`access_mode = 'autorizados'` + `class_session_admissions`) para eventos con invitados que no son socios; **historial de ingresos** filtrable y paginado en la base; **tableros por puesto** (el orden cambia, el contenido no); **clases del socio** con sus seis situaciones y agenda día → clase → hora → sede → disponibilidad → reservar; **correo de confirmación generado por marca** desde el registro de gimnasios. §18/§19/§20: confirmar el correo deja la sesión abierta en el panel, un fallo de red ya no cierra sesión y el 403 existe de verdad (`forbidden()` de Next 16). 5 migraciones aplicadas con autorización; batería RLS V4.2 (una corrección la encontró ella: la guarda de la foto bloqueaba también a quien no tiene sesión); 280 pruebas; build de 102 páginas |
| V4.1 GOLD | 2026-09-15 | `9332021` (rama `feat/goldgym-v1`, en GitHub) · **producción** Vercel `gold-gym` (`gold-gym-psi.vercel.app`, despliegue `gold-6mgw9bczz…`) | **Tercer cliente de la plataforma, sin código propio.** Capacidad genérica de **anuncios** (tabla `announcements` con RLS y lectura anónima solo de lo publicado, bucket `anuncios`, `v_announcements_public`, permiso `content.manage`, flag `enableAnnouncements`, carrusel con detalle en `<dialog>` y `/panel/anuncios`) y **instalaciones repartidas por sucursal** (`FacilityItem.branchCode` unido a `branches.code` + `ui/Pestanas.tsx` genérico; sin reparto, comportamiento idéntico al anterior). Alta de **Gold's Gym Premium**: 4 sucursales, 7 planes, 15 clases y 60 horarios, todo sobre el modelo que ya existía. Un correo vacío pasa a ser válido y la vitrina lo omite; las áreas sin superficie ni fichas no pintan huecos. 2 migraciones; ADR 0011; batería RLS V4.1 (el anónimo ve 1 de 4 anuncios sembrados: ni borrador, ni programado, ni vencido); 199 pruebas; build de 99 páginas. Verificada sobre el dominio: públicas 200, panel 307, capacidad apagada 404, `/no-existe` 404, los tres gimnasios vivos, sin `service_role` en 11 chunks |
| V4 administración | 2026-09-14 | `1860fda`, `f54ce26` (rama `feat/v4-seradmingym`) · **producción** Vercel `web` (`web-rust-xi-23.vercel.app`, despliegue `web-gu4lr6b3e…`) | Rol `admin` de gimnasio con jerarquía `roles.level` (cierra que `users.manage` otorgara cualquier rol), Personal y roles, resumen de Administración, designación desde la plataforma; políticas RLS evaluadas una vez por consulta (contar 50 000 entradas: > 20 s → 18 ms; KPIs: timeout → 54 ms), lista y conteos de socios, patrones de asistencia y paginación en la base; rutinas sin el día repetido (causa en datos); navegación agrupada sin scroll horizontal; indicador de carga en el enlace pulsado. 7 migraciones (2 de ellas encontradas por la batería: vistas con función por fila y `cambiar_estado_de_cuenta` sin grant de `updated_at`); ADR 0010; batería RLS V4; 174 pruebas. Verificada sobre el dominio: públicas 200, panel 307, CSV 401, capacidad apagada 404, sin `service_role` |
| V1 | 2026-09-08/09 | `27d334e`, `38b83fd` | Sitio público multi-tenant, temas, flags, Next 16 |
| V1 bonus | 2026-09-09 | `f3ea967`, `2880c8d` | Datos reales de Mítico: 13 paquetes en 4 grupos, 4 programas, 12 productos |
| V2 base | 2026-09-09 | `3702e81`, `048c830`, `3944db3` | Esquema multi-tenant con RLS; deuda de auditoría; sitemap |
| V2 acceso | 2026-09-09 | `7c45bbb`, `f7de8f6`, `5549970`, `addefde`, `e7a1d64` | Login y registro, panel por tenant, build sin variables, confirmación de correo |
| V2 cabecera | 2026-09-09 | `54bb33f`, `b1310db`, `0ba2a83` | «Mi panel» con sesión; cuentas demo por rol |
| V2.1 | 2026-09-09 | `399c795` | Dashboards por rol, asistencia QR, notificaciones, reportes CSV/PDF |
| V2.2 | 2026-09-10 | `406dd68`, `417738b` | Gestión de socios, cobro por QR con comprobantes, cámara, racha, reportes híbridos; desplegada |
| Cierre V2 | 2026-09-10 | `d599bda` | CLAUDE.md reescrito como referencia del estado actual; bitácora archivada; documentos alineados |
| V3.0 vitrina | 2026-09-11 | `eb3b0ff` | Landing multisucursal: chips de sedes en el hero, sección de sucursales rediseñada (portada/detalle/mapas), página `/sucursales` en el menú, texto de vitrina por sede en el tenant (`content.branches`), FAQ y «Nosotros» con las dos sedes; resets CSS a `@layer base` (márgenes y contraste de botones); voseo retirado de galería, horarios, instalaciones y tenants. Planes y pagos sin cambios. Desplegada (`dpl_58gzS8aVddniDoLLmXnWhrKPajwY`): `/mitico/sucursales` 200, `/aurora-fit/sucursales` 404, planes intactos |
| V3.0 cobro QR | 2026-09-11 | `27279ef` | **Corrección urgente.** Causa raíz de «gerencia no puede guardar el QR»: `upsert` con `tenant_id` sin grant (42501) mal traducido como falta de rol; ahora RPC invocador, sin ampliar permisos. QR general y por plan (`payment_qr_codes`, modalidad `global`/`por_plan`, monto libre/exacto), selección con respaldo en el general, precio de la base en la vitrina; la base rechaza cobros por QR y aprobaciones por debajo del precio (180/179/181 probados) y cierra el enlace de un pago barato por UPDATE directo. Migraciones `v3_cobro_qr_por_plan_e_importe_verificado` y `v3_venta_y_alta_con_qr_exigen_importe_completo`; batería RLS en `docs/runbooks/pruebas-rls-v3.0-cobro-qr.sql`; 46 pruebas de dominio |
| V3.4 | 2026-09-12 | `feat(v3.4)` (rama `feat/v3.4-reservas`) | **Reservas de clases**: reglas por gimnasio en la base (ventana, cierre, cancelación libre, tope de activas, espera, faltas y bloqueo), cupo único de asistentes + reservas pendientes con lugares opcionales sin reserva, lista de espera automática con aviso, faltas derivadas y «Cerrar lista», bloqueo y justificación, cancelar una sesión cancela reservas y avisa, avisos personales en la bandeja del socio, botón de reserva en «Tus clases», reservas y «Vino» en la sesión, sección de reservas de gerencia y reportes `asistencia-a-clases` y `reservas-de-clases`. 33 ejercicios y un programa más en Mítico. Migraciones `v3_4_reservas_lista_de_espera_e_inasistencias`, semilla y `v3_4_v_classes_con_lugares_sin_reserva`; ADR 0009; batería RLS V3.4; 153 pruebas de dominio |
| V3.3 | 2026-09-12 | `34ebdb0` (rama `feat/v3.3-clases-sesiones`, en GitHub) | Clases grupales con **acceso por plan** (`membresia`/`planes`/`abierta`, contra la membresía del día de la sesión), horario semanal por sede, **sesiones generadas** (hasta 62 días, conflictos informados) y sueltas/eventos, capacidad obligatoria respetada con bloqueo, cancelación con motivo, **asistencia a clase** por recepción (sus sedes) o el instructor (sus sesiones) con buscador por nombre/código/QR, «Tus clases» del socio y del entrenador, métricas de ocupación con conclusiones y vitrina `/clases`. Migraciones `v3_3_clases_horarios_sesiones_y_asistencia` (+2 correcciones que encontró la batería de RLS: cruce falso al regenerar y asistencia visible para cualquier entrenador) y semilla de demostración; ADR 0008; 133 pruebas de dominio |
| V3.2 | 2026-09-12 | `79d8de2` | Desplegada (`dpl_3YaGKuHdfqZk7jS6rT4vrds1oyrc`) y verificada sobre el alias: públicas 200, `/mitico/panel/{rutinas,entrenamiento,rutinas/asignada/[id]}` 307 sin sesión, las mismas en Aurora 404, sin `service_role` en 11 chunks. Programas → rutinas → ejercicios; **asignar copia la rutina** al socio y se ajusta solo para él; progreso con una marca por ejercicio y día (fecha local del gimnasio, origen deducido por la base, series y peso opcionales); el socio marca desde su panel y el entrenador desde el suyo, cada uno acotado por `app.puede_entrenar_a`. **Métricas para gerencia** en `/panel/entrenamiento`: conclusiones automáticas, ejercicio más y menos hecho, qué hace cada socio, mapa día × grupo muscular y etiqueta del día («día de pierna») con umbrales probados en el dominio. Migraciones `v3_2_programas_rutinas_y_progreso` (+3 correcciones que encontró la batería de RLS) y semilla de demostración; ADR 0007; 102 pruebas de dominio |
| V3.1 | 2026-09-11 | `9c55f7b` | Desplegada (`dpl_AkFXrLTgx88Mv8ceBmVPm22xQvyc`) y verificada sobre el alias: públicas 200, `/mitico/panel/{entrenadores,entrenador,ejercicios}` 307 sin sesión, las mismas rutas en Aurora 404, CSP con el origen del proyecto en `img-src`/`media-src` y reproductores sin cookies en `frame-src`, sin `service_role` en 11 chunks (608 KB). Entrenadores + ejercicios. Perfil con cuenta opcional vinculada por gerencia (rol `trainer`, solo `trainers.self`), sedes N:M, ausencias por horas/turno/día/periodo sin solapes, socios principal/secundarios según el PLAN (en la base), espacio `/panel/entrenador` con columnas fijas; catálogo de ejercicios con imagen/GIF/clip/enlace, compresión en el navegador, subida directa firmada, bucket privado con URL firmada, cuota de 300 MB medida por la base. **Corrige una escalada de privilegios de V2** (gerencia podía darse `super_admin`). Migraciones `v3_roles_de_gimnasio_no_otorgan_plataforma`, `v3_1_entrenadores_ejercicios_y_permisos`, `v3_1_semilla_entrenador_demo_y_ejercicios`, `v3_1_mensajes_de_asignacion_y_especialidades`; ADR 0006; batería RLS V3.1; 79 pruebas de dominio |
| V3.0 | 2026-09-11 | `0227dd4`, `16fd88c` | Multisucursal: `branches`, `user_branches`, asistencia con sede (histórico sin sede), `branches.manage`/`branches.all`, sede de trabajo por dispositivo, dashboards global/por sede, `/panel/sucursales`, reportes por sede, «Nuestras sucursales» en la vitrina, auditoría por disparador, `npm test`. Mítico: Prado + Miraflores. Desplegada (`dpl_7DFPH7re52R8Q7kzHNwXo5sG99TQ`) y verificada sobre el alias: públicas 200 desde CDN, vitrina con las dos sedes y sus mapas, panel 307, `/aurora-fit/panel/sucursales` 404, CSV de la comparativa 401 sin sesión y 404 en Aurora, sin `service_role` en chunks |

Detalle de cada fase —defectos encontrados, tablas de pruebas por rol, notas de
despliegue— en [`docs/historial/bitacora-v1-a-v2.2.md`](docs/historial/bitacora-v1-a-v2.2.md).
