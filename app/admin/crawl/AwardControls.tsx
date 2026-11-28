'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { BONUS_CHIPS } from '@/lib/awards';
import { bonus, undoLast, type AwardResult } from './actions';

type Team = { id: string; name: string };

// "+N for team" and "Undo last". After each tap a toast says what changed, so Dorian
// can check it without reading the scoreboard.
export function AwardControls({ teams, undoText }: { teams: Team[]; undoText: string | null }) {
  const [bonusResult, bonusAction, bonusPending] = useActionState<AwardResult, FormData>(bonus, {});
  const [undoResult, undoAction, undoPending] = useActionState<AwardResult, FormData>(undoLast, {});
  const latest = (bonusResult.at ?? 0) > (undoResult.at ?? 0) ? bonusResult : undoResult;

  return (
    <>
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
