/**
 * CAPA: Presentation / App — sucursal de trabajo (V3.0).
 *
 * Quien atiende el mostrador trabaja EN una sede. Mientras no la cambie, cada
 * entrada que registra se asocia a esa sede sin preguntarle en cada escaneo.
 *
 * DÓNDE SE GUARDA: en una cookie POR DISPOSITIVO. Un mostrador es un lugar
 * físico: el ordenador de la sede Centro registra en Centro aunque la misma
 * recepcionista haya usado el móvil en la sede Norte esta mañana. Guardarlo en la
 * cuenta obligaría a cambiarlo cada vez que alguien se mueve de sede.
 *
 * LA COOKIE ES UNA PREFERENCIA, NO UN PERMISO. Se vuelve a resolver contra la
 * base en cada petición (`v_mis_sucursales`, que usa la misma función que RLS)
 * y, aunque alguien la escriba a mano, la base rechaza la entrada en una sede
 * donde no puede operar.
 */

import { cache } from 'react';
import { cookies } from 'next/headers';
import {
  resolverSucursalOperativa,
  type SucursalOperable,
} from '@core/domain/operations/branches';
import { PERMISO, tienePermiso, type PerfilOperativo } from '@core/domain/operations/workspace';
import { branchesRepository } from '@infra/config/composition-root';

export const COOKIE_DE_SUCURSAL = 'gp-sucursal';

export interface ContextoDeSucursal {
  /** Todas las sedes del gimnasio (activas e inactivas), para poner nombre a los registros. */
  readonly sucursales: readonly SucursalOperable[];
  /** Sedes activas donde la sesión puede operar. */
  readonly operables: readonly SucursalOperable[];
  /** Sede de trabajo actual. `null` si no puede operar en ninguna. */
  readonly actual: SucursalOperable | null;
  /** `branches.all`: ve y opera todas las sedes; tiene vista global. */
  readonly alcanceGlobal: boolean;
}

/** Deduplicado por petición: layout, página y acciones lo piden varias veces. */
const sucursalesDeLaSesion = cache(async (): Promise<readonly SucursalOperable[]> => {
  return (await branchesRepository()).misSucursales();
});

export async function contextoDeSucursal(perfil: PerfilOperativo): Promise<ContextoDeSucursal> {
  const sucursales = await sucursalesDeLaSesion();
  const operables = sucursales.filter((s) => s.puedeOperar && s.isActive);
  const preferida = (await cookies()).get(COOKIE_DE_SUCURSAL)?.value ?? null;

  return {
    sucursales,
    operables,
    actual: resolverSucursalOperativa(sucursales, preferida),
    alcanceGlobal: tienePermiso(perfil, PERMISO.todasLasSucursales),
  };
}

/** Opciones de la cookie. `HttpOnly`: el navegador no necesita leerla, la pinta el servidor. */
export function opcionesDeCookieDeSucursal(slug: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // Por gimnasio: una recepcionista que trabajara para dos gimnasios en el
    // mismo navegador no mezcla sedes.
    path: `/${slug}`,
    maxAge: 60 * 60 * 24 * 365,
  };
}
