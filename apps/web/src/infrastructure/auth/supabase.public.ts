/**
 * CAPA: Infrastructure / Auth
 *
 * Cliente de Supabase ANÓNIMO para lecturas públicas desde páginas estáticas.
 *
 * POR QUÉ NO SIRVE EL CLIENTE DE SERVIDOR. `createSupabaseServerClient` lee
 * `cookies()`, y en cuanto una página lee cookies Next.js la vuelve dinámica:
 * la vitrina de cada gimnasio dejaría de servirse desde CDN para mostrar la
 * dirección de sus sedes. Este cliente no toca cookies ni guarda sesión, así
 * que la página sigue siendo estática (ISR).
 *
 * Usa la clave PUBLICABLE —la misma que ya viaja al navegador—, nunca
 * `service_role`. Actúa como visitante anónimo: RLS solo le deja leer lo que
 * la política pública permite (sedes activas y sus datos de puerta).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase.config';

export function createSupabasePublicClient(): SupabaseClient | null {
  const config = supabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
