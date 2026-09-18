/**
 * CAPA: Presentation / Patterns — la primera fila del tablero (V4.2).
 *
 * Los botones grandes con los que recepción, gerencia y administración empiezan
 * el día. Qué botones hay lo decide el dominio (`operations/tablero.ts`) a
 * partir de capacidades y permisos; este componente solo los dibuja y sabe a
 * dónde lleva cada clave.
 *
 * POR QUÉ OBJETIVOS GRANDES. Recepción los pulsa con una persona esperando
 * delante. Cada tarjeta ocupa toda su celda, tiene su icono y una línea que
 * dice qué pasa al pulsar: la diferencia entre acertar a la primera y volver
 * atrás. Las celdas son una rejilla que envuelve, nunca una fila que se
 * desplaza (regla de V4).
 *
 * «Escanear QR» no es un enlace sino la ventana del mostrador: con la cámara ya
 * abierta, que es el gesto que más se repite en el día.
 *
 * Es un componente de SERVIDOR: lo único de cliente que monta es el lector de
 * QR, y solo al abrirse (`montarSoloAbierto`).
 */

import Link from 'next/link';
import type { AccionRapida, ClaveDeAccionRapida } from '@core/domain/operations/tablero';
import { tenantHref } from '@/lib/tenant-links';
import { Icon, type AnyIconKey } from '../icons/Icon';
import { Modal } from '../ui/Modal';
import { CheckInPanel } from './CheckInPanel';

const ICONO: Readonly<Record<ClaveDeAccionRapida, AnyIconKey>> = {
  escanear: 'qr',
  'nuevo-socio': 'plus',
  socios: 'group',
  membresias: 'idcard',
  comprobantes: 'receipt',
  clases: 'clock',
  ingresos: 'wallet',
  accesos: 'key',
  personal: 'shield',
  anuncios: 'sparkle',
};

/** Segmento del panel al que lleva cada acción, con el filtro que la hace útil. */
const DESTINO: Readonly<Record<ClaveDeAccionRapida, string>> = {
  escanear: 'panel/gimnasio',
  'nuevo-socio': 'panel/socios/nuevo',
  socios: 'panel/socios',
  membresias: 'panel/socios?estado=expiring_soon',
  comprobantes: 'panel/comprobantes?estado=pendiente&preset=todo',
  clases: 'panel/clases',
  ingresos: 'panel/reportes/pagos?preset=mes',
  accesos: 'panel/accesos',
  personal: 'panel/personal',
  anuncios: 'panel/anuncios',
};

const CLASE_DE_TARJETA =
  'group flex min-h-[7.5rem] w-full flex-col items-start gap-2 rounded-[var(--t-radius-lg)] border border-line bg-raised p-5 text-start transition-colors hover:border-action focus-visible:border-action';

interface AccionesRapidasProps {
  readonly slug: string;
  readonly acciones: readonly AccionRapida[];
  /** Sede donde se registra al escanear. `null` = no hay dónde, y no se ofrece. */
  readonly sucursalDelMostrador: { readonly id: string; readonly name: string } | null;
  readonly mostrarSucursal?: boolean;
  /** Cuántos comprobantes esperan revisión, para que el botón lo diga. */
  readonly comprobantesPendientes?: number;
  readonly className?: string;
}

function Cuerpo({ accion, detalle }: { readonly accion: AccionRapida; readonly detalle?: string }) {
  return (
    <>
      <span className="flex size-10 items-center justify-center rounded-[var(--t-radius-md)] bg-action/12 text-action">
        <Icon name={ICONO[accion.clave]} size={20} />
      </span>
      <span className="text-[1.02rem] font-semibold text-ink">{accion.etiqueta}</span>
      <span className="text-[0.82rem] leading-snug text-muted">{detalle ?? accion.descripcion}</span>
    </>
  );
}

export function AccionesRapidas({
  slug,
  acciones,
  sucursalDelMostrador,
  mostrarSucursal = false,
  comprobantesPendientes,
  className,
}: AccionesRapidasProps) {
  if (acciones.length === 0) return null;

  return (
    <section aria-labelledby="titulo-acciones-rapidas" className={className}>
      <h2 id="titulo-acciones-rapidas" className="sr-only">
        Acciones frecuentes
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {acciones.map((accion) => {
          if (accion.clave === 'escanear') {
            // Sin sede operable el dominio ya la habría filtrado; el `null` de
            // aquí es el cinturón: nunca se abre el lector sin saber DÓNDE se
            // registra, porque la base volvería a exigirlo y daría un error.
            if (!sucursalDelMostrador) return null;
            return (
              <Modal
                key={accion.clave}
                titulo={mostrarSucursal ? `Registrar entrada · ${sucursalDelMostrador.name}` : 'Registrar entrada'}
                descripcion="Con la cámara o con el lector. Se registra solo al leer el QR."
                anchoMaximo="md"
                montarSoloAbierto
                prevenirCierreEnFondo
                disparador={
                  <button type="button" className={`${CLASE_DE_TARJETA} border-action/50 bg-action/8`}>
                    <Cuerpo
                      accion={accion}
                      detalle={mostrarSucursal ? `Registra en ${sucursalDelMostrador.name}` : accion.descripcion}
                    />
                  </button>
                }
              >
                <CheckInPanel slug={slug} sucursal={sucursalDelMostrador} mostrarSucursal={mostrarSucursal} empezarConCamara />
              </Modal>
            );
          }

          const detalle =
            accion.clave === 'comprobantes' && typeof comprobantesPendientes === 'number'
              ? comprobantesPendientes === 0
                ? 'No queda ninguno por revisar'
                : `${comprobantesPendientes} esperando aprobación`
              : undefined;

          return (
            <Link key={accion.clave} href={tenantHref(slug, DESTINO[accion.clave])} className={CLASE_DE_TARJETA}>
              <Cuerpo accion={accion} {...(detalle ? { detalle } : {})} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
