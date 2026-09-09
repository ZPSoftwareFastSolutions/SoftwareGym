/**
 * CAPA: Infrastructure / Auth
 *
 * Configuración de Supabase compartida por el middleware y el cliente de
 * servidor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTOS DOS VALORES ESTÁN EN EL CÓDIGO
 *
 * Ambos son PÚBLICOS por diseño. Llevan el prefijo `NEXT_PUBLIC_`, lo que
 * significa que Next.js los incrusta en el paquete que descarga el navegador:
 * cualquiera que abra el sitio desplegado y mire el código fuente los tiene.
 * Versionarlos no expone nada que no estuviera ya expuesto.
 *
 * Lo que los hace inofensivos NO es que estén ocultos —no lo están— sino que
 * la clave publicable no concede ningún permiso por sí sola. Todo lo que se
 * puede leer o escribir con ella lo decide Row Level Security en la base:
 * doce tablas, todas con RLS activo, treinta y cuatro políticas, cero tablas
 * desprotegidas. Sin sesión válida esa clave no devuelve una sola fila.
 *
 * Tenerlos aquí hace que el despliegue funcione sin configurar nada, que es
 * lo que necesita un plan gratuito. Las variables de entorno siguen teniendo
 * prioridad, para poder apuntar a otro proyecto sin tocar el código.
 *
 * ⛔ LO QUE JAMÁS PUEDE ENTRAR EN ESTE ARCHIVO
 *
 * La clave `service_role`. Tiene BYPASSRLS: se salta TODAS las políticas de
 * aislamiento entre gimnasios. Si aparece aquí —o en cualquier variable con
 * prefijo `NEXT_PUBLIC_`— viaja al navegador y regala la base entera: los
 * socios, los pagos y los datos personales de todos los clientes, no solo de
 * uno. Que estos dos valores estén versionados NO sienta precedente: están
 * porque son públicos, no porque el repositorio sea un sitio para claves.
 */

export interface SupabaseConfig {
  readonly url: string;
  readonly publishableKey: string;
}

/**
 * Proyecto por defecto. Se usa cuando no hay variables de entorno definidas,
 * que es el caso del plan gratuito de Vercel sin configuración adicional.
 */
const PROYECTO_POR_DEFECTO: SupabaseConfig = {
  url: 'https://dnclwawnjnzqqxgsuhpn.supabase.co',
  publishableKey: 'sb_publishable_b6PCtrjmTEXuAncc7F8hRA_MRN0mLzU',
};

/**
 * Devuelve la configuración efectiva. Nunca lanza.
 *
 * Se resuelve al USARLA, no al importar este módulo. Validar al importar
 * acopla el arranque de toda la aplicación a la configuración de una sola
 * pieza: un `throw` aquí llegó a tumbar el build de las 25 páginas, incluidas
 * las 24 del sitio público que no dependen de Supabase para nada.
 */
export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  // El entorno manda: permite apuntar a otro proyecto —o rotar la clave— sin
  // tocar el código. Solo se acepta si están los DOS valores; mezclar la URL
  // de un proyecto con la clave de otro falla de formas difíciles de leer.
  if (url && publishableKey) return { url, publishableKey };

  return PROYECTO_POR_DEFECTO;
}

/** `true` si el acceso de socios puede funcionar en este despliegue. */
export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * Igual que `supabaseConfig()` pero exigiendo el valor. Con el proyecto por
 * defecto presente no debería fallar nunca; se conserva porque el día que
 * alguien vacíe esa constante para forzar configuración explícita, el error
 * tiene que nombrar las variables y no reventar con un `undefined`.
 */
export function requireSupabaseConfig(): SupabaseConfig {
  const config = supabaseConfig();
  if (!config) {
    throw new Error(
      'Falta la configuración de Supabase. Definir NEXT_PUBLIC_SUPABASE_URL y ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, o restaurar el proyecto por defecto ' +
        'en src/infrastructure/auth/supabase.config.ts.',
    );
  }
  return config;
}
