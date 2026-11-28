'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import type { AdminResult } from './actions';

type Props = {
  summary: string;
  button: string;
  pendingLabel: string;
  action: (prev: AdminResult, form: FormData) => Promise<AdminResult>;
  guestId?: string;
  // False hides the panel but keeps the last message, e.g. on a row whose win was just removed.
  show?: boolean;
  children: ReactNode;
};

// Two taps, so a stray tap in a bar changes nothing. After the second tap the panel closes
// and says what changed, right where Dorian tapped.
export function ConfirmAction(props: Props) {
  const [result, action, pending] = useActionState(props.action, {});
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (result.at && panel.current) panel.current.open = false;
  }, [result.at]);

  return (
    <>
      {props.show !== false && (
        <details ref={panel} className="rounded-xl bg-card p-[18px] [li_&]:p-0">
          <summary className="cursor-pointer text-base font-semibold text-link">{props.summary}</summary>
          <div className="flex flex-col gap-3 pt-3">
            <p className="text-[15px] text-body">{props.children}</p>
            <form action={action}>
              {props.guestId && <input type="hidden" name="guestId" value={props.guestId} />}
              <button
                type="submit"
                disabled={pending}
                className="min-h-11 w-full rounded-full bg-highlight px-[18px] text-sm font-semibold text-on-highlight disabled:opacity-60"
              >
                {pending ? props.pendingLabel : props.button}
              </button>
            </form>
          </div>
        </details>
      )}
      <p role="status" className="text-sm font-semibold text-highlight empty:hidden">
        {result.message}
      </p>
    </>
  );
}
