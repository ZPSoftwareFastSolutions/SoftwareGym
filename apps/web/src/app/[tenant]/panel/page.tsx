/**
 * CAPA: Presentation / App — Panel del socio.
 *
 * Ruta protegida. La comprobación de sesión se hace AQUÍ con `getUser()`, no
 * en el middleware: el middleware renueva la cookie, pero su `matcher` puede
 * dejar rutas fuera y confiarle la autorización es cómo se abren huecos.
 *
 * Los datos vienen de vistas con RLS. Aunque esta página tuviera un fallo de
 * lógica, la base solo devuelve lo que la política permite: el socio ve su
 * ficha y nada más. La interfaz no es la que decide, es la que muestra.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { createSupabaseServerClient, getAuthenticatedUser } from '@infra/auth/supabase.server';
import { cerrarSesion } from '../acceso/actions';
import { Icon } from '@/presentation/icons/Icon';
import { PageHero } from '@/presentation/layouts/PageHero';
import { Badge } from '@/presentation/ui/Badge';
import { Button, LinkButton } from '@/presentation/ui/Button';

export const metadata: Metadata = {
  title: 'Mi panel',
  // Un panel privado no se indexa jamás.
  robots: { index: false, follow: false },
};

// Depende de la cookie de sesión: no puede prerenderizarse.
export const dynamic = 'force-dynamic';

interface Perfil {
  readonly full_name: string;
  readonly email: string;
  readonly tenant_slug: string | null;
  readonly tenant_name: string | null;
  readonly customer_id: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

interface MembresiaVigente {
  readonly end_date: string;
  readonly effective_status: string;
  readonly days_remaining: number;
}

const ETIQUETA_ESTADO: Record<string, { texto: string; tono: 'action' | 'neutral' | 'structural' }> = {
  active: { texto: 'Activa', tono: 'action' },
  expiring_soon: { texto: 'Por vencer', tono: 'structural' },
  expired: { texto: 'Vencida', tono: 'neutral' },
  suspended: { texto: 'Suspendida', tono: 'neutral' },
  cancelled: { texto: 'Cancelada', tono: 'neutral' },
};

export default async function PanelPage({ params }: TenantPageParams) {
  const tenant = await loadTenantPage(params, 'memberLogin');
  const { slug, name } = tenant;

  const usuario = await getAuthenticatedUser();
  if (!usuario) redirect(tenantHref(slug, 'acceso'));

  const supabase = await createSupabaseServerClient();

  const { data: perfil } = await supabase
    .from('v_my_profile')
    .select('full_name, email, tenant_slug, tenant_name, customer_id, roles, permissions')
    .maybeSingle<Perfil>();

  // El panel de OTRO gimnasio no es el panel de este socio.
  //
  // RLS ya impedía que se filtrara un solo dato ajeno —se comprobó—, pero sin
  // esta guarda `/otro-gimnasio/panel` respondía 200 y pintaba los datos del
  // socio bajo la marca del gimnasio equivocado. No era una fuga; era una
  // página que mentía sobre dónde estaba el usuario, y ese tipo de descuido es
  // el que termina convirtiéndose en fuga cuando alguien añade una consulta
  // nueva confiando en que la ruta ya está validada.
  if (perfil?.tenant_slug && perfil.tenant_slug !== slug) {
    redirect(tenantHref(perfil.tenant_slug, 'panel'));
  }

  // Una cuenta cuyo perfil no resolvió gimnasio queda inerte por diseño: puede
  // entrar, pero la base no le devuelve ningún dato. Se dice con claridad en
  // vez de mostrar un panel vacío que parece un error.
  const sinGimnasio = !perfil || !perfil.tenant_slug;

  // Un socio registrado desde la web todavía no está atado a una ficha: hasta
  // que recepción lo vincule, no hay membresía que enseñar.
  const sinFicha = Boolean(perfil && !perfil.customer_id);

  let membresia: MembresiaVigente | null = null;
  if (perfil?.customer_id) {
    const { data } = await supabase
      .from('v_memberships')
      .select('end_date, effective_status, days_remaining')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle<MembresiaVigente>();
    membresia = data ?? null;
  }

  const estado = membresia ? ETIQUETA_ESTADO[membresia.effective_status] : undefined;

  return (
    <>
      <PageHero
        slug={slug}
        eyebrow="Portal del socio"
        title={`Hola, ${perfil?.full_name ?? 'socio'}`}
        lead={`Tu información en ${perfil?.tenant_name ?? name}.`}
        breadcrumb="Mi panel"
      />

      <section className="section pt-0" aria-labelledby="panel-title">
        <div className="shell">
          <h2 id="panel-title" className="sr-only">
            Resumen de tu cuenta
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="surface-card p-7">
              <h3 className="t-h3">Tu cuenta</h3>
              <dl className="mt-5 flex flex-col gap-3 text-[0.92rem]">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Nombre</dt>
                  <dd className="text-ink">{perfil?.full_name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Correo</dt>
                  <dd className="break-all text-ink">{perfil?.email ?? usuario.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Gimnasio</dt>
                  <dd className="text-ink">{perfil?.tenant_name ?? '—'}</dd>
                </div>
              </dl>
            </article>

            <article className="surface-card p-7">
              <div className="flex items-start justify-between gap-4">
                <h3 className="t-h3">Tu membresía</h3>
                {estado && <Badge tone={estado.tono}>{estado.texto}</Badge>}
              </div>

              {membresia ? (
                <dl className="mt-5 flex flex-col gap-3 text-[0.92rem]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Vence</dt>
                    <dd className="text-ink">{membresia.end_date}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Días restantes</dt>
                    <dd className="text-ink">{membresia.days_remaining}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-5 flex items-start gap-2.5 text-[0.9rem] text-muted">
                  <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-action" />
                  <span>
                    {sinGimnasio
                      ? 'Tu cuenta todavía no está asociada a un gimnasio. Acércate a recepción para completarla.'
                      : sinFicha
                        ? 'Tu cuenta aún no está vinculada a tu ficha de socio. Recepción la vincula y aquí verás tu membresía, tus pagos y tu asistencia.'
                        : 'Todavía no tienes una membresía registrada.'}
                  </span>
                </p>
              )}
            </article>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <LinkButton href={tenantHref(slug, 'planes')} variant="secondary" size="md">
              Ver paquetes
            </LinkButton>

            {/* El cierre de sesión es un POST, no un enlace: una acción que
                cambia estado no puede dispararse con una precarga del
                navegador ni con una etiqueta de imagen ajena. */}
            <form action={cerrarSesion}>
              <input type="hidden" name="tenantSlug" value={slug} />
              <Button type="submit" variant="ghost" size="md">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
