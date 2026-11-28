-- T7: the first three guests to finish a line get 1st, 2nd and 3rd, and their team a head start.
-- The server calls this after a mark that completes a line. Returns the guest's place,
-- or null when three places are already taken (or the guest has no card).

create function public.claim_bingo_place(p_guest uuid)
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_place int;
  v_name text;
  v_team text;
begin
  -- One claim at a time, so two lines finished at the same moment cannot both be 1st.
  -- The unique index on place is the backstop.
  lock table public.bingo_cards in share row exclusive mode;

  select place into v_place from public.bingo_cards where guest_id = p_guest;
  if not found then
    return null;
  end if;
  -- A second line, or the same line marked again after an unmark, keeps the first place.
  if v_place is not null then
    return v_place;
  end if;

  -- max, not count: if a winner's guest row is ever deleted, the next place is still free.
  select coalesce(max(place), 0) + 1 into v_place from public.bingo_cards;
  if v_place > 3 then
    return null;
  end if;

  update public.bingo_cards set place = v_place, won_at = now() where guest_id = p_guest;

  -- Head start for the guest's team: 3, 2 or 1 points. A guest with no team gets no row.
  select name, team_id into v_name, v_team from public.guests where id = p_guest;
  if v_team is not null then
    insert into public.awards (team_id, points, source, note)
    values (v_team, 4 - v_place, 'bingo', 'Bingo ' || (array['1st', '2nd', '3rd'])[v_place] || ': ' || v_name);
  end if;

  return v_place;
end;
$$;

revoke execute on function public.claim_bingo_place(uuid) from public, anon, authenticated;
grant execute on function public.claim_bingo_place(uuid) to service_role;
