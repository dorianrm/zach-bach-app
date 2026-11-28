'use client';

import { Banner } from '@/components/Banner';
import { DayHeading } from '@/components/DayHeading';
import { Tag } from '@/components/Tag';
import { TeamChip } from '@/components/TeamChip';
import { TeamHistory } from '@/components/TeamHistory';
import type { ChallengeView, CrawlState, StopView } from '@/lib/crawl';
import { mapUrl } from '@/lib/itinerary';
import { usePolled } from '@/lib/poll';

type Props = { initial: CrawlState; myTeamId: string | null; rules: string[] };

export function CrawlView({ initial, myTeamId, rules }: Props) {
  const state = usePolled('/api/state', initial);

  if (!state.teamsRevealed) {
    return (
      <>
        <section className="flex flex-col gap-3">
          <DayHeading>Squads</DayHeading>
          <p className="rounded-xl bg-card p-[18px] text-[15px] text-body">Teams revealed soon.</p>
        </section>
        <Rules rules={rules} />
      </>
    );
  }

  const current = state.stops.at(-1);
  const past = state.stops.slice(0, -1).reverse();
  const winner = state.crawlFinal ? state.standings[0] : undefined;

  return (
    <>
      {winner && (
        <Banner>
          Final: {winner.name} wins with {winner.total} points!
        </Banner>
      )}
      <section className="flex flex-col gap-3">
        <DayHeading>Scoreboard</DayHeading>
        <ol className="flex flex-col gap-3">
          {state.standings.map((team) => {
            const mine = team.id === myTeamId;
            return (
              <li
                key={team.id}
                aria-label={`${team.name}: ${team.total} points${mine ? ', your squad' : ''}`}
                className={`flex flex-col gap-2 rounded-xl bg-card ${mine ? 'border-2 border-highlight p-4' : 'p-[18px]'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <TeamChip name={team.name} color={team.color} />
                    {mine && <Tag>Your squad</Tag>}
                  </div>
                  <span className="font-mono text-2xl font-medium text-highlight">{team.total}</span>
                </div>
                <p className="text-[15px] leading-normal text-body">
                  {team.members.length > 0 ? team.members.join(', ') : 'No one yet'}
                </p>
                <TeamHistory team={team.name} history={team.history} />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <DayHeading>Current stop</DayHeading>
        {current ? (
          <StopCard stop={current} />
        ) : (
          <p className="rounded-xl bg-card p-[18px] text-[15px] text-body">First stop revealed soon.</p>
        )}
      </section>

      {state.anytime.length > 0 && (
        <section className="flex flex-col gap-3">
          <DayHeading>Anytime</DayHeading>
          <div className="rounded-xl bg-card p-[18px]">
            <Challenges challenges={state.anytime} />
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <DayHeading>Past stops</DayHeading>
          {past.map((s) => (
            <details key={s.id} className="rounded-xl bg-card p-[18px]">
              <summary className="cursor-pointer text-base font-semibold text-text">{s.name}</summary>
              <div className="pt-3">
                <StopBody stop={s} />
              </div>
            </details>
          ))}
        </section>
      )}

      <Rules rules={rules} />
    </>
  );
}

function StopCard({ stop }: { stop: StopView }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border-2 border-highlight bg-card p-4">
      <h3 className="text-xl font-semibold text-text">{stop.name}</h3>
      <StopBody stop={stop} />
    </article>
  );
}

function StopBody({ stop }: { stop: StopView }) {
  return (
    <div className="flex flex-col gap-3">
      <a href={mapUrl(stop.address)} target="_blank" rel="noopener noreferrer" className="text-sm text-link">
        {stop.address}
      </a>
      <Challenges challenges={stop.challenges} />
    </div>
  );
}

function Challenges({ challenges }: { challenges: ChallengeView[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {challenges.map((c) => (
        <li key={c.id} className="flex items-baseline justify-between gap-3 py-2 text-[15px] text-body">
          <span>{c.title}</span>
          <span className="shrink-0 font-mono text-sm font-medium text-highlight">
            {c.kind === 'placement' ? '3/2/1' : `+${c.points}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Rules({ rules }: { rules: string[] }) {
  return (
    <section className="flex flex-col gap-3">
      <DayHeading>Rules</DayHeading>
      <ul className="flex list-disc flex-col gap-1.5 rounded-xl bg-card p-[18px] pl-9 text-[15px] text-body">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
  );
}
