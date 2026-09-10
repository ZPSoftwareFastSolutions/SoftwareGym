/**
 * CAPA: Domain / Operations
 *
 * Notificaciones del socio.
 *
 * DECISIÓN DE FONDO: el aviso de vencimiento NO se guarda en la base.
 *
 * Es la misma regla que ya rige `membership_status` —«por vencer» es derivado
 * de `end_date`, no una columna—. Guardar la notificación obligaría a un
 * proceso diario que la cree, otro que la borre cuando el socio renueva, y
 * dejaría abierta la puerta a que la fila diga «vence en 3 días» cuando la
 * membresía ya se renovó. Se calcula al pintar y no puede contradecir a la
 * fecha, porque es la fecha.
 *
 * Lo único que se persiste son los avisos que alguien escribe a mano, que son
 * los únicos que no se pueden deducir de ningún dato.
 */

export type TipoDeNotificacion = 'vencimiento' | 'vencida' | 'aviso' | 'bienvenida';

export type UrgenciaDeNotificacion = 'alta' | 'media' | 'informativa';

export interface Notificacion {
  readonly id: string;
  readonly tipo: TipoDeNotificacion;
  readonly urgencia: UrgenciaDeNotificacion;
  readonly titulo: string;
  readonly cuerpo: string;
  readonly fecha: string | null;
  /** `true` cuando el socio ya la marcó como leída. Las derivadas nunca lo están. */
  readonly leida: boolean;
  /** Las derivadas no se pueden marcar como leídas: se van cuando se resuelve el motivo. */
  readonly descartable: boolean;
}

export interface AvisoInterno {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly leido: boolean;
}

export interface MembresiaParaAvisar {
  readonly endDate: string;
  readonly effectiveStatus: string;
  readonly daysRemaining: number;
}

/** A partir de cuántos días restantes se avisa. Coincide con `expiring_soon` de la base. */
export const DIAS_PARA_AVISAR = 7;

/**
 * Construye la lista completa que ve el socio: lo derivado primero, porque es
 * lo que le puede costar dinero, y los avisos del gimnasio después.
 */
export function construirNotificaciones(
  membresia: MembresiaParaAvisar | null,
  avisos: readonly AvisoInterno[],
  sinFicha: boolean,
): readonly Notificacion[] {
  const lista: Notificacion[] = [];

  if (membresia) {
    if (membresia.effectiveStatus === 'expired') {
      lista.push({
        id: 'derivada:vencida',
        tipo: 'vencida',
        urgencia: 'alta',
        titulo: 'Tu membresía venció',
        cuerpo: `Venció el ${membresia.endDate}. Renuévala en recepción para seguir entrenando.`,
        fecha: membresia.endDate,
        leida: false,
        descartable: false,
      });
    } else if (membresia.daysRemaining <= DIAS_PARA_AVISAR && membresia.daysRemaining >= 0) {
      const dias = membresia.daysRemaining;
      lista.push({
        id: 'derivada:vencimiento',
        tipo: 'vencimiento',
        urgencia: 'media',
        titulo: dias === 0 ? 'Tu membresía vence hoy' : `Tu membresía vence en ${dias} ${dias === 1 ? 'día' : 'días'}`,
        cuerpo: `Vence el ${membresia.endDate}. Puedes renovarla en recepción antes de esa fecha.`,
        fecha: membresia.endDate,
        leida: false,
        descartable: false,
      });
    }
  } else if (sinFicha) {
    lista.push({
      id: 'derivada:sin-ficha',
      tipo: 'bienvenida',
      urgencia: 'informativa',
      titulo: 'Falta vincular tu ficha',
      cuerpo:
        'Tu cuenta está creada, pero todavía no está unida a tu ficha de socio. ' +
        'Acércate a recepción y desde aquí verás tu membresía, tu asistencia y tu QR de entrada.',
      fecha: null,
      leida: false,
      descartable: false,
    });
  }

  for (const aviso of avisos) {
    lista.push({
      id: `aviso:${aviso.id}`,
      tipo: 'aviso',
      urgencia: 'informativa',
      titulo: aviso.title,
      cuerpo: aviso.body,
      fecha: aviso.startsAt,
      leida: aviso.leido,
      descartable: true,
    });
  }

  return lista;
}

/** Cuántas piden atención: lo derivado siempre cuenta, los avisos solo si no se leyeron. */
export function sinLeer(notificaciones: readonly Notificacion[]): number {
  return notificaciones.filter((n) => !n.leida).length;
}
