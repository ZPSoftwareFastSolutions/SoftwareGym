/**
 * CAPA: Domain / Operations
 *
 * Sucursales (V3.0).
 *
 * UNA SUCURSAL NO ES UN TENANT. El socio, su membresía y sus pagos son del
 * gimnasio; la sucursal es el LUGAR donde ocurre una operación. Por eso aquí
 * no hay nada sobre membresías ni socios: solo qué es una sede, cómo se valida
 * y en cuál opera quien está en el mostrador.
 *
 * Todo es puro y sin I/O. Las mismas reglas las aplica la base (restricciones
 * de `branches` y `app.puede_operar_sucursal`); aquí se repiten para contestar
 * pronto en la pantalla, no para decidir.
 */

export interface Sucursal {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  /** Texto libre, una franja por línea. Es para leerlo, no para calcular. */
  readonly openingHours: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly googleMapsUrl: string | null;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

/** Sede vista desde la sesión: si quien pregunta puede operar en ella. */
export interface SucursalOperable {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly address: string | null;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
  /** Lo calcula la MISMA función que usa RLS al registrar una entrada. */
  readonly puedeOperar: boolean;
  readonly asignada: boolean;
}

export interface IndicadoresDeSucursal {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly address: string | null;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
  readonly hoy: string;
  readonly asistenciasHoy: number;
  readonly asistenciasSemana: number;
  readonly asistencias30d: number;
  /** Socios distintos que entrenaron EN ESTA SEDE en 30 días. Un socio puede contar en varias. */
  readonly socios30d: number;
  readonly ultimaEntrada: string | null;
  readonly usuariosAsignados: number;
}

/** Cuenta del personal con sus sedes, para la pantalla de asignaciones. */
export interface PersonalDeSucursales {
  readonly appUserId: string;
  readonly fullName: string;
  readonly email: string;
  readonly roles: readonly string[];
  /** Ids de sucursal con asignación ACTIVA. */
  readonly sucursales: readonly string[];
  /** Algún rol suyo trae `branches.all`: opera en todas sin asignación. */
  readonly alcanceGlobal: boolean;
}

/** Datos editables de una sede, ya normalizados. */
export interface DatosDeSucursal {
  readonly code: string;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly openingHours: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly googleMapsUrl: string | null;
}

/** Lo que llega del formulario, tal cual. */
export interface FormularioDeSucursal {
  readonly code: string;
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly email: string;
  readonly openingHours: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly googleMapsUrl: string;
}

/** Etiqueta de las entradas anteriores a V3.0, que no guardaron dónde ocurrieron. */
export const ETIQUETA_SIN_SUCURSAL = 'Sin sucursal registrada';

/** Valor de filtro que selecciona ese histórico sin sede. */
export const FILTRO_SIN_SUCURSAL = 'sin-sucursal';

// Los mismos patrones que las restricciones de la tabla `branches`. Si se
// cambia uno aquí sin cambiarlo allí, la base seguirá rechazando: aquí solo
// se adelanta el mensaje.
const PATRON_CODIGO = /^[A-Z0-9]{2,12}$/;
const PATRON_CORREO = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)*\.[a-z]{2,}$/i;
const PATRON_MAPA = /^https:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|(www\.)?google\.[a-z.]{2,8}\/maps|maps\.google\.[a-z.]{2,8}\/)/;

function limpio(valor: string): string | null {
  const recortado = valor.trim();
  return recortado === '' ? null : recortado;
}

/** Número decimal escrito por una persona: admite coma como separador. */
function decimal(valor: string): number | null | 'invalido' {
  const recortado = valor.trim().replace(',', '.');
  if (recortado === '') return null;
  if (!/^-?\d{1,3}(\.\d{1,8})?$/.test(recortado)) return 'invalido';
  const numero = Number(recortado);
  return Number.isFinite(numero) ? numero : 'invalido';
}

