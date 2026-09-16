# ADR 0011 · Anuncios del gimnasio y contenido repartido por sucursal (V4.1)

- **Estado:** aceptada y aplicada · 2026-09-15
- **Contexto de versión:** V4.1 (rama `feat/goldgym-v1`, sale de `feat/v4-seradmingym`)
- **Relacionadas:** ADR 0003 (configuración como dato), ADR 0005 (multisucursal), ADR 0010 (V4)

## Contexto

Entra el tercer cliente de la plataforma, **Gold's Gym Premium**, y con él dos
exigencias que ningún gimnasio anterior había planteado:

1. **Comunica por anuncios, no por trayectoria.** Su forma de hablar con su
   comunidad son panfletos —clases nuevas, eventos, promociones— que hoy reparte
   por WhatsApp y redes. Su portada tiene que abrir con eso, no con su historia.
2. **Cuatro sucursales que no son intercambiables.** Quiere que el visitante
   elija sucursal y vea las instalaciones de ESA sede.

El riesgo evidente era resolverlo con código de GOLD: una portada propia, una
sección `GoldInstallations`, un `if (tenant === 'gold')`. Eso habría roto la
prueba de aceptación del producto (ADR 0003) en el primer cliente que pidió algo
distinto, que es exactamente cuando se rompe.

Lo que se encontró al revisar el sistema antes de decidir:

- **No había nada reutilizable para anuncios.** `notices` es la bandeja PRIVADA
  del socio: título, cuerpo, audiencia y vigencia, sin imagen, sin resumen, sin
  orden de presentación, y ningún anónimo la lee. Tampoco había un bucket público
  para arte de marketing (`qr-pagos` lo es, pero de 2 MB y atado a
  `settings.manage`).
- **Las instalaciones eran una lista plana.** `FacilityItem` no tenía forma de
  decir a qué sede pertenece un área.
- **El alcance multisede de un plan ya estaba resuelto.** «El plan Aeróbicos vale
  en cualquier sucursal» no necesita modelo nuevo: desde el ADR 0005 la membresía
  es del gimnasio y no de la sede. Lo que sí modela qué clases incluye un paquete
  es `class_plans` con `access_mode = 'planes'` (V3.3).

## Decisión 1 · Los anuncios son una capacidad del producto, no una portada de GOLD

Tabla `announcements` con `tenant_id`, flag `enableAnnouncements` y permiso
`content.manage`. Cualquier gimnasio la enciende; el que no la contrata no ve ni
la pantalla ni la sección, y su inicio queda exactamente como estaba.

Se descartó ampliar `notices`: obligaría a que la bandeja del socio cargara
columnas de marketing y —lo grave— a que una política dejara leer `notices` al
anónimo. Los avisos manuales de un gimnasio no son públicos. Ahorrar una tabla no
compensa abrir esa puerta.

Se descartó también un CMS. Un anuncio tiene forma fija —título, resumen, arte,
contenido, vigencia, prioridad— y se gestiona como las sedes o las clases: una
pantalla del panel, no un editor de páginas.

**La regla de publicación vive en la base**, no en el adaptador: el anónimo solo
alcanza lo activo, ya publicado y no vencido (política + `v_announcements_public`).
Un borrador o un anuncio programado para el mes que viene no existe para la
vitrina aunque alguien construya la consulta a mano.

**No hay política de DELETE.** Un anuncio retirado se desactiva: tuvo tráfico,
quedó en la bitácora y borrarlo dejaría su imagen huérfana en Storage. Es la
misma decisión que con socios, sedes y clases.

## Decisión 2 · El carrusel promete, el detalle cumple

La tarjeta lleva arte, tipo, fecha y un resumen corto; el contenido completo se
abre en un `<dialog>`. Volcar el panfleto entero en la tarjeta convierte el
carrusel en un muro y deja el detalle sin función.

Un solo `<dialog>` controlado para todas las tarjetas, como la ficha de socio:
con diez anuncios, diez diálogos montados son diez veces el mismo marcado en una
página que se sirve desde CDN.

El contenido se guarda como **texto, no como marcado**: se respetan los saltos de
línea y nada de lo que escriba el gimnasio puede inyectar HTML. El enlace se
valida contra `^https?://` en el dominio, en la acción y en la base (un
`javascript:` en la vitrina es XSS).

## Decisión 3 · El reparto de instalaciones por sede es un dato, y el puente es `code`

`FacilityItem.branchCode` opcional, unido a `branches.code`. Es el tercer uso del
mismo puente: los planes ya se unen por `code` y la vitrina de sucursales
(`BranchShowcase`) también.

Las reglas del agrupado, todas derivadas de los datos y ninguna de un nombre de
cliente:

- Ninguna área declara sede → una sola lista, como siempre. **Los tenants que ya
  existían no cambian de aspecto** (comprobado: Mítico sigue sin pestañas).
- Áreas con sede → una pestaña por sede, en el orden de la base.
- Un área sin sede conviviendo con otras que sí la tienen es de TODAS: se repite
  en cada pestaña. Es lo que significa «esto lo hay en cualquier sede» y evita
  copiar seis veces el mismo vestuario.
- Un `branchCode` que no corresponde a ninguna sede activa **no se pierde**: cae
  en el grupo general. Una errata no debe hacer desaparecer contenido en silencio.

Las pestañas son `ui/Pestanas.tsx`, genérico: patrón `tablist` del estándar, con
flechas, Inicio y Fin, y la fila **envuelve en vez de desplazarse** (regla de V4).
Los paneles se renderizan en el servidor y llegan montados; cambiar de pestaña no
pide nada.

## Decisión 4 · Lo que el cliente no entregó queda pendiente, no inventado

El folleto de GOLD no trae correo, ni la ciudad de cada sucursal, ni la dirección
de tres de ellas, ni cupos de clase, ni la mensualidad de Karate. Antes que
rellenar huecos:

- `contact.email` vacío es válido y significa «este gimnasio no publica correo»:
  la vitrina omite la línea, como una red social sin URL se muestra inerte. Lo que
  el validador sigue rechazando es un correo escrito a medias.
- Un área sin superficie ni fichas de datos no pinta la etiqueta ni la retícula
  vacía, y la página no anuncia «0 m²».
- Karate es una **clase** con su horario, no un paquete con precio inventado. Como
  ninguna fila de `class_plans` la incluye, la vitrina dice «consulta en recepción
  qué paquete la incluye», que es la verdad.
- Los cupos son un marcador declarado (30) porque la base los exige; se ajustan en
  el panel y hoy no afectan a nada, ya que GOLD no tiene reservas contratadas.

## Consecuencias

- La plataforma tiene un tercer cliente **sin una sola línea de código propia**:
  un archivo de configuración, dos migraciones de datos y dos capacidades que
  cualquier otro gimnasio puede encender.
- Un gimnasio con anuncios tiene una pantalla más en el panel (`/panel/anuncios`,
  grupo Gestión) y una sección más en su inicio.
- `/[tenant]/instalaciones` pasa a ser ISR de 300 s: lee las sedes de la base.
  Sigue siendo estática y anónima.
- Deuda declarada: los anuncios no paginan (un gimnasio publica decenas, no
  miles); la imagen no se comprime en el navegador como en ejercicios, porque
  reducir un panfleto emborrona el texto que lleva dentro, así que el tope de
  3 MB lo aplica el bucket; y las políticas del bucket `anuncios` conservan
  `app.tenant_de_ruta(name)` por fila, como el resto de `storage.objects`.
