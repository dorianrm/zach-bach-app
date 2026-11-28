-- T5: crawl stops and challenges. Seeded from content/crawl.ts by supabase/seed.ts.
-- Ids are slugs from content, like teams, so a re-seed updates rows in place.

create table public.stops (
  id text primary key,          -- slug from content, e.g. 'stop-1'
  sort int not null,
  name text not null,
  address text not null,
  revealed_at timestamptz       -- null until Dorian taps "Reveal next stop"
);

create table public.challenges (
  id text primary key,          -- slug from content, e.g. 'stop-1-darts'
  stop_id text references public.stops (id) on delete cascade,  -- null: an anytime challenge
  sort int not null,
  title text not null,
  points int not null,          -- for 'placement', always 3 (1st). 2nd gets 2, 3rd gets 1.
  kind text not null check (kind in ('award', 'placement'))
);

-- RLS on, no policies. Only the server's role gets access.
alter table public.stops enable row level security;
alter table public.challenges enable row level security;
grant select, insert, update, delete on public.stops, public.challenges to service_role;

-- awards.challenge_id (0004) was a uuid with no rows set yet. It now points at the slug.
-- A challenge removed from content keeps its awards: they just lose the link.
alter table public.awards alter column challenge_id type text using challenge_id::text;
alter table public.awards
  add constraint awards_challenge_id_fkey foreign key (challenge_id)
  references public.challenges (id) on delete set null;

-- The crawl ends when Dorian taps "Final".
insert into public.settings (key, value) values ('crawl_final', 'false')
on conflict (key) do nothing;
