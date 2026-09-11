# Bitácora de V1 a V2.2

> **Archivo histórico, no se mantiene.** Es la copia íntegra del `CLAUDE.md`
> tal como estaba al cerrar V2.2 (commit `417738b`, 2026-09-10). Se conserva
> por el detalle de cada fase —defectos encontrados, pruebas con sus números,
> decisiones con su contexto— que el `CLAUDE.md` vigente resume.
>
> **El estado actual del sistema está en `/CLAUDE.md`.** Si algo de aquí
> contradice a ese archivo, manda `CLAUDE.md`.

---

# CLAUDE.md — Memoria y reglas de trabajo

> Archivo de contexto persistente del proyecto. Claude Code lo carga
> automáticamente al abrir una sesión en este repositorio.
>
> **Regla de mantenimiento:** este archivo se actualiza al cerrar cada avance
> importante (una feature completa, un cambio de arquitectura, un despliegue) y
> al final de cada sesión. Las secciones **3. Estado actual** y **4. Pendientes**
> son las que cambian; las demás solo cuando cambia una decisión de fondo.
>
> **Última actualización:** 2026-09-10 · V2.2: gestión de socios, cobro por QR
> con comprobantes, check-in con cámara, racha y reportes híbridos. Rama
> `feat/v2.2-gestion`, sobre `feat/v2.1-operacion`.

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
V1.5     Base de datos en Supabase ✅ · la configuración pasará de archivos a BD
V2   ✅  Autenticación y sesión
V2.1 ✅  Dashboards por rol, asistencia con QR, notificaciones, reportes
V2.2 🔨  Gestión de socios, cobro por QR con comprobantes, racha, reportes híbridos
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
| Textos visibles al usuario final | **Español neutro (Bolivia)**: "entrena", "elige", "puedes". Sin voseo rioplatense. |
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
  contacto, horarios, navegación, 24 feature flags, SEO, contenido completo).
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

Origen: material comercial de la empresa. Sustituye **la oferta comercial** de
demostración por la real, conservando el resto del sitio.

**Ampliaciones del contrato de dominio** (autorizadas explícitamente tras
señalarse que no entraban sin tocar arquitectura):

| Cambio | Motivo |
|---|---|
| `ProductItem` + `ProductCategory` | El gimnasio vende indumentaria, suplementación y accesorios. No existía el concepto. |
| `PlanGroup` y `TenantContent.planGroups` (sustituye a `plans`) | Los paquetes son 13 en 4 familias comerciales, no una lista plana. |
| `TrainingPlan` y `TenantContent.trainingPlans` | Los programas de entrenamiento personalizado son **otra categoría**, no un paquete más. |
| `BillingPeriod` += `quincenal` | Existe un paquete de 15 días. |
| `FeatureFlags` += `showProducts`, `showTrainingPlans` | Capacidades nuevas, apagadas por defecto. |

**Por qué `TrainingPlan` no es un `MembershipPlan`.** Un paquete se compra por
lo que da acceso; un programa, por lo que te hace hacer. No comparten forma —el
programa no tiene nombre comercial, tiene rutinas asignadas e imagen de
referencia— y sobre todo no son alternativas entre sí: ponerlos en la misma
retícula hace que el visitante lea «400 Bs» junto a «180 Bs» y concluya que uno
es caro, cuando no está comparando lo mismo. Por eso van en secciones separadas.

**Regla de destacado revisada:** `featured` es único **por grupo**, no por
tenant. Un único destacado global obligaría a elegir entre resaltar una
mensualidad o un plan personalizado, que no compiten entre sí.

**Estado de Mítico:**

- **Paquetes (13 en 4 grupos):** Mensual Básico, Mensual Fit, Mensual Mítico y
  Especiales, cada uno con su descripción comercial y su propio destacado.
- **Programas de entrenamiento (4):** sección propia, sin nombre comercial, con
  hueco de imagen reservado (`imageSrc`) y sus rutinas temáticas.
- 12 productos en 3 categorías · 4 redes sociales reales ·
  WhatsApp `+591 77700867` · slogan y CTA de marca.
- **Navegación y secciones del producto intactas:** las 8 entradas del menú y
  las 9 rutas siguen como estaban. Galería, instalaciones, horarios, equipo,
  testimonios y mapa de contacto no se tocan.

**Arreglos de UI.** Los distintivos «Más popular» se posicionaban en absoluto
sobresaliendo del borde superior de la tarjeta. En la retícula de productos
(`gap-4`) eso los dejaba a **5 px medidos** de la tarjeta de la fila anterior:
se leían como si la tocaran. Se pasaron a flujo normal en productos, y en la
retícula de paquetes el hueco vertical pasó a ser mayor que el horizontal
(`gap-x-6 gap-y-10`), porque ahí el distintivo sí aporta y solo necesitaba aire.

**Verificado:** `tsc --noEmit` limpio · `next build` 23 páginas · `npm audit` 0
vulnerabilidades · Dependency Rule y grep del ADR 0003 sin hallazgos · las 9
rutas de Mítico responden 200 · Aurora Fit sin regresión (8 entradas de menú, 4
planes en un grupo, sin productos ni programas) · móvil 375 px sin desborde ni
texto recortado · escaneo de solapamientos en el DOM sin hallazgos.

**Pendiente de confirmar por escrito con el cliente** (marcado en el encabezado
de `mitico.tenant.ts`): email, dirección, horarios, URL del mapa y el enlace del
grupo de WhatsApp. También siguen siendo de la demo el relato de «Nosotros»,
las instalaciones, la galería, el equipo, los testimonios y las cifras del hero.

**Duda abierta:** el material lista **cinco** programas de entrenamiento, pero
dos filas son idénticas (220 Bs, mismas prestaciones, mismas rutinas Batman y
Gamora). Se cargaron **cuatro** programas distintos. Si la quinta fila era un
nivel aparte, falta su precio y sus rutinas.

### V2 · Fase 1 — Base de datos y aislamiento 🔨 2026-09-09

**Rama:** `feat/v2-public-site` — rama de consolidación de V2, **no de
producción**. Es la referencia del enlatado: se mantiene pulcra para que
cualquier cliente que necesite estas capacidades salga de aquí.
**Proyecto Supabase:** `dnclwawnjnzqqxgsuhpn` · PostgreSQL 17 · 11 migraciones

Detalle completo en [`supabase/README.md`](supabase/README.md) y en el
[ADR 0004](docs/architecture/adr/0004-identidad-y-aislamiento-en-supabase.md).

#### La decisión de fondo

**Identidad en Supabase Auth, aislamiento en RLS.** No se implementa el
`JwtProvider` propio que preveía ARCHITECV2. El motivo no es comodidad: un
filtro global de EF Core es una convención del código —`IgnoreQueryFilters()`
la desactiva entera, incluido el filtro de tenant— mientras que RLS se evalúa
en el motor, por debajo de cualquier ORM y de cualquier consulta escrita a
mano. Es garantía, no convención.

**No cancela la API .NET.** Puede construirse encima, con una condición: que
propague el JWT del usuario. Si se conecta con `service_role` —que tiene
`BYPASSRLS`— el aislamiento vuelve a depender del código y esta decisión pierde
su sentido.

#### Qué existe

| Área | Tablas |
|---|---|
| Plataforma | `tenants` |
| Identidad | `app_users`, `roles`, `permissions`, `role_permissions`, `user_roles` |
| Gimnasio | `customers`, `membership_plans`, `memberships`, `payments` |
| Operación | `attendance_records`, `audit_log` |
| Vistas | `v_memberships`, `v_customer_overview` |

- **20 permisos** en formato `modulo.accion` y **4 roles de sistema**:
  `super_admin` (alcance plataforma), `manager`, `receptionist`, `customer`.
- **Esquema `app`** con las funciones de contexto, fuera del esquema que
  PostgREST publica: en `public` cada función es un endpoint `/rest/v1/rpc/...`,
  y estas son `SECURITY DEFINER`.
