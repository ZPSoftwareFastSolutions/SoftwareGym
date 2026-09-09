# Sistema de temas

Cómo un mismo componente se ve Mítico Fitness o Aurora Fit sin que nadie lo
toque.

---

## 1. La cadena completa

```text
tenants/<slug>.tenant.ts          ← 1. PRIMITIVOS DE MARCA
  branding.palette.primary = '#39FF14'
            │
            │  build-theme.ts (Application) — deriva, valida y serializa
            ▼
[data-tenant="mitico"] { --t-action: #39FF14; ... }   ← 2. TOKENS DE TENANT
            │
            │  globals.css @theme inline — mapea a la nomenclatura de Tailwind
            ▼
--color-action: var(--t-action)                        ← 3. TOKENS SEMÁNTICOS
            │
            ▼
<button className="bg-action text-on-action">          ← 4. COMPONENTE
```

**El componente vive en el nivel 4 y nunca mira por debajo del 3.**

---

## 2. Por qué dos namespaces (`--t-*` y `--color-*`)

Parece redundante. No lo es: es un fallo real que se corrigió durante la
construcción.

Si el token de tenant y el semántico compartieran nombre, `@theme inline`
generaría `--color-surface: var(--color-surface)`. Esa declaración se
auto-referencia, CSS la descarta y **todo el tema colapsa al valor inicial**:
página blanca sobre blanco.

Los namespaces separados hacen esa clase de error imposible por construcción.

---

## 3. Qué controla cada primitivo

### `branding.palette` — 11 colores

| Token | Uso | Mítico | Aurora |
|---|---|---|---|
| `primary` | CTAs, foco, énfasis, acentos | `#39FF14` | `#E4572E` |
| `primaryStrong` | Hover y estado presionado | `#2BD40D` | `#C4431E` |
| `structural` | Bloques y tarjetas de servicio | `#38761D` | `#7A3B23` |
| `structuralDeep` | Barras de título, cabeceras de tabla | `#1E5128` | `#452115` |
| `surface` | Fondo base del sitio | `#0C0E0F` | `#FBF7F4` |
| `surfaceRaised` | Secciones alternas, pie | `#131617` | `#FFFFFF` |
| `surfaceCard` | Tarjetas y contenedores | `#1A1C1E` | `#FFFFFF` |
| `text` | Texto principal | `#FFFFFF` | `#241C18` |
| `textMuted` | Texto secundario | `#9BA49B` | `#6E5F57` |
| `border` | Bordes y separadores | `#252A26` | `#E8DDD5` |
| `accent` | Detalles y apoyo | `#C1C1C1` | `#D9A441` |

### `branding.shape` — la forma

| Propiedad | Valores | Efecto |
|---|---|---|
| `corners` | `sharp` · `soft` · `rounded` · `pill` | Los cuatro radios del sistema |
| `surfaceStyle` | `flat` · `glass` · `elevated` | Cristal con desenfoque, o elevación con sombra |
| `glowIntensity` | `0` – `2` | Resplandor del color primario. `0` lo apaga entero |
| `showGrid` | `boolean` | Retícula de fondo del tema oscuro |

### `branding.typography` — la voz

| Propiedad | Efecto |
|---|---|
| `display` / `body` | Familias, referenciando las variables de `next/font` |
| `scale` | `compact` · `balanced` · `editorial` — seis tamaños y el ritmo de sección |
| `uppercaseHeadings` | Caja alta en títulos (deportivo) o mixta (editorial) |
| `headingTracking` | Interletrado de los títulos |

---

## 4. Modo oscuro y modo claro

El modo **no** se invierte: se declara.

Cada tenant fija `branding.mode`, que además establece `color-scheme` en el
subárbol. Eso le dice al navegador que pinte en el tema correcto sus propios
elementos —barras de scroll, selects nativos, autofill—, que es lo que casi
siempre se olvida y produce una scrollbar blanca sobre un sitio oscuro.

Diferencias reales entre ambos, aplicadas en el sistema:

| | Oscuro (Mítico) | Claro (Aurora) |
|---|---|---|
| Elevación | Superficie **más clara** | **Sombra** proyectada |
| Fondo base | `#0C0E0F`, no negro puro (evita halos y fatiga) | `#FBF7F4`, blanco cálido |
| Texto | `#FFFFFF`, no gris apagado | `#241C18`, no negro puro |
| Retícula | Visible | Apagada |
| Glow | Intensidad 1 | Intensidad 0 |

---

## 5. Seguridad: por qué se valida cada color

Los tokens terminan dentro de una etiqueta `<style>`. Hoy la configuración vive
en archivos versionados y revisados. Mañana vendrá de la base de datos, editada
por el propio gimnasio desde el panel.

Un color sin validar en esa cadena es **inyección de CSS**: permite alterar el
sitio entero, superponer contenido falso sobre la página real o exfiltrar datos
mediante selectores de atributo.

Por eso:

- `parseCssColor` acepta **solo** `#rgb`, `#rrggbb`, `#rrggbbaa`, `oklch(...)` y
  `rgb(...)`. Cualquier otra cosa se rechaza.
- Las familias tipográficas pasan por una lista blanca de caracteres que excluye
  `;`, `{` y `url(`.
- `headingTracking` debe ser una longitud CSS válida.
- La validación corre en el **arranque**, no en la petición: una configuración
  inválida rompe el build, no la página en producción.

---

## 6. Cómo añadir un token nuevo

1. Declararlo en `BrandPalette` o `BrandShape` (`core/domain/tenant/branding.ts`).
2. Derivarlo en `buildThemeVariables` como `--t-<nombre>` (`build-theme.ts`).
3. Mapearlo en `@theme inline` si los componentes van a usarlo como utilidad de
   Tailwind (`styles/globals.css`).
4. Añadirlo a los dos tenants existentes: si un tenant no lo define, el
   compilador lo detecta al instante.
5. Si es un color, la validación ya lo cubre: recorre la paleta completa.

---

## 7. Verificación de contraste

Compromiso: WCAG 2.2 AA — 4.5:1 en texto normal, 3:1 en texto grande y
elementos de interfaz.

Un par que cumple en el tema claro puede fallar en el oscuro: **hay que
verificar las dos paletas**, no asumir simetría. La comprobación se hace al
definir los tokens, no cuando el auditor lo reporta: cambiar la paleta después
del desarrollo es rehacer el diseño.
