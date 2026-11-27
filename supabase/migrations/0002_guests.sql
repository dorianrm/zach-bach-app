-- T2: teams and guests. Seeded from content/guests.ts by supabase/seed.ts.

create table public.teams (
  id text primary key,          -- slug from content, e.g. 'red'
  name text not null,
  color text not null,          -- hex, shown as the team dot
  sort int not null
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  team_id text references public.teams (id) on delete set null,
  pin_enc text,                 -- AES-256-GCM, null until the guest sets a PIN
  failed_attempts int not null default 0,
  locked_until timestamptz,
  is_admin boolean not null default false,
  plays_bingo boolean not null default true
);

-- RLS on, no policies. Only the server's role gets access.
alter table public.teams enable row level security;
alter table public.guests enable row level security;
grant select, insert, update, delete on public.teams, public.guests to service_role;

-- One wrong PIN, counted atomically so parallel tries cannot skip the lockout.
-- The 5th failure locks the name for 10 minutes and resets the counter.
create function public.record_pin_failure(p_guest uuid)
returns timestamptz
language sql
as $$
  update public.guests
  set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '10 minutes' else locked_until end
  where id = p_guest
  returning locked_until;
$$;

-- Functions are executable by everyone by default. Only the server may call this one.
revoke execute on function public.record_pin_failure(uuid) from public, anon, authenticated;
grant execute on function public.record_pin_failure(uuid) to service_role;
