# Cabeceras de seguridad del sitio público

Se aplican a todas las rutas desde `apps/web/next.config.ts`. Este documento
explica **por qué** cada una está como está, que es lo que no se ve en el
archivo de configuración.

## Content-Security-Policy

Se despliega en **modo bloqueo**, no en `Report-Only`. Es una decisión que se
puede tomar porque el sitio no carga scripts de terceros ni hojas de estilo
externas: no hay analítica, no hay widgets, no hay librería de iconos ni de
animación. Cuando no hay nada externo que romper, empezar bloqueando es gratis.

| Directiva | Valor | Motivo |
|---|---|---|
| `default-src` | `'self'` | Todo lo que no esté explícitamente permitido, se bloquea. |
| `script-src` | `'self' 'unsafe-inline'` | Ver la nota de abajo. |
| `style-src` | `'self' 'unsafe-inline'` | El tema del gimnasio se inyecta como `<style>` en el layout. |
| `img-src` | `'self' data: blob:` | `data:` para los SVG del set propio; `blob:` para vistas previas futuras. |
| `font-src` | `'self' data:` | Las tipografías van autoalojadas con `next/font`; no se pide nada a Google. |
| `connect-src` | `'self'` | El sitio público no llama a ninguna API externa. |
| `frame-src` | `'self' https://www.google.com https://maps.google.com` | El único iframe posible es el mapa de la sección de contacto. |
| `frame-ancestors` | `'none'` | Nadie puede embeber el sitio: cierra el clickjacking. |
| `object-src` | `'none'` | No hay Flash ni plugins que valga la pena permitir. |
| `base-uri` | `'self'` | Evita que una inyección reescriba `<base>` y secuestre las rutas relativas. |
| `form-action` | `'self'` | Un formulario no puede enviarse a un dominio ajeno. |
| `upgrade-insecure-requests` | — | Cualquier `http://` residual se pide por `https://`. |

### Sobre `'unsafe-inline'`

Está en `script-src` y en `style-src`, y conviene ser honesto: **debilita la
CSP**. Los motivos son distintos en cada caso.

En **estilos** es estructural. El tema de cada gimnasio se deriva de su
configuración y se inyecta como bloque `<style>` en el layout del tenant. La
alternativa sería un hash o un nonce por despliegue, incompatible con el
prerenderizado estático que hace que cada sitio se sirva desde CDN. El riesgo
está acotado porque **todo valor que entra en ese bloque se valida antes**:
los colores pasan por `parseCssColor`, las familias tipográficas por el patrón
de `tenant.validator`, y el slug por `parseTenantSlug` antes de interpolarse en
el selector. Sin esa validación, `'unsafe-inline'` sería una vía de inyección
de CSS desde la configuración del cliente.

En **scripts** es una concesión al runtime de Next.js, que emite datos de
hidratación inline. Se puede endurecer con nonces cuando se abandone el
prerenderizado completo.

> Si algún día se añade analítica, un chat o cualquier script de terceros:
> pasar **primero** a `Content-Security-Policy-Report-Only`, observar los
> informes y recién entonces volver a modo bloqueo. Añadir el dominio a mano y
> desplegar directo es cómo se rompe un sitio en producción un viernes.

## El resto

| Cabecera | Valor | Qué evita |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Que el navegador adivine el tipo de un recurso y ejecute como script algo que no lo es. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Que la URL completa viaje a terceros; hacia fuera solo va el origen. |
| `X-Frame-Options` | `DENY` | Clickjacking en navegadores que aún no aplican `frame-ancestors`. Es redundante a propósito. |
| `Permissions-Policy` | geolocalización, cámara, micrófono y pago desactivados | El sitio público no necesita ninguno. Lo que no se usa, se apaga. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Aísla el contexto de navegación de ventanas abiertas por terceros. |

`interest-cohort=()` sigue en `Permissions-Policy` aunque FLoC esté retirado:
no cuesta nada y documenta la intención de no participar en segmentación del
navegador.

## Lo que falta

- **Verificar las cabeceras en producción**, no solo en local. Vercel puede
  añadir o transformar algunas.
- **HSTS** (`Strict-Transport-Security`) lo gestiona Vercel en su dominio; hay
  que confirmarlo al pasar a un dominio propio del cliente.
- Cuando exista la aplicación privada de V2, esta configuración **no le sirve
  tal cual**: `connect-src 'self'` bloquearía las llamadas a Supabase. Habrá
  que añadir el origen del proyecto, y solo ese.
