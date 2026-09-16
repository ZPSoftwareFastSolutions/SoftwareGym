/**
 * CAPA: Presentation / App — Raíz del dominio.
 *
 * Esta rama publica el sitio de UN gimnasio, no la vitrina de la plataforma:
 * la raíz redirige al gimnasio por defecto y no existe ninguna página que
 * enumere clientes.
 *
 * Es una redirección permanente porque la raíz no va a volver a tener
 * contenido propio en este despliegue: los buscadores deben quedarse con la
 * URL del gimnasio, que es la que se comparte.
 */

import { permanentRedirect } from 'next/navigation';
import { DEFAULT_TENANT_SLUG } from '@infra/tenants/tenant.registry';

export default function RootPage(): never {
  permanentRedirect(`/${DEFAULT_TENANT_SLUG}`);
}
