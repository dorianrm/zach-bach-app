-- T6: one bingo card per guest. The server shuffles the 24 tiles on the first visit.
-- tile_order holds indexes into content/bingo-tiles.ts, so tile text can change later,
-- but never the order or the count. Positions are 0 to 24, row by row. 12 is the free center.
-- Postgres arrays start at 1, so position p is marks[p + 1].

create table public.bingo_cards (
  guest_id uuid primary key references public.guests (id) on delete cascade,
  tile_order int[] not null check (cardinality(tile_order) = 24),
  marks boolean[] not null check (cardinality(marks) = 25 and marks[13]),
  place int unique check (place between 1 and 3), -- 1st, 2nd, 3rd line finisher (T7)
  won_at timestamptz
);

-- RLS on, no policies. Only the server's role gets access.
alter table public.bingo_cards enable row level security;
grant select, insert, update, delete on public.bingo_cards to service_role;

-- Sets one tile in place, so two quick taps (or two phones) never overwrite each other's marks.
-- It sets a value instead of flipping it, so a retried request cannot undo itself.
-- The free center (12) never changes. Returns the new marks, or no row if the guest has no card.
create function public.set_bingo_mark(p_guest uuid, p_position int, p_marked boolean)
returns boolean[]
language sql
as $$
  update public.bingo_cards
  set marks[p_position + 1] = p_marked
  where guest_id = p_guest and p_position between 0 and 24 and p_position <> 12
  returning marks;
$$;

revoke execute on function public.set_bingo_mark(uuid, int, boolean) from public, anon, authenticated;
grant execute on function public.set_bingo_mark(uuid, int, boolean) to service_role;