- **2 gimnasios sembrados** con los slugs del sitio público (`mitico`,
  `aurora-fit`) y sus 17 planes reales.
- `get_advisors(security)` → **0 hallazgos**.

#### Aislamiento verificado a mano

Con dos recepcionistas de gimnasios distintos y un socio del portal, simulando
la sesión con `set local role authenticated`:

- Cada recepción ve solo sus socios y solo sus planes.
- Leer el socio ajeno **por su id exacto** devuelve 0 filas.
- Alta, edición y cobro cruzados: bloqueados por RLS.
- El socio del portal ve solo su ficha, teniendo un compañero en el mismo
  gimnasio, y no tiene ningún permiso de recepción.

#### Decisiones de modelado que conviene no revisitar

- **`membership_status` no guarda «por vencer»**: es derivado de `end_date`.
  Guardarlo obliga a un proceso diario y permite que la fila contradiga a la
  fecha. Se calcula en `v_memberships`.
- **Las vistas llevan `security_invoker = true`**. Por omisión una vista corre
  con los permisos de su propietario y **saltaría el RLS**: fuga entre
  gimnasios servida en bandeja.
- **Los pagos no tienen `UPDATE` ni `DELETE`**: un cobro erróneo se corrige con
  el asiento inverso.
- **Los socios se archivan, no se borran**: borrar un socio con histórico de
  pagos es perder contabilidad.
- **El precio se congela en `memberships.price`**: si el plan sube, la
  membresía ya vendida no cambia.
- **El super admin no lee socios ni pagos de sus clientes.** Administrar
  gimnasios no es ver los datos personales de sus socios (§39, §112).

#### Lo que NO existe todavía

Ni backend ni interfaz. No hay login, ni pantalla de clientes, ni dashboard.
Lo construido es la base sobre la que todo eso se apoya.

#### Riesgos vivos

1. **`service_role` tiene `BYPASSRLS`.** Nunca puede llegar al navegador.
2. **Las migraciones están en el servidor, no en el repositorio.** Hace falta
   `npx supabase link` + `npx supabase db pull` para materializarlas. Mientras
   tanto se incumple la regla §47 del documento maestro.
3. **La prueba de aislamiento es manual.** Automatizarla en CI es lo primero:
   una prueba que no corre sola se degrada.

### V2 · Fase 2 — Login y registro funcionales ✅ 2026-09-09

Ya se puede entrar al sistema. `/[tenant]/acceso` autentica de verdad y
`/[tenant]/panel` es la primera ruta protegida.

#### Cómo está armado

| Pieza | Dónde | Qué hace |
|---|---|---|
| Validación de forma | `core/application/auth/login.usecase.ts` | Sin framework, sin I/O |
| Acciones de servidor | `app/[tenant]/acceso/actions.ts` | Todo lo que decide algo |
| Cliente de Supabase | `infrastructure/auth/supabase.server.ts` | Solo servidor |
| Endurecimiento de cookie | `infrastructure/auth/cookie-options.ts` | `HttpOnly`, `Secure`, `SameSite=Lax` |
| Renovación de sesión | `src/middleware.ts` | Refresca el token; **no autoriza** |
| Formulario | `presentation/patterns/AccessForm.tsx` | Único componente de cliente |
| Alta de perfil | Disparador `app.handle_new_auth_user` | Asigna tenant y rol |

#### Las tres decisiones de seguridad que importan

**1. El gimnasio sale de la ruta, no del formulario.** `tenantSlug` se
re-resuelve en el servidor contra el registro de tenants. Es la regla §11
aplicada al registro: el tenant nunca es dato del cliente.

**2. El rol se escribe en el disparador, jamás se lee de los metadatos.**
Ahí está la diferencia entre «el usuario pide» y «el sistema concede». Se
verificó atacando el disparador directamente con metadatos falsificados
(`role: super_admin`, `roles: [manager, super_admin]`, `customer_id` ajeno,
`is_platform_admin: true`): el resultado fue rol `customer` y `customer_id`
nulo. Lo único que se honra es el slug —validado contra la tabla— y el nombre.

**3. La cookie es `HttpOnly`, y eso hubo que forzarlo.** `@supabase/ssr` no la
marca así por defecto, porque su caso general contempla un cliente de Supabase
en el navegador. Aquí no lo hay. **Se detectó en la prueba**: `document.cookie`
devolvía el token de acceso *y el de refresco*. Con `'unsafe-inline'` todavía
en la política de scripts, un XSS se habría llevado la sesión entera y podría
renovarla indefinidamente. Corregido en `cookie-options.ts`, aplicado tanto en
el cliente de servidor como en el middleware —si el middleware reescribiera la
cookie con las opciones por defecto, desharía el `HttpOnly` en la siguiente
renovación—.

#### Otras decisiones

- **`getUser()`, nunca `getSession()`** para decidir accesos: `getSession()`
  devuelve lo que venga en la cookie sin validar la firma.
- **El middleware no autoriza.** Renueva la cookie. Su `matcher` puede dejar
  rutas fuera, y confiarle la autorización es cómo se abren huecos. Cada página
  protegida comprueba por su cuenta, y por debajo está RLS.
- **`connect-src` de la CSP incluye el origen de Supabase.** Sin eso la
  política bloqueaba las llamadas de autenticación en silencio: el formulario
  parecía colgado.
- **El mensaje de error no distingue** entre correo inexistente y contraseña
  incorrecta: distinguir convierte el formulario en un comprobador de qué
  correos están registrados en el gimnasio.
- **El cierre de sesión es un POST**, no un enlace: una acción que cambia
  estado no puede dispararse con una precarga del navegador.

#### Datos de demostración

10 socios de Mítico con membresía y pago, repartidos a propósito entre los tres
estados que la vista calcula: **2 vencidas, 2 por vencer, 6 activas**.

Contraseña de todos: `Demo.Mitico.2026`
Correos: `nombre.apellido@demo.miticofitness.com`

> Esos 10 se insertaron directamente en `auth.users`, y por eso funcionan pese
> a que Supabase rechaza el dominio `demo.miticofitness.com` como no
> entregable. El registro **por el formulario** sí valida el dominio: se probó
> y devuelve `email_address_invalid`. Para probar el alta hay que usar un
> dominio real.

Dos tropiezos que costaron encontrar y conviene no repetir:

1. **Insertar en `auth.users` a mano deja columnas de token en NULL**
   (`confirmation_token`, `recovery_token`, `email_change_token_new`,
   `email_change`). GoTrue las lee como cadenas y el login falla con un 500
   genérico: `converting NULL to string is unsupported`. Hay que ponerlas a `''`
   y crear además la fila en `auth.identities`.
2. **El filtro de mapa oscuro habitual (`invert` + `hue-rotate`) no sirve aquí.**
   El embebido es vista satelital, y una foto aérea invertida queda en negativo,
   no oscura. Se sustituyó por atenuación (`brightness`/`contrast`/`saturate`)
   tras verlo en pantalla.

#### Verificación de seguridad

| Prueba | Resultado |
|---|---|
| Panel sin sesión | 307 → `/acceso` |
| Cookie legible por JavaScript | Ninguna |
| Token en `localStorage`/`sessionStorage` | Ninguno |
| `service_role` o JWT en el paquete del navegador | No aparece |
| Socio autenticado lista socios | Solo el suyo (1 de 10) |
| Socio lista pagos / membresías / usuarios | Solo los suyos |
| Socio lee la bitácora | 0 filas |
| Socio se autoconcede rol de gerente | Bloqueado por RLS |
| Socio registra un cobro | Bloqueado por RLS |
| Socio extiende su membresía | Sin fila actualizable |
| Socio cambia su propio tenant | Sin fila actualizable |
| Socio se vincula a la ficha de otro | Sin fila actualizable |
| Socio crea un permiso nuevo | Bloqueado por RLS |
| Alta con metadatos falsificados | Rol `customer`, ficha nula |
| Socio abre el panel de OTRO gimnasio | Redirige al suyo (corregido en la pasada final) |
| Cierre de sesión | Cookie borrada; el panel vuelve a 307 |
| Socio borra sus propios pagos | Bloqueado (no hay política de DELETE) |
| Socio cambia el precio de los planes | Bloqueado |
| Socio crea un gimnasio | Bloqueado |
| Fuerza bruta contra el alta | Cortada por el rate limit de Supabase |
| `get_advisors(security)` | 1 aviso, abajo |

