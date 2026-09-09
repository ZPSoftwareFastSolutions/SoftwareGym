/**
 * CAPA: Infrastructure / Auth
 *
 * Configuración compartida por el cliente de navegador y el de servidor.
 *
 * Se valida al cargar el módulo, no en la primera petición: una variable de
 * entorno ausente debe romper el arranque y no producir un formulario de
 * acceso que falla en silencio cuando alguien intenta entrar.
 */

function requerida(nombre: string, valor: string | undefined): string {
  const limpio = valor?.trim();
  if (!limpio) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copiar apps/web/.env.example a .env.local.`,
    );
  }
  return limpio;
}

export const SUPABASE_URL = requerida(
  'NEXT_PUBLIC_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

/**
 * Clave PUBLICABLE. Es pública por diseño y viaja al navegador.
 *
 * No concede nada por sí sola: todo lo que se puede leer o escribir con ella
 * lo decide RLS. La que sí concede todo es `service_role`, que tiene BYPASSRLS
 * y no aparece en este proyecto ni debe aparecer nunca en el lado cliente.
 */
export const SUPABASE_PUBLISHABLE_KEY = requerida(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
