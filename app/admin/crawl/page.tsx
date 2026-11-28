import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { TeamChip } from '@/components/TeamChip';
import { TeamHistory } from '@/components/TeamHistory';
import { requireAdmin } from '@/lib/auth';
import { Banner } from '@/components/Banner';
import { crawlFinal, lastUndoable, loadRoute, loadStandings, teamsRevealed } from '@/lib/crawl';
import { hideLastStop, hideTeams, revealNextStop, revealTeams } from './actions';
import { AwardControls } from './AwardControls';

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
  const [revealed, teams, last, route, final] = await Promise.all([
    teamsRevealed(),
    loadStandings(),
    lastUndoable(),
    loadRoute(),
    crawlFinal(),
  ]);
  const shown = route.stops.filter((s) => s.revealed);
  const current = shown.at(-1);
  const next = route.stops.find((s) => !s.revealed);
  // Award picks: the current stop first, then anytime, then earlier stops.
  const groups = [
    ...(current ? [{ label: current.name, challenges: current.challenges }] : []),
    { label: 'Anytime', challenges: route.anytime },
    ...shown
      .slice(0, -1)
      .reverse()
      .map((s) => ({ label: s.name, challenges: s.challenges })),
  ].filter((g) => g.challenges.length > 0);

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

      {final && <Banner>Final: {teams[0]?.name} wins with {teams[0]?.total} points.</Banner>}

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-text">Stops</h3>
        <ol className="flex flex-col gap-1 rounded-xl bg-card p-[18px] text-[15px]">
          {route.stops.map((s) => (
            <li key={s.id} className={s.revealed ? 'text-text' : 'text-muted'}>
              {s.name} · {s === current ? 'Current' : s.revealed ? 'Done' : 'Hidden'}
            </li>
          ))}
          {route.stops.length === 0 && <li className="text-muted">No stops yet. Run the seed.</li>}
        </ol>
        {/* Keyed by stop, so the panel opens closed again after each reveal. */}
        {/* Guests get no stops until the teams are revealed, so a stop revealed earlier
            would show on no phone. */}
        {next && !revealed && (
          <p className="rounded-xl bg-card p-[18px] text-[15px] text-muted">Reveal teams first. Then you can reveal stops.</p>
        )}
        {next && revealed && (
          <Confirm
            key={`reveal-${next.id}`}
            summary={`Reveal next stop: ${next.name}`}
            body="Every phone shows this stop, its address and its challenges within a few seconds."
            button="Yes, reveal the stop"
            action={revealNextStop}
          />
        )}
        {current && (
          <Confirm
            key={`hide-${current.id}`}
            summary={`Hide last stop: ${current.name}`}
            body="Phones stop showing it within a few seconds. Points already given stay."
            button="Yes, hide the stop"
            action={hideLastStop}
          />
        )}
      </section>

      <AwardControls
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        groups={groups}
        undoText={last?.text ?? null}
        final={final}
      />

      {/* Dorian sees the rosters before the reveal, to check them. */}
      <ul className="flex flex-col gap-3">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-col gap-2 rounded-xl bg-card p-[18px]">
            <div className="flex items-center justify-between gap-3">
              <TeamChip name={team.name} color={team.color} />
              <span className="font-mono text-xl font-medium text-highlight">{team.total}</span>
            </div>
            <p className="text-[15px] text-body">{team.members.length > 0 ? team.members.join(', ') : 'No one yet'}</p>
            <TeamHistory team={team.name} history={team.history} />
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