#### Fallo de despliegue y lección (2026-09-09)

El primer despliegue a Vercel **rompió el build entero**:

```
Failed to collect page data for /[tenant]/panel
  at module evaluation (src/infrastructure/auth/supabase.config.ts)
```

Causa: `supabase.config.ts` validaba las variables de entorno **al evaluar el
módulo**. La intención era buena —que una variable ausente rompiera pronto en
vez de producir un formulario que falla en silencio— pero Next.js evalúa el
grafo de módulos al recolectar los datos de página durante el `build`. Sin las
variables configuradas en Vercel, ese `throw` tumbaba la compilación de las
**25 páginas**, incluidas las 24 del sitio público que no dependen de Supabase
para nada.

> **La regla que sale de aquí: una capacidad que falta desactiva SU parte, no
> el producto.** Validar al importar acopla el arranque de todo a la
> configuración de una pieza. Se valida al usar.

Corregido: `supabaseConfig()` devuelve `null` en vez de lanzar,
`isSupabaseConfigured()` permite preguntar sin romper, y `requireSupabaseConfig()`
solo se llama donde ya es seguro. `getAuthenticatedUser()` devuelve `null` sin
configuración —para una ruta protegida, «no hay sesión» y «no hay proveedor de
sesiones» llevan al mismo sitio— y las acciones responden con un mensaje claro
en vez de una traza.

**Verificado en los dos escenarios**, que es lo que faltó la primera vez:

| Escenario | Resultado |
|---|---|
| `build` SIN variables (el de Vercel) | 25 páginas, salida 0 |
| Sitio público sin variables | 200 en todas las rutas |
| `/panel` sin variables | 307 → acceso, no 500 |
| Formulario sin variables | Mensaje claro, sin traza |
| `build` y login CON variables | Igual que antes |

#### El despliegue no necesita configurar nada

Segunda corrección, el mismo día. La primera versión exigía definir tres
variables en Vercel. Se descartó ese camino y el proyecto de Supabase por
defecto vive ahora en `src/infrastructure/auth/supabase.config.ts`.

**Por qué se puede versionar esa clave.** Los dos valores llevan prefijo
`NEXT_PUBLIC_`, así que Next.js los incrusta en el paquete que descarga el
navegador: **cualquiera que abra el sitio desplegado ya los tiene**.
Versionarlos no expone nada nuevo. Lo que los hace inofensivos no es el
secreto —no lo hay— sino RLS: 12 tablas, todas protegidas, 34 políticas, cero
desprotegidas. Sin sesión válida esa clave no devuelve una sola fila, y se
comprobó a fondo.

Las variables de entorno **siguen mandando** cuando existen, para apuntar a
otro proyecto o rotar la clave sin tocar código. Se exigen **las dos o
ninguna**: mezclar la URL de un proyecto con la clave de otro falla de formas
difíciles de diagnosticar. `NEXT_PUBLIC_SITE_URL` no hace falta porque Vercel
inyecta `VERCEL_PROJECT_PRODUCTION_URL` por su cuenta.

> ⛔ **Esto NO sienta precedente para `service_role`.** Esa clave tiene
> BYPASSRLS y se salta todo el aislamiento entre gimnasios. Nunca al
> repositorio, nunca con prefijo `NEXT_PUBLIC_`. Las dos de arriba están
> versionadas porque son públicas, no porque el repositorio sea sitio para
> claves.

**Verificado sin ninguna variable de entorno:** typecheck, build de 25 páginas
con salida 0, sitio público en 200, `/panel` en 307, CSP con el origen correcto
en `connect-src`, y **login real funcionando** con la cookie todavía `HttpOnly`.

> Nota sobre el plan gratuito: las variables de entorno estándar de Vercel
> **sí** están en Hobby (Settings → Environment Variables). Lo de pago son las
> *Sensitive* y las *Shared* entre proyectos. Aun así, no configurar nada es
> mejor que configurar bien, así que la solución se queda.

### V2 · Fase 3 — Validaciones y confirmación de correo ✅ 2026-09-09

#### El enlace del correo no confirmaba nada

`signUp` no enviaba `emailRedirectTo` y **no existía ninguna ruta de retorno**.
Supabase caía en la «Site URL» del panel —`http://localhost:3000`— y el socio
recibía un enlace a su propia máquina.

Ahora `signUp` envía `emailRedirectTo` apuntando a `/auth/confirmar`, un Route
Handler nuevo que cubre las dos formas en que puede volver el enlace según la
plantilla configurada: `?code=` (PKCE, se canjea con `exchangeCodeForSession`)
y `?token_hash=&type=` (se verifica con `verifyOtp`). Al terminar redirige a la
página de acceso del gimnasio con `?confirmado=1` o `0`, y el formulario
muestra el mensaje correspondiente.

**El destino se valida contra el registro de tenants.** Sin eso,
`?gimnasio=https://sitio-malicioso` habría convertido esa ruta en un
**redirector abierto**: un enlace que empieza en nuestro dominio —y por tanto
parece de fiar— y termina donde quiera el atacante. Probado: redirige a `/`.

> ⚠️ **Falta un ajuste en el panel de Supabase**, y sin él esto no funciona en
> producción por más código que haya: Authentication → URL Configuration.
> **Site URL** = `https://gym-platform-alpha.vercel.app` y en **Redirect URLs**
> añadir `https://gym-platform-alpha.vercel.app/auth/confirmar*`. Si el destino
> no está en esa lista, Supabase ignora `emailRedirectTo` y vuelve a la Site
> URL. No se puede cambiar por MCP: es del panel.

#### Validaciones

Todas por duplicado: en el navegador para no hacer perder el tiempo, en el
servidor porque el `pattern` se salta desactivando JavaScript. **Comprobado
quitando `pattern`, `minlength` y `required` desde la consola**: el servidor
rechazó los tres campos igual.

| Campo | Regla |
|---|---|
| Nombre | Letras, espacios, apóstrofo, guion y punto. **Sin dígitos**, con mensaje propio. Admite tildes, `ñ` y `ç` |
| Correo | Dominio de dos niveles y TLD alfabético; máx. 254 (RFC 5321) |
| Contraseña | 8–72 caracteres; no puede ser igual al correo |

El tope de 72 no es capricho: bcrypt trunca ahí, y sin el límite el usuario
creería tener una contraseña más fuerte de la que tiene.

#### Dos fallos de la interfaz que eran de seguridad

**Los datos pasaban de una pestaña a otra.** Lo escrito en «Iniciar sesión»
—contraseña incluida— aparecía al cambiar a «Crear cuenta». React reconciliaba
los dos formularios como si fueran el mismo, porque tienen la misma estructura
y los mismos `name`, y reutilizaba los `<input>`. Resuelto con un `key` distinto
por pestaña, que fuerza el desmontaje.

**La contraseña quedaba escrita tras el intento.** React 19 ya resetea un
formulario con `action` al terminar —se comprobó— pero eso no cubre los caminos
donde el componente no re-renderiza: una acción que redirige, o la vuelta atrás
desde la caché del navegador. Se borra además de forma explícita. En el
mostrador de un gimnasio la misma pantalla la usan varias personas.

**El botón sí se desactiva durante el envío** (`useFormStatus`, con `aria-busy`
y el texto «Un momento…»). Se verificó muestreando su estado a mitad del envío.

### V2 · Fase 4 — La cabecera conoce la sesión ✅ 2026-09-09

