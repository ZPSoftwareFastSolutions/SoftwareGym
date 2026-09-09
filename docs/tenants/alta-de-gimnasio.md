# Cómo dar de alta un gimnasio

Procedimiento operativo para incorporar un cliente nuevo a la plataforma.

**Tiempo estimado:** entre 30 y 90 minutos, según cuánto contenido haya
entregado el cliente. Sin escribir una línea de código de aplicación.

---

## Paso 1 — Crear el archivo de configuración

```bash
cp apps/web/tenants/mitico.tenant.ts apps/web/tenants/nuevo-gym.tenant.ts
```

El nombre del archivo usa el **slug**: minúsculas, sin acentos, con guiones.
Es el que aparecerá en la URL (`/nuevo-gym`) y no debería cambiar nunca:
cambiarlo rompe todos los enlaces publicados y la indexación acumulada.

Renombrá la constante exportada:

```ts
export const nuevoGymTenant: TenantConfig = { ... };
```

## Paso 2 — Registrarlo

`apps/web/src/infrastructure/tenants/tenant.registry.ts`

```ts
import { nuevoGymTenant } from '@tenants/nuevo-gym.tenant';

export const TENANT_REGISTRY: readonly TenantConfig[] = [
  miticoTenant,
  auroraFitTenant,
  nuevoGymTenant,        // ← nuevo
];
```

**Eso es todo el código.** El resto es rellenar datos.

---

## Paso 3 — Completar la configuración

### 3.1 Identidad

```ts
slug: 'nuevo-gym',
name: 'Nuevo Gym',                     // nombre comercial visible
legalName: 'Nuevo Gym S.R.L.',         // razón social, para el pie
tagline: 'Tu frase de marca',
domains: ['nuevogym.com', 'www.nuevogym.com'],
```

`domains` alimenta la resolución por host. Aunque todavía no haya dominio
propio, declaralo: cuando llegue, no hay que tocar nada.

### 3.2 Marca

Pedile al cliente su manual de marca. Si no lo tiene, tomá los colores de su
logo y su local.

```ts
branding: {
  mode: 'dark',                        // 'dark' | 'light'
  logo: { wordmark: 'Nuevo', subMark: 'Gym', monogram: 'N' },
  palette: { /* los 11 colores */ },
  typography: {
    display: 'var(--font-display-condensed), "Arial Narrow", sans-serif',
    body: 'var(--font-body-sans), system-ui, sans-serif',
    scale: 'editorial',                // compact | balanced | editorial
    uppercaseHeadings: true,
    headingTracking: '0.02em',
  },
  shape: {
    corners: 'soft',                   // sharp | soft | rounded | pill
    surfaceStyle: 'glass',             // flat | glass | elevated
    glowIntensity: 1,                  // 0 apaga el resplandor
    showGrid: true,
  },
},
```

Fuentes disponibles hoy (declaradas en `app/layout.tsx`):

| Variable | Familia | Carácter |
|---|---|---|
| `--font-display-condensed` | Bebas Neue | Deportivo, condensado, caja alta |
| `--font-display-serif` | Fraunces | Editorial, cálido, caja mixta |
| `--font-body-sans` | Inter | Texto corrido, neutra |

Para añadir una familia nueva se declara en `app/layout.tsx` con `next/font` y
queda disponible para todos los tenants.

> **Contraste:** verificá cada par texto/fondo contra WCAG AA (4.5:1 en texto
> normal, 3:1 en texto grande y controles). Un par que cumple en tema claro
> puede fallar en oscuro. Se hace ahora, no cuando lo reporte un auditor.

### 3.3 Contacto y horarios

```ts
contact: {
  whatsapp: '59170012345',            // SOLO dígitos, formato internacional
  whatsappMessage: 'Hola 👋 Quiero información sobre las membresías.',
  // ...
},
hours: {
  timezone: 'America/La_Paz',
  week: [ /* los 7 días, en orden */ ],
},
```

El validador rechaza un WhatsApp con `+`, espacios o guiones, y exige
exactamente 7 días.

