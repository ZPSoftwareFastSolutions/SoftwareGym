/**
 * CAPA: Presentation / Sections
 *
 * Sucursales en la vitrina (V3.0).
 *
 * Idéntica para cualquier gimnasio: recibe las sedes ACTIVAS de la base y, si
 * el tenant lo trae, su texto comercial por `code`. Mítico con dos sedes, otro
 * gimnasio con cinco: el componente no sabe cuál es cuál, y ninguna sede está
 * escrita aquí. Una sede sin texto de vitrina se publica igual con sus datos.
 *
 * Tres presentaciones, porque cada página pide otra cosa:
 * - `portada`: el inicio. Tarjetas grandes con imagen, beneficios de tener
 *   varias sedes y salida a la página de sucursales. Sin mapas: varios iframes
 *   de Google pesan demasiado para la portada.
 * - `detalle`: la página `/sucursales`. Una fila por sede con su mapa, todos
 *   sus datos y un ancla (`#sede-CODE`) a la que enlaza la portada.
 * - `mapas`: contacto. Tarjetas compactas con el mapa de cada sede.
 *
 * Lo que la sede no tiene cargado cae al dato general del gimnasio (teléfono,
 * WhatsApp) o se dice con honestidad («consulta el horario»): nunca se
 * esconde la tarjeta ni se inventa un valor.
 */