Ofrecer «Acceso socios» a quien ya entró no tiene sentido. Con sesión abierta
el enlace pasa a **«Mi panel»** —en escritorio y en el menú móvil—, en vez de
desaparecer sin más: quitarlo dejaría al socio sin ruta visible hacia lo suyo.

#### La restricción que condicionó la solución

Lo natural era leer la sesión en el layout del tenant. **No se puede:** ese
layout es el que prerenderiza las páginas del sitio público, y en cuanto lee
cookies Next.js las saca del prerenderizado. Se perdería el servido desde CDN
de todo el sitio comercial para decidir el texto de un botón.

La salida es una **cookie de pista** (`gp-sesion`) que escribe el middleware
—que ya valida la sesión en cada petición—. No lleva token ni identidad: es un
`1` que solo dice «hay sesión». Al no ser `HttpOnly` la cabecera la lee desde
el navegador, sin petición extra y sin sacar una sola página de estático.

> **No es un control de seguridad y no debe usarse como tal.** Cualquiera puede
> escribirla desde la consola. **Comprobado:** con la cookie falsificada la
> cabecera muestra «Mi panel», y al entrar el panel devuelve 307 al acceso.
> Falsearla no abre nada, porque quien decide es `getUser()` y, por debajo, RLS.

De paso se devolvió `/acceso` a estática: leía `searchParams` en el servidor
para el aviso de confirmación, lo que la sacaba del prerenderizado. Ahora ese
parámetro se lee en cliente con `useSearchParams` dentro de un `Suspense`.
**Solo `/panel` y `/auth/confirmar` son dinámicas**, que es lo correcto.

#### Dos fallos encontrados al probar el ciclo completo

Ninguno aparecía leyendo el código; salieron al hacer entrar → salir.

1. **La pista sobrevivía al cierre de sesión.** El middleware ya se había
   ejecutado para esa petición —con la sesión viva— y la navegación posterior
   la resuelve el enrutador del cliente sin volver a pasar por él. Se retira
   ahora explícitamente en la acción `cerrarSesion`.
2. **La cabecera no se enteraba.** Vive en el layout y no se desmonta al
   navegar, así que con `[]` como dependencia conservaba el valor del primer
   montaje. Ahora relee la pista en cada cambio de ruta.

Verificado el ciclo entero: sin sesión «Acceso socios» → tras entrar «Mi
panel» → tras salir «Acceso socios» y cookie retirada.

#### Tercer fallo: al entrar, la cabecera no cambiaba hasta irse del panel

Reportado tras probarlo a mano y **reproducido midiendo cada 200 ms**: el socio
entraba, el panel se pintaba correctamente —y la cabecera seguía ofreciendo
«Acceso socios» encima. Solo cambiaba al navegar a otra página.

La causa es la misma que la del fallo del cierre de sesión, vista desde el
otro lado: **la respuesta de una acción de servidor ya trae renderizado el
destino de su `redirect`**. El navegador no emite una petición nueva, así que
el middleware no vuelve a ejecutarse y la pista no llegaba a escribirse. El
`revalidatePath` no ayuda: revalida el contenido del servidor, no las cookies.

Corregido escribiendo la pista **en la propia acción** `iniciarSesion`, igual
que `cerrarSesion` ya la retiraba. Las dos operaciones viven ahora en
`marcarSesionAbierta()` / `marcarSesionCerrada()` (`session-hint.ts`), para que
el invariante quede en un solo sitio: *toda ruta que abra o cierre sesión
mantiene la pista*. El middleware sigue haciendo su parte —caducidad, cierre
en otra pestaña—, pero ya no es el único que la escribe.

`/auth/confirmar` no necesita el mismo arreglo: es un Route Handler que
responde con un `NextResponse.redirect` de verdad, y esa sí es una petición
nueva que pasa por el middleware.

**Medido sobre el build de producción, muestreando cada 60 ms:** en el primer
fotograma en que el panel está en pantalla la cabecera ya dice «Mi panel». No
existe ninguna ventana en la que el socio vea su panel y un botón invitándolo
a acceder.

> Queda a propósito un detalle: `/[tenant]/acceso` sigue siendo alcanzable
> escribiendo la URL con la sesión abierta. Redirigir desde ahí obligaría a
> leer la sesión en una página prerenderizada y la sacaría del CDN, que es
> justo lo que la cookie de pista existe para evitar. La cabecera ya no lleva
> a esa página, que era lo pedido.

#### Restos de voseo que quedaban vivos

El cambio a español neutro se había hecho sobre el contenido de los tenants,
pero **cinco textos vivían en el código de los componentes**, donde el repaso
anterior no miró: «pagás» y «recién al firmar» en la cabecera de Planes,
«Ahorrás» en la tarjeta de plan, «Contanos» en el formulario de contacto,
«necesitás» en el título por defecto de Servicios y «si preferís» en una
respuesta del FAQ de Mítico. Corregidos. El barrido queda como comando:

```bash
grep -rnE "(pagás|tenés|querés|podés|hacés|necesitás|preferís|ahorrás|contanos|sos|recién)"   apps/web/src apps/web/tenants --include=*.ts --include=*.tsx
```

Lección: el idioma de un producto enlatado no vive solo en la configuración.
Los valores por defecto de los componentes también son texto visible, y son
los que hereda el próximo gimnasio que no los sobrescriba.

#### El despliegue por Git falla, y no es culpa del código

Los dos últimos push a `feat/v2-public-site` crearon despliegues **Preview**
que Vercel marcó como fallidos. El código no tenía nada que ver: se clonó el
commit publicado en limpio, `npm install` + `next build`, y compiló las 26
páginas sin un error. El registro del despliegue lo confirma —`Build Completed
in /vercel/output`— y el fallo llega **después**, al subir la salida:

```
Cannot patch preview comments when immutable static file upload is enabled.
Upgrade to next@v16.3.0-canary.32 or newer to resolve this.
```

Es una incompatibilidad de la plataforma entre los **comentarios de preview**
(la barra de Vercel) y la subida inmutable de estáticos de Next. El consejo del
mensaje está caducado: el proyecto ya va en `16.3.4`, muy por delante de esa
canary. Solo afecta a Preview, porque los comentarios de preview solo existen
ahí; producción nunca los toca.

**Dos consecuencias, y conviene no confundirlas:**

1. El alias `gym-platform-alpha.vercel.app` **no se actualiza solo** con cada
   push. La vía que funciona hoy es `npx vercel deploy --prod --yes` desde
   `apps/web`, con la credencial que la CLI ya tiene guardada en la máquina.
2. Aunque se arregle lo anterior, los push a esta rama seguirían generando
   **Preview**, no producción: la Production Branch del proyecto no es
   `feat/v2-public-site`.

Para que el push despliegue solo hacen falta dos cosas del panel de Vercel, que
no se pueden tocar desde la sesión: **apagar Comments/Toolbar** en el proyecto
(Settings → General) y **poner la Production Branch** en la rama de V2.

> La CLI **sí** alcanza el equipo `zp-software-fast-solutions`; el conector MCP
> no. Son credenciales distintas: `vercel inspect` sobre un despliegue del
> equipo funcionó mientras el MCP seguía devolviendo 403. Si hace falta leer
> registros de build, la CLI es la vía.

#### Verificado en producción (2026-09-09, commit `b1310db`)

| Prueba | Resultado |
|---|---|
| 18 rutas públicas de los dos gimnasios | 200 |
| Tenant inexistente | 404 |
| `/mitico/panel` y `/aurora-fit/panel` sin sesión | 307 a su acceso |
| Pista `gp-sesion=1` falsificada | 307, no abre nada |
| `/auth/confirmar?gimnasio=<sitio externo>` | 307 a `/`, sin redirector abierto |
| Cabecera anónima | «Acceso socios» |
| Primer fotograma del panel tras entrar | «Mi panel» |
| Primer fotograma tras salir | «Acceso socios» y pista retirada |
| Cookies visibles a JavaScript | solo `gp-sesion=1`; ningún token |
| `service_role` / JWT en los 10 scripts servidos | ninguno |

