/**
 * CAPA: Presentation / Patterns
 *
 * La cabecera del tablero y lo que necesita atención hoy (V5).
 *
 * POR QUÉ EXISTE. El tablero abría con doce números iguales de grandes y
 * obligaba a quien está en el mostrador —que muchas veces no es del área— a
 * decidir cuál de ellos importaba. Aquí se contesta esa pregunta antes: quién
 * eres, dónde estás, qué día es, y qué tienes que hacer hoy. Si no hay nada que
 * hacer, lo dice; un hueco no es una respuesta.
 *
 * NO ES UN FILTRO DE SEGURIDAD: cada asunto enlaza a una pantalla que vuelve a
 * exigir capacidad y permiso, y la lista solo se arma con los contadores que la
 * persona ya podía ver.
 */

import Link from 'next/link';
import type { AsuntoDeAtencion, ClaveDeAtencion } from '@core/domain/operations/tablero';
import { cn } from '@/lib/cn';
import { Icon, type AnyIconKey } from '../icons/Icon';

interface TextoDeAsunto {
  readonly icono: AnyIconKey;
  /** Se le pasa la cantidad porque «1 comprobante» y «3 comprobantes» no se dicen igual. */
  readonly titulo: (n: number) => string;
  readonly detalle: string;
  readonly accion: string;
}

const TEXTO: Readonly<Record<ClaveDeAtencion, TextoDeAsunto>> = {
  comprobantes: {
    icono: 'receipt',
    titulo: (n) => (n === 1 ? 'Hay 1 comprobante sin revisar' : `Hay ${n} comprobantes sin revisar`),
    detalle: 'Alguien pagó y espera su membresía.',
    accion: 'Revisar',
  },
  'por-vencer': {
    icono: 'clock',
    titulo: (n) => (n === 1 ? '1 membresía vence pronto' : `${n} membresías vencen pronto`),
    detalle: 'Un aviso a tiempo es una renovación.',
    accion: 'Ver quiénes',
  },
  vencidas: {
    icono: 'alert',
    titulo: (n) => (n === 1 ? '1 membresía vencida' : `${n} membresías vencidas`),
    detalle: 'Siguen pudiendo entrar, pero conviene hablarlo.',
    accion: 'Ver lista',
  },
  'sin-membresia': {
    icono: 'shield',
    titulo: (n) => (n === 1 ? '1 socio sin membresía' : `${n} socios sin membresía`),
    detalle: 'Ficha creada, plan sin vender.',
    accion: 'Ver lista',
  },
  'sin-venir': {
    icono: 'fire',
    titulo: (n) => (n === 1 ? '1 socio no viene hace más de una semana' : `${n} socios no vienen hace más de una semana`),
    detalle: 'Con membresía vigente: vale un mensaje.',
    accion: 'Ver quiénes',
  },
};

interface ResumenDelDiaProps {
  readonly saludo: string;
  readonly nombre: string;
  readonly puesto: string;
  /** Fecha ya escrita en largo, con la zona del gimnasio. */
  readonly fecha: string;
  readonly sucursal?: string | undefined;
  readonly asuntos: readonly AsuntoDeAtencion[];
  /** Adónde lleva cada asunto; si falta uno, ese asunto se muestra sin enlace. */
  readonly enlaces: Partial<Record<ClaveDeAtencion, string>>;
}

export function ResumenDelDia({ saludo, nombre, puesto, fecha, sucursal, asuntos, enlaces }: ResumenDelDiaProps) {
  return (
    <section className="surface-card overflow-hidden p-0" aria-labelledby="titulo-resumen-del-dia">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line px-6 py-6 sm:px-7">
        <div className="min-w-0">
          <h2 id="titulo-resumen-del-dia" className="t-h3">
            {saludo}, {nombre}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.88rem] text-muted">
            <span>{puesto}</span>
            {sucursal && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <Icon name="pin" size={15} className="text-action" />
                  {sucursal}
                </span>
              </>
            )}
          </p>
        </div>
        <p className="text-[0.88rem] capitalize text-muted">{fecha}</p>
      </div>

      <div className="px-6 py-6 sm:px-7">
        {asuntos.length === 0 ? (
          <p className="flex items-center gap-3 text-[0.95rem] text-ink">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-action/15">
              <Icon name="check" size={20} className="text-action" />
            </span>
            Todo al día. No hay nada pendiente en el mostrador.
          </p>
        ) : (
          <>
            <h3 className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">Para hoy</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {asuntos.map((asunto) => {
                const texto = TEXTO[asunto.clave];
                const href = enlaces[asunto.clave];
                const contenido = (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-full',
                        asunto.tono === 'urgente' ? 'bg-action/15 text-action' : 'bg-raised text-muted',
                      )}
                    >
                      <Icon name={texto.icono} size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.98rem] font-semibold leading-snug text-ink">{texto.titulo(asunto.cantidad)}</span>
                      <span className="mt-0.5 block text-[0.85rem] leading-relaxed text-muted">{texto.detalle}</span>
                    </span>
                    {href && (
                      <span className="hidden shrink-0 items-center gap-1.5 text-[0.86rem] font-semibold text-action sm:inline-flex">
                        {texto.accion}
                        <Icon name="arrowRight" size={15} />
                      </span>
                    )}
                  </>
                );

                return (
                  <li key={asunto.clave}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex items-center gap-4 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-action/50 hover:bg-raised"
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-4 rounded-[var(--t-radius-md)] border border-line bg-surface px-4 py-3.5">{contenido}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
