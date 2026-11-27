-- T2: the organizer signs in at /join with the admin PIN (ADMIN_PIN_HASH in Vercel).
-- Two lock counters for the organizer, so wrong tries at /join (anyone with the link)
-- never block the 12-hour admin re-prompt on a phone already signed in as the organizer.

alter table public.guests
  add column admin_failed_attempts int not null default 0,
  add column admin_locked_until timestamptz;

-- The organizer has no guest PIN any more.
update public.guests set pin_enc = null where is_admin;

-- Replaces 0002: the organizer gets 10 tries at /join, other guests keep 5.
create or replace function public.record_pin_failure(p_guest uuid)
returns timestamptz
language sql
as $$
  update public.guests
  set failed_attempts = case when failed_attempts + 1 >= (case when is_admin then 10 else 5 end) then 0 else failed_attempts + 1 end,
      locked_until = case when failed_attempts + 1 >= (case when is_admin then 10 else 5 end) then now() + interval '10 minutes' else locked_until end
  where id = p_guest
  returning locked_until;
$$;

-- One wrong admin PIN at the /admin re-prompt. Only a phone signed in as the organizer gets here.
-- The 10th failure locks the re-prompt for 10 minutes and resets the counter.
create function public.record_admin_failure(p_guest uuid)
returns timestamptz
language sql
as $$
  update public.guests
  set admin_failed_attempts = case when admin_failed_attempts + 1 >= 10 then 0 else admin_failed_attempts + 1 end,
      admin_locked_until = case when admin_failed_attempts + 1 >= 10 then now() + interval '10 minutes' else admin_locked_until end
  where id = p_guest and is_admin
  returning admin_locked_until;
$$;

revoke execute on function public.record_admin_failure(uuid) from public, anon, authenticated;
grant execute on function public.record_admin_failure(uuid) to service_role;