## V2.1 · Operación del gimnasio 🔨 2026-09-09

Rama `feat/v2.1-operacion`, pensada para fusionarse en `feat/v2-public-site`
cuando esté completa.

El cliente pidió adelantar la parte administrativa **solo hasta el dashboard y
los reportes**: nada de altas de socios, cobros ni renovaciones todavía. Eso
marca el límite de esta fase y explica por qué el panel lee mucho y escribe
poco —lo único que escribe es la asistencia y la marca de leído de un aviso—.

### Lo que hay

| Pantalla | Ruta | Quién entra |
|---|---|---|
| Panel del socio | `/[tenant]/panel/socio` | quien no tiene `dashboard.read` |
| Resumen del gimnasio | `/[tenant]/panel/gimnasio` | `dashboard.read` |
| Panel de la plataforma | `/[tenant]/panel/plataforma` | `tenants.manage` |
| Control de asistencia | `/[tenant]/panel/asistencia` | `attendance.read` |
| Reportes | `/[tenant]/panel/reportes[/clave]` | `reports.read` + el permiso del reporte |
| Descarga CSV | `.../reportes/[clave]/csv` | las mismas guardas que la página |

`/[tenant]/panel` no pinta nada: reparte. **El destino sale de los PERMISOS,
no del nombre del rol.** Un producto enlatado va a querer un rol «encargado de
turno» que hoy no existe; si el enrutado mirase `rol === 'manager'` habría que
tocar código para darlo de alta, y con permisos el rol nuevo llega solo a su
sitio.

### Las capacidades son contratadas, no código

Las banderas `enableAttendance`, `enableQrAttendance`, `enableNotifications`,
`enableReports` y `enablePayments` estaban declaradas desde V1 «para que el
contrato no cambie de forma». Ahora se usan de verdad.

Mítico las tiene encendidas (plan `professional`); Aurora Fit sigue en
`starter` de prueba y las tiene apagadas. **Y apagada significa 404, no un
enlace escondido:** `/aurora-fit/panel/asistencia`, `/aurora-fit/panel/reportes`
y hasta la ruta de descarga CSV responden 404. Verificado.

La navegación del panel exige **las dos cosas**: capacidad contratada y permiso
de la persona. Son preguntas distintas —«¿lo compró este gimnasio?» y «¿le
toca a este usuario?»— y confundirlas es lo que acaba enseñando una sección
que el cliente no pagó.

### Decisiones que conviene no revisitar

- **Los gráficos son SVG propio, sin librería.** Las habituales pesan entre 40
  y 150 KB, arrastran D3 y obligan a convertir el dashboard en componente de
  cliente. Aquí hacen falta rectángulos con una escala lineal. Cada gráfico
  lleva su alternativa textual —una `<table>` real oculta visualmente— porque
  un gráfico sin cifras leíbles es un adorno para quien usa lector de pantalla.
- **El QR SÍ usa librería** (`qrcode-generator`, versión exacta, sin
  dependencias) y la regla de V1 se respeta igual: **se ejecuta solo en el
  servidor**, de ahí sale una matriz de booleanos y **no entra en el paquete
  del navegador** —comprobado grepeando los chunks—. Escribir un codificador
  QR son ~400 líneas de aritmética en GF(256), y equivocarse produce un código
  que se ve perfecto y no escanea; sin decodificador con el que probarlo, ese
  fallo se descubre en el mostrador.
- **El aviso de vencimiento NO se guarda.** Es derivado de `end_date`, igual que
  `effective_status`. Guardarlo obligaría a un proceso diario y permitiría que
  la fila contradiga a la fecha. Solo se persisten los avisos que alguien
  escribe a mano, que son los únicos que no se pueden deducir.
- **El QR del socio lleva un identificador opaco y rotable**, no su id ni su
  nombre. Quien fotografíe la pantalla de un socio consigue marcar la
  asistencia DE ESE SOCIO, nada más, y deja de servir en cuanto se rota.
- **Un código inexistente y uno de otro gimnasio dan la misma respuesta.**
  Distinguirlos convertiría el mostrador en un comprobador de qué códigos
  existen en la instalación.
- **La entrada de un socio con membresía vencida SE REGISTRA igual**, y lo que
  cambia es el aviso al mostrador. Quien llegó, llegó: no registrarlo sería
  falsear la asistencia.
- **La exportación a PDF es la impresión del navegador**, con hojas de estilo
  de impresión preparadas. Un generador de PDF en el servidor añadiría cientos
  de kilobytes para producir un archivo peor maquetado.
- **El CSV cita todos los campos y lleva BOM de UTF-8.** Sin comillas, un
  «Pérez, Juan» parte la fila en dos columnas; sin BOM, Excel en Windows abre
  el archivo con la página de códigos del sistema y los acentos salen rotos.
  Es el detalle que decide si el reporte se usa o se descarta.
- **«Hoy» se calcula en la zona horaria DEL GIMNASIO**, no del servidor. En La
  Paz (UTC-4) toda entrada posterior a las 20:00 caería al día siguiente medida
  en UTC. La conversión vive en las vistas, que es el único sitio donde esa
  zona se conoce sin adivinarla.

### Cinco defectos que aparecieron PROBANDO, no leyendo el código

Ninguno se veía en una revisión del código. Los cinco salieron al usar la
aplicación o al medir la base con sesiones simuladas.

**1. Dar de alta un socio nuevo reventaba siempre.** El disparador que emite el
identificador de check-in usaba `gen_random_bytes`, de pgcrypto, que en Supabase
vive en el esquema `extensions`; el `search_path` fijado de la función no lo
alcanza. La siembra inicial funcionó porque corrió con el search_path por
omisión. **No se arregló añadiendo `extensions` al search_path** —fijarlo es
justo lo que protege a una función `SECURITY DEFINER`— sino dejando de depender
de la extensión: `gen_random_uuid()` está en el núcleo desde PostgreSQL 13.

**2. Una fila podía tener un socio de OTRO gimnasio.** Recepción de Mítico
consiguió insertar una asistencia con `tenant_id` = Mítico y `customer_id` = un
socio de Aurora. Las políticas comprueban «¿puedes escribir en ESE gimnasio?»
pero nada comprobaba que el socio fuera de ese gimnasio. No es una fuga —no
puede leer al socio ajeno y la fila no la ve nadie— pero rompe el invariante
sobre el que se apoya el modelo entero. Corregido con **claves foráneas
compuestas** `(tenant_id, customer_id) → customers(tenant_id, id)` en
`attendance_records`, `memberships`, `payments` y `check_in_tokens`: lo hace
cumplir el motor, no una política que alguien pueda escribir mal. Es el mismo
argumento por el que el aislamiento vive en RLS y no en el código.

**3. Al cerrar la ventana modal la página quedaba congelada.** El bloqueo del
desplazamiento del fondo estaba en un `useEffect` atado al estado de React. El
`<dialog>` tiene su propio estado en el DOM y los dos se desincronizan; además
**el evento `close` no se dispara en todos los entornos** —se comprobó con un
`<dialog>` sintético en el navegador de las pruebas, donde no llega nunca—.
Cuando no llega, la limpieza no corre y el `overflow: hidden` se queda para
siempre. Ahora el bloqueo es **una regla de CSS**, `html:has(dialog[open])`,
que se evalúa sola: no hay dos fuentes de verdad que puedan discrepar.

**4. El botón de acceso navegaba en vez de abrir la ventana.** El disparador es
un `<Link>` de Next a propósito —para que `/acceso` siga funcionando sin
JavaScript y en otra pestaña—, y su manejador vive en el ancla, que es el
destino del evento. En la fase de burbujeo la navegación ya está lanzada y el
`preventDefault()` llega tarde. Se intercepta en **fase de captura**.

