# Edge cases

A running list of edge cases found while building, and how each one is covered. Add a row when a new case comes up. Update the status when a test lands.

**Status**

- **Unit:** Vitest, `npm test`
- **E2E:** Playwright on iPhone 16 (WebKit) and Pixel 9 (Chromium), `npm run e2e`. Runs against the test Supabase project, not the deployed site.
- **Manual:** checked by hand in a browser (phone size)
- **Phone:** checked by Dorian on a real phone, on the Vercel preview or the live site
- **Not tested:** known, no test yet
- **Accepted:** known limit, left as is on purpose

## Event code gate

| Edge case | Expected | Status |
|---|---|---|
| No cookie, any page | "Ask Dorian for the link" page, no tabs | E2E |
| Wrong `?c=` code | Gate page | E2E |
| Forged `event` cookie | Gate page | E2E |
| Link with the right code | Sets the cookie, removes `?c` from the URL | E2E |
| Next visit without the code | Cookie still works | E2E |
| `EVENT_CODE` rotated | Old cookies stop working | Unit |
| Session token used as an event token | Rejected | Unit |
| `/api/health` and the link-preview image | Public, no cookie needed | E2E |
| Calendar file without the cookie | Gate, not the file | E2E |
| Env var missing on Vercel | 503 gate page, error in the logs | Not tested |
| Safari private tab | Cookie lasts only until the tab closes. Guest opens the link again. | Accepted |
| Link forwarded outside the group chat | A stranger sees the plan and can claim a name with no PIN. Rotate the code to revoke. | Accepted |

## Join and guest PINs

| Edge case | Expected | Status |
|---|---|---|
| Two PINs typed differently on setup | "The two PINs do not match." | E2E |
| Same PIN on a second phone | Signs in as the same guest | E2E, Phone pending |
| 5 wrong PINs | Name locked 10 minutes, even for the right PIN | E2E |
| Supabase clock a few seconds ahead | Lock message never says "11 minutes" | E2E |
| Two people set up the same new name at once | Only the first gets it. The second sees "This name just got a PIN." | Not tested |
| Admin resets a PIN | Guest is signed out on every phone | E2E |
| Signed-in phone opens "Switch guest" | Only names with a PIN show | E2E |
| Setup form opened before signing in, sent after | Server refuses: "Only a phone that is not signed in can set up a new name." | E2E |
| Private tab to claim another name | Works. Reset fixes a taken name. | Accepted |
| Set PIN button on a small iPhone | Above the tab bar, no scroll | E2E |
| `/join?next=//evil.example` | Goes to `/`, never off site | E2E |
| `/join?next=/more` | Returns to `/more` | E2E |
| Guest removed from `content/guests.ts` while signed in | Signed out, back to "Not signed in yet." | Not tested |
| Tampered, re-signed, `alg: none`, expired or wrong-type session cookie | Rejected | Unit |
| Session without a PIN fingerprint | Rejected | Unit |
| Same digits set again after a reset | New fingerprint, old sessions stay signed out | Unit |

## Admin (Dorian)

| Edge case | Expected | Status |
|---|---|---|
| Guest opens `/admin` or `/admin/pins` | "This page is for the organizer only." or sent back to `/admin` | E2E |
| Organizer section on More | Shows only for Dorian, one link per admin page | E2E |
| Admin window ended, Dorian opens an organizer page | PIN prompt, then back to that page | E2E |
| Dorian on `/join` | Same label ("Your PIN") and messages as any guest | E2E |
| Wrong admin PIN at `/join` | "Wrong PIN." | E2E |
| 10 wrong tries at `/join` on Dorian | Locked 10 minutes | E2E |
| Troll locks Dorian at `/join` | Admin re-prompt on Dorian's signed-in phone still unlocks | E2E |
| 12-hour admin window ends | `/admin` asks for the admin PIN again, rest of the site stays signed in | E2E |
| 10 wrong tries at the admin re-prompt | Re-prompt locked 10 minutes. Clear with the saved SQL snippet. | Not tested |
| New `ADMIN_PIN_HASH` in Vercel | Dorian signed out on every device | Not tested |
| `$` in the hash read from `.env` | Hash uses `:` separators, so Next.js does not expand it | Unit (hash format) |
| Dorian on the Guest PINs page | Not listed | E2E |

## Crawl

