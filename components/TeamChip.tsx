// Team color comes from the teams table (T3), so it is data, not a token.
export function TeamChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-text">
      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}
