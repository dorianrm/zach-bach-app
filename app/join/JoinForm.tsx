'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/Button';
import { joinAsGuest, type JoinState } from './actions';

type Option = { id: string; name: string; hasPin: boolean };

const pinInput =
  'h-14 w-full rounded-xl border border-line bg-card text-center font-mono text-2xl tracking-[0.5em] text-text focus-visible:outline-2 focus-visible:outline-link';

export function JoinForm({ guests, next }: { guests: Option[]; next: string }) {
  const [picked, setPicked] = useState<Option | null>(null);
  const [state, action, pending] = useActionState<JoinState, FormData>(joinAsGuest, {});

  if (!picked) {
    return (
      <ul className="grid grid-cols-2 gap-3">
        {guests.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => setPicked(g)}
              className="min-h-14 w-full rounded-xl bg-card px-4 text-left text-base font-semibold text-text focus-visible:outline-2 focus-visible:outline-link"
            >
              {g.name}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const settingUp = !picked.hasPin;
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl bg-card p-[18px]">
      <input type="hidden" name="guestId" value={picked.id} />
      <input type="hidden" name="next" value={next} />
      <h3 className="text-xl font-semibold text-text">{picked.name}</h3>

      {settingUp && (
        <p className="text-[15px] leading-normal text-body">Pick a PIN for your profile.</p>
      )}

      {/* Side by side when setting up, so the submit button fits above the tab bar on a phone. */}
      <div className={settingUp ? 'grid grid-cols-2 gap-3' : 'flex flex-col'}>
        <label className="flex min-w-0 flex-col gap-2 text-sm text-body">
          {settingUp ? 'New 4-digit PIN' : 'Your PIN'}
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            // Entry takes 4 to 6 digits for every name, so the organizer's 6-digit PIN fits
            // without the form looking different.
            pattern={settingUp ? '\\d{4}' : '\\d{4,6}'}
            maxLength={settingUp ? 4 : 6}
            autoComplete="off"
            required
            autoFocus
            className={pinInput}
          />
        </label>

        {settingUp && (
          <label className="flex min-w-0 flex-col gap-2 text-sm text-body">
            Type it again
            <input
              name="confirm"
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              autoComplete="off"
              required
              className={pinInput}
            />
          </label>
        )}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm font-semibold text-highlight">
        {state.error}
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setPicked(null)} className="flex-1">
          Back
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? 'Checking…' : settingUp ? 'Set PIN' : 'Join'}
        </Button>
      </div>
    </form>
  );
}
