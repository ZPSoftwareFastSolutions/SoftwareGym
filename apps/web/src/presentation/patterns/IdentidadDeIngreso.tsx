'use client';

/**
 * CAPA: Presentation / Patterns (organismo)
 *
 * Identidad del socio al pasar el QR (V4.2).
 *
 * PARA QUÉ. El QR es un token opaco y rotable: identifica una ficha, no una
 * cara. Hasta aquí, prestarle el código a alguien no encontraba ningún
 * obstáculo en el mostrador. Esta ventana pone la foto a tamaño suficiente para
 * que recepción confirme de un vistazo quién está entrando, y la coloca de
 * frente para que el socio también la vea: si la cara no es la suya, se nota
 * desde los dos lados del mostrador.
 *
 * TODO LO QUE SE VE VIENE DEL SERVIDOR. Ni la foto, ni el nombre, ni el código,
 * ni el estado de la membresía viajan en el QR ni los decide el navegador: el
 * token solo sirve para que la base diga de quién se trata. Falsear algo aquí
 * exigiría falsear la respuesta del servidor.
 *
 * Se abre sola al resolverse el escaneo y se cierra sola: en un mostrador nadie
 * va a pulsar «cerrar» entre socio y socio. El cierre automático se cancela en
 * cuanto alguien toca la ventana, por si están mirando la foto con calma.
 */

import { useEffect, useRef, useState } from 'react';
import type { IdentidadDeSocio, ResultadoDeCheckIn } from '@core/domain/operations/attendance';
import { describirPase, elAccesoSeConcedio, identidadDelResultado } from '@core/domain/operations/attendance';
import { inicialesDe } from '@core/domain/operations/avatars';
import { cn } from '@/lib/cn';
import { Icon } from '../icons/Icon';
import { Dialogo } from '../ui/Modal';

/** Cuánto queda abierta sin que nadie la toque. Suficiente para leerla, poco para estorbar. */
const SEGUNDOS_VISIBLE = 8;

interface IdentidadDeIngresoProps {
  readonly resultado: ResultadoDeCheckIn | undefined;
  /** Cambia en cada intento, también si se repite el mismo socio: reabre la ventana. */
  readonly intento: number;
  readonly sucursal: string;
}

type Desenlace = 'autorizado' | 'repetido' | 'vencida' | 'sin-cupo' | 'sede';

const ROTULO: Readonly<
  Record<Desenlace, { readonly texto: string; readonly icono: 'check' | 'clock' | 'alert' | 'close' | 'pin' }>
> = {
  autorizado: { texto: 'ACCESO AUTORIZADO', icono: 'check' },
  repetido: { texto: 'ACCESO AUTORIZADO · YA VINO HOY', icono: 'clock' },
  vencida: { texto: 'ENTRÓ, PERO SU MEMBRESÍA VENCIÓ', icono: 'alert' },
  'sin-cupo': { texto: 'ACCESO DENEGADO · SIN ACCESOS HOY', icono: 'close' },
  sede: { texto: 'ACCESO DENEGADO · SEDE NO INCLUIDA', icono: 'pin' },
};

function desenlaceDe(resultado: ResultadoDeCheckIn): Desenlace {
  switch (resultado.tipo) {
    case 'registrado':
      return 'autorizado';
    case 'repetido':
      return 'repetido';
    case 'sin-cupo-diario':
      return 'sin-cupo';
    case 'sucursal-no-permitida':
      return 'sede';
    default:
      return 'vencida';
  }
}

