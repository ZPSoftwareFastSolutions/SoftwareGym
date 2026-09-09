/**
 * CAPA: Infrastructure / Auth
 *
 * Configuración compartida por el middleware y el cliente de servidor.
 *
 * SE VALIDA AL USARLA, NO AL IMPORTARLA. La primera versión lanzaba al evaluar
 * el módulo, con la idea de que una variable ausente rompiera pronto y no
 * produjera un formulario de acceso que falla en silencio. La intención era
 * buena; el efecto, no: Next.js evalúa el grafo de módulos al recolectar los
 * datos de página durante el `build`, así que en un despliegue sin las
 * variables configuradas el `throw` tumbaba la compilación entera —las 24
 * páginas del sitio público incluidas, que no dependen de Supabase para nada—.
 *
 * Una capacidad que falta debe desactivar SU parte, no el producto completo.
 * Ahora el sitio público compila y se sirve siempre; lo único que queda
 * inhabilitado, y diciéndolo con claridad, es el acceso de socios.
 */

export interface SupabaseConfig {
  readonly url: string;
  readonly publishableKey: string;
}

/**
 * Devuelve la configuración, o `null` si falta. Nunca lanza: sirve para
 * preguntar «¿está disponible el acceso?» sin que la respuesta rompa la página.
 */
export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** `true` si el acceso de socios puede funcionar en este despliegue. */
export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * Igual que `supabaseConfig()` pero exigiendo el valor. Se usa solo donde ya
 * es seguro que la configuración existe; el mensaje nombra las dos variables
 * porque el error acaba en un registro que alguien va a leer con prisa.
 */
export function requireSupabaseConfig(): SupabaseConfig {
  const config = supabaseConfig();
  if (!config) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
        'En local: copiar apps/web/.env.example a .env.local. ' +
        'En Vercel: Settings → Environment Variables.',
    );
  }
  return config;
}
