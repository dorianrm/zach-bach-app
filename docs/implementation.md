# Zach Bach Weekend Site: Implementation

Last updated: Wed Nov 25, 2026 (rev 4). Owner: Dorian.
This file is the source of truth. Scope lives in `docs/tech-spec.md`. Claude owns design and build choices. Dorian reviews and deploys. The visual design is locked in the Design section.

## How this doc is organized

- **Milestones** are dated checkpoints tied to Dec 18. Each one has a go/no-go: if it is not working by its date, that feature falls back to paper.
- **Steel threads** are the thin, end-to-end slices inside each milestone: phone UI, server action, database, deployed. Each thread fits one code-tab session: build, deploy, check on a phone, commit.
- Each thread adds only the schema, routes, and env vars it needs. Nothing is built ahead of the thread that uses it.
- If time runs out, stop after the last finished thread. The site still works.

## Plan at a glance

| Milestone | Date | Threads | If missed |
| --- | --- | --- | --- |
| M1: Link goes out | Dec 1 | T1 Deploy + itinerary | Send the itinerary as a group chat message |
| M2: Crawl ready | Dec 6 | T2 Join with name + PIN · T3 Reveal teams + scoreboard · T4 Award + undo · T5 Stops, placements, bonus, final | Paper passports and Zach's tally |
| M3: Bingo ready | Dec 10 | T6 Card + mark · T7 Win + head start | Printed bingo cards |
| M4: Gallery ready | Dec 14 | T8 Upload + view · T9 Tags, filter, delete, hide | Shared Google Photos album |
| Freeze | Dec 16 | T10 Testing and dry run | Ship what passed, cut the rest |

### Progress

Update this table when a thread's PR merges.

| Thread | Status | PR |
| --- | --- | --- |
| T1 Deploy + itinerary | Live | #1 |
| T2 Join with name + PIN | Live | #2 |
| Calendar picker (extra, T1 area) | Live | #3 |
| T3 Reveal teams + scoreboard | Live. Real squads not set yet. | #5 |
| T4 Award + undo | Not started | |
| T5 Stops, placements, bonus, final | Not started | |
| T6 Card + mark | Not started | |
| T7 Win + head start | Not started | |
| T8 Upload + view | In review. Waits on migration `0007` and phone checks. | |
| T9 Tags, filter, delete, hide | Not started | |
| T10 Testing and dry run | Not started | |

### Parallel tracks

After T3, the remaining threads form three tracks that can be built at the same time, one agent session per track, each in its own git worktree and branch:

| Track | Threads, in order | Needs | Migrations |
| --- | --- | --- | --- |
| Crawl | T4, then T5 | T3 | T5: `0005` |
| Bingo | T6, then T7 | T2. T7 also writes `awards` (T3). | T6: `0006`, T7: `0008` |
| Gallery | T8, then T9 | T2 | T8: `0007` |

T10 runs last, after all three tracks merge.

- Migration numbers are reserved above, so tracks never pick the same number. A track that needs another migration takes the next free number and adds it here in the same PR.
- Files more than one track touches: `components/TabBar.tsx` (each track flips its own `ready` flag), `lib/organizer.ts`, `app/api/state/route.ts` and `lib/crawl.ts` (state fields), `e2e/db.ts` (fixtures and resets), `docs/edge-cases.md`, this file. Keep edits there small, and rebase on `main` before merging.
- Each track merges one thread at a time. After any merge, the other tracks rebase on `main`.

Why this order:

- T1 proves the whole path (repo, Vercel, Supabase, a real page) before any feature logic.
- T2 sits in M2 because the crawl admin is the first thing that needs identity.
- The crawl ships before bingo because bingo writes into the scoreboard.
- The gallery ships last because nothing depends on it and uploads open only on Dec 18.

## Conventions

Rules every thread follows. No schema lives here.

### Stack

