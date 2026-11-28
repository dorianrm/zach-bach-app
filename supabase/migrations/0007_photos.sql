-- T8: the photo gallery. Files live in the private Storage bucket 'photos'.
-- The browser uploads with short-lived signed upload URLs from the server, and views with
-- signed URLs. It never talks to the database.

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  path text not null unique,        -- '<guest_id>/<photo_id>.jpg', max 2000 px
  thumb_path text not null unique,  -- '<guest_id>/<photo_id>-thumb.jpg', 400 px
  caption text check (char_length(caption) <= 140),
  taken_at timestamptz,             -- from the photo's EXIF, null when it has none
  tag text,                         -- itinerary card tag (T9)
  hidden boolean not null default false,  -- set by Dorian (T9)
  created_at timestamptz not null default now()
);

create index photos_newest on public.photos (created_at desc);

-- RLS on, no policies. Only the server's role gets access.
alter table public.photos enable row level security;
grant select, insert, update, delete on public.photos to service_role;

-- The private bucket. JPEG only (the phone converts every photo before upload),
-- 5 MB per file. Signed URLs are the only way in.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
