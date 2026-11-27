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
| Admin link on More | Shows only for Dorian | E2E |
| Dorian on `/join` | Same label ("Your PIN") and messages as any guest | E2E |
| Wrong admin PIN at `/join` | "Wrong PIN." | E2E |
| 10 wrong tries at `/join` on Dorian | Locked 10 minutes | E2E |
| Troll locks Dorian at `/join` | Admin re-prompt on Dorian's signed-in phone still unlocks | E2E |
| 12-hour admin window ends | `/admin` asks for the admin PIN again, rest of the site stays signed in | E2E |
| 10 wrong tries at the admin re-prompt | Re-prompt locked 10 minutes. Clear with the saved SQL snippet. | Not tested |
| New `ADMIN_PIN_HASH` in Vercel | Dorian signed out on every device | Not tested |
| `$` in the hash read from `.env` | Hash uses `:` separators, so Next.js does not expand it | Unit (hash format) |
| Dorian on the Guest PINs page | Not listed | E2E |

## Calendar (PR #3)

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