**5. El reporte de pagos salía vacío y el de membresías mentía.** El de pagos
incrustaba `customers(...)` y PostgREST resuelve esos embebidos por la clave
foránea: al añadir la clave compuesta del punto 2 pasaron a existir DOS
relaciones, no pudo elegir y devolvió error —que el código trataba como «cero
filas»—. El de membresías se servía desde `v_expiring_memberships`, limitada a
±30 días, mientras su descripción decía «membresías vendidas»: enseñaba 7 de
10 sin avisar. Los dos tienen ahora su propia vista.

**Y un número que mentía:** el panel de plataforma decía «0 planes
publicados», cuando lo cierto era «no puedo verlos» —el administrador no tiene
`plans.read` y las vistas corren con derechos de invocador—. Se quitó el dato
en vez de ampliarle el alcance: el precio de los paquetes es configuración
comercial del cliente.

### Aislamiento verificado sobre las tablas nuevas

Con sesiones simuladas (`request.jwt.claims`), por rol:

| Prueba | Socio | Recepción | Gerencia | Super admin |
|---|---|---|---|---|
| Tokens de check-in visibles | solo el suyo | los de su gimnasio | los de su gimnasio | 0 |
| Token de OTRO socio por id exacto | 0 filas | — | — | — |
| Token de un socio de OTRO gimnasio | — | 0 filas | 0 filas | 0 filas |
| Avisos visibles | solo los de socios | todos | todos | 0 |
| Registrar asistencia | bloqueado | sí | sí | bloqueado |
| Registrar asistencia de otro gimnasio | — | bloqueado | bloqueado | — |
| Arrastrar un socio ajeno al propio gimnasio | — | bloqueado (23503) | bloqueado (23503) | — |
| Publicar un aviso | bloqueado | bloqueado | sí | bloqueado |
| Marcar leído en nombre de otro | bloqueado | — | — | — |
| Crearse un token de check-in | bloqueado | — | — | — |
| Socios / pagos / asistencias | los suyos | los de su gimnasio | los de su gimnasio | **0 / 0 / 0** |
| Descarga CSV de cualquier reporte | 403 | **403** | 200 | 403 |

Recepción obtiene **403 en las cinco descargas** aunque pueda leer casi todos
esos datos en pantalla: la capacidad de reportes es una cosa distinta de la de
consulta.

> ⚠️ **Dos falsos positivos propios, anotados para no repetirlos.**
> El primero: una escritura «en nombre de otro» pareció PERMITIDA porque el
> subselect que buscaba al otro usuario no devolvía filas bajo RLS —el INSERT
> afectaba a cero filas y no fallaba—. **Los identificadores del ataque se
> resuelven ANTES de cambiar de rol y se usan como literales.**
> El segundo: dos roles medidos en una sola sentencia con `UNION ALL` dieron
> ceros en el segundo, porque las funciones de contexto son `STABLE` y
> PostgreSQL cachea su resultado dentro de la misma sentencia. **Cada rol se
> mide en su propia llamada.**

### Verificado

| Prueba | Resultado |
|---|---|
| `tsc --noEmit` · `next build` · `npm audit` | limpio · 26 páginas · 0 vulnerabilidades |
| Sitio público tras añadir el panel | sigue estático; solo `/panel/*` y `/auth/confirmar` son dinámicas |
| Dependency Rule y grep del ADR 0003 | sin hallazgos |
| `service_role` o codificador QR en los chunks | no aparecen |
| Check-in: socio al día | «Entrada registrada · le quedan N días» |
| Check-in: mismo socio dos veces | «Ya tenía su entrada de hoy» (unicidad de la base) |
| Check-in: membresía vencida | queda registrada + aviso de renovación |
| Check-in: código inexistente o mal formado | misma respuesta neutra; **el código tecleado se conserva** para corregirlo |
| Ventana modal: abrir, X, Escape, reabrir | el bloqueo del fondo sigue exactamente al `<dialog>` |
| Acceso desde la cabecera | abre ventana, no navega; el formulario baja al abrir (+2 KB) |
| JS inicial del sitio público | 144 KB medidos en producción |
| Móvil 375 px | sin desborde horizontal; las tablas se desplazan dentro de su caja |
| `get_advisors(security)` | solo el aviso de plan Pro ya aceptado |

### Deuda que deja esta fase

- El pie de página de V1 tiene enlaces de 36 px de alto, por debajo de los 44
  que pide §2.7. Es anterior a V2.1 y no se tocó aquí.
- La prueba de aislamiento sigue siendo manual. Con las tablas nuevas, el
  argumento de automatizarla en CI es más fuerte que antes.
- Las migraciones siguen viviendo solo en el servidor (§47).
- Los datos de demostración se sembraron a mano: 143 asistencias de 90 días,
  35 cobros de 6 meses, 4 avisos y códigos `MF-001..010`. Se borraron tres
  cobros fechados en el futuro que venían de una siembra anterior y hacían que
  el reporte de pagos empezara con dinero que nadie había pagado.

## V2.2 · Gestión de socios y cobro por QR 🔨 2026-09-10

Rama `feat/v2.2-gestion`, creada sobre `feat/v2.1-operacion`. El cliente
amplió el alcance: ahora sí se escriben socios, membresías y cobros.

### Lo que hay

| Pantalla | Ruta | Capacidad + permiso |
|---|---|---|
| Socios (lista con filtros rápidos) | `/[tenant]/panel/socios` | `enableMemberManagement` + `customers.read` |
| Alta de socio con plan, cobro y QR | `.../socios/nuevo` | + `customers.create` |
| Ficha completa (editar, vender, corregir, archivar) | `.../socios/[id]` | lectura para todo el personal; escritura según permiso |
| Bandeja de comprobantes + ZIP | `/[tenant]/panel/comprobantes` | `enablePayments` + `payments.read` |
| QR de cobro del banco | `/[tenant]/panel/cobros` | `enablePayments` + `settings.manage` |
| Datos e imagen públicos del QR | `/[tenant]/pago/datos`, `/[tenant]/pago/qr` | `enablePayments` (sin sesión) |
| Reportes híbridos (9) | `/[tenant]/panel/reportes[/clave]` | filtros por periodo, estado, plan, método, origen, rol |

- **Check-in con cámara**: botón «Cámara» en recepción y en la tarjeta del
  dashboard. `BarcodeDetector` nativo y, si no existe, `jsqr` cargado solo al
  abrir la cámara. La política `camera=(self)` lo permite solo en el propio
  origen.
- **Racha** real (`core/domain/operations/streak.ts`): los días que el gimnasio
  cierra según su horario no la cortan, y hoy sin entrada todavía tampoco.
- **Panel del socio**: plan con nombre y barra de vigencia, «Mostrar QR» en
  grande, calendario de racha, información personal, pagar con QR y subir
  comprobante, estado de sus comprobantes.
- **Tarjetas funcionales en todas partes**: cada `StatCard` es enlace o botón
  que abre un modal. Las filas de historial abren la ficha del socio.
- **Asistencia**: mapa de calor día × hora, reparto por método, por hora y
  por día.
- **Impresión a PDF sin el pie del sitio**: pie, botón de WhatsApp y enlace de
  salto llevan `data-print="hide"`.

### El flujo del cobro por QR

1. Gerencia sube la imagen del QR del banco con su vencimiento en `/panel/cobros`.
2. En `/planes`, cada paquete dice **«Pagar con QR»**: abre un modal con el QR,
   el importe y los pasos. Un QR vencido responde **410** y no se muestra.
3. El socio paga y sube la captura desde su panel (`?pagar=<código de plan>`
   preselecciona el paquete). Recepción puede adjuntarla también, incluso al
   dar de alta a alguien que pagó por QR.
4. Recepción o gerencia **aprueba** → `revisar_comprobante` crea la membresía
   (a continuación de la vigente, si la hay) y el pago en una sola transacción.
   Ese pago es el que suman los dashboards y reportes.