| Area | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router), TypeScript | Server components for reads, server actions for writes |
| Styling | Tailwind CSS | Tokens and components in the Design section |
| Database | Supabase Postgres | SQL migrations in the repo |
| Files | Supabase Storage, private bucket | Signed URLs, no public access |
| Sessions | Signed JWT in an httpOnly cookie (`jose`) | No auth provider needed |
| Crypto | Node `crypto` | AES-256-GCM for guest PINs, `scrypt` for the admin PIN |
| Tests | Vitest, Playwright | Vitest for logic that can fail quietly. Playwright e2e on iPhone (WebKit) and Android (Chromium) against a test Supabase project |
| Hosting | Vercel Hobby, deploy on push to `main` | Preview URL for every branch |

### Repo layout

```text
app/
  gate/            "Ask Dorian for the link"   (T2)
  join/            name picker + PIN            (T2)
  more/            links to join, admin and organizer pages
  (guest)/         itinerary, crawl, bingo, photos
  admin/           admin login and controls     (T2+)
  api/             state, calendar.ics, health
proxy.ts           event-code gate on every page
components/        base components from the Design section
content/           files only Dorian edits: itinerary, crawl, tiles, guests
lib/               db, session, pin, time helpers
scripts/           one-off tools, e.g. hash-admin-pin
supabase/
  migrations/      one migration per thread that adds schema
  seed.ts          loads content/ into the database
e2e/               Playwright specs, fixtures, test-only env
docs/
  tech-spec.md
  implementation.md
  edge-cases.md    every known edge case and how it is tested
CLAUDE.md          how to work in this repo (secrets, migrations, tests)
```

### Rules

- The browser never talks to the database. All reads and writes go through server code with the service role key. Photo upload uses short-lived signed upload URLs (T8).
- Row Level Security is on for every table, with no policies. The anon key can read nothing.
- Content that only Dorian edits lives in `content/`. Edit, push, deploy. Rows that other rows point at (guests, teams, stops, challenges) are seeded from `content/`.
- Every server action calls `requireGuest()` or `requireAdmin()` first (from T2 on).
- All times render in `America/Los_Angeles`, whatever the phone's time zone.
- Live data reaches guests by polling `GET /api/state` every 5 s while the tab is visible (from T3 on). Admin actions return the new state, so the admin screen updates at once.
- Each thread ends with: migration applied, deployed to Vercel, checked on a real phone, committed.

## Design

