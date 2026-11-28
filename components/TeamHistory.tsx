import type { HistoryLine } from '@/lib/scores';

// Tap to open a team's live awards, newest first. Undone awards are left out.
export function TeamHistory({ team, history }: { team: string; history: HistoryLine[] }) {
  if (history.length === 0) return null;
  return (
    <details>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-link">
        Point history ({history.length})
      </summary>
      <ul aria-label={`${team} point history`} className="flex flex-col divide-y divide-line">
        {history.map((line) => (
          <li key={line.id} className="flex items-baseline gap-3 py-2 text-[15px] text-body">
            <span className="w-16 shrink-0 font-mono text-xs font-medium text-muted">{line.time}</span>
            <span className="flex-1">{line.label}</span>
            <span className="font-mono text-sm font-medium text-highlight">
              {line.points >= 0 ? '+' : ''}
              {line.points}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
