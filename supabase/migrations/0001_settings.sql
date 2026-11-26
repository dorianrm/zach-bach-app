-- T1: key-value settings. /api/health reads the 'health' row.
create table public.settings (
  key text primary key,
  value jsonb not null
);

-- RLS on, no policies: the anon key can read nothing. Server code uses the service role key.
alter table public.settings enable row level security;

insert into public.settings (key, value) values ('health', '"ok"');