Locked Nov 25. Mockup: board E, palette "Cobalt night", on the design canvas (https://claude.ai/artifact/Gc77KtHiRPGu1FttjEFmUR).

### Direction

- **Name:** "Zach Attack" (from his handle). Subtitle "The bachelor weekend."
- **Dark theme for night use.** Slate navy, not black. Bright text and vivid accents so nothing is hard to read in a bar.
- **Two accents, two jobs.** Cobalt is for things you tap (links, map addresses, the active tab). Yellow is for highlights (times, day labels, "Now", "Final round").
- **Mature, lightly themed.** Events are numbered 01-05. Airsoft is the "Final round." Teams are "squads." No game UI chrome, no "OBJ" or "Operation" language.
- **Palette source:** Zach's colorway: cement gray, black, and cobalt (his Tacoma colors and a custom controller). The header is a muted steel blue.

### Tokens

Defined once in `app/globals.css` with a Tailwind `@theme` block. Pages use token names only, never raw hex.

| Token | Value | Use |
| --- | --- | --- |
| `--color-hero` | `#2d4f9e` | Header band |
| `--color-hero-text` | `#ffffff` | Title on the header |
| `--color-hero-muted` | `#dbe5ff` | Date and updated stamp on the header |
| `--color-bg` | `#1b2230` | Page background |
| `--color-card` | `#252e40` | Event cards and panels |
| `--color-bar` | `#151b27` | Tab bar |
| `--color-line` | `#34405a` | Dividers, outline buttons |
| `--color-text` | `#f4f6fa` | Headings |
| `--color-body` | `#d5dbe5` | Body text |
| `--color-muted` | `#a9b3c2` | Small details, inactive tabs |
| `--color-link` | `#7aa5ff` | Links, active tab |
| `--color-highlight` | `#ffd84d` | Times, day labels, "Now", primary buttons |
| `--color-on-highlight` | `#14161a` | Text on yellow |

Team colors are data in the `teams` table, not tokens.

### Type

Fonts load with `next/font/google`, so there is no layout shift.

| Role | Font | Size / weight |
| --- | --- | --- |
| Site title | Archivo, 75% width | 52px / 700, uppercase |
| Event time | Archivo, 75% width | 34px / 700, `--color-highlight` |
| Event title | Archivo | 20px / 600 |
| Body | Archivo | 15px / 400, line height 1.5 |
| Meta (cost, address) | Archivo | 13-14px |
| Section label | Archivo | 13px / 600, uppercase, 0.16em tracking |
| Numbers, updated stamp | JetBrains Mono | 12px / 500 |

### Shape and spacing

- Cards: 12px radius, 18px padding, no border. 12px gap between cards.
- The "Now" card: 2px `--color-highlight` border.
- Buttons and tags: fully rounded.
- Page side padding: 24px. Tap targets: 44px minimum.

### Components

Build these first in T1, then build every page from them.

| Component | What it is |
| --- | --- |
| `PageShell` | Header band, content area, and `TabBar` |
| `TabBar` | Plan, Crawl, Bingo, Photos, More. Active tab in `--color-link`. More holds /join and, for Dorian, an Organizer section with one link per admin page (`lib/organizer.ts`). |
| `DayHeading` | Yellow uppercase section label |
| `EventCard` | Time column plus body. `now` variant adds the yellow border and a "Now" tag. |
| `Button` | `primary` (yellow, dark text) and `secondary` (outline in `--color-line`) |
| `Tag` | Small rounded label, such as "Now" or "Final round" |
| `TeamChip` | Team color dot plus squad name. Color comes from the database. |
| `Banner` | Full-width notice, such as bingo winners or the crawl winner |

### Rules

- No raw hex in pages or components. Tokens only.
- Every text and background pair passes 4.5:1 contrast. Check new pairs before adding them.
- Yellow is never used for links. Cobalt is never used for highlights.
- Dark only in v1. No light theme.
- No game franchise names, logos, or lookalike fonts. No employer names.

## M1: Link goes out (Dec 1)

If missed: send the itinerary as a group chat message.

### T1: Deploy + itinerary

**Slice:** a static itinerary page, deployed on Vercel, plus a health route that reads Supabase.

**Adds**

- Next.js app with Tailwind, pushed to the repo
- Design tokens, fonts, and the base components from the Design section, built before any page
- Vercel project connected to `main`
- Supabase project. Migration `0001`: a `settings` table (`key`, `value` jsonb), with RLS on.
- `lib/db.ts` with the server-only Supabase client
- `GET /api/health`: reads one `settings` row and returns ok
- Daily Vercel cron on `/api/health`. A free Supabase project pauses after 1 week without traffic, so this keeps it awake until Dec 20.
- `content/itinerary.ts` and the `/` page
- `GET /api/calendar.ics`, with `?events=` to keep only picked cards (by tag)
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Itinerary content shape**

```ts
type Card = {
  day: 'fri' | 'sat';
  title: string;
  start?: string;      // '2026-12-18T19:00', Pacific. Omit for TBD.
  end?: string;
  endApprox?: boolean; // shows the end as '~1:00 AM'
  timeHint?: string;   // shown under 'TBD', e.g. 'afternoon'
  label?: string;      // highlighted next to the number, e.g. 'Final round'
  place?: string;
  address?: string;    // map link is built from this
  description?: string;
  gettingThere?: string;
  bring?: string;
  cost?: string;       // shown with '(estimate)'
  arriveEarly?: string;
  notes?: string[];    // ID, waivers, shoes
  tag: string;         // gallery tag, e.g. 'Dinner' (used in T9)
};
```

**Behavior**

- Cards grouped by day. A card shows only the fields that are filled in.
- "Happening now": the client compares Pacific time to each card's start and end. A card with no end is "now" until the next card starts.
- Map link: `https://maps.google.com/?q=` plus the encoded address.
- Link preview: title, description, and a static image through Next.js `metadata`.
- "Last updated": a `lastUpdated` constant in `content/itinerary.ts`. Bump it on every edit.
- Venmo link at the top: `https://venmo.com/u/<handle>`.
- Calendar file: every card with a start time. TBD cards are left out.
- Add to calendar: one button opens a sheet. The guest ticks the events they attend, then picks a calendar. Apple Calendar: one file holds every ticked event. Google Calendar: a Google link holds one event, so the button opens the ticked events one at a time ("1 of 2").
- The crawl card lists no stops. The crawl hub owns them (T5).
- No login in this thread. Until T2, anyone with the link can see the page. The risk is low: times and addresses only.

**Done when**

- The itinerary loads on a phone from the Vercel URL and matches board E of the mockup
- `/api/health` returns ok from Supabase
- The calendar file opens on iPhone and Android
- The link is ready for the group chat

**Thickens later:** T2 puts the page behind the event code.

## M2: Crawl ready (Dec 6)

If missed: paper passports for the route and challenges, and Zach's tally sheet for scores.

### T2: Join with name + PIN

**Slice:** a guest picks their name, sets a PIN, and stays logged in. Dorian logs in as admin.

**Adds**

- Migration `0002`: `teams` (`id`, `name`, `color`, `sort`) and `guests` (`id`, `name` unique, `team_id`, `pin_enc`, `failed_attempts`, `locked_until`, `is_admin`, `plays_bingo`)
- `content/guests.ts` and `supabase/seed.ts` for guests and teams. Placeholder names until the real list arrives.
- Migration `0003`: `admin_failed_attempts` and `admin_locked_until` on `guests`, for the organizer's admin re-prompt
- `lib/session.ts`, `lib/pin.ts`
- Middleware: no `event` cookie means an "Ask Dorian for the link" page
- `/join`, `/admin` login, `/admin/pins`
- Env vars: `EVENT_CODE`, `SESSION_SECRET`, `PIN_ENCRYPTION_KEY`, `ADMIN_PIN_HASH`

**Flow**

1. `EVENT_CODE` in the link (`/?c=...`) sets an `event` cookie.
2. `/join`: the guest picks their name. First time: they set a 4-digit PIN. Later, on any device: they enter it. Dorian enters the 6-digit admin PIN instead.
3. A server action checks the PIN, updates `failed_attempts` and `locked_until`, then sets the `session` cookie for 30 days. For Dorian, the session also opens a 12-hour admin window.
4. `/admin`: after 12 hours, Dorian enters the admin PIN again on the same phone. It is checked against `ADMIN_PIN_HASH` and opens a new 12-hour window.

**Rules**

- Guest PINs are stored with AES-256-GCM using `PIN_ENCRYPTION_KEY`. Only `/admin/pins` decrypts them.
- The PIN setup screen says: "Pick a PIN for your profile."
- 5 wrong tries set `locked_until` to 10 minutes from now. Dorian gets 10 tries.
- Dorian has two lock counters. Wrong tries at `/join` (anyone with the link) never block the `/admin` re-prompt on a phone already signed in as Dorian. To clear a lock from a phone, run a saved SQL snippet in Supabase.
- Admin reset clears `pin_enc`, so the guest sets a new PIN.
- A phone signed in as someone can switch only to names that have a PIN. It cannot claim a new name. A private tab gets around this, so Reset is the fix for a taken name.
- The admin PIN is never in the database. Only its hash, in Vercel. A new hash signs Dorian out on every device.

**Done when**

- A guest logs in on a phone, then on a second browser with the same PIN
- A wrong PIN 5 times locks the name
- Dorian signs in with the admin PIN, views a guest PIN, and resets it
- 10 wrong tries at `/join` lock Dorian's name, but not the re-prompt on Dorian's signed-in phone
- A tampered session cookie is rejected (Vitest)

**Thickens later:** T3 shows the guest their team.

### T3: Reveal teams + scoreboard

**Slice:** Dorian taps "Reveal teams." Guest phones show rosters and a scoreboard at 0 points.

**Adds**

- Migration `0004`: `awards` (`id`, `team_id`, `challenge_id`, `points`, `source`, `note`, `created_at`, `undone_at`). `challenge_id` stays null until T5.
- `GET /api/state`: `teamsRevealed`, rosters, and scores
- Client polling hook, 5 s, paused when the tab is hidden
- `/crawl` guest page (joined guests only) and `/admin/crawl`, linked from the Organizer section on More
- `settings.teams_revealed` row, `false` until the reveal
- Server actions `revealTeams()` and `hideTeams()`: set `settings.teams_revealed` to `true` or `false`

**Score query**

```sql
select t.id, t.name, t.color, coalesce(sum(a.points), 0) as total
from teams t
left join awards a on a.team_id = t.id and a.undone_at is null
group by t.id
order by total desc, t.sort;
```

Scores are always computed from `awards`, never stored. Undo and history then work with no extra code. The app sums live rows in `lib/scores.ts` (same result as the query above), so the rule is unit tested.

**Behavior**

- Before the reveal: `/crawl` shows "Teams revealed soon." `/api/state` sends no rosters or scores.
- Dorian sees the rosters on `/admin/crawl` before the reveal. "Reveal teams" and "Hide teams" each take two taps. Hiding is for a reveal tapped too early.
- After: rosters with team colors, the guest's own team highlighted, and team totals.

**Done when**

- A guest phone shows "Teams revealed soon"
- Dorian taps reveal, and the guest phone shows rosters and 0 points within ~5 s

**Thickens later:** T4 adds points.

### T4: Award + undo

**Slice:** Dorian gives a team points and takes them back. Guest phones follow.

**Adds**

- Server actions `bonus(teamId, points, note)` and `undoLast()`
- Admin buttons: "+N for team" and "Undo last"
- Team history view: tap a team to see its live award rows, newest first

**Rules**

- Undo never deletes. It sets `undone_at` on the newest live row, so history stays readable.
- Undo skips `source = 'bingo'` rows (T7). Those come from guests, not from Dorian.
- After every action, the admin page shows a toast, such as "+2 Red: groom's choice."

**Done when**

- Dorian awards +2, a guest phone shows it within ~5 s, Dorian undoes it, and the guest phone drops back
- The score query ignores undone rows (Vitest)

**Thickens later:** T5 adds stops and challenges, so awards are 2 taps.

### T5: Stops, placements, bonus, final

**Slice:** a full mock crawl: reveal stops, award challenges, rank head-to-head games, end the crawl.

**Adds**

- Migration `0005`: `stops` (`id`, `sort`, `name`, `address`, `revealed_at`) and `challenges` (`id`, `stop_id`, `title`, `points`, `kind`). A null `stop_id` means an anytime challenge.
- `content/crawl.ts`: stops, challenges, rules text. Seeded.
- Server actions:

| Action | Writes |
| --- | --- |
| `revealNextStop()` | `revealed_at` on the lowest unrevealed stop |
| `hideLastStop()` | Clears `revealed_at` on the newest revealed stop |
| `award(challengeId, teamId)` | One `awards` row with the challenge's points |
| `placement(challengeId, [first, second, third])` | Three rows: 3, 2, 1 |
| `finalize()` | `settings.crawl_final = true` |

- `/api/state` adds revealed stops, their challenges, and `crawlFinal`

**Behavior**

- Guests see the rules, the current stop with a map link and its challenges, anytime challenges, and past stops collapsed.
- Upcoming stops are never sent to the browser.
- Admin award buttons show the current stop's challenges first, then anytime challenges. Award = pick the challenge, then the team.
- `finalize()`: if the top two totals tie, the admin page warns instead of finalizing. Zach picks a tiebreaker game. Dorian enters it as a +1 bonus, then finalizes.
- After `finalize()`, every phone shows the winning team, and award controls are disabled.
- A route change on the night: edit `content/crawl.ts`, push, re-run the seed. The paper passport is the fallback.

**Done when**

- A mock crawl with 2 stops runs end to end on Dorian's phone with a guest phone watching: reveal teams, reveal stop, award, placement, bonus, undo, final

**Thickens later:** T7 adds bingo head-start rows.

## M3: Bingo ready (Dec 10)

If missed: printed bingo cards, scored on paper at dessert.

### T6: Card + mark

**Slice:** a guest opens `/bingo`, gets a shuffled card, and taps tiles. Marks survive a reload.

**Adds**

- Migration `0006`: `bingo_cards` (`guest_id` PK, `tile_order` int[24], `marks` bool[25], `place` int unique, `won_at`)
- `content/bingo-tiles.ts`: 24 tiles
- `/bingo` page
- Server action `toggleMark(position)`

**Rules**

- First visit: the server shuffles the 24 tile indexes and saves `tile_order`.
- Position 12 (the center) is the free square, always marked.
- Guests with `plays_bingo = false` (Zach) see the winners banner only (T7).
- `tile_order` stores indexes. After cards exist, edit tile text only, never the order or count.
- Long tile text: small font, up to 4 lines per tile. Tune while building.

**Done when**

- Two test guests get different card layouts
- Marks survive a reload and a second browser

**Thickens later:** T7 detects a win.

### T7: Win + head start

**Slice:** three test guests finish lines in order. Every phone shows 1st, 2nd, 3rd, and the scoreboard shows the head start.

**Adds**

- Line check in `toggleMark`: 5 rows, 5 columns, 2 diagonals
- Migration `0008`: Postgres function `claim_bingo_place(guest_id)` (number reserved for the bingo track)
- `/api/state` adds `bingoWinners`
- Winners banner on `/bingo`

**Winner order**

- `claim_bingo_place` locks the table, counts existing places, and assigns the next place if fewer than 3 exist.
- A unique index on `place` is the backstop. Two taps at the same moment cannot both be 1st.
- In the same transaction it inserts an `awards` row for the guest's team: 3, 2, or 1 points, `source = 'bingo'`, note "Bingo 1st: <name>."
- Unmarking a tile after winning does not remove the place. Honor system.
- A guest with no team still gets a place, but no award row. Dorian can add points by hand.
- Bingo rows exist before the reveal but stay hidden until T3's reveal.

**Done when**

- Three test guests win in order, and the banner shows on every phone
- After the reveal, the scoreboard history shows "Bingo 1st: +3" and the others
- Line detection covers all 12 lines and near misses (Vitest)
- 5 concurrent `claim_bingo_place` calls give exactly places 1, 2, and 3 (Vitest)

**Thickens later:** v2 adds an open and lock window and a "who's close" board.

## M4: Gallery ready (Dec 14)

If missed: a shared Google Photos album link in the group chat.

### T8: Upload + view

**Slice:** a guest uploads one photo from an iPhone, and it appears in the grid.

**Adds**

- Supabase Storage private bucket `photos` (JPEG only, 5 MB per file), created by migration `0007`
- Migration `0007`: `photos` (`id`, `guest_id`, `path`, `thumb_path`, `caption`, `taken_at`, `tag`, `hidden`, `created_at`)
- Client library `exifr` (reads the time taken). Resizing is a canvas draw in `app/(guest)/photos/prepare.ts`, so `browser-image-compression` is not needed.
- Server actions `createUploadUrls(count)` and `savePhoto(...)`
- `/photos` page

**Upload pipeline**

1. The guest picks one or more photos.
2. The client reads the original timestamp with `exifr`, before resizing strips it.
3. The client resizes: full size at max 2000 px (~500 KB JPEG) and a 400 px thumbnail. This also converts HEIC.
4. `createUploadUrls` checks the session and the upload window (Fri Dec 18 6:00 PM to Sun Dec 20 noon, Pacific), then returns two signed upload URLs per photo.
5. The client uploads both files straight to the bucket, one photo at a time, with progress.
6. `savePhoto` inserts the row with caption and `taken_at`.

**Viewing**

- The grid uses signed thumbnail URLs that last 1 hour. Tap a photo for a signed full-size URL.
- Plain `<img>` tags, not `next/image`. Photos are already resized, and this avoids Vercel's image optimization quota.
- Each photo shows the uploader's name and caption. No polling. Guests pull to refresh.
- For testing, an env flag `UPLOADS_OPEN=true` bypasses the window.

**Done when**

- An iPhone HEIC photo and an Android photo upload on cell data and show in the grid

**Thickens later:** T9 adds tags and moderation.

### T9: Tags, filter, delete, hide

**Slice:** the full gallery rules.

**Adds**

- Tag picker at upload, pre-selected from the itinerary card that matches `taken_at`
- `?tag=` filter on `/photos`
- Server actions `deletePhoto(id)`, `setHidden(id, bool)`, `setTag(id, tag)`
- Admin controls on each photo

**Rules**

- Tags come from the itinerary cards' `tag` field: `Dinner`, `Crawl`, `Topgolf`, `Pub`, `Airsoft`.
- No timestamp: the current card's tag is pre-selected. Taken outside the weekend: no tag.
- No free-text tags.
- Delete: owner or admin. It removes the row and both files.
- Hide and edit tag: admin only. Hidden photos are left out for guests.

**Done when**

- Tag pre-select matches card times (Vitest)
- A guest deletes their own photo but cannot delete someone else's
- Dorian hides a photo and changes a tag

**After the weekend:** download the bucket with the Supabase CLI and upload it to a Google Photos album for Zach.

## Freeze (Dec 16)

### T10: Testing and dry run

**Slice:** the whole site, tested on real phones and run once with friends.

**Manual, on real phones**

- [ ] iPhone Safari, Android Chrome, and the group chat app's in-app browser
- [ ] Join on two browsers with the same PIN
- [ ] Upload 5 photos on cell data, including an iPhone HEIC
- [ ] Bingo: three test guests win in order. The head start shows after the reveal.
- [ ] Crawl: reveal, award, placement, bonus, undo, final, with a guest phone watching
- [ ] Calendar file opens on iPhone and Android

**Dry run (Dec 14-16)**

- [ ] 2-3 friends play a 15-minute version: join, a bingo line, one stop with awards
- [ ] Reset the database to a clean seed afterward

**Launch**

- [ ] Real guest names and teams in `content/guests.ts`, then seed
- [ ] Real Vercel env vars, including a fresh `ADMIN_PIN_HASH`
- [ ] Remove `UPLOADS_OPEN` from production
- [ ] Health cron confirmed running
- [ ] Paper fallbacks printed: bingo cards, crawl passports, tally sheet
- [ ] Code freeze

**If missed:** ship every thread that passed. Cut the rest to its paper fallback.

## Open questions

- [ ] Guest list with team assignments. Needed for T7 testing by Dec 10.
- [ ] Crawl stops, challenges, and points. Needed for T5 by Dec 6.
- [ ] Team names and colors. T3 shipped with placeholders (Red, Gray, Gold Squad). Needed before the reveal.
- [ ] Final 24 bingo tiles, plus Zach's catchphrase and usual drink order. Needed for T6.
- [ ] Bingo prize
- [ ] Saturday start times and pub name for the itinerary
- [ ] Venmo handle. The "Pay Dorian" button stays hidden until it is set.
- [x] Repo host: `dorianrm/zach-bach-app`, Dorian's personal GitHub