export function IdentidadDeIngreso({ resultado, intento, sucursal }: IdentidadDeIngresoProps) {
  const [abierto, setAbierto] = useState(false);
  const [congelado, setCongelado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const identidad = resultado ? identidadDelResultado(resultado) : null;

  useEffect(() => {
    if (!identidad) return;
    setAbierto(true);
    setCongelado(false);
  }, [intento, identidad]);

  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (!abierto || congelado) return;
    temporizador.current = setTimeout(() => setAbierto(false), SEGUNDOS_VISIBLE * 1000);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [abierto, congelado, intento]);

  if (!identidad || !resultado) return null;

  const desenlace = desenlaceDe(resultado);
  const rotulo = ROTULO[desenlace];
  const dias = resultado.tipo === 'registrado' ? resultado.diasRestantes : null;
  const concedido = elAccesoSeConcedio(resultado);

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={() => setAbierto(false)}
      titulo={desenlace === 'autorizado' ? `¡Bienvenido, ${primerNombre(identidad.nombre)}!` : identidad.nombre}
      anchoMaximo="sm"
    >
      {/* Cualquier interacción cancela el cierre automático: si alguien está
          comparando la cara con la persona, la ventana no se le va sola. */}
      <div onPointerDown={() => setCongelado(true)} onKeyDown={() => setCongelado(true)}>
        <Retrato identidad={identidad} />

        <p className="mt-5 text-center text-[1.15rem] font-bold text-ink">{identidad.nombre}</p>
        {identidad.codigo && (
          <p className="text-center text-[0.85rem] text-muted">{identidad.codigo}</p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--t-radius-md)] border border-line bg-line">
          <Dato etiqueta="Membresía" valor={desenlace === 'vencida' ? 'Vencida' : 'Activa'} />
          <Dato
            etiqueta="Días restantes"
            valor={typeof dias === 'number' ? String(dias) : desenlace === 'vencida' ? '0' : '—'}
          />
          <Dato etiqueta="Racha" valor={identidad.racha > 0 ? `${identidad.racha} ${identidad.racha === 1 ? 'día' : 'días'}` : '—'} />
          <Dato etiqueta="Sucursal" valor={sucursal} />
        </dl>

        <p
          className={cn(
            'mt-6 flex items-center justify-center gap-2 rounded-[var(--t-radius-md)] px-4 py-3 text-center text-[0.95rem] font-bold',
            concedido ? 'bg-action text-on-action' : 'border border-structural/60 text-structural',
          )}
        >
          <Icon name={rotulo.icono} size={18} />
          {rotulo.texto}
        </p>

        {resultado.tipo === 'registrado' && (
          <p className="mt-3 text-center text-[0.82rem] font-semibold text-action">
            {describirPase(resultado.pase)}
          </p>
        )}

        {resultado.tipo === 'sin-cupo-diario' && (
          <p className="mt-3 text-center text-[0.82rem] text-muted">
            Ya usó sus {resultado.tope} accesos de hoy. Podrá entrar de nuevo mañana.
          </p>
        )}

        {resultado.tipo === 'sucursal-no-permitida' && (
          <p className="mt-3 text-center text-[0.82rem] text-muted">
            Su plan no incluye esta sede. Ofrécele uno que valga en todas.
          </p>
        )}
      </div>
    </Dialogo>
  );
}

function Retrato({ identidad }: { readonly identidad: IdentidadDeSocio }) {
  if (identidad.fotoUrl) {
    return (
      // `img` y no `next/image`: la URL viene firmada y caduca en minutos, así
      // que optimizarla y cachearla no aporta nada y estorba.
      <img
        src={identidad.fotoUrl}
        alt={`Foto de ${identidad.nombre}`}
        className="mx-auto block aspect-square w-48 rounded-[var(--t-radius-lg)] border border-line object-cover"
      />
    );
  }

  return (
    <div
      className="mx-auto grid aspect-square w-48 place-items-center rounded-[var(--t-radius-lg)] border border-line bg-raised"
      // Sin foto, las iniciales al menos confirman que la ficha abierta es la
      // que se esperaba. Un hueco gris no dice nada.
      aria-label={`${identidad.nombre} todavía no tiene foto de perfil`}
    >
      <span className="text-[3rem] font-bold text-muted">{inicialesDe(identidad.nombre)}</span>
    </div>
  );
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  return (
    <div className="bg-surface px-4 py-3 text-center">
      <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">{etiqueta}</dt>
      <dd className="mt-1 text-[1rem] font-bold text-ink">{valor}</dd>
    </div>
  );
}

function primerNombre(nombre: string): string {
  return nombre.split(/\s+/)[0] ?? nombre;
}
