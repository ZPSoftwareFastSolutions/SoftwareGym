# MÍTICO GYM — Landing de Mítico Fitness

**Sitio web de Mítico Fitness (La Paz, Bolivia).** Una landing informativa,
estática y sin base de datos, construida sobre GYM PLATFORM, el software
enlatado vertical para gimnasios de **ZP Software Fast Solutions**.

> **Esta rama (`miticogym-v1`) es SOLO la vitrina.** No hay sistema de socios,
> ni inicio de sesión, ni roles, ni base de datos. No están apagados: no
> existen. El motivo y sus consecuencias, en
> [ADR 0012](docs/architecture/adr/0012-landing-sin-base-de-datos.md).
>
> El sistema completo —panel de gestión, socios, asistencia, cobros, clases,
> reservas y administración— sigue vivo en la rama `feat/goldgym-v1` y en las
> anteriores. Aquí no se ha perdido nada; se ha dejado fuera.

---

## Qué publica

Diez páginas, todas prerenderizadas en el build y servidas como archivos:

| Ruta | Qué contiene |
|---|---|
| `/mitico` | Portada: quiénes somos, servicios, sedes, paquetes y clases |
| `/mitico/nosotros` | El gimnasio y su forma de entrenar |
| `/mitico/servicios` | Entrenamiento personalizado, clases, nutrición, suplementación |
| `/mitico/planes` | Tarifario oficial completo y las seis rutinas de superhéroes |
| `/mitico/sucursales` | Las dos sedes con su mapa, horario y cómo llegar |
| `/mitico/clases` | Catálogo de clases dirigidas y su agenda semanal por sede |
| `/mitico/instalaciones` | Las áreas de cada sucursal, en pestañas |
| `/mitico/galeria` | Fotografías (hoy, composiciones de marca) |
| `/mitico/horarios` | Horario de atención por sede y agenda de clases |
| `/mitico/contacto` | Teléfonos, redes, mapas y formulario a WhatsApp |

La raíz `/` redirige a `/mitico`. Cualquier otra ruta responde 404 real.

---

## La prueba de aceptación sigue siendo la misma

> **Dar de alta un gimnasio son dos pasos: crear su archivo de configuración y
> registrarlo. Si hiciera falta tocar un componente, una ruta, una hoja de
> estilo o una consulta, el producto habría dejado de ser enlatado.**

Quitar el panel y la base no la rompe: ningún archivo de `apps/web/src` nombra a
Mítico. Todo lo que distingue a este gimnasio —marca, textos, paquetes, sedes,
horarios y clases— vive en un solo archivo:
[`apps/web/tenants/mitico.tenant.ts`](apps/web/tenants/mitico.tenant.ts).

```bash
# Ningún slug de cliente en el código de la aplicación (salida vacía)
grep -rn "mitico" apps/web/src --include=*.ts --include=*.tsx \
  | grep -v "tenant.registry" | grep -vE ':\s*(\*|//|/\*)'
```

---

## Arranque rápido

```bash
cd apps/web
npm install
npm run dev
```

Abre http://localhost:3000 — redirige a `/mitico`. **No hace falta ninguna
variable de entorno**: no hay servicios externos que configurar.

### Comprobaciones antes de commitear

```bash
cd apps/web
npm run typecheck
npm test        # dominio puro + validador de configuración (24 pruebas)
npm run build   # valida además la configuración del gimnasio
npm audit
```

Una configuración inválida **rompe el build**, no la página en producción: sin
panel ni base de datos, el validador es la única red entre una errata y lo que
se publica.

---

## Cómo se cambia el contenido

Todo está en `apps/web/tenants/mitico.tenant.ts`, y cada cambio se publica
desplegando. No hay panel donde editarlo: es el intercambio que se compra al no
tener base de datos (ADR 0012).

| Qué quieres cambiar | Dónde |
|---|---|
| Precios y paquetes | `content.planGroups` |
| Rutinas de entrenamiento personalizado | `content.trainingPlans` |
| Horario de atención de una sede | `content.branches.sedes[].week` |
| Clases y sus horarios | `content.classes` |
| Qué áreas hay en cada sede | `content.facilities[].branchCode` |
| Qué secciones existen | `features` |
| Etiquetas y orden del menú | `navigation` |
| Colores y tipografía | `branding` |

Los datos oficiales del cliente de los que sale el contenido actual están
citados en la cabecera de ese archivo, junto con **lo que falta por confirmar**.

---

## Estructura

```text
apps/web/
  tenants/mitico.tenant.ts        LO ÚNICO propio del cliente
  src/
    app/[tenant]/…                Las diez páginas, genéricas
    core/domain/                  Catálogo, sedes, horarios, clases (puro, sin I/O)
    core/application/             Casos de uso y el único puerto que queda
    infrastructure/               Registro de gimnasios y validador de configuración
    presentation/                 Secciones, patrones y átomos de interfaz
  tests/                          Pruebas de dominio y del validador
docs/                             ADR, arquitectura y runbook de despliegue
```

---

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — descripción completa y vigente de esta rama.
- [ADR 0012](docs/architecture/adr/0012-landing-sin-base-de-datos.md) — por qué
  esta rama no tiene base de datos y qué ADR previos deja sin efecto.
- [ADR 0003](docs/architecture/adr/0003-configuracion-como-dato.md) — la regla
  que sostiene el producto enlatado.
- [`docs/runbooks/despliegue.md`](docs/runbooks/despliegue.md) — cómo se publica.

Si un documento contradice a `CLAUDE.md`, manda `CLAUDE.md`.
