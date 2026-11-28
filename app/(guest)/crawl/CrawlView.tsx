'use client';

import { DayHeading } from '@/components/DayHeading';
import { Tag } from '@/components/Tag';
import { TeamChip } from '@/components/TeamChip';
import type { CrawlState } from '@/lib/crawl';
import { usePolled } from '@/lib/poll';

export function CrawlView({ initial, myTeamId }: { initial: CrawlState; myTeamId: string | null }) {
  const state = usePolled('/api/state', initial);

  if (!state.teamsRevealed) {
    return (
      <section className="flex flex-col gap-3">
        <DayHeading>Squads</DayHeading>
        <p className="rounded-xl bg-card p-[18px] text-[15px] text-body">Teams revealed soon.</p>
      </section>
    );
  }

  return (
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