| Edge case | Expected | Status |
|---|---|---|
| Visitor opens `/crawl` without joining | Sent to `/join?next=/crawl` | E2E |
| Guest reads `/api/state` before the reveal | `{ teamsRevealed: false }`, no rosters or scores | E2E |
| `/api/state` without a session | 401 | E2E |
| Guest opens `/admin/crawl` | Sent back to `/admin` | E2E |
| Dorian reveals, guest phone not reloaded | Rosters and 0 points within ~5 s, own squad highlighted | E2E |
| Stray tap on "Reveal teams" | Needs a second tap ("Yes, reveal to everyone") | E2E |
| Reveal tapped too early | "Hide teams" sends phones back to "Teams revealed soon." within ~5 s. Anyone who already looked has seen the squads. | E2E |
| "Hide teams" right after a reveal | Opens closed, so the first tap opens it (React used to reuse the open reveal panel) | E2E |
| Undone award | Left out of the totals | Unit |
| Dorian awards +2, guest phone not reloaded | New total within ~5 s, and a "Point history" line | E2E |
| Dorian undoes it | Guest total drops back within ~5 s. The row stays in the database with `undone_at` set. | E2E |
| Undone award in team history | Left out of the history | Unit, E2E |
| Newest award is a bingo row (T7) | "Undo last" skips it and takes back the newest award Dorian gave | E2E |
| Nothing left to undo | "No awards to undo.", button disabled. A stale page gets "Nothing to undo." | E2E |
| Two undo taps race | The second one finds the row already undone and says so, never undoes two rows | Not tested |
| Bonus with no squad, points outside 1 to 10, or a note over 60 characters | Toast with the reason, nothing saved | Unit |
| Blank note | History and toast say "Bonus" | Unit |
| Award times | History shows Pacific time, whatever the phone's time zone | Unit |
| After "Give points" | The form resets to the first squad and +1, so a second tap needs a fresh pick | Manual |
| Two teams tied | Content order (`teams.sort`) | Unit |
| Guest with no team (Zach) | Not on any roster, no "Your squad" | Unit |
| Guest reads `/api/state` after a stop reveal | Only revealed stops. Upcoming stops never leave the server. | E2E |
| No stop revealed yet | "First stop revealed soon." Anytime challenges and rules still show. | E2E |
| Stop revealed, guest phone not reloaded | New current stop with a map link within ~5 s. The previous stop moves to "Past stops". | E2E |
| Dorian reveals a stop before the teams | Not possible: "Reveal teams first." replaces the stop panel, and the server refuses. Guests get no stops before the teams reveal. | E2E |
| Stop revealed too early | "Hide last stop" (two taps) takes it off phones. Points already given stay. | E2E |
| Every stop revealed | No "Reveal next stop" panel | Not tested |
| Award a head-to-head challenge with one tap | Server refuses: "That one is head to head. Enter the placement." | Not tested |
| Placement with one squad picked twice, or no 2nd | "A squad can only place once." or "Pick 1st and 2nd." | Unit |
| Placement with only 2 squads | 3rd is optional, so 3 and 2 points | Unit |
| Undo right after a placement | Takes back all of its rows at once (one insert, same `created_at`) | E2E |
| Award saved | The challenge pick clears, so a second squad tap cannot repeat it | Manual |
| Final with the top two tied | Refused with a toast naming the tied squads | Unit, E2E |
| After the final | Every phone shows the winner. Award, bonus and undo are gone and the server refuses them. | E2E |
| Final tapped by mistake | No button to reopen. Set `settings.crawl_final` to `false` in the SQL editor. | Accepted |
| Challenge removed from `content/crawl.ts` after it was awarded | Re-seed deletes it. Its awards keep their points and lose the link. | Not tested |
| Duplicate id or an award challenge with no points in `content/crawl.ts` | Seed stops before any write | Unit |
| Phone tab in the background | Polling stops, and fetches once on return | Not tested |
| Phone offline for a moment | Keeps the last scores, retries on the next tick | Not tested |

## Photos

