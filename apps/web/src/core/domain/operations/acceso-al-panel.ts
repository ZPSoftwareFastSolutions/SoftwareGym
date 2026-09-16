/**
 * CAPA: Domain / Operations — qué respuesta merece cada situación (V4.2).
 *
 * §19 y §20 del encargo, que es el arreglo más delicado de esta rama: «una
 * operación fallida no debe cerrar la sesión del usuario» y «no enviar
 * automáticamente al login cuando el usuario ya está autenticado».
 *
 * POR QUÉ ESTO ES UNA TABLA Y NO UNA CADENA DE `if`. El defecto original no
 * fue una condición mal escrita: fue que CUATRO situaciones distintas —no hay
 * sesión, la sesión es válida pero no se pudo leer el perfil, la cuenta no
 * tiene ficha, la cuenta no tiene permiso— terminaban todas en el mismo
 * `redirect('/acceso')`. Escrito como cadena de condiciones, colapsar dos casos
 * vuelve a ser un descuido de una línea que nadie nota hasta que a alguien se
 * le cierra la sesión a mitad de un cobro. Escrito como tabla, colapsar dos
 * casos rompe una prueba.
 *
 * ESTO NO AUTORIZA NADA. Traduce un estado ya averiguado a la respuesta HTTP
 * que le toca. Quién puede leer qué lo decide RLS, por debajo de toda consulta.
 */

/** Lo que se sabe de quien pide una página del panel, ya averiguado. */
export type SituacionDeAcceso =
  /** No hay sesión, o caducó de verdad. */
  | 'anonimo'
  /** No se pudo comprobar: red, timeout, 5xx. La sesión sigue viva. */
  | 'indisponible'
  /** Sesión válida, pero la cuenta no tiene ficha operativa todavía. */
  | 'sin-perfil'
  /** Sesión válida de OTRO gimnasio que el de la ruta. */
  | 'gimnasio-ajeno'
  /** Sesión válida de este gimnasio, sin el permiso que la página pide. */
  | 'sin-permiso'
  | 'ok';

export type RespuestaDeAcceso =
  | 'continuar'
  /** Formulario de acceso. **Solo** para quien no tiene sesión. */
  | 'ir-al-acceso'
  /** Su propio panel: no es un error, es que se equivocó de gimnasio. */
  | 'ir-a-su-panel'
  /** 403 real: autenticado y sin permiso no es lo mismo que sin autenticar. */
  | 'prohibido'
  /** 503 con la sesión intacta: al recargar, quien estaba dentro sigue dentro. */
  | 'no-disponible';

const RESPUESTA: Readonly<Record<SituacionDeAcceso, RespuestaDeAcceso>> = {
  anonimo: 'ir-al-acceso',
  indisponible: 'no-disponible',
  // Una cuenta a medio aprovisionar no es un intruso: se le dice qué le falta
  // en lugar de mandarla a entrar otra vez con las credenciales que ya usó.
  'sin-perfil': 'prohibido',
  'gimnasio-ajeno': 'ir-a-su-panel',
  'sin-permiso': 'prohibido',
  ok: 'continuar',
};

export function respuestaDeAcceso(situacion: SituacionDeAcceso): RespuestaDeAcceso {
  return RESPUESTA[situacion];
}

/**
 * Si esta situación justifica pedir credenciales otra vez.
 *
 * Es la regla del encargo escrita como una sola función, para poder probarla:
 * **solo** la ausencia de sesión lleva al formulario de acceso. Un fallo de red,
 * una ficha que falta o un permiso que no se tiene, no.
 */
export function exigeVolverAEntrar(situacion: SituacionDeAcceso): boolean {
  return respuestaDeAcceso(situacion) === 'ir-al-acceso';
}

/**
 * Si la sesión del usuario se conserva intacta ante esta situación.
 *
 * Todas menos una: solo quien no tiene sesión acaba en el formulario, y eso no
 * es «perderla», es no tenerla.
 */
export function conservaLaSesion(situacion: SituacionDeAcceso): boolean {
  return situacion !== 'anonimo';
}

/**
 * Lo que la BASE dice de la cuenta que acaba de poner bien su contraseña.
 *
 * Se lee de `v_my_profile` (tabla `app_users`), NUNCA de `user_metadata`: los
 * metadatos del usuario los puede reescribir el propio usuario con
 * `auth.updateUser`, así que un `tenant_slug` de ahí no prueba nada.
 */
export type CuentaAlIniciarSesion =
  | { readonly estado: 'ok'; readonly tenantSlug: string | null; readonly esPlataforma: boolean }
  /** Existe en Auth pero no tiene cuenta operativa en ningún gimnasio. */
  | { readonly estado: 'sin-cuenta' }
  /** No se pudo leer. No se adivina en ninguna dirección. */
  | { readonly estado: 'indisponible' };

export type DecisionDeLogin = 'permitir' | 'denegar' | 'reintentar';

/**
 * Si una cuenta puede entrar por el formulario de acceso de ESTE gimnasio.
 *
 * EL HUECO QUE CIERRA (V4.2). Supabase Auth es uno solo para todos los
 * gimnasios: aceptaba la contraseña de una cuenta de Mítico escrita en el
 * formulario de GOLD, abría la sesión y el panel la mandaba después a
 * `/mitico/panel`. No había fuga de datos —RLS no entrega nada ajeno—, pero se
 * abría una sesión desde un gimnasio al que la cuenta no pertenece, y el
 * formulario servía para averiguar qué correos existen en OTROS gimnasios.
 *
 * La plataforma sí entra por cualquier gimnasio: no pertenece a ninguno, y es
 * así como llega a su panel desde hoy.
 *
 * Lo que decide `denegar` NO es la seguridad de los datos (eso sigue siendo
 * RLS): es que la puerta de un gimnasio solo abra a los suyos.
 */
export function decidirLoginPorGimnasio(cuenta: CuentaAlIniciarSesion, slugDeLaRuta: string): DecisionDeLogin {
  if (cuenta.estado === 'indisponible') return 'reintentar';
  if (cuenta.estado === 'sin-cuenta') return 'denegar';
  if (cuenta.esPlataforma) return 'permitir';
  return cuenta.tenantSlug !== null && cuenta.tenantSlug === slugDeLaRuta ? 'permitir' : 'denegar';
}
