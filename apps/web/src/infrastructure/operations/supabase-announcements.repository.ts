/**
 * CAPA: Infrastructure / Operations
 *
 * Anuncios contra Supabase (V4.1).
 *
 * Aquí no hay ni un filtro de seguridad: qué anuncios existen para quien
 * pregunta lo decide RLS, y quién puede publicarlos, `content.manage`. El
 * adaptador solo traduce filas a dominio y errores de la base a frases que un
 * gerente entiende.
 *
 * `tenant_slug`, la autoría y los tiempos de edición NO se envían nunca: no
 * están concedidos y los rellena el disparador. Enviarlos daría 42501 (la
 * lección de V3.2 y de `cambiar_estado_de_cuenta` en V4).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AnnouncementsRepositoryPort,
  PublicAnnouncementsPort,
} from '@core/application/ports/announcements-repository.port';
import { exito, fallo, type ResultadoDeOperacion } from '@core/application/ports/resultado';
import {
  esTipoDeAnuncio,
  type Anuncio,
  type AnuncioPublico,
  type DatosDeAnuncio,
} from '@core/domain/operations/announcements';

const BUCKET = 'anuncios';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNAS =
  'id, title, summary, body, image_path, image_alt, kind, link_url, link_label, sort_order, is_active, published_at, expires_at, tagline, tags, tags_label, footnote';

function etiquetas(valor: unknown): readonly string[] {
  return Array.isArray(valor) ? valor.filter((e): e is string => typeof e === 'string' && e.trim() !== '') : [];
}

const EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function aAnuncio(fila: Record<string, unknown>): Anuncio {
  const kind = fila.kind;
  return {
    id: String(fila.id),
    title: String(fila.title ?? ''),
    summary: texto(fila.summary),
    body: texto(fila.body),
    imagePath: texto(fila.image_path),
    imageAlt: texto(fila.image_alt),
    // Un tipo que la base acepte y el dominio todavía no conozca no debe
    // romper la lista: cae a «novedad», que es el neutro.
    kind: esTipoDeAnuncio(kind) ? kind : 'novedad',
    linkUrl: texto(fila.link_url),
    linkLabel: texto(fila.link_label),
    sortOrder: Number(fila.sort_order ?? 0),
    isActive: fila.is_active === true,
    publishedAt: String(fila.published_at ?? ''),
    expiresAt: texto(fila.expires_at),
    tagline: texto(fila.tagline),
    tags: etiquetas(fila.tags),
    tagsLabel: texto(fila.tags_label),
    footnote: texto(fila.footnote),
  };
}

function aFila(datos: DatosDeAnuncio) {
  return {
    title: datos.title,
    summary: datos.summary,
    body: datos.body,
    image_path: datos.imagePath,
    image_alt: datos.imageAlt,
    kind: datos.kind,
    link_url: datos.linkUrl,
    link_label: datos.linkLabel,
    sort_order: datos.sortOrder,
    is_active: datos.isActive,
    published_at: datos.publishedAt,
    expires_at: datos.expiresAt,
    tagline: datos.tagline,
    tags: [...datos.tags],
    tags_label: datos.tagsLabel,
    footnote: datos.footnote,
  };
}

function mensajeDeError(error: { code?: string; message?: string } | null): string {
  const detalle = `${error?.code ?? ''} ${error?.message ?? ''}`;
  if (detalle.includes('announcements_title_no_vacio')) return 'El título es obligatorio y no puede pasar de 160 caracteres.';
  if (detalle.includes('announcements_resumen_corto')) return 'El resumen no puede pasar de 300 caracteres.';
  if (detalle.includes('announcements_vigencia')) return 'El vencimiento tiene que ser posterior a la publicación.';
  if (detalle.includes('announcements_kind_check')) return 'Ese tipo de anuncio no existe.';
  if (detalle.includes('announcements_link_url_check')) return 'El enlace tiene que empezar por http:// o https://.';
  if (detalle.includes('announcements_lema_corto')) return 'La frase no puede pasar de 120 caracteres.';
  if (detalle.includes('announcements_etiquetas_validas')) return 'Hasta 12 etiquetas, de 40 caracteres cada una.';
  if (detalle.includes('announcements_rotulo_de_etiquetas')) return 'El rótulo de las etiquetas no puede pasar de 60 caracteres.';
  if (detalle.includes('announcements_nota_corta')) return 'La nota no puede pasar de 60 caracteres.';
  if (detalle.includes('23514')) return 'Algún dato no tiene el formato esperado. Revisa los campos.';
  if (error?.code === '42501') return 'Tu cuenta no puede publicar anuncios en este gimnasio.';
  return 'No se pudo guardar. Vuelve a intentarlo.';
}

export class SupabaseAnnouncementsRepository implements AnnouncementsRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async listar(): Promise<readonly Anuncio[]> {
    const { data } = await this.supabase
      .from('announcements')
      .select(COLUMNAS)
      .order('sort_order', { ascending: false })
      .order('published_at', { ascending: false });
    return (data ?? []).map((fila) => aAnuncio(fila as Record<string, unknown>));
  }

  async porId(id: string): Promise<Anuncio | null> {
    if (!PATRON_UUID.test(id)) return null;
    const { data } = await this.supabase.from('announcements').select(COLUMNAS).eq('id', id).maybeSingle();
    return data ? aAnuncio(data as Record<string, unknown>) : null;
  }

  urlDeImagen(imagePath: string | null): string | null {
    if (imagePath === null || imagePath.trim() === '') return null;
    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(imagePath);
    return data.publicUrl;
  }

  async crear(tenantId: string, datos: DatosDeAnuncio): Promise<ResultadoDeOperacion<{ readonly id: string }>> {
    const { data, error } = await this.supabase
      .from('announcements')
      .insert({ tenant_id: tenantId, ...aFila(datos) })
      .select('id')
      .maybeSingle();
    if (error) return fallo(mensajeDeError(error));
    // Sin fila devuelta la política de SELECT no dejó verla: no es un éxito
    // silencioso, es que la escritura no ocurrió.
    if (!data) return fallo('No se pudo guardar el anuncio.');
    return exito({ id: String((data as Record<string, unknown>).id) });
  }

  async actualizar(id: string, datos: DatosDeAnuncio): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ese anuncio no existe.');
    // `.select('id')` distingue «RLS lo bloqueó» (0 filas) de «se guardó».
    const { data, error } = await this.supabase
      .from('announcements')
      .update(aFila(datos))
      .eq('id', id)
      .select('id');
    if (error) return fallo(mensajeDeError(error));
    if (!data || data.length === 0) return fallo('No se pudo guardar: tu cuenta no puede editar este anuncio.');
    return exito(null);
  }

  async cambiarEstado(id: string, activo: boolean): Promise<ResultadoDeOperacion<null>> {
    if (!PATRON_UUID.test(id)) return fallo('Ese anuncio no existe.');
    const { data, error } = await this.supabase
      .from('announcements')
      .update({ is_active: activo })
      .eq('id', id)
      .select('id');
    if (error) return fallo(mensajeDeError(error));
    if (!data || data.length === 0) return fallo('No se pudo cambiar: tu cuenta no puede editar este anuncio.');
    return exito(null);
  }

  async subirImagen(
    tenantId: string,
    bytes: Uint8Array,
    tipo: 'image/jpeg' | 'image/png' | 'image/webp',
  ): Promise<ResultadoDeOperacion<{ readonly imagePath: string }>> {
    const extension = EXTENSION[tipo];
    if (!extension) return fallo('Ese formato de imagen no se admite.');

    // La carpeta es el id del gimnasio porque de ahí saca la política de
    // Storage a quién pertenece el archivo (`app.tenant_de_ruta`).
    const ruta = `${tenantId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await this.supabase.storage.from(BUCKET).upload(ruta, bytes, {
      contentType: tipo,
      upsert: false,
    });
    if (error) {
      const detalle = `${error.message ?? ''}`;
      if (detalle.includes('row-level security') || detalle.includes('Unauthorized')) {
        return fallo('Tu cuenta no puede subir imágenes de anuncios en este gimnasio.');
      }
      if (detalle.includes('maximum allowed size')) return fallo('La imagen pesa más de 3 MB.');
      return fallo('No se pudo subir la imagen. Vuelve a intentarlo.');
    }
    return exito({ imagePath: ruta });
  }
}

export class SupabasePublicAnnouncementsRepository implements PublicAnnouncementsPort {
  constructor(private readonly supabase: SupabaseClient | null) {}

  async anunciosPublicos(tenantSlug: string): Promise<readonly AnuncioPublico[]> {
    if (!this.supabase) return [];
    try {
      // La vista ya aplica «activo, publicado y no vencido» y el orden: la regla
      // de qué está publicado vive en un solo sitio (la base), no aquí.
      const { data, error } = await this.supabase
        .from('v_announcements_public')
        .select('id, title, summary, body, image_path, image_alt, kind, link_url, link_label, published_at, tagline, tags, tags_label, footnote')
        .eq('tenant_slug', tenantSlug);
      if (error) return [];

      return (data ?? []).map((cruda) => {
        const fila = cruda as Record<string, unknown>;
        const anuncio = aAnuncio(fila);
        const imagePath = anuncio.imagePath;
        const url = imagePath === null ? null : this.supabase!.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl;
        return {
          id: anuncio.id,
          title: anuncio.title,
          summary: anuncio.summary,
          body: anuncio.body,
          imageUrl: url,
          imageAlt: anuncio.imageAlt,
          kind: anuncio.kind,
          linkUrl: anuncio.linkUrl,
          linkLabel: anuncio.linkLabel,
          publishedAt: anuncio.publishedAt,
          tagline: anuncio.tagline,
          tags: anuncio.tags,
          tagsLabel: anuncio.tagsLabel,
          footnote: anuncio.footnote,
        };
      });
    } catch {
      // Un anuncio nunca justifica un 500 en el inicio: sin datos, la sección
      // sencillamente no se dibuja.
      return [];
    }
  }
}