| Edge case | Expected | Status |
|---|---|---|
| Visitor opens `/photos` without joining | Sent to `/join?next=/photos` | E2E |
| Upload before Fri Dec 18 6:00 PM or after Sun Dec 27 (Auto) | Upload form replaced by the open and close times. `createUploadUrls` refuses too. | Unit, E2E |
| Upload switch missing or an unknown value | Read as Auto (the window) | Unit |
| Dorian sets uploads to Closed | Guests see "Uploads are paused right now.", no picker | E2E |
| Dorian sets uploads to Open now before the weekend | Picker shows any day | E2E |
| Guest opens `/admin/photos` | Sent to `/admin` for the PIN | E2E |
| E2E run during Dec 18-27 | The Auto check expects closed, so it fails inside the window | Accepted |
| 12 MP camera photo | Resized on the phone to 2000 px (under 1 MB) plus a 400 px thumbnail | E2E |
| EXIF time taken | Read as Pacific wall clock, whatever zone the phone is in | Unit, E2E |
| No EXIF, or a `0000:00:00` date | `taken_at` is null | Unit |
| Caption with line breaks, extra spaces or over 140 characters | One trimmed line, cut at 140 | Unit, E2E |
| Guest saves files from another guest's folder, or a mismatched thumbnail | "That upload is not yours." | Unit |
| `savePhoto` before both files are in the bucket | "The upload did not finish. Try again." | Not tested |
| Same photo saved twice (retry after a dropped answer) | One row | Not tested |
| More than 20 photos picked | First 20 kept, "Up to 20 photos at a time." | Not tested |
| Signal drops mid-upload | Saved photos leave the list, the rest stay, "Upload stopped." Tap Upload again. | Not tested |
| File URL without a signature | Refused, the bucket is private | E2E |
| Gallery left open over 1 hour | Signed URLs expire. Pull to refresh. | Accepted |
| iPhone HEIC photo | Safari opens it and the canvas converts it to JPEG | Phone pending |
| HEIC on Android Chrome | Chrome cannot open HEIC: "This photo could not be opened on this phone." | Accepted |
| Tapped photo | Full size over the tab bar, with name, caption and Close | E2E |
| Photo taken during a timed card | That card's tag pre-selected (Dinner, Crawl, Airsoft) | Unit, E2E |
| Photo with no time taken | Tag of the card happening at upload time | Unit |
| Taken outside the weekend or between cards | No tag pre-selected | Unit |
| TBD cards (Topgolf, Saturday pub) | Never pre-selected. Guest picks them by hand. | Unit |
| Tag not in the list (typo, old tag, free text) | "Pick a tag from the list." on save and on retag | Unit |
| `?tag=` unknown | Shows every photo | E2E |
| Filter with no matches | "No Topgolf photos yet." | E2E |
| Guest opens someone else's photo | No Delete, no organizer controls | E2E |
| Guest deletes their own photo | Row and both files gone, two taps | E2E |
| Guest calls delete on someone else's photo | Sent to the admin PIN prompt, nothing deleted | Not tested |
| Photo deleted on another phone first | Delete does nothing, no error | Not tested |
| Dorian hides a photo | Gone for guests, still shown to Dorian as "Hidden" so he can unhide it | E2E |
| Dorian changes a tag | Saved at once, the photo moves to that filter | E2E |
| Admin window ended, Dorian taps Hide | PIN prompt, then back to `/photos` | Not tested |
| Tag select on iPhone | 44 points tall (WebKit ignores `min-height` on `<select>`) | E2E (screenshot) |
| Test photos left from phone checks | "Delete all photos" on Photos admin, two taps, also removes stray files | E2E |
| Guest removed from `content/guests.ts` | Their photo rows go with them (files stay in the bucket for the export) | Accepted |

## Bingo

| Edge case | Expected | Status |
|---|---|---|
| Visitor opens `/bingo` without joining | Sent to `/join?next=/bingo` | E2E |
| Two guests | Different layouts, same 24 tiles | E2E, Unit |
| Reload, or the same guest on a second phone | Same layout and marks | E2E |
| Two first visits at once (two phones) | One card saved. The second insert is ignored, both read the same card. | Not tested |
| Quick taps in a row | Every mark saves. Only the last server answer replaces the card on screen. | E2E |
| Tap undone on a second phone | First phone shows it after a reload | E2E |
| Save fails (no signal) | The tap is undone on screen, "Not saved. Check your signal and tap again." | Not tested |
| Free center | Always marked, not a button. The server and the database refuse to change it. | E2E, Unit |
| Position out of range or not a number | Refused by the server action | Unit |
| Zach (`plays_bingo = false`) | No card, and the action refuses him | E2E |
| Long tile text on a 375-point phone | Fits the square, last row clears the tab bar | E2E (screenshot) |
| Tile text edited after cards exist | Cards show the new text. Reordering or adding tiles would scramble cards. | Accepted |

## Calendar

| Edge case | Expected | Status |
|---|---|---|
| TBD cards (Topgolf, Saturday dinner) | Left out of the file and the picker | Unit |
| Times across PST and PDT | Correct UTC times | Unit |
| Commas and long lines in the file | Escaped, folded at 75 octets | Unit |
| iPhone taps the calendar file | Apple Calendar offers to add the events | Phone |
| Only some events ticked | File holds only those | Unit, Manual |
| Unknown tag in `?events=` | Ignored | Unit |
| Old `/api/calendar.ics` link with no `?events` | Every event | Unit |
| Nothing ticked | "Pick at least one event.", no buttons | Manual |
| Google: several events from one tap | Phones block extra tabs, so the button steps through them ("1 of 2") | Manual, Phone pending |
| Card with no end time in Google | One hour long | Unit |
| Times change after a guest added events | Their calendar keeps the old times. Post a note in the group chat. | Accepted |

## Itinerary

| Edge case | Expected | Status |
|---|---|---|
| Phone set to another time zone | "Happening now" uses Pacific time | Unit |
| Card with no end | "Now" until the next card starts | Unit |
| TBD card | Never marked "now" | Unit |

## Operations

| Edge case | Expected | Status |
|---|---|---|
| Free Supabase project idle for 1 week | Daily cron on `/api/health` keeps it awake | Phone (cron active in Vercel) |
| E2E run with `.env.test.local` pointing at the real database | Suite refuses to run | Not tested (guard in `e2e/env.ts`) |
| Traffic flood | Vercel blocks basic floods. Hobby pauses, never bills. | Accepted |