5. Descarga en un **ZIP** de los comprobantes filtrados (hoy, ayer, rango,
   estado, origen, método) con un `resumen.csv`, para enviarlo al titular del QR.

### Decisiones que conviene no revisitar

- **Recepción crea, gerencia corrige.** La restricción vive en los permisos de
  la base (`customers.update`, `memberships.update` retirados a recepción), no
  en ocultar botones. Medido: el UPDATE de recepción afecta 0 filas.
- **La membresía pagada por QR se activa al aprobar, no al subir la captura.**
  Una captura es una afirmación; el cobro es un hecho que alguien verificó.
- **Las operaciones de varias tablas son RPC `SECURITY INVOKER`.** Atómicas y
  bajo RLS: la función no concede nada que la sesión no tuviera.
- **El ZIP se arma en el navegador.** Vercel corta respuestas de más de 4,5 MB
  y veinte capturas lo superan. Las imágenes se reducen a 1600 px antes de
  subir, y el servidor verifica la firma binaria (no el `Content-Type`).
- **El QR del banco no se versionó**: se sube desde el panel. Es dato del
  cliente, con vencimiento, y cambia sin desplegar.
- **La cuenta se vincula a la ficha solo con correo CONFIRMADO** y un único
  candidato. Sin confirmar, cualquiera se registraría con el correo de un
  socio y vería su ficha.
- **Capacidad contratada**: `enableMemberManagement` (nueva, `false` por
  omisión) y `enablePayments`. Apagadas, las rutas responden 404 y la
  navegación no las ofrece. Aurora Fit sigue sin ellas.

### Verificado

| Prueba | Resultado |
|---|---|
| `tsc --noEmit` · `next build` · `npm audit` | limpio · 44 páginas · 0 vulnerabilidades |
| Dependency Rule, grep del ADR 0003 y de voseo | sin hallazgos |
| `get_advisors(security)` | solo el aviso de plan Pro ya aceptado |
| Recepción da de alta con plan | ficha, código `MF-011`, QR y membresía |
| Recepción edita socio / alarga membresía | 0 filas |
| Recepción finge un comprobante «subido por el socio» | bloqueado (42501) |
| Socio ve el comprobante de otro | 0 filas |
| Socio aprueba un comprobante / se lo inserta aprobado / sube por otro / da de alta | bloqueados |
| Gerencia aprueba | membresía + pago; aparece en `v_payments_report` |
| Revisar dos veces el mismo comprobante | bloqueado (`comprobante_ya_revisado`) |
| Marcar «aprobado» con UPDATE directo, sin pago | bloqueado por `payment_receipts_aprobado_con_pago` |
| `/mitico/planes` | 13 botones «Pagar con QR»; el modal abre centrado |
| `/aurora-fit/pago/datos` | `no_disponible` (capacidad apagada) |
| Rutas de gestión sin sesión | 307 al acceso |

Las pruebas de escritura corrieron dentro de un bloque que termina en
excepción: **no dejaron filas**.

### Desplegado en producción (2026-09-10, commit `406dd68`)

`npx vercel deploy --prod --yes` desde `apps/web` → `READY`, alias
`gym-platform-alpha.vercel.app` actualizado. La CLI volvió a tener sesión
(`vercel whoami` → `zapasoftwarefastsolutions-1320`); el token que había
caducado en V2.1 ya no bloquea.

| Prueba sobre el alias | Resultado |
|---|---|
| Sitio público de los dos gimnasios | 200 |
| `/mitico/pago/datos` | 200, `disponible: false` (falta subir el QR) |
| `/mitico/pago/qr` sin QR subido | 404 |
| `/aurora-fit/pago/datos`, `/aurora-fit/panel/socios`, `.../comprobantes` | 404 (capacidades apagadas) |
| Las 7 rutas de gestión de Mítico sin sesión | 307 al acceso |
| `Permissions-Policy` | `camera=(self)` |
| Pie del sitio en `/mitico/planes` | `data-print="hide"` |
| `service_role` en los scripts servidos | no aparece |

> ⚠️ **No se recorrieron en el navegador las pantallas con sesión.** Iniciar
> sesión escribiendo contraseñas no lo hace el asistente, ni con cuentas de
> demostración. Los permisos y el flujo están medidos en la base; la revisión
> visual de socios, comprobantes, cobros y paneles con sesión queda para una
> persona.

### Pendiente de esta fase

- **Subir el QR real del banco** en `/mitico/panel/cobros` con su vencimiento
  (la imagen del cliente vence el 10/09/2028). Mientras no esté, el modal de
  pago dice que se pide en recepción.
- **Dos archivos huérfanos de prueba** en el bucket `comprobantes`
  (`.../ba80b8c5.../rls-recepcion-1789049433.png` y
  `.../bdd26a0b.../rls-prueba-1789049520.png`, 5 KB cada uno). Supabase impide
  borrarlos por SQL (`storage.protect_delete`); se borran desde el panel de
  Storage.
- Datos de demo: se añadieron entradas diarias de Juan Pérez del 24/08 al
  10/09 (salvo domingos) para que la racha tenga algo que enseñar.

---

### V2 · Cuentas de demostración

Una por rol. **Todas verificadas contra el endpoint de autenticación**, no solo
insertadas en la base.

| Rol | Correo | Contraseña |
|---|---|---|
| Super administrador | `admin@gymplatform.bo` | `Demo.Super.2026` |
| Gerente (Mítico) | `gerencia@miticofitness.com` | `Demo.Manager.2026` |
| Recepcionista (Mítico) | `recepcion@miticofitness.com` | `Demo.Receptionist.2026` |
| Socio (Mítico) | `juan.perez@demo.miticofitness.com` | `Demo.Mitico.2026` |

Los otros nueve socios usan el mismo patrón `nombre.apellido@demo.miticofitness.com`
con `Demo.Mitico.2026`.

**Alcance real de cada rol, medido con la sesión simulada:**

| | Super admin | Gerente | Recepción | Socio |
|---|---|---|---|---|
| Socios visibles | 0 | 10 | 10 | 1 (el suyo) |
| Pagos visibles | 0 | 10 | 10 | 1 (el suyo) |
| Usuarios visibles | 15 | 14 | 1 | 1 |
| Gimnasios | 2 | 1 | 1 | 1 |
| Cobrar | no | sí | sí | no |
| Configuración | no | **sí** | **no** | no |
| Administrar gimnasios | **sí** | no | no | no |

Dos cosas que confirman el diseño: el **super administrador no ve un solo socio
ni un solo pago** —administrar la plataforma no es leer los datos personales de
los clientes de un gimnasio (§39, §112)— y **recepción no llega a la
configuración** ni al listado de personal, solo a su propia ficha.

> ⚠️ **No existe todavía interfaz de gestión.** Estas cuentas entran y sus
> permisos se aplican en la base, pero la única pantalla privada es
> `/[tenant]/panel`, pensada para el socio. Gerente y recepción verán el aviso
> de «cuenta sin ficha vinculada», y el super administrador el de «cuenta sin
> gimnasio», porque ambos son literalmente ciertos. El panel de gestión es la
> siguiente fase.

> ⚠️ **Contraseñas de demostración, con patrón predecible.** Sirven para
> enseñar el producto en esta rama. Antes de cualquier uso real hay que
> borrarlas: un `Demo.Manager.2026` en un gimnasio con datos de socios reales
> es una cuenta de gerente regalada.

#### Limitación aceptada, no es deuda

El analizador de Supabase marca **«Leaked Password Protection Disabled»**. Se
revisó: es una función del **plan Pro**, y el proyecto está en el plan gratuito.
Queda **descartada a conciencia**, no pendiente.

Consecuencia real: no se comprueban las contraseñas contra HaveIBeenPwned, así
que un socio puede elegir una que ya apareció en una filtración. Lo que sí hay
es el mínimo de 8 caracteres de Supabase y su limitador de intentos, que se
comprobó funcionando. Si el proyecto pasa a Pro, activarlo es un interruptor.