### 3.4 Feature flags

Encendé solo lo que el cliente contrató y puede sostener con contenido real:

```ts
features: {
  ...DEFAULT_FEATURE_FLAGS,
  showTeam: false,        // no entregó fotos ni fichas del equipo
  showFaq: true,
  showLocationMap: false, // todavía sin dirección definitiva
},
```

Apagar una flag hace dos cosas a la vez: quita el enlace del menú **y** hace
que la ruta responda 404. No hay forma de llegar a una sección apagada
escribiendo la URL.

### 3.5 Contenido

Es la parte más larga y la que decide si el sitio se ve profesional.

| Bloque | Cantidad recomendada |
|---|---|
| `hero.stats` | Exactamente 4 |
| `services` | 3 a 6 |
| `plans` | 2 a 4, **como máximo uno** con `featured: true` |
| `facilities` | 3 a 6 |
| `gallery` | 6 a 8, alternando `span: 1` y `span: 2` |
| `testimonials` | 3 |
| `faq` | 4 a 6 |

**Fotografía.** Mientras `GalleryItem.src` esté vacío se dibuja una composición
generativa con los colores de la marca: la demo nunca muestra una imagen rota.
Cuando llegue el material real, se coloca en `apps/web/public/tenants/<slug>/`
y se referencia como `/tenants/<slug>/foto.jpg`. El `aspect-ratio` no cambia,
así que sustituir no produce salto de layout.

---

## Paso 4 — Verificar

```bash
cd apps/web
npm run typecheck     # forma del contrato
npm run build         # el validador corre aquí: falla si hay algo inválido
npm run dev           # http://localhost:3000/nuevo-gym
```

El validador de `tenant.validator.ts` comprueba en el build:

- slug con formato correcto y sin duplicar;
- los 11 colores como CSS válido (defensa contra inyección de CSS);
- familias tipográficas sin caracteres peligrosos;
- WhatsApp y correo con formato correcto;
- 7 días de horario;
- navegación con ítem de inicio;
- **coherencia entre flags y contenido**: una sección encendida sin datos
  renderiza un bloque vacío, así que se rechaza;
- un solo plan destacado; sin identificadores de plan duplicados.

---

## Paso 5 — Revisión antes de publicar

- [ ] Las 9 rutas cargan y el menú no muestra secciones apagadas.
- [ ] Recorrido a 390 px, 768 px y 1440 px sin scroll horizontal.
- [ ] Recorrido completo **solo con teclado**: foco siempre visible.
- [ ] Contraste verificado en el tema del tenant.
- [ ] Enlaces de redes sociales completados (los vacíos se ven inertes).
- [ ] WhatsApp abre con el mensaje correcto y el número correcto.
- [ ] Textos revisados por el cliente. Sin lorem ipsum ni datos de otro gimnasio.
- [ ] Precios y horarios confirmados por escrito.
- [ ] `seo.description` propia, entre 140 y 160 caracteres.

---

## Errores frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| El build falla con `InvalidTenantConfigError` | Configuración inválida | El mensaje enumera cada problema |
| `/nuevo-gym` da 404 | Falta registrarlo en `TENANT_REGISTRY` | Paso 2 |
| Una sección no aparece | Su feature flag está apagada | `features` |
| El sitio se ve con la paleta de otro | Se copió el archivo sin cambiar la paleta | Revisar `branding.palette` |
| Colores sin efecto | Formato de color no aceptado | Solo `#hex`, `oklch()` y `rgb()` |
| Los planes se ven descolocados | Más de uno con `featured: true` | El validador lo rechaza |

---

## Qué pasa en V1.5

El registro estático se sustituye por la tabla `Tenants` de la API .NET, y el
alta pasa a hacerse desde el panel de Super Admin en lugar de con un PR.

`TenantConfig` **no cambia**: es el mismo contrato, servido por
`GET /api/v1/tenants/{slug}/config` en vez de por un archivo. Lo único que se
reemplaza es la implementación del puerto en el composition root.
