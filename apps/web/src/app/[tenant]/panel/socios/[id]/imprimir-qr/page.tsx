import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadTenantPage } from '@/lib/page-guards';
import { PERMISO, tienePermiso } from '@core/domain/operations/workspace';
import { membersRepository } from '@infra/config/composition-root';
import { exigirPermiso } from '../../../_datos';
import { ImprimirQrSocio } from '@/presentation/patterns/ImprimirQrSocio';

export const metadata: Metadata = { title: 'Imprimir QR', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface ImprimirQrProps {
  readonly params: Promise<{ tenant: string; id: string }>;
}

export default async function ImprimirQrPage({ params }: ImprimirQrProps) {
  const { id } = await params;
  const tenant = await loadTenantPage(params as unknown as Promise<{ tenant: string }>, ['memberLogin', 'enableMemberManagement']);
  const { slug, name } = tenant;
  const { perfil } = await exigirPermiso(slug, PERMISO.verSocios);

  const socios = await membersRepository();
  const ficha = await socios.ficha(id);
  if (!ficha || !ficha.checkinToken) notFound();

  return <ImprimirQrSocio slug={slug} ficha={ficha} gymName={name} />;
}
