-- T3: crawl points and the team reveal.
-- Scores are never stored: they are summed from live awards rows (undone_at is null),
-- so undo (T4) and team history need no extra code.

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams (id) on delete cascade,
  challenge_id uuid,            -- references challenges from T5 on. Null for bonus and bingo rows.
  points int not null,
  source text not null check (source in ('bonus', 'challenge', 'placement', 'bingo')),
  note text,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

create index awards_live_by_team on public.awards (team_id) where undone_at is null;

-- RLS on, no policies. Only the server's role gets access.
alter table public.awards enable row level security;
grant select, insert, update, delete on public.awards to service_role;

-- Rosters and scores stay hidden until Dorian taps "Reveal teams".
insert into public.settings (key, value) values ('teams_revealed', 'false')
on conflict (key) do nothing;
