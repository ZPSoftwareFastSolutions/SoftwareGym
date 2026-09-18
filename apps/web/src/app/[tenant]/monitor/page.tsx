import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { operationsRepository } from '@infra/config/composition-root';
import { PantallaMonitor } from '@/presentation/patterns/PantallaMonitor';

export const metadata: Metadata = {
  title: 'Monitor de Acceso',
  robots: { index: false, follow: false },
};

export default async function MonitorPage({ params }: { readonly params: Promise<{ tenant: string }> }) {
  const p = await params;
  const tenant = await loadTenantPage(params, 'memberLogin');

  // Guardia de seguridad manual: exige perfil activo en este tenant
  const repo = await operationsRepository();
  const perfil = await repo.perfil();
  if (!perfil || perfil.tenantSlug !== tenant.slug) {
    return notFound();
  }

  const { espacioDeTrabajo } = await import('@core/domain/operations/workspace');
  if (espacioDeTrabajo(perfil) === 'socio') {
    return notFound(); // Los socios no pueden ver el monitor de recepción
  }

  return <PantallaMonitor slug={p.tenant} />;
}
