import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { TeamChip } from '@/components/TeamChip';
import { requireAdmin } from '@/lib/auth';
import { loadStandings, teamsRevealed } from '@/lib/crawl';
import { hideTeams, revealTeams } from './actions';

export default function AdminCrawlPage() {
  return (
    <PageShell active="more">
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">Crawl admin</h2>
          <a href="/admin" className="text-sm text-link">
            Admin
          </a>
        </div>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <CrawlAdmin />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function CrawlAdmin() {
  await requireAdmin('/admin/crawl');
  const [revealed, teams] = await Promise.all([teamsRevealed(), loadStandings()]);

  return (
    <>
      <p className="text-[15px] text-body">
        {revealed ? 'Teams are revealed. Guests see rosters and scores.' : 'Teams are hidden. Guests see "Teams revealed soon."'}
      </p>
      {/* Two taps either way, so a stray tap in a bar does not change what guests see.
          Each panel has its own key, so the open reveal panel is not reused as an open hide panel. */}
      {revealed ? (
        <Confirm
          key="hide"
          summary="Hide teams"
          body={'Every phone goes back to "Teams revealed soon." within a few seconds. Guests who already looked have seen the squads.'}
          button="Yes, hide from everyone"
          action={hideTeams}
        />
      ) : (
        <Confirm
          key="reveal"
          summary="Reveal teams"
          body="Every phone shows the rosters and the scoreboard within a few seconds."
          button="Yes, reveal to everyone"
          action={revealTeams}
        />
      )}

      {/* Dorian sees the rosters before the reveal, to check them. */}
      <ul className="flex flex-col gap-3">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-col gap-2 rounded-xl bg-card p-[18px]">
            <div className="flex items-center justify-between gap-3">
              <TeamChip name={team.name} color={team.color} />
              <span className="font-mono text-xl font-medium text-highlight">{team.total}</span>
            </div>
            <p className="text-[15px] text-body">{team.members.length > 0 ? team.members.join(', ') : 'No one yet'}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

function Confirm(props: { summary: string; body: string; button: string; action: () => Promise<void> }) {
  return (
    <details className="rounded-xl bg-card p-[18px]">
      <summary className="cursor-pointer text-base font-semibold text-link">{props.summary}</summary>
      <div className="flex flex-col gap-3 pt-3">
        <p className="text-[15px] text-body">{props.body}</p>
        <form action={props.action}>
          <button
            type="submit"
            className="min-h-11 w-full rounded-full bg-highlight px-[18px] text-sm font-semibold text-on-highlight"
          >
            {props.button}
          </button>
        </form>
      </div>
    </details>
  );
}
