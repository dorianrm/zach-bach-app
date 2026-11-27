'use client';

import { useRef, useState } from 'react';
import { Button } from './Button';

export type CalendarEvent = { tag: string; title: string; when: string; googleUrl: string };

const sheetButton =
  'flex min-h-12 w-full flex-col items-center justify-center rounded-full px-6 py-2 text-[15px] font-semibold no-underline';

// One button opens a sheet. The guest ticks the events they attend, then picks a calendar.
// Apple: one calendar file holds every ticked event.
// Google: a link holds one event, and phones block opening several tabs from one tap,
// so the Google button opens the ticked events one at a time.
export function CalendarPicker({ events }: { events: CalendarEvent[] }) {
  const sheet = useRef<HTMLDialogElement>(null);
  const [picked, setPicked] = useState(() => new Set(events.map((e) => e.tag)));
  const [googleStep, setGoogleStep] = useState(0);

  const toggle = (tag: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(tag)) next.add(tag);
      return next;
    });
    setGoogleStep(0);
  };
  const open = () => {
    setGoogleStep(0);
    sheet.current?.showModal();
  };

  // Content order, so the file and the Google steps go by time.
  const chosen = events.filter((e) => picked.has(e.tag));
  const nextGoogle = chosen[googleStep];

  return (
    <>
      <Button variant="secondary" onClick={open} className="h-12 w-full">
        Add to calendar
      </Button>

      <dialog
        ref={sheet}
        aria-labelledby="calendar-sheet-title"
        // A tap on the dimmed backdrop (outside the sheet) closes it.
        onClick={(e) => e.target === e.currentTarget && sheet.current?.close()}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-card text-text backdrop:bg-bg/80"
      >
        <div className="flex flex-col gap-4 px-[18px] pt-[18px] pb-[max(18px,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <h2 id="calendar-sheet-title" className="text-xl font-semibold">
              Add to calendar
            </h2>
            <button
              type="button"
              onClick={() => sheet.current?.close()}
              aria-label="Close"
              className="size-11 rounded-full text-2xl leading-none text-muted"
            >
              ×
            </button>
          </div>

          <ul className="flex flex-col">
            {events.map((e) => (
              <li key={e.tag} className="border-t border-line first:border-t-0">
                <label className="flex min-h-12 items-center gap-3 py-2 text-[15px]">
                  <input
                    type="checkbox"
                    checked={picked.has(e.tag)}
                    onChange={() => toggle(e.tag)}
                    className="size-5 shrink-0 accent-link"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-mono text-xs text-muted">{e.when}</span>
                    <span>{e.title}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {chosen.length === 0 ? (
            <p className="text-sm text-muted">Pick at least one event.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <a
                href={`/api/calendar.ics?events=${chosen.map((e) => encodeURIComponent(e.tag)).join(',')}`}
                className={`${sheetButton} bg-highlight text-on-highlight`}
              >
                Apple Calendar ({chosen.length})
              </a>
              {nextGoogle ? (
                <a
                  href={nextGoogle.googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setGoogleStep((s) => s + 1)}
                  className={`${sheetButton} border border-line text-text`}
                >
                  Google Calendar
                  {chosen.length > 1 && (
                    <span className="text-xs font-normal text-muted">
                      {googleStep + 1} of {chosen.length}: {nextGoogle.title}
                    </span>
                  )}
                </a>
              ) : (
                <p className="text-center text-sm text-muted">
                  All {chosen.length} opened in Google Calendar. Save each one there.
                </p>
              )}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