> No volver a levantarlo como hallazgo en cada auditoría: está decidido.

#### Verificación previa al push (2026-09-09)

Se repitió todo sobre una instalación limpia (`npm ci` desde el lockfile):
typecheck, build de 25 páginas, `npm audit` en 0, Dependency Rule y grep del
ADR 0003 sin hallazgos. Base: 12 tablas, **todas** con RLS, 34 políticas, cero
tablas desprotegidas.

**Defecto encontrado y corregido en esa pasada:** con sesión de un socio de
Mítico, `/aurora-fit/panel` respondía **200** y pintaba sus datos bajo la marca
del otro gimnasio. No era fuga —RLS aguantó y no se expuso ni un dato de
Aurora— pero era una página mintiendo sobre dónde estaba el usuario, y ese
descuido es el que se convierte en fuga cuando alguien añade una consulta nueva
dando por hecho que la ruta ya está validada. Ahora el panel compara el tenant
del perfil con el de la ruta y redirige al propio.

---

## 4. Lista de pendientes

### 🔴 Prioridad alta — antes de sumar features

0. **Deuda de la auditoría del 2026-09-09.** Cerrada en su mayor parte el
   mismo día; queda lo que sigue:
   - ✅ `publicSite` ya se aplica como guarda en el layout del tenant y en
     `loadTenantPage`. Apagarla hace 404 el sitio completo del gimnasio.
     Verificado apagándola en Aurora sin afectar a Mítico.
   - ✅ `next` pasa a versión exacta `16.3.4`. No queda ningún caret.
   - ✅ Deriva de documentación resuelta: se escribió
     `docs/architecture/security-headers.md` y se corrigió la referencia a
     `lib/page-guards.ts`.
   - ✅ `dynamicParams = false`: un slug fuera del registro responde 404 en vez
     de intentar resolverse en cada petición.
   - ⚠️ **Pendiente:** `DEFAULT_FEATURE_FLAGS` dice en su comentario que toda
     flag nace en `false`, pero tiene 10 en `true` y **se usa como base de
     spread** en los dos tenants. Cuando la configuración llegue de la base,
     un `{ ...DEFAULT, ...remoto }` con respuesta parcial encendería
     capacidades por omisión. Contradice el fallar cerrado.
   - ⚠️ **Pendiente:** `DEFAULT_TENANT_SLUG` cae a `'mitico'` hardcodeado en
     `tenant.registry.ts`. Sobrevive al grep del ADR 0003 solo porque el grep
     excluye ese archivo.
   - ⚠️ **Pendiente:** `/[tenant]/nosotros` no tiene guarda de feature flag: es
     la única ruta que no se puede desactivar por configuración.

1. **Abrir el PR de V1** y fusionar a `main`:
   https://github.com/ZPSoftwareFastSolutions/SoftwareGym/compare/main...feat/v1-public-site
2. **CI en GitHub Actions**: `typecheck`, `build`, `npm audit` y el grep del
   ADR 0003 en cada PR. Sin esto, las reglas de arriba se degradan solas.
3. **Tests.** Empezar por lo que más duele si se rompe: `tenant.validator`,
   `build-theme`, `visibleNavigation`, y un smoke test de las 9 rutas por tenant.
4. **Que el push despliegue solo.** El repo ya está conectado, pero los
   despliegues Preview fallan por los comentarios de preview y la rama de V2
   no es la Production Branch. Dos interruptores del panel de Vercel; detalle
   arriba, en «El despliegue por Git falla». Hoy la vía es
   `npx vercel deploy --prod --yes`.

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

### 🟠 V2 — lo siguiente, en este orden

A. **Exportar las migraciones al repositorio** (`supabase link` + `db pull`).
   Hoy el esquema vive solo en el servidor.
B. **Automatizar la prueba de aislamiento multi-tenant** en CI. Es el único
   control que no se degrada con el tiempo si corre solo.
C. **Login y sesión** con Supabase Auth: cookie `HttpOnly` vía SSR, no token
   en `localStorage`.
D. **App privada** (`apps/admin` o rutas protegidas en `apps/web`): clientes,
   membresías con renovación, pagos, asistencia y dashboard.
E. **Escritura de `audit_log`** desde los casos de uso que mutan datos.
F. **Sustituir el registro estático de tenants** por la tabla `tenants`: cambia
   una línea del composition root, que para eso el puerto es asíncrono.

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
| **Vercel** | Equipo `zp-software-fast-solutions` (id `team_isXk9iHT5amXqAUJlB27m9uf`) · cuenta personal `zapasoftwarefastsolutions-1320` · proyecto `gym-platform` (`prj_3Mm0F8ZG9Whii4GbFUffyodTbFFy`) · Root Directory `apps/web` · alias `gym-platform-alpha.vercel.app` |
| **GitHub** | `ZPSoftwareFastSolutions/SoftwareGym` (público) · rama por defecto `main` |

> **Autenticación de Git en esta máquina.** Credential Manager guarda de forma
> global la cuenta `Riceious`, que no tiene permiso de escritura en este
> repositorio. Se corrige con configuración **local**:
> `credential.username = ZPSoftwareFastSolutions` en `.git/config`. Los demás
> repositorios de la máquina no se ven afectados. Si aparece
> `Permission denied to Riceious`, esa configuración local se perdió.
>
> **El push funciona una vez que Credential Manager tiene la credencial.**
> El 2026-09-09 falló primero —la configuración local `credential.username` se
> había perdido y GCM no tenía guardada la contraseña, así que abría un diálogo
> interactivo que la sesión no puede atender; con `GIT_TERMINAL_PROMPT=0`
> fallaba con `could not read Password`—. Tras autenticar una vez desde una
> terminal propia, la credencial queda en caché y el push desde la sesión pasa
> sin intervención. Se comprobó publicando `feat/v2-public-site`.
>
> Si vuelve a colgarse, es que la caché caducó: basta con hacer un push manual
> una vez para renovarla.
>
> La lectura sí funciona sin credenciales porque el repositorio es público:
> `git ls-remote` responde, lo que puede dar la falsa impresión de que el
> acceso de escritura está resuelto.

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
| **Vercel** | ⚠️ Conectado, sin alcance | Ver la nota de abajo |
| **GitHub** | ❌ Falló al conectar | PRs y API. Mientras tanto, git por CLI |
| **Browser** | ✅ Conectado | Verificación visual y responsive de los sitios |
| **Notion** | Sin usar | — |
| **Terminal** | ✅ Conectado | Lectura de la terminal del usuario |

*n8n no está conectado. Si se incorpora para automatizar avisos de vencimiento
de membresía (V2), documentarlo aquí.*

> **Vercel: el token no alcanza el equipo.** Durante días se concluyó «no hay
> acceso» porque `list_teams` devolvía `[]` y `get_project` daba 403. El
> diagnóstico real apareció al probar con la cuenta personal
> `zapasoftwarefastsolutions-1320`, que **sí** lista el proyecto:
>
> ```
> Not authorized: Trying to access resource under scope
> "zp-software-fast-solutions". You must re-authenticate to this scope.
> ```
>
> El token llega a la cuenta personal pero no al **equipo** donde vive el
> proyecto. Al reconectar el conector hay que marcar explícitamente el equipo
> `zp-software-fast-solutions`, no solo la cuenta personal.
>
> Lección: un `list_teams` vacío no significa «sin permisos», significa «este
> token no ve equipos». No es lo mismo, y confundirlo costó tres sesiones.
>
> **El despliegue NO depende de eso.** Vercel está conectado a GitHub y publica
> solo en cada push a `feat/v2-public-site`, con el alias
> `gym-platform-alpha.vercel.app` apuntando a esa rama. El conector MCP sirve
> para leer logs de build y gestionar el proyecto, no para publicar: mientras
> siga sin alcance, la vía es empujar a la rama.

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
