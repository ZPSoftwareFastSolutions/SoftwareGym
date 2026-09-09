# CLAUDE.md — Memoria y reglas de trabajo

> Archivo de contexto persistente del proyecto. Claude Code lo carga
> automáticamente al abrir una sesión en este repositorio.
>
> **Regla de mantenimiento:** este archivo se actualiza al cerrar cada avance
> importante (una feature completa, un cambio de arquitectura, un despliegue) y
> al final de cada sesión. Las secciones **3. Estado actual** y **4. Pendientes**
> son las que cambian; las demás solo cuando cambia una decisión de fondo.
>
> **Última actualización:** 2026-09-09 · V2 con login y registro funcionales,
> ubicación en La Paz y textos en español neutro. Rama
> `feat/v2-public-site`.

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
V2   🔨  Autenticación, clientes, membresías, pagos, dashboard, auditoría
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

**Rama:** `feat/v2-plataforma` (parte de `feat/v1-public-site`)
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
