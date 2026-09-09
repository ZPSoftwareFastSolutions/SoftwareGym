/**
 * CAPA: Presentation / Sections
 * Relato del gimnasio: texto, valores y línea de tiempo.
 */

import type { AboutContent } from '@core/domain/tenant/tenant-config';
import { hasIcon, Icon } from '../icons/Icon';
import { ArtFrame } from '../ui/ArtFrame';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface AboutSectionProps {
  readonly about: AboutContent;
  readonly withArt?: boolean;
}

export function AboutSection({ about, withArt = true }: AboutSectionProps) {
  return (
    <>
      <section className="section" aria-labelledby="nosotros-title">
        <div className="shell">
          <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <SectionHeading eyebrow={about.eyebrow} title={about.title} lead={about.lead} />

              <div className="mt-8 flex flex-col gap-5">
                {about.paragraphs.map((paragraph, index) => (
                  <Reveal key={paragraph.slice(0, 24)} delay={Math.min(index, 4) * 80}>
                    <p className="t-body">{paragraph}</p>
                  </Reveal>
                ))}
              </div>
            </div>

            {withArt && (
              <Reveal delay={120}>
                <div className="grid gap-4 sm:grid-cols-2 lg:sticky lg:top-28">
                  <ArtFrame seed={301} icon="dumbbell" ratio="3 / 4" />
                  <div className="flex flex-col gap-4 sm:pt-10">
                    <ArtFrame seed={412} icon="group" ratio="1 / 1" />
                    <ArtFrame seed={523} icon="heart" ratio="4 / 3" />
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      <section className="section surface-raised" aria-labelledby="valores-title">
        <div className="shell">
          <h2 id="valores-title" className="t-h2 max-w-2xl">
            Cómo trabajamos
          </h2>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {about.values.map((value, index) => (
              <li key={value.title}>
                <Reveal delay={Math.min(index, 4) * 80}>
                  <article className="surface-card flex h-full gap-5 p-7">
                    <span
                      aria-hidden="true"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--t-radius-md)] bg-action/12 text-action"
                    >
                      <Icon name={hasIcon(value.icon) ? value.icon : 'sparkle'} size={22} />
                    </span>
                    <div>
                      <h3 className="t-h3">{value.title}</h3>
                      <p className="mt-2.5 text-[0.93rem] leading-relaxed text-muted">
                        {value.description}
                      </p>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="historia-title">
        <div className="shell">
          <h2 id="historia-title" className="t-h2 max-w-2xl">
            Nuestra historia
          </h2>

          <ol className="mt-12 border-s border-line ps-8">
            {about.milestones.map((milestone, index) => (
              <li key={milestone.year} className="relative pb-10 last:pb-0">
                <Reveal delay={Math.min(index, 5) * 70}>
                  <span
                    aria-hidden="true"
                    className="absolute -start-[calc(2rem+5px)] top-1.5 grid h-2.5 w-2.5 place-items-center rounded-full bg-action ring-4 ring-[var(--t-surface)]"
                  />
                  <span
                    className="block text-2xl font-bold text-action"
                    style={{ fontFamily: 'var(--t-font-display)' }}
                  >
                    {milestone.year}
                  </span>
                  <p className="mt-1.5 max-w-xl text-[0.95rem] text-muted">{milestone.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
