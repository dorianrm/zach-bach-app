'use client';

import { useActionState } from 'react';
import { Button } from '@/components/Button';
import { adminLogin, type AdminLoginState } from './actions';

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminLogin, {});
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl bg-card p-[18px]">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-2 text-sm text-body">
        Admin PIN
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="off"
          required
          autoFocus
          className="h-14 w-full rounded-xl border border-line bg-bg text-center font-mono text-2xl tracking-[0.4em] text-text focus-visible:outline-2 focus-visible:outline-link"
        />
      </label>
      <p aria-live="polite" className="min-h-5 text-sm font-semibold text-highlight">
        {state.error}
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? 'Checking…' : 'Unlock admin'}
      </Button>
    </form>
  );
}
