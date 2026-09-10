/**
 * CAPA: Presentation / App — panel del socio.
 *
 * Lo que un socio necesita ver de sí mismo: qué le avisan, cuánto le queda de
 * membresía, su QR para entrar y cómo va su constancia.
 *
 * Todos los datos salen de vistas con RLS. Aunque esta página tuviera un fallo
 * de lógica, la base solo devuelve lo que la política permite: su ficha y
 * nada más. La interfaz no es la que decide, es la que muestra.
 */

import type { Metadata } from 'next';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { construirNotificaciones } from '@core/domain/operations/notifications';
import { NOMBRE_DE_METODO, rachaDeDias } from '@core/domain/operations/attendance';
import type { PuntoDeSerie } from '@core/domain/operations/dashboard';
import { matrizQr } from '@infra/operations/qr';
import { NotificationsPanel } from '@/presentation/patterns/NotificationsPanel';
import { BarChart } from '@/presentation/ui/BarChart';
import { DataTable } from '@/presentation/ui/DataTable';
import { EmptyState } from '@/presentation/ui/EmptyState';
import { QrCode } from '@/presentation/ui/QrCode';
import { StatCard } from '@/presentation/ui/StatCard';
import { Badge } from '@/presentation/ui/Badge';
import { LinkButton } from '@/presentation/ui/Button';
import { Icon } from '@/presentation/icons/Icon';
import { exigirPerfil, fechaCorta, hora } from '../_datos';

