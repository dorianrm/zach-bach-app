'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { BONUS_CHIPS } from '@/lib/awards';
import type { ChallengeView } from '@/lib/crawl';
import { award, bonus, finalize, placement, undoLast, type AwardResult } from './actions';

type Team = { id: string; name: string };
type Group = { label: string; challenges: ChallengeView[] };
type Props = { teams: Team[]; groups: Group[]; undoText: string | null; final: boolean };

const PLACES = ['1st', '2nd', '3rd'];

// Award, placement, bonus, undo and final. After each tap a toast says what changed, so
// Dorian can check it without reading the scoreboard. After the final, points are locked.
export function AwardControls({ teams, groups, undoText, final }: Props) {
  const [picked, setPicked] = useState<ChallengeView | null>(null);
  // A saved award clears the pick, so the next tap on a squad cannot repeat it by accident.
  const clearOnSuccess =
    (action: (prev: AwardResult, form: FormData) => Promise<AwardResult>) => async (prev: AwardResult, form: FormData) => {
      const result = await action(prev, form);
      if (result.message) setPicked(null);
      return result;
    };
  const [awardResult, awardAction, awardPending] = useActionState(clearOnSuccess(award), {});
  const [placeResult, placeAction, placePending] = useActionState(clearOnSuccess(placement), {});
  const [bonusResult, bonusAction, bonusPending] = useActionState<AwardResult, FormData>(bonus, {});
  const [undoResult, undoAction, undoPending] = useActionState<AwardResult, FormData>(undoLast, {});
  const [finalResult, finalAction, finalPending] = useActionState<AwardResult, FormData>(finalize, {});
  const latest = [awardResult, placeResult, bonusResult, undoResult, finalResult].reduce((a, b) =>
    (b.at ?? 0) > (a.at ?? 0) ? b : a,
  );

  if (final) {
    return (
      <>
        <p className="rounded-xl bg-card p-[18px] text-[15px] text-body">The crawl is final. Points are locked.</p>
        <Toast result={latest} />
      </>
    );
  }

  return (
    <>
      {/* The challenge pick is page state. Each squad button and the placement have their
          own form, so the request always carries the challenge and the squad. */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-[18px]">
        <h3 className="text-base font-semibold text-text">Award a challenge</h3>
        {groups.length === 0 && <p className="text-[15px] text-muted">No challenges yet. Reveal a stop or run the seed.</p>}
        {groups.map((g) => (
          <fieldset key={g.label} className="flex flex-col gap-2">
            <legend className="pb-2 text-sm text-body">{g.label}</legend>
            <div className="flex flex-wrap gap-2">
              {g.challenges.map((c) => (
                <label
                  key={c.id}
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-text has-checked:border-highlight has-checked:bg-highlight has-checked:text-on-highlight has-focus-visible:outline-2 has-focus-visible:outline-link"
                >
                  <input
                    type="radio"
                    name="challengeId"
                    value={c.id}
                    checked={picked?.id === c.id}
                    onChange={() => setPicked(c)}
                    className="sr-only"
                  />
                  {c.title} · {c.kind === 'placement' ? '3/2/1' : `+${c.points}`}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {picked?.kind === 'award' && (
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 text-sm text-body">Tap the squad that won</legend>
            <div className="flex flex-col gap-2">
              {teams.map((t) => (
                <form key={t.id} action={awardAction} className="flex flex-col">
                  <input type="hidden" name="challengeId" value={picked.id} />
                  <input type="hidden" name="teamId" value={t.id} />
                  <button
                    type="submit"
                    disabled={awardPending}
                    className="min-h-11 rounded-full bg-highlight px-[18px] text-sm font-semibold text-on-highlight disabled:opacity-60"
                  >
                    +{picked.points} {t.name}
                  </button>
                </form>
              ))}
            </div>
          </fieldset>
        )}

        {picked?.kind === 'placement' && (
          <form action={placeAction} className="flex flex-col gap-4">
            <input type="hidden" name="challengeId" value={picked.id} />
            {PLACES.slice(0, Math.min(3, teams.length)).map((place, i) => (
              <fieldset key={place} className="flex flex-col gap-2">
                <legend className="pb-2 text-sm text-body">
                  {place} (+{3 - i}){i === 2 ? ', optional' : ''}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <Chip key={t.id} name={['first', 'second', 'third'][i]} value={t.id} label={t.name} defaultChecked={false} />
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              type="submit"
              disabled={placePending}
              className="min-h-11 rounded-full bg-highlight px-[18px] text-sm font-semibold text-on-highlight disabled:opacity-60"
            >
              {placePending ? 'Saving…' : 'Save placement'}
            </button>
          </form>
        )}
      </div>

      <form action={bonusAction} className="flex flex-col gap-4 rounded-xl bg-card p-[18px]">
        <h3 className="text-base font-semibold text-text">Bonus points</h3>
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-sm text-body">Squad</legend>
          <div className="flex flex-wrap gap-2">
            {teams.map((t, i) => (
              <Chip key={t.id} name="teamId" value={t.id} label={t.name} defaultChecked={i === 0} />
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-sm text-body">Points</legend>
          <div className="flex flex-wrap gap-2">
            {BONUS_CHIPS.map((n, i) => (
              <Chip key={n} name="points" value={String(n)} label={`+${n}`} defaultChecked={i === 0} />
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2 text-sm text-body">
          Note (optional)
          <input
            name="note"
            maxLength={60}
            autoComplete="off"
            placeholder="Groom's choice"
            className="h-11 rounded-xl border border-line bg-bg px-3 text-[15px] text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-link"
          />
        </label>
        <Button type="submit" disabled={bonusPending}>
          {bonusPending ? 'Saving…' : 'Give points'}
        </Button>
      </form>

      <form action={undoAction} className="flex flex-col gap-3 rounded-xl bg-card p-[18px]">
        <p className="text-[15px] text-body">{undoText ? `Last award: ${undoText}` : 'No awards to undo.'}</p>
        <Button type="submit" variant="secondary" disabled={undoPending || !undoText}>
          {undoPending ? 'Undoing…' : 'Undo last'}
        </Button>
      </form>

      <details className="rounded-xl bg-card p-[18px]">
        <summary className="cursor-pointer text-base font-semibold text-link">Final</summary>
        <form action={finalAction} className="flex flex-col gap-3 pt-3">
          <p className="text-[15px] text-body">
            Every phone shows the winning squad, and points lock. A tie at the top is refused.
          </p>
          <Button type="submit" disabled={finalPending}>
            {finalPending ? 'Checking…' : 'Yes, end the crawl'}
          </Button>
        </form>
      </details>

      <Toast result={latest} />
    </>
  );
}

// A radio styled as a rounded chip, 44px tall.
function Chip(props: { name: string; value: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold text-text has-checked:border-highlight has-checked:bg-highlight has-checked:text-on-highlight has-focus-visible:outline-2 has-focus-visible:outline-link">
      <input type="radio" name={props.name} value={props.value} defaultChecked={props.defaultChecked} className="sr-only" />
      {props.label}
    </label>
  );
}

const TOAST_MS = 4_000;

// Sits just above the tab bar, then fades after 4 s.
function Toast({ result }: { result: AwardResult }) {
  const [hiddenAt, setHiddenAt] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!result.at) return;
    const timer = setTimeout(() => setHiddenAt(result.at), TOAST_MS);
    return () => clearTimeout(timer);
  }, [result.at]);

  const text = result.error ?? result.message;
  const visible = Boolean(text) && hiddenAt !== result.at;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+12px+env(safe-area-inset-bottom))] flex justify-center px-6"
    >
      {visible && (
        <p
          className={`max-w-xl rounded-full px-[18px] py-3 text-[15px] font-semibold shadow-lg ${
            result.error ? 'border border-highlight bg-card text-text' : 'bg-highlight text-on-highlight'
          }`}
        >
          {text}
        </p>
      )}
    </div>
  );
}
