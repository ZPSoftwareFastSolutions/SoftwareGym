/**
 * CAPA: Presentation / Sections
 * Equipo profesional. Solo se renderiza si `features.showTeam` está activa;
 * Aurora Fit la tiene apagada y no muestra esta sección en ninguna página.
 */

import type { TeamMember } from '@core/domain/catalog/catalog';
import { ArtFrame } from '../ui/ArtFrame';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

interface TeamSectionProps {
  readonly team: readonly TeamMember[];
  readonly eyebrow?: string;
  readonly title?: string;
  readonly lead?: string;
}

export function TeamSection({
  team,
  eyebrow = 'Equipo',
  title = 'Quiénes te van a acompañar',
  lead,
}: TeamSectionProps) {
  if (team.length === 0) return null;

  return (
    <section className="section" aria-labelledby="equipo-title">
      <div className="shell">
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member, index) => (
            <li key={member.id}>
              <Reveal delay={Math.min(index, 5) * 70}>
                <article className="surface-card h-full overflow-hidden">
                  <ArtFrame seed={member.seed} icon="trainer" ratio="1 / 1" />

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-ink">{member.name}</h3>
                    <p className="mt-0.5 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-action">
                      {member.role}
                    </p>
                    <p className="mt-3 text-[0.89rem] leading-relaxed text-muted">{member.bio}</p>

                    <ul className="mt-4 flex flex-wrap gap-2">
                      {member.specialties.map((s) => (
                        <li
                          key={s}
                          className="rounded-[var(--t-radius-sm)] border border-line px-2.5 py-1 text-[0.72rem] text-muted"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
