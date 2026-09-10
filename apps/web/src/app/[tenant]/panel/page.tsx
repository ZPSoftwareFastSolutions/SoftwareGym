/**
 * CAPA: Presentation / App — reparto del panel.
 *
 * `/[tenant]/panel` no pinta nada: manda a cada quien a su espacio de trabajo.
 *
 * POR QUÉ TRES RUTAS Y NO UNA CON CONDICIONALES. Un panel único con «si es
 * gerente muestra esto, si es socio lo otro» acaba siendo una página que
 * nadie entiende entera y en la que un `if` mal puesto enseña a un socio una
 * tabla que no le toca. Tres rutas, tres páginas, cada una con su guarda y su
 * propósito: cuál corresponde lo decide `espacioDeTrabajo`, a partir de los
 * permisos y no del nombre del rol.
 *
 * Esta redirección NO autoriza. Quien llegue a mano a un espacio que no le
 * corresponde se topa con la guarda de esa página y, por debajo, con RLS.
 */

import { redirect } from 'next/navigation';
import { loadTenantPage, type TenantPageParams } from '@/lib/page-guards';
import { tenantHref } from '@/lib/tenant-links';
import { SEGMENTO_DE_ESPACIO } from '@core/domain/operations/workspace';
import { exigirPerfil } from './_datos';

export const dynamic = 'force-dynamic';

export default async function PanelPage({ params }: TenantPageParams) {
  const { slug } = await loadTenantPage(params, 'memberLogin');
  const { espacio } = await exigirPerfil(slug);

  redirect(tenantHref(slug, SEGMENTO_DE_ESPACIO[espacio]));
}
