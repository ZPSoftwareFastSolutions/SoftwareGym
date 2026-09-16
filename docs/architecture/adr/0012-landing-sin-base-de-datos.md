# ADR 0012 — La landing de Mítico no tiene base de datos

**Estado:** Aceptada · **Fecha:** 2026-09-16 · **Ámbito:** rama `miticogym-v1`

**Supersede, SOLO en esta rama:** [0004](0004-identidad-y-aislamiento-en-supabase.md)
(identidad y RLS), [0005](0005-multisucursal.md) (las sedes en la base),
[0006](0006-entrenadores-y-medios-de-ejercicios.md),
[0007](0007-rutinas-asignadas-y-metricas-de-entrenamiento.md),
[0008](0008-clases-sesiones-y-acceso-por-plan.md),
[0009](0009-reservas-lista-de-espera-y-faltas.md),
[0010](0010-administracion-del-gimnasio-y-rendimiento.md) y
[0011](0011-anuncios-y-contenido-por-sucursal.md) (de esta última sobrevive el
reparto de instalaciones por sede, que no necesita base).

Siguen vigentes [0001](0001-stack-del-sitio-publico.md) (Next.js),
[0002](0002-aislamiento-multi-tenant.md) (un producto, muchos gimnasios) y
[0003](0003-configuracion-como-dato.md), que aquí es más cierto que nunca.

## Contexto

El cliente pidió para Mítico Fitness **una landing y nada más**: sin sistema de
socios, sin inicio de sesión, sin roles y sin base de datos. La rama de la que
salimos (`feat/goldgym-v1`, que contiene toda la V4) trae un panel de 30
pantallas, autenticación, 41 tablas con RLS y tres gimnasios en el registro.

La tentación evidente era dejarlo todo y apagar las feature flags. Es lo que la
arquitectura permite: una capacidad apagada responde 404. Pero apagar no es lo
mismo que no tener:

- El código del panel se sigue compilando, se sigue manteniendo y sigue siendo
  superficie de ataque; una flag encendida por error publica un login.
- El sitio seguiría necesitando credenciales de Supabase para arrancar, y las
  páginas que leen sedes o clases seguirían saliendo del CDN cada cinco minutos
  para consultar una base que nadie edita.
- Un lector del repositorio no podría distinguir «no contratado» de «no existe».

## Decisión

**Esta rama publica un sitio estático y no habla con nada.**

1. **Se borran**, no se apagan: `/[tenant]/panel/*`, `/[tenant]/acceso`,
   `/[tenant]/pago/*`, `/auth/*`, `middleware.ts`, `infrastructure/auth`,
   `infrastructure/operations` (los 12 adaptadores de Supabase),
   `core/domain/operations`, los 13 puertos operativos y las dependencias
   `@supabase/*`, `jsqr` y `qrcode-generator`.
2. **Las feature flags de operación desaparecen del contrato.** No quedan en
   `false`: `FeatureFlags` ya no las declara. Una bandera apagada tiene
   interruptor; una que no existe, no.
3. **Las sedes, sus horarios y las clases pasan a `TenantConfig`.** Eran datos
   de la base porque gerencia los editaba sin desplegar; sin panel, no hay quien
   los edite y el único sitio donde pueden vivir es el archivo del gimnasio.
4. **Queda un solo puerto** (`TenantRepositoryPort`) y un solo adaptador
   (`StaticTenantRepository`). El composition root sigue existiendo: es el
   punto por donde esto vuelve a ser una API el día que haga falta.
5. **El validador se vuelve la única red.** Sin panel ni base, una errata en el
   archivo no la corrige nadie después: si pasa el validador, se publica. Por
   eso ahora comprueba la sede entera (semana de siete días, una sola
   principal), que ninguna clase ni instalación apunte a una sede inexistente y
   que cada entrada del menú exija la capacidad que abre su página.

## Lo que esto NO significa

**No es una bifurcación del producto.** No hay ni un `if (tenant === …)`: el
sitio sigue siendo genérico y el gimnasio sigue siendo un archivo de
configuración (ADR 0003). Otro cliente que quiera solo vitrina se da de alta
igual, con su archivo y su línea en el registro.

**No se pierde nada.** El sistema completo vive en `feat/goldgym-v1` y en las
ramas anteriores, con sus migraciones y su bitácora. Si Mítico contrata el
panel más adelante, el camino es fusionar, no reescribir.

## Consecuencias

**A favor**
- Todo el sitio se prerenderiza en el build: 10 páginas servidas como archivos
  desde el CDN, sin ISR, sin cookies y sin una sola consulta en tiempo de
  ejecución. La página más lenta es la más lenta de la red del visitante.
- `connect-src 'self'` en la CSP: cualquier petición a un tercero que apareciera
  mañana fallaría a la vista en vez de pasar desapercibida. La cámara vuelve a
  estar cerrada (`camera=()`), porque ya no hay escáner de QR.
- Tres dependencias en total (`next`, `react`, `react-dom`). `npm audit` en 0.
- No hay datos personales que proteger: no se recoge ninguno.

**En contra**
- Cambiar un precio o un horario es desplegar. Es el intercambio que se compra
  al no tener panel, y para un tarifario que cambia una o dos veces al año sale
  a favor.
- Si el cliente vuelve a querer el panel, esta rama no le sirve: hay que volver
  a `feat/goldgym-v1`. Está asumido y escrito aquí para que nadie lo descubra a
  mitad de camino.

## Verificación

```bash
# Ni Supabase, ni sesión, ni panel en el código de la aplicación (salida vacía)
grep -rniE "supabase|memberLogin|acceso socios|service_role" apps/web/src

# Las rutas privadas responden 404, no 307 a un acceso que ya no existe
for r in /mitico/acceso /mitico/panel /mitico/pago/qr; do
  curl -s -o /dev/null -w "$r %{http_code}\n" "$BASE$r"
done
```

Y `npm test`, que comprueba el contrato de lo que ya no existe: ninguna
capacidad de socios, sesión, cobro o gestión puede volver a aparecer en
`features` sin que una prueba lo diga.