/**
 * Código sugerido a partir del nombre: mayúsculas, sin tildes ni espacios.
 * «Torre Vicenta» → «TORREVICENTA». Es una propuesta; quien da de alta decide.
 */
export function sugerirCodigo(nombre: string): string {
  return nombre
    .normalize('NFD')
    // `\p{M}`: las marcas diacríticas que NFD separa de su letra (á → a + ´).
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

export function validarSucursal(
  formulario: FormularioDeSucursal,
): { readonly ok: true; readonly datos: DatosDeSucursal } | { readonly ok: false; readonly errores: Readonly<Record<string, string>> } {
  const errores: Record<string, string> = {};

  const code = formulario.code.trim().toUpperCase();
  if (!PATRON_CODIGO.test(code)) {
    errores.code = 'De 2 a 12 letras o números, sin espacios. Ej.: CENTRO, NORTE2.';
  }

  const name = formulario.name.trim();
  if (name.length < 2 || name.length > 80) errores.name = 'El nombre debe tener entre 2 y 80 caracteres.';

  const address = limpio(formulario.address);
  if (address && address.length > 200) errores.address = 'La dirección no puede pasar de 200 caracteres.';

  const phone = limpio(formulario.phone);
  if (phone && (phone.length > 40 || !/^[0-9+()\s-]+$/.test(phone))) {
    errores.phone = 'Usa solo números, espacios, «+», guiones o paréntesis.';
  }

  const email = limpio(formulario.email)?.toLowerCase() ?? null;
  if (email && (email.length > 120 || !PATRON_CORREO.test(email))) errores.email = 'Ese correo no parece válido.';

  const openingHours = limpio(formulario.openingHours);
  if (openingHours && openingHours.length > 400) errores.openingHours = 'El horario no puede pasar de 400 caracteres.';

  const latitude = decimal(formulario.latitude);
  const longitude = decimal(formulario.longitude);
  if (latitude === 'invalido' || (typeof latitude === 'number' && (latitude < -90 || latitude > 90))) {
    errores.latitude = 'Latitud entre -90 y 90, con punto decimal.';
  }
  if (longitude === 'invalido' || (typeof longitude === 'number' && (longitude < -180 || longitude > 180))) {
    errores.longitude = 'Longitud entre -180 y 180, con punto decimal.';
  }
  // Una coordenada sola no ubica nada: o las dos, o ninguna.
  if (!errores.latitude && !errores.longitude && (latitude === null) !== (longitude === null)) {
    errores[latitude === null ? 'latitude' : 'longitude'] = 'Completa latitud y longitud, o deja las dos vacías.';
  }

  const googleMapsUrl = limpio(formulario.googleMapsUrl);
  if (googleMapsUrl && !PATRON_MAPA.test(googleMapsUrl)) {
    errores.googleMapsUrl = 'Pega el enlace de «Compartir» de Google Maps (empieza por https://maps.app.goo.gl/).';
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  return {
    ok: true,
    datos: {
      code,
      name,
      address,
      phone,
      email,
      openingHours,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      googleMapsUrl,
    },
  };
}

/**
 * Sucursal en la que opera quien tiene la sesión.
 *
 * Orden: la que eligió (si todavía puede operar en ella) → la primaria → la
 * primera por nombre. Nunca devuelve una sede en la que no puede operar ni una
 * inactiva: la preferencia viene de una cookie, que es un dato del navegador,
 * y se trata como una sugerencia que hay que volver a comprobar.
 */
export function resolverSucursalOperativa(
  sucursales: readonly SucursalOperable[],
  preferida: string | null | undefined,
): SucursalOperable | null {
  const operables = sucursales.filter((sucursal) => sucursal.puedeOperar && sucursal.isActive);
  if (operables.length === 0) return null;

  const elegida = preferida ? operables.find((sucursal) => sucursal.id === preferida) : undefined;
  if (elegida) return elegida;

  const primaria = operables.find((sucursal) => sucursal.isPrimary);
  if (primaria) return primaria;

  return [...operables].sort((a, b) => a.name.localeCompare(b.name, 'es'))[0] ?? null;
}

export interface VisitasPorSucursal {
  /** Id de la sede, o `null` para el histórico sin sede. */
  readonly branchId: string | null;
  readonly nombre: string;
  readonly visitas: number;
}

/**
 * Reparto de entradas por sede, de más a menos visitas. El histórico sin sede
 * se agrupa aparte y va siempre al final: no es una sede más a comparar.
 */
export function repartoPorSucursal(
  registros: readonly { readonly branchId: string | null; readonly branchName: string | null; readonly veces?: number }[],
): readonly VisitasPorSucursal[] {
  const conteo = new Map<string | null, VisitasPorSucursal>();
  for (const registro of registros) {
    const clave = registro.branchId;
    const actual = conteo.get(clave);
    conteo.set(clave, {
      branchId: clave,
      nombre: clave === null ? ETIQUETA_SIN_SUCURSAL : registro.branchName ?? 'Sucursal',
      // V4: una fila puede ser un conteo ya agregado por la base (`veces`); sin él, cuenta uno.
      visitas: (actual?.visitas ?? 0) + (registro.veces ?? 1),
    });
  }
  return [...conteo.values()].sort((a, b) => {
    if (a.branchId === null) return 1;
    if (b.branchId === null) return -1;
    return b.visitas - a.visitas || a.nombre.localeCompare(b.nombre, 'es');
  });
}

/** Dirección con la ciudad al final, salvo que ya la mencione. */
function conCiudad(direccion: string, ciudad: string | undefined): string {
  return ciudad && !direccion.toLowerCase().includes(ciudad.toLowerCase()) ? `${direccion}, ${ciudad}` : direccion;
}

/** Franjas de horario, una por línea, sin líneas vacías. */
export function lineasDeHorario(texto: string | null): readonly string[] {
  if (!texto) return [];
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);
}

export interface Coordenadas {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * V4.2 · Hosts a los que se permite seguir un enlace de Google Maps desde el
 * servidor. Una lista cerrada: el enlace lo pega una persona y el servidor lo
 * pide, así que sin ella serviría para hacer peticiones a cualquier sitio.
 */
export function esHostDeGoogleMaps(host: string): boolean {
  return /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?|consent\.google\.[a-z]{2,3}(\.[a-z]{2})?)$/i.test(host);
}

/** El enlace corto de «Compartir», que hay que seguir para saber a dónde apunta. */
export function esEnlaceCortoDeMaps(url: string): boolean {
  return /^https:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/i.test(url.trim());
}

function coordenadasValidas(lat: string | undefined, lng: string | undefined): Coordenadas | null {
  if (lat === undefined || lng === undefined) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // Ocho decimales son menos de un milímetro: lo que admite la base.
  const redondear = (n: number) => Math.round(n * 1e7) / 1e7;
  return { latitude: redondear(latitude), longitude: redondear(longitude) };
}

const NUMERO = '(-?\\d{1,3}(?:\\.\\d+)?)';

/**
 * Coordenadas escritas en un enlace largo de Google Maps, en orden de
 * precisión: el marcador del lugar (`!3d…!4d…`), el centro de la vista
 * (`@lat,lng`) y la consulta (`?q=lat,lng`, `query`, `ll`, `center`).
 * El enlace corto no trae ninguna: primero hay que seguirlo (lo hace el servidor).
 */
export function coordenadasDeEnlaceDeMaps(url: string): Coordenadas | null {
  let texto: string;
  try {
    texto = decodeURIComponent(url);
  } catch {
    texto = url;
  }
  const marcador = new RegExp(`!3d${NUMERO}!4d${NUMERO}`).exec(texto);
  if (marcador) return coordenadasValidas(marcador[1], marcador[2]);
  const vista = new RegExp(`@${NUMERO},${NUMERO}`).exec(texto);
  if (vista) return coordenadasValidas(vista[1], vista[2]);
  const consulta = new RegExp(`[?&](?:q|query|ll|center|destination)=(?:loc:)?${NUMERO},\\s*${NUMERO}(?:[&#]|$)`).exec(texto);
  if (consulta) return coordenadasValidas(consulta[1], consulta[2]);
  return null;
}

/**
 * Enlace estable del lugar al que lleva un enlace corto: `…/maps/place/<nombre>/data=…`
 * sin la consulta de seguimiento (`utm_source`, `g_ep`…). El enlace de
 * «Compartir» de un negocio no trae coordenadas; su nombre sí sirve para que el
 * mapa embebido lo encuentre, y el enlace sigue abriendo el mismo lugar.
 * (La página del lugar declara un «centro», pero es el de la vista según quien
 * pregunta, no el del lugar: probado, no sirve.)
 */
export function enlaceDelLugarDeMaps(url: string): string | null {
  try {
    const direccion = new URL(url);
    if (!esHostDeGoogleMaps(direccion.hostname) || !lugarDeEnlaceDeMaps(direccion.href)) return null;
    const conDatos = /^\/maps\/place\/[^/]+\/(data=[^/?#]+)?/.exec(direccion.pathname)?.[0];
    const soloNombre = /^\/maps\/place\/[^/]+\//.exec(direccion.pathname)?.[0];
    const camino = conDatos && conDatos.length <= 240 ? conDatos : soloNombre;
    return camino ? `https://www.google.com${camino}` : null;
  } catch {
    return null;
  }
}

/** Nombre del lugar de un enlace `…/maps/place/<nombre>/…`, para buscarlo si no hay nada mejor. */
export function lugarDeEnlaceDeMaps(url: string): string | null {
  const lugar = /\/maps\/place\/([^/?#]+)/.exec(url);
  if (!lugar?.[1]) return null;
  try {
    const nombre = decodeURIComponent(lugar[1].replace(/\+/g, ' ')).trim();
    return nombre.length >= 2 ? nombre : null;
  } catch {
    return null;
  }
}

/**
 * Dirección del mapa embebido de la sede.
 *
 * Con coordenadas, el punto exacto; sin ellas, las que traiga el enlace de
 * Google Maps (si es largo) y después la dirección escrita, que Google resuelve
 * solo. El enlace corto de «Compartir» no se incrusta (Google no lo permite en
 * un iframe): al guardar la sede, el servidor lo sigue y guarda sus coordenadas.
 */
export function urlDeMapaEmbebido(
  sucursal: Pick<Sucursal, 'latitude' | 'longitude' | 'address' | 'name'> & { readonly googleMapsUrl?: string | null },
  ciudad?: string,
): string | null {
  const enlace = sucursal.googleMapsUrl ?? null;
  const coordenadas =
    sucursal.latitude !== null && sucursal.longitude !== null
      ? { latitude: sucursal.latitude, longitude: sucursal.longitude }
      : enlace && !esEnlaceCortoDeMaps(enlace)
        ? coordenadasDeEnlaceDeMaps(enlace)
        : null;
  if (coordenadas) {
    return `https://www.google.com/maps?q=${coordenadas.latitude},${coordenadas.longitude}&z=17&output=embed`;
  }
  const consulta = sucursal.address ? conCiudad(sucursal.address, ciudad) : enlace ? lugarDeEnlaceDeMaps(enlace) : null;
  if (consulta) {
    return `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=17&output=embed`;
  }
  return null;
}

/** Enlace «Ver ubicación»: el del negocio si lo hay; si no, una búsqueda. */
export function urlDeUbicacion(
  sucursal: Pick<Sucursal, 'googleMapsUrl' | 'latitude' | 'longitude' | 'address'>,
  ciudad?: string,
): string | null {
  if (sucursal.googleMapsUrl) return sucursal.googleMapsUrl;
  if (sucursal.latitude !== null && sucursal.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${sucursal.latitude},${sucursal.longitude}`;
  }
  if (sucursal.address) {
    const consulta = conCiudad(sucursal.address, ciudad);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  }
  return null;
}