export const metadata: Metadata = {
  title: 'Mi panel',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ETIQUETA_ESTADO: Record<string, { texto: string; tono: 'action' | 'neutral' | 'structural' }> = {
  active: { texto: 'Activa', tono: 'action' },
  expiring_soon: { texto: 'Por vencer', tono: 'structural' },
  expired: { texto: 'Vencida', tono: 'neutral' },
  suspended: { texto: 'Suspendida', tono: 'neutral' },
  cancelled: { texto: 'Cancelada', tono: 'neutral' },
};

/** Agrupa los días de asistencia en semanas, de la más antigua a la más reciente. */
function porSemanas(dias: readonly string[], hoy: string, semanas: number): readonly PuntoDeSerie[] {
  const conjunto = new Set(dias);
  const base = new Date(`${hoy}T12:00:00Z`);
  const puntos: PuntoDeSerie[] = [];

  for (let indice = semanas - 1; indice >= 0; indice -= 1) {
    let visitas = 0;
    const inicio = new Date(base);
    inicio.setUTCDate(inicio.getUTCDate() - indice * 7 - 6);

    for (let desplazamiento = 0; desplazamiento < 7; desplazamiento += 1) {
      const dia = new Date(inicio);
      dia.setUTCDate(dia.getUTCDate() + desplazamiento);
      if (conjunto.has(dia.toISOString().slice(0, 10))) visitas += 1;
    }

    const fin = new Date(inicio);
    fin.setUTCDate(fin.getUTCDate() + 6);
    puntos.push({
      etiqueta: indice === 0 ? 'Esta' : `${indice}`,
      valor: visitas,
      detalle: `Semana del ${fechaCorta(inicio.toISOString().slice(0, 10))} al ${fechaCorta(
        fin.toISOString().slice(0, 10),
      )}: ${visitas} ${visitas === 1 ? 'visita' : 'visitas'}`,
    });
  }

  return puntos;
}

export default async function PanelDeSocioPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug, name, features } = tenant;
  const { perfil, repo } = await exigirPerfil(slug);

  const sinGimnasio = !perfil.tenantSlug;
  const sinFicha = !perfil.customerId;

  // En paralelo: son cuatro consultas independientes y encadenarlas sumaría
  // sus latencias sin ganar nada.
  const [hoy, membresia, avisos, token, dias, historial] = await Promise.all([
    // «Hoy» según el reloj DEL GIMNASIO, no el del servidor. Ver el puerto.
    repo.hoyDelGimnasio(slug),
    repo.miMembresia(),
    repo.avisos(),
    features.enableQrAttendance ? repo.miTokenDeCheckIn() : Promise.resolve(null),
    repo.misDiasDeAsistencia(90),
    repo.historialDeAsistencia({ limite: 8 }),
  ]);

  // Sin la capacidad de notificaciones contratada no se construye ninguna:
  // ni siquiera la derivada del vencimiento. Es la diferencia entre esconder
  // una sección y no tenerla.
  const notificaciones = features.enableNotifications
    ? construirNotificaciones(membresia, avisos, sinFicha)
    : [];
  const racha = rachaDeDias(dias, hoy);
  const esteMes = dias.filter((dia) => dia.slice(0, 7) === hoy.slice(0, 7)).length;
  const estado = membresia ? ETIQUETA_ESTADO[membresia.effectiveStatus] : undefined;
  const matriz = token ? matrizQr(token) : null;

  // Barra de progreso de la membresía. Se acota a [0, 100]: una membresía
  // vencida da días negativos y sin el tope la barra se saldría de su caja.
  const progreso = membresia
    ? Math.max(0, Math.min(100, Math.round((membresia.daysRemaining / 30) * 100)))
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <NotificationsPanel slug={slug} notificaciones={notificaciones} />

      {sinGimnasio ? (
        <section className="surface-card">
          <EmptyState
            icono="shield"
            titulo="Tu cuenta todavía no está asociada a un gimnasio"
            descripcion={`Acércate a recepción de ${name} para completarla. Hasta entonces no hay información que mostrarte.`}
          />
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              etiqueta="Membresía"
              valor={membresia ? `${Math.max(membresia.daysRemaining, 0)}` : '—'}
              icono="shield"
              tono={
                !membresia
                  ? 'neutro'
                  : membresia.effectiveStatus === 'expired'
                    ? 'alerta'
                    : membresia.effectiveStatus === 'expiring_soon'
                      ? 'alerta'
                      : 'accion'
              }
              comparacion={membresia ? `días restantes · vence el ${membresia.endDate}` : 'sin membresía registrada'}
            />
            <StatCard
              etiqueta="Este mes"
              valor={`${esteMes}`}
              icono="calendar"
              comparacion={esteMes === 1 ? 'visita registrada' : 'visitas registradas'}
            />
            <StatCard
              etiqueta="Racha"
              valor={`${racha}`}
              icono="sparkle"
              tono={racha >= 3 ? 'accion' : 'neutro'}
              comparacion={racha === 1 ? 'día seguido' : 'días seguidos'}
            />
            <StatCard
              etiqueta="Últimos 90 días"
              valor={`${dias.length}`}
              icono="dumbbell"
              comparacion="entradas registradas"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-constancia">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="titulo-constancia" className="t-h3">
                    Tu constancia
                  </h2>
                  <p className="mt-1.5 text-[0.86rem] text-muted">
                    Visitas por semana en los últimos tres meses.
                  </p>
                </div>
                {estado && <Badge tone={estado.tono}>{estado.texto}</Badge>}
              </div>

              {membresia && (
                <div className="mt-6">
                  <div className="flex items-baseline justify-between gap-3 text-[0.82rem]">
                    <span className="text-muted">Vigencia</span>
                    <span className="font-semibold text-ink">
                      {Math.max(membresia.daysRemaining, 0)} de 30 días
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-raised"
                    role="progressbar"
                    aria-valuenow={progreso}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Vigencia de tu membresía"
                  >
                    <div
                      className="h-full rounded-full bg-action transition-[width] duration-500"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
              )}

              <BarChart
                titulo="Visitas por semana"
                puntos={porSemanas(dias, hoy, 12)}
                unidad="visitas"
                alto={150}
                saltoDeEtiqueta={3}
                className="mt-7"
              />
            </section>

            <section className="surface-card flex flex-col items-center gap-4 p-6 text-center sm:p-7" aria-labelledby="titulo-qr">
              <h2 id="titulo-qr" className="t-h3">
                Tu QR de entrada
              </h2>

              {matriz && token ? (
                <>
                  <p className="text-[0.84rem] text-muted">
                    Enséñalo en recepción para registrar tu entrada.
                  </p>
                  <div className="rounded-[var(--t-radius-md)] bg-white p-3">
                    <QrCode
                      matriz={matriz}
                      descripcion="Código QR personal para registrar tu entrada al gimnasio"
                      className="max-w-[13rem]"
                    />
                  </div>
                  {/* El código en texto no es decoración: si la pantalla está
                      rayada o el lector falla, recepción lo teclea y la cola
                      sigue avanzando. */}
                  <p className="break-all font-mono text-[0.72rem] tracking-[0.12em] text-muted">
                    {token.match(/.{1,6}/g)?.join(' ')}
                  </p>
                  <p className="flex items-start gap-2 text-start text-[0.76rem] text-muted">
                    <Icon name="lock" size={14} className="mt-0.5 shrink-0 text-action" />
                    <span>
                      Este código solo sirve para marcar tu asistencia. No lleva tus datos ni da
                      acceso a tu cuenta.
                    </span>
                  </p>
                </>
              ) : (
                <EmptyState
                  icono="lock"
                  titulo="Todavía no tienes QR"
                  descripcion={
                    sinFicha
                      ? 'Tu QR se genera cuando recepción vincula tu cuenta con tu ficha de socio.'
                      : 'Pídelo en recepción y quedará disponible aquí.'
                  }
                />
              )}
            </section>
          </div>

          <section className="surface-card p-6 sm:p-7" aria-labelledby="titulo-historial">
            <h2 id="titulo-historial" className="t-h3">
              Tus últimas entradas
            </h2>

            <DataTable
              titulo="Historial de tus entradas al gimnasio"
              columnas={[
                { clave: 'fecha', titulo: 'Fecha', celda: (fila) => fechaCorta(fila.attendanceDate) },
                { clave: 'hora', titulo: 'Hora', celda: (fila) => hora(fila.checkedInAt) },
                {
                  clave: 'metodo',
                  titulo: 'Método',
                  secundaria: true,
                  celda: (fila) => NOMBRE_DE_METODO[fila.method],
                },
              ]}
              filas={historial}
              claveDeFila={(fila) => fila.id}
              className="mt-5"
              vacio={
                <EmptyState
                  icono="calendar"
                  titulo="Aún no hay entradas registradas"
                  descripcion="En cuanto registres tu primera entrada con el QR, aparecerá aquí."
                />
              }
            />
          </section>

          <div className="flex flex-wrap gap-3" data-print="hide">
            <LinkButton href={tenantHref(slug, 'planes')} variant="secondary" size="md">
              Ver paquetes
            </LinkButton>
            <LinkButton href={tenantHref(slug, 'horarios')} variant="ghost" size="md">
              Horarios
            </LinkButton>
          </div>
        </>
      )}
    </div>
  );
}
