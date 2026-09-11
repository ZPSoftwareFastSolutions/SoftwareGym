# ADR 0006 · Entrenadores y medios de ejercicios (V3.1)

- **Estado:** aceptada · 2026-09-11
- **Contexto de versión:** V3.1 (rama `feat/v3.1-entrenadores-ejercicios`)
- **Relacionadas:** ADR 0004 (identidad en Supabase, aislamiento en RLS), ADR 0005 (multisucursal)

## Contexto

V3.1 añade la capa de entrenamiento sin rutinas, clases ni reservas: perfiles
de entrenador, su relación con los socios, su no disponibilidad y un catálogo
de ejercicios con imagen, GIF o vídeo. Tres decisiones tienen consecuencias
que duran más allá de esta versión.

## Decisión 1 · El entrenador es un perfil; la cuenta es opcional y la vincula gerencia

- `trainers` existe sin cuenta. Tener acceso al sistema es vincular una cuenta
  **ya registrada y con correo confirmado** del mismo gimnasio
  (`vincular_cuenta_de_entrenador`), que otorga el rol `trainer`.
- **Nunca automático por correo** (a diferencia de socio ↔ ficha): el rol da
  acceso a datos de socios, y eso lo decide una persona.
- La aplicación no crea cuentas de Auth: exigiría `service_role`, prohibido.
- El rol `trainer` solo tiene `trainers.self`. Lo que ve de sus socios sale de
  una función DEFINER (`app.socios_del_entrenador`) que devuelve **columnas
  fijas** (código, nombre, plan, vigencia) de **sus asignaciones vigentes**. No
  se abrió una política de lectura sobre `customers`: RLS filtra filas, no
  columnas, y daría documento, teléfono y notas.

## Decisión 2 · Quién puede tener entrenador lo decide el plan, en la base

- `membership_plans.includes_trainer` (principal) y `max_secondary_trainers`
  (0–5). Todos nacen en «sin entrenador»: es una regla comercial de gerencia.
- Un disparador evalúa la membresía **vigente hoy en la zona del gimnasio** al
  asignar, bloqueando la fila del socio (el tope no se salta con altas
  simultáneas). Un socio cuya membresía vence o cambia de plan conserva sus
  asignaciones; la pantalla lo marca y gerencia decide.
- Las asignaciones no se borran: se finalizan (`ended_on`), queda la historia.

## Decisión 3 · Medios con cuota por gimnasio, subida directa y URLs firmadas

El almacenamiento es compartido y finito (plan gratis: 1 GB para todo el
proyecto, 50 MB por archivo, 5+5 GB de descarga al mes).

- **Cuota por gimnasio** en `tenants.media_quota_bytes` (300 MB). La aplica el
  disparador de `exercise_media` con el tamaño **leído de `storage.objects`**,
  no el que declara el navegador.
- **El navegador reduce antes de subir**: imagen → WebP ≤ 1280 px (~150 KB);
  GIF tal cual ≤ 3 MB; clip MP4/WebM ≤ 15 MB y ≤ 60 s con miniatura WebP. Lo
  largo va como **enlace de YouTube/Vimeo** (0 MB; se guarda solo el id y la
  URL de inserción la arma la aplicación).
- **Subida directa a Storage** con URL firmada de un solo uso: una Server
  Action no admite 15 MB (Vercel corta a 4,5 MB). El servidor la emite tras
  comprobar permiso, tipo, tamaño, tope y cuota, y **después** lee los primeros
  bytes del archivo subido para verificar su tipo real antes de registrarlo.
- **Bucket privado + URLs firmadas de 1 h**, servidas desde el origen de
  NUESTRO proyecto de Supabase. La CSP añade ese origen a `img-src` y
  `media-src` (no `*.supabase.co`) y los reproductores sin cookies de
  YouTube/Vimeo a `frame-src`. Las listas usan miniaturas; el clip se descarga
  solo al reproducirlo (`preload="none"`).
- Borrar un medio borra su archivo. Las subidas abandonadas se liberan con
  «Liberar archivos sin uso» (solo archivos de más de una hora sin fila).

## Hallazgo asociado · escalada de privilegios en `user_roles`

Revisando cómo otorgar el rol `trainer` se comprobó (sesión simulada) que
gerencia podía darse `super_admin` por la política `user_roles_write`. Se
corrigió en `v3_roles_de_gimnasio_no_otorgan_plataforma`: fuera de la
plataforma solo se otorgan roles de alcance `tenant`. Regla que queda: **toda
política que otorgue capacidades debe mirar QUÉ se otorga, no solo a quién.**

## Consecuencias

- V3.2 (rutinas) referencia `exercises` y `trainers` sin cambiar su forma. Si
  el entrenador necesita el catálogo, se le concede `exercises.read` al rol.
- Subir la cuota de un gimnasio es un UPDATE de un número (plataforma).
- Pasar a plan Pro de Supabase no cambia el diseño: solo los números.
- Deuda: socio y ficha de socio no muestran todavía su entrenador; ausencias
  sin recurrencia; el catálogo no se ordena a mano.
