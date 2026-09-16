'use server';

/**
 * Acciones de los anuncios del gimnasio (V4.1).
 *
 * Todas exigen la capacidad `enableAnnouncements` y el permiso
 * `content.manage`, pero esa comprobación existe para contestar pronto y claro:
 * quien impide la escritura es RLS. El gimnasio SIEMPRE sale del perfil de la
 * sesión, nunca del formulario.
 *
 * La imagen se valida por sus BYTES (`imagenDeFormulario`), no por el
 * `Content-Type` que escribe el navegador de quien sube.
 */

import { revalidatePath } from 'next/cache';
import {
  esTipoDeAnuncio,
  etiquetasDeTexto,
  validarAnuncio,
  type DatosDeAnuncio,
} from '@core/domain/operations/announcements';
import { PERMISO } from '@core/domain/operations/workspace';
import { announcementsRepository } from '@infra/config/composition-root';
import { contextoDeAccion, imagenDeFormulario, nulo, texto, type EstadoDeFormulario } from '../_acciones';

/**
 * Una fecha de un `<input type="datetime-local">` llega sin zona («2026-09-20T18:00»).
 * Se interpreta en la hora del servidor si se pasa tal cual, así que se
 * convierte a ISO explícito con el desfase de quien la escribió… que tampoco
 * conocemos. Se toma como hora local del servidor y la base la guarda con zona:
 * para «desde cuándo se publica» la precisión de minutos no cambia nada, y el
 * gimnasio ve siempre la fecha que eligió.
 */
function momento(valor: string, pordefecto: string | null): string | null {
  const limpio = valor.trim();
  if (limpio === '') return pordefecto;
  const fecha = new Date(limpio);
  return Number.isNaN(fecha.getTime()) ? pordefecto : fecha.toISOString();
}

function revalidar(slug: string) {
  revalidatePath(`/${slug}/panel`, 'layout');
  // La vitrina se regenera sola cada cinco minutos (ISR); esto hace que el
  // anuncio recién publicado se vea al instante.
  revalidatePath(`/${slug}`);
}

async function acceso(form: FormData) {
  return contextoDeAccion(form, ['enableAnnouncements'], PERMISO.gestionarContenido);
}

/** Alta o edición según venga `anuncioId`. */
export async function guardarAnuncio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const { slug, perfil } = permiso.contexto;
  if (!perfil.tenantId) return { mensaje: 'Tu cuenta no pertenece a un gimnasio.' };

  const id = texto(form, 'anuncioId', 40).trim();

  // Campos por nombre y no por un índice de diccionario: con
  // `noUncheckedIndexedAccess` cada lectura sería `string | undefined` y habría
  // que comprobar quince veces algo que aquí siempre es una cadena.
  const title = texto(form, 'title', 200);
  const summary = texto(form, 'summary', 400);
  const cuerpo = texto(form, 'body', 8000);
  const kindCrudo = texto(form, 'kind', 30);
  const linkUrl = texto(form, 'linkUrl', 500);
  const linkLabel = texto(form, 'linkLabel', 60);
  const sortOrder = texto(form, 'sortOrder', 8);
  const publishedAtCrudo = texto(form, 'publishedAt', 40);
  const expiresAtCrudo = texto(form, 'expiresAt', 40);
  const imageAlt = texto(form, 'imageAlt', 200);
  const tagline = texto(form, 'tagline', 200);
  const tagsCrudo = texto(form, 'tags', 800);
  const tagsLabel = texto(form, 'tagsLabel', 100);
  const footnote = texto(form, 'footnote', 100);

  // Lo enviado, para volver a pintarlo si la validación falla.
  const valores: Readonly<Record<string, string>> = {
    title,
    summary,
    body: cuerpo,
    kind: kindCrudo,
    linkUrl,
    linkLabel,
    sortOrder,
    publishedAt: publishedAtCrudo,
    expiresAt: expiresAtCrudo,
    imageAlt,
    tagline,
    tags: tagsCrudo,
    tagsLabel,
    footnote,
  };

  const repo = await announcementsRepository();

  // Al editar se parte de lo guardado: así un formulario enviado sin tocar la
  // imagen no la borra, y una edición no pierde la fecha de publicación.
  const actual = id ? await repo.porId(id) : null;
  if (id && !actual) return { mensaje: 'Ese anuncio no existe o no es de este gimnasio.', valores };

  let imagePath = actual?.imagePath ?? null;
  const subida = await imagenDeFormulario(form, 'imagen');
  if (subida && !subida.ok) return { mensaje: subida.mensaje, valores };
  if (subida?.ok) {
    const guardada = await repo.subirImagen(perfil.tenantId, subida.imagen.bytes, subida.imagen.tipo);
    if (!guardada.ok) return { mensaje: guardada.mensaje, valores };
    imagePath = guardada.valor.imagePath;
  }

  const publicado = momento(publishedAtCrudo, actual?.publishedAt ?? new Date().toISOString());
  const datos: DatosDeAnuncio = {
    title: title.trim(),
    summary: nulo(summary),
    body: nulo(cuerpo),
    imagePath,
    imageAlt: nulo(imageAlt),
    kind: esTipoDeAnuncio(kindCrudo) ? kindCrudo : 'novedad',
    linkUrl: nulo(linkUrl),
    linkLabel: nulo(linkLabel),
    sortOrder: Number.parseInt(sortOrder, 10) || 0,
    // Una casilla sin marcar no llega en el FormData: ausente = no visible.
    isActive: form.get('isActive') === 'on' || form.get('isActive') === 'true',
    publishedAt: publicado ?? new Date().toISOString(),
    expiresAt: momento(expiresAtCrudo, null),
    tagline: nulo(tagline),
    tags: etiquetasDeTexto(tagsCrudo),
    tagsLabel: nulo(tagsLabel),
    footnote: nulo(footnote),
  };

  const errores = validarAnuncio(datos);
  if (Object.keys(errores).length > 0) return { errores, valores, mensaje: 'Revisa los campos marcados.' };

  const resultado = id ? await repo.actualizar(id, datos) : await repo.crear(perfil.tenantId, datos);
  if (!resultado.ok) return { mensaje: resultado.mensaje, valores };

  revalidar(slug);
  return { exito: id ? 'Anuncio actualizado.' : 'Anuncio publicado.' };
}

export async function retirarAnuncio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, false);
}

export async function republicarAnuncio(_previo: EstadoDeFormulario, form: FormData): Promise<EstadoDeFormulario> {
  return cambiarEstado(form, true);
}

async function cambiarEstado(form: FormData, activo: boolean): Promise<EstadoDeFormulario> {
  const permiso = await acceso(form);
  if (!permiso.ok) return { mensaje: permiso.mensaje };
  const resultado = await (await announcementsRepository()).cambiarEstado(texto(form, 'anuncioId', 40), activo);
  if (!resultado.ok) return { mensaje: resultado.mensaje };
  revalidar(permiso.contexto.slug);
  return { exito: activo ? 'Anuncio publicado de nuevo.' : 'Anuncio retirado de la vitrina.' };
}