import type { Sucursal } from '@core/domain/operations/branches';
import { lineasDeHorario, urlDeMapaEmbebido, urlDeUbicacion } from '@core/domain/operations/branches';
import type { BranchesContent, BranchShowcase, ContactInfo } from '@core/domain/tenant/tenant-config';
import { cn } from '@/lib/cn';
import { telHref, tenantHref, whatsappHref } from '@/lib/tenant-links';
import { hasIcon, Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

export type PresentacionDeSucursales = 'portada' | 'detalle' | 'mapas';

interface BranchesSectionProps {
  readonly sucursales: readonly Sucursal[];
  readonly tenantName: string;
  readonly slug: string;
  readonly contact: ContactInfo;
  readonly contenido?: BranchesContent;
  readonly presentacion: PresentacionDeSucursales;
  /** `showLocationMap` del tenant: sin él, ni `detalle` ni `mapas` incrustan mapas. */
  readonly conMapa?: boolean;
  /** `false` cuando la página ya trae su propio `h1` (la de sucursales). */
  readonly conEncabezado?: boolean;
  /** Antetítulo propio de la página que la usa («Cómo llegar» en contacto). */
  readonly eyebrow?: string;
  readonly className?: string;
}

/**
 * Beneficios por defecto. Son comportamiento del PRODUCTO, ciertos para
 * cualquier gimnasio multisede de la plataforma: la membresía es del
 * gimnasio, el QR identifica al socio y la racha cuenta días, no sedes.
 */
const BENEFICIOS_POR_DEFECTO: BranchesContent['benefits'] = [
  { title: 'Una sola membresía', description: 'Tu plan vale en todas las sedes. No pagas dos veces ni tienes que elegir una.', icon: 'shield' },
  { title: 'El mismo QR', description: 'Enséñalo en cualquier recepción y tu entrada queda registrada en esa sede.', icon: 'qr' },
  { title: 'Tu racha sigue', description: 'Entrenar un día en una sede y al siguiente en otra suma como días seguidos.', icon: 'fire' },
];

const NUMEROS = ['', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis'];

function tituloGenerico(cantidad: number): { titulo: string; acento?: string } {
  if (cantidad <= 1) return { titulo: 'Dónde', acento: 'entrenar' };
  return { titulo: `${NUMEROS[cantidad] ?? cantidad} sedes,`, acento: 'una sola membresía' };
}

/** Semilla estable por sede para la composición gráfica. */
function semilla(sucursal: Sucursal, texto?: BranchShowcase): number {
  if (texto?.seed !== undefined) return texto.seed;
  let valor = 7;
  for (const caracter of sucursal.code) valor = (valor * 31 + caracter.charCodeAt(0)) % 997;
  return valor;
}

function ordinal(indice: number): string {
  return String(indice + 1).padStart(2, '0');
}

export function BranchesSection({
  sucursales,
  tenantName,
  slug,
  contact,
  contenido,
  presentacion,
  conMapa = true,
  conEncabezado = true,
  eyebrow,
  className,
}: BranchesSectionProps) {
  if (sucursales.length === 0) return null;

  const varias = sucursales.length > 1;
  const textos = new Map((contenido?.showcase ?? []).map((texto) => [texto.code, texto]));
  const generico = tituloGenerico(sucursales.length);
  const titulo = contenido?.title ?? generico.titulo;
  const acento = contenido ? contenido.titleAccent : generico.acento;
  const lead =
    contenido?.lead ??
    (varias
      ? `Entrena en la sede que te quede más cerca: tu membresía de ${tenantName} vale en todas.`
      : `Te esperamos en ${tenantName}.`);
  const beneficios = contenido?.benefits ?? BENEFICIOS_POR_DEFECTO;

  return (
    <section
      id="sucursales"
      className={cn('section relative scroll-mt-24 overflow-hidden', className)}
      aria-labelledby={conEncabezado ? 'sucursales-title' : undefined}
      aria-label={conEncabezado ? undefined : 'Sucursales'}
    >
      {presentacion === 'portada' && <div aria-hidden="true" className="bg-aura opacity-60" />}

      <div className="shell relative">
        {conEncabezado && (
          <SectionHeading
            eyebrow={eyebrow ?? contenido?.eyebrow ?? 'Nuestras sucursales'}
            title={
              <span id="sucursales-title">
                {titulo}
                {acento && (
                  <>
                    {' '}
                    <span className="t-accent">{acento}</span>
                  </>
                )}
              </span>
            }
            lead={lead}
          />
        )}

        {varias && presentacion !== 'mapas' && (
          <ul className={cn('grid gap-4 sm:grid-cols-3', conEncabezado && 'mt-12')}>
            {beneficios.map((beneficio, indice) => (
              <li key={beneficio.title}>
                <Reveal delay={indice * 70} className="h-full">
                  <div className="flex h-full items-start gap-4 rounded-[var(--t-radius-lg)] border border-line bg-surface/60 p-5">
                    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--t-radius-md)] bg-action/12 text-action">
                      <Icon name={hasIcon(beneficio.icon) ? beneficio.icon : 'sparkle'} size={20} />
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">{beneficio.title}</span>
                      <span className="mt-1 block text-[0.88rem] leading-relaxed text-muted">{beneficio.description}</span>
                    </span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        )}

        {presentacion === 'portada' && (
          <>
            <ul className={cn('mt-10 grid gap-6', varias && 'lg:grid-cols-2')}>
              {sucursales.map((sucursal, indice) => (
                <li key={sucursal.id}>
                  <Reveal delay={Math.min(indice, 3) * 90} className="h-full">
                    <TarjetaDePortada
                      sucursal={sucursal}
                      texto={textos.get(sucursal.code)}
                      indice={indice}
                      varias={varias}
                      slug={slug}
                      contact={contact}
                      tenantName={tenantName}
                    />
                  </Reveal>
                </li>
              ))}
            </ul>
            {varias && (
              <div className="mt-10 flex flex-col items-center gap-3 text-center">
                <LinkButton href={tenantHref(slug, 'sucursales')} variant="secondary" size="lg" icon="arrowRight">
                  Ver sucursales, mapas y horarios
                </LinkButton>
              </div>
            )}
          </>
        )}

        {presentacion === 'detalle' && (
          <ol className="mt-14 flex flex-col gap-10 lg:gap-14">
            {sucursales.map((sucursal, indice) => (
              <li key={sucursal.id} id={`sede-${sucursal.code}`} className="scroll-mt-28">
                <FilaDeDetalle
                  sucursal={sucursal}
                  texto={textos.get(sucursal.code)}
                  indice={indice}
                  varias={varias}
                  contact={contact}
                  tenantName={tenantName}
                  conMapa={conMapa}
                />
              </li>
            ))}
          </ol>
        )}

        {presentacion === 'mapas' && (
          <ul className={cn('mt-14 grid gap-6', varias ? 'md:grid-cols-2' : 'max-w-2xl')}>
            {sucursales.map((sucursal, indice) => (
              <li key={sucursal.id}>
                <Reveal delay={Math.min(indice, 3) * 80} className="h-full">
                  <TarjetaConMapa
                    sucursal={sucursal}
                    texto={textos.get(sucursal.code)}
                    varias={varias}
                    contact={contact}
                    tenantName={tenantName}
                    conMapa={conMapa}
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface PiezaProps {
  readonly sucursal: Sucursal;
  readonly texto: BranchShowcase | undefined;
  readonly varias: boolean;
  readonly contact: ContactInfo;
  readonly tenantName: string;
}

/** Imagen de la sede: composición de marca con número y nombre grandes. */
function VisualDeSucursal({
  sucursal,
  texto,
  indice,
  varias,
  tenantName,
  tituloId,
  className,
}: Omit<PiezaProps, 'contact'> & {
  readonly indice: number;
  /** Con id, el nombre ES el título de la tarjeta (`h3`); sin él, un rótulo visual. */
  readonly tituloId?: string;
  readonly className?: string;
}) {
  // Un `h*` hereda la tipografía display de la marca; el rótulo sin título
  // tiene que pedirla explícitamente para verse igual.
  const Nombre = tituloId ? 'h3' : 'p';
  return (
    <div className={cn('relative', className)}>
      <ArtFrame seed={semilla(sucursal, texto)} ratio="16 / 10" className="h-full w-full rounded-none border-0" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          {varias ? (
            <span className="text-5xl font-bold leading-none text-action/90 sm:text-6xl" style={{ fontFamily: 'var(--t-font-display)' }}>
              {ordinal(indice)}
            </span>
          ) : (
            <span />
          )}
          {varias && sucursal.isPrimary && <Badge tone="action">Sede principal</Badge>}
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/80">
            <Icon name="pin" size={14} className="text-action" />
            {tenantName}
          </p>
          <Nombre
            id={tituloId}
            className="t-h2 mt-1.5 text-white"
            style={tituloId ? undefined : { fontFamily: 'var(--t-font-display)', textTransform: 'var(--t-heading-transform)', letterSpacing: 'var(--t-heading-tracking)', lineHeight: 1.06 }}
          >
            {sucursal.name}
          </Nombre>
        </div>
      </div>
    </div>
  );
}

function Destacados({ texto, columnas = false }: { readonly texto: BranchShowcase | undefined; readonly columnas?: boolean }) {
  if (!texto || texto.highlights.length === 0) return null;
  return (
    <ul className={cn('grid gap-2.5', columnas && 'sm:grid-cols-2')}>
      {texto.highlights.map((destacado) => (
        <li key={destacado} className="flex items-start gap-2.5 text-[0.92rem] text-ink">
          <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-action/15 text-action">
            <Icon name="check" size={13} />
          </span>
          {destacado}
        </li>
      ))}
    </ul>
  );
}

function DatosDeContacto({
  sucursal,
  contact,
  completo = false,
}: {
  readonly sucursal: Sucursal;
  readonly contact: ContactInfo;
  readonly completo?: boolean;
}) {
  const horario = lineasDeHorario(sucursal.openingHours);
  const telefono = sucursal.phone ?? contact.phone;

  return (
    <dl className="flex flex-col gap-3 text-[0.92rem]">
      <div className="flex items-start gap-3">
        <dt className="sr-only">Dirección</dt>
        <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-action" />
        <dd className="text-ink">{sucursal.address ?? `${contact.city}, ${contact.country}`}</dd>
      </div>
      <div className="flex items-start gap-3">
        <dt className="sr-only">Horario</dt>
        <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-action" />
        <dd className="text-muted">
          {horario.length > 0
            ? horario.map((linea) => (
                <span key={linea} className="block text-ink">
                  {linea}
                </span>
              ))
            : 'Consúltanos el horario de esta sede por WhatsApp.'}
        </dd>
      </div>
      {completo && (
        <div className="flex items-start gap-3">
          <dt className="sr-only">Teléfono</dt>
          <Icon name="phone" size={18} className="mt-0.5 shrink-0 text-action" />
          <dd>
            <a href={telHref(telefono)} className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:text-action hover:underline">
              {telefono}
            </a>
          </dd>
        </div>
      )}
      {completo && sucursal.email && (
        <div className="flex items-start gap-3">
          <dt className="sr-only">Correo</dt>
          <Icon name="mail" size={18} className="mt-0.5 shrink-0 text-action" />
          <dd>
            <a href={`mailto:${sucursal.email}`} className="inline-flex min-h-11 items-center break-all text-ink underline-offset-4 hover:text-action hover:underline">
              {sucursal.email}
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}

function TarjetaDePortada({
  sucursal,
  texto,
  indice,
  varias,
  slug,
  contact,
  tenantName,
}: PiezaProps & { readonly indice: number; readonly slug: string }) {
  const ubicacion = urlDeUbicacion(sucursal, contact.city);

  return (
    <article
      className="surface-card group flex h-full flex-col overflow-hidden transition-colors hover:border-action/40"
      aria-labelledby={`portada-sede-${sucursal.code}`}
    >
      <VisualDeSucursal
        sucursal={sucursal}
        texto={texto}
        indice={indice}
        varias={varias}
        tenantName={tenantName}
        tituloId={`portada-sede-${sucursal.code}`}
      />

      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
        <div>
          {texto?.tagline && <p className="t-eyebrow">{texto.tagline}</p>}
          {texto?.description && <p className="mt-3 leading-relaxed text-muted">{texto.description}</p>}
        </div>

        <Destacados texto={texto} />

        <div className="mt-auto flex flex-col gap-5 border-t border-line pt-5">
          <DatosDeContacto sucursal={sucursal} contact={contact} />
          <div className="flex flex-wrap gap-2.5">
            {ubicacion && (
              <LinkButton href={ubicacion} external variant="primary" size="md" icon="pin" iconPosition="start">
                Ver ubicación
              </LinkButton>
            )}
            {varias && (
              <LinkButton href={`${tenantHref(slug, 'sucursales')}#sede-${sucursal.code}`} variant="ghost" size="md" icon="arrowRight">
                Conocer la sede
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function FilaDeDetalle({
  sucursal,
  texto,
  indice,
  varias,
  contact,
  tenantName,
  conMapa,
}: PiezaProps & { readonly indice: number; readonly conMapa: boolean }) {
  const mapa = conMapa ? urlDeMapaEmbebido(sucursal, contact.city) : null;
  const ubicacion = urlDeUbicacion(sucursal, contact.city);
  // Alterna el lado de la imagen: dos filas iguales seguidas se leen como una lista.
  const invertida = indice % 2 === 1;

  return (
    <Reveal>
      <article className="surface-card grid overflow-hidden lg:grid-cols-2" aria-labelledby={`detalle-sede-${sucursal.code}`}>
        <div className={cn('relative flex flex-col', invertida && 'lg:order-2')}>
          <VisualDeSucursal sucursal={sucursal} texto={texto} indice={indice} varias={varias} tenantName={tenantName} />
          {mapa && (
            <iframe
              src={mapa}
              title={`Mapa de ${tenantName} ${sucursal.name}`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="map-embed h-64 w-full flex-1 border-0 border-t border-line lg:min-h-72"
            />
          )}
        </div>

        <div className="flex flex-col gap-6 p-7 sm:p-9 lg:p-11">
          <div>
            <p className="t-eyebrow">{texto?.tagline ?? (varias && sucursal.isPrimary ? 'Sede principal' : 'Sucursal')}</p>
            <h2 id={`detalle-sede-${sucursal.code}`} className="t-h2 mt-4">
              {sucursal.name}
            </h2>
            {texto?.description && <p className="t-lead mt-4">{texto.description}</p>}
          </div>

          <Destacados texto={texto} columnas />

          <div className="rounded-[var(--t-radius-lg)] border border-line bg-surface/60 p-5">
            <DatosDeContacto sucursal={sucursal} contact={contact} completo />
          </div>

          <div className="mt-auto flex flex-wrap gap-2.5">
            {ubicacion && (
              <LinkButton href={ubicacion} external variant="primary" size="lg" icon="pin" iconPosition="start" glow>
                Cómo llegar
              </LinkButton>
            )}
            <LinkButton href={whatsappHref(contact)} external variant="secondary" size="lg" icon="whatsapp" iconPosition="start">
              Escribir por WhatsApp
            </LinkButton>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function TarjetaConMapa({ sucursal, texto, varias, contact, tenantName, conMapa }: PiezaProps & { readonly conMapa: boolean }) {
  const mapa = conMapa ? urlDeMapaEmbebido(sucursal, contact.city) : null;
  const ubicacion = urlDeUbicacion(sucursal, contact.city);

  return (
    <article className="surface-card flex h-full flex-col overflow-hidden" aria-labelledby={`mapa-sede-${sucursal.code}`}>
      {mapa ? (
        <iframe
          src={mapa}
          title={`Mapa de ${tenantName} ${sucursal.name}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="map-embed h-56 w-full border-0 border-b border-line"
        />
      ) : (
        <ArtFrame seed={semilla(sucursal, texto)} icon="pin" ratio="16 / 9" className="rounded-none border-0 border-b" />
      )}

      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted">{texto?.tagline ?? tenantName}</span>
            {varias && sucursal.isPrimary && <Badge tone="action">Sede principal</Badge>}
          </div>
          <h3 id={`mapa-sede-${sucursal.code}`} className="t-h3 mt-1.5">
            {sucursal.name}
          </h3>
        </div>

        <DatosDeContacto sucursal={sucursal} contact={contact} completo />

        <div className="mt-auto flex flex-wrap gap-2.5">
          {ubicacion && (
            <LinkButton href={ubicacion} external variant="primary" size="md" icon="pin" iconPosition="start">
              Ver ubicación
            </LinkButton>
          )}
          <LinkButton href={whatsappHref(contact)} external variant="secondary" size="md" icon="whatsapp" iconPosition="start">
            Escribir
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
